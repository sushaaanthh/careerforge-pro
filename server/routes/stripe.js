const express = require('express');
const Stripe = require('stripe');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Helper to verify JWT
const verifyToken = (req) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) throw new Error('No token');
  const token = auth.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded.userId;
};

// Create checkout session (protected)
router.post('/create-checkout-session', async (req, res) => {
  try {
    const userId = verifyToken(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/upgrade-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/upgrade-cancel`,
      metadata: { userId }
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Webhook handler (already registered as raw)
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        plan: 'pro',
        stripeCustomerId: session.customer
      });
      console.log(`✅ User ${userId} upgraded to PRO`);
    }
  }

  res.json({ received: true });
});

module.exports = router;