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

// Fetch notifications for inventory with product images
async function fetchInventoryNotifications() {
    try {
        const response = await fetch('/notifications/inventory', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const inventoryNotifications = await response.json();
            // Handle the data (e.g., display on the front-end)
            console.log('Inventory Notifications:', inventoryNotifications);
        } else {
            console.error('Error fetching inventory notifications:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching inventory notifications:', error);
    }
}

// Fetch notifications for reports with product images
async function fetchReportsNotifications() {
    try {
        const response = await fetch('/notifications/reports', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const reportsNotifications = await response.json();
            // Handle the data (e.g., display on the front-end)
            console.log('Reports Notifications:', reportsNotifications);
        } else {
            console.error('Error fetching reports notifications:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching reports notifications:', error);
    }
}

// Fetch notifications for sales with relevant data (e.g., sales updates)
async function fetchSalesNotifications() {
    try {
        const response = await fetch('/notifications/sales', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const salesNotifications = await response.json();
            // Handle the data (e.g., display on the front-end)
            console.log('Sales Notifications:', salesNotifications);
        } else {
            console.error('Error fetching sales notifications:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching sales notifications:', error);
    }
}

// Fetch notifications for customers with product images and updates
async function fetchCustomerNotifications() {
    try {
        const response = await fetch('/notifications/customers', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const customerNotifications = await response.json();
            // Handle the data (e.g., display on the front-end)
            console.log('Customer Notifications:', customerNotifications);
        } else {
            console.error('Error fetching customer notifications:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching customer notifications:', error);
    }
}

// Fetch notifications for any other relevant categories (expand as needed)
async function fetchOtherNotifications(route) {
    try {
        const response = await fetch(route, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const notifications = await response.json();
            // Handle the data (e.g., display on the front-end)
            console.log('Other Notifications:', notifications);
        } else {
            console.error('Error fetching other notifications:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching other notifications:', error);
    }
}

// Example calls to fetch notifications for various routes
fetchInventoryNotifications();
fetchReportsNotifications();
fetchSalesNotifications();
fetchCustomerNotifications();
