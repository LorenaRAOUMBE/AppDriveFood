const express = require("express")
const pool=require('../config.bd/db')
const router =express.Router();

//  Afficher les clients

router.get("/client", (req, res) => {
    pool.query( "SELECT * FROM client", [] ,(erreur, resultat)=>{
      if(erreur){
        console.log(erreur);
        res.status(500).render  ("erreur",{erreur});
      }else{
        res.status(200).send({resultat:resultat });
      }
    });
  });

  // Afficher un client 

router.get("/client/:idClient", (req, res) => {
  const id = req.params.idClient;
  const sql = "SELECT * FROM client WHERE idClient = ?";

  pool.query(sql, [id], (erreur, resultat) => {
      if (erreur) {
          console.error("Erreur lors de la récupération du client:", erreur);
          return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
      }

      if (resultat.length === 0) {
          return res.status(404).json({ error: "Client non trouvé" });
      }

      res.status(200).json(resultat[0]);
  });
});
  //  Ajouter d un client
  router.post("/client", (req, res) => {
    const { nom, prenom, numeroDeTel } = req.body;
  
    const sql = "INSERT INTO client ( nom, prenom, numeroDeTel) VALUES(?,?,?)";
    const data = [nom, prenom, numeroDeTel];
  
    pool.query(sql, data, (erreur, resultat) => {
      if (erreur) {
        console.log(erreur);
        res.status(500).json({ erreur });
      } else {
        res.status(201).json({ message: "compte client créé avec succès" });
      }
    });
  });

// Modifier un client
router.put("/client/:idClient", (req, res) => { 
  const id  = req.params.idClient;
  const { nom, prenom, numeroDeTel } = req.body;

  const sql = ` UPDATE client SET nom = ?, prenom = ?, numeroDeTel = ? WHERE idClient = ? `;

  const donnees = [nom, prenom, numeroDeTel, id];

  pool.query(sql, donnees, (erreur, resultat) => {
      if (erreur) {
          console.error("Erreur lors de la mise à jour du client:", erreur);
          return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
      }

      res.status(200).json({ message: "Client mis à jour" });
  });
});

//   Pour effacer un client

  router.delete("/client/:idClient",(req, res)=>{
    
    let id =req.params.idClient;
    const sql = "DELETE FROM client WHERE idClient= ?";

        pool.query( sql, [id] ,(erreur, resultat)=>{
          if(erreur){
            console.log(erreur);
            res.status(500).render  ("erreur",{erreur});
          }else{
            res.status(200).json({  message: "Client supprimé avec succès"});
          }
        }); 
      } 
    );

  module.exports= router;
