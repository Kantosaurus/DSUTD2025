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
    // Check if this chat is already linked to a user account
    try {
      const existingUserQuery = `
        SELECT student_id, email
        FROM users 
        WHERE telegram_chat_id = $1 AND is_active = true
      `;
      
      const existingResult = await pool.query(existingUserQuery, [chatId]);
      
      if (existingResult.rows.length > 0) {
        const linkedUser = existingResult.rows[0];
        const welcomeMessage = `
🎓 **Welcome back to DSUTD 2025 Event Reminder Bot!**

Hi ${user.first_name}! You are already registered and linked to your SUTD account.

**Your Account:**
👤 Student ID: ${linkedUser.student_id}
📧 Email: ${linkedUser.email}

🔔 You will receive reminders 30 minutes before your registered events start.

**Available commands:**
/status - Check your registration status and upcoming events
/unregister - Remove your Telegram registration  
/help - Show available commands
        `;
        
        await this.sendMessage(chatId, welcomeMessage);
        return;
      }
    } catch (error) {
      console.error('Error checking existing user:', error);
    }

    const welcomeMessage = `
🎓 **Welcome to DSUTD 2025 Event Reminder Bot!**

Hi ${user.first_name}! I help send you reminders for your registered events.

**To get started:**
You need to link your Telegram account to your SUTD student account.

**If you already have a SUTD account:**
Use: \`/register YOUR_STUDENT_ID\`
Example: \`/register 1007667\`

**If you don't have a SUTD account yet:**
Please sign up first at the DSUTD website, then come back here to link your account.

**Available commands:**
/register [student_id] - Link your Telegram to your existing SUTD account
/status - Check your registration status
/help - Show this help message
    `;

    await this.sendMessage(chatId, welcomeMessage);
  }

  async handleRegisterCommand(chatId, studentId, user) {
    try {
      console.log(`Registration attempt: Student ID ${studentId}, Chat ID ${chatId}, User: ${user.first_name}`);

      // First, check if this chat is already linked to any account
      const chatCheckQuery = `
        SELECT student_id, email
        FROM users 
        WHERE telegram_chat_id = $1 AND is_active = true
      `;
      
      const chatResult = await pool.query(chatCheckQuery, [chatId]);
      
      if (chatResult.rows.length > 0) {
        const linkedUser = chatResult.rows[0];
        await this.sendMessage(chatId, `
❌ **Registration Failed**

Your Telegram account is already linked to Student ID: ${linkedUser.student_id}

If you want to link a different account:
1. Use /unregister to unlink your current account
2. Then use /register with your new student ID

Current linked account: ${linkedUser.email}
        `);
        return;
      }

      // Check if student ID exists in database
      const userQuery = `
        SELECT id, student_id, email, telegram_chat_id 
        FROM users 
        WHERE student_id = $1 AND is_active = true
      `;
      
      const userResult = await pool.query(userQuery, [studentId]);
      
      if (userResult.rows.length === 0) {
        await this.sendMessage(chatId, `
❌ **Student ID Not Found**

Student ID "${studentId}" was not found in our system.

**Possible reasons:**
• You haven't created an account on the DSUTD website yet
• Your account is inactive or pending verification
• You entered the wrong student ID

**What to do next:**
1. **If you haven't signed up yet:** Visit the DSUTD website to create your account first
2. **If you already have an account:** Double-check your student ID and try again
3. **If you're sure it's correct:** Contact support for assistance

**Format:** \`/register YOUR_STUDENT_ID\`
**Example:** \`/register 1007667\`
        `);
        return;
      }

      const dbUser = userResult.rows[0];

      // Check if this student account is already linked to another Telegram chat
      if (dbUser.telegram_chat_id && dbUser.telegram_chat_id !== chatId) {
        await this.sendMessage(chatId, `
❌ **Account Already Linked**

Student ID "${studentId}" is already linked to another Telegram account.

**If this is your account:**
You need to unregister from the other Telegram account first, then register here.

**If this is not your account:**
Someone may have incorrectly linked your student ID. Please contact support.

**Account details:**
👤 Student ID: ${studentId}
📧 Email: ${dbUser.email}
        `);
        return;
      }

      // If we get here, we can safely link the accounts
      const updateQuery = `
        UPDATE users 
        SET telegram_chat_id = $1 
        WHERE student_id = $2
      `;
      
      await pool.query(updateQuery, [chatId, studentId]);

      // Success message
      await this.sendMessage(chatId, `
✅ **Account Successfully Linked!**

Welcome ${user.first_name}! Your Telegram account is now linked to your SUTD student account.

**Your Account Details:**
👤 Student ID: ${studentId}
📧 Email: ${dbUser.email}
📲 Telegram Chat ID: ${chatId}

**What happens next:**
🔔 You'll receive automatic reminders 30 minutes before events you've signed up for
📅 Sign up for events through the DSUTD website
📱 Use /status anytime to check your upcoming events

**Available commands:**
/status - Check your registration and upcoming events
/unregister - Remove Telegram registration
/help - Show all available commands
      `);

      console.log(`✅ User ${studentId} successfully registered telegram chat ${chatId}`);

    } catch (error) {
      console.error('❌ Error in register command:', error);
      await this.sendMessage(chatId, `
❌ **System Error**

Sorry, there was a technical error processing your registration. 

**Please try again in a few minutes.**

If the problem persists, please contact the DSUTD tech team.

Error logged at: ${new Date().toISOString()}
      `);
    }
  }

  async handleUnregisterCommand(chatId, user) {
    try {
      console.log(`Unregistration attempt: Chat ID ${chatId}, User: ${user.first_name}`);

      // First check what account is linked to this chat
      const checkQuery = `
        SELECT student_id, email
        FROM users 
        WHERE telegram_chat_id = $1 AND is_active = true
      `;
      
      const checkResult = await pool.query(checkQuery, [chatId]);

      if (checkResult.rows.length === 0) {
        await this.sendMessage(chatId, `
ℹ️ **No Account Linked**

Your Telegram account is not currently linked to any SUTD student account.

**Want to link an account?**
Use: \`/register YOUR_STUDENT_ID\`
Example: \`/register 1007667\`

Use /help to see all available commands.
        `);
        return;
      }

      const linkedAccount = checkResult.rows[0];

      // Remove the telegram_chat_id link
      const updateQuery = `
        UPDATE users 
        SET telegram_chat_id = NULL 
        WHERE telegram_chat_id = $1
        RETURNING student_id
      `;
      
      const result = await pool.query(updateQuery, [chatId]);

      if (result.rows.length > 0) {
        await this.sendMessage(chatId, `
✅ **Account Unlinked Successfully**

${user.first_name}, your Telegram account has been unlinked from your SUTD student account.

**Unlinked Account:**
👤 Student ID: ${linkedAccount.student_id}
📧 Email: ${linkedAccount.email}

**What this means:**
• You will no longer receive event reminders via Telegram
• Your student account on the website remains active
• You can still sign up for events through the website

**Want to re-enable Telegram reminders?**
Use: \`/register ${linkedAccount.student_id}\`
        `);

        console.log(`✅ User ${linkedAccount.student_id} successfully unregistered from telegram chat ${chatId}`);
      } else {
        await this.sendMessage(chatId, `
❌ **Unregistration Failed**

There was an issue unlinking your account. Please try again.

If the problem persists, contact support.
        `);
      }

    } catch (error) {
      console.error('❌ Error in unregister command:', error);
      await this.sendMessage(chatId, `
❌ **System Error**

Sorry, there was a technical error processing your unregistration.

**Please try again in a few minutes.**

If the problem persists, please contact the DSUTD tech team.

Error logged at: ${new Date().toISOString()}
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

/start - Welcome message and account linking status
/register [student_id] - Link your Telegram to your existing SUTD account
/unregister - Remove your Telegram account link
/status - Check your registration status and upcoming events
/help - Show this help message

**How it works:**
1. **Create a SUTD account** on the DSUTD website (if you haven't already)
2. **Link your Telegram** using \`/register YOUR_STUDENT_ID\`
3. **Sign up for events** through the DSUTD website
4. **Get automatic reminders** 30 minutes before events start!

**Account Linking:**
• The bot checks if your Student ID exists in our database
• If not found, you need to sign up on the website first
• If already linked elsewhere, you'll need to unregister first
• Each Telegram account can only be linked to one Student ID

**Examples:**
\`/register 1007667\`
\`/status\`
\`/unregister\`

**Event Types:**
🔴 Mandatory events (attendance required)
🟠 Optional events

**Need help?** Contact the DSUTD tech team through official channels.

**Important:** This bot only works with existing SUTD student accounts. Create your account on the website first if you haven't already.
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