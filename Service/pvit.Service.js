const express = require("express");
const axios = require('axios');
const qs = require('qs');
const Transaction=require("../models/Transaction")
const router = express.Router();
require('dotenv').config();


const PVIT_BASE_URL = process.env.PVIT_BASE_URL;
const PVIT_ACCOUNT_ID = process.env.PVIT_ACCOUNT_ID;

let cachedSecretKey = null;
const transactionListeners = new Map();

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
       
        cachedSecretKey = secret_key;
        lastKeyRenewalTime = Date.now();
        console.log("Nouvelle clé secrète reçue et mise en cache:"+cachedSecretKey);
        
        res.status(200).json({ 
            success: true,
            message: 'Clé secrète mise à jour avec succès' 
        });
    } catch (error) {
        console.error('Erreur callback:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erreur serveur' 
        });
    }
});

router.post('/api/renew-secret', async (req, res) => {
    try {
        // Récupération des variables d'environnement
        const operationAccountCode = process.env.PVIT_ACCOUNT_ID;
        const receptionUrlCode = process.env.CODEURLCALLBACKKEY;
        const password = process.env.PASSWORD;

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
        await ensureValidSecretKey();
        const {
            amount,
            product,
            customer_account_number,
            free_info,
            owner_charge = "MERCHANT",
            owner_charge_operator = "MERCHANT"
        } = req.body;

        // Génération d'une référence alphanumérique unique
        const generateReference = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            const length = 10;
            let result = 'REF';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };

        const reference = generateReference(); // Exemple: REFAB12CD34EF

        const transactionData = {
            agent: process.env.PVIT_AGENT || "AGENT-1",
            amount,
            product,
            reference,  // Utilisation de la nouvelle référence
            service: "RESTFUL",
            callback_url_code: process.env.CODEURLCALLBACK,
            customer_account_number,
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
                    'X-Secret':cachedSecretKey,
                    'X-Callback-MediaType': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        // Attendre la notification (avec timeout de 5 minutes)
        const transactionResult = await waitForTransactionCallback(transactionData.reference);
        
        res.status(200).json({
            success: true,
            message: 'Transaction complétée',
            data: {
                ...transactionResult,
                reference: transactionData.reference
            }
        });
        
    } catch (error) {
        if (error.message.includes('Timeout')) {
            res.status(408).json({
                success: false,
                message: 'Timeout en attendant la réponse de la transaction',
                reference: transactionData?.reference
            });
        } else {
            console.error('Erreur lors de l\'initiation de la transaction REST:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'initiation de la transaction',
                error: error.response?.data || error.message
            });
        }
    }
});


/**
 * Route pour recevoir les notifications de transaction
 */
router.post('/api/payment-webhook', async (req, res) => {
    try {
        const {
            transactionId,
            merchantReferenceId,
            status,
            amount,
            customerID,
            fees,
            totalAmount,
            chargeOwner,
            freeInfo,
            transactionOperation,
            code,
            callbackMediaType,
            operator
        } = req.body;
        
        console.log('Notification PVit reçue:', { 
            transactionId, 
            merchantReferenceId, 
            status,
            code 
        });
        
        // Vérifier que la requête provient de PVit
        const pvitIp = req.ip; // À comparer avec l'IP autorisée en production
        
        // Sauvegarder ou mettre à jour la transaction avec toutes les données
        const transactionData = {
            transaction_id: transactionId,
            reference: merchantReferenceId,
            amount,
            status,
            customer_account_number: customerID,
            fees,
            total_amount: totalAmount,
            charge_owner: chargeOwner,
            free_info: freeInfo,
            transaction_operation: transactionOperation,
            operator,
            updated_at: new Date()
        };

        try {
            // Vérifier si la transaction existe déjà
            const existingTransaction = await Transaction.findByReference(merchantReferenceId);
            
            if (existingTransaction) {
                // Mettre à jour la transaction existante
                await Transaction.updateTransaction(merchantReferenceId, transactionData);
                console.log(`Transaction ${merchantReferenceId} mise à jour avec succès`);
            } else {
                // Créer une nouvelle transaction
                await Transaction.create(transactionData);
                console.log(`Transaction ${merchantReferenceId} créée avec succès`);
            }

            // Notifier les écouteurs en attente
            if (transactionListeners.has(merchantReferenceId)) {
                const listener = transactionListeners.get(merchantReferenceId);
                listener.resolve(transactionData);
                transactionListeners.delete(merchantReferenceId);
            }

            // Réponse requise par PVit
            return res.status(200).json({
                responseCode: code,
                transactionId: transactionId
            });

        } catch (dbError) {
            console.error('Erreur base de données:', dbError);
            return res.status(500).json({
                responseCode: 500,
                transactionId: transactionId,
                message: 'Erreur lors du traitement de la transaction'
            });
        }
    } catch (error) {
        console.error('Erreur webhook:', error);
        // Même en cas d'erreur, on répond avec le format attendu
        res.status(500).json({
            responseCode: 500,
            transactionId: req.body?.transactionId,
            message: error.message
        });
    }
});


/**
 * Fonction pour attendre la notification de transaction
*/
function waitForTransactionCallback(reference, timeout = 300000) { // 5 minutes par défaut
    return new Promise((resolve, reject) => {
        // Créer un timer pour le timeout
        const timeoutId = setTimeout(() => {
            transactionListeners.delete(reference);
            reject(new Error('Timeout en attendant la notification de la transaction'));
        }, timeout);

        // Stocker la promesse et les fonctions de résolution
        transactionListeners.set(reference, {
            resolve: (result) => {
                clearTimeout(timeoutId);
                resolve(result);
            },
            reject: (error) => {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    });
}

/**
 * Route pour vérifier le statut d'une transaction
 */
router.get('/api/transaction/status', async (req, res) => {
    try {
        await ensureValidSecretKey();
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
const KEY_RENEWAL_INTERVAL = 1000 * 60 * 60; // 1 heure
let lastKeyRenewalTime = null;

// Fonction pour vérifier et renouveler la clé secrète si nécessaire
async function ensureValidSecretKey() {
    const now = Date.now();
    const needsRenewal = !cachedSecretKey || !lastKeyRenewalTime || (now - lastKeyRenewalTime) > KEY_RENEWAL_INTERVAL;

    if (needsRenewal) {
        try {
            const formData = {
                operationAccountCode: process.env.PVIT_ACCOUNT_ID,
                receptionUrlCode: process.env.CODEURLCALLBACKKEY,
                password: process.env.PASSWORD
            };

            console.log('Renouvellement de la clé secrète...');
            await axios.post(
                `${PVIT_BASE_URL}/WPORYY2HIGCKDZWX/renew-secret`,
                qs.stringify(formData),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            // Attendre la réception de la clé via le callback
            await new Promise((resolve) => setTimeout(resolve, 2000));

            if (!cachedSecretKey) {
                throw new Error('La clé secrète n\'a pas été reçue après renouvellement');
            }

            lastKeyRenewalTime = now;
            console.log('Clé secrète renouvelée avec succès');
        } catch (error) {
            console.error('Erreur lors du renouvellement de la clé:', error);
            throw error;
        }
    }
}

const pvitRouter = router;
module.exports = pvitRouter;