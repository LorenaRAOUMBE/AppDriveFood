const mysql = require('mysql');

// Configuration de la base de données 
const optionBD = {
  host: 'srv1789.hstgr.io',
  user: 'u805707239_test',
  password: '@12345678Data',
  port: 3306,
  database: 'u805707239_test',
};

// Création d'un pool pour gérer efficacement les connexions)
const pool = mysql.createPool(optionBD);
pool.getConnection(()=>{
    console.log('connecté a la base de donnée ');
});

// Exportation du pool de connexions pour l'utiliser dans d'autres fichiers
module.exports = pool;