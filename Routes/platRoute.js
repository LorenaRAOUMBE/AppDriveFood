const express = require("express");
const pool = require("../config.bd/db"); // S'appuie sur votre configuration mysql2/promise
const router = express.Router();

// --- Afficher tous les plats ---
router.get("/plat", async (req, res) => {
    try {
        // Correction : Déstructurer pour obtenir seulement les lignes de données.
        const [rows] = await pool.query("SELECT * FROM plat");
        res.status(200).json({
            success: true,
            message: "Plats récupérés avec succès.",
            data: rows // 'rows' est déjà le tableau d'objets désiré [{...}, {...}]
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des plats:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des plats.",
            error: error.message // En production, il est conseillé de ne pas exposer les messages d'erreur bruts.
        });
    }
});

// --- Afficher un plat spécifique ---
router.get("/plat/:idPlat", async (req, res) => {
    const id = req.params.idPlat;
    const sql = "SELECT * FROM plat WHERE idPlat = ?";

    try {
        // Correction : Déstructurer pour obtenir le tableau des lignes.
        const [rows] = await pool.query(sql, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Plat non trouvé." });
        }

        res.status(200).json({
            success: true,
            message: "Plat récupéré avec succès.",
            data: rows[0] // rows[0] est l'objet JSON unique désiré : {...}
        });
    } catch (error) {
        console.error(`Erreur lors de la récupération du plat ${id}:`, error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération du plat.",
            error: error.message
        });
    }
});

// --- Créer un nouveau plat dans la carte ---
router.post("/plat", async (req, res) => {
    const { idRestaurant, nom, prix, details, image: imageUrl } = req.body;

    // Validation basique des données
    // `prix === undefined` est crucial pour accepter 0 comme prix valide.
    if (!idRestaurant || !nom || prix === undefined || !details || !imageUrl) {
        return res.status(400).json({
            success: false,
            message: "Tous les champs (idRestaurant, nom, prix, details, image) sont requis."
        });
    }

    const sql = `INSERT INTO plat (idRestaurant, nom, prix, details, image) VALUES (?, ?, ?, ?, ?)`;
    const data = [idRestaurant, nom, prix, details, imageUrl];

    try {
        // Correction : Déstructurer l'objet résultat pour les opérations INSERT
        const [result] = await pool.query(sql, data);
        res.status(201).json({
            success: true,
            message: "Plat ajouté avec succès.",
            idPlat: result.insertId // Accéder à insertId depuis l'objet 'result'
        });
    } catch (error) {
        console.error("Erreur lors de l'ajout du plat:", error);
        // Gérer spécifiquement les erreurs de doublons ou de clés étrangères (idRestaurant)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: "Un plat avec ce nom (pour ce restaurant) existe peut-être déjà.", error: error.message });
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
            return res.status(400).json({ success: false, message: "L'ID du restaurant spécifié n'existe pas.", error: error.message });
        }
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'ajout du plat.",
            error: error.message
        });
    }
});

// --- Modifier un plat ---
router.put("/plat/:idPlat", async (req, res) => {
    const idPlat = req.params.idPlat;
    const { idRestaurant, nom, prix, details, image: imageUrl } = req.body;

    // Construire dynamiquement la requête de mise à jour
    let updates = [];
    let data = [];

    if (idRestaurant !== undefined) { updates.push("idRestaurant = ?"); data.push(idRestaurant); }
    if (nom !== undefined) { updates.push("nom = ?"); data.push(nom); }
    if (prix !== undefined) { updates.push("prix = ?"); data.push(prix); }
    if (details !== undefined) { updates.push("details = ?"); data.push(details); }
    if (imageUrl !== undefined) { updates.push("image = ?"); data.push(imageUrl); }

    if (updates.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Aucune modification demandée. Veuillez fournir au moins un champ à mettre à jour."
        });
    }

    data.push(idPlat); // L'ID du plat est le dernier paramètre pour la clause WHERE

    const sql = `UPDATE plat SET ${updates.join(", ")} WHERE idPlat = ?`;

    try {
        // Correction : Déstructurer l'objet résultat pour les opérations UPDATE
        const [result] = await pool.query(sql, data);

        // Accéder à affectedRows depuis l'objet 'result'
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Plat non trouvé pour la mise à jour." });
        }

        res.status(200).json({
            success: true,
            message: "Plat mis à jour avec succès.",
            modifications: req.body // Renvoie les modifications appliquées
        });
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du plat ${idPlat}:`, error);
        // Gérer spécifiquement les erreurs de clés étrangères (si idRestaurant est invalide)
        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
            return res.status(400).json({ success: false, message: "L'ID du restaurant spécifié n'existe pas.", error: error.message });
        }
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: "Un plat avec ce nom (pour ce restaurant) existe peut-être déjà.", error: error.message });
        }
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour du plat.",
            error: error.message
        });
    }
});

// --- Supprimer un plat ---
router.delete("/plat/:idPlat", async (req, res) => {
    const id = req.params.idPlat;
    const sql = "DELETE FROM plat WHERE idPlat = ?";

    try {
        // Correction : Déstructurer l'objet résultat pour les opérations DELETE
        const [result] = await pool.query(sql, [id]);

        // Accéder à affectedRows depuis l'objet 'result'
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Plat non trouvé pour la suppression." });
        }

        res.status(200).json({ success: true, message: "Plat supprimé avec succès." });
    } catch (error) {
        console.error(`Erreur lors de la suppression du plat ${id}:`, error);
        // Gérer les erreurs de clé étrangère si les plats sont référencés dans 'commande_produit'
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(409).json({
                success: false,
                message: "Ce plat ne peut pas être supprimé car il fait partie de commandes existantes.",
                error: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression du plat.",
            error: error.message
        });
    }
});

module.exports = router;