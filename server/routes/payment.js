const express = require('express');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Lazy-load Stripe (only errors if you try to use it without a key)
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith('sk_test_your')) {
    throw new Error('Stripe secret key not configured. Set STRIPE_SECRET_KEY in server/.env');
  }
  return require('stripe')(key);
}

// ─────────────────────────────────────────────────────────────────
// STRIPE ROUTES
// ─────────────────────────────────────────────────────────────────

// @route   POST /api/payment/create-checkout-session
// @desc    Create a Stripe Checkout Session for an existing order
// @access  Private (customer)
router.post('/create-checkout-session', protect, async (req, res) => {
  try {
    const stripe = getStripe();
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Ensure the order belongs to the requesting customer
    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (order.payment?.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Order is already paid' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Order ${order.orderNumber}`,
              description: order.items
                .slice(0, 3)
                .map(i => `${i.name} x${i.quantity}`)
                .join(', ') + (order.items.length > 3 ? '...' : ''),
              images: []
            },
            unit_amount: Math.round(order.total * 100) // Stripe uses cents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${clientUrl}/pay/success?orderId=${order._id}&token=${order.receiveToken}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/checkout?cancelled=true`,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        receiveToken: order.receiveToken
      },
      customer_email: req.user.email
    });

    // Record the Stripe session ID on the order
    order.payment.method = 'stripe';
    order.payment.transactionId = session.id;
    await order.save();

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment session'
    });
  }
});

// @route   POST /api/payment/webhook
// @desc    Stripe webhook — confirm payment completion
// @access  Public (Stripe only, verified by signature)
// NOTE: This route needs raw body — handled in server.js before express.json()
router.post('/webhook', async (req, res) => {
  let stripe;
  try {
    stripe = getStripe();
  } catch (_) {
    return res.status(200).json({ received: true }); // no-op if Stripe not configured
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret && !webhookSecret.startsWith('whsec_your')) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // Dev mode — parse body directly (skip signature verification)
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.warn('⚠️  Stripe webhook signature not verified (dev mode)');
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        const order = await Order.findById(orderId);
        if (order) {
          order.payment.status = 'completed';
          order.payment.transactionId = session.payment_intent || session.id;
          order.payment.paidAt = new Date();
          order.payment.amount = (session.amount_total || 0) / 100;
          if (order.status === 'pending') order.status = 'confirmed';
          await order.save();

          // Notify via socket
          const io = req.app?.get('io');
          if (io) {
            io.to('kitchen').emit('new-order', { order });
            io.emit(`order-${order._id}`, { event: 'payment-confirmed', order });
          }

          console.log(`✅ Stripe payment confirmed for order ${order.orderNumber}`);
        }
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          'payment.status': 'failed',
          status: 'cancelled'
        });
        console.log(`❌ Stripe session expired for order ${orderId}`);
      }
      break;
    }

    default:
      // Ignore other event types
      break;
  }

  res.json({ received: true });
});

// ─────────────────────────────────────────────────────────────────
// CASH / COD ROUTES (existing, kept)
// ─────────────────────────────────────────────────────────────────

// @route   POST /api/payment/cash
// @desc    Record cash payment (staff use)
// @access  Private/Staff
router.post('/cash', protect, async (req, res) => {
  try {
    const { orderId, amountReceived } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.payment = {
      method: 'cash_at_counter',
      status: 'completed',
      transactionId: `CASH-${Date.now()}`,
      paidAt: new Date(),
      amount: amountReceived || order.total
    };

    if (order.status === 'pending') {
      order.status = 'confirmed';
    }

    await order.save();

    res.json({
      success: true,
      message: 'Cash payment recorded',
      data: { order }
    });
  } catch (error) {
    console.error('Cash payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
});

// @route   POST /api/payment/refund
// @desc    Process refund (admin)
// @access  Private/Admin
router.post('/refund', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // If Stripe payment, attempt Stripe refund
    if (order.payment?.method === 'stripe' && order.payment?.transactionId) {
      try {
        const stripe = getStripe();
        await stripe.refunds.create({ payment_intent: order.payment.transactionId });
      } catch (stripeErr) {
        console.warn('Stripe refund failed:', stripeErr.message);
      }
    }

    order.payment.status = 'refunded';
    order.status = 'refunded';
    if (reason) order.timeline.push({ status: 'refunded', timestamp: new Date(), note: reason });
    await order.save();

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ success: false, message: 'Refund failed', error: error.message });
  }
});

// @route   GET /api/payment/order/:orderId
// @desc    Get payment status for order
// @access  Private
router.get('/order/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .select('orderNumber total payment receiveToken status');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        total: order.total,
        payment: order.payment,
        receiveToken: order.receiveToken,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/payment/history
// @desc    Get payment history
// @access  Private/Admin
router.get('/history', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate, method, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (method) query['payment.method'] = method;
    if (status) query['payment.status'] = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .select('orderNumber customer customerName total payment createdAt receiveToken')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        payments: orders.map(o => ({
          orderNumber: o.orderNumber,
          customer: o.customerName,
          amount: o.total,
          method: o.payment.method,
          status: o.payment.status,
          date: o.payment.paidAt || o.createdAt,
          token: o.receiveToken
        })),
        pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) }
      }
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/payment/stats/overview
// @desc    Payment statistics
// @access  Private/Admin
router.get('/stats/overview', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayRevenue, totalRevenue, methodBreakdown, pendingPayments] = await Promise.all([
      Order.aggregate([
        { $match: { 'payment.status': 'completed', createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { $match: { 'payment.status': 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { $match: { 'payment.status': 'completed' } },
        { $group: { _id: '$payment.method', count: { $sum: 1 }, total: { $sum: '$total' } } }
      ]),
      Order.countDocuments({ 'payment.status': 'pending' })
    ]);

    res.json({
      success: true,
      data: {
        todayRevenue: todayRevenue[0]?.total || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
        methodBreakdown,
        pendingPayments
      }
    });
  } catch (error) {
    console.error('Payment stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
