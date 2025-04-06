const express = require("express");
const pool = require("../config.bd/db"); 
const router = express.Router();

//  Afficher toutes les catégories
router.get("/categorie", (req, res) => {
    pool.query("SELECT * FROM categorie", [], (erreur, resultat) => {
        if (erreur) {
            console.log("Erreur lors de la récupération des catégories:", erreur);
            return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
        }
        else res.status(200).send({ categories: resultat });
    });
});

// Afficher une categorie
router.get("/categorie/:idCategorie", (req, res) => {
    const id = req.params.idCategorie;
    const sql = "SELECT * FROM categorie WHERE idCategorie = ?";

    pool.query(sql, [id], (erreur, resultat) => {
        if (erreur) {
            console.error("Erreur lors de la récupération de la catégorie:", erreur);
            return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
        }

        if (resultat.length === 0) {
            return res.status(404).json({ error: "Catégorie non trouvée" });
        }

        res.status(200).json(resultat[0]);
    });
});



// 🔹 Ajouter  une catégorie
router.post("/categorie", (req, res) => {
    const categorie = req.body.categorie;

    const sql = "INSERT INTO categorie (categorie) VALUES (?)";
    const donnees = [categorie];

    pool.query(sql, donnees, (erreur, resultat) => {
        if (erreur) {
            console.error("Erreur lors de l'ajout de la catégorie:", erreur);
            return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
        }

        res.status(201).json({message: "Catégorie créée",id: resultat.insertId, });
    });
});

// pour modifier une categorie
router.put("/categorie/:idCategorie", (req, res) => {
    const id = req.params.idCategorie;
    const categorie = req.body.categorie;

    const sql = "UPDATE categorie SET categorie = ? WHERE idCategorie = ?";
    const donnees = [categorie, id];

    pool.query(sql, donnees, (erreur, resultat) => {
        if (erreur) {
            console.error("Erreur lors de la mise à jour de la catégorie:", erreur);
            return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
        }

        if (resultat.affectedRows === 0) {
            return res.status(404).json({ error: "Catégorie non trouvée" });
        }

        res.status(200).json({
            message: "Catégorie mise à jour",
        });
    });
});


// 🔹 Supprimer une catégorie

router.delete("/categorie/:idCategorie", (req, res) => {
    const id = req.params.idCategorie;
    const sql = "DELETE FROM categorie WHERE idCategorie = ?";

    pool.query(sql, [id], (erreur, resultat) => {
        if (erreur) {
            console.error("Erreur lors de la suppression de la catégorie:", erreur);
            return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
        }

        res.status(200).json({ message: "Catégorie supprimée" });
    });
});



module.exports = router;
