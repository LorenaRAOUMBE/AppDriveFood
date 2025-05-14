const express = require("express")
const pool=require('../config.bd/db')
const router =express.Router();

//  Afficher tous les plats

router.get("/plat", (req, res) => {
    pool.query( "SELECT * FROM plat", [] ,(erreur, resultat)=>{
      if(erreur){
        console.log(erreur);
        res.status(500).render ("erreur",{erreur});
      }else{
        res.status(200).send(resultat);
      }
    });
  });

  // Afficher un plat
  
  router.get("/plat/:idPlat", (req, res) => {
    const id = req.params.idPlat;
    const sql = "SELECT * FROM plat WHERE idPlat= ? ";

    pool.query(sql, [id], (erreur, resultat) => {
        if (erreur) {
            console.error("Erreur lors de la récupération de le plat:", erreur);
            return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
        }

        res.status(200).send(resultat[0]);
    });
});
  // creation nouveau plat das la carte
  router.post("/plat", (req, res) => {
    const { idRestaurant, nom, prix, details,photo} = req.body;
  
    const sql = ` INSERT INTO plat (idRestaurant, nom, prix, details,photo) VALUES (?, ?, ?, ?,?)
    `;
    const data = [idRestaurant, nom, prix, details,photo];
  
    pool.query(sql, data, (erreur, resultat) => {
      if (erreur) {
        console.log(erreur);
        res.status(500).json({ erreur: "Erreur lors de l'ajout du plat" });
      } else {
        res.status(201).json({ message: "Plat ajouté avec succès", idPlat: resultat.insertId });
      }
    });
  });

  // pour modifier u plat

  router.put("/plat/:idPlat", (req, res) => {
    const id = req.params.idPlat;
    const { nom, prix, details,photo} = req.body;
  
    const sql = `UPDATE plat SET nom = ?, prix = ?, details = ? photo= ? WHERE idPlat = ?`;
    const data = [ nom, prix, details, idPlat];
  
    pool.query(sql, data, (erreur, resultat) => {
      if (erreur) {
        console.log(erreur);
        res.status(500).json({ erreur: "Erreur lors de la mise à jour du plat" });
      }  else {
        res.status(200).json({ message: "Plat mis à jour avec succès" });
      }
    });
  });
  

//   Pour effacer un plat

  router.delete("/plat/:idPlat",(req, res)=>{
    let id =req.params.idPlat;
        pool.query( "DELETE FROM plat WHERE idplat = ?", [id] ,(erreur, resultat)=>{
          if (erreur) {
            console.log(erreur);
            res.status(500).render("erreur", { erreur });
          } else {
            res.status(200).json({ message: "Plat supprimée avec succès" });
          }
          }); 
      } 
    );

  module.exports= router;