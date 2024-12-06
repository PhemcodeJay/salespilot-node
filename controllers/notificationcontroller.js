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
