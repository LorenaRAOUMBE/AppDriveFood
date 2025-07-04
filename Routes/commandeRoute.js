const express = require("express");
const pool = require('../config.bd/db'); // S'appuie sur votre configuration mysql2/promise
const router = express.Router();

// --- Récupérer toutes les commandes (avec les détails de l'utilisateur et du restaurant) ---
router.get("/commande", async (req, res) => {
    try {
        const [commandes] = await pool.query(`
            SELECT 
                c.idCommande, 
                c.idUtilisateur, 
                u.nom AS nomUtilisateur, 
                u.email AS emailUtilisateur,
                c.idRestaurant, 
                r.nom AS nomRestaurant,
                c.date_com,             
                c.statut, 
                c.modeDePaiement,       
                c.montant_total AS total 
            FROM 
                commande c
            JOIN 
                utilisateurs u ON c.idUtilisateur = u.idUtilisateur
            JOIN 
                restaurant r ON c.idRestaurant = r.idRestaurant
            ORDER BY c.date_com DESC
        `); //
        res.status(200).json({
            success: true,
            message: "Commandes récupérées avec succès.",
            data: commandes
        });
    } catch (error) {
        console.error("Erreur lors de la récupération de toutes les commandes:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des commandes.",
            error: error.message
        });
    }
});

// --- Récupérer une commande spécifique (avec ses détails de produits) ---
router.get("/commande/:idCommande", async (req, res) => {
    const idCommande = req.params.idCommande;

    try {
        // Récupérer la commande principale
        const [commandeResult] = await pool.query(`
            SELECT 
                c.idCommande, 
                c.idUtilisateur, 
                u.nom AS nomUtilisateur, 
                u.email AS emailUtilisateur,
                c.idRestaurant, 
                r.nom AS nomRestaurant,
                c.date_com,             
                c.statut, 
                c.modeDePaiement,       
                c.montant_total AS total 
            FROM 
                commande c
            JOIN 
                utilisateurs u ON c.idUtilisateur = u.idUtilisateur
            JOIN 
                restaurant r ON c.idRestaurant = r.idRestaurant
            WHERE c.idCommande = ?
        `, [idCommande]); //

        if (commandeResult.length === 0) {
            return res.status(404).json({ success: false, message: "Commande non trouvée." });
        }

        const commande = commandeResult[0];

        // Récupérer les détails des produits pour cette commande
        // Nom de la table et des champs ajustés: Commande_Produits, prix_unitaire
        const [produitsCommande] = await pool.query(`
            SELECT 
                cp.idPlat, 
                p.nom AS nomPlat, 
                cp.prix_unitaire,      -- Changement ici
                cp.quantite,
                (cp.prix_unitaire * cp.quantite) AS sousTotal
            FROM 
                Commande_Produits cp   -- Changement ici
            JOIN 
                plat p ON cp.idPlat = p.idPlat
            WHERE cp.idCommande = ?
        `, [idCommande]); //

        // Ajouter les produits à l'objet commande
        commande.produits = produitsCommande; // Changement de 'plats' à 'produits'

        res.status(200).json({
            success: true,
            message: "Commande récupérée avec succès.",
            data: commande
        });
    } catch (error) {
        console.error(`Erreur lors de la récupération de la commande ${idCommande}:`, error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de la commande.",
            error: error.message
        });
    }
});

// --- Créer une nouvelle commande ---
// La requête POST devrait inclure idUtilisateur, idRestaurant, modeDePaiement et un tableau de produits {idPlat, quantite}
// --- Créer une ou plusieurs commandes (une par restaurant si besoin) ---
router.post("/commande", async (req, res) => {
    const { idUtilisateur, modeDePaiement, produits } = req.body; // 'produits' est un tableau d'objets { idPlat, quantite }

    if (!idUtilisateur || !modeDePaiement || !Array.isArray(produits) || produits.length === 0) {
        return res.status(400).json({
            success: false,
            message: "idUtilisateur, modeDePaiement et un tableau 'produits' non vide sont requis."
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Récupérer les infos des plats (idPlat, idRestaurant, prix)
        const platsIds = produits.map(p => p.idPlat);
        const [platsInfos] = await connection.query(
            `SELECT idPlat, idRestaurant, prix FROM plat WHERE idPlat IN (?)`,
            [platsIds]
        );

        // 2. Regrouper les plats par restaurant
        const produitsParRestaurant = {};
        produits.forEach(p => {
            const platInfo = platsInfos.find(pi => pi.idPlat === p.idPlat);
            if (!platInfo) throw new Error(`Plat avec id ${p.idPlat} introuvable.`);
            const idRest = platInfo.idRestaurant;
            if (!produitsParRestaurant[idRest]) produitsParRestaurant[idRest] = [];
            produitsParRestaurant[idRest].push({ ...p, prix: platInfo.prix });
        });

        const commandesCreees = [];

        // 3. Créer une commande par restaurant
        for (const [idRestaurant, produitsRestau] of Object.entries(produitsParRestaurant)) {
            let montantTotalCommande = 0;
            produitsRestau.forEach(p => {
                montantTotalCommande += p.prix * p.quantite;
            });

            // Créer la commande
            const [resultCommande] = await connection.query(
                "INSERT INTO commande (idUtilisateur, idRestaurant, statut, modeDePaiement, date_com, montant_total) VALUES (?, ?, ?, ?, NOW(), ?)",
                [idUtilisateur, idRestaurant, "en attente", modeDePaiement, montantTotalCommande]
            );
            const idNouvelleCommande = resultCommande.insertId;

            // Ajouter les produits à la commande
            for (const item of produitsRestau) {
                await connection.query(
                    "INSERT INTO Commande_Produits (idCommande, idPlat, quantite, prix_unitaire) VALUES (?, ?, ?, ?)",
                    [idNouvelleCommande, item.idPlat, item.quantite, item.prix]
                );
            }

            commandesCreees.push({
                idCommande: idNouvelleCommande,
                idRestaurant,
                montantTotal: montantTotalCommande
            });
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: "Commande(s) créée(s) avec succès (une par restaurant).",
            commandes: commandesCreees
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error("Erreur lors de la création de la commande:", error);

        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création de la commande.",
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// --- Mettre à jour le statut d'une commande ---
router.put("/commande/:idCommande/statut", async (req, res) => {
    const idCommande = req.params.idCommande;
    const { statut } = req.body;

    if (!statut) {
        return res.status(400).json({ success: false, message: "Le champ 'statut' est requis." });
    }

    try {
        const [result] = await pool.query(
            "UPDATE commande SET statut = ? WHERE idCommande = ?",
            [statut, idCommande]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Commande non trouvée pour la mise à jour du statut." });
        }

        res.status(200).json({
            success: true,
            message: `Statut de la commande ${idCommande} mis à jour à '${statut}'.`
        });
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du statut de la commande ${idCommande}:`, error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour du statut de la commande.",
            error: error.message
        });
    }
});

// --- Supprimer une commande ---
router.delete("/commande/:idCommande", async (req, res) => {
    const idCommande = req.params.idCommande;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Supprimer les entrées liées dans la table 'Commande_Produits'
        await connection.query("DELETE FROM Commande_Produits WHERE idCommande = ?", [idCommande]); //

        // 2. Supprimer la commande principale
        const [result] = await connection.query("DELETE FROM commande WHERE idCommande = ?", [idCommande]); //

        if (result.affectedRows === 0) {
            await connection.rollback(); 
            return res.status(404).json({ success: false, message: "Commande non trouvée pour la suppression." });
        }

        await connection.commit();

        res.status(200).json({ success: true, message: "Commande supprimée avec succès." });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error(`Erreur lors de la suppression de la commande ${idCommande}:`, error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression de la commande.",
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


// --- Bonus : Récupérer les commandes d'un utilisateur spécifique ---
router.get("/utilisateurs/:idUtilisateur/commande", async (req, res) => {
    const idUtilisateur = req.params.idUtilisateur;
    try {
        const [commandes] = await pool.query(`
            SELECT 
                c.idCommande, 
                c.idRestaurant, 
                r.nom AS nomRestaurant,
                c.date_com,             -- Changement ici
                c.statut, 
                c.modeDePaiement,       -- Nouveau champ
                c.montant_total AS total -- Changement ici
            FROM 
                commande c
            JOIN 
                restaurant r ON c.idRestaurant = r.idRestaurant
            WHERE c.idUtilisateur = ?
            ORDER BY c.date_com DESC
        `, [idUtilisateur]); //

        if (commandes.length === 0) {
            return res.status(404).json({ success: false, message: "Aucune commande trouvée pour cet utilisateur." });
        }

        res.status(200).json({
            success: true,
            message: `Commandes récupérées pour l'utilisateur ${idUtilisateur}.`,
            data: commandes
        });
    } catch (error) {
        console.error(`Erreur lors de la récupération des commandes pour l'utilisateur ${idUtilisateur}:`, error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des commandes de l'utilisateur.",
            error: error.message
        });
    }
});


// --- Bonus : Récupérer les commandes d'un restaurant spécifique ---
router.get("/restaurants/:idRestaurant/commande", async (req, res) => {
    const idRestaurant = req.params.idRestaurant;
    try {
        const [commandes] = await pool.query(`
            SELECT 
                c.idCommande, 
                c.idUtilisateur, 
                u.nom AS nomUtilisateur,
                c.date_com,             -- Changement ici
                c.statut, 
                c.modeDePaiement,       -- Nouveau champ
                c.montant_total AS total -- Changement ici
            FROM 
                commande c
            JOIN 
                utilisateurs u ON c.idUtilisateur = u.idUtilisateur
            WHERE c.idRestaurant = ?
            ORDER BY c.date_com DESC
        `, [idRestaurant]); //

        if (commandes.length === 0) {
            return res.status(404).json({ success: false, message: "Aucune commande trouvée pour ce restaurant." });
        }

        res.status(200).json({
            success: true,
            message: `Commandes récupérées pour le restaurant ${idRestaurant}.`,
            data: commandes
        });
    } catch (error) {
        console.error(`Erreur lors de la récupération des commandes pour le restaurant ${idRestaurant}:`, error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des commandes du restaurant.",
            error: error.message
        });
    }
});

module.exports = router;