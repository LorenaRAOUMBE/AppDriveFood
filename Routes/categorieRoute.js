const express = require("express");
const { pool, cloudinary } = require("../config.bd/db"); 
const router = express.Router();
const multer = require("multer");
const upload=multer({storage:multer.memoryStorage()});

//  Afficher toutes les catégories
router.get("/categorie",(req, res) => {
    pool.query("SELECT * FROM categorie", [], (erreur, resultat) => {
        if (erreur) {
            console.log("Erreur lors de la récupération des catégories:", erreur);
            return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
        }
        else res.status(200).send(resultat);
    });
});

// Afficher une categorie
router.get("/categorie/:idCategorie", (req, res) => {
    const id = req.params.idCategorie;
    const sql = "SELECT * FROM categorie WHERE idCategorie = ?";

    pool.query(sql, [id], (erreur, resultat) => {
        if (erreur) {
            console.error("Erreur lors de la récupération de la catégorie:", erreur);
            return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
        }

        if (resultat.length === 0) {
            return res.status(404).json({ error: "Catégorie non trouvée" });
        }

        res.status(200).send(resultat);
    });
});



// 🔹 Ajouter  une catégorie
router.post("/categorie",upload.single("image"),async(req, res) => {
    const categorie = req.body.categorie;
    try{
            if (!req.file){ return res.status(400).json({ error: "Veuillez télécharger une image." });
        }

            // telecharger l image sur cloudinary
            
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        const result = await cloudinary.uploader.upload(base64Image, {
            resource_type: 'image', 
            folder: "categories" 
        });
        const imageUrl = result.secure_url;

        const sql = "INSERT INTO categorie (categorie, image) VALUES (?,?)";
        const donnees = [categorie,imageUrl];

        pool.query(sql, donnees, (erreur, resultat) => {
            if (erreur) {
                console.error("Erreur lors de l'ajout de la catégorie:", erreur);
                return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
            }

            res.status(201).json({message: "Catégorie créée",id: resultat.insertId, });
        });
    }catch(error){
          console.error("Erreur lors du téléchargement de l'image sur Cloudinary:", error);
        res.status(500).json({ error: "Erreur lors du téléchargement de l'image." });}
});

// pour modifier une categorie

router.put("/categorie/:idCategorie", upload.single('image'), async (req, res) => {
    const id = req.params.idCategorie;
    const categorie = req.body.categorie;
    let imageUrl = null;
    let currentImageUrl = null;

    try {
        // Récupérer l'URL de l'image actuelle
        const selectSql = "SELECT image FROM categorie WHERE idCategorie = ?";
        const [existingCategory] = await pool.promise().query(selectSql, [id]);

        if (existingCategory && existingCategory[0] && existingCategory[0].image) {
            currentImageUrl = existingCategory[0].image;
        }

        if (req.file) {
            // Télécharger la nouvelle image sur Cloudinary
            const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

            const result = await cloudinary.uploader.upload(base64Image, {
                resource_type: 'image', 
                folder: "categories" 
            });
                imageUrl = result.secure_url;
            }

        let sql;
        let donnees;

        if (imageUrl) {
            sql = "UPDATE categorie SET categorie = ?, image = ? WHERE idCategorie = ?";
            donnees = [categorie, imageUrl, id];
        } else {
            sql = "UPDATE categorie SET categorie = ? WHERE idCategorie = ?";
            donnees = [categorie, id];
        }

        const [resultat] = await pool.promise().query(sql, donnees);

        if (resultat.affectedRows === 0) {
            return res.status(404).json({ error: "Catégorie non trouvée" });
        }

        res.status(200).json({
            message: "Catégorie mise à jour",
            imageUrl: imageUrl || currentImageUrl // Renvoyer la nouvelle URL ou l'ancienne
        });

    } catch (error) {
        console.error("Erreur lors de la mise à jour de la catégorie:", error);
        return res.status(500).json({ error: "Erreur serveur", details: error.message });
    }
});
// 🔹 Supprimer une catégorie

router.delete("/categorie/:idCategorie", (req, res) => {
    const id = req.params.idCategorie;
    const sql = "DELETE FROM categorie WHERE idCategorie = ?";

    pool.query(sql, [id], (erreur, resultat) => {
        if (erreur) {
            console.error("Erreur lors de la suppression de la catégorie:", erreur);
            return res.status(500).json({ error: "Erreur serveur", details: erreur.message });
        }

        res.status(200).json({ message: "Catégorie supprimée" });
    });
});
module.exports= router;