const TelegramBot = require('node-telegram-bot-api');
const { pool } = require('../config/database');
const crypto = require('crypto');

// Temporary storage for signup process
const signupSessions = new Map();

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

    // Handle /register command - for relinking existing accounts
    this.bot.onText(/\/register (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const studentId = match[1].trim();

      await this.handleRegisterCommand(chatId, studentId, msg.from);
    });

    // Handle /signup command with student ID for new signup flow
    this.bot.onText(/\/signup (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const studentId = match[1].trim();
      
      await this.handleSignupCommand(chatId, studentId, msg.from);
    });

    // Handle text messages for signup flow
    this.bot.on('message', async (msg) => {
      if (msg.text && !msg.text.startsWith('/')) {
        await this.handleTextMessage(msg);
      }
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

**If you don't have a SUTD account yet:**
Use: \`/signup YOUR_STUDENT_ID\`
Example: \`/signup 1009999\`

**If you already have a SUTD account:**
Use: \`/register YOUR_STUDENT_ID\`
Example: \`/register 1009999\`

**Available commands:**
/signup [student_id] - Create new SUTD account via Telegram
/register [student_id] - Link existing SUTD account to Telegram
/status - Check your registration status
/help - Show this help message
    `;

    await this.sendMessage(chatId, welcomeMessage);
  }

  // handleRegisterCommand removed - registration is now handled by signup

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

**Want to create an account?**
Use: \`/signup YOUR_STUDENT_ID\`
Example: \`/signup 1009999\`

**Already have an account?**
Contact support for account linking.

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
Contact support to re-link your account.
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

/start - Welcome message and account status
/signup [student_id] - Create new SUTD account via Telegram
/register [student_id] - Link existing SUTD account to Telegram
/unregister - Remove your Telegram account link
/status - Check your registration status and upcoming events
/help - Show this help message

**How it works:**
1. **Create or link your SUTD account** using \`/signup\` or \`/register\`
2. **Sign up for events** through the DSUTD website
3. **Get automatic reminders** 30 minutes before events start!
4. **Use MFA codes** sent via Telegram when logging into the website

**Account Setup:**
• **New users:** Use \`/signup\` to create a new account
• **Existing users:** Use \`/register\` to link your existing account
• **Unlinked users:** Use \`/register\` to relink your account
• Each Telegram chat can only be linked to one Student ID

**Examples:**
\`/signup 1009999\` - Create new account
\`/register 1009999\` - Link existing account
\`/status\` - Check account status
\`/unregister\` - Remove link

**Event Types:**
🔴 Mandatory events (attendance required)
🟠 Optional events

**Need help?** Contact the DSUTD tech team through official channels.
    `;

    await this.sendMessage(chatId, helpMessage);
  }

  async handleRegisterCommand(chatId, studentId, user) {
    try {
      console.log(`Register attempt: Student ID ${studentId}, Chat ID ${chatId}, User: ${user.first_name}`);

      // Validate student ID format
      if (!/^10[01]\d{4}$/.test(studentId)) {
        await this.sendMessage(chatId, `
❌ **Invalid Student ID Format**

Student ID must be in format 100XXXX or 101XXXX where X is a digit from 0-9.

Examples: \`/register 1009999\` or \`/register 1019999\`
        `);
        return;
      }

      // Check if this chat is already linked to any account
      const existingChatQuery = `
        SELECT student_id, email
        FROM users
        WHERE telegram_chat_id = $1 AND is_active = true
      `;

      const existingChatResult = await pool.query(existingChatQuery, [chatId]);

      if (existingChatResult.rows.length > 0) {
        const linkedUser = existingChatResult.rows[0];
        await this.sendMessage(chatId, `
⚠️ **Chat Already Linked**

This Telegram chat is already linked to an account:
👤 Student ID: ${linkedUser.student_id}
📧 Email: ${linkedUser.email}

If you want to link a different account:
1. Use \`/unregister\` first to unlink current account
2. Then use \`/register ${studentId}\` to link the new account

If this is the correct account, you're already set up! Use \`/status\` to check.
        `);
        return;
      }

      // Check if the target student account exists and is verified
      const userQuery = `
        SELECT id, student_id, email, email_verified, telegram_chat_id, is_active
        FROM users
        WHERE student_id = $1
      `;

      const userResult = await pool.query(userQuery, [studentId]);

      if (userResult.rows.length === 0) {
        await this.sendMessage(chatId, `
❌ **Account Not Found**

No account found for Student ID "${studentId}".

**If you don't have an account yet:**
Use: \`/signup ${studentId}\` to create a new account.

**If you believe this is an error:**
Contact support for assistance.
        `);
        return;
      }

      const targetUser = userResult.rows[0];

      // Check if account is active
      if (!targetUser.is_active) {
        await this.sendMessage(chatId, `
❌ **Account Inactive**

The account for Student ID "${studentId}" is currently inactive.

Please contact support to reactivate your account.
        `);
        return;
      }

      // Check if email is verified
      if (!targetUser.email_verified) {
        await this.sendMessage(chatId, `
❌ **Email Not Verified**

The account for Student ID "${studentId}" has not been email verified yet.

Please verify your email first through the website, then try registering again.
        `);
        return;
      }

      // Check if account is already linked to another Telegram chat
      if (targetUser.telegram_chat_id && targetUser.telegram_chat_id !== chatId) {
        await this.sendMessage(chatId, `
⚠️ **Account Already Linked**

Student ID "${studentId}" is already linked to another Telegram chat.

**If you want to switch to this chat:**
You'll need to unregister from the other chat first, then register here.

**If this is suspicious activity:**
Contact support immediately.
        `);
        return;
      }

      // Link the account to this chat
      const linkQuery = `
        UPDATE users
        SET telegram_chat_id = $1
        WHERE id = $2
        RETURNING student_id, email
      `;

      const linkResult = await pool.query(linkQuery, [chatId, targetUser.id]);

      if (linkResult.rows.length > 0) {
        const linkedUser = linkResult.rows[0];

        // Get upcoming events count
        const eventsCountQuery = `
          SELECT COUNT(*) as event_count
          FROM calendar_events ce
          INNER JOIN event_signups es ON ce.id = es.event_id
          WHERE es.user_id = $1
            AND ce.is_active = true
            AND (ce.event_date > CURRENT_DATE OR
                 (ce.event_date = CURRENT_DATE AND ce.start_time > CURRENT_TIME))
        `;

        const eventsCount = await pool.query(eventsCountQuery, [targetUser.id]);
        const upcomingEvents = eventsCount.rows[0].event_count || 0;

        await this.sendMessage(chatId, `
✅ **Account Successfully Linked**

${user.first_name || 'Student'}, your Telegram is now linked to your SUTD account!

**Linked Account:**
👤 Student ID: ${linkedUser.student_id}
📧 Email: ${linkedUser.email}
📲 Telegram: Linked to this chat
📅 Upcoming Events: ${upcomingEvents}

**What's Next:**
🔔 You'll receive event reminders 30 minutes before they start
🌐 You can now use Telegram MFA when logging into the website
📱 Use \`/status\` to see your upcoming events

**Available Commands:**
/status - Check your upcoming events and account info
/unregister - Remove Telegram link (if needed)
/help - Show all available commands
        `);

        console.log(`✅ User ${linkedUser.student_id} successfully linked to telegram chat ${chatId}`);
      } else {
        await this.sendMessage(chatId, `
❌ **Linking Failed**

There was an issue linking your account. Please try again.

If the problem persists, contact support.
        `);
      }

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

  async handleSignupCommand(chatId, studentId, user) {
    try {
      console.log(`Signup attempt: Student ID ${studentId}, Chat ID ${chatId}, User: ${user.first_name}`);

      // Validate student ID format
      if (!/^10[01]\d{4}$/.test(studentId)) {
        await this.sendMessage(chatId, `
❌ **Invalid Student ID Format**

Student ID must be in format 100XXXX or 101XXXX where X is a digit from 0-9.

Examples: \`/signup 1009999\` or \`/signup 1019999\`
        `);
        return;
      }

      // Check if student ID already exists
      const existingUserQuery = `
        SELECT id, student_id, email_verified 
        FROM users 
        WHERE student_id = $1
      `;
      
      const existingResult = await pool.query(existingUserQuery, [studentId]);
      
      if (existingResult.rows.length > 0) {
        const existingUser = existingResult.rows[0];
        if (existingUser.email_verified) {
          await this.sendMessage(chatId, `
❌ **Student ID Already Registered**

Student ID "${studentId}" is already registered and verified.

**To link your existing account to Telegram:**
Use: \`/register ${studentId}\`

**If this is not your account:**
Please contact support for assistance.
          `);
        } else {
          await this.sendMessage(chatId, `
❌ **Student ID Already Exists**

Student ID "${studentId}" is already in the system but not verified.

Please contact support to resolve this issue.
          `);
        }
        return;
      }

      // Start signup process
      const sessionId = crypto.randomBytes(16).toString('hex');
      signupSessions.set(chatId, {
        sessionId,
        studentId,
        step: 'awaiting_password',
        timestamp: Date.now()
      });

      await this.sendMessage(chatId, `✅ Starting Signup Process

Welcome ${user.first_name || 'Student'}! Let's create your SUTD account.

Student ID: ${studentId}
Email: ${studentId}@mymail.sutd.edu.sg

📝 Next Step: Please send your password.

Password Requirements:
• At least 12 characters long
• At least one uppercase letter (A-Z)
• At least one lowercase letter (a-z)
• At least one number (0-9)
• At least one special character (e.g. !@#$%^&)
• Cannot contain repeated characters more than twice
• Cannot contain common patterns (123, abc, password, etc.)

Please type your password now:`, { parse_mode: null });

    } catch (error) {
      console.error('❌ Error in signup command:', error);
      await this.sendMessage(chatId, `
❌ **System Error**

Sorry, there was a technical error processing your signup.

**Please try again in a few minutes.**

Error logged at: ${new Date().toISOString()}
      `);
    }
  }

  async handleTextMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    
    const session = signupSessions.get(chatId);
    if (!session) {
      return; // Not in a signup flow
    }

    // Check session timeout (10 minutes)
    if (Date.now() - session.timestamp > 10 * 60 * 1000) {
      signupSessions.delete(chatId);
      await this.sendMessage(chatId, `
⏰ **Signup Session Expired**

Your signup session has expired. Please start again with \`/signup YOUR_STUDENT_ID\`
      `);
      return;
    }

    if (session.step === 'awaiting_password') {
      await this.handlePasswordInput(chatId, text, session, msg);
    }
  }

  async handlePasswordInput(chatId, password, session, msg) {
    try {
      // Validate password strength
      const passwordErrors = this.validatePassword(password);
      if (passwordErrors.length > 0) {
        await this.sendMessage(chatId, `
❌ **Password Requirements Not Met**

${passwordErrors.map(err => `• ${err}`).join('\n')}

Please try again with a stronger password:
        `);
        return;
      }

      // Hash password (using simple approach for now, should use bcrypt in production)
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(password, 10);
      
      const email = `${session.studentId}@mymail.sutd.edu.sg`;
      
      // Create user in database
      const insertQuery = `
        INSERT INTO users (student_id, email, password_hash, role, telegram_chat_id, email_verified, is_active) 
        VALUES ($1, $2, $3, 'student', $4, true, true) 
        RETURNING id, student_id, email, created_at
      `;
      
      const result = await pool.query(insertQuery, [
        session.studentId,
        email,
        passwordHash,
        chatId
      ]);

      const newUser = result.rows[0];

      // Auto-signup for mandatory events
      const mandatoryEventsQuery = `
        SELECT id FROM calendar_events 
        WHERE (event_type = 'Mandatory' OR event_type = 'mandatory') 
        AND is_active = true
      `;
      
      const mandatoryEvents = await pool.query(mandatoryEventsQuery);
      
      for (const event of mandatoryEvents.rows) {
        await pool.query(
          'INSERT INTO event_signups (user_id, event_id) VALUES ($1, $2) ON CONFLICT (user_id, event_id) DO NOTHING',
          [newUser.id, event.id]
        );
      }

      // Clean up session
      signupSessions.delete(chatId);

      await this.sendMessage(chatId, `
🎉 **Account Created Successfully!**

Welcome to SUTD, ${msg.from?.first_name || 'Student'}!

**Your Account Details:**
👤 Student ID: ${newUser.student_id}
📧 Email: ${newUser.email}
📲 Telegram: Linked to this chat
📅 Created: ${new Date(newUser.created_at).toLocaleDateString()}

**What's Next:**
✅ Your account is ready to use
✅ You're automatically signed up for mandatory events
✅ You'll receive event reminders 30 minutes before they start
🌐 You can now log in to the DSUTD website

**Available Commands:**
/status - Check your upcoming events
/help - Show all commands

**Login Credentials:**
• Website: Use Student ID and the password you just set
• You'll receive a MFA code via Telegram when signing in
      `);

      console.log(`✅ New user created via Telegram: ${session.studentId}`);

    } catch (error) {
      console.error('❌ Error creating user:', error);
      await this.sendMessage(chatId, `
❌ **Account Creation Failed**

Sorry, there was an error creating your account.

Error: ${error.message}

Please try the signup process again with \`/signup ${session.studentId}\`
      `);
    }
  }

  validatePassword(password) {
    const errors = [];
    
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    if (/(..)\1{1,}/.test(password)) {
      errors.push('Password cannot contain repeated characters more than twice');
    }
    
    if (/123|abc|qwe|password|admin|user/i.test(password)) {
      errors.push('Password cannot contain common patterns or words');
    }
    
    return errors;
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