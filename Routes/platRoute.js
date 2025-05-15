const express = require("express");
const { pool, cloudinary } = require("../config.bd/db");
const router =express.Router();
const multer=require("multer");
const upload=multer({storage:multer.memoryStorage()});

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

router.post("/plat", upload.single("image"), async (req, res) => {
    const { idRestaurant, nom, prix, details } = req.body;

    try {
        if (!req.file) {
            return res.status(400).json({ error: "Veuillez télécharger une image." });
        }

        // telecharger l image sur cloudinary
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        const result = await cloudinary.uploader.upload(base64Image, {
            resource_type: 'image', 
            folder: "Plats" 
        });
        const imageUrl = result.secure_url;

        const sql = ` INSERT INTO plat (idRestaurant, nom, prix, details, image) VALUES (?, ?, ?, ?, ?) `;

        const data = [idRestaurant, nom, prix, details, imageUrl];

        pool.query(sql, data, (erreur, resultat) => {
            if (erreur) {
                console.error("Erreur lors de l'ajout du plat:", erreur);
                return res.status(500).json({ erreur: "Erreur lors de l'ajout du plat", details: erreur.message });
            } else {
                res.status(201).json({ message: "Plat ajouté avec succès", idPlat: resultat.insertId, imageUrl });
            }
        });
    } catch (error) {
        console.error("Erreur lors du téléchargement de l'image sur Cloudinary:", error);
        res.status(500).json({ error: "Erreur lors du téléchargement de l'image.", details: error.message });
    }
});


  // pour modifier un plat

 
router.put("/plat/:idPlat", upload.single('image'), async (req, res) => {
    const idPlat = req.params.idPlat;
    const { nom, prix, details } = req.body;
    let imageUrl = null;

    try {
        if (req.file) {
            // Télécharger la nouvelle image sur Cloudinary

           const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

           const result = await cloudinary.uploader.upload(base64Image, {
            resource_type: 'image', 
            folder: "Plats" 
        });
            imageUrl = result.secure_url;
        }

        let sql;
        let data;

        if (imageUrl) {
            sql = `UPDATE plat SET nom = ?, prix = ?, details = ?, image = ? WHERE idPlat = ?`;
            data = [nom, prix, details, imageUrl, idPlat];
        } else {
            sql = "UPDATE plat SET nom = ?, prix = ?, details = ? WHERE idPlat = ?";
            data = [nom, prix, details, idPlat];
        }

        pool.query(sql, data, (erreur, resultat) => {
            if (erreur) {
                console.error("Erreur lors de la mise à jour du plat:", erreur);
                return res.status(500).json({ erreur: "Erreur lors de la mise à jour du plat", details: erreur.message });
            }

            if (resultat.affectedRows === 0) {
                return res.status(404).json({ error: "Plat non trouvé" });
            } else {
                res.status(200).json({ message: "Plat mis à jour avec succès", imageUrl: imageUrl });
            }
        });
    } catch (error) {
        console.error("Erreur lors du téléchargement de l'image sur Cloudinary:", error);
        res.status(500).json({ error: "Erreur lors du téléchargement de l'image.", details: error.message });
    }
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