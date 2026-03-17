/**
 * WhatsApp Cloud API Service
 * Meta Graph API v21.0 — Production-grade with retry logic
 */

const axios = require('axios');
const logger = require('../utils/logger');

const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

class WhatsAppService {
  constructor() {
    this.phoneNumberId = process.env.PHONE_NUMBER_ID;
    this.token = process.env.WHATSAPP_TOKEN;
    this.maxRetries = 2;
  }

  get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Send a text message (handles WhatsApp 4096 char limit by splitting)
   */
  async sendTextMessage(to, text) {
    if (!text || text.trim().length === 0) {
      logger.warn('Attempted to send empty message');
      return null;
    }

    // WhatsApp limit is 4096 characters per message
    const chunks = this._splitMessage(text, 4000);

    for (const chunk of chunks) {
      await this._sendWithRetry({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: true, body: chunk }
      });

      // Small delay between chunks to maintain order
      if (chunks.length > 1) {
        await this._delay(500);
      }
    }
  }

  /**
   * Send interactive button message (max 3 buttons)
   */
  async sendButtonMessage(to, bodyText, buttons, headerText = null, footerText = null) {
    const interactive = {
      type: 'button',
      body: { text: bodyText.substring(0, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title.substring(0, 20)
          }
        }))
      }
    };

    if (headerText) interactive.header = { type: 'text', text: headerText.substring(0, 60) };
    if (footerText) interactive.footer = { text: footerText.substring(0, 60) };

    await this._sendWithRetry({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive
    });
  }

  /**
   * Send interactive list message (max 10 sections, 10 rows each)
   */
  async sendListMessage(to, bodyText, buttonLabel, sections) {
    await this._sendWithRetry({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText.substring(0, 4096) },
        action: {
          button: buttonLabel.substring(0, 20),
          sections: sections.map(section => ({
            title: section.title.substring(0, 24),
            rows: section.rows.slice(0, 10).map(row => ({
              id: row.id.substring(0, 200),
              title: row.title.substring(0, 24),
              description: (row.description || '').substring(0, 72)
            }))
          }))
        }
      }
    });
  }

  /**
   * Mark a message as read (blue ticks)
   */
  async markAsRead(messageId) {
    try {
      await axios.post(
        `${BASE_URL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        },
        { headers: this.headers }
      );
    } catch (error) {
      // Non-critical — don't throw
      logger.debug('Mark as read failed (non-critical):', error.message);
    }
  }

  /**
   * Download media by media ID (for voice messages, images, etc.)
   */
  async downloadMedia(mediaId) {
    try {
      // Step 1: Get media URL
      const metaResponse = await axios.get(
        `${BASE_URL}/${mediaId}`,
        { headers: this.headers }
      );

      const mediaUrl = metaResponse.data.url;

      // Step 2: Download the actual media
      const downloadResponse = await axios.get(mediaUrl, {
        headers: { 'Authorization': `Bearer ${this.token}` },
        responseType: 'arraybuffer',
        timeout: 30000
      });

      return {
        data: Buffer.from(downloadResponse.data),
        mimeType: metaResponse.data.mime_type,
        fileSize: metaResponse.data.file_size
      };
    } catch (error) {
      logger.error('Media download failed:', error.message);
      throw new Error(`Failed to download media: ${error.message}`);
    }
  }

  /**
   * Send typing indicator (shows "typing..." in chat)
   */
  async sendTypingIndicator(to) {
    try {
      await axios.post(
        `${BASE_URL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'reaction',
          reaction: { message_id: '', emoji: '' }
        },
        { headers: this.headers }
      );
    } catch {
      // Silently fail — typing indicator is a nice-to-have
    }
  }

  // ========== INTERNAL HELPERS ==========

  async _sendWithRetry(payload) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `${BASE_URL}/${this.phoneNumberId}/messages`,
          payload,
          {
            headers: this.headers,
            timeout: 30000
          }
        );
        return response.data;
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        const errorData = error.response?.data?.error;

        // Don't retry on client errors (except rate limit)
        if (status && status >= 400 && status < 500 && status !== 429) {
          logger.error('WhatsApp API error:', {
            status,
            code: errorData?.code,
            message: errorData?.message,
            to: payload.to
          });
          throw error;
        }

        // Rate limited — wait and retry
        if (status === 429) {
          const retryAfter = error.response?.headers?.['retry-after'] || 5;
          logger.warn(`Rate limited. Waiting ${retryAfter}s before retry ${attempt + 1}`);
          await this._delay(retryAfter * 1000);
          continue;
        }

        // Server error or network — exponential backoff
        if (attempt < this.maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000;
          logger.warn(`WhatsApp API attempt ${attempt + 1} failed. Retrying in ${backoff}ms`);
          await this._delay(backoff);
        }
      }
    }

    logger.error('WhatsApp API failed after all retries:', lastError?.message);
    throw lastError;
  }

  _splitMessage(text, maxLen) {
    if (text.length <= maxLen) return [text];

    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLen) {
        chunks.push(remaining);
        break;
      }

      // Try to split at paragraph, then sentence, then word boundary
      let splitIdx = remaining.lastIndexOf('\n\n', maxLen);
      if (splitIdx < maxLen * 0.3) splitIdx = remaining.lastIndexOf('\n', maxLen);
      if (splitIdx < maxLen * 0.3) splitIdx = remaining.lastIndexOf('. ', maxLen);
      if (splitIdx < maxLen * 0.3) splitIdx = remaining.lastIndexOf(' ', maxLen);
      if (splitIdx < maxLen * 0.3) splitIdx = maxLen;

      chunks.push(remaining.substring(0, splitIdx + 1).trim());
      remaining = remaining.substring(splitIdx + 1).trim();
    }

    return chunks;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new WhatsAppService();
