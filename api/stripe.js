/**
 * Stripe API Integration
 * Handles payment processing and subscription management
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db-config');
const { authenticateToken: requireAuth } = require('./auth');
const { ApiResponse } = require('../utils/api-response');

// Initialize Stripe with the secret key from environment variables
let stripe;
try {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('WARNING: Stripe secret key is not set in environment variables');
  }
} catch (err) {
  console.error('Failed to initialize Stripe:', err);
}

/**
 * Create a payment intent for one-time payments
 *
 * POST /api/stripe/create-payment-intent
 */
router.post('/create-payment-intent', requireAuth, async (req, res) => {
  try {
    const { amount, currency = 'usd', description, metadata = {} } = req.body;

    if (!amount || amount <= 0) {
      return ApiResponse.badRequest(res, 'Valid amount is required');
    }

    // Ensure we have Stripe initialized
    if (!stripe) {
      return ApiResponse.serverError(res, 'Payment processing is not available');
    }

    // Add user info to metadata
    const userMetadata = {
      user_id: req.user.user_id,
      email: req.user.email,
      ...metadata
    };

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description,
      metadata: userMetadata,
      receipt_email: req.user.email,
      // Enable automatic payment methods suitable for the user's location
      automatic_payment_methods: {
        enabled: true
      }
    });

    return res.json({
      success: true,
      clientSecret: paymentIntent.client_secret
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return ApiResponse.serverError(res, 'Failed to process payment request');
  }
});

/**
 * Create a checkout session for subscriptions
 *
 * POST /api/stripe/create-subscription
 */
router.post('/create-subscription', requireAuth, async (req, res) => {
  try {
    const { 
      priceId, 
      successUrl = `${req.protocol}://${req.get('host')}/payment-success`,
      cancelUrl = `${req.protocol}://${req.get('host')}/payment-cancel`
    } = req.body;

    if (!priceId) {
      return ApiResponse.badRequest(res, 'Price ID is required');
    }

    // Ensure we have Stripe initialized
    if (!stripe) {
      return ApiResponse.serverError(res, 'Payment processing is not available');
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      customer_email: req.user.email,
      client_reference_id: req.user.user_id.toString(),
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        user_id: req.user.user_id
      }
    });

    return res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Error creating subscription session:', error);
    return ApiResponse.serverError(res, 'Failed to process subscription request');
  }
});

/**
 * Webhook endpoint for Stripe events
 *
 * POST /api/stripe/webhook
 */
const handleWebhook = async (req, res) => {
  try {
    // Ensure we have Stripe initialized
    if (!stripe) {
      return res.status(500).send('Stripe is not initialized');
    }

    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('WARNING: Stripe webhook secret is not set in environment variables');
      return res.status(500).send('Webhook secret not configured');
    }

    if (!signature) {
      return res.status(400).send('Webhook signature missing');
    }

    // Verify webhook signature and extract the event
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    }

    // Handle the event based on its type
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionUpdate(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).send('Failed to process webhook');
  }
};

router.post('/webhook', handleWebhook);

/**
 * Handle successful payments
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    console.log('Payment intent succeeded:', paymentIntent.id);
    
    // Extract metadata
    const { user_id, payment_type, related_id } = paymentIntent.metadata;
    
    if (!user_id || !payment_type) {
      console.warn('Missing metadata in payment intent:', paymentIntent.id);
      return;
    }
    
    // Record the payment in our database
    const now = new Date().toISOString();
    
    await db.query(
      `INSERT INTO payments 
       (user_id, amount, payment_date, payment_method, payment_reference, payment_type, related_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        paymentIntent.amount / 100, // Convert from cents
        now,
        'Credit Card', // Or could extract from paymentIntent.charges.data[0].payment_method_details
        paymentIntent.id,
        payment_type,
        related_id || null,
        now,
        now
      ]
    );
    
    // Update the status based on payment type
    switch (payment_type) {
      case 'workshop':
        if (related_id) {
          await db.query(
            `UPDATE workshop_registrations SET payment_status = 'Paid', updated_at = ? WHERE registration_id = ?`,
            [now, related_id]
          );
        }
        break;
        
      case 'retreat':
        if (related_id) {
          await db.query(
            `UPDATE retreat_registrations SET payment_status = 'Full Payment', updated_at = ? WHERE registration_id = ?`,
            [now, related_id]
          );
        }
        break;
        
      case 'private_session':
        if (related_id) {
          await db.query(
            `UPDATE private_sessions SET payment_status = 'Paid', updated_at = ? WHERE session_id = ?`,
            [now, related_id]
          );
        }
        break;
    }
    
  } catch (error) {
    console.error('Error handling payment intent success:', error);
    throw error;
  }
}

/**
 * Handle completed checkout sessions
 */
async function handleCheckoutSessionCompleted(session) {
  try {
    console.log('Checkout session completed:', session.id);
    
    // For subscription checkouts, we'll create a membership record
    if (session.mode === 'subscription') {
      const { user_id } = session.metadata;
      const userId = user_id || session.client_reference_id;
      
      if (!userId) {
        console.warn('Missing user ID in checkout session:', session.id);
        return;
      }
      
      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const now = new Date();
      
      // Calculate end date based on subscription billing cycle
      let endDate = new Date();
      if (subscription.items.data[0].plan.interval === 'month') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (subscription.items.data[0].plan.interval === 'year') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      
      // Store the new membership in the database
      const membershipType = subscription.items.data[0].plan.nickname || 
                             (subscription.items.data[0].plan.interval === 'month' ? 'Monthly Unlimited' : 'Annual Unlimited');
      
      await db.query(
        `INSERT INTO memberships 
         (user_id, membership_type, start_date, end_date, auto_renew, status, price, payment_method, payment_reference, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          membershipType,
          now.toISOString(),
          endDate.toISOString(),
          true, // Auto renew is on for subscriptions
          'Active',
          subscription.items.data[0].plan.amount / 100, // Convert from cents
          'Credit Card',
          subscription.id,
          now.toISOString(),
          now.toISOString()
        ]
      );
      
      // Also record the payment
      await db.query(
        `INSERT INTO payments 
         (user_id, amount, payment_date, payment_method, payment_reference, payment_type, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          session.amount_total / 100, // Convert from cents
          now.toISOString(),
          'Credit Card',
          session.id,
          'membership',
          now.toISOString(),
          now.toISOString()
        ]
      );
    }
    
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

/**
 * Handle paid invoices (for subscriptions)
 */
async function handleInvoicePaid(invoice) {
  try {
    console.log('Invoice paid:', invoice.id);
    
    // Only process subscription invoices
    if (!invoice.subscription) return;
    
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const { user_id } = subscription.metadata;
    
    if (!user_id) {
      console.warn('Missing user ID in subscription:', subscription.id);
      return;
    }
    
    // Record the payment
    const now = new Date().toISOString();
    await db.query(
      `INSERT INTO payments 
       (user_id, amount, payment_date, payment_method, payment_reference, payment_type, related_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        invoice.amount_paid / 100, // Convert from cents
        now,
        'Credit Card',
        invoice.id,
        'membership',
        subscription.id,
        now,
        now
      ]
    );
    
    // Update membership end date
    let endDate = new Date();
    if (subscription.items.data[0].plan.interval === 'month') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (subscription.items.data[0].plan.interval === 'year') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    
    // Find and update the existing membership
    await db.query(
      `UPDATE memberships SET 
       end_date = ?, 
       status = 'Active', 
       updated_at = ? 
       WHERE payment_reference = ? AND user_id = ?`,
      [
        endDate.toISOString(),
        now,
        subscription.id,
        user_id
      ]
    );
    
  } catch (error) {
    console.error('Error handling invoice paid:', error);
    throw error;
  }
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(subscription) {
  try {
    console.log('Subscription updated:', subscription.id);
    
    const { user_id } = subscription.metadata;
    
    if (!user_id) {
      console.warn('Missing user ID in subscription:', subscription.id);
      return;
    }
    
    const now = new Date().toISOString();
    let status = 'Active';
    
    // Check subscription status
    if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      status = 'Cancelled';
    } else if (subscription.status === 'past_due') {
      status = 'Past Due';
    }
    
    // Update the membership status
    await db.query(
      `UPDATE memberships SET 
       status = ?, 
       updated_at = ? 
       WHERE payment_reference = ? AND user_id = ?`,
      [
        status,
        now,
        subscription.id,
        user_id
      ]
    );
    
  } catch (error) {
    console.error('Error handling subscription update:', error);
    throw error;
  }
}

/**
 * Get public Stripe key for client
 * 
 * GET /api/stripe/config
 */
router.get('/config', async (req, res) => {
  return res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
  });
});

/**
 * Create a new product and price in Stripe
 * Admin only endpoint
 * 
 * POST /api/stripe/create-product
 */
router.post('/create-product', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    const { 
      name, 
      description, 
      amount, 
      currency = 'usd', 
      interval = null, // null for one-time, 'month' or 'year' for subscriptions
      intervalCount = 1
    } = req.body;
    
    if (!name || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Name and amount are required'
      });
    }
    
    // Ensure we have Stripe initialized
    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: 'Payment processing is not available'
      });
    }
    
    // Create a product
    const product = await stripe.products.create({
      name,
      description
    });
    
    // Create a price (one-time or recurring)
    const priceData = {
      product: product.id,
      currency,
      unit_amount: Math.round(amount * 100), // Convert to cents
      nickname: name
    };
    
    // Add subscription details if interval is provided
    if (interval) {
      priceData.recurring = {
        interval,
        interval_count: intervalCount
      };
    }
    
    const price = await stripe.prices.create(priceData);
    
    return res.json({
      success: true,
      product: product.id,
      price: price.id
    });
    
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Export the router and webhook handler for direct access by server.js
router.handle = handleWebhook;
module.exports = router;
