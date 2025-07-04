const express = require("express");
const axios = require('axios');
const qs = require('qs');
const Transaction = require("../models/Transaction");
const router = express.Router();
require('dotenv').config();

const PVIT_BASE_URL = process.env.PVIT_BASE_URL;
const PVIT_ACCOUNT_ID = process.env.PVIT_ACCOUNT_ID;
const KEY_RENEWAL_INTERVAL = 1000 * 60 * 60; // 1 heure

let cachedSecretKey = null;
let lastKeyRenewalTime = null;
const transactionListeners = new Map();

// Génère une référence unique pour les transactions
function generateReference() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 10;
    let result = 'REF';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Attend une notification de transaction via un webhook
function waitForTransactionCallback(reference, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            transactionListeners.delete(reference);
            reject(new Error(`Timeout : Aucune notification reçue pour la transaction ${reference}`));
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

// Vérifie si la clé secrète est valide et la renouvelle si nécessaire
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

            await axios.post(
                `${PVIT_BASE_URL}/BDNNTIUVGBLANGWF/renew-secret`,
                qs.stringify(formData),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            );

            await new Promise(resolve => setTimeout(resolve, 2000));
            if (!cachedSecretKey) {
                throw new Error('La clé secrète n\'a pas été reçue via le callback après le renouvellement.');
            }
            lastKeyRenewalTime = now;
        } catch (error) {
            throw new Error(`Échec du renouvellement de la clé secrète: ${error.response?.data?.message || error.message}`);
        }
    }
    return cachedSecretKey;
}

// --- ROUTES ---

// Callback pour recevoir la clé secrète de PVit
router.post("/api/payment/secret-callback", async (req, res) => {
    try {
        const { secret_key } = req.body;
        if (!secret_key) {
            return res.status(400).json({
                responseCode: 400,
                message: 'Le champ "secret_key" est manquant dans le corps de la requête.'
            });
        }
        cachedSecretKey = secret_key;
        lastKeyRenewalTime = Date.now();
        res.status(200).json({
            responseCode: 200,
            message: 'Clé secrète mise à jour avec succès'
        });
    } catch (error) {
        res.status(500).json({
            responseCode: 500,
            message: 'Erreur serveur lors de la réception de la clé secrète.',
            error: error.message
        });
    }
});

// Webhook de notification de transaction PVit
router.post('/api/payment-webhook', async (req, res) => {
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

    if (!merchantReferenceId) {
        return res.status(400).json({
            responseCode: 400,
            transactionId: transactionId,
            message: 'Le champ "merchantReferenceId" est manquant.'
        });
    }

    try {
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

        const existingTransaction = await Transaction.findByReference(merchantReferenceId);

        if (existingTransaction) {
            await Transaction.updateTransaction(merchantReferenceId, transactionData);
        } else {
            await Transaction.create(transactionData);
        }

        if (transactionListeners.has(merchantReferenceId)) {
            const listener = transactionListeners.get(merchantReferenceId);
            listener.resolve(transactionData);
            transactionListeners.delete(merchantReferenceId);
        }

        return res.status(200).json({
            responseCode: code || 200,
            transactionId: transactionId,
            message: 'Notification de transaction traitée avec succès.'
        });
    } catch (error) {
        return res.status(500).json({
            responseCode: 500,
            transactionId: transactionId,
            message: `Erreur serveur lors du traitement du webhook: ${error.message}`
        });
    }
});

// Initie une transaction de paiement via l'API REST de PVit
router.post('/api/rest-transaction', async (req, res) => {
    let reference;
    let transactionCreationPromise;

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

        if (!amount || !customer_account_number) {
            return res.status(400).json({
                success: false,
                message: 'Les champs "amount" et "customer_account_number" sont requis.'
            });
        }
        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Le montant doit être un nombre positif.'
            });
        }

        reference = generateReference();

        const pvitTransactionData = {
            agent: process.env.PVIT_AGENT || "AGENT-1",
            amount,
            product: product || "DEFAULT_PRODUCT",
            reference,
            service: "RESTFUL",
            callback_url_code: process.env.CODEURLCALLBACK,
            customer_account_number,
            merchant_operation_account_code: process.env.PVIT_ACCOUNT_ID,
            transaction_type: "PAYMENT",
            owner_charge,
            owner_charge_operator,
            free_info: (free_info || "Transaction Initiale").substring(0, 15)
        };

        transactionCreationPromise = Transaction.create({
            transaction_id: `INIT_${reference}`,
            reference: reference,
            amount: amount,
            status: 'PENDING',
            customer_account_number: customer_account_number,
            charge_owner: owner_charge,
            free_info: free_info,
            transaction_operation: 'PAYMENT',
            created_at: new Date(),
            updated_at: new Date()
        });

        const response = await axios.post(
            `${PVIT_BASE_URL}/0H3U6T5XADVKU6PN/rest`,
            pvitTransactionData,
            {
                headers: {
                    'X-Secret': cachedSecretKey,
                    'X-Callback-MediaType': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        await transactionCreationPromise;

        if (response.data.transaction_id && response.data.transaction_id !== `INIT_${reference}`) {
            await Transaction.updateTransaction(reference, { transaction_id: response.data.transaction_id });
        }

        const transactionResult = await waitForTransactionCallback(reference);

        res.status(200).json({
            success: true,
            message: 'Transaction initiée et complétée avec succès via webhook.',
            data: {
                ...transactionResult,
                initial_pvit_response: response.data,
                reference
            }
        });

    } catch (error) {
        if (error.message.includes('Timeout')) {
            return res.status(408).json({
                success: false,
                message: 'Timeout : Le webhook de transaction n\'a pas été reçu dans le délai imparti.',
                reference: reference || 'Non disponible'
            });
        }
        if (axios.isAxiosError(error) && error.response) {
            return res.status(error.response.status || 500).json({
                success: false,
                message: 'Erreur lors de la communication avec le service de paiement (PVit).',
                error: error.response.data,
                reference: reference || 'Non disponible'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Une erreur inattendue est survenue lors de l\'initiation de la transaction.',
            error: error.message,
            reference: reference || 'Non disponible'
        });
    }
});

// Générer un lien de paiement via PVit
router.post('/api/payment/generate-link', async (req, res) => {
    let reference;
    try {
        const {
            amount,
            customer_account_number,
            service,
            agent,
            product,
            free_info,
            owner_charge = "CUSTOMER",
            operator_owner_charge = "CUSTOMER"
        } = req.body;

        if (!amount || !customer_account_number || !service) {
            return res.status(400).json({
                success: false,
                message: 'Les champs "amount", "customer_account_number" et "service" sont requis.'
            });
        }
        if (typeof amount !== 'number' || amount <= 150) {
            return res.status(400).json({
                success: false,
                message: 'Le montant doit être un nombre supérieur à 150.'
            });
        }

        const validServices = ['VISA_MASTERCARD', 'WEB', 'RESTLINK'];
        if (!validServices.includes(service)) {
            return res.status(400).json({
                success: false,
                message: 'Le service doit être "VISA_MASTERCARD", "WEB" ou "RESTLINK".'
            });
        }

        if (!process.env.CODEURLREDIRECTFAILED || !process.env.CODEURLREDIRECTSUCCESS || !process.env.CODEURLCALLBACK) {
            return res.status(500).json({
                success: false,
                message: 'Erreur de configuration serveur: Les codes de redirection/callback ne sont pas définis dans les variables d\'environnement.'
            });
        }

        reference = generateReference();
        await ensureValidSecretKey();

        const pvitTransactionData = {
            agent: (agent || "AGENT-1").substring(0, 15),
            amount,
            product: (product || "PRODUIT-1").substring(0, 15),
            reference: reference.substring(0, 15),
            service,
            callback_url_code: process.env.CODEURLCALLBACK,
            customer_account_number: customer_account_number.substring(0, 20),
            merchant_operation_account_code: PVIT_ACCOUNT_ID,
            transaction_type: "PAYMENT",
            owner_charge,
            operator_owner_charge,
            free_info: free_info ? free_info.substring(0, 15) : undefined,
            failed_redirection_url_code: process.env.CODEURLREDIRECTFAILED,
            success_redirection_url_code: process.env.CODEURLREDIRECTSUCCESS
        };

        const response = await axios.post(
            `${PVIT_BASE_URL}/ZRS0VFCPA0YJUCFV/link`,
            pvitTransactionData,
            {
                headers: {
                    'X-Secret': cachedSecretKey,
                    'X-Callback-MediaType': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        await Transaction.create({
            transaction_id: response.data.transaction_id || `LINK_${reference}`,
            reference,
            amount,
            status: 'PENDING',
            customer_account_number,
            free_info: free_info?.substring(0, 15),
            transaction_operation: 'PAYMENT',
            operator: service === 'VISA_MASTERCARD' ? 'VISA' : null,
            created_at: new Date(),
            updated_at: new Date()
        });

        const transactionResult = await waitForTransactionCallback(reference);

        res.status(200).json({
            success: true,
            message: 'Lien de paiement généré et transaction complétée via webhook.',
            data: {
                payment_link: response.data.payment_link,
                ...transactionResult,
                reference
            }
        });

    } catch (error) {
        if (error.message.includes('Timeout')) {
            return res.status(408).json({
                success: false,
                message: 'Timeout : Le webhook de transaction n\'a pas été reçu dans le délai imparti après la génération du lien.',
                reference: reference || 'Non disponible'
            });
        }
        if (axios.isAxiosError(error) && error.response) {
            return res.status(error.response.status || 500).json({
                success: false,
                message: 'Erreur lors de la communication avec le service de paiement (PVit).',
                error: error.response.data,
                reference: reference || 'Non disponible'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Une erreur inattendue est survenue lors de la génération du lien de paiement.',
            error: error.message,
            reference: reference || 'Non disponible'
        });
    }
});

module.exports = router;