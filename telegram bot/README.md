# DSUTD 2025 Event Reminder Telegram Bot

A Telegram bot that automatically sends reminders to users 30 minutes before their registered events start.

## Features

- 🔔 **Automatic Reminders**: Sends notifications 30 minutes before events
- 👥 **Account Verification**: Checks database to ensure user exists before linking
- 🔐 **Secure Linking**: Users can only link existing SUTD student accounts
- 📅 **Event Integration**: Works with existing event signup system
- 🎯 **Smart Filtering**: Only sends reminders for events users have signed up for
- ✅ **Account Management**: Proper signup, linking, and unlinking flow
- 🧹 **Auto Cleanup**: Automatically cleans up old notification records
- ⚡ **Real-time**: Checks for upcoming events every minute

## Setup

### 1. Create Telegram Bot

1. Message @BotFather on Telegram
2. Create a new bot with `/newbot`
3. Get your bot token
4. Save the token for configuration

### 2. Database Setup

The telegram bot tables are automatically created when you initialize the database with the main `init.sql` file. No additional setup required!

The following telegram bot components are included in `/backend/init.sql`:
- `telegram_chat_id` column in the `users` table
- `reminder_notifications` table for tracking sent reminders
- All necessary indexes for performance

### 3. Environment Configuration

1. Copy `.env.example` to `.env`
2. Configure the following variables:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Database Configuration (should match your main backend)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=webapp_db
DB_USER=webapp_user
DB_PASSWORD=your_db_password

# Bot Configuration
CHECK_INTERVAL_MINUTES=1
REMINDER_MINUTES_BEFORE=30
```

### 4. Install Dependencies

```bash
cd "telegram bot"
npm install
```

### 5. Run the Bot

```bash
# Development
npm run dev

# Production
npm start
```

## Usage

### For Users

**New Users (No SUTD Account Yet):**
1. **Create SUTD Account**: First, sign up on the DSUTD website
2. **Start the bot**: Search for your bot on Telegram and send `/start`  
3. **Link your account**: Use `/register YOUR_STUDENT_ID` (e.g., `/register 1007667`)
4. **Get reminders**: Bot will automatically send reminders 30 minutes before your events

**Existing Users (Have SUTD Account):**
1. **Start the bot**: Search for your bot on Telegram and send `/start`
2. **Link your account**: Use `/register YOUR_STUDENT_ID` 
3. **Get reminders**: Bot will automatically send reminders for your registered events

**Important**: The bot will verify your Student ID exists in our database before linking. If not found, you need to create your SUTD account first on the website.

### Bot Commands

- `/start` - Welcome message and setup instructions
- `/register [student_id]` - Link Telegram account to SUTD student ID
- `/unregister` - Remove Telegram registration
- `/status` - Check registration status and upcoming events
- `/help` - Show help message

### Example Usage Flows

**Successful Registration:**
```
/register 1007667
✅ Account Successfully Linked!

Welcome John! Your Telegram account is now linked to your SUTD student account.

Your Account Details:
👤 Student ID: 1007667
📧 Email: john.doe@mymail.sutd.edu.sg
📲 Telegram Chat ID: 123456789

🔔 You'll receive automatic reminders 30 minutes before events you've signed up for
```

**User Not Found:**
```
/register 9999999
❌ Student ID Not Found

Student ID "9999999" was not found in our system.

Possible reasons:
• You haven't created an account on the DSUTD website yet
• Your account is inactive or pending verification  
• You entered the wrong student ID

What to do next:
1. If you haven't signed up yet: Visit the DSUTD website to create your account first
2. If you already have an account: Double-check your student ID and try again
```

## How It Works

1. **Database Verification**: Bot checks if Student ID exists in database before linking
2. **Account Linking**: Links Telegram chat to existing student account  
3. **Event Monitoring**: Bot checks every minute for events starting in 30 minutes
4. **User Lookup**: Finds users who have signed up for those events AND have telegram_chat_id
5. **Reminder Sending**: Sends formatted reminder messages via Telegram
6. **Tracking**: Records sent reminders to avoid duplicates
7. **Cleanup**: Daily cleanup of old reminder records

## Message Format

```
🔴 Event Reminder

📅 Freshmen Orientation 2025
📝 Comprehensive orientation program for new freshmen students - Day 1

🕒 Time: 8:00 AM - 6:00 PM
📍 Location: Campus-wide
📋 Type: Mandatory

⏰ This event starts in 30 minutes!

🚨 This is a mandatory event - attendance is required.
```

## Architecture

```
telegram bot/
├── bot.js                 # Main bot application
├── config/
│   └── database.js        # Database connection
├── services/
│   ├── reminderService.js # Event reminder logic
│   └── telegramService.js # Telegram bot interactions
├── migrations/
│   └── add_telegram_chat_id.sql # Database migration
├── package.json
├── .env.example
└── README.md
```

## Database Schema

### New Columns Added

```sql
-- Added to existing users table
ALTER TABLE users ADD COLUMN telegram_chat_id BIGINT;

-- New table for tracking sent reminders
CREATE TABLE reminder_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    event_id INTEGER REFERENCES calendar_events(id),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reminder_type VARCHAR(50) DEFAULT '30_min_before'
);
```

## Monitoring

The bot logs all activities:

- ✅ Successful reminder sends
- ❌ Failed sends (blocked users, invalid chats)
- 🔍 Event discovery and filtering
- 📊 Summary statistics

## Security Features

- **No sensitive data**: Only stores chat IDs, no personal messages
- **User control**: Users can unregister anytime
- **Blocked user handling**: Automatically removes chat IDs for blocked users
- **Input validation**: Validates student IDs against database

## Troubleshooting

### Common Issues

1. **Bot not sending messages**:
   - Check `TELEGRAM_BOT_TOKEN` is correct
   - Verify database connection
   - Check bot permissions

2. **User can't register**:
   - Verify student ID exists in database
   - Check if student ID is already registered to another chat

3. **Database connection errors**:
   - Verify database credentials in `.env`
   - Ensure database migration was run

### Logs

Monitor the console output for detailed logging:
```bash
npm start
```

## Contributing

1. Follow existing code patterns
2. Add appropriate error handling
3. Update documentation for new features
4. Test thoroughly before deploying

## License

MIT License - See main project license.