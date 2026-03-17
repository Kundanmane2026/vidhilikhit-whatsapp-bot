/**
 * Payment Service — Razorpay Integration
 * Handles order creation, verification, and webhook processing.
 */

const crypto = require('crypto');
const { initModels } = require('../models');
const logger = require('../utils/logger');

let razorpay = null;

// Lazy init — only create if credentials exist
function getRazorpay() {
  if (razorpay) return razorpay;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  const Razorpay = require('razorpay');
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  return razorpay;
}

const PLANS = {
  basic: { amount: 99, name: 'Basic', queriesPerDay: 50 },
  premium: { amount: 299, name: 'Premium', queriesPerDay: Infinity }
};

class PaymentService {
  isConfigured() {
    return !!getRazorpay();
  }

  getPlanDetails(planName) {
    return PLANS[planName] || null;
  }

  async createOrder(planName, userId) {
    const rz = getRazorpay();
    if (!rz) throw new Error('Payment system not configured');

    const plan = PLANS[planName];
    if (!plan) throw new Error(`Invalid plan: ${planName}`);

    const { Payment } = initModels();

    const order = await rz.orders.create({
      amount: plan.amount * 100, // Razorpay uses paise
      currency: 'INR',
      receipt: `vl_${Date.now()}_${userId.substring(0, 8)}`,
      notes: { plan: planName, userId, app: 'vidhilikhit' }
    });

    await Payment.create({
      userId,
      amount: plan.amount,
      currency: 'INR',
      provider: 'razorpay',
      providerOrderId: order.id,
      status: 'pending',
      plan: planName
    });

    logger.info(`Razorpay order created: ${order.id} for plan ${planName}`);

    return {
      orderId: order.id,
      amount: plan.amount,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      planName: plan.name
    };
  }

  verifyWebhookSignature(rawBody, signature) {
    if (!process.env.RAZORPAY_KEY_SECRET) return false;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  }

  async handlePaymentCaptured(orderId, paymentId) {
    const { Payment, User } = initModels();

    const payment = await Payment.findOne({ where: { providerOrderId: orderId } });
    if (!payment) {
      logger.warn(`Payment not found for order: ${orderId}`);
      return null;
    }

    // Update payment record
    await payment.update({
      status: 'completed',
      providerPaymentId: paymentId
    });

    // Activate subscription
    const user = await User.findByPk(payment.userId);
    if (!user) {
      logger.warn(`User not found for payment: ${payment.userId}`);
      return null;
    }

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    await user.update({
      isPremium: true,
      subscriptionPlan: payment.plan,
      premiumExpiry: expiryDate
    });

    logger.info(`Subscription activated: ${user.phoneNumber} → ${payment.plan} (expires ${expiryDate.toISOString()})`);

    return {
      user: user.toJSON(),
      plan: payment.plan,
      expiry: expiryDate
    };
  }
}

module.exports = new PaymentService();
