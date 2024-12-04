// Function to render the PayPal button based on the selected plan ID
function renderPaypalButton(planKey, planId) {
    if (paypal.Buttons !== undefined) {
        paypal.Buttons().close();  // Close any previously rendered PayPal button
    }

    paypal.Buttons({
        style: {
            shape: 'rect',
            color: 'gold',
            layout: 'vertical',
            label: 'subscribe'
        },
        createSubscription: function(data, actions) {
            return actions.subscription.create({
                plan_id: planId  // Use the selected plan ID
            });
        },
        onApprove: function(data, actions) {
            alert('Subscription successful! Subscription ID: ' + data.subscriptionID);
        }
    }).render('#paypal-button-container-' + planKey);  // Renders the PayPal button inside the specified container
}

// Initialize PayPal button for each plan dynamically
document.addEventListener('DOMContentLoaded', function () {
    <?php foreach ($pricingPlans as $planKey => $plan): ?>
        renderPaypalButton('<?= $planKey ?>', 'P-7E210255TM029860GM5HYC4A'); // Replace with actual plan ID for each plan
    <?php endforeach; ?>
});

// Handle modal payment details
$('.btn').on('click', function () {
    const currency = $(this).data('currency');
    const amount = $(this).data('amount');
    const paymentMethod = $(this).data('payment');
    const info = $(this).data('info');

    $('#payment-info').text(info);
    $('#payment-amount').text(amount);
    $('#payment-currency').text(currency);
    $('#hidden-amount').val(amount);
    $('#hidden-currency').val(currency);
});
