// config.bd/db.js
const mysql = require('mysql2/promise'); // Assurez-vous d'utiliser mysql2/promise

const pool = mysql.createPool({
    host: 'srv1789.hstgr.io',
    user: 'u805707239_tchopshap',
    password: '@Tchopshap241',
    database: 'u805707239_sophie',
    waitForConnections: true, // Attendre si toutes les connexions sont utilisées
    connectionLimit: 10,     // Nombre maximum de connexions dans le pool
    queueLimit: 0            // Pas de limite sur la file d'attente pour les requêtes
});

// Test de connexion initial pour s'assurer que le pool fonctionne
async function testDatabaseConnection() {
    let connection;
    try {
        connection = await pool.getConnection(); // Tente d'obtenir une connexion du pool
        console.log('Connecté à la base de données avec succès !');
    } catch (error) {
        console.error('Échec de la connexion à la base de données:', error.message);
    
    } finally {
        if (connection) {
            connection.release(); // Relâche la connexion dans le pool
        }
    }
}

// Exécute le test de connexion au démarrage
testDatabaseConnection();

// Exportation du pool de connexions pour l'utiliser dans d'autres fichiers
module.exports = pool;