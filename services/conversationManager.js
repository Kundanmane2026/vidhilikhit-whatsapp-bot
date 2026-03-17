/**
 * Conversation Manager
 * Handles user sessions, conversation context, daily limits, and message routing.
 */

const { initModels } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class ConversationManager {
  constructor() {
    this.DAILY_FREE_LIMIT = 5;
    this.DAILY_BASIC_LIMIT = 50;
    this.CONTEXT_TTL_HOURS = 2; // Conversation context expires after 2 hours
  }

  /**
   * Get or create a user from phone number
   */
  async getOrCreateUser(phoneNumber, contactName = 'Unknown') {
    const { User } = initModels();

    let user = await User.findOne({ where: { phoneNumber } });

    if (!user) {
      user = await User.create({
        phoneNumber,
        name: contactName,
        language: 'en',
        subscriptionPlan: 'free'
      });
      logger.info(`New user registered: ${phoneNumber} (${contactName})`);
      return { user: user.toJSON(), isNew: true };
    }

    return { user: user.toJSON(), isNew: false };
  }

  /**
   * Check if user can make a query (daily limit enforcement)
   */
  async canQuery(user) {
    const { User } = initModels();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Reset daily count if new day
    if (user.lastQueryDate !== today) {
      await User.update(
        { dailyQueryCount: 0, lastQueryDate: today },
        { where: { id: user.id } }
      );
      user.dailyQueryCount = 0;
    }

    // Premium users — check expiry
    if (user.isPremium && user.premiumExpiry) {
      if (new Date(user.premiumExpiry) < new Date()) {
        // Premium expired
        await User.update(
          { isPremium: false, subscriptionPlan: 'free' },
          { where: { id: user.id } }
        );
        user.isPremium = false;
        user.subscriptionPlan = 'free';
      }
    }

    // Check limits
    if (user.subscriptionPlan === 'premium' && user.isPremium) {
      return { allowed: true, remaining: Infinity };
    }

    if (user.subscriptionPlan === 'basic' && user.isPremium) {
      const limit = this.DAILY_BASIC_LIMIT;
      const remaining = limit - user.dailyQueryCount;
      return { allowed: remaining > 0, remaining: Math.max(0, remaining), limit };
    }

    // Free plan
    const remaining = this.DAILY_FREE_LIMIT - user.dailyQueryCount;
    return { allowed: remaining > 0, remaining: Math.max(0, remaining), limit: this.DAILY_FREE_LIMIT };
  }

  /**
   * Increment query count for user
   */
  async recordQuery(userId, query, response, category, language, isVoice, responseTimeMs, tokensUsed) {
    const { User, QueryHistory } = initModels();
    const today = new Date().toISOString().split('T')[0];

    await Promise.all([
      // Update user stats
      User.update(
        {
          queryCount: require('sequelize').literal('query_count + 1'),
          dailyQueryCount: require('sequelize').literal('daily_query_count + 1'),
          lastQueryDate: today,
          lastQueryAt: new Date()
        },
        { where: { id: userId } }
      ),

      // Record in history
      QueryHistory.create({
        userId,
        query: query.substring(0, 5000),
        response: response.substring(0, 10000),
        category,
        language,
        isVoiceQuery: isVoice,
        responseTimeMs,
        tokensUsed
      })
    ]);
  }

  /**
   * Get conversation context (recent messages for follow-up support)
   */
  async getConversationContext(userId) {
    const { Conversation } = initModels();
    const cutoff = new Date(Date.now() - this.CONTEXT_TTL_HOURS * 60 * 60 * 1000);

    const messages = await Conversation.findAll({
      where: {
        userId,
        expiresAt: { [Op.gt]: new Date() },
        createdAt: { [Op.gt]: cutoff }
      },
      order: [['created_at', 'ASC']],
      limit: 10
    });

    return messages.map(m => ({
      role: m.role,
      content: m.content
    }));
  }

  /**
   * Save a message to conversation context
   */
  async saveToContext(userId, role, content) {
    const { Conversation } = initModels();
    const expiresAt = new Date(Date.now() + this.CONTEXT_TTL_HOURS * 60 * 60 * 1000);

    await Conversation.create({
      userId,
      role,
      content: content.substring(0, 5000),
      expiresAt
    });

    // Cleanup old context (keep last 10 messages per user)
    const allMsgs = await Conversation.findAll({
      where: { userId },
      order: [['created_at', 'DESC']]
    });

    if (allMsgs.length > 10) {
      const toDelete = allMsgs.slice(10).map(m => m.id);
      await Conversation.destroy({ where: { id: toDelete } });
    }
  }

  /**
   * Update user language preference
   */
  async setLanguage(userId, language) {
    const { User } = initModels();
    await User.update({ language }, { where: { id: userId } });
  }

  /**
   * Get user's query history
   */
  async getHistory(userId, limit = 5) {
    const { QueryHistory } = initModels();
    return QueryHistory.findAll({
      where: { userId },
      order: [['created_at', 'DESC']],
      limit,
      attributes: ['query', 'category', 'language', 'createdAt']
    });
  }

  /**
   * Get admin statistics
   */
  async getStats() {
    const { User, QueryHistory } = initModels();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, premiumUsers, totalQueries, todayQueries] = await Promise.all([
      User.count(),
      User.count({ where: { isPremium: true } }),
      QueryHistory.count(),
      QueryHistory.count({ where: { createdAt: { [Op.gte]: today } } })
    ]);

    return { totalUsers, premiumUsers, totalQueries, todayQueries };
  }
}

module.exports = new ConversationManager();
