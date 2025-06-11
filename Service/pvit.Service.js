const express = require("express");
const axios = require('axios');
const qs = require('qs');
const Transaction = require("../models/Transaction");
const router = express.Router();
require('dotenv').config();

// Configuration
const PVIT_BASE_URL = process.env.PVIT_BASE_URL;
const PVIT_ACCOUNT_ID = process.env.PVIT_ACCOUNT_ID;
const KEY_RENEWAL_INTERVAL = 1000 * 60 * 60; // 1 heure

// Variables globales
let cachedSecretKey = null;
let lastKeyRenewalTime = null;
const transactionListeners = new Map();

// Fonction utilitaire pour générer une référence
function generateReference() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 10;
    let result = 'REF';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Fonction pour attendre la notification de transaction
function waitForTransactionCallback(reference, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            transactionListeners.delete(reference);
            reject(new Error('Timeout en attendant la notification de la transaction'));
        }, timeout);

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

// Fonction pour vérifier et renouveler la clé secrète
async function ensureValidSecretKey() {
    const now = Date.now();
    const needsRenewal = !cachedSecretKey || !lastKeyRenewalTime || (now - lastKeyRenewalTime) > KEY_RENEWAL_INTERVAL;

    if (needsRenewal) {
        try {
            const formData = {
                operationAccountCode: PVIT_ACCOUNT_ID,
                receptionUrlCode: process.env.CODEURLCALLBACKKEY,
                password: process.env.PASSWORD
            };

            console.log('Renouvellement de la clé secrète...');
            await axios.post(
                `${PVIT_BASE_URL}/WPORYY2HIGCKDZWX/renew-secret`,
                qs.stringify(formData),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            );

            await new Promise(resolve => setTimeout(resolve, 2000));

            if (!cachedSecretKey) {
                throw new Error('La clé secrète n\'a pas été reçue après renouvellement');
            }

            lastKeyRenewalTime = now;
            console.log('Clé secrète renouvelée avec succès');
        } catch (error) {
            console.error('Erreur renouvellement clé:', error);
            throw error;
        }
    }
    return cachedSecretKey;
}

// Routes
router.post("/api/payment/secret-callback", async (req, res) => {
    try {
        const { secret_key } = req.body;
        
        cachedSecretKey = secret_key;
        lastKeyRenewalTime = Date.now();
        console.log("Nouvelle clé secrète reçue");
        
        res.status(200).json({ 
            responseCode: 200,
            message: 'Clé secrète mise à jour avec succès' 
        });
    } catch (error) {
        console.error('Erreur callback:', error);
        res.status(500).json({ 
            responseCode: 500,
            message: 'Erreur serveur' 
        });
    }
});

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
            operator
        } = req.body;

        // Données pour la base de données
        const transactionData = {
            transaction_id: transactionId,
            reference: merchantReferenceId,
            status,
            amount,
            customer_account_number: customerID,
            fees,
            total_amount: totalAmount,
            charge_owner: chargeOwner,
            free_info: freeInfo,
            transaction_operation: transactionOperation,
            operator
        };

        // Vérifier si la transaction existe déjà
        const existingTransaction = await Transaction.findByReference(merchantReferenceId);

        if (existingTransaction) {
            // Mise à jour de la transaction existante
            await Transaction.updateTransaction(merchantReferenceId, transactionData);
            console.log(`Transaction ${merchantReferenceId} mise à jour`);
        } else {
            // Création d'une nouvelle transaction
            await Transaction.create(transactionData);
            console.log(`Transaction ${merchantReferenceId} créée`);
        }

        // Notifier les écouteurs
        if (transactionListeners.has(merchantReferenceId)) {
            const listener = transactionListeners.get(merchantReferenceId);
            listener.resolve(transactionData);
            transactionListeners.delete(merchantReferenceId);
        }

        return res.status(200).json({
            responseCode: code,
            transactionId
        });
    } catch (error) {
        console.error('Erreur webhook:', error);
        return res.status(500).json({
            responseCode: 500,
            transactionId: req.body?.transactionId,
            message: error.message
        });
    }
});

/**
 * Initie une transaction de paiement REST
 */
router.post('/api/rest-transaction', async (req, res) => {
    let reference;
    let transactionData;
    
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

        // Validation des champs requis
        if (!amount || !customer_account_number) {
            return res.status(400).json({
                success: false,
                message: 'Amount et customer_account_number sont requis'
            });
        }

        // Génération de la référence
        reference = generateReference();

        // Définition des données de transaction
        transactionData = {
            agent: process.env.PVIT_AGENT || "AGENT-1",
            amount,
            product,
            reference,
            service: "RESTFUL",
            callback_url_code: process.env.CODEURLCALLBACK,
            customer_account_number,
            merchant_operation_account_code: process.env.PVIT_ACCOUNT_ID,
            transaction_type: "PAYMENT",
            owner_charge,
            owner_charge_operator,
            free_info: (free_info || "Transaction1").substring(0, 15)
        };

        // Requête PVit
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

        // Sauvegarde initiale de la transaction
        await Transaction.create({
            transaction_id: response.data.transaction_id || `INIT_${reference}`,
            reference: reference,
            amount: amount,
            status: 'PENDING',
            customer_account_number: customer_account_number,
            charge_owner: owner_charge,
            free_info: free_info,
            transaction_operation: 'PAYMENT'
        });

        console.log(`Transaction initiale ${reference} sauvegardée`);

        // Attendre la notification
        const transactionResult = await waitForTransactionCallback(reference);
        
        console.log("Transaction complétée:", transactionResult);

        res.status(200).json({
            success: true,
            message: 'Transaction complétée',
            data: {
                ...transactionResult,
                reference
            }
        });

    } catch (error) {
        if (error.message.includes('Timeout')) {
            res.status(408).json({
                success: false,
                message: 'Timeout en attendant la réponse de la transaction',
                reference // Utilisation de reference au lieu de transactionData?.reference
            });
        } else {
            console.error('Erreur lors de l\'initiation de la transaction REST:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'initiation de la transaction',
                error: error.response?.data || error.message,
                reference // Ajout de la référence dans la réponse d'erreur
            });
        }
    }
});


/**
 * Route pour vérifier le statut d'une transaction
 */
router.get('/api/transaction/status/:transactionId', async (req, res) => {
    try {
        await ensureValidSecretKey();
        const { transactionId } = req.query;
        console.log(transactionId);
        

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


/**
 * Route pour générer un lien de paiement
 */
router.post('/api/payment/generate-link', async (req, res) => {
    let reference;
    
    try {
        await ensureValidSecretKey();

        const {
            amount,
            customer_account_number,
            service,
            agent,
            product,
            free_info,
            owner_charge = "CUSTOMER",
            operator_owner_charge = "CUSTOMER",
            failed_redirection_url_code,
            success_redirection_url_code
        } = req.body;

        // Validation des champs obligatoires
        if (!amount || !customer_account_number || !service) {
            return res.status(400).json({
                success: false,
                message: 'Les champs amount, customer_account_number et service sont requis'
            });
        }

        // Validation du montant minimum
        if (amount <= 150) {
            return res.status(400).json({
                success: false,
                message: 'Le montant doit être supérieur à 150'
            });
        }

        // Validation du service
        const validServices = ['VISA_MASTERCARD', 'WEB', 'RESTLINK'];
        if (!validServices.includes(service)) {
            return res.status(400).json({
                success: false,
                message: 'Le service doit être VISA_MASTERCARD, WEB ou RESTLINK'
            });
        }

        // Validation des codes de redirection
        if (!failed_redirection_url_code || !success_redirection_url_code) {
            return res.status(400).json({
                success: false,
                message: 'Les codes de redirection sont requis'
            });
        }

        // Génération de la référence
        reference = generateReference();

        // Construction des données de transaction avec validation des longueurs
        const transactionData = {
            agent: (agent || "AGENT-1").substring(0, 15),
            amount,
            product: (product || "PRODUIT-1").substring(0, 15),
            reference: reference.substring(0, 15),
            service,
            callback_url_code: process.env.CODEURLCALLBACK,
            customer_account_number: customer_account_number.substring(0, 20),
            merchant_operation_account_code: process.env.PVIT_ACCOUNT_ID,
            transaction_type: "PAYMENT",
            owner_charge,
            operator_owner_charge,
            free_info: free_info ? free_info.substring(0, 15) : undefined,
            failed_redirection_url_code,
            success_redirection_url_code
        };

        // Requête vers l'API PVit
        const response = await axios.post(
            `${PVIT_BASE_URL}/ZRS0VFCPA0YJUCFV/link`,
            transactionData,
            {
                headers: {
                    'X-Secret': cachedSecretKey,
                    'X-Callback-MediaType': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        // Sauvegarde en base de données
        await Transaction.create({
            transaction_id: response.data.transaction_id,
            reference,
            amount,
            status: 'PENDING',
            customer_account_number,
            free_info: free_info?.substring(0, 15),
            transaction_operation: 'PAYMENT',
            operator: service === 'VISA_MASTERCARD' ? 'VISA' : null
        });

        // Réponse avec le lien et les informations
        res.status(200).json({
            success: true,
            data: {
                payment_link: response.data.payment_link,
                transaction_id: response.data.transaction_id,
                reference,
                service
            }
        });

    } catch (error) {
        console.error('Erreur génération lien:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la génération du lien',
            error: error.response?.data || error.message,
            reference: reference || null
        });
    }
});

const pvitRouter = router;
module.exports = pvitRouter;