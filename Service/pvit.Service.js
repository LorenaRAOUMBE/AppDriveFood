const express = require("express");
const axios = require('axios');
const qs = require('qs');
const Transaction = require("../models/Transaction"); 
const router = express.Router();
require('dotenv').config();

// --- Configuration des constantes ---
const PVIT_BASE_URL = process.env.PVIT_BASE_URL;
const PVIT_ACCOUNT_ID = process.env.PVIT_ACCOUNT_ID;
const KEY_RENEWAL_INTERVAL = 1000 * 60 * 60; // 1 heure

// --- Variables globales pour la gestion de la clé secrète ---
let cachedSecretKey = null;
let lastKeyRenewalTime = null;

// --- Map pour les écouteurs de transactions (pour attendre les webhooks) ---
const transactionListeners = new Map();

// --- Fonctions utilitaires ---

/**
 * Génère une référence unique pour les transactions.
 * @returns {string} La référence générée.
 */
function generateReference() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 10;
    let result = 'REF';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Attend une notification de transaction via un webhook.
 * @param {string} reference La référence de la transaction à écouter.
 * @param {number} timeout Le délai d'attente en millisecondes avant un rejet (par défaut 30000ms).
 * @returns {Promise<object>} Une promesse qui se résout avec les données de la transaction ou rejette en cas de timeout.
 */
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
            reject: (error) => { // Ajout du rejet explicite pour gérer les erreurs dans le webhook
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    });
}

/**
 * Vérifie si la clé secrète est valide et la renouvelle si nécessaire.
 * @returns {Promise<string>} La clé secrète actuelle.
 * @throws {Error} Si la clé secrète ne peut pas être obtenue ou renouvelée.
 */
async function ensureValidSecretKey() {
    const now = Date.now();
    const needsRenewal = !cachedSecretKey || !lastKeyRenewalTime || (now - lastKeyRenewalTime) > KEY_RENEWAL_INTERVAL;

    if (needsRenewal) {
        try {
            console.log('Tentative de renouvellement de la clé secrète...');
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

            // Attendre un court instant pour que le callback de la clé secrète soit traité
        
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (!cachedSecretKey) {
                throw new Error('La clé secrète n\'a pas été reçue via le callback après le renouvellement. Vérifiez la configuration du webhook pour la clé.');
            }

            lastKeyRenewalTime = now;
            console.log('Clé secrète renouvelée et mise en cache avec succès.');
        } catch (error) {
            console.error('Erreur critique lors du renouvellement de la clé secrète:', error.message || error);
            // Propager l'erreur pour que la route appelante puisse la gérer
            throw new Error(`Échec du renouvellement de la clé secrète: ${error.response?.data?.message || error.message}`);
        }
    }
    return cachedSecretKey;
}

// --- Routes API ---

/**
 * @route POST /api/payment/secret-callback
 * @description Endpoint pour recevoir la clé secrète de PVit via un callback.
 * Cette route est appelée par PVit.
 */
router.post("/api/payment/secret-callback", async (req, res) => {
    try {
        const { secret_key } = req.body;

        if (!secret_key) {
            console.warn("Callback de clé secrète reçu sans secret_key.");
            return res.status(400).json({
                responseCode: 400,
                message: 'Le champ "secret_key" est manquant dans le corps de la requête.'
            });
        }

        cachedSecretKey = secret_key;
        lastKeyRenewalTime = Date.now();
        console.log("Nouvelle clé secrète reçue et mise à jour.");

        res.status(200).json({
            responseCode: 200,
            message: 'Clé secrète mise à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors du traitement du callback de clé secrète:', error);
        res.status(500).json({
            responseCode: 500,
            message: 'Erreur serveur lors de la réception de la clé secrète.',
            error: error.message
        });
    }
});

/**
 * @route POST /api/payment-webhook
 * @description Endpoint pour recevoir les notifications de transaction de PVit.
 * Cette route est appelée par PVit pour les mises à jour de statut de transaction.
 */
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
        code, // Code de réponse de PVit pour le webhook
        operator
    } = req.body;

    console.log(`Webhook reçu pour référence: ${merchantReferenceId}, statut: ${status}`);

    if (!merchantReferenceId) {
        console.warn("Webhook reçu sans merchantReferenceId.");
        return res.status(400).json({
            responseCode: 400,
            transactionId: transactionId,
            message: 'Le champ "merchantReferenceId" est manquant.'
        });
    }

    try {
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

        const existingTransaction = await Transaction.findByReference(merchantReferenceId);

        if (existingTransaction) {
            await Transaction.updateTransaction(merchantReferenceId, transactionData);
            console.log(`Transaction ${merchantReferenceId} mise à jour en base de données.`);
        } else {
            // Création d'une nouvelle transaction si elle n'existe pas (cas de transactions initiées hors de notre API)
            await Transaction.create(transactionData);
            console.log(`Nouvelle transaction ${merchantReferenceId} créée en base de données via webhook.`);
        }

        // Notifier les écouteurs en attente
        if (transactionListeners.has(merchantReferenceId)) {
            const listener = transactionListeners.get(merchantReferenceId);
            listener.resolve(transactionData);
            transactionListeners.delete(merchantReferenceId);
        }

        return res.status(200).json({
            responseCode: code || 200, // Utilise le code PVit si fourni, sinon 200
            transactionId: transactionId,
            message: 'Notification de transaction traitée avec succès.'
        });
    } catch (error) {
        console.error(`Erreur lors du traitement du webhook pour la référence ${merchantReferenceId}:`, error);
        // Informer PVit qu'il y a eu un problème de notre côté
        return res.status(500).json({
            responseCode: 500,
            transactionId: transactionId,
            message: `Erreur serveur lors du traitement du webhook: ${error.message}`
        });
    }
});

/**
 * @route POST /api/rest-transaction
 * @description Initie une transaction de paiement via l'API REST de PVit.
 */
router.post('/api/rest-transaction', async (req, res) => {
    let reference; // Déclarée ici pour être accessible dans le bloc catch
    let transactionCreationPromise; // Pour stocker la promesse de création initiale de transaction

    try {
        await ensureValidSecretKey();

        const {
            amount,
            product,
            customer_account_number,
            free_info,
            owner_charge = "MERCHANT", // Valeur par défaut
            owner_charge_operator = "MERCHANT" // Valeur par défaut
        } = req.body;

        // --- Validation des champs requis ---
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

        // --- Génération de la référence ---
        reference = generateReference();

        // --- Définition des données de transaction pour PVit ---
        const pvitTransactionData = {
            agent: process.env.PVIT_AGENT || "AGENT-1",
            amount,
            product: product || "DEFAULT_PRODUCT", // Assurer qu'il y a une valeur
            reference,
            service: "RESTFUL",
            callback_url_code: process.env.CODEURLCALLBACK, // Assurez-vous que cette variable est définie dans .env
            customer_account_number,
            merchant_operation_account_code: process.env.PVIT_ACCOUNT_ID,
            transaction_type: "PAYMENT",
            owner_charge,
            owner_charge_operator,
            free_info: (free_info || "Transaction Initiale").substring(0, 15) // Limiter la longueur
        };

        // --- Enregistrement initial de la transaction en base de données (PENDING) ---
       
        transactionCreationPromise = Transaction.create({
            transaction_id: `INIT_${reference}`, // ID temporaire avant la réponse de PVit
            reference: reference,
            amount: amount,
            status: 'PENDING',
            customer_account_number: customer_account_number,
            charge_owner: owner_charge,
            free_info: free_info,
            transaction_operation: 'PAYMENT',
            created_at: new Date(), // Ajout de la date de création
            updated_at: new Date()
        });

        console.log(`Tentative de sauvegarde initiale de la transaction ${reference} en base de données.`);


        // --- Appel à l'API PVit ---
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

        // Attendre que la transaction initiale soit bien sauvegardée
        await transactionCreationPromise;

        // Mise à jour de transaction_id si PVit en fournit un plus spécifique
        if (response.data.transaction_id && response.data.transaction_id !== `INIT_${reference}`) {
            await Transaction.updateTransaction(reference, { transaction_id: response.data.transaction_id });
            console.log(`ID de transaction PVit mis à jour pour ${reference}: ${response.data.transaction_id}`);
        } else {
            console.log(`Référence ${reference} : Pas de nouvel ID transactionnel de PVit ou identique à l'ID initial.`);
        }
        
        console.log(`Requête PVit envoyée pour référence ${reference}. Attente du webhook...`);

        // --- Attendre la notification du webhook ---
        const transactionResult = await waitForTransactionCallback(reference);

        console.log("Transaction complétée via webhook:", transactionResult);

        res.status(200).json({
            success: true,
            message: 'Transaction initiée et complétée avec succès via webhook.',
            data: {
                ...transactionResult, // Les données complètes de la transaction après le webhook
                initial_pvit_response: response.data, // Réponse initiale de PVit
                reference // Assurez-vous que la référence est incluse
            }
        });

    } catch (error) {
        console.error('Erreur lors de l\'initiation de la transaction REST:', error);

        // Gérer spécifiquement les erreurs de timeout
        if (error.message.includes('Timeout')) {
            return res.status(408).json({
                success: false,
                message: 'Timeout : Le webhook de transaction n\'a pas été reçu dans le délai imparti.',
                reference: reference || 'Non disponible' // Toujours inclure la référence si générée
            });
        }

        // Gérer les erreurs d'Axios (réponses HTTP de PVit)
        if (axios.isAxiosError(error) && error.response) {
            console.error('Erreur de réponse PVit:', error.response.data);
            return res.status(error.response.status || 500).json({
                success: false,
                message: 'Erreur lors de la communication avec le service de paiement (PVit).',
                error: error.response.data,
                reference: reference || 'Non disponible'
            });
        }

        // Erreurs générales ou autres
        res.status(500).json({
            success: false,
            message: 'Une erreur inattendue est survenue lors de l\'initiation de la transaction.',
            error: error.message,
            reference: reference || 'Non disponible'
        });
    }
});

/**
 * @route POST /api/payment/generate-link
 * @description Route pour générer un lien de paiement via PVit.
 */
router.post('/api/payment/generate-link', async (req, res) => {
    let reference; // Déclarée ici pour être accessible dans le bloc catch

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

        // --- Validation des champs requis avant toute opération coûteuse ---
        if (!amount || !customer_account_number || !service) {
            return res.status(400).json({
                success: false,
                message: 'Les champs "amount", "customer_account_number" et "service" sont requis.'
            });
        }
        if (typeof amount !== 'number' || amount <= 150) { // Montant minimum
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
            return res.status(500).json({ // 500 car c'est une erreur de configuration serveur
                success: false,
                message: 'Erreur de configuration serveur: Les codes de redirection/callback ne sont pas définis dans les variables d\'environnement.'
            });
        }

        // --- Génération de la référence ---
        reference = generateReference();

        await ensureValidSecretKey(); // S'assure que la clé est prête

        // --- Construction des données de transaction pour PVit ---
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

        // --- Appel à l'API PVit pour générer le lien ---
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

        // --- Sauvegarde initiale de la transaction en base de données ---
        // Le transaction_id de PVit n'est pas toujours disponible immédiatement pour les liens
        await Transaction.create({
            transaction_id: response.data.transaction_id || `LINK_${reference}`,
            reference,
            amount,
            status: 'PENDING', // Statut initial en attente du webhook
            customer_account_number,
            free_info: free_info?.substring(0, 15),
            transaction_operation: 'PAYMENT',
            operator: service === 'VISA_MASTERCARD' ? 'VISA' : null, // Définition de l'opérateur si pertinent
            created_at: new Date(),
            updated_at: new Date()
        });

        console.log(`Lien de paiement généré pour référence ${reference}. Transaction initiale sauvegardée.`);
        console.log(`Lien de paiement: ${response.data.payment_link}`);

        // --- Attendre la notification du webhook ---
       
        const transactionResult = await waitForTransactionCallback(reference);

        console.log("Transaction complétée via webhook pour le lien de paiement:", transactionResult);

        // --- Réponse finale au client ---
        res.status(200).json({
            success: true,
            message: 'Lien de paiement généré et transaction complétée via webhook.',
            data: {
                payment_link: response.data.payment_link, // Le lien généré par PVit
                ...transactionResult, // Les données complètes reçues du webhook
                reference // Assurez-vous que la référence est incluse
            }
        });

    } catch (error) {
        console.error('Erreur lors de la génération du lien de paiement:', error);

        // --- Gestion des erreurs spécifiques ---
        if (error.message.includes('Timeout')) {
            return res.status(408).json({
                success: false,
                message: 'Timeout : Le webhook de transaction n\'a pas été reçu dans le délai imparti après la génération du lien.',
                reference: reference || 'Non disponible'
            });
        }

        // Erreurs d'Axios (réponses HTTP de PVit)
        if (axios.isAxiosError(error) && error.response) {
            console.error('Erreur de réponse PVit lors de la génération du lien:', error.response.data);
            return res.status(error.response.status || 500).json({
                success: false,
                message: 'Erreur lors de la communication avec le service de paiement (PVit).',
                error: error.response.data,
                reference: reference || 'Non disponible'
            });
        }

        // Erreurs générales ou autres (ex: validation initiale qui n'a pas été capturée)
        res.status(500).json({
            success: false,
            message: 'Une erreur inattendue est survenue lors de la génération du lien de paiement.',
            error: error.message,
            reference: reference || 'Non disponible'
        });
    }
});

const pvitRouter = router;
module.exports = pvitRouter;