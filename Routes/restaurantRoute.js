const express = require("express");
const pool = require('../config.bd/db');
const router = express.Router();

// Commande pour afficher tous les restaurants
router.get("/restaurant", (req, res) => {
  pool.query("SELECT * FROM restaurant", [], (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).render("erreur", { erreur });
    } else {
      res.status(200).send(resultat);
    }
  });
});

// Commande pour afficher un seul restaurant 

router.get("/restaurant/:idRestaurant", (req, res) => {
  const id = req.params.idRestaurant;  

  pool.query("SELECT * FROM restaurant WHERE idRestaurant = ?", [id], (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).render("erreur", { erreur });
    } else {
      res.status(200).send(resultat);
    }
  });
});

// Requête pour l'insertion d'un nouveau restaurant

router.post("/restaurant", (req, res) => {
  const { idCategorie, nom, adresse } = req.body;  
  const reqsql = "INSERT INTO restaurant (idCategorie, nom, adresse) VALUES (?, ?, ?)";
  const donnees = [idCategorie, nom, adresse];

  pool.query(reqsql, donnees, (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).render("erreur", { erreur });
    } else {
      res.status(201).json({ message: "Restaurant ajouté avec succès", idRestaurant: resultat.insertId });
    }
  });
});

// Mise à jour d'un restaurant

router.put("/restaurant/:idRestaurant", (req, res) => {
  const { idRestaurant, idCategorie, nom, adresse } = req.body;  
  const reqsql = "UPDATE restaurant SET idCategorie = ?, nom = ?, adresse = ? WHERE idRestaurant = ?";
  const donnees = [idCategorie, nom, adresse, idRestaurant];

  pool.query(reqsql, donnees, (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).render("erreur", { erreur });
    } else {
      res.status(200).json({ message: "Restaurant mis à jour avec succès", idRestaurant });
    }
  });
});

// Suppression d'un restaurant

router.delete("/restaurant/:idRestaurant", (req, res) => {
  const id = req.params.idRestaurant;  
  pool.query("DELETE FROM restaurant WHERE idRestaurant = ?", [id], (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).render("erreur", { erreur });
    } else {
      res.status(200).json({ message: "Restaurant supprimé avec succès", routeRacine: "/restaurant" });
    }
  });
});

module.exports = router;
