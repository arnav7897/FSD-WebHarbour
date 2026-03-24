const {
    createAppCheckoutSession,
    createStripeConnectAccount,
    processWebhook,
} = require('../services/payment.service');

const checkoutAppHandler = async (req, res, next) => {
    try {
        const appId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        const userEmail = req.user.email;

        const result = await createAppCheckoutSession({ userId, appId, userEmail, req });
        res.status(200).json({ success: true, url: result.url });
    } catch (err) {
        next(err);
    }
};

const connectDeveloperHandler = async (req, res, next) => {
    try {
        const developerId = req.user.id;
        const userEmail = req.user.email;

        const result = await createStripeConnectAccount({ developerId, userEmail, req });
        res.status(200).json({ success: true, url: result.url });
    } catch (err) {
        next(err);
    }
};

const webhookHandler = async (req, res) => {
    try {
        // req.body represents the raw binary buffer (because of express.raw())
        const signature = req.headers['stripe-signature'];

        // Process the webhook in the service
        await processWebhook(req.body, signature);

        // Return a 200 res to acknowledge receipt
        res.status(200).send('Webhook Received');
    } catch (err) {
        console.error('Webhook Error:', err);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
};

module.exports = {
    checkoutAppHandler,
    connectDeveloperHandler,
    webhookHandler,
};
