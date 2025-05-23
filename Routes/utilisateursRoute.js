const express = require("express");
const pool=require('../config.bd/db');
const bcrypt =require("bcrypt");
const router =express.Router();

//  Afficher les utilisateurs

router.get("/utilisateurs", (req, res) => {
    pool.query( "SELECT * FROM utilisateurs",[], (erreur, resultat)=>{
      if(erreur){
        console.log(erreur);
        res.status(500).render  ("erreur",{erreur});
      }else{
        res.status(200).send(resultat);
      }
    });
  });

  // Afficher un utilisateur

router.get("/utilisateurs/:idUtilisateur", (req, res) => {
  const id = req.params.idUtilisateur;
  const sql ="SELECT * FROM utilisateurs WHERE idUtilisateur = ?";

  pool.query(sql, [id], (erreur, resultat) => {
      if (erreur) {
          console.error("Erreur lors de la récupération du utilisateur:", erreur);
          return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
      }

      if (resultat.length === 0) {
          return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      res.status(200).send(resultat[0]);
  });
});
  //  Ajouter d un Utilisateur
  router.post("/utilisateurs", async(req, res) => {
    const {nom, numeroDeTel, email, password, image} = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const role=req.body.role||"client";
    const verifie=req.body.verifie||"FALSE";
  
    const sql = "INSERT INTO utilisateurs ( nom,numeroDeTel, email,password ,role, image,verifie) VALUES(?,?,?,?,?,?,?)";
    const data = [ nom,numeroDeTel, email,hashedPassword,role, image,verifie];
  
    pool.query(sql, data, (erreur, resultat) => {
      if (erreur) {
        console.log(erreur);
        res.status(500).json({ erreur });
      } else {
        res.status(201).json({ message: "compte utilisateur créé avec succès" });
      }
    });
  });

// Modifier un utilisateur
router.put("/utilisateurs/:idUtilisateur", async(req, res) => { 
  const id  = req.params.idUtilisateur;
  const {nom, numeroDeTel, email, password, role,verifie} = req.body;
  const image=req.body.image||null;
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = ` UPDATE utilisateurs SET nom = ?, numeroDeTel = ?,email =?, password =?,role = ?,image=? ,verifie=? WHERE idUtilisateur = ? `;

  const donnees = [nom, numeroDeTel, email, hashedPassword , role, image,verifie, id];

  pool.query(sql, donnees, (erreur, resultat) => {
      if (erreur) {
          console.error("Erreur lors de la mise à jour de l'utilisateur:", erreur);
          return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
      }

      res.status(200).json({ message: "Utilisateur mis à jour" });
  });
});

//   Pour effacer un utilisateur

  router.delete("/utilisateurs/:idUtilisateur",(req, res)=>{
    
    let id =req.params.idUtilisateur;
    const sql = "DELETE FROM utilisateurs WHERE idUtilisateur= ?";

        pool.query( sql, [id] ,(erreur, resultat)=>{
          if(erreur){
            console.log(erreur);
            res.status(500).render  ("erreur",{erreur});
          }else{
            res.status(200).json({  message: "Utilisateur supprimé avec succès"});
          }
        }); 
      } 
    );

  module.exports= router;
