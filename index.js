const express = require("express");
const cors = require("cors");
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

// Configuration
dotenv.config();
const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import des routes
const utilisateursRoute = require("./Routes/utilisateursRoute");
const categorieRoute = require("./Routes/categorieRoute");
const livraisonRoute = require('./Routes/livraisonRoute');
const livreurRoute = require('./Routes/livreurRoute');
const platRoute = require('./Routes/platRoute');
const restaurantRoute = require('./Routes/restaurantRoute');
const commandeRoute = require('./Routes/commandeRoute');
const authentificationRoute = require('./Routes/authentificationRoute');
const pvitRouter = require('./Service/pvit.Service');

// Utilisation des routes
app.use(utilisateursRoute);
app.use(categorieRoute);
app.use(livraisonRoute);
app.use(livreurRoute);
app.use(platRoute);
app.use(restaurantRoute);
app.use(commandeRoute);
app.use(authentificationRoute);
app.use("/", pvitRouter); // Notez que nous n'ajoutons pas /api car déjà dans les routes

// Port d'écoute
const PORT = process.env.PORT || 3400;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});