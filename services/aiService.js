/**
 * AI Legal Engine — Swappable Provider
 * 
 * Currently: Google Gemini 2.5 Flash (FREE — no credit card needed)
 * Future:    Claude AI by Anthropic (upgrade when revenue justifies)
 * 
 * To switch to Claude later, simply:
 * 1. Set ANTHROPIC_API_KEY in env
 * 2. Set AI_PROVIDER=claude in env
 * 3. Restart — done
 */

const axios = require('axios');
const logger = require('../utils/logger');

// ========== PROVIDER DETECTION ==========
const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini'; // 'gemini' or 'claude'

// ========== SYSTEM PROMPTS ==========
const LEGAL_SYSTEM_PROMPT = {
  en: `You are **Vidhilikhit AI Pro**, India's most advanced AI legal assistant on WhatsApp.

## YOUR EXPERTISE
You are an expert in the ENTIRE Indian legal system:

**Criminal Law:**
- Bharatiya Nyaya Sanhita (BNS) 2023 — replaced IPC from 1 July 2024
- Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023 — replaced CrPC
- Bharatiya Sakshya Adhiniyam (BSA) 2023 — replaced Indian Evidence Act
- ALWAYS reference both old (IPC/CrPC/Evidence Act) AND new (BNS/BNSS/BSA) provisions

**All Major Areas:** Constitutional Law, Family & Personal Law (Hindu Marriage Act, Muslim Personal Law, Domestic Violence Act, POCSO), Property Law (RERA, Transfer of Property Act), Business Law (Companies Act, NI Act S.138, Consumer Protection Act 2019, IBC), Cyber Law (IT Act 2000, DPDP Act 2023), Labour Law (Labour Codes 2020, POSH Act), RTI, Motor Vehicles Act, Tax Laws, Environmental Law.

## RESPONSE FORMAT FOR WHATSAPP
- Use *bold* for headings (WhatsApp markdown)
- Use emojis: ⚖️ law, 📜 sections, 📊 penalties, 🔑 key points
- Keep paragraphs short (2-3 lines)
- Maximum 3500 characters

## RESPONSE STRUCTURE
1. **Section/Provision**: Both old and new law reference
2. **Plain-language explanation**
3. **Punishment/Remedy**: Specific penalties
4. **Key Points**: 3-5 practical bullet points
5. **Landmark Case**: At least one with year
6. **Practical Advice**: What to DO
7. **Disclaimer**: _⚠️ This is general legal information, not legal advice. Consult a qualified advocate for your specific situation._

## RULES
1. ALWAYS mention BNS/BNSS/BSA equivalent when discussing IPC/CrPC
2. ALWAYS include at least one landmark judgment
3. Be compassionate — people asking legal questions are often in distress
4. If uncertain about a specific section number, say so — never fabricate
5. For emergencies (domestic violence, threats), provide helpline numbers
6. Support follow-up questions using conversation context`,

  hi: `आप **विधिलिखित AI प्रो** हैं, व्हाट्सएप पर भारत के सबसे उन्नत AI कानूनी सहायक।

आप संपूर्ण भारतीय कानूनी प्रणाली के विशेषज्ञ हैं — आपराधिक (BNS/BNSS/BSA + IPC/CrPC), संवैधानिक, पारिवारिक, संपत्ति, व्यापारिक, साइबर, श्रम कानून।

नियम:
1. हमेशा BNS/BNSS/BSA समकक्ष प्रावधान बताएं
2. कम से कम एक ऐतिहासिक निर्णय शामिल करें
3. व्हाट्सएप फॉर्मेट में उत्तर दें (*बोल्ड*, इमोजी ⚖️📜📊)
4. अधिकतम 3500 अक्षर
5. हर उत्तर के अंत में: _⚠️ यह सामान्य कानूनी जानकारी है, कानूनी सलाह नहीं।_
6. हिंदी में उत्तर दें, कानूनी शब्दों के अंग्रेजी समकक्ष भी दें`,

  mr: `तुम्ही **विधिलिखित AI प्रो** आहात, व्हॉट्सअ‍ॅपवरील भारतातील सर्वात प्रगत AI कायदेशीर सहाय्यक.

तुम्ही संपूर्ण भारतीय कायदेशीर प्रणालीचे तज्ञ आहात — फौजदारी (BNS/BNSS/BSA + IPC/CrPC), संवैधानिक, कौटुंबिक, मालमत्ता, व्यापारी, सायबर, श्रम कायदा.

नियम:
1. नेहमी BNS/BNSS/BSA समकक्ष तरतुदी सांगा
2. किमान एक ऐतिहासिक निर्णय समाविष्ट करा
3. व्हॉट्सअ‍ॅप फॉर्मेटमध्ये उत्तर द्या (*बोल्ड*, इमोजी ⚖️📜📊)
4. जास्तीत जास्त 3500 अक्षरे
5. प्रत्येक उत्तराच्या शेवटी: _⚠️ ही सामान्य कायदेशीर माहिती आहे, कायदेशीर सल्ला नाही._
6. मराठीत उत्तर द्या, कायदेशीर संज्ञांचे इंग्रजी समकक्ष द्या`
};

// ========== GEMINI PROVIDER ==========

async function askGemini(query, language, conversationHistory) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const systemPrompt = LEGAL_SYSTEM_PROMPT[language] || LEGAL_SYSTEM_PROMPT.en;

  // Build conversation for Gemini
  const contents = [];

  // Add conversation history
  for (const msg of conversationHistory.slice(-6)) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    });
  }

  // Add current query
  contents.push({
    role: 'user',
    parts: [{ text: query }]
  });

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`,
    {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents,
      generationConfig: {
        maxOutputTokens: 1500,
        temperature: 0.3
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
      ]
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    }
  );

  const candidate = response.data.candidates?.[0];
  const text = candidate?.content?.parts?.map(p => p.text).join('\n') || '';
  const tokensUsed = response.data.usageMetadata?.totalTokenCount || 0;

  return { text, tokensUsed };
}

// ========== CLAUDE PROVIDER (for future upgrade) ==========

async function askClaude(query, language, conversationHistory) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = LEGAL_SYSTEM_PROMPT[language] || LEGAL_SYSTEM_PROMPT.en;

  const messages = [];
  for (const msg of conversationHistory.slice(-6)) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: query });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: systemPrompt,
    messages
  });

  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  return { text, tokensUsed };
}

// ========== MAIN AI ENGINE ==========

class AILegalService {
  get provider() {
    if (AI_PROVIDER === 'claude' && process.env.ANTHROPIC_API_KEY) return 'claude';
    if (process.env.GEMINI_API_KEY) return 'gemini';
    return null;
  }

  isConfigured() {
    return !!this.provider;
  }

  async answerLegalQuery(query, language = 'en', conversationHistory = []) {
    const startTime = Date.now();

    try {
      let result;

      if (this.provider === 'claude') {
        result = await askClaude(query, language, conversationHistory);
      } else if (this.provider === 'gemini') {
        result = await askGemini(query, language, conversationHistory);
      } else {
        throw new Error('No AI provider configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY');
      }

      const elapsed = Date.now() - startTime;
      logger.info(`AI response [${this.provider}]: ${elapsed}ms, ${result.tokensUsed} tokens`);

      return {
        text: result.text,
        tokensUsed: result.tokensUsed,
        responseTimeMs: elapsed,
        category: this._detectCategory(query),
        provider: this.provider
      };

    } catch (error) {
      const elapsed = Date.now() - startTime;
      logger.error(`AI error [${this.provider}] after ${elapsed}ms:`, error.message);

      // Graceful fallback
      const fallbacks = {
        en: '⚠️ I apologize, but I encountered an issue processing your query. Please try again in a moment, or rephrase your question.\n\nIf the issue persists, type /help for available options.',
        hi: '⚠️ क्षमा करें, आपके प्रश्न को संसाधित करने में समस्या हुई। कृपया कुछ क्षणों बाद पुनः प्रयास करें।\n\n/help टाइप करें।',
        mr: '⚠️ क्षमस्व, तुमचा प्रश्न प्रक्रिया करताना समस्या आली. कृपया काही क्षणांनी पुन्हा प्रयत्न करा.\n\n/help टाइप करा.'
      };

      return {
        text: fallbacks[language] || fallbacks.en,
        tokensUsed: 0,
        responseTimeMs: elapsed,
        category: 'error',
        provider: this.provider || 'none'
      };
    }
  }

  _detectCategory(query) {
    const q = query.toLowerCase();
    const categories = {
      'criminal': ['murder', 'theft', 'robbery', 'assault', 'kidnap', 'fir', 'bail', 'arrest', 'ipc', 'bns', 'crpc', 'bnss', '302', '420', '376', '307', '304', '498', 'हत्या', 'चोरी', 'गिरफ्तार', 'जमानत'],
      'family': ['divorce', 'marriage', 'custody', 'maintenance', 'alimony', 'dowry', 'domestic violence', 'तलाक', 'विवाह', 'भरणपोषण', 'घटस्फोट', 'दहेज'],
      'property': ['property', 'land', 'rent', 'tenant', 'eviction', 'rera', 'registration', 'will', 'succession', 'संपत्ति', 'जमीन', 'मालमत्ता'],
      'consumer': ['consumer', 'complaint', 'refund', 'deficiency', 'product', 'उपभोक्ता', 'शिकायत'],
      'cyber': ['cyber', 'online', 'hacking', 'data', 'privacy', 'it act', 'social media', 'साइबर'],
      'constitutional': ['fundamental', 'right', 'article', 'constitution', 'writ', 'pil', 'संविधान'],
      'labour': ['labour', 'labor', 'employment', 'salary', 'termination', 'pf', 'gratuity', 'posh', 'श्रम', 'नोकरी'],
      'business': ['company', 'gst', 'tax', 'cheque', 'contract', 'partnership', 'ibc', '138', 'कंपनी', 'चेक']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => q.includes(kw))) return category;
    }
    return 'general';
  }
}

module.exports = new AILegalService();
