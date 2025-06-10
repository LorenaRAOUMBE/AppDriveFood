require('dotenv').config();
const axios = require('axios');
const qs = require('qs')

const PVIT_BASE_URL = process.env.PVIT_BASE_URL;
const PVIT_ACCOUNT_ID = process.env.PVIT_ACCOUNT_ID; // Votre ID de compte PVit

let cachedSecretKey= null

// Route callback pour recevoir la cle secret 

router.post("api/payment/secret-callback",(req,res)=>{
    const {secret_key}=req.body;

    cachedSecretKey=secret_key;

    console.log("cle secrete recu :", secret_key);
    
})

// Création d'une instance Axios préconfigurée pour les appels API PVit
const pvitApi = axios.create({
    baseURL: PVIT_BASE_URL,
    headers: {
        'X-Secret': cachedSecretKey, // En-tête d'authentification requis par PVit
        'Content-Type': 'application/json'
    }
});


async function initiateTransaction(account_id, amount,description,reference,service,callback_url_code,customer_account_number ,merchant_operation_account_code ,transaction_type,owner_charge) {
    try {
        const payload = {
            account_id: PVIT_ACCOUNT_ID,
            amount:amount,
            description:description,
            reference:reference,
            service:"RESTFUL",
            callback_url_code:process.env.CODEURLCALLBACK,
            customer_account_number:customer_account_number,
            merchant_operation_account_code:'ACC_683486FC89758',
            // customerName:customerName,
            transaction_type: "PAYMENT",
            owner_charge:"CUSTOMER",
        };
        const response = await pvitApi.post("/FH9WCKEIPITSHCY0/rest", payload); // Utilisez votre instance préconfigurée 'pvitApi'
        return response.data;
    } catch (error) {
        if (error.response) {
            console.error("Réponse d'erreur de PVit :", error.response.data);
            // C'est cette ligne qui est cruciale pour voir le détail !
            console.error("Messages d'erreur spécifiques de PVit :", error.response.data.messages);
        } else if (error.request) {
            console.error("Pas de réponse reçue de PVit :", error.request);
        } else {
            console.error("Erreur de configuration de la requête PVit :", error.message);
        }
        throw error; // Propagez l'erreur
    }
}


async function getTransactionStatus(transactionId) {
    try {
        const response = await pvitApi.get(`/A1UNR9PZJF05EUTS/status/${transactionId}`);
        console.log('Réponse PVit - Get Status:', response.data);
        return response.data;
    } catch (error) {
        // Log plus détaillé de l'erreur
        console.error('Erreur lors de la récupération du statut de la transaction PVit:', error.response?.data || error.message);
        throw error;
    }
}

// async function generatePaymentLink(montant, reference, description, redirectUrl, type = 'WEB') {
//     try {
//         const payload = {
//             account_id: PVIT_ACCOUNT_ID,
//             montant: montant,
//             reference: reference,
//             description: description,
//             redirect_url: redirectUrl,
//             type: type
//         };
//         const response = await pvitApi.post('/transaction/link', payload);
//         console.log('Réponse PVit - Transaction Link:', response.data);
//         return response.data;
//     } catch (error) {
//         console.error('Erreur lors de la génération du lien de paiement PVit:', error.data || error.message);
//         throw error;
//     }
// }

async function renewSecretKey(operationAccountCode, receptionUrlCode, renewalPassword, renewSecretCodeURL) {
    try {
        const data = {
            operationAccountCode: ACC_683486FC89758,
            receptionUrlCode: "9MTBW",
            password: process.env.PASSWORD        
        };

        // Effectue un appel axios direct (pas via pvitApi) car les headers et le body diffèrent.
        const response = await axios.post("/WPORYY2HIGCKDZWX/renew-secret", qs.stringify(data), // Encode les données en x-www-form-urlencoded
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        console.log('Réponse PVit - Renew Secret:', response.data);
        return response.data;
    } catch (error) {
        console.error('Erreur lors du renouvellement de la clé secrète PVit:', error.response ? error.response.data : error.message);
        throw error;
    }
}


module.exports = {
    initiateTransaction,
    getTransactionStatus,
    renewSecretKey
};