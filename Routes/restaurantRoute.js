const express = require("express");
const pool = require('../config.bd/db'); // S'appuie sur votre configuration mysql2/promise
const router = express.Router();

// --- Afficher tous les restaurants ---
router.get("/restaurant", async (req, res) => {
    try {
        // Correction : Déstructuration pour obtenir seulement les lignes de données.
        const [rows] = await pool.query("SELECT * FROM restaurant");
        res.status(200).json({
            success: true,
            message: "Restaurants récupérés avec succès.",
            data: rows // 'rows' est déjà le tableau d'objets désiré [{...}, {...}]
        });
    } catch (error) {
        console.error("Erreur lors de la récupération de tous les restaurants:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des restaurants.",
            error: error.message // En production, il est conseillé de ne pas exposer les messages d'erreur bruts.
        });
    }
});

// --- Afficher un restaurant spécifique ---
router.get("/restaurant/:idRestaurant", async (req, res) => {
    const id = req.params.idRestaurant;

    try {
        // Correction : Déstructuration pour obtenir le tableau des lignes.
        const [rows] = await pool.query("SELECT * FROM restaurant WHERE idRestaurant = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Restaurant non trouvé." });
        }

        res.status(200).json({
            success: true,
            message: "Restaurant récupéré avec succès.",
            data: rows[0] // rows[0] est l'objet JSON unique désiré : {...}
        });
    } catch (error) {
        console.error(`Erreur lors de la récupération du restaurant ${id}:`, error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération du restaurant.",
            error: error.message
        });
    }
});

// --- Insérer un nouveau restaurant ---
router.post("/restaurant", async (req, res) => {
    const { idCategorie, nom, adresse, image, idUtilisateur } = req.body;

    // Validation basique des champs requis
    if (!idCategorie || !nom || !adresse || !image || !idUtilisateur) {
        return res.status(400).json({
            success: false,
            message: "Tous les champs (idCategorie, nom, adresse, image, idUtilisateur) sont requis."
        });
    }

    const sql = "INSERT INTO restaurant (idCategorie, nom, adresse, image, idUtilisateur) VALUES (?, ?, ?, ?, ?)";
    const donnees = [idCategorie, nom, adresse, image, idUtilisateur];

    try {
        // Correction : Déstructuration de l'objet 'result' pour les opérations INSERT
        const [result] = await pool.query(sql, donnees);
        res.status(201).json({
            success: true,
            message: "Restaurant ajouté avec succès.",
            idRestaurant: result.insertId // Accédez à 'insertId' via l'objet 'result'
        });
    } catch (error) {
        console.error("Erreur lors de l'insertion du restaurant:", error);
        
        // Gestion spécifique des erreurs courantes (doublons, clés étrangères)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                success: false, 
                message: "Un restaurant avec ce nom et/ou cette adresse existe déjà.", 
                error: error.message 
            });
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
            // Cette erreur peut se produire si idCategorie ou idUtilisateur n'existe pas
            return res.status(400).json({ 
                success: false, 
                message: "L'ID de la catégorie ou de l'utilisateur spécifié n'existe pas.", 
                error: error.message 
            });
        }

        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'insertion du restaurant.",
            error: error.message
        });
    }
});

// --- Mettre à jour un restaurant ---
router.put("/restaurant/:idRestaurant", async (req, res) => {
    const idRestaurant = req.params.idRestaurant; // L'ID du restaurant à mettre à jour
    const { idCategorie, nom, adresse, image, idUtilisateur } = req.body;

    // Construction dynamique de la requête UPDATE
    let updates = [];
    let donnees = [];

    if (idCategorie !== undefined) { updates.push("idCategorie = ?"); donnees.push(idCategorie); }
    if (nom !== undefined) { updates.push("nom = ?"); donnees.push(nom); }
    if (adresse !== undefined) { updates.push("adresse = ?"); donnees.push(adresse); }
    if (image !== undefined) { updates.push("image = ?"); donnees.push(image); }
    if (idUtilisateur !== undefined) { updates.push("idUtilisateur = ?"); donnees.push(idUtilisateur); }

    if (updates.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Aucune modification demandée. Veuillez fournir au moins un champ à mettre à jour (idCategorie, nom, adresse, image, idUtilisateur)."
        });
    }

    donnees.push(idRestaurant); // L'ID du restaurant est le dernier paramètre pour la clause WHERE

    const sql = `UPDATE restaurant SET ${updates.join(", ")} WHERE idRestaurant = ?`;

    try {
        // Correction : Déstructuration de l'objet 'result' pour les opérations UPDATE
        const [result] = await pool.query(sql, donnees);

        // Accéder à 'affectedRows' via l'objet 'result'
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Restaurant non trouvé pour la mise à jour." });
        }

        res.status(200).json({
            success: true,
            message: "Restaurant mis à jour avec succès.",
            modifications: req.body // Renvoie les modifications appliquées
        });
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du restaurant ${idRestaurant}:`, error);
        
        // Gestion spécifique des erreurs courantes (doublons, clés étrangères)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                success: false, 
                message: "Un autre restaurant a déjà cette combinaison de nom/adresse (ou autre contrainte unique).", 
                error: error.message 
            });
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
            // Cette erreur peut se produire si idCategorie ou idUtilisateur mis à jour n'existe pas
            return res.status(400).json({ 
                success: false, 
                message: "L'ID de la catégorie ou de l'utilisateur spécifié n'existe pas.", 
                error: error.message 
            });
        }

        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour du restaurant.",
            error: error.message
        });
    }
});

// --- Suppression d'un restaurant ---
router.delete("/restaurant/:idRestaurant", async (req, res) => {
    const id = req.params.idRestaurant;
    const sql = "DELETE FROM restaurant WHERE idRestaurant = ?";

    try {
        // Correction : Déstructuration de l'objet 'result' pour les opérations DELETE
        const [result] = await pool.query(sql, [id]);

        // Accéder à 'affectedRows' via l'objet 'result'
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Restaurant non trouvé pour la suppression." });
        }

        res.status(200).json({ success: true, message: "Restaurant supprimé avec succès." });
    } catch (error) {
        console.error(`Erreur lors de la suppression du restaurant ${id}:`, error);
    
        // Gestion spécifique des erreurs de clé étrangère (si le restaurant est lié à des plats/commandes)
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(409).json({
                success: false,
                message: "Ce restaurant ne peut pas être supprimé car il est lié à des plats ou des commandes existantes.",
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression du restaurant.",
            error: error.message
        });
    }
});

module.exports = router;