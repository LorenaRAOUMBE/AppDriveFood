const express = require("express");
const pool = require("../config.bd/db"); 
const router = express.Router();

// --- Afficher tous les livreurs ---
router.get("/livreur", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM livreur");
        res.status(200).json({
            success: true,
            message: "Livreurs récupérés avec succès.",
            data: rows // 'rows' est déjà le tableau d'objets [{...}, {...}]
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des livreurs:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des livreurs.",
            error: error.message // Expose le message d'erreur pour le débogage. En production, vous pouvez ne pas l'inclure.
        });
    }
});

// --- Afficher un livreur spécifique ---
router.get("/livreur/:idLivreur", async (req, res) => {
    const id = req.params.idLivreur;

    try {
        const [rows] = await pool.query("SELECT * FROM livreur WHERE idLivreur = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Livreur non trouvé." });
        }

        res.status(200).json({
            success: true,
            message: "Livreur récupéré avec succès.",
            data: rows[0] // rows[0] est l'objet JSON unique désiré : {...}
        });
    } catch (error) {
        console.error(`Erreur lors de la récupération du livreur ${id}:`, error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération du livreur.",
            error: error.message
        });
    }
});

// --- Créer un nouveau livreur ---
router.post("/livreur", async (req, res) => {
    const { nom, prenom, typeDeVehicule, numeroDeTel } = req.body;
    // Utilisation de `??` (nullish coalescing) pour une valeur par défaut plus robuste avec `null` ou `undefined`
    const statut = req.body.statut ?? "disponible"; 

    // Validation basique des données
    if (!nom || !prenom || !typeDeVehicule || !numeroDeTel) {
        return res.status(400).json({
            success: false,
            message: "Les champs 'nom', 'prenom', 'typeDeVehicule' et 'numeroDeTel' sont requis."
        });
    }

    const sql = `INSERT INTO livreur (nom, prenom, statut, typeDeVehicule, numeroDeTel) VALUES (?, ?, ?, ?, ?)`;
    const donnees = [nom, prenom, statut, typeDeVehicule, numeroDeTel];

    try {
        // Correction: Déstructurer le résultat de la requête en [result]
        // pour accéder à .insertId et .affectedRows.
        const [result] = await pool.query(sql, donnees);
        res.status(201).json({
            success: true,
            message: "Livreur créé avec succès.",
            idLivreur: result.insertId // Utilisation correcte de result.insertId
        });
    } catch (error) {
        console.error("Erreur lors de la création du livreur:", error);
        // Gérer spécifiquement les erreurs de doublons si vous avez une contrainte UNIQUE sur numeroDeTel par exemple
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                success: false, 
                message: "Un livreur avec ce numéro de téléphone existe déjà.", 
                error: error.message 
            });
        }
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création du livreur.",
            error: error.message
        });
    }
});

// --- Mettre à jour un livreur ---
router.put("/livreur/:idLivreur", async (req, res) => {
    const id = req.params.idLivreur; 
    const { nom, prenom, statut, typeDeVehicule, numeroDeTel } = req.body;

    // Construire dynamiquement la requête de mise à jour
    let updates = [];
    let donnees = [];

    // Vérifier si les propriétés sont fournies dans le corps de la requête
    if (nom !== undefined) { updates.push("nom = ?"); donnees.push(nom); }
    if (prenom !== undefined) { updates.push("prenom = ?"); donnees.push(prenom); }
    if (statut !== undefined) { updates.push("statut = ?"); donnees.push(statut); }
    if (typeDeVehicule !== undefined) { updates.push("typeDeVehicule = ?"); donnees.push(typeDeVehicule); }
    if (numeroDeTel !== undefined) { updates.push("numeroDeTel = ?"); donnees.push(numeroDeTel); }

    if (updates.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Aucune modification demandée. Veuillez fournir au moins un champ à mettre à jour."
        });
    }

    donnees.push(id); // L'ID du livreur est le dernier paramètre pour la clause WHERE

    const sql = `UPDATE livreur SET ${updates.join(", ")} WHERE idLivreur = ?`;

    try {
        // Correction: Déstructurer le résultat de la requête en [result]
        const [result] = await pool.query(sql, donnees);

        // Correction: Utiliser result.affectedRows
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Livreur non trouvé pour la mise à jour." });
        }

        res.status(200).json({
            success: true,
            message: "Livreur modifié avec succès.",
            modifications: req.body // Renvoie les données envoyées pour confirmation
        });
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du livreur ${id}:`, error);
        // Gérer spécifiquement les erreurs de doublons si une contrainte UNIQUE est violée lors de la mise à jour (ex: numeroDeTel)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: "Le numéro de téléphone existe déjà pour un autre livreur.", error: error.message });
        }
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour du livreur.",
            error: error.message
        });
    }
});

// --- Supprimer un livreur ---
router.delete("/livreur/:idLivreur", async (req, res) => {
    const id = req.params.idLivreur;
    const sql = "DELETE FROM livreur WHERE idLivreur = ?";

    try {
        // Correction: Déstructurer le résultat de la requête en [result]
        const [result] = await pool.query(sql, [id]);

        // Correction: Utiliser result.affectedRows
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Livreur non trouvé pour la suppression." });
        }

        res.status(200).json({ success: true, message: "Livreur supprimé avec succès." });
    } catch (error) {
        console.error(`Erreur lors de la suppression du livreur ${id}:`, error);
        // Gérer les erreurs de clé étrangère si le livreur est lié à des livraisons existantes
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(409).json({
                success: false,
                message: "Ce livreur ne peut pas être supprimé car il est assigné à des livraisons existantes.",
                error: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression du livreur.",
            error: error.message
        });
    }
});

module.exports = router;