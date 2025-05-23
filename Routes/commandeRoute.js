const express = require("express")
const pool=require('../config.bd/db')
const router =express.Router();

// Lire toutes les commandes

router.get("/commande", (req, res) => {
    pool.query( "SELECT * FROM commande", [] ,(erreur, resultat)=>{
      if(erreur){
        console.log(erreur);
        res.status(500).render  ("erreur",{erreur});
      }else{
        res.status(200).send(resultat);
      }
    });
  });

  // Lire une commande spécifique

router.get("/commande/:idCommande", (req, res) => {
  const id = req.params.idCommande ;

  pool.query("SELECT * FROM commande WHERE idCommande = ?", [id], (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).render("erreur", { erreur });

    } else {
      res.status(200).send(resultat[0]); 
    }
  });
});

// creer une commande

  router.post("/commande", (req, res) => {

      const { idUtilisateur, idPlat, modeDepaiement,date_com} = req.body;
      const statut =req.body.statut||'en préparation'
    
    let reqsql = "INSERT INTO commande ( idUtilisateur, idPlat, statut, modeDePaiement,date_com) VALUES ( ?, ?, ?, ?, ?)"; 

    let donnees = [ idUtilisateur, idPlat, statut, modeDePaiement, date_com];

    pool.query(reqsql, donnees, (erreur, resultat) => {
        if (erreur) {
            console.log(erreur);
            res.status(500).render("erreur", { erreur });
        } else {
            res.status(200).json({ message: "Commande créée avec succès!", commandeId: resultat.insertId }); 
        }
    });
});

// Modifier une commande

router.put("/commande/:idCommande", (req, res) => {
  const idCommande= req.params.idCommande;
  const statut = req.body.statut;

  const sql = "UPDATE commande SET Statut = ? WHERE idCommande = ?";

  const donnees  = [statut, idCommande];

  pool.query(sql, donnees, (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).render("erreur", { erreur });
    } else {
      res.status(200).json({ message: "Statut commande modifiée avec succès" });
    }
  });
});

// Supprimer une commande
router.delete("/commande/:idCommande", (req, res) => {
  const id = req.params.idCommande;

  pool.query("DELETE FROM commande WHERE idCommande = ?", [id], (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).render("erreur", { erreur });
    } else {
      res.status(200).json({ message: "Commande supprimée avec succès" });
    }
  });
});


  module.exports= router;