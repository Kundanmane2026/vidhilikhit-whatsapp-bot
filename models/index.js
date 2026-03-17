/**
 * Database Models — Sequelize ORM
 * Supports PostgreSQL and SQLite transparently
 */

const { DataTypes } = require('sequelize');
const { getSequelize } = require('../config/database');

let models = {};
let initialized = false;

function initModels() {
  if (initialized) return models;

  const sequelize = getSequelize();

  // ========== USER ==========
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false,
      field: 'phone_number'
    },
    name: {
      type: DataTypes.STRING(100),
      defaultValue: 'Unknown'
    },
    language: {
      type: DataTypes.STRING(5),
      defaultValue: 'en',
      validate: { isIn: [['en', 'hi', 'mr']] }
    },
    isPremium: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_premium'
    },
    premiumExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'premium_expiry'
    },
    subscriptionPlan: {
      type: DataTypes.STRING(20),
      defaultValue: 'free',
      field: 'subscription_plan'
    },
    queryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'query_count'
    },
    dailyQueryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'daily_query_count'
    },
    lastQueryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'last_query_date'
    },
    lastQueryAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_query_at'
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_blocked'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true
  });

  // ========== QUERY HISTORY ==========
  const QueryHistory = sequelize.define('QueryHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    query: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    response: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    language: {
      type: DataTypes.STRING(5),
      defaultValue: 'en'
    },
    isVoiceQuery: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_voice_query'
    },
    responseTimeMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'response_time_ms'
    },
    tokensUsed: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'tokens_used'
    }
  }, {
    tableName: 'query_history',
    timestamps: true,
    underscored: true
  });

  // ========== CONVERSATION CONTEXT ==========
  const Conversation = sequelize.define('Conversation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    role: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: { isIn: [['user', 'assistant']] }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    }
  }, {
    tableName: 'conversations',
    timestamps: true,
    underscored: true
  });

  // ========== PAYMENT ==========
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(5),
      defaultValue: 'INR'
    },
    provider: {
      type: DataTypes.STRING(20),
      defaultValue: 'razorpay'
    },
    providerOrderId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'provider_order_id'
    },
    providerPaymentId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'provider_payment_id'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending'
    },
    plan: {
      type: DataTypes.STRING(20),
      allowNull: false
    }
  }, {
    tableName: 'payments',
    timestamps: true,
    underscored: true
  });

  // ========== ASSOCIATIONS ==========
  User.hasMany(QueryHistory, { foreignKey: 'user_id', as: 'queries' });
  QueryHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  User.hasMany(Conversation, { foreignKey: 'user_id', as: 'conversations' });
  Conversation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  User.hasMany(Payment, { foreignKey: 'user_id', as: 'payments' });
  Payment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  models = { User, QueryHistory, Conversation, Payment, sequelize };
  initialized = true;
  return models;
}

async function syncDatabase() {
  const { sequelize } = initModels();
  await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
  console.log('✅ Database tables synced');
}

module.exports = { initModels, syncDatabase };
