const express = require("express");
const pool= require('./config.bd/db');
const router = express.Router();
const cors = require("cors");
const jwt= require("jsonwebtoken");

const utilisateursRoute=require("./Routes/utilisateursRoute")
const categorieRoute =require("./Routes/categorieRoute");
const livraisonRoute =require('./Routes/livraisonRoute');
const livreurRoute =require('./Routes/livreurRoute');
const platRoute =require('./Routes/platRoute');
const restaurantRoute =require('./Routes/restaurantRoute');
const commandeRoute =require('./Routes/commandeRoute');
const authentificationRoute =require('./Routes/authentificationRoute');


//  Création du serveur Express
const app = express();

// Definition du middleware pour connexion

app.use(cors());

app.use(express.urlencoded({ extended: false }));
app.use(express.json());


// Definition du moteur d affichage
app.set("view engine","ejs")
app.set('views','IHM')

// definitition des routes
app.use(authentificationRoute);
app.use(utilisateursRoute);
app.use(categorieRoute);
app.use(commandeRoute);
app.use(livreurRoute);
app.use(livraisonRoute);
app.use(platRoute);
app.use(restaurantRoute);

app.get("/apropos", (req, res) => {
  res.status(200).render("apropos");
});

app.get("/nouscontacter", (req, res) => {
  res.status(200).render("nouscontacter");
});



app.use((req, res) => {
  res.status(404).render("pageintrouvable");
});


// Demarrage du serveur
const PORT = 3400;

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT} !`);
});
