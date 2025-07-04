const express = require("express");
const pool = require('../config.bd/db'); // S'appuie sur votre configuration mysql2/promise
const bcrypt = require("bcrypt");
const router = express.Router();

// --- Afficher tous les utilisateurs ---
router.get("/utilisateurs", async (req, res) => {
    try {
        // Correction : Déstructuration pour obtenir les lignes directement.
        const [rows] = await pool.query("SELECT * FROM utilisateurs");
        
        // Ne pas envoyer les mots de passe hachés directement au client
        const utilisateursSansMdp = rows.map(user => {
            const { password, ...rest } = user; // 'password' est retiré
            return rest;
        });
        res.status(200).json({
            success: true, // Ajout de la clé success pour uniformité
            message: "Utilisateurs récupérés avec succès.", // Ajout d'un message
            data: utilisateursSansMdp
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des utilisateurs.",
            error: error.message
        });
    }
});

// --- Afficher un utilisateur spécifique ---
router.get("/utilisateurs/:idUtilisateur", async (req, res) => {
    const id = req.params.idUtilisateur;
    const sql = "SELECT * FROM utilisateurs WHERE idUtilisateur = ?";

    try {
        // Correction : Déstructuration pour obtenir les lignes directement.
        const [rows] = await pool.query(sql, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé." });
        }
        
        // Ne pas envoyer le mot de passe haché
        const { password, ...userWithoutPassword } = rows[0]; // 'password' est retiré
        res.status(200).json({
            success: true,
            message: "Utilisateur récupéré avec succès.",
            data: userWithoutPassword
        });
    } catch (error) {
        console.error(`Erreur lors de la récupération de l'utilisateur ${id}:`, error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de l'utilisateur.",
            error: error.message
        });
    }
});

// --- Ajouter un utilisateur ---
router.post("/utilisateurs", async (req, res) => {
    const { nom, numeroDeTel, email, password, image } = req.body;
    // Définir des valeurs par défaut pour 'role' et 'verifie' si non fournis
    const role = req.body.role || "client";
    // Si 'verifie' est un BOOLEAN en BD, utilisez `false` ou `true`.
    // Si c'est un VARCHAR, 'FALSE' ou 'TRUE' sont corrects.
    const verifie = req.body.verifie !== undefined ? req.body.verifie : "FALSE"; 

    // Validation basique
    if (!nom || !numeroDeTel || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Les champs 'nom', 'numeroDeTel', 'email' et 'password' sont requis."
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO utilisateurs (nom, numeroDeTel, email, password, role, image, verifie) VALUES(?,?,?,?,?,?,?)";
        const data = [nom, numeroDeTel, email, hashedPassword, role, image, verifie];

        // Correction : Déstructuration de l'objet 'result' pour les opérations INSERT
        const [result] = await pool.query(sql, data);
        res.status(201).json({
            success: true,
            message: "Compte utilisateur créé avec succès.",
            idUtilisateur: result.insertId // Accédez à 'insertId' via l'objet 'result'
        });
    } catch (error) {
        console.error("Erreur lors de la création de l'utilisateur:", error);
        
        // Gestion spécifique des erreurs courantes (doublons sur email/numeroDeTel)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                success: false, 
                message: "Un utilisateur avec cet e-mail ou numéro de téléphone existe déjà.", 
                error: error.message 
            });
        }

        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création de l'utilisateur.",
            error: error.message
        });
    }
});

// --- Modifier un utilisateur ---
router.put("/utilisateurs/:idUtilisateur", async (req, res) => {
    const id = req.params.idUtilisateur;
    const { nom, numeroDeTel, email, password, role, image, verifie } = req.body;

    // Construction dynamique de la requête de mise à jour
    let updates = [];
    let donnees = [];

    if (nom !== undefined) { updates.push("nom = ?"); donnees.push(nom); }
    if (numeroDeTel !== undefined) { updates.push("numeroDeTel = ?"); donnees.push(numeroDeTel); }
    if (email !== undefined) { updates.push("email = ?"); donnees.push(email); }
    if (role !== undefined) { updates.push("role = ?"); donnees.push(role); }
    if (image !== undefined) { updates.push("image = ?"); donnees.push(image); }
    // Vérifiez si 'verifie' est explicitement fourni pour éviter un bug si sa valeur est `false`
    if (verifie !== undefined) { updates.push("verifie = ?"); donnees.push(verifie); }

    // Si un nouveau mot de passe est fourni, le hacher
    if (password !== undefined && password !== null && password !== '') {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push("password = ?");
            donnees.push(hashedPassword);
        } catch (hashError) {
            console.error("Erreur lors du hachage du mot de passe:", hashError);
            return res.status(500).json({ success: false, message: "Erreur lors du traitement du mot de passe.", error: hashError.message });
        }
    }

    if (updates.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Aucune modification demandée. Veuillez fournir au moins un champ à mettre à jour."
        });
    }

    donnees.push(id); // L'ID de l'utilisateur est le dernier paramètre pour la clause WHERE

    const sql = `UPDATE utilisateurs SET ${updates.join(", ")} WHERE idUtilisateur = ?`;

    try {
        // Correction : Déstructuration de l'objet 'result' pour les opérations UPDATE
        const [result] = await pool.query(sql, donnees);

        // Accédez à 'affectedRows' via l'objet 'result'
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé pour la mise à jour." });
        }

        res.status(200).json({
            success: true,
            message: "Utilisateur mis à jour avec succès.",
            modifications: req.body // Renvoie les modifications appliquées
        });
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de l'utilisateur ${id}:`, error);
        // Gérer spécifiquement les erreurs de doublons (par ex. sur l'email/numeroDeTel si la contrainte est appliquée)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: "Cet e-mail ou numéro de téléphone est déjà utilisé par un autre compte.", error: error.message });
        }
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour de l'utilisateur.",
            error: error.message
        });
    }
});

// --- Supprimer un utilisateur ---
router.delete("/utilisateurs/:idUtilisateur", async (req, res) => {
    const id = req.params.idUtilisateur;
    const sql = "DELETE FROM utilisateurs WHERE idUtilisateur = ?";

    try {
        // Correction : Déstructuration de l'objet 'result' pour les opérations DELETE
        const [result] = await pool.query(sql, [id]);

        // Accédez à 'affectedRows' via l'objet 'result'
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé pour la suppression." });
        }

        res.status(200).json({ success: true, message: "Utilisateur supprimé avec succès." });
    } catch (error) {
        console.error(`Erreur lors de la suppression de l'utilisateur ${id}:`, error);
        // Gérer spécifiquement les erreurs de clé étrangère
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(409).json({
                success: false,
                message: "Cet utilisateur ne peut pas être supprimé car il est lié à d'autres enregistrements (ex: restaurants, commandes).",
                error: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression de l'utilisateur.",
            error: error.message
        });
    }
});

module.exports = router;