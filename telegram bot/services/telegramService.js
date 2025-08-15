const TelegramBot = require('node-telegram-bot-api');
const { pool } = require('../config/database');

class TelegramService {
  constructor() {
    this.bot = null;
    this.initializeBot();
  }

  initializeBot() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
      return;
    }

    try {
      this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
      
      // Set up basic bot commands
      this.setupBotCommands();
      
      console.log('Telegram bot initialized successfully');
    } catch (error) {
      console.error('Error initializing Telegram bot:', error);
    }
  }

  setupBotCommands() {
    if (!this.bot) return;

    // Handle /start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      await this.handleStartCommand(chatId, userId, msg.from);
    });

    // Handle /register command with student ID
    this.bot.onText(/\/register (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const studentId = match[1].trim();
      
      await this.handleRegisterCommand(chatId, studentId, msg.from);
    });

    // Handle /unregister command
    this.bot.onText(/\/unregister/, async (msg) => {
      const chatId = msg.chat.id;
      
      await this.handleUnregisterCommand(chatId, msg.from);
    });

    // Handle /status command
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      
      await this.handleStatusCommand(chatId, msg.from);
    });

    // Handle /help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      
      await this.handleHelpCommand(chatId);
    });

    // Handle errors
    this.bot.on('error', (error) => {
      console.error('Telegram bot error:', error);
    });
  }

  async handleStartCommand(chatId, userId, user) {
    const welcomeMessage = `
🎓 **Welcome to DSUTD 2025 Event Reminder Bot!**

Hi ${user.first_name}! I'm here to send you reminders for your registered events.

**To get started:**
1. Register with your student ID using: \`/register YOUR_STUDENT_ID\`
2. I'll automatically send you reminders 30 minutes before your events start!

**Available commands:**
/register [student_id] - Link your Telegram to your SUTD account
/unregister - Remove your Telegram registration  
/status - Check your registration status
/help - Show this help message

**Example:** \`/register 1007667\`
    `;

    await this.sendMessage(chatId, welcomeMessage);
  }

  async handleRegisterCommand(chatId, studentId, user) {
    try {
      // Check if student ID exists and is valid
      const userQuery = `
        SELECT id, student_id, email, telegram_chat_id 
        FROM users 
        WHERE student_id = $1 AND is_active = true
      `;
      
      const userResult = await pool.query(userQuery, [studentId]);
      
      if (userResult.rows.length === 0) {
        await this.sendMessage(chatId, `
❌ **Registration Failed**

Student ID "${studentId}" not found or inactive. Please check your student ID and try again.

**Format:** \`/register YOUR_STUDENT_ID\`
**Example:** \`/register 1007667\`
        `);
        return;
      }

      const dbUser = userResult.rows[0];

      // Check if this student ID is already registered to another chat
      if (dbUser.telegram_chat_id && dbUser.telegram_chat_id !== chatId) {
        await this.sendMessage(chatId, `
❌ **Registration Failed**

This student ID is already registered to another Telegram account. If this is your account, please /unregister from the other account first.
        `);
        return;
      }

      // Update user's telegram_chat_id
      const updateQuery = `
        UPDATE users 
        SET telegram_chat_id = $1 
        WHERE student_id = $2
      `;
      
      await pool.query(updateQuery, [chatId, studentId]);

      await this.sendMessage(chatId, `
✅ **Registration Successful!**

Welcome ${user.first_name}! Your account has been linked successfully.

**Details:**
👤 Student ID: ${studentId}
📧 Email: ${dbUser.email}
📲 Chat ID: ${chatId}

🔔 You will now receive reminders 30 minutes before your registered events start!

Use /status to check your registration anytime.
      `);

      console.log(`User ${studentId} registered telegram chat ${chatId}`);

    } catch (error) {
      console.error('Error in register command:', error);
      await this.sendMessage(chatId, `
❌ **Registration Error**

Sorry, there was an error processing your registration. Please try again later or contact support.
      `);
    }
  }

  async handleUnregisterCommand(chatId, user) {
    try {
      // Find and remove telegram_chat_id for this chat
      const updateQuery = `
        UPDATE users 
        SET telegram_chat_id = NULL 
        WHERE telegram_chat_id = $1
        RETURNING student_id
      `;
      
      const result = await pool.query(updateQuery, [chatId]);

      if (result.rows.length === 0) {
        await this.sendMessage(chatId, `
❌ **Not Registered**

You are not currently registered for notifications. Use /register to get started!
        `);
        return;
      }

      const studentId = result.rows[0].student_id;
      
      await this.sendMessage(chatId, `
✅ **Unregistered Successfully**

${user.first_name}, you have been unregistered from event notifications.

Student ID ${studentId} is no longer linked to this Telegram account.

Use /register to re-enable notifications anytime!
      `);

      console.log(`User ${studentId} unregistered from telegram chat ${chatId}`);

    } catch (error) {
      console.error('Error in unregister command:', error);
      await this.sendMessage(chatId, `
❌ **Error**

Sorry, there was an error processing your request. Please try again later.
      `);
    }
  }

  async handleStatusCommand(chatId, user) {
    try {
      // Get user registration status
      const statusQuery = `
        SELECT student_id, email, created_at, last_login
        FROM users 
        WHERE telegram_chat_id = $1 AND is_active = true
      `;
      
      const result = await pool.query(statusQuery, [chatId]);

      if (result.rows.length === 0) {
        await this.sendMessage(chatId, `
📋 **Registration Status**

❌ **Not Registered**

You are not currently registered for event notifications.

Use \`/register YOUR_STUDENT_ID\` to get started!
        `);
        return;
      }

      const userInfo = result.rows[0];
      
      // Get upcoming events for this user
      const eventsQuery = `
        SELECT ce.title, ce.event_date, ce.start_time, ce.location, ce.event_type
        FROM calendar_events ce
        INNER JOIN event_signups es ON ce.id = es.event_id
        INNER JOIN users u ON es.user_id = u.id
        WHERE u.telegram_chat_id = $1 
          AND ce.is_active = true 
          AND ce.status = 'approved'
          AND (ce.event_date > CURRENT_DATE OR 
               (ce.event_date = CURRENT_DATE AND ce.start_time > CURRENT_TIME))
        ORDER BY ce.event_date ASC, ce.start_time ASC
        LIMIT 5
      `;
      
      const eventsResult = await pool.query(eventsQuery, [chatId]);

      let statusMessage = `
📋 **Registration Status**

✅ **Registered Successfully**

**Account Details:**
👤 Student ID: ${userInfo.student_id}
📧 Email: ${userInfo.email}
📲 Chat ID: ${chatId}
⏰ Reminder Time: 30 minutes before events

**Upcoming Events (${eventsResult.rows.length}/5):**
      `;

      if (eventsResult.rows.length === 0) {
        statusMessage += '\n📅 No upcoming events registered.';
      } else {
        eventsResult.rows.forEach((event, index) => {
          const eventDate = new Date(event.event_date).toLocaleDateString();
          const eventType = event.event_type === 'Mandatory' ? '🔴' : '🟠';
          statusMessage += `\n${index + 1}. ${eventType} ${event.title}`;
          statusMessage += `\n   📅 ${eventDate} at ${event.start_time}`;
          statusMessage += `\n   📍 ${event.location}\n`;
        });
      }

      await this.sendMessage(chatId, statusMessage);

    } catch (error) {
      console.error('Error in status command:', error);
      await this.sendMessage(chatId, `
❌ **Error**

Sorry, there was an error checking your status. Please try again later.
      `);
    }
  }

  async handleHelpCommand(chatId) {
    const helpMessage = `
🤖 **DSUTD 2025 Event Reminder Bot Help**

**Available Commands:**

/start - Welcome message and setup instructions
/register [student_id] - Link your Telegram to your SUTD account
/unregister - Remove your Telegram registration  
/status - Check your registration status and upcoming events
/help - Show this help message

**How it works:**
1. Register with your SUTD student ID
2. Sign up for events through the DSUTD website
3. Get automatic reminders 30 minutes before events start!

**Examples:**
\`/register 1007667\`
\`/status\`

**Need help?** Contact the DSUTD tech team through official channels.

**Event Types:**
🔴 Mandatory events (attendance required)
🟠 Optional events
    `;

    await this.sendMessage(chatId, helpMessage);
  }

  /**
   * Send a reminder message to a user
   */
  async sendReminder(chatId, message) {
    try {
      await this.sendMessage(chatId, message);
      return true;
    } catch (error) {
      console.error(`Error sending reminder to chat ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Send a message to a chat
   */
  async sendMessage(chatId, message, options = {}) {
    if (!this.bot) {
      console.error('Bot not initialized');
      return false;
    }

    try {
      const defaultOptions = {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...options
      };

      await this.bot.sendMessage(chatId, message, defaultOptions);
      return true;
    } catch (error) {
      console.error(`Error sending message to chat ${chatId}:`, error);
      
      // If user blocked the bot or chat not found, we should handle it gracefully
      if (error.code === 403 || error.code === 400) {
        console.log(`User ${chatId} has blocked the bot or chat not found, removing telegram_chat_id`);
        await this.removeBlockedUser(chatId);
      }
      
      return false;
    }
  }

  /**
   * Remove telegram_chat_id for blocked users
   */
  async removeBlockedUser(chatId) {
    try {
      const query = `
        UPDATE users 
        SET telegram_chat_id = NULL 
        WHERE telegram_chat_id = $1
      `;
      
      await pool.query(query, [chatId]);
      console.log(`Removed telegram_chat_id for blocked user: ${chatId}`);
    } catch (error) {
      console.error('Error removing blocked user:', error);
    }
  }

  /**
   * Get bot info
   */
  async getBotInfo() {
    if (!this.bot) return null;
    
    try {
      return await this.bot.getMe();
    } catch (error) {
      console.error('Error getting bot info:', error);
      return null;
    }
  }
}

module.exports = TelegramService;