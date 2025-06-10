const express = require("express");
const  pool = require("../config.bd/db"); 
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

  // creation nouveau plat dans la carte

router.post("/plat", (req, res) => {
    const { idRestaurant, nom, prix, details } = req.body;
    const imageUrl = req.body.image;

    const sql = ` INSERT INTO plat (idRestaurant, nom, prix, details, image) VALUES (?, ?, ?, ?, ?) `;
    const data = [idRestaurant, nom, prix, details, imageUrl];

    pool.query(sql, data, (erreur, resultat) => {
      if (erreur) {
        console.error("Erreur lors de l'ajout du plat:", erreur);
           return res.status(500).json({ erreur: "Erreur lors de l'ajout du plat", details: erreur.message });     
        } else {
           res.status(201).json({ message: "Plat ajouté avec succès", idPlat: resultat.insertId });     
        }        
    })
  });
  
  // pour modifier un plat

router.put("/plat/:idPlat", (req, res) => {
    const idPlat = req.params.idPlat;
    const { idRestaurant ,nom, prix, details } = req.body;
    let imageUrl =req.body.image ;

    const sql = `UPDATE plat SET idRestaurant= ? , nom = ?, prix = ?, details = ?, image = ? WHERE idPlat = ?`;
    const data = [idRestaurant,nom, prix, details,imageUrl,idPlat];
   
        pool.query(sql, data, (erreur, resultat) => {
            if (erreur) {
                console.error("Erreur lors de la mise à jour du plat:", erreur);
                return res.status(500).json({ erreur: "Erreur lors de la mise à jour du plat", details: erreur.message });
            }

            if (resultat.affectedRows === 0) {
                return res.status(404).json({ error: "Plat non trouvé" });
            } else {
                res.status(200).json({ message: "Plat mis à jour avec succès"});
            }
        });
    }
);
  
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