const TelegramBot = require('node-telegram-bot-api');
const { pool } = require('../config/database');

class TelegramNotificationService {
  constructor() {
    this.bot = null;
    this.initializeBot();
  }

  initializeBot() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.log('TELEGRAM_BOT_TOKEN not configured - Telegram notifications disabled');
      return;
    }

    try {
      this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
      console.log('Telegram notification service initialized');
    } catch (error) {
      console.error('Error initializing Telegram notification service:', error);
    }
  }

  /**
   * Send event signup confirmation to user
   */
  async sendEventSignupConfirmation(userId, eventDetails) {
    if (!this.bot) {
      console.log('Telegram bot not initialized - skipping notification');
      return false;
    }

    try {
      // Get user's telegram chat ID
      const userResult = await pool.query(
        'SELECT student_id, email, telegram_chat_id FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0 || !userResult.rows[0].telegram_chat_id) {
        return false;
      }

      const user = userResult.rows[0];
      const chatId = user.telegram_chat_id;

      // Format the confirmation message
      const message = this.formatSignupConfirmationMessage(eventDetails);

      // Send the message
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });

      return true;

    } catch (error) {
      console.error('Error sending signup confirmation:', error);
      
      // If user blocked the bot or chat not found, handle gracefully
      if (error.code === 403 || error.code === 400) {
        await this.removeBlockedUser(userId);
      }
      
      return false;
    }
  }

  /**
   * Send event cancellation notification to user
   */
  async sendEventCancellationNotification(userId, eventDetails) {
    if (!this.bot) {
      console.log('Telegram bot not initialized - skipping notification');
      return false;
    }

    try {
      // Get user's telegram chat ID
      const userResult = await pool.query(
        'SELECT student_id, email, telegram_chat_id FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0 || !userResult.rows[0].telegram_chat_id) {
        return false;
      }

      const user = userResult.rows[0];
      const chatId = user.telegram_chat_id;

      // Format the cancellation message
      const message = this.formatCancellationMessage(eventDetails);

      // Send the message
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });

      return true;

    } catch (error) {
      console.error('Error sending cancellation notification:', error);
      
      // If user blocked the bot or chat not found, handle gracefully
      if (error.code === 403 || error.code === 400) {
        await this.removeBlockedUser(userId);
      }
      
      return false;
    }
  }

  /**
   * Format signup confirmation message
   */
  formatSignupConfirmationMessage(event) {
    const eventTypeEmoji = event.event_type === 'Mandatory' ? '🔴' : '🟠';
    const eventDate = new Date(event.event_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let message = `✅ **Event Signup Confirmed!**\n\n`;
    message += `${eventTypeEmoji} **${event.title}**\n`;
    
    if (event.description) {
      message += `📝 ${event.description}\n\n`;
    }
    
    message += `📅 **Date:** ${eventDate}\n`;
    message += `🕒 **Time:** ${event.start_time} - ${event.end_time}\n`;
    message += `📍 **Location:** ${event.location}\n`;
    message += `📋 **Type:** ${event.event_type}\n\n`;
    
    if (event.event_type === 'Mandatory') {
      message += `🚨 **Important:** This is a mandatory event - attendance is required.\n\n`;
    } else {
      message += `💡 **Note:** You have successfully signed up for this optional event.\n\n`;
    }
    
    message += `🔔 You'll receive a reminder 30 minutes before the event starts.\n\n`;
    message += `Need to cancel? Use the DSUTD website or contact the organizers.`;
    
    return message;
  }

  /**
   * Format cancellation message
   */
  formatCancellationMessage(event) {
    const eventTypeEmoji = event.event_type === 'Mandatory' ? '🔴' : '🟠';
    const eventDate = new Date(event.event_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let message = `❌ **Event Signup Cancelled**\n\n`;
    message += `${eventTypeEmoji} **${event.title}**\n`;
    message += `📅 **Date:** ${eventDate}\n`;
    message += `🕒 **Time:** ${event.start_time} - ${event.end_time}\n`;
    message += `📍 **Location:** ${event.location}\n\n`;
    
    if (event.event_type === 'Mandatory') {
      message += `⚠️ **Important:** You have cancelled your registration for a mandatory event. Please ensure you re-register or contact the organizers if this was a mistake.\n\n`;
    } else {
      message += `✅ Your registration for this optional event has been cancelled.\n\n`;
    }
    
    message += `You can sign up again through the DSUTD website if needed.`;
    
    return message;
  }

  /**
   * Remove telegram_chat_id for blocked users
   */
  async removeBlockedUser(userId) {
    try {
      const query = `
        UPDATE users 
        SET telegram_chat_id = NULL 
        WHERE id = $1
      `;
      
      await pool.query(query, [userId]);
    } catch (error) {
      console.error('Error removing blocked user:', error);
    }
  }

  /**
   * Test if the service is working
   */
  async testConnection() {
    if (!this.bot) {
      return { success: false, message: 'Bot not initialized' };
    }

    try {
      const botInfo = await this.bot.getMe();
      return { 
        success: true, 
        message: `Connected to bot: @${botInfo.username}`,
        botInfo 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Connection failed: ${error.message}` 
      };
    }
  }
}

// Create singleton instance
const telegramNotificationService = new TelegramNotificationService();

module.exports = telegramNotificationService;