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

      const { idUtilisateur, idPlat,date_com} = req.body;
      const modeDePaiement=req.body.modeDePaiement ||"espece"
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

// Modifier le statut et le mode de paiement d'une commande
router.put("/commande/:idCommande", (req, res) => {
  const idCommande = req.params.idCommande;
  const  statut = req.body.status ||'en préparation';
  const modeDePaiement=req.body.modeDePaiement ||"espece"

  // Construction dynamique de la requête SQL
  let updates = [];
  let donnees = [];

  if (statut) {
    updates.push("Statut = ?");
    donnees.push(statut);
  }

  if (modeDePaiement) {
    updates.push("modeDePaiement = ?");
    donnees.push(modeDePaiement);
  }

  // Ajout de l'ID à la fin du tableau des données
  donnees.push(idCommande);

  const sql = `UPDATE commande SET ${updates.join(", ")} WHERE idCommande = ?`;

  pool.query(sql, donnees, (erreur, resultat) => {
    if (erreur) {
      console.error("Erreur lors de la modification:", erreur);
      return res.status(500).json({ 
        success: false,
        message: "Erreur lors de la modification de la commande",
        error: erreur.message 
      });
    }

    res.status(200).json({ 
      success: true,
      message: "Commande modifiée avec succès",
      modifications: {
        statut: statut || "non modifié",
        modeDePaiement: modeDePaiement || "non modifié"
      }
    });
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