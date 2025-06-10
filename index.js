const express = require("express");
const pool = require('./config.bd/db'); 
const cors = require("cors");
const jwt = require("jsonwebtoken"); 
const dotenv = require('dotenv'); // Pour charger les variables d'environnement

dotenv.config(); // Charger les variables d'environnement dès le début

// Importez vos routeurs
const utilisateursRoute = require("./Routes/utilisateursRoute");
const categorieRoute = require("./Routes/categorieRoute");
const livraisonRoute = require('./Routes/livraisonRoute');
const livreurRoute = require('./Routes/livreurRoute');
const platRoute = require('./Routes/platRoute');
const restaurantRoute = require('./Routes/restaurantRoute');
const commandeRoute = require('./Routes/commandeRoute');
const authentificationRoute = require('./Routes/authentificationRoute');
const paiementRoute = require('./Routes/paiement.Route'); 
const pvitService = require('./Service/pvit.Service'); 


// Création du serveur Express
const app = express();

// --- Configuration des middlewares globaux ---
app.use(cors());

// Middleware de parsing du corps de la requête

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Middleware de log personnalisé (optionnel, mais utile pour le débogage)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Définition du moteur d'affichage (si utilisé)
app.set("view engine", "ejs");
app.set('views', 'IHM');

// --- Définition des routes ---

app.use(authentificationRoute);
app.use(categorieRoute);
app.use(commandeRoute);
app.use(livraisonRoute);
app.use(livreurRoute);
app.use(paiementRoute); 
app.use(platRoute);
app.use(restaurantRoute);
app.use(utilisateursRoute);
app.use(pvitService.router);

// Routes simples pour tester les vues 
app.get("/apropos", (req, res) => {
    res.status(200).render("apropos");
});

app.get("/nouscontacter", (req, res) => {
    res.status(200).render("nouscontacter");
});

// Gestionnaire d'erreur 404 
app.use((req, res) => {
    res.status(404).render("pageintrouvable"); 
});

// --- Démarrage du serveur ---
const PORT =  3400; 

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT} !`);
    // C'est un bon endroit pour confirmer la connexion à votre base de données
    console.log('Connecté à la base de donnée'); // Si pool est votre gestionnaire de connexion
});