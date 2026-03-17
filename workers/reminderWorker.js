/**
 * Reminder Worker — Cron jobs for subscription management
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const { initModels } = require('../models');
const whatsappService = require('../services/whatsappService');
const logger = require('../utils/logger');

class ReminderWorker {
  start() {
    // Daily 9 AM IST — Premium expiry reminders
    cron.schedule('30 3 * * *', async () => {
      // 3:30 UTC = 9:00 IST
      logger.info('Running premium expiry reminder job');
      await this.sendExpiryReminders();
    });

    // Daily midnight — Clean up expired conversation contexts
    cron.schedule('0 18 * * *', async () => {
      // 18:30 UTC = midnight IST
      await this.cleanupExpiredContexts();
    });

    logger.info('✅ Cron workers scheduled (IST timezone)');
  }

  async sendExpiryReminders() {
    try {
      const { User } = initModels();

      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const expiringUsers = await User.findAll({
        where: {
          isPremium: true,
          premiumExpiry: {
            [Op.lte]: threeDaysFromNow,
            [Op.gte]: new Date()
          }
        }
      });

      for (const user of expiringUsers) {
        const daysLeft = Math.ceil(
          (new Date(user.premiumExpiry) - new Date()) / (1000 * 60 * 60 * 24)
        );

        const messages = {
          en: `⏰ *Premium Expiring Soon*\n\nYour subscription expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.\n\nRenew: /premium`,
          hi: `⏰ *प्रीमियम समाप्त होने वाला है*\n\nआपकी सदस्यता ${daysLeft} दिन में समाप्त होगी।\n\nnवीनीकरण: /premium`,
          mr: `⏰ *प्रीमियम समाप्त होणार*\n\nतुमचे सदस्यत्व ${daysLeft} दिवसांत समाप्त होईल.\n\nनूतनीकरण: /premium`
        };

        try {
          await whatsappService.sendTextMessage(
            user.phoneNumber,
            messages[user.language] || messages.en
          );
        } catch (e) {
          logger.error(`Failed to send reminder to ${user.phoneNumber}:`, e.message);
        }
      }

      logger.info(`Sent ${expiringUsers.length} expiry reminders`);
    } catch (error) {
      logger.error('Expiry reminder job failed:', error.message);
    }
  }

  async cleanupExpiredContexts() {
    try {
      const { Conversation } = initModels();
      const deleted = await Conversation.destroy({
        where: { expiresAt: { [Op.lt]: new Date() } }
      });
      logger.info(`Cleaned up ${deleted} expired conversation contexts`);
    } catch (error) {
      logger.error('Context cleanup failed:', error.message);
    }
  }
}

module.exports = new ReminderWorker();
