const express = require("express");
const pool = require("../config.bd/db"); // mysql2/promise
const router = express.Router();

// --- Afficher toutes les catégories ---
router.get("/categorie", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM categorie");
        res.status(200).json({
            success: true,
            message: "Liste des catégories récupérée avec succès.",
            data: rows
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des catégories:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des catégories.",
            error: error.message
        });
    }
});

// --- Afficher une catégorie spécifique ---
router.get("/categorie/:idCategorie", async (req, res) => {
    const id = req.params.idCategorie;
    try {
        const [rows] = await pool.query("SELECT * FROM categorie WHERE idCategorie = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Catégorie non trouvée."
            });
        }
        res.status(200).json({
            success: true,
            message: "Catégorie récupérée avec succès.",
            data: rows[0]
        });
    } catch (error) {
        console.error("Erreur lors de la récupération de la catégorie:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de la catégorie.",
            error: error.message
        });
    }
});

// --- Ajouter une catégorie ---
router.post("/categorie", async (req, res) => {
    const { categorie, image } = req.body;
    if (!categorie || !image) {
        return res.status(400).json({
            success: false,
            message: "Les champs 'categorie' et 'image' sont requis."
        });
    }
    try {
        const [result] = await pool.query(
            "INSERT INTO categorie (categorie, image) VALUES (?, ?)",
            [categorie, image]
        );
        res.status(201).json({
            success: true,
            message: "Catégorie créée avec succès.",
            id: result.insertId
        });
    } catch (error) {
        console.error("Erreur lors de l'ajout de la catégorie:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: "Cette catégorie existe déjà.",
                error: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'ajout de la catégorie.",
            error: error.message
        });
    }
});

// --- Modifier une catégorie ---
router.put("/categorie/:idCategorie", async (req, res) => {
    const id = req.params.idCategorie;
    const { categorie, image } = req.body;

    if (!categorie && !image) {
        return res.status(400).json({
            success: false,
            message: "Au moins un champ ('categorie' ou 'image') est requis pour la mise à jour."
        });
    }

    let updates = [];
    let donnees = [];

    if (categorie !== undefined) {
        updates.push("categorie = ?");
        donnees.push(categorie);
    }
    if (image !== undefined) {
        updates.push("image = ?");
        donnees.push(image);
    }

    donnees.push(id);

    const sql = `UPDATE categorie SET ${updates.join(", ")} WHERE idCategorie = ?`;

    try {
        const [result] = await pool.query(sql, donnees);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Catégorie non trouvée pour la mise à jour."
            });
        }
        res.status(200).json({
            success: true,
            message: "Catégorie mise à jour avec succès."
        });
    } catch (error) {
        console.error("Erreur lors de la modification de la catégorie:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la modification de la catégorie.",
            error: error.message
        });
    }
});

// --- Supprimer une catégorie ---
router.delete("/categorie/:idCategorie", async (req, res) => {
    const id = req.params.idCategorie;
    try {
        const [result] = await pool.query("DELETE FROM categorie WHERE idCategorie = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Catégorie non trouvée pour la suppression."
            });
        }
        res.status(200).json({
            success: true,
            message: "Catégorie supprimée avec succès."
        });
    } catch (error) {
        console.error("Erreur lors de la suppression de la catégorie:", error);
       
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression de la catégorie.",
            error: error.message
        });
    }
});

module.exports = router;