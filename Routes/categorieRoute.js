const express = require("express");
const pool = require("../config.bd/db"); // Assurez-vous que ce fichier utilise 'mysql2/promise'
const router = express.Router();

// --- Afficher toutes les catégories ---
router.get("/categorie", async (req, res) => {
    try {
        
        const [rows] = await pool.query("SELECT * FROM categorie");
        
        // Pour une collection (plusieurs résultats), il est standard de renvoyer un tableau JSON.
        res.status(200).json({
            data: rows // 'rows' est déjà le tableau d'objets désiré
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des catégories:", error);
        res.status(500).json({ 
            success: false,
            message: "Erreur serveur lors de la récupération des catégories.", 
            error: error.message 
        });
    }
});

// --- Afficher une catégorie spécifique ---
router.get("/categorie/:idCategorie", async (req, res) => {
    const id = req.params.idCategorie;
    const sql = "SELECT * FROM categorie WHERE idCategorie = ?";

    try {
 
        const [rows] = await pool.query(sql, [id]);

   
        if (rows.length === 0) {
            // Renvoie un message clair si la catégorie n'est pas trouvée
            return res.status(404).json({ 
                success: false,
                message: "Catégorie non trouvée." 
            });
        }

        // Pour une ressource unique, renvoyez l'objet directement (rows[0]).
        // Ce sera l'objet JSON unique désiré : {...}
        res.status(200).json({
            success: true,
            message: "Catégorie récupérée avec succès.",
            data: rows[0] // rows[0] est l'objet JSON unique
        });
    } catch (error) {
        console.error("Erreur lors de la récupération de la catégorie:", error);
        res.status(500).json({ 
            success: false,
            message: "Erreur serveur lors de la récupération de la catégorie.", 
            error: error.message 
        });
    }
});

// --- Ajouter une catégorie ---
router.post("/categorie", async (req, res) => {
    const { categorie, image: imageUrl } = req.body; 
    
    // Validation basique des entrées: s'assurer que les données nécessaires sont présentes
    if (!categorie || !imageUrl) {
        return res.status(400).json({ 
            success: false,
            message: "Les champs 'categorie' et 'image' sont requis." 
        });
    }

    const sql = "INSERT INTO categorie (categorie, image) VALUES (?,?)";
    const donnees = [categorie, imageUrl];

    try {
        // [result] déstructure le premier élément du tableau retourné par pool.query(),
        // qui contient insertId, affectedRows, etc.
        const [result] = await pool.query(sql, donnees); 
        res.status(201).json({ 
            success: true,
            message: "Catégorie créée avec succès.", 
            id: result.insertId // L'ID de la nouvelle catégorie
        });
    } catch (error) {
        console.error("Erreur lors de l'ajout de la catégorie:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            // Gérer les cas où la catégorie existe déjà (si vous avez une contrainte UNIQUE sur 'categorie')
            return res.status(409).json({ 
                success: false,
                message: "Cette catégorie existe déjà.", 
                error: error.message 
            });
        }
        res.status(500).json({ 
            success: false,
            message: "Erreur serveur lors de l'ajout de la catégorie.", 
            error: error.message 
        });
    }
});

// --- Modifier une catégorie ---
router.put("/categorie/:idCategorie", async (req, res) => {
    const id = req.params.idCategorie;
    const { categorie, image: imageUrl } = req.body;

    // Validation basique
    if (!categorie && !imageUrl) {
        return res.status(400).json({
            success: false,
            message: "Au moins un champ ('categorie' ou 'image') est requis pour la mise à jour."
        });
    }

    // Construction dynamique de la requête UPDATE pour ne modifier que les champs fournis
    let updates = [];
    let donnees = [];

    if (categorie !== undefined) {
        updates.push("categorie = ?");
        donnees.push(categorie);
    }
    if (imageUrl !== undefined) {
        updates.push("image = ?");
        donnees.push(imageUrl);
    }

    if (updates.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Aucune donnée à mettre à jour fournie."
        });
    }

    const sql = `UPDATE categorie SET ${updates.join(", ")} WHERE idCategorie = ?`;
    donnees.push(id); // L'ID est toujours le dernier paramètre pour la clause WHERE

    try {
        // [result] contient affectedRows
        const [result] = await pool.query(sql, donnees); 

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Catégorie non trouvée pour la mise à jour." 
            });
        }
        res.status(200).json({ 
            success: true,
            message: "Catégorie mise à jour avec succès." 
        });
    } catch (error) {
        console.error("Erreur lors de la modification de la catégorie:", error);
        res.status(500).json({ 
            success: false,
            message: "Erreur serveur lors de la modification de la catégorie.", 
            error: error.message 
        });
    }
});

// --- Supprimer une catégorie ---
router.delete("/categorie/:idCategorie", async (req, res) => {
    const id = req.params.idCategorie;
    const sql = "DELETE FROM categorie WHERE idCategorie = ?";

    try {
        // [result] contient affectedRows
        const [result] = await pool.query(sql, [id]); 

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Catégorie non trouvée pour la suppression." 
            });
        }
        res.status(200).json({ 
            success: true,
            message: "Catégorie supprimée avec succès." 
        });
    } catch (error) {
        console.error("Erreur lors de la suppression de la catégorie:", error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_NO_REFERENCED_ROW_2') {
             // Gérer les erreurs de clé étrangère (si d'autres tables référencent cette catégorie)
            return res.status(409).json({
                success: false,
                message: "Cette catégorie ne peut pas être supprimée car elle est référencée par d'autres enregistrements (ex: plats).",
                error: error.message
            });
        }
        res.status(500).json({ 
            success: false,
            message: "Erreur serveur lors de la suppression de la catégorie.", 
            error: error.message 
        });
    }
});

module.exports = router;