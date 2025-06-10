const express = require("express");
const axios = require('axios');
const qs = require('qs');
const router = express.Router();
require('dotenv').config();

const PVIT_BASE_URL = process.env.PVIT_BASE_URL;
const PVIT_ACCOUNT_ID = process.env.PVIT_ACCOUNT_ID;

let cachedSecretKey = null;

// Création d'une instance Axios préconfigurée
const pvitApi = axios.create({
    baseURL: PVIT_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Middleware pour mettre à jour le header X-Secret
pvitApi.interceptors.request.use((config) => {
    if (cachedSecretKey) {
        config.headers['X-Secret'] = cachedSecretKey;
    }
    return config;
});
let key = null;

// Route callback pour recevoir la clé secrète
router.post("/api/payment/secret-callback", (req, res) => {
    try {
        const { secret_key } = req.body;
        if (!secret_key) {
            return res.status(400).json({ message: 'Clé secrète manquante' });
        }
        
        cachedSecretKey = secret_key;
        key = secret_key;
        console.log("Clé secrète reçue :"+ cachedSecretKey)
        res.status(200).json({ message: 'Clé secrète mise à jour avec succès' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la clé secrète:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.post('/api/renew-secret', async (req, res) => {
    try {
        // Récupération des variables d'environnement
        const operationAccountCode = process.env.PVIT_ACCOUNT_ID;
        const receptionUrlCode = process.env.CODEURLCALLBACKKEY;
        const password = process.env.PASSWORD;

        // Vérification des variables d'environnement requises
        if (!operationAccountCode || !receptionUrlCode || !password) {
            return res.status(400).json({
                success: false,
                message: 'Configuration manquante. Vérifiez vos variables d\'environnement.'
            });
        }

        // Construction des données pour la requête
        const formData = {
            operationAccountCode,
            receptionUrlCode,
            password
        };

        // Appel à l'API PVit pour renouveler la clé secrète
        const response = await axios.post(
            `${process.env.PVIT_BASE_URL}/WPORYY2HIGCKDZWX/renew-secret`,
            qs.stringify(formData),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        console.log(cachedSecretKey);
        console.log(key);

        
        res.status(200).json({
            success: true,
            message: 'Demande de renouvellement de clé secrète envoyée avec succès'
        });

    } catch (error) {
        console.error('Erreur lors du renouvellement de la clé secrète:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du renouvellement de la clé secrète',
            error: error.response?.data || error.message
        });
    }
});


// Export des fonctions et du router
module.exports = {
    router
};