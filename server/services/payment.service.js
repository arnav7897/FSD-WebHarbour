const prisma = require('../config/db');
const { stripe, STRIPE_WEBHOOK_SECRET, STRIPE_CURRENCY } = require('../config/stripe');
const { FRONTEND_URL, PORT } = require('../config/env'); // usually FRONTEND_URL is needed for redirecting

const getAppHost = (req) => {
    return FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
};

const makeHttpError = (message, status) => {
    const err = new Error(message);
    err.status = status;
    return err;
};

// 1. Create Checkout Session for app purchase
const createAppCheckoutSession = async ({ userId, appId, userEmail, req }) => {
    const app = await prisma.app.findUnique({
        where: { id: appId },
        include: { developer: true },
    });

    if (!app) throw makeHttpError('App not found', 404);
    if (app.isFree) throw makeHttpError('This app is free', 400);
    if (!app.price || app.price <= 0) throw makeHttpError('App pricing is invalid', 400);

    const developer = app.developer;
    if (!developer || !developer.stripeAccountId) {
        throw makeHttpError('The developer of this app cannot accept payments currently', 400);
    }

    // Calculate platform fee (e.g., 20% platform commission)
    const applicationFeeAmount = Math.floor(app.price * 100 * 0.20);

    // Create pending transaction record
    const transaction = await prisma.transaction.create({
        data: {
            type: 'purchase',
            amount: app.price,
            userId,
            appId,
            currency: STRIPE_CURRENCY,
            status: 'pending',
            paymentMethod: 'stripe',
            description: `Purchase of ${app.name}`,
        },
    });

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: STRIPE_CURRENCY,
                    product_data: {
                        name: app.name,
                        description: app.shortDescription || app.description,
                        images: app.iconUrl ? [app.iconUrl] : [],
                    },
                    unit_amount: Math.round(app.price * 100), // convert to smallest currency unit (e.g. cents)
                },
                quantity: 1,
            },
        ],
        customer_email: userEmail,
        client_reference_id: transaction.id.toString(),
        metadata: {
            transactionId: transaction.id.toString(),
            appId: app.id.toString(),
            userId: userId.toString(),
        },
        payment_intent_data: {
            application_fee_amount: applicationFeeAmount,
            transfer_data: {
                destination: developer.stripeAccountId,
            },
        },
        mode: 'payment',
        success_url: `${getAppHost(req)}/pages/apps/detail.html?id=${appId}&success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getAppHost(req)}/pages/apps/detail.html?id=${appId}&canceled=true`,
    });

    // Save the Stripe session ID in transaction metadata
    await prisma.transaction.update({
        where: { id: transaction.id },
        data: { metadata: { stripeSessionId: session.id } },
    });

    return { url: session.url };
};

// 2. Stripe Connect Onboarding
const createStripeConnectAccount = async ({ developerId, userEmail, req }) => {
    const profile = await prisma.developerProfile.findUnique({
        where: { userId: developerId },
    });

    if (!profile) throw makeHttpError('Developer profile not found', 404);

    let stripeAccountId = profile.stripeAccountId;

    // Create connected account if it doesn't exist
    if (!stripeAccountId) {
        const account = await stripe.accounts.create({
            type: 'express',
            email: userEmail,
            capabilities: {
                transfers: { requested: true },
            },
        });
        stripeAccountId = account.id;

        await prisma.developerProfile.update({
            where: { userId: developerId },
            data: { stripeAccountId },
        });
    }

    // Create account link for onboarding UI
    const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${getAppHost(req)}/pages/developer/dashboard.html?stripe_refresh=true`,
        return_url: `${getAppHost(req)}/pages/developer/dashboard.html?stripe_return=true`,
        type: 'account_onboarding',
    });

    return { url: accountLink.url };
};

// 3. Handle Stripe Webhook Events
const processWebhook = async (payload, signature) => {
    let event;

    try {
        event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        throw makeHttpError(`Webhook Error: ${err.message}`, 400);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const transactionId = session.metadata.transactionId;

            if (!transactionId) {
                console.warn('Checkout session completed without transaction metadata');
                break;
            }

            await prisma.transaction.update({
                where: { id: parseInt(transactionId, 10) },
                data: {
                    status: 'completed',
                    paymentId: session.payment_intent, // Save the actual payment intent ID
                    completedAt: new Date(),
                },
            });

            // Optionally, grant access to the user here (e.g. record in a "Purchases" or "Library" table)
            console.log(`Transaction ${transactionId} completed for ${session.metadata.appId}.`);
            break;
        }

        // Optional: Handle developer connect account updates
        case 'account.updated': {
            const account = event.data.object;
            const chargesEnabled = account.charges_enabled;
            const status = chargesEnabled ? 'active' : 'restricted';

            await prisma.developerProfile.updateMany({
                where: { stripeAccountId: account.id },
                data: { stripeAccountStatus: status },
            });
            console.log(`Stripe Account ${account.id} status updated to ${status}.`);
            break;
        }

        // Handle failed payments
        case 'checkout.session.async_payment_failed': {
            const session = event.data.object;
            const transactionId = session.metadata?.transactionId;
            if (transactionId) {
                await prisma.transaction.update({
                    where: { id: parseInt(transactionId, 10) },
                    data: { status: 'failed' },
                });
            }
            break;
        }

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
};

module.exports = {
    createAppCheckoutSession,
    createStripeConnectAccount,
    processWebhook,
};
