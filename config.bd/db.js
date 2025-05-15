require('dotenv').config();

// Importation les modules nécessaires
const mysql = require('mysql');


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

module.exports =  pool
;