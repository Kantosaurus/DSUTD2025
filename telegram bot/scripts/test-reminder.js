/**
 * Test script to manually trigger reminder checks and test the system
 * Usage: node scripts/test-reminder.js
 */

require('dotenv').config();
const ReminderService = require('../services/reminderService');
const TelegramService = require('../services/telegramService');
const { pool } = require('../config/database');

class ReminderTester {
  constructor() {
    this.reminderService = new ReminderService();
    this.telegramService = new TelegramService();
  }

  async testDatabaseConnection() {
    console.log('🔍 Testing database connection...');
    try {
      const result = await pool.query('SELECT NOW() as current_time');
      console.log('✅ Database connected successfully');
      console.log(`   Current time: ${result.rows[0].current_time}`);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  async testBotConnection() {
    console.log('🔍 Testing Telegram bot connection...');
    try {
      const botInfo = await this.telegramService.getBotInfo();
      if (botInfo) {
        console.log('✅ Bot connected successfully');
        console.log(`   Bot name: ${botInfo.first_name}`);
        console.log(`   Username: @${botInfo.username}`);
        console.log(`   Bot ID: ${botInfo.id}`);
        return true;
      } else {
        console.error('❌ Bot connection failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Bot connection error:', error.message);
      return false;
    }
  }

  async testEventsQuery() {
    console.log('🔍 Testing events needing reminders query...');
    try {
      const events = await this.reminderService.getEventsNeedingReminders();
      console.log(`✅ Query successful, found ${events.length} events needing reminders`);
      
      if (events.length > 0) {
        console.log('📋 Sample events:');
        events.slice(0, 3).forEach((event, index) => {
          console.log(`   ${index + 1}. ${event.title}`);
          console.log(`      Date: ${event.event_date} ${event.start_time}`);
          console.log(`      User: ${event.student_id} (${event.email})`);
          console.log(`      Chat ID: ${event.telegram_chat_id || 'Not set'}`);
          console.log();
        });
      }
      
      return events;
    } catch (error) {
      console.error('❌ Events query failed:', error.message);
      return null;
    }
  }

  async testReminderFormat() {
    console.log('🔍 Testing reminder message formatting...');
    
    // Create a sample event
    const sampleEvent = {
      event_id: 1,
      title: 'Test Event',
      description: 'This is a test event for reminder formatting',
      event_date: '2025-08-15',
      start_time: '14:30:00',
      end_time: '16:00:00',
      location: 'Test Location',
      event_type: 'Optional'
    };

    try {
      const message = this.reminderService.formatReminderMessage(sampleEvent);
      console.log('✅ Message formatting successful');
      console.log('📝 Sample formatted message:');
      console.log('─'.repeat(50));
      console.log(message);
      console.log('─'.repeat(50));
      return true;
    } catch (error) {
      console.error('❌ Message formatting failed:', error.message);
      return false;
    }
  }

  async testSendTestMessage(chatId) {
    if (!chatId) {
      console.log('⚠️ No chat ID provided, skipping test message send');
      return false;
    }

    console.log(`🔍 Testing message send to chat ID: ${chatId}...`);
    
    const testMessage = `
🤖 **Test Message from DSUTD Reminder Bot**

This is a test message to verify the bot is working correctly.

✅ If you receive this message, the bot is functioning properly!

Time: ${new Date().toLocaleString()}
    `;

    try {
      const success = await this.telegramService.sendMessage(chatId, testMessage);
      if (success) {
        console.log('✅ Test message sent successfully');
        return true;
      } else {
        console.log('❌ Test message failed to send');
        return false;
      }
    } catch (error) {
      console.error('❌ Test message send error:', error.message);
      return false;
    }
  }

  async showRegisteredUsers() {
    console.log('🔍 Checking registered users...');
    try {
      const query = `
        SELECT student_id, email, telegram_chat_id, created_at
        FROM users 
        WHERE telegram_chat_id IS NOT NULL AND is_active = true
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      const result = await pool.query(query);
      console.log(`✅ Found ${result.rows.length} registered users:`);
      
      if (result.rows.length === 0) {
        console.log('   No users have registered for Telegram notifications yet.');
        console.log('   Users need to message the bot and use /register [student_id]');
      } else {
        result.rows.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.student_id} (${user.email})`);
          console.log(`      Chat ID: ${user.telegram_chat_id}`);
          console.log(`      Registered: ${user.created_at}`);
          console.log();
        });
      }
      
      return result.rows;
    } catch (error) {
      console.error('❌ Error checking registered users:', error.message);
      return null;
    }
  }

  async runFullTest(testChatId = null) {
    console.log('🚀 Starting comprehensive test of DSUTD Reminder Bot...\n');
    
    const tests = [
      () => this.testDatabaseConnection(),
      () => this.testBotConnection(),
      () => this.testEventsQuery(),
      () => this.testReminderFormat(),
      () => this.showRegisteredUsers(),
    ];

    if (testChatId) {
      tests.push(() => this.testSendTestMessage(testChatId));
    }

    let passedTests = 0;
    let totalTests = tests.length;

    for (let i = 0; i < tests.length; i++) {
      try {
        const result = await tests[i]();
        if (result !== false) passedTests++;
      } catch (error) {
        console.error(`❌ Test ${i + 1} failed:`, error.message);
      }
      console.log(); // Add spacing between tests
    }

    console.log('📊 Test Results:');
    console.log(`   Passed: ${passedTests}/${totalTests}`);
    console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! The bot is ready to use.');
    } else {
      console.log('⚠️ Some tests failed. Please check the configuration and try again.');
    }

    return passedTests === totalTests;
  }
}

// Run the test
async function main() {
  const tester = new ReminderTester();
  
  // Get test chat ID from command line arguments
  const testChatId = process.argv[2];
  
  if (testChatId) {
    console.log(`📱 Test chat ID provided: ${testChatId}`);
  } else {
    console.log('💡 Tip: Provide a chat ID as argument to test message sending');
    console.log('   Example: node scripts/test-reminder.js 123456789');
  }
  
  await tester.runFullTest(testChatId);
  
  // Close database connection
  await pool.end();
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

main().catch(error => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});