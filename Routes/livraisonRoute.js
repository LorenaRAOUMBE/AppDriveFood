const express = require("express");
const pool = require("../config.bd/db"); 
const router = express.Router();

// afficher des livraisons

router.get("/livraison", (req, res) => {
  pool.query("SELECT * FROM livraison", [], (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).render("erreur", { erreur }); 
    } else {
      res.status(200).send(resultat);
    }
  });
});
// Afficher une livraison spécifique 

router.get("/livraison/:idLivraison", (req, res) =>{
  const id = req.params.idLivraison;
  const sql = "SELECT * FROM livraison WHERE idLivraison = ?";

  pool.query(sql, [id], (erreur, resultat) => {
      if (erreur) {
          console.error("Erreur lors de la récupération de la livraison:", erreur);
          return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
      }
      res.status(200).send(resultat[0]);
  });
});

// creer une livraison 

router.post("/livraison", (req, res) => {
  const { idCommande, idLivreur, adresseLiv} = req.body;
   const statut =req.body.statut

  const sql = "INSERT INTO livraison (idCommande, idLivreur, adresseLiv, statut) VALUES (?, ?, ?, ?)";
  const donnees = [idCommande, idLivreur, adresseLiv, statut];

  pool.query(sql, donnees, (erreur, resultat) => {
      if (erreur) {
          console.log(erreur);
          res.status(500).render("erreur", { erreur });
      } else {
          res.status(201).json({ message: "Livraison créée avec succès" }); 
      }
  });
});

//modifier une livraison
router.put("/livraison/:idLivraison", (req, res) => {
  const id = req.params.idLivraison;
  const { idCommande, idLivreur, adresseLiv, statut } = req.body;

  const sql = "UPDATE livraison SET idCommande = ?, idLivreur = ?, adresseLiv = ?, statut = ? WHERE idLivraison = ?";
  const donnees = [idCommande, idLivreur, adresseLiv, statut, id];

  pool.query(sql, donnees, (erreur, resultat) => {
      if (erreur) {
          console.log(erreur);
          res.status(500).render("erreur", { erreur });
      } else {
          res.status(200).json({ message: "Livraison mise à jour avec succès" }); 
      }
  });
});

// Effacer une table 

  router.delete("/livraison/:idLivraison",(req, res)=>{
    let id =req.params.idLivraison;
        pool.query( "DELETE FROM livraison WHERE idLivraison = ?", [id] ,(erreur, resultat)=>{
          if (erreur) {
            console.error("Erreur lors de la suppression de la catégorie:", erreur);
            return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
        }
        res.status(200).json({ message: "Catégorie supprimée" });
    });
      } 
    );

  module.exports= router;