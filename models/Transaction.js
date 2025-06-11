const pool = require('../config.bd/db');

class Transaction {
    static async create(transactionData) {
        if (!transactionData.transaction_id || !transactionData.reference || !transactionData.amount) {
            throw new Error('Données de transaction incomplètes');
        }

        const sql = `
            INSERT INTO transactions_pvit 
            (transaction_id, reference, amount, status, customer_account_number) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const values = [
            transactionData.transaction_id,
            transactionData.reference,
            transactionData.amount,
            transactionData.status || 'PENDING',
            transactionData.customer_account_number 
        ];

        try {
            const [result] = await pool.query(sql, values);
            return result;
        } catch (error) {
            console.error('Erreur lors de la création de la transaction:', error);
            throw error;
        }
    }

    static async updateStatus(reference, newStatus) {
        if (!reference || !newStatus) {
            throw new Error('Référence et nouveau statut requis');
        }

        const sql = `
            UPDATE transactions_pvit 
            SET status = ?, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE reference = ? 
            AND status != 'SUCCESS'
        `;

        try {
            const [result] = await pool.query(sql, [newStatus, reference]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du statut:', error);
            throw error;
        }
    }

    static async findByReference(reference) {
        if (!reference) {
            throw new Error('Référence requise');
        }

        const sql = 'SELECT * FROM transactions_pvit WHERE reference = ?';
        
        try {
            const [rows] = await pool.query(sql, [reference]);
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche de la transaction:', error);
            throw error;
        }
    }

    static updateTransaction(reference, transactionData) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE transactions_pvit 
                SET 
                    status = ?,
                    response_code = ?,
                    response_text = ?,
                    fees = ?,
                    operator = ?,
                    updated_at = NOW()
                WHERE reference = ?
            `;
            
            const values = [
                transactionData.status,
                transactionData.response_code,
                transactionData.response_text,
                transactionData.fees,
                transactionData.operator,
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
}

module.exports = Transaction;