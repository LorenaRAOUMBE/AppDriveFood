const express = require("express");
const { pool, cloudinary } = require("../config.bd/db"); 
const router = express.Router();

// Afficher tous les administrateurs
router.get("/administrateur", (req, res) => {
  pool.query("SELECT * FROM administrateur", [], (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).send({ erreur });
    } else {
      res.status(200).send( resultat );
    }
  });
});

// Afficher un administrateur

router.get("/administrateur/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM administrateur WHERE id = ?";

  pool.query(sql, [id], (erreur, resultat) => {
      if (erreur) {
          console.error("Erreur lors de la récupération de l'administrateur:", erreur);
          return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
      }
      res.status(200).json(resultat[0]);
  });
});


// Créer un administrateur
router.post("/administrateur", (req, res) => {
  const { nom, prenom, email } = req.body;

  const sql = "INSERT INTO administrateur(nom, prenom, email) VALUES(?, ?, ?)";
  const data = [nom, prenom, email];

  pool.query(sql, data, (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).json({ erreur });
    } else {
      res.status(201).send({ message: "Administrateur créé avec succès" });
    }
  });
});

// Modifier un administrateur
router.put("/administrateur/:id", (req, res) => {
  const { id } = req.params;
  const { nom, prenom, email } = req.body;

  const sql = "UPDATE administrateur SET nom = ?, prenom = ?, email = ? WHERE id = ?";
  const data = [nom, prenom, email, id];

  pool.query(sql, data, (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).json({ erreur });
    } else {
      res.status(200).json({ message: "Mise à jour réussie" });
    }
  });
});

// Supprimer un administrateur
router.delete("/administrateur/:id", (req, res) => {
  let id =req.params.id;

  pool.query("DELETE FROM administrateur WHERE id = ?", [id], (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).json({ erreur });
    } else {
      res.status(200).json({ message: "Administrateur supprimé" });
    }
  });
});

module.exports = router;
