require('dotenv').config(); // Charge les variables d'environnement
const express = require('express');
const router = express.Router();
const pvitService = require('../Service/pvit.Service'); 
const { nanoid } = require('nanoid');
const Transaction = require('../models/Transaction');

// --- Middleware personnalisé pour capturer le corps brut (rawBody) ---
// Ce middleware est essentiel pour la vérification de signature des webhooks PVit,
// car il lit le corps de la requête avant que express.json() ne le consume.
function rawBodyMiddleware(req, res, next) {
    // Ne s'applique qu'aux requêtes POST avec un Content-Type JSON
    if (req.method === 'POST' && req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
        let data = '';
        req.setEncoding('utf8'); // Assure un encodage correct
        req.on('data', chunk => {
            data += chunk; // Accumule les morceaux de données
        });
        req.on('end', () => {
            req.rawBody = data; // Stocke le corps brut dans req.rawBody
            next(); 
        });
    } else {
        next();
    }
}


// --- ROUTES API POUR VOTRE FRONTEND ---

router.post('/api/payments/initiate', async (req, res) => {
    try {
        // Récupération des variables d'environnement (PVIT_ACCOUNT_ID, CODEURLCALLBACK)
        const merchant_operation_account_code = process.env.PVIT_ACCOUNT_ID;
        const callback_url_code = process.env.CODEURLCALLBACK;
        const account_id = process.env.PVIT_ACCOUNT_ID; // Souvent le même que merchant_operation_account_code
        const service = 'RESTFUL';
        const transaction_type = 'PAYMENT';
        const owner_charge = "CUSTOMER"; 

        // Récupération des données du corps de la requête (req.body est parsé par express.json() de index.js)
        const { amount, customer_account_number, description } = req.body;

        // Validation simple des paramètres requis
        if (!amount || !customer_account_number) {
            return res.status(400).json({
                message: 'Les paramètres "amount" et "customer_account_number" sont requis.'
            });
        }

        // Génération d'une référence unique pour votre système
            const shortUniqueId = nanoid(11);
            const reference = `REF${shortUniqueId}`; // 4 + 10 = 14 caractères

        // Appel au service PVit pour initier la transaction
        const pvitResponse = await pvitService.initiateTransaction(
            account_id,
            amount,
            description,
            reference,
            service,
            callback_url_code,
            customer_account_number,
            merchant_operation_account_code,
            transaction_type,
            owner_charge
        );

        // Enregistrement de la transaction dans votre base de données
        await Transaction.create({
            transaction_id: pvitResponse.transaction_id, // ID fourni par PVit
            reference: reference, // Votre référence interne
            amount: amount,
            customer_account_number:customer_account_number,
            status: 'PENDING' 
        });

        res.status(200).json({
            success: true,
            message: 'Transaction initiée avec succès. En attente de confirmation PVit.',
            data: {
                transactionId: pvitResponse.transaction_id,
                reference: reference
            }
        });

    } catch (error) {
        console.error('Erreur lors de l\'initiation du paiement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'initiation du paiement.',
            error: error.message || 'Une erreur inconnue est survenue.' 
        });
    }
});

router.get('/api/payments/status/:transactionId', async (req, res) => {
    const { transactionId } = req.params; 

    if (!transactionId) {
        return res.status(400).json({ message: 'ID de transaction manquant dans l\'URL.' });
    }

    try {
        // Appel au service PVit pour obtenir le statut de la transaction
        const pvitResponse = await pvitService.getTransactionStatus(transactionId);
        res.status(200).json({
            message: 'Statut de la transaction récupéré avec succès.',
            statusData: pvitResponse
        });
    } catch (error) {
        console.error(`Erreur de l\'API de statut de paiement pour la transaction ${transactionId}:`, error.message || error);
        res.status(error.status || 500).json({
            message: 'Erreur lors de la récupération du statut de la transaction.',
            error: error.response?.data || error.data || { message: error.message || 'Une erreur inconnue est survenue.' }
        });
    }
});


// --- ROUTE DE CALLBACK/WEBHOOK POUR PVIT ---

router.post('/callbacks-MyPVit', rawBodyMiddleware, async (req, res) => {
    const pvitNotification = req.body; // Le corps est déjà parsé en JSON ici
    console.log('------ NOTIFICATION PVIT REÇUE ------');
    console.log(JSON.stringify(pvitNotification, null, 2)); // Afficher la notification complète pour le débogage
    console.log('------------------------------------');

    // Déstructuration des champs reçus dans la notification PVit
    const { transactionId, reference, status, amount, customer_account_number, code } = pvitNotification;

    // Validation des données essentielles de la notification
    if (!transactionId || !reference || !status) {
        console.warn('Notification PVit incomplète reçue. Données manquantes: transactionId, reference ou status.');
        return res.status(400).json({
            responseCode: 400,
            message: 'Données de notification PVit incomplètes.'
        });
    }

    // --- VÉRIFICATION DE LA SIGNATURE DU WEBHOOK (CRUCIAL POUR LA SÉCURITÉ) ---
   
    if (pvitService.verifyWebhookSignature && !pvitService.verifyWebhookSignature(req.headers['x-pvit-signature'], req.rawBody)) {
        console.warn('Signature de webhook PVit invalide pour la transaction:', transactionId);
        return res.status(403).json({ responseCode: 403, message: 'Signature de webhook invalide.' });
    }

    try {
        // 1. Recherche de la transaction dans votre base de données par la référence interne
        const existingTransaction = await Transaction.findByReference(reference);

        if (!existingTransaction) {
            console.warn(`Transaction non trouvée dans votre système pour la référence: ${reference}.`);
            // Renvoyer un 404 si la transaction n'est pas trouvée (utile pour PVit)
            return res.status(404).json({
                responseCode: 404,
                message: 'Transaction non trouvée dans votre système.',
                transactionId // Inclure l'ID de PVit pour la référence
            });
        }

        // 2. Vérification de l'idempotence (éviter de traiter la même notification plusieurs fois)
        // Si la transaction est déjà en SUCCESS et que la notification est aussi SUCCESS
        if (existingTransaction.status === 'SUCCESS' && status === 'SUCCESS') {
            console.log(`Notification redondante pour la transaction ${reference} (déjà traitée avec succès).`);
            // Renvoyer 200 OK pour indiquer à PVit que tout est en ordre
            return res.status(200).json({
                responseCode: 200,
                message: 'Transaction déjà traitée avec succès.',
                transactionId
            });
        }

        // 3. Mise à jour du statut de la transaction dans votre base de données
        const updated = await Transaction.updateStatus(reference, status);
        console.log(`Statut de la transaction ${reference} mis à jour à ${status}.`);

        // 4. Logique métier supplémentaire basée sur le statut
        if (status === 'SUCCESS') {
            // TODO: Déclencher vos actions métier ici après un paiement réussi
            // Ex: Mettre à jour le statut de la commande, envoyer un e-mail de confirmation,
            // mettre à jour les stocks, notifier les services de livraison, etc.
            console.log(`Paiement réussi pour la transaction ${reference}. Déclenchement de la logique métier.`);
        } else if (status === 'FAILED') {
            
            console.log(`Paiement échoué pour la transaction ${reference}.`);
        }

        // Réponse obligatoire pour PVit pour confirmer la bonne réception et le traitement
        res.status(200).json({
            responseCode: 200, // Code de succès attendu par PVit
            transactionId, // L'ID de transaction tel que PVit l'a envoyé
            message: 'Notification PVit reçue et traitée avec succès.'
        });

    } catch (error) {
        console.error('Erreur lors du traitement du callback PVit:', error);
        // En cas d'erreur interne, renvoyer une réponse 500 pour que PVit puisse potentiellement réessayer
        res.status(500).json({
            responseCode: 500, // Code d'erreur pour PVit
            transactionId, 
            message: 'Erreur interne lors du traitement de la notification.'
        });
    }
});

module.exports = router;