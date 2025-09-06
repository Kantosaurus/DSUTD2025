// Load environment variables from root .env file
require('dotenv').config({ path: '../.env' });
const cron = require('node-cron');
const ReminderService = require('./services/reminderService');
const TelegramService = require('./services/telegramService');

class EventReminderBot {
  constructor() {
    this.reminderService = new ReminderService();
    this.telegramService = new TelegramService();
    this.isRunning = false;
  }

  async start() {
    try {
      console.log('🤖 Starting DSUTD Event Reminder Bot...');
      
      // Check bot connection
      const botInfo = await this.telegramService.getBotInfo();
      if (botInfo) {
        console.log(`✅ Bot connected: @${botInfo.username} (${botInfo.first_name})`);
      } else {
        console.error('❌ Failed to connect to Telegram Bot');
        return;
      }

      // Set up cron job to check for reminders every minute
      const checkInterval = process.env.CHECK_INTERVAL_MINUTES || 1;
      const cronPattern = `*/${checkInterval} * * * *`; // Every N minutes
      
      console.log(`⏰ Setting up reminder check every ${checkInterval} minute(s)`);
      
      cron.schedule(cronPattern, async () => {
        if (this.isRunning) {
          console.log('⚠️ Previous reminder check still running, skipping...');
          return;
        }
        
        await this.checkAndSendReminders();
      });

      // Set up daily cleanup job at 2 AM
      cron.schedule('0 2 * * *', async () => {
        console.log('🧹 Running daily cleanup of old reminders...');
        await this.reminderService.cleanupOldReminders();
      });

      console.log('✅ Event Reminder Bot started successfully!');
      console.log('📋 Bot is now monitoring for events and will send reminders 30 minutes before events start.');
      
      // Run initial check
      setTimeout(() => {
        this.checkAndSendReminders();
      }, 5000); // Wait 5 seconds after startup

    } catch (error) {
      console.error('❌ Error starting bot:', error);
      process.exit(1);
    }
  }

  async checkAndSendReminders() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('🔍 Checking for events needing reminders...');
      
      const eventsNeedingReminders = await this.reminderService.getEventsNeedingReminders();
      
      if (eventsNeedingReminders.length === 0) {
        console.log('✅ No reminders to send at this time.');
        return;
      }

      console.log(`📤 Sending ${eventsNeedingReminders.length} reminder(s)...`);
      
      let successCount = 0;
      let failCount = 0;

      // Group events by user to avoid spamming
      const eventsByUser = {};
      eventsNeedingReminders.forEach(event => {
        if (!eventsByUser[event.user_id]) {
          eventsByUser[event.user_id] = [];
        }
        eventsByUser[event.user_id].push(event);
      });

      // Send reminders for each user
      for (const [userId, userEvents] of Object.entries(eventsByUser)) {
        const user = userEvents[0]; // Get user info from first event
        
        if (!user.telegram_chat_id) {
          console.log(`⚠️ User ${user.student_id} has no telegram_chat_id, skipping...`);
          continue;
        }

        try {
          // Send individual reminders for each event
          for (const event of userEvents) {
            const message = this.reminderService.formatReminderMessage(event);
            const success = await this.telegramService.sendReminder(user.telegram_chat_id, message);
            
            if (success) {
              // Mark reminder as sent
              await this.reminderService.markReminderSent(event.user_id, event.event_id);
              successCount++;
              console.log(`✅ Reminder sent to ${user.student_id} for event: ${event.title}`);
            } else {
              failCount++;
              console.log(`❌ Failed to send reminder to ${user.student_id} for event: ${event.title}`);
            }

            // Small delay between messages to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (error) {
          console.error(`❌ Error sending reminders to user ${user.student_id}:`, error);
          failCount += userEvents.length;
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Reminder check completed in ${duration}ms`);
      console.log(`📊 Results: ${successCount} sent, ${failCount} failed`);

    } catch (error) {
      console.error('❌ Error in reminder check:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async stop() {
    console.log('🛑 Stopping Event Reminder Bot...');
    
    // Stop the cron jobs
    cron.destroy();
    
    console.log('✅ Bot stopped successfully');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the bot
const bot = new EventReminderBot();
bot.start().catch(error => {
  console.error('❌ Fatal error starting bot:', error);
  process.exit(1);
});