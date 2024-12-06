// MySQL connection pool setup
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Replace with actual DB username
    password: '', // Replace with actual DB password
    database: 'dbs13455438',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// JWT token verification function
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

// Fetch user details by token
const fetchUserInfo = (username) => {
    return new Promise((resolve, reject) => {
        pool.query('SELECT username, email, date, phone, location, user_image FROM users WHERE username = ?', [username], (err, results) => {
            if (err) return reject("Error fetching user info");
            if (results.length === 0) return reject("User not found.");
            resolve(results[0]);
        });
    });
};

