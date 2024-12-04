// Fetch inventory notifications with product images
async function fetchInventoryNotifications() {
    try {
        const response = await fetch('/notifications/inventory', {
            method: 'GET', // Or POST if you prefer
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const inventoryNotifications = await response.json();
            // Handle the data, e.g., display notifications on the front-end
            console.log(inventoryNotifications);
        } else {
            console.error('Error fetching inventory notifications:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching inventory notifications:', error);
    }
}

// Fetch reports notifications with product images
async function fetchReportsNotifications() {
    try {
        const response = await fetch('/notifications/reports', {
            method: 'GET', // Or POST if you prefer
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const reportsNotifications = await response.json();
            // Handle the data, e.g., display notifications on the front-end
            console.log(reportsNotifications);
        } else {
            console.error('Error fetching reports notifications:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching reports notifications:', error);
    }
}

// Example calls to the functions
fetchInventoryNotifications();
fetchReportsNotifications();
