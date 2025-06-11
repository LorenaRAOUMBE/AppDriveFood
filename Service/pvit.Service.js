const express = require("express");
const axios = require('axios');
const qs = require('qs');
const router = express.Router();
require('dotenv').config();
const Transaction = require('../models/Transaction');
const { nanoid } = require('nanoid');

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

        const { secret_key } = req.body;
        
        cachedSecretKey = secret_key;
     
        console.log("Clé secrète reçue :"+ cachedSecretKey);
        res.status(200).json({ message: 'Clé secrète mise à jour avec succès' });
   
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

        console.log(cachedSecretKey)
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


/**
 * Initie une transaction de paiement REST
 */
router.post('/api/rest-transaction', async (req, res) => {
    try {
        const {
            amount,
            product,
            customer_account_number,
            free_info,
            owner_charge = "MERCHANT",
            owner_charge_operator = "MERCHANT"
        } = req.body;

    
        // Génération d'une référence unique pour votre système
        const shortUniqueId = nanoid(11);
        const reference = `REF${shortUniqueId}`; // 3 + 11 = 14 caractères
        
        const transactionData = {
            agent: process.env.PVIT_AGENT || "AGENT-1",
            amount:amount ||'2000',
            product: product || "PRODUIT-1",
            reference: reference ,
            service: "RESTFUL",
            callback_url_code: process.env.CODEURLCALLBACK, // Code pour le webhook
            customer_account_number:customer_account_number,
            merchant_operation_account_code: process.env.PVIT_ACCOUNT_ID,
            transaction_type: "PAYMENT",
            owner_charge,
            owner_charge_operator,
            free_info: free_info || "Transaction1"
        };

        // Effectuer la requête vers PVit
        const response = await axios.post(
            `${PVIT_BASE_URL}/FH9WCKEIPITSHCY0/rest`,
            transactionData,
            {
                headers: {
                    'X-Secret': cachedSecretKey,
                    'X-Callback-MediaType': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        // Sauvegarder immédiatement la transaction
        await Transaction.create({
            transaction_id: response.data.transaction_id,
            reference: transactionData.reference,
            amount: amount,
            customer_account_number: customer_account_number,
            status: 'PENDING'
        });

        res.status(200).json({
            success: true,
            message: 'Transaction initiée avec succès',
            data: {
                transactionId: response.data.transaction_id,
                reference: transactionData.reference
            }
        });

    } catch (error) {
        console.error('Erreur lors de l\'initiation de la transaction REST:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'initiation de la transaction',
            error: error.response?.data || error.message
        });
    }
});


/**
 * Route pour vérifier le statut d'une transaction
 */
router.get('/api/transaction/status', async (req, res) => {
    try {
        const { transactionId } = req.query;

        if (!transactionId) {
            return res.status(400).json({
                success: false,
                message: 'TransactionId est requis'
            });
        }

        // Récupération des informations de configuration
        const accountOperationCode = process.env.PVIT_ACCOUNT_ID;
        
        if (!cachedSecretKey) {
            return res.status(401).json({
                success: false,
                message: 'Clé secrète non disponible. Veuillez renouveler la clé.'
            });
        }

        // Appel à l'API PVit pour le statut
        const response = await axios.get(
            `${PVIT_BASE_URL}/A1UNR9PZJF05EUTS/status?transactionId=${transactionId}&accountOperationCode=${accountOperationCode}&transactionOperation=PAYMENT`,
            {
                headers: {
                    'X-Secret': cachedSecretKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Mise à jour du statut dans la base de données
        if (response.data.status) {
            await Transaction.updateStatus(response.data.merchant_reference_id, response.data.status);
        }

        res.status(200).json({
            success: true,
            data: {
                date: response.data.date,
                status: response.data.status,
                amount: response.data.amount,
                fees: response.data.fees,
                operator: response.data.operator,
                merchant_reference_id: response.data.merchant_reference_id,
                customer_account_number: response.data.customer_account_number
            }
        });

    } catch (error) {
        console.error('Erreur vérification statut:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                message: 'Transaction non trouvée'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification du statut',
            error: error.response?.data?.message || error.message
        });
    }
});



const pvitRouter = router;
module.exports = pvitRouter;