# ⚖️ Vidhilikhit AI Pro v3.0.0

**India's most advanced WhatsApp Legal Assistant — powered by Claude AI (Anthropic)**

## What it does

Users message your WhatsApp number with any legal question in English, Hindi, or Marathi. The bot answers instantly using Claude AI with deep expertise in Indian law, including the new BNS/BNSS/BSA criminal laws effective from July 2024.

## Features

- 🧠 **AI-powered legal answers** — answers ANY Indian legal question, not just pre-programmed sections
- ⚖️ **BNS/BNSS/BSA aware** — references both old (IPC/CrPC) and new criminal law provisions
- 🗣️ **Multilingual** — English, Hindi, Marathi
- 💬 **Conversation context** — supports follow-up questions
- 🎤 **Voice messages** — speech-to-text for premium users
- 💳 **Razorpay payments** — subscription management
- 📊 **Analytics** — query tracking, user stats, admin dashboard
- 🔄 **Auto-scaling** — PostgreSQL for production, SQLite for development

## Quick Setup (Render)

### 1. Prerequisites
- [Meta Developer Account](https://developers.facebook.com) with WhatsApp Business API
- [Anthropic API Key](https://console.anthropic.com)
- [Render Account](https://render.com)
- [Razorpay Account](https://dashboard.razorpay.com) (optional, for payments)

### 2. Deploy to Render

**Option A: Blueprint (recommended)**
1. Push this code to a GitHub repo
2. In Render, click "New" → "Blueprint"
3. Connect your repo — Render reads `render.yaml` and sets up everything

**Option B: Manual**
1. Create a new Web Service on Render
2. Connect your GitHub repo
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Add a PostgreSQL database (free tier)

### 3. Set Environment Variables

In Render Dashboard → your service → Environment:

| Variable | Where to get it |
|---|---|
| `WHATSAPP_TOKEN` | Meta Developer Portal → Your App → WhatsApp → API Setup |
| `PHONE_NUMBER_ID` | Same as above |
| `VERIFY_TOKEN` | Choose any string (e.g., `vidhilikhit_verify_2024`) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `DATABASE_URL` | Auto-set if using Render PostgreSQL |
| `BASE_URL` | Your Render URL (e.g., `https://vidhilikhit-ai-pro.onrender.com`) |

### 4. Configure WhatsApp Webhook

In Meta Developer Portal:
1. Go to your App → WhatsApp → Configuration
2. **Callback URL**: `https://your-app.onrender.com/webhook`
3. **Verify Token**: Same as your `VERIFY_TOKEN` env var
4. Subscribe to: `messages`, `message_deliveries`, `message_reads`

### 5. Test it!

Send "What is Section 302?" to your WhatsApp Business number.

## Architecture

```
WhatsApp User
     ↓
Meta Cloud API (v21.0)
     ↓
Express.js Webhook Handler
     ↓
Conversation Manager (context, limits, routing)
     ↓
Claude AI Legal Engine (Anthropic API)
     ↓
Response → WhatsApp User
     ↓
PostgreSQL/SQLite (history, users, payments)
```

## Project Structure

```
├── server.js                 # Main Express server & webhook
├── config/
│   ├── database.js           # PostgreSQL/SQLite flexible config
│   └── validate.js           # Environment validation
├── models/
│   └── index.js              # Sequelize models (User, Query, Payment, Conversation)
├── services/
│   ├── claudeAIService.js    # Claude AI legal engine
│   ├── whatsappService.js    # WhatsApp Cloud API v21.0
│   ├── conversationManager.js # Session & context management
│   └── paymentService.js     # Razorpay integration
├── i18n/
│   └── translations.js       # English, Hindi, Marathi
├── workers/
│   └── reminderWorker.js     # Cron jobs
├── utils/
│   └── logger.js             # Winston logging
├── render.yaml               # Render Blueprint
├── .env.example              # Environment template
└── package.json
```

## Commands

| Command | Description |
|---|---|
| `/help` | Show help & usage |
| `/language` | Change language |
| `/history` | Recent queries |
| `/premium` | View plans |
| `/subscribe basic` | Subscribe to Basic |
| `/subscribe premium` | Subscribe to Premium |
| `/status` | Subscription status |

## Plans

| Plan | Price | Queries/Day | Features |
|---|---|---|---|
| Free | ₹0 | 5 | Text queries, all topics |
| Basic | ₹99/mo | 50 | Priority support |
| Premium | ₹299/mo | Unlimited | Voice + AI enhanced |

## License

Proprietary — Vidhilikhit AI Pro
