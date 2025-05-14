const express = require("express")
const pool=require('../config.bd/db')
const router =express.Router();

// commandes pour afficher la table livreur

router.get("/livreur", (req, res) => {
    pool.query( "SELECT * FROM livreur", [] ,(erreur, resultat)=>{
      if(erreur){
        console.log(erreur);
        res.status(500).render("erreur",{erreur});
      }else{
        res.status(200).send(resultat);
      }
    });
  });

  // afficher d un livreur
  router.get("/livreur/:idLivreur", (req, res) => {
    const id = req.params.idLivreur;
  
    pool.query("SELECT * FROM livreur WHERE idLivreur = ?", [id], (erreur, resultat) => {
      if (erreur) {
        console.log(erreur);
        res.status(500).json({ erreur: "Erreur lors de la récupération du livreur" });
      } else if (resultat.length === 0) {
        res.status(404).json({ message: "Livreur non trouvé" });
      } else {
        res.status(200).send(resultat[0]);
      }
    });
  });
  
// creer un un bd livreur 

router.post("/livreur", (req, res) => {
  const { nom, prenom, statut, typeDeVehicule, numeroDeTel } = req.body;

  const sql = `INSERT INTO livreur (nom, prenom, statut, typeDeVehicule, numeroDeTel)
    VALUES (?, ?, ?, ?, ?)`;
  const donnees = [nom, prenom, statut, typeDeVehicule, numeroDeTel];

  pool.query(sql, donnees, (erreur, resultat) => {
    if (erreur) {
      console.log(erreur);
      res.status(500).json({ erreur: "Erreur lors de la création du livreur" });
    } else {
      res.status(201).json({ message: "Livreur créé avec succès", idLivreur: resultat.insertId });
    }
  });
});

  //  mise a jour d un livreur

  router.put("/livreur/:idLivreur", (req, res) => {
    const { nom, prenom, statut, typeDeVehicule, numeroDeTel } = req.body;
    const id = req.params.id;
  
    const sql = `UPDATE livreur SET nom = ?, prenom = ?, statut = ?, typeDeVehicule = ?, numeroDeTel = ? WHERE idLivreur = ?`;
    const donnees = [nom, prenom, statut, typeDeVehicule, numeroDeTel, id];
  
    pool.query(sql, donnees, (erreur, resultat) => {
      if (erreur) {
        console.log(erreur);
        res.status(500).json({ erreur: "Erreur lors de la mise à jour du livreur" });
      } else {
        res.status(200).json({ message: "Livreur modifié avec succès" });
      }
    });
  });
  


//   Pour effacer un un livreur

  router.delete("/livreur/:idLivreur",(req, res)=>{
    let id =req.params.idLivreur;
        pool.query( "DELETE FROM livreur WHERE idlivreur = ?", [id] ,(erreur, resultat)=>{
          if (erreur) {
            console.log(erreur);
            res.status(500).render("erreur", { erreur });
          } else {
            res.status(200).json({ message: "Livreur supprimé avec succès" });
          }
        }); 
      } 
    );

  module.exports= router;
