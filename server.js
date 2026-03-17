/**
 * ============================================================
 * VIDHILIKHIT AI PRO — Main Server
 * Production-Grade WhatsApp Legal Assistant
 * Powered by Claude AI (Anthropic)
 * ============================================================
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { validateEnv } = require('./config/validate');
const { testConnection } = require('./config/database');
const { syncDatabase, initModels } = require('./models');
const translations = require('./i18n/translations');
const whatsappService = require('./services/whatsappService');
const aiService = require('./services/aiService');
const conversationManager = require('./services/conversationManager');
const paymentService = require('./services/paymentService');
const reminderWorker = require('./workers/reminderWorker');
const logger = require('./utils/logger');

// ========== VALIDATE ENVIRONMENT ==========
validateEnv();

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

// ========== MIDDLEWARE ==========
app.use(helmet());
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; },
  limit: '5mb'
}));

// Rate limiting — protect webhook from abuse
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many requests'
});

// Deduplicate messages — WhatsApp sometimes sends duplicates
const processedMessages = new Map();
const DEDUP_TTL = 60000; // 60 seconds

function isDuplicate(messageId) {
  if (processedMessages.has(messageId)) return true;
  processedMessages.set(messageId, Date.now());
  // Cleanup old entries every 100 messages
  if (processedMessages.size > 500) {
    const cutoff = Date.now() - DEDUP_TTL;
    for (const [id, ts] of processedMessages) {
      if (ts < cutoff) processedMessages.delete(id);
    }
  }
  return false;
}

// ============================================================
// WEBHOOK — WhatsApp Cloud API
// ============================================================

// GET — Webhook verification (Meta sends this to verify your endpoint)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    logger.info('✅ Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn('❌ Webhook verification failed');
  res.sendStatus(403);
});

// POST — Handle incoming messages
app.post('/webhook', webhookLimiter, async (req, res) => {
  // ALWAYS respond 200 immediately — WhatsApp retries on failure
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Handle status updates (delivered, read, etc.)
    if (value?.statuses) {
      logger.debug('Status update:', value.statuses[0]?.status);
      return;
    }

    const messages = value?.messages;
    if (!messages || messages.length === 0) return;

    const message = messages[0];
    const from = message.from;
    const messageId = message.id;

    // Deduplicate
    if (isDuplicate(messageId)) {
      logger.debug(`Duplicate message ignored: ${messageId}`);
      return;
    }

    // Mark as read (non-blocking)
    whatsappService.markAsRead(messageId).catch(() => {});

    // Get or create user
    const contactName = value?.contacts?.[0]?.profile?.name || 'Unknown';
    const { user, isNew } = await conversationManager.getOrCreateUser(from, contactName);

    // Block check
    if (user.isBlocked) {
      await whatsappService.sendTextMessage(from, translations[user.language].blocked);
      return;
    }

    // Send welcome to new users
    if (isNew) {
      await whatsappService.sendTextMessage(from, translations[user.language].welcome);
      return;
    }

    // Route by message type
    switch (message.type) {
      case 'text':
        await handleTextMessage(from, message.text.body.trim(), user);
        break;

      case 'audio':
      case 'voice':
        await handleVoiceMessage(from, message, user);
        break;

      case 'interactive':
        await handleInteractiveMessage(from, message, user);
        break;

      default:
        await whatsappService.sendTextMessage(
          from,
          translations[user.language].helpText
        );
    }

  } catch (error) {
    logger.error('Webhook processing error:', error);
  }
});

// ============================================================
// MESSAGE HANDLERS
// ============================================================

async function handleTextMessage(from, text, user) {
  const lang = user.language || 'en';

  // Handle commands
  if (text.startsWith('/')) {
    await handleCommand(from, text, user);
    return;
  }

  // Check daily limit
  const quota = await conversationManager.canQuery(user);
  if (!quota.allowed) {
    await whatsappService.sendTextMessage(from, translations[lang].limitReached);
    return;
  }

  // Get conversation context for follow-ups
  const context = await conversationManager.getConversationContext(user.id);

  // Save user message to context
  await conversationManager.saveToContext(user.id, 'user', text);

  // Get AI response
  const result = await aiService.answerLegalQuery(text, lang, context);

  // Send response
  await whatsappService.sendTextMessage(from, result.text);

  // Save assistant response to context
  await conversationManager.saveToContext(user.id, 'assistant', result.text);

  // Record query
  await conversationManager.recordQuery(
    user.id,
    text,
    result.text,
    result.category,
    lang,
    false,
    result.responseTimeMs,
    result.tokensUsed
  );
}

async function handleVoiceMessage(from, message, user) {
  const lang = user.language || 'en';

  // Voice requires premium (or basic with voice)
  if (!user.isPremium) {
    await whatsappService.sendTextMessage(from, translations[lang].voiceNotSupported);
    return;
  }

  try {
    await whatsappService.sendTextMessage(from, translations[lang].voiceProcessing);

    const mediaId = message.audio?.id || message.voice?.id;
    if (!mediaId) {
      await whatsappService.sendTextMessage(from, translations[lang].voiceError);
      return;
    }

    // Download and transcribe
    const media = await whatsappService.downloadMedia(mediaId);
    const transcription = await aiService.transcribeAudio(media.data, media.mimeType);

    if (transcription) {
      // Process transcribed text as a normal query
      await whatsappService.sendTextMessage(from, `🎤 _"${transcription}"_\n`);
      await handleTextMessage(from, transcription, user);
    } else {
      await whatsappService.sendTextMessage(from, translations[lang].voiceError);
    }
  } catch (error) {
    logger.error('Voice message error:', error);
    await whatsappService.sendTextMessage(from, translations[lang].voiceError);
  }
}

async function handleInteractiveMessage(from, message, user) {
  try {
    const interactive = message.interactive;

    if (interactive.type === 'button_reply') {
      const buttonId = interactive.button_reply.id;

      if (buttonId.startsWith('lang_')) {
        const newLang = buttonId.replace('lang_', '');
        if (['en', 'hi', 'mr'].includes(newLang)) {
          await conversationManager.setLanguage(user.id, newLang);
          await whatsappService.sendTextMessage(from, translations[newLang].languageChanged);
        }
      } else if (buttonId.startsWith('sub_')) {
        const plan = buttonId.replace('sub_', '');
        await initiatePayment(from, user, plan);
      }
    } else if (interactive.type === 'list_reply') {
      const listId = interactive.list_reply.id;
      // Treat list selection as a text query
      await handleTextMessage(from, listId, user);
    }
  } catch (error) {
    logger.error('Interactive message error:', error);
  }
}

// ============================================================
// COMMAND HANDLERS
// ============================================================

async function handleCommand(from, text, user) {
  const lang = user.language || 'en';
  const parts = text.toLowerCase().trim().split(/\s+/);
  const command = parts[0];

  switch (command) {
    case '/start':
    case '/help':
      await whatsappService.sendTextMessage(from, translations[lang].welcome);
      break;

    case '/language':
      await whatsappService.sendButtonMessage(
        from,
        translations[lang].chooseLanguage,
        [
          { id: 'lang_en', title: 'English 🇬🇧' },
          { id: 'lang_hi', title: 'हिंदी 🇮🇳' },
          { id: 'lang_mr', title: 'मराठी 🇮🇳' }
        ]
      );
      break;

    case '/en':
      await conversationManager.setLanguage(user.id, 'en');
      await whatsappService.sendTextMessage(from, translations.en.languageChanged);
      break;
    case '/hi':
      await conversationManager.setLanguage(user.id, 'hi');
      await whatsappService.sendTextMessage(from, translations.hi.languageChanged);
      break;
    case '/mr':
      await conversationManager.setLanguage(user.id, 'mr');
      await whatsappService.sendTextMessage(from, translations.mr.languageChanged);
      break;

    case '/history':
      await showHistory(from, user);
      break;

    case '/premium':
      await whatsappService.sendTextMessage(from, translations[lang].premiumPlans);
      break;

    case '/subscribe':
      if (parts[1] && ['basic', 'premium'].includes(parts[1])) {
        await initiatePayment(from, user, parts[1]);
      } else {
        await whatsappService.sendTextMessage(from, translations[lang].premiumPlans);
      }
      break;

    case '/status':
      await showStatus(from, user);
      break;

    case '/admin':
      if (parts.includes(process.env.ADMIN_KEY)) {
        await showAdminStats(from);
      }
      break;

    default:
      await whatsappService.sendTextMessage(from, translations[lang].unknownCommand);
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function showHistory(from, user) {
  const lang = user.language || 'en';
  const history = await conversationManager.getHistory(user.id, 5);

  if (!history || history.length === 0) {
    await whatsappService.sendTextMessage(from, translations[lang].noHistory);
    return;
  }

  let msg = translations[lang].historyHeader;
  history.forEach((item, idx) => {
    const date = new Date(item.createdAt).toLocaleDateString('en-IN');
    const cat = item.category ? ` [${item.category}]` : '';
    msg += `${idx + 1}. *${item.query.substring(0, 60)}*${cat}\n   📅 ${date}\n\n`;
  });

  await whatsappService.sendTextMessage(from, msg);
}

async function showStatus(from, user) {
  const lang = user.language || 'en';
  const t = translations[lang];

  if (user.isPremium) {
    const expiry = user.premiumExpiry
      ? new Date(user.premiumExpiry).toLocaleDateString('en-IN')
      : 'N/A';
    const msg = (t.statusPremium || translations.en.statusPremium)
      .replace('{plan}', user.subscriptionPlan || 'Premium')
      .replace('{expiry}', expiry)
      .replace('{used}', user.dailyQueryCount || 0)
      .replace('{total}', user.queryCount || 0);
    await whatsappService.sendTextMessage(from, msg);
  } else {
    const msg = (t.statusFree || translations.en.statusFree)
      .replace('{used}', user.dailyQueryCount || 0)
      .replace('{limit}', '5')
      .replace('{total}', user.queryCount || 0);
    await whatsappService.sendTextMessage(from, msg);
  }
}

async function initiatePayment(from, user, planName) {
  const lang = user.language || 'en';

  if (!paymentService.isConfigured()) {
    await whatsappService.sendTextMessage(from, translations[lang].paymentNotConfigured);
    return;
  }

  try {
    const order = await paymentService.createOrder(planName, user.id);
    const paymentLink = `${process.env.BASE_URL}/pay/${order.orderId}`;

    const msg = (translations[lang].paymentInitiated || translations.en.paymentInitiated)
      .replace('{plan}', order.planName)
      .replace('{amount}', order.amount)
      .replace('{link}', paymentLink);

    await whatsappService.sendTextMessage(from, msg);
  } catch (error) {
    logger.error('Payment initiation error:', error);
    await whatsappService.sendTextMessage(from, translations[lang].paymentNotConfigured);
  }
}

async function showAdminStats(from) {
  const stats = await conversationManager.getStats();
  const msg = translations.en.adminStats
    .replace('{totalUsers}', stats.totalUsers)
    .replace('{premiumUsers}', stats.premiumUsers)
    .replace('{totalQueries}', stats.totalQueries)
    .replace('{todayQueries}', stats.todayQueries)
    .replace('{date}', new Date().toLocaleDateString('en-IN'));

  await whatsappService.sendTextMessage(from, msg);
}

// ============================================================
// PAYMENT WEBHOOK
// ============================================================

app.post('/payment/razorpay-webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature || !paymentService.verifyWebhookSignature(req.rawBody, signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const result = await paymentService.handlePaymentCaptured(payment.order_id, payment.id);

      if (result) {
        const lang = result.user.language || 'en';
        const msg = (translations[lang].paymentSuccess || translations.en.paymentSuccess)
          .replace('{plan}', result.plan)
          .replace('{expiry}', result.expiry.toLocaleDateString('en-IN'));
        await whatsappService.sendTextMessage(result.user.phoneNumber, msg);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error('Razorpay webhook error:', error);
    res.sendStatus(500);
  }
});

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + 's'
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Vidhilikhit AI Pro',
    version: '3.0.0',
    description: 'WhatsApp Legal Assistant powered by Claude AI',
    status: 'running',
    features: [
      'AI answers any Indian legal query',
      'BNS/BNSS/BSA 2024 new law awareness',
      'Multilingual: English, Hindi, Marathi',
      'Conversation context & follow-ups',
      'Voice message support (Premium)',
      'Razorpay payment integration'
    ]
  });
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  logger.error('Unhandled Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================
// START SERVER
// ============================================================

async function startServer() {
  try {
    logger.info('🚀 Starting Vidhilikhit AI Pro v3.0.0...');

    // Database
    const dbOk = await testConnection();
    if (!dbOk) {
      logger.error('Database connection failed — exiting');
      process.exit(1);
    }

    await syncDatabase();

    // Start cron workers
    reminderWorker.start();

    // Start Express
    app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`📱 Webhook: ${process.env.BASE_URL || 'http://localhost:' + PORT}/webhook`);
      logger.info(`🏥 Health:  ${process.env.BASE_URL || 'http://localhost:' + PORT}/health`);
      logger.info('');
      logger.info('🔧 Checklist:');
      logger.info(`   AI:        ${aiService.isConfigured() ? '✅ ' + aiService.provider : '❌ not configured'}`);
      logger.info(`   Razorpay:  ${paymentService.isConfigured() ? '✅ configured' : '⚠️  not configured (payments disabled)'}`);
      logger.info(`   Database:  ✅ connected`);
      logger.info('');
    });

  } catch (error) {
    logger.error('Startup failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM — shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT — shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', reason);
});

startServer();
