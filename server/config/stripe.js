const Stripe = require('stripe');
const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_CURRENCY } = require('./env');

if (!STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set. Stripe payments will be unavailable.');
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Always good to use a pinned API version compatible with your types
});

module.exports = {
  stripe,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_CURRENCY,
};
