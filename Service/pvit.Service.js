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

// Route callback pour recevoir la clé secrète
router.post("/api/payment/secret-callback", (req, res) => {
    try {
        const { secret_key } = req.body;
        if (!secret_key) {
            return res.status(400).json({ message: 'Clé secrète manquante' });
        }
        
        cachedSecretKey = secret_key;
        console.log("Clé secrète reçue");
        
        res.status(200).json({ message: 'Clé secrète mise à jour avec succès' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la clé secrète:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});





// Export des fonctions et du router
module.exports = {
    router
};