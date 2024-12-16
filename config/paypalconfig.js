const express = require('express');
const paypal = require('@paypal/checkout-server-sdk');
require('dotenv').config();

const router = express.Router();

// PayPal environment setup
const environment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID, 
    process.env.PAYPAL_CLIENT_SECRET
);
const client = new paypal.core.PayPalHttpClient(environment);

// Create an order
router.post('/create-order', async (req, res) => {
    const { amount, currency } = req.body; // Ensure amount and currency are provided in the request
    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [
            {
                amount: {
                    currency_code: currency || 'USD',
                    value: amount,
                },
            },
        ],
    });

    try {
        const order = await client.execute(request);
        res.json({
            id: order.result.id, // Send back the order ID
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong with PayPal.');
    }
});

// Capture an order
router.post('/capture-order', async (req, res) => {
    const { orderId } = req.body; // Order ID from the client-side PayPal button
    const request = new paypal.orders.OrdersCaptureRequest(orderId);

    try {
        const capture = await client.execute(request);
        res.json({
            status: capture.result.status,
            details: capture.result,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Unable to capture PayPal order.');
    }
});

module.exports = router;
