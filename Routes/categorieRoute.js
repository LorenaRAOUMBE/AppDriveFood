const express = require("express");
const  pool = require("../config.bd/db"); 
const router = express.Router();


//  Afficher toutes les catégories
router.get("/categorie",(req, res) => {
    pool.query("SELECT * FROM categorie", [], (erreur, resultat) => {
        if (erreur) {
            console.log("Erreur lors de la récupération des catégories:", erreur);
            return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
        }
        else res.status(200).send(resultat);
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

        res.status(200).send(resultat);
    });
});



// 🔹 Ajouter  une catégorie
router.post("/categorie",(req, res) => {
    const categorie = req.body.categorie;
    const imageUrl = req.body.image;

        const sql = "INSERT INTO categorie (categorie, image) VALUES (?,?)";
        const donnees = [categorie,imageUrl];

        pool.query(sql, donnees, (erreur, resultat) => {

            res.status(201).json({message: "Catégorie créée",id: resultat.insertId, });
        });
   
});

// pour modifier une categorie

router.put("/categorie/:idCategorie",(req, res) => {
    const id = req.params.idCategorie;
    const categorie = req.body.categorie;
    let imageUrl = req.body.image;

    let sql = "UPDATE categorie SET categorie = ?, image = ? WHERE idCategorie = ?";
    let donnees = [categorie, imageUrl, id];

    pool.query(sql, donnees, (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).json({ erreur });
    } else {
    res.status(200).json({
            message: "Catégorie mise à jour"
        });
    }  
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
module.exports= router;