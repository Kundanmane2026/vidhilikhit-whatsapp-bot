/**
 * Environment Validation
 * Fails fast at startup if critical configuration is missing.
 */

function validateEnv() {
  const errors = [];
  const warnings = [];

  // Critical — bot cannot function without these
  const required = [
    ['WHATSAPP_TOKEN', 'WhatsApp Cloud API access token'],
    ['PHONE_NUMBER_ID', 'WhatsApp Phone Number ID'],
    ['VERIFY_TOKEN', 'Webhook verification token'],
    ['ANTHROPIC_API_KEY', 'Claude AI API key']
  ];

  for (const [key, desc] of required) {
    if (!process.env[key] || process.env[key].includes('your_')) {
      errors.push(`❌ Missing ${key} — ${desc}`);
    }
  }

  // Database — need at least one
  if (!process.env.DATABASE_URL && process.env.USE_SQLITE !== 'true') {
    warnings.push('⚠️  No DATABASE_URL set and USE_SQLITE not enabled. Defaulting to SQLite.');
  }

  // Optional but important
  if (!process.env.RAZORPAY_KEY_ID) {
    warnings.push('⚠️  RAZORPAY_KEY_ID not set — payment features disabled');
  }
  if (!process.env.BASE_URL) {
    warnings.push('⚠️  BASE_URL not set — payment links and webhooks may not work');
  }
  if (!process.env.ADMIN_PHONE_NUMBER) {
    warnings.push('⚠️  ADMIN_PHONE_NUMBER not set — admin stats disabled');
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log('\n🔧 Configuration Warnings:');
    warnings.forEach(w => console.log(`   ${w}`));
    console.log('');
  }

  // Fail on critical errors
  if (errors.length > 0) {
    console.error('\n🚨 CRITICAL: Missing required environment variables:\n');
    errors.forEach(e => console.error(`   ${e}`));
    console.error('\n   Copy .env.example to .env and fill in values.\n');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
}

module.exports = { validateEnv };
