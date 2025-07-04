const express = require("express");
const pool = require("../config.bd/db"); 
const router = express.Router();

// --- Afficher toutes les livraisons ---
router.get("/livraison", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM livraison");
        res.status(200).json({
            success: true,
            message: "Livraisons récupérées avec succès.",
            data: rows 
        });
    } catch (erreur) {
        console.error("Erreur lors de la récupération des livraisons:", erreur);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des livraisons.",
            error: erreur.message 
        });
    }
});

// --- Afficher une livraison spécifique ---
router.get("/livraison/:idLivraison", async (req, res) => {
    const id = req.params.idLivraison;
    const sql = "SELECT * FROM livraison WHERE idLivraison = ?";

    try {
        const [rows] = await pool.query(sql, [id]);

        // Correction: Utilisez 'rows.length' car 'rows' est le tableau des résultats.
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Livraison non trouvée." });
        }

        res.status(200).json({
            success: true,
            message: "Livraison récupérée avec succès.",
            data: rows[0] // rows[0] est l'objet JSON unique désiré : {...}
        });
    } catch (erreur) {
        console.error(`Erreur lors de la récupération de la livraison ${id}:`, erreur);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de la livraison.",
            error: erreur.message
        });
    }
});

// --- Créer une livraison ---
router.post("/livraison", async (req, res) => {
    const { idCommande, idLivreur, adresseLiv, statut } = req.body;

    const sql = "INSERT INTO livraison (idCommande, idLivreur, adresseLiv, statut) VALUES (?, ?, ?, ?)";
    const donnees = [idCommande, idLivreur, adresseLiv, statut];

    try {
        // Pour INSERT, [result] contient les propriétés comme insertId et affectedRows
        const [result] = await pool.query(sql, donnees); 
        res.status(201).json({
            success: true,
            message: "Livraison créée avec succès.",
            idLivraison: result.insertId // Utilisation de 'result.insertId'
        });
    } catch (erreur) {
        console.error("Erreur lors de la création de la livraison:", erreur);
    
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création de la livraison.",
            error: erreur.message
        });
    }
});

// --- Modifier une livraison ---
router.put("/livraison/:idLivraison", async (req, res) => {
    const id = req.params.idLivraison;
    const { idCommande, idLivreur, adresseLiv, statut } = req.body;

    // Construction dynamique de la requête UPDATE pour ne modifier que les champs fournis
    let updates = [];
    let donnees = [];

    if (idCommande !== undefined) { updates.push("idCommande = ?"); donnees.push(idCommande); }
    if (idLivreur !== undefined) { updates.push("idLivreur = ?"); donnees.push(idLivreur); }
    if (adresseLiv !== undefined) { updates.push("adresseLiv = ?"); donnees.push(adresseLiv); }
    if (statut !== undefined) { updates.push("statut = ?"); donnees.push(statut); }

    if (updates.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Au moins un champ (idCommande, idLivreur, adresseLiv, statut) doit être fourni pour la mise à jour."
        });
    }
    
    donnees.push(id); // L'ID de la livraison est le dernier paramètre pour la clause WHERE

    const sql = `UPDATE livraison SET ${updates.join(", ")} WHERE idLivraison = ?`;

    try {
        // Pour UPDATE, [result] contient les propriétés comme affectedRows
        const [result] = await pool.query(sql, donnees);

        // Vérifier si une ligne a été affectée (si la livraison a été trouvée et mise à jour)
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Livraison non trouvée pour la mise à jour." 
            });
        }

        res.status(200).json({
            success: true,
            message: "Livraison mise à jour avec succès.",
            // Renvoie les données réellement mises à jour (celles qui étaient dans req.body)
            modifications: req.body 
        });
    } catch (erreur) {
        console.error(`Erreur lors de la modification de la livraison ${id}:`, erreur);
        // Gérer les erreurs de clé étrangère (si idCommande ou idLivreur est invalide)
        if (erreur.code === 'ER_NO_REFERENCED_ROW_2' || erreur.code === 'ER_NO_REFERENCED_ROW') {
            return res.status(400).json({
                success: false,
                message: "La commande ou le livreur spécifié(e) n'existe pas.",
                error: erreur.message
            });
        }
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la modification de la livraison.",
            error: erreur.message
        });
    }
});

// --- Supprimer une livraison ---
router.delete("/livraison/:idLivraison", async (req, res) => {
    const id = req.params.idLivraison;
    const sql = "DELETE FROM livraison WHERE idLivraison = ?";

    try {
        // Pour DELETE, [result] contient les propriétés comme affectedRows
        const [result] = await pool.query(sql, [id]);

        // Vérifier si une ligne a été affectée (si la livraison a été trouvée et supprimée)
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Livraison non trouvée pour la suppression." });
        }

        res.status(200).json({ success: true, message: "Livraison supprimée avec succès." });
    } catch (erreur) {
        console.error(`Erreur lors de la suppression de la livraison ${id}:`, erreur);
        // Vous pouvez ajouter une gestion pour les erreurs de clé étrangère si d'autres tables
        // référencent une livraison, mais c'est moins courant pour les suppressions de livraisons.
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression de la livraison.",
            error: erreur.message
        });
    }
});

module.exports = router;