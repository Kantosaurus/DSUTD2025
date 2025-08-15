# Telegram Bot Troubleshooting Guide

## ✅ **Issue Fixed: Bot Not Starting**

### Root Cause
The telegram bot was failing to start because the required database tables were missing. The database was created before the telegram bot schema was added to `init.sql`.

### Solution Applied
Applied the telegram bot schema manually to the existing database:

```sql
-- Added telegram_chat_id column to users table
ALTER TABLE users ADD COLUMN telegram_chat_id BIGINT;

-- Created reminder_notifications table
CREATE TABLE reminder_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES calendar_events(id) ON DELETE CASCADE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reminder_type VARCHAR(50) DEFAULT '30_min_before',
    UNIQUE(user_id, event_id, reminder_type)
);

-- Added performance indexes
```

## 🔍 **Verification Steps**

### 1. Check Bot Status
```bash
# Check if all containers are running
docker-compose ps

# The telegram bot should show "Up" status and "(healthy)"
```

### 2. Check Bot Logs
```bash
# View recent logs
docker-compose logs --tail=20 telegram-bot

# Should show:
# ✅ Event Reminder Bot started successfully!
# 📋 Bot is now monitoring for events...
```

### 3. Test Bot Response
1. Find your bot on Telegram: **@Dsutd_bot**
2. Send `/start` command
3. You should receive a welcome message with registration instructions

### 4. Verify Database Tables
```bash
# Check users table has telegram_chat_id column
docker-compose exec postgres psql -U webapp_user -d webapp_db -c "\d users" | grep telegram

# Check reminder_notifications table exists
docker-compose exec postgres psql -U webapp_user -d webapp_db -c "\d reminder_notifications"
```

## 🧪 **Testing Bot Functionality**

### Register a User
1. Send `/start` to the bot
2. Send `/register YOUR_STUDENT_ID` (e.g., `/register 1007667`)
3. You should get a success message

### Check Registration Status
1. Send `/status` to see your registration details
2. Send `/help` to see all available commands

### Test Database Connection
```bash
# Run the test script
docker-compose exec telegram-bot node scripts/test-reminder.js YOUR_CHAT_ID
```

## 🚨 **Common Issues & Solutions**

### Bot Shows "Restarting" Status
**Cause:** Database tables missing or bot token invalid
**Solution:** 
1. Check logs: `docker-compose logs telegram-bot`
2. Verify tables exist (see verification steps above)
3. Check TELEGRAM_BOT_TOKEN in `.env` file

### Bot Doesn't Respond to Messages
**Cause:** Bot not properly started or token issues
**Solution:**
1. Verify bot status: `docker-compose ps telegram-bot`
2. Check bot logs for errors
3. Restart bot: `docker-compose restart telegram-bot`

### Database Connection Errors
**Cause:** Database not ready or wrong credentials
**Solution:**
1. Check postgres status: `docker-compose ps postgres`
2. Verify database credentials in docker-compose.yml
3. Wait for postgres to be healthy before starting bot

### Permission Denied Errors
**Cause:** Bot doesn't have necessary database permissions
**Solution:**
1. Check database user permissions
2. Ensure bot can connect to postgres container

## 🔧 **Development Commands**

```bash
# Rebuild and restart everything
docker-compose up -d --build

# Restart just the telegram bot
docker-compose restart telegram-bot

# View all service logs
docker-compose logs -f

# Connect to database manually
docker-compose exec postgres psql -U webapp_user -d webapp_db

# Run bot tests
docker-compose exec telegram-bot node scripts/test-reminder.js

# Check bot environment variables
docker-compose exec telegram-bot env | grep -E "(TELEGRAM|DB_)"
```

## 📊 **Monitoring**

### Health Checks
- Docker automatically monitors bot health
- Bot reports successful database connections
- Regular reminder checks logged every minute

### Log Patterns to Watch
- ✅ Database connection successful
- ✅ Bot connected with username
- 🔍 Regular reminder checks
- ❌ Any error messages (investigate immediately)

## 🎯 **Expected Bot Behavior**

### On Startup:
1. Waits for database to be ready
2. Verifies required tables exist
3. Connects to Telegram API
4. Sets up cron job for reminder checks
5. Reports successful startup

### During Operation:
1. Responds to user commands immediately
2. Checks for reminders every minute
3. Sends notifications 30 minutes before events
4. Logs all activities

### User Interaction:
1. `/start` - Welcome message and instructions
2. `/register [student_id]` - Links Telegram to SUTD account
3. `/status` - Shows registration status and upcoming events
4. `/help` - Shows all available commands
5. `/unregister` - Removes registration

## ✅ **Current Status**

**Bot is now fully operational!**

- ✅ Database tables created
- ✅ Bot connected to Telegram API
- ✅ Container healthy and running
- ✅ Monitoring events for reminders
- ✅ Ready to accept user registrations

Users can now:
1. Find the bot: **@Dsutd_bot**
2. Register with `/register [student_id]`
3. Receive automatic reminders 30 minutes before their events