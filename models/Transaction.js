// models/Transaction.js
const pool = require('../config.bd/db'); // S'appuie sur votre configuration mysql2/promise

class Transaction {
    /**
     * Crée une nouvelle transaction dans la base de données.
     * @param {object} transactionData Les données de la transaction à insérer.
     * @returns {Promise<object>} Les résultats de l'insertion (ex: insertId).
     */
    static async create(transactionData) {
        const sql = `
            INSERT INTO transactions_pvit 
            (transaction_id, reference, amount, status, customer_account_number, 
            fees, total_amount, charge_owner, free_info, 
            transaction_operation, operator, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const values = [
            transactionData.transaction_id,
            transactionData.reference,
            transactionData.amount,
            transactionData.status || 'PENDING',
            transactionData.customer_account_number,
            transactionData.fees || null,
            transactionData.total_amount || null,
            transactionData.charge_owner || null,
            transactionData.free_info || null,
            transactionData.transaction_operation || 'PAYMENT',
            transactionData.operator || null
        ];

        try {
            // pool.query() avec mysql2/promise retourne un tableau [results, fields]
            const [results] = await pool.query(sql, values);
            return results; // Contient insertId, affectedRows, etc.
        } catch (error) {
            console.error('Erreur lors de la création de la transaction:', error);
            throw error; // Propage l'erreur pour que la route puisse la gérer
        }
    }

    /**
     * Met à jour une transaction existante par sa référence.
     * @param {string} reference La référence de la transaction à mettre à jour.
     * @param {object} transactionData Les données de la transaction à mettre à jour.
     * @returns {Promise<boolean>} True si la transaction a été mise à jour, false sinon.
     */
    static async updateTransaction(reference, transactionData) {
        // Construction dynamique de la requête UPDATE pour ne modifier que les champs fournis
        let updates = [];
        let values = [];

        // Champs à mettre à jour si définis dans transactionData
        if (transactionData.transaction_id !== undefined) { updates.push("transaction_id = ?"); values.push(transactionData.transaction_id); }
        if (transactionData.status !== undefined) { updates.push("status = ?"); values.push(transactionData.status); }
        if (transactionData.fees !== undefined) { updates.push("fees = ?"); values.push(transactionData.fees); }
        if (transactionData.total_amount !== undefined) { updates.push("total_amount = ?"); values.push(transactionData.total_amount); }
        if (transactionData.charge_owner !== undefined) { updates.push("charge_owner = ?"); values.push(transactionData.charge_owner); }
        if (transactionData.operator !== undefined) { updates.push("operator = ?"); values.push(transactionData.operator); }
        if (transactionData.free_info !== undefined) { updates.push("free_info = ?"); values.push(transactionData.free_info); }
        if (transactionData.transaction_operation !== undefined) { updates.push("transaction_operation = ?"); values.push(transactionData.transaction_operation); }


        updates.push("updated_at = NOW()"); // Toujours mettre à jour la date de modification

        // Si aucun champ n'est à mettre à jour (sauf updated_at), on peut retourner directement
        if (updates.length === 1 && updates[0] === "updated_at = NOW()") {
            console.log(`Aucun champ spécifique à mettre à jour pour la transaction ${reference}, seule la date updated_at sera mise à jour.`);
            // On peut choisir de ne rien faire ou de forcer une mise à jour de la date
        }

        const sql = `
            UPDATE transactions_pvit 
            SET ${updates.join(", ")}
            WHERE reference = ?
        `;
        values.push(reference); // La référence est le dernier paramètre pour la clause WHERE

        try {
            const [results] = await pool.query(sql, values);
            return results.affectedRows > 0; // Retourne true si au moins une ligne a été affectée
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la transaction:', error);
            throw error;
        }
    }

    /**
     * Recherche une transaction par sa référence.
     * @param {string} reference La référence de la transaction à rechercher.
     * @returns {Promise<object|undefined>} La transaction trouvée ou undefined si non trouvée.
     */
    static async findByReference(reference) {
        const sql = 'SELECT * FROM transactions_pvit WHERE reference = ?';
        
        try {
            const [rows] = await pool.query(sql, [reference]);
            return rows[0]; // Retourne la première ligne trouvée ou undefined si le tableau est vide
        } catch (error) {
            console.error('Erreur lors de la recherche de la transaction:', error);
            throw error;
        }
    }
}

module.exports = Transaction;