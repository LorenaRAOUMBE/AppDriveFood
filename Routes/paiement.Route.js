// require('dotenv').config(); // Charge les variables d'environnement
// const express = require('express');
// const router = express.Router();
// const pvitService = require('../Service/pvit.Service'); 


// router.get('/api/payments/status/:transactionId', async (req, res) => {
//     const { transactionId } = req.params; 

//     if (!transactionId) {
//         return res.status(400).json({ message: 'ID de transaction manquant dans l\'URL.' });
//     }

//     try {
//         // Appel au service PVit pour obtenir le statut de la transaction
//         const pvitResponse = await pvitService.getTransactionStatus(transactionId);
//         res.status(200).json({
//             message: 'Statut de la transaction récupéré avec succès.',
//             statusData: pvitResponse
//         });
//     } catch (error) {
//         console.error(`Erreur de l\'API de statut de paiement pour la transaction ${transactionId}:`, error.message || error);
//         res.status(error.status || 500).json({
//             message: 'Erreur lors de la récupération du statut de la transaction.',
//             error: error.response?.data || error.data || { message: error.message || 'Une erreur inconnue est survenue.' }
//         });
//     }
// });


// // --- ROUTE DE CALLBACK/WEBHOOK POUR PVIT ---

// router.post('/callbacks-MyPVit', rawBodyMiddleware, async (req, res) => {
//     const pvitNotification = req.body; // Le corps est déjà parsé en JSON ici
//     console.log('------ NOTIFICATION PVIT REÇUE ------');
//     console.log(JSON.stringify(pvitNotification, null, 2)); // Afficher la notification complète pour le débogage
//     console.log('------------------------------------');

//     // Déstructuration des champs reçus dans la notification PVit
//     const { transactionId, reference, status, amount, customer_account_number, code } = pvitNotification;

//     // Validation des données essentielles de la notification
//     if (!transactionId || !reference || !status) {
//         console.warn('Notification PVit incomplète reçue. Données manquantes: transactionId, reference ou status.');
//         return res.status(400).json({
//             responseCode: 400,
//             message: 'Données de notification PVit incomplètes.'
//         });
//     }

//     // --- VÉRIFICATION DE LA SIGNATURE DU WEBHOOK (CRUCIAL POUR LA SÉCURITÉ) ---
   
//     if (pvitService.verifyWebhookSignature && !pvitService.verifyWebhookSignature(req.headers['x-pvit-signature'], req.rawBody)) {
//         console.warn('Signature de webhook PVit invalide pour la transaction:', transactionId);
//         return res.status(403).json({ responseCode: 403, message: 'Signature de webhook invalide.' });
//     }

//     try {
//         // 1. Recherche de la transaction dans votre base de données par la référence interne
//         const existingTransaction = await Transaction.findByReference(reference);

//         if (!existingTransaction) {
//             console.warn(`Transaction non trouvée dans votre système pour la référence: ${reference}.`);
//             // Renvoyer un 404 si la transaction n'est pas trouvée (utile pour PVit)
//             return res.status(404).json({
//                 responseCode: 404,
//                 message: 'Transaction non trouvée dans votre système.',
//                 transactionId // Inclure l'ID de PVit pour la référence
//             });
//         }

//         // 2. Vérification de l'idempotence (éviter de traiter la même notification plusieurs fois)
//         // Si la transaction est déjà en SUCCESS et que la notification est aussi SUCCESS
//         if (existingTransaction.status === 'SUCCESS' && status === 'SUCCESS') {
//             console.log(`Notification redondante pour la transaction ${reference} (déjà traitée avec succès).`);
//             // Renvoyer 200 OK pour indiquer à PVit que tout est en ordre
//             return res.status(200).json({
//                 responseCode: 200,
//                 message: 'Transaction déjà traitée avec succès.',
//                 transactionId
//             });
//         }

//         // 3. Mise à jour du statut de la transaction dans votre base de données
//         const updated = await Transaction.updateStatus(reference, status);
//         console.log(`Statut de la transaction ${reference} mis à jour à ${status}.`);

//         // 4. Logique métier supplémentaire basée sur le statut
//         if (status === 'SUCCESS') {
//             // TODO: Déclencher vos actions métier ici après un paiement réussi
//             // Ex: Mettre à jour le statut de la commande, envoyer un e-mail de confirmation,
//             // mettre à jour les stocks, notifier les services de livraison, etc.
//             console.log(`Paiement réussi pour la transaction ${reference}. Déclenchement de la logique métier.`);
//         } else if (status === 'FAILED') {
            
//             console.log(`Paiement échoué pour la transaction ${reference}.`);
//         }

//         // Réponse obligatoire pour PVit pour confirmer la bonne réception et le traitement
//         res.status(200).json({
//             responseCode: 200, // Code de succès attendu par PVit
//             transactionId, // L'ID de transaction tel que PVit l'a envoyé
//             message: 'Notification PVit reçue et traitée avec succès.'
//         });

//     } catch (error) {
//         console.error('Erreur lors du traitement du callback PVit:', error);
//         // En cas d'erreur interne, renvoyer une réponse 500 pour que PVit puisse potentiellement réessayer
//         res.status(500).json({
//             responseCode: 500, // Code d'erreur pour PVit
//             transactionId, 
//             message: 'Erreur interne lors du traitement de la notification.'
//         });
//     }
// });

// /**
//  * Route pour générer un lien de paiement
//  */
// router.post('/api/payment/generate-link', async (req, res) => {
//     let reference;
    
//     try {
//         await ensureValidSecretKey();

//         const {
//             amount,
//             customer_account_number,
//             service,
//             agent,
//             product,
//             free_info,
//             owner_charge = "CUSTOMER",
//             operator_owner_charge = "CUSTOMER",
//             failed_redirection_url_code,
//             success_redirection_url_code
//         } = req.body;

//         // Validation des champs obligatoires
//         if (!amount || !customer_account_number || !service) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Les champs amount, customer_account_number et service sont requis'
//             });
//         }

//         // Validation du montant minimum
//         if (amount <= 150) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Le montant doit être supérieur à 150'
//             });
//         }

//         // Validation du service
//         const validServices = ['VISA_MASTERCARD', 'WEB', 'RESTLINK'];
//         if (!validServices.includes(service)) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Le service doit être VISA_MASTERCARD, WEB ou RESTLINK'
//             });
//         }

//         // Validation des codes de redirection
//         if (!failed_redirection_url_code || !success_redirection_url_code) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Les codes de redirection sont requis'
//             });
//         }

//         // Génération de la référence
//         reference = generateReference();

//         // Construction des données de transaction avec validation des longueurs
//         const transactionData = {
//             agent: (agent || "AGENT-1").substring(0, 15),
//             amount,
//             product: (product || "PRODUIT-1").substring(0, 15),
//             reference: reference.substring(0, 15),
//             service,
//             callback_url_code: process.env.CODEURLCALLBACK,
//             customer_account_number: customer_account_number.substring(0, 20),
//             merchant_operation_account_code: process.env.PVIT_ACCOUNT_ID,
//             transaction_type: "PAYMENT",
//             owner_charge,
//             operator_owner_charge,
//             free_info: free_info ? free_info.substring(0, 15) : undefined,
//             failed_redirection_url_code,
//             success_redirection_url_code
//         };

//         // Requête vers l'API PVit
//         const response = await axios.post(
//             `${PVIT_BASE_URL}/ZRS0VFCPA0YJUCFV/link`,
//             transactionData,
//             {
//                 headers: {
//                     'X-Secret': cachedSecretKey,
//                     'X-Callback-MediaType': 'application/json',
//                     'Content-Type': 'application/json'
//                 }
//             }
//         );

//         // Sauvegarde en base de données
//         await Transaction.create({
//             transaction_id: response.data.transaction_id,
//             reference,
//             amount,
//             status: 'PENDING',
//             customer_account_number,
//             free_info: free_info?.substring(0, 15),
//             transaction_operation: 'PAYMENT',
//             operator: service === 'VISA_MASTERCARD' ? 'VISA' : null
//         });

//         // Réponse avec le lien et les informations
//         res.status(200).json({
//             success: true,
//             data: {
//                 payment_link: response.data.payment_link,
//                 transaction_id: response.data.transaction_id,
//                 reference,
//                 service
//             }
//         });

//     } catch (error) {
//         console.error('Erreur génération lien:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Erreur lors de la génération du lien',
//             error: error.response?.data || error.message,
//             reference: reference || null
//         });
//     }
// });

// module.exports = router;