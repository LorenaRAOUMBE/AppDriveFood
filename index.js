const express = require("express");
const pool = require('./config.bd/db');
const router = express.Router();
const cors = require("cors");

const administrateurRoute=require("./Routes/administrateurRoute");
const categorieRoute =require("./Routes/categorieRoute");
const livraisonRoute =require('./Routes/livraisonRoute');
const livreurRoute =require('./Routes/livreurRoute');
const platRoute =require('./Routes/platRoute');
const restaurantRoute =require('./Routes/restaurantRoute');
const clientRoute =require('./Routes/clientRoute');
const commandeRoute =require('./Routes/commandeRoute');
const jwt= require("jsonwebtoken");
const { configDotenv } = require("dotenv");

//  Création du serveur Express
const app = express();

// Configuration CORS avec options
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3400'], // Ajoutez vos domaines autorisés
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Appliquer CORS avec les options
app.use(cors(corsOptions));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Definition du moteur d affichage
app.set("view engine","ejs")
app.set('views','IHM')

// definitition des routes
app.use(administrateurRoute);
app.use(categorieRoute);
app.use(clientRoute);
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

app.listen(3400, () => {
  console.log("Serveur démarré (http://localhost:3400/) !");
});