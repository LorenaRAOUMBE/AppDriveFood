const express = require("express");
const cors = require("cors");
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

// --- Configuration ---
dotenv.config(); // Charge les variables d'environnement du fichier .env
const app = express();

// --- Middlewares ---
app.use(cors()); // Active CORS pour toutes les requêtes
app.use(bodyParser.json()); // Parse les requêtes JSON
app.use(bodyParser.urlencoded({ extended: true })); // Parse les requêtes URL-encoded

// --- Import des routes ---

const utilisateursRoute = require("./Routes/utilisateursRoute");
const categorieRoute = require("./Routes/categorieRoute");
const livraisonRoute = require('./Routes/livraisonRoute');
const livreurRoute = require('./Routes/livreurRoute');
const platRoute = require('./Routes/platRoute');
const restaurantRoute = require('./Routes/restaurantRoute');
const commandeRoute = require('./Routes/commandeRoute');
const authentificationRoute = require('./Routes/authentificationRoute'); 
const pvitRouter = require('./Service/pvit.Service'); // Votre routeur pour les paiements PVit

// --- Utilisation des routes ---

// Pour les routes sans préfixe spécifique, elles seront accessibles directement.
app.use(utilisateursRoute);
app.use(categorieRoute);
app.use(livraisonRoute);
app.use(livreurRoute);
app.use(platRoute);
app.use(restaurantRoute);
app.use(commandeRoute);
app.use(authentificationRoute);
app.use("/", pvitRouter); 

// --- Middleware de gestion globale des erreurs ---
// Ce middleware doit être défini APRÈS toutes les autres routes et middlewares.
app.use((err, req, res, next) => {
    console.error('Erreur globale non gérée:', err); 
    const statusCode = err.statusCode || 500;
    const message = err.message || "Une erreur interne du serveur est survenue.";

    res.status(statusCode).json({
        success: false,
        message: message,

        ...(process.env.NODE_ENV === 'development' && { error: err.stack })
    });
});

// --- Port d'écoute ---
const PORT = process.env.PORT || 3400;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);

});

// Exportez l'application si vous souhaitez la tester ou l'importer ailleurs
module.exports = app;