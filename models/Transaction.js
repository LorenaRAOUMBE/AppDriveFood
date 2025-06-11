const mysql = require('mysql');
const pool = require('../config.bd/db');

class Transaction {
    static create(transactionData) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO transactions_pvit 
                (transaction_id, reference, amount, status, customer_account_number, 
                fees, total_amount, charge_owner, free_info, 
                transaction_operation, operator) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

            pool.query(sql, values, (error, results) => {
                if (error) {
                    console.error('Erreur création transaction:', error);
                    reject(error);
                    return;
                }
                resolve(results);
            });
        });
    }

    static updateTransaction(reference, transactionData) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE transactions_pvit 
                SET 
                    status = ?,
                    fees = ?,
                    total_amount = ?,
                    charge_owner = ?,
                    operator = ?,
                    updated_at = NOW()
                WHERE reference = ?
            `;

            const values = [
                transactionData.status,
                transactionData.fees || null,
                transactionData.total_amount || null,
                transactionData.charge_owner || null,
                transactionData.operator || null,
                reference
            ];

            pool.query(sql, values, (error, results) => {
                if (error) {
                    console.error('Erreur mise à jour transaction:', error);
                    reject(error);
                    return;
                }
                resolve(results.affectedRows > 0);
            });
        });
    }

    static findByReference(reference) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM transactions_pvit WHERE reference = ?';
            
            pool.query(sql, [reference], (error, results) => {
                if (error) {
                    console.error('Erreur recherche transaction:', error);
                    reject(error);
                    return;
                }
                resolve(results[0]);
            });
        });
    }
}

module.exports = Transaction;