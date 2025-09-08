const { pool } = require('../config/database');
const crypto = require('crypto');
const TelegramBot = require('node-telegram-bot-api');

class TelegramMfaService {
  static _bot = null;
  
  static getBotInstance() {
    if (!this._bot && process.env.TELEGRAM_BOT_TOKEN) {
      this._bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    }
    return this._bot;
  }
  /**
   * Generate and send MFA code to user via Telegram
   */
  static async generateAndSendMFA(studentId, ipAddress, userAgent) {
    try {
      // Find user by student ID
      const userQuery = `
        SELECT id, student_id, email, telegram_chat_id
        FROM users 
        WHERE student_id = $1 AND is_active = true AND email_verified = true
      `;
      
      const userResult = await pool.query(userQuery, [studentId]);
      
      if (userResult.rows.length === 0) {
        return { success: false, error: 'User not found or not verified' };
      }

      const user = userResult.rows[0];
      
      if (!user.telegram_chat_id) {
        return { success: false, error: 'User has no Telegram linked' };
      }

      // Check for recent unused MFA code (within last 30 seconds to prevent spam)
      const recentMfaQuery = `
        SELECT id, code, created_at
        FROM mfa_codes 
        WHERE user_id = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP 
        AND created_at > (CURRENT_TIMESTAMP - INTERVAL '30 seconds')
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const recentMfaResult = await pool.query(recentMfaQuery, [user.id]);
      
      if (recentMfaResult.rows.length > 0) {
        console.log(`⚠️ Recent MFA code exists for ${studentId}, not generating new one`);
        return { success: true, message: 'Recent MFA code already sent' };
      }

      // Generate 7-character alphanumeric MFA code
      const mfaCode = crypto.randomBytes(4).toString('hex').toUpperCase().substring(0, 7);
      
      // Store MFA code in database (expires in 5 minutes)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      
      const insertMfaQuery = `
        INSERT INTO mfa_codes (user_id, code, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      
      await pool.query(insertMfaQuery, [
        user.id,
        mfaCode,
        expiresAt,
        ipAddress,
        userAgent
      ]);

      // Send MFA code via Telegram bot API
      const success = await this.sendTelegramMFA(user.telegram_chat_id, mfaCode, ipAddress);
      
      if (!success) {
        return { success: false, error: 'Failed to send MFA code via Telegram' };
      }

      console.log(`✅ MFA code sent to ${studentId} via Telegram`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error generating MFA code:', error);
      return { success: false, error: 'System error generating MFA code' };
    }
  }

  /**
   * Verify MFA code
   */
  static async verifyMFA(studentId, mfaCode) {
    try {
      // Find valid MFA code
      const mfaQuery = `
        SELECT mc.id, mc.user_id, mc.expires_at, u.student_id
        FROM mfa_codes mc
        JOIN users u ON mc.user_id = u.id
        WHERE u.student_id = $1 AND mc.code = $2 AND mc.used = false AND mc.expires_at > CURRENT_TIMESTAMP
        ORDER BY mc.created_at DESC
        LIMIT 1
      `;
      
      const mfaResult = await pool.query(mfaQuery, [studentId, mfaCode]);
      
      if (mfaResult.rows.length === 0) {
        return { success: false, error: 'Invalid or expired MFA code' };
      }

      const mfa = mfaResult.rows[0];
      
      // Mark MFA code as used
      const updateMfaQuery = `
        UPDATE mfa_codes 
        SET used = true, used_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await pool.query(updateMfaQuery, [mfa.id]);

      console.log(`✅ MFA code verified for ${studentId}`);
      return { success: true, userId: mfa.user_id };

    } catch (error) {
      console.error('❌ Error verifying MFA code:', error);
      return { success: false, error: 'System error verifying MFA code' };
    }
  }

  /**
   * Send MFA code via Telegram Bot API
   */
  static async sendTelegramMFA(chatId, mfaCode, ipAddress) {
    try {
      const bot = this.getBotInstance();
      
      if (!bot) {
        console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
        return false;
      }
      
      const message = `
🔐 **Login Verification Code**

Hi! Someone is trying to sign in to your SUTD account.

**Your MFA Code:** \`${mfaCode}\`

⏰ **Valid for:** 5 minutes
🌐 **IP Address:** ${ipAddress}

**If this wasn't you:**
• Do not share this code with anyone
• Change your password immediately
• Contact SUTD support

**Security Note:** SUTD will never ask for your MFA code outside of the login process.
      `;

      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      
      return true;
    } catch (error) {
      console.error(`Error sending MFA via Telegram to chat ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Send password reset instructions via Telegram
   */
  static async sendPasswordResetToTelegram(chatId, resetToken, studentId) {
    try {
      const bot = this.getBotInstance();
      
      if (!bot) {
        console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
        return false;
      }
      
      const resetUrl = `${process.env.FRONTEND_URL || 'https://dsutd2025.com'}/reset-password?token=${resetToken}`;
      
      const message = `
🔑 **Password Reset Request**

Hi! A password reset has been requested for your SUTD account.

**Student ID:** ${studentId}
**Valid for:** 1 hour

**To reset your password:**
👆 Click the link below or copy it to your browser:
\`${resetUrl}\`

**If you didn't request this:**
• Ignore this message - your password remains unchanged
• Consider changing your password if you suspect unauthorized access
• Contact SUTD support if needed

**Security Note:** Never share this link with anyone else.
      `;

      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      
      return true;
    } catch (error) {
      console.error(`Error sending password reset via Telegram to chat ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Send new temporary password via Telegram
   */
  static async sendNewPasswordToTelegram(chatId, newPassword, studentId) {
    try {
      const bot = this.getBotInstance();
      
      if (!bot) {
        console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
        return false;
      }
      
      const message = `
🔑 **New Temporary Password**

Hi! A new temporary password has been generated for your SUTD account.

**Student ID:** ${studentId}
**New Password:** \`${newPassword}\`

**Important Instructions:**
• Use this password to log in to your account
• Change your password immediately after logging in
• This is a temporary password for security

**Security Notes:**
• Never share this password with anyone
• Log in and change it as soon as possible
• Contact SUTD support if you didn't request this

**If you didn't request this password reset:**
• Someone may be trying to access your account
• Contact SUTD support immediately
      `;

      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      
      return true;
    } catch (error) {
      console.error(`Error sending new password via Telegram to chat ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Clean up expired MFA codes (should be called periodically)
   */
  static async cleanupExpiredCodes() {
    try {
      const deleteQuery = `
        DELETE FROM mfa_codes 
        WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
      `;
      
      const result = await pool.query(deleteQuery);
      console.log(`Cleaned up ${result.rowCount} expired MFA codes`);
      
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error cleaning up expired MFA codes:', error);
      return 0;
    }
  }
}

module.exports = TelegramMfaService;