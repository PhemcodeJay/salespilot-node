const mysql = require('mysql2/promise'); // Use the promise-based version

const hostname = 'localhost';
const username = 'root';
const password = '';
const database = 'dbs13455438';

// Async function to get the connection
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

// Export the getConnection function for use in other files
module.exports = { getConnection };
