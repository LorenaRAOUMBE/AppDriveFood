require('dotenv').config();

// Importation les modules nécessaires
const mysql = require('mysql');
const cloudinary = require('cloudinary').v2;

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});


// Configuration et création du pool de la base de données
const optionBD = {
  host: 'srv1789.hstgr.io',
  user: 'u805707239_tchopshap',
  password: '@Tchopshap241',
  database: 'u805707239_sophie',
  waitForConnections: true, 
  connectionLimit: 10,     
  queueLimit: 0 
};
const pool = mysql.createPool(optionBD);

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Erreur de connexion à la base de données :', err.message);
        return;
    }
    console.log('Connecté à la base de données !');
    connection.release(); 
});

// 5. Exportez tous les éléments nécessaires sous forme d'objet
// Ceci permet aux autres fichiers de faire :
// const { pool, cloudinary } = require('./chemin/vers/ceFichier');
module.exports = {
  pool,
  cloudinary
};