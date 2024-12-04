const mysql = require('mysql2/promise');

const hostname = 'localhost';
const username = 'root';
const password = '';
const database = 'dbs13455438';

async function getConnection() {
    try {
        const connection = await mysql.createConnection({
            host: hostname,
            user: username,
            password: password,
            database: database,
            charset: 'utf8',
        });

        console.log('Database connected successfully');
        return connection;
    } catch (error) {
        console.error('Database connection failed:', error.message);
        throw error;
    }
}

module.exports = { getConnection };
