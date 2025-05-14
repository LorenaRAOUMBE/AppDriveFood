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

  pool.query("SELECT * FROM Commande WHERE idCommande = ?", [id], (erreur, resultat) => {
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

      const { idClient, idPlat, statut, modeDepaiement,date_com} = req.body;
    
    let reqsql = "INSERT INTO commande ( idClient, idPlat, statut, modeDePaiement,date_com) VALUES ( ?, ?, ?, ?, ?)"; 

    let donnees = [ idClient, idPlat, statut, modeDePaiement, date_com];

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
  const { idClient, idPlat, statut, modeDePaiement, date_com } = req.body;

  const sql = "UPDATE Commande SET idClient = ?, idPlat = ?, Statut = ?, modeDepaiement = ?, date_com = ? WHERE idCommande = ?";

  const donnees  = [idClient, idPlat, statut, modeDePaiement, date_com, idCommande];

  pool.query(sql, donnees, (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).render("erreur", { erreur });
    } else {
      res.status(200).json({ message: "Commande modifiée avec succès" });
    }
  });
});

// Supprimer une commande
router.delete("/commande/:idCommande", (req, res) => {
  const id = req.params.idCommande;

  pool.query("DELETE FROM Commande WHERE idCommande = ?", [id], (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).render("erreur", { erreur });
    } else {
      res.status(200).json({ message: "Commande supprimée avec succès" });
    }
  });
});


  module.exports= router;