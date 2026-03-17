/**
 * Translations — Multilingual support (English, Hindi, Marathi)
 */

const translations = {
  en: {
    welcome: `👋 *Welcome to Vidhilikhit AI Pro!*

⚖️ India's most advanced AI Legal Assistant on WhatsApp.

I can answer *any* legal question about Indian law — criminal, civil, family, property, consumer, cyber law, and more.

🆕 *Now updated with BNS/BNSS/BSA (New Criminal Laws 2024)*

📝 *How to use:*
• Just type your legal question in plain language
• Or type a section number (e.g., "302", "420")
• Voice messages supported 🎤

⚡ *Quick commands:*
/help — See all options
/language — Change language (Hindi/Marathi)
/history — Your recent queries
/premium — Upgrade for unlimited queries

_Free plan: 5 queries/day_`,

    helpText: `🔹 *How to use Vidhilikhit AI Pro:*

1️⃣ *Ask any legal question:*
   "What are grounds for divorce?"
   "How to file a consumer complaint?"
   "What is Section 302?"

2️⃣ *Commands:*
   /language — Change language
   /history — Recent queries
   /premium — Upgrade plans
   /status — Subscription status
   /help — This help menu

3️⃣ *Supported topics:*
   Criminal Law (IPC/BNS)
   Family Law (Divorce, Maintenance)
   Property Law (RERA, Registration)
   Consumer Protection
   Cyber Law & IT Act
   Labour Law & POSH
   Constitutional Rights
   Business & Tax Law
   And much more!

_Currently on free plan (5 queries/day)_`,

    languageChanged: '✅ Language changed to English',
    chooseLanguage: '🌐 Choose your language / भाषा चुनें / भाषा निवडा:',

    limitReached: `⚠️ *Daily limit reached!*

You've used all 5 free queries for today.

🔓 *Unlock more:*
• *Basic (₹99/mo):* 50 queries/day
• *Premium (₹299/mo):* Unlimited + Voice

Type /premium to upgrade.
_Limit resets at midnight._`,

    noHistory: '📜 No query history found yet. Ask your first legal question!',
    historyHeader: '📜 *Your Recent Queries:*\n\n',

    premiumPlans: `⭐ *Vidhilikhit Premium Plans*

🔹 *Basic — ₹99/month*
   • 50 queries per day
   • All legal topics
   • Priority support

🔹 *Premium — ₹299/month*
   • Unlimited queries
   • Voice message support 🎤
   • AI-enhanced detailed responses
   • Priority support

Reply with:
/subscribe basic — for Basic plan
/subscribe premium — for Premium plan`,

    paymentInitiated: `💳 *Payment Link Ready*

Plan: {plan}
Amount: ₹{amount}

Complete payment here:
{link}

You'll get a confirmation on WhatsApp once done.`,

    paymentSuccess: `✅ *Payment Successful!*

Your *{plan}* plan is now active!
Expires: {expiry}

Enjoy unlimited legal queries! ⚖️`,

    paymentNotConfigured: '⚠️ Payment system is being set up. Please contact support or try again later.',

    statusFree: `🆓 *Free Plan*

Queries today: {used}/{limit}
Total queries: {total}

Type /premium to upgrade!`,

    statusPremium: `⭐ *{plan} Plan Active*

Expires: {expiry}
Queries today: {used} (Unlimited)
Total queries: {total}`,

    voiceNotSupported: '🎤 Voice messages require a Premium subscription.\n\nType /premium to upgrade, or type your question as text.',
    voiceProcessing: '🎤 Processing your voice message...',
    voiceError: '⚠️ Could not process the audio. Please type your question instead.',

    adminStats: `📊 *Bot Statistics*

👥 Total Users: {totalUsers}
⭐ Premium Users: {premiumUsers}
📝 Total Queries: {totalQueries}
📈 Today\'s Queries: {todayQueries}
📅 Date: {date}`,

    blocked: '🚫 Your account has been restricted. Please contact support.',
    error: '⚠️ Something went wrong. Please try again or type /help.',
    unknownCommand: '❓ Unknown command. Type /help to see available options.'
  },

  hi: {
    welcome: `👋 *विधिलिखित AI प्रो में आपका स्वागत है!*

⚖️ व्हाट्सएप पर भारत का सबसे उन्नत AI कानूनी सहायक।

मैं भारतीय कानून के *किसी भी* प्रश्न का उत्तर दे सकता हूं — आपराधिक, दीवानी, पारिवारिक, संपत्ति, उपभोक्ता, साइबर कानून और बहुत कुछ।

🆕 *BNS/BNSS/BSA (नए आपराधिक कानून 2024) से अपडेट*

📝 *कैसे उपयोग करें:*
• सरल भाषा में अपना कानूनी प्रश्न टाइप करें
• या धारा संख्या टाइप करें (जैसे "302", "420")
• वॉयस मैसेज भी supported है 🎤

⚡ *त्वरित कमांड:*
/help — सभी विकल्प
/language — भाषा बदलें
/history — हाल के प्रश्न
/premium — अनलिमिटेड के लिए अपग्रेड

_फ्री प्लान: 5 प्रश्न/दिन_`,

    helpText: `🔹 *विधिलिखित AI प्रो का उपयोग:*

1️⃣ *कोई भी कानूनी प्रश्न पूछें:*
   "तलाक के आधार क्या हैं?"
   "उपभोक्ता शिकायत कैसे दर्ज करें?"
   "धारा 302 क्या है?"

2️⃣ *कमांड:*
   /language — भाषा बदलें
   /history — हाल के प्रश्न
   /premium — प्रीमियम योजनाएं
   /status — सदस्यता स्थिति
   /help — यह मेनू`,

    languageChanged: '✅ भाषा हिंदी में बदल दी गई',
    chooseLanguage: '🌐 अपनी भाषा चुनें:',
    limitReached: `⚠️ *दैनिक सीमा समाप्त!*\n\nआज के 5 निःशुल्क प्रश्न समाप्त।\n\n🔓 /premium टाइप करें अपग्रेड के लिए।\n_सीमा मध्यरात्रि को रीसेट होगी।_`,
    noHistory: '📜 अभी कोई इतिहास नहीं। पहला प्रश्न पूछें!',
    historyHeader: '📜 *आपके हाल के प्रश्न:*\n\n',
    premiumPlans: `⭐ *विधिलिखित प्रीमियम*\n\n🔹 *बेसिक — ₹99/माह:* 50 प्रश्न/दिन\n🔹 *प्रीमियम — ₹299/माह:* असीमित + वॉयस\n\n/subscribe basic या /subscribe premium टाइप करें`,
    paymentSuccess: '✅ भुगतान सफल! *{plan}* योजना सक्रिय। समाप्ति: {expiry}',
    paymentNotConfigured: '⚠️ भुगतान प्रणाली सेटअप हो रही है। कृपया बाद में प्रयास करें।',
    voiceNotSupported: '🎤 वॉयस मैसेज के लिए प्रीमियम सदस्यता आवश्यक है।\n\n/premium टाइप करें या टेक्स्ट में प्रश्न पूछें।',
    voiceProcessing: '🎤 आपका वॉयस मैसेज प्रोसेस हो रहा है...',
    voiceError: '⚠️ ऑडियो प्रोसेस नहीं हो सका। कृपया टेक्स्ट में प्रश्न पूछें।',
    blocked: '🚫 आपका खाता प्रतिबंधित है।',
    error: '⚠️ कुछ गलत हुआ। कृपया पुनः प्रयास करें।',
    unknownCommand: '❓ अज्ञात कमांड। /help टाइप करें।'
  },

  mr: {
    welcome: `👋 *विधिलिखित AI प्रो मध्ये स्वागत!*

⚖️ व्हॉट्सअ‍ॅपवरील भारतातील सर्वात प्रगत AI कायदेशीर सहाय्यक.

मी भारतीय कायद्याच्या *कोणत्याही* प्रश्नाचे उत्तर देऊ शकतो — फौजदारी, दिवाणी, कौटुंबिक, मालमत्ता, ग्राहक, सायबर कायदा आणि बरेच काही.

🆕 *BNS/BNSS/BSA (नवीन फौजदारी कायदे 2024) ने अपडेट*

📝 *कसे वापरावे:*
• सोप्या भाषेत तुमचा कायदेशीर प्रश्न टाइप करा
• किंवा कलम क्रमांक टाइप करा (उदा., "302", "420")
• व्हॉईस मेसेज सपोर्टेड 🎤

⚡ *जलद कमांड:*
/help — सर्व पर्याय
/language — भाषा बदला
/history — अलीकडील प्रश्न
/premium — अनलिमिटेड साठी अपग्रेड

_मोफत प्लान: 5 प्रश्न/दिवस_`,

    helpText: `🔹 *विधिलिखित AI प्रो वापर:*

1️⃣ *कोणताही कायदेशीर प्रश्न विचारा:*
   "घटस्फोटाचे आधार काय आहेत?"
   "ग्राहक तक्रार कशी दाखल करायची?"

2️⃣ *कमांड:*
   /language — भाषा बदला
   /history — अलीकडील प्रश्न
   /premium — प्रीमियम योजना
   /help — हा मेनू`,

    languageChanged: '✅ भाषा मराठीत बदलली',
    chooseLanguage: '🌐 आपली भाषा निवडा:',
    limitReached: '⚠️ *दैनिक मर्यादा संपली!*\n\nआजचे 5 मोफत प्रश्न संपले.\n\n/premium टाइप करा अपग्रेडसाठी.',
    noHistory: '📜 अजून कोणताही इतिहास नाही. पहिला प्रश्न विचारा!',
    historyHeader: '📜 *तुमचे अलीकडील प्रश्न:*\n\n',
    premiumPlans: `⭐ *विधिलिखित प्रीमियम*\n\n🔹 *बेसिक — ₹99/महिना:* 50 प्रश्न/दिवस\n🔹 *प्रीमियम — ₹299/महिना:* मर्यादित नाही + व्हॉईस\n\n/subscribe basic किंवा /subscribe premium टाइप करा`,
    paymentSuccess: '✅ पेमेंट यशस्वी! *{plan}* योजना सक्रिय. समाप्ती: {expiry}',
    paymentNotConfigured: '⚠️ पेमेंट सिस्टम सेटअप होत आहे. कृपया नंतर प्रयत्न करा.',
    voiceNotSupported: '🎤 व्हॉईस मेसेजसाठी प्रीमियम सदस्यत्व आवश्यक.\n\n/premium टाइप करा किंवा टेक्स्टमध्ये प्रश्न विचारा.',
    voiceProcessing: '🎤 तुमचा व्हॉईस मेसेज प्रक्रिया होत आहे...',
    voiceError: '⚠️ ऑडिओ प्रक्रिया होऊ शकला नाही. कृपया टेक्स्टमध्ये प्रश्न विचारा.',
    blocked: '🚫 तुमचे खाते प्रतिबंधित आहे.',
    error: '⚠️ काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.',
    unknownCommand: '❓ अज्ञात कमांड. /help टाइप करा.'
  }
};

module.exports = translations;
