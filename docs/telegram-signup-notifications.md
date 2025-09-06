# Telegram Event Signup Notifications

The DSUTD application now automatically sends telegram notifications when users sign up for or cancel events.

## 🔔 Features

### **Signup Confirmations**
- ✅ Automatic confirmation when users sign up for events
- 📅 Event details including date, time, location
- 🔴🟠 Different styling for Mandatory vs Optional events
- ⏰ Reminder that they'll get a notification 30 minutes before

### **Cancellation Notifications**
- ❌ Notification when users cancel event signups
- ⚠️ Special warnings for mandatory event cancellations
- ✅ Confirmation that cancellation was successful

## 📱 User Experience

### Signup Confirmation Message Example:
```
✅ Event Signup Confirmed!

🟠 Ultimate Frisbee Intro Session
📝 Introductory session for Ultimate Frisbee. All experience levels welcome.

📅 Date: Tuesday, September 17, 2025
🕒 Time: 19:30:00 - 22:30:00
📍 Location: Outdoor Sports Field
📋 Type: Optional

💡 Note: You have successfully signed up for this optional event.

🔔 You'll receive a reminder 30 minutes before the event starts.

Need to cancel? Use the DSUTD website or contact the organizers.
```

### Mandatory Event Signup:
```
✅ Event Signup Confirmed!

🔴 Freshmen Orientation 2025
📝 Comprehensive orientation program for new freshmen students

📅 Date: Thursday, September 11, 2025
🕒 Time: 08:00:00 - 18:00:00
📍 Location: Campus-wide
📋 Type: Mandatory

🚨 Important: This is a mandatory event - attendance is required.

🔔 You'll receive a reminder 30 minutes before the event starts.

Need to cancel? Use the DSUTD website or contact the organizers.
```

## 🛠️ How It Works

### Backend Integration
1. **Event Signup API** (`POST /api/events/:eventId/signup`)
   - After successful signup, triggers telegram notification
   - Non-blocking: signup succeeds even if telegram fails

2. **Event Cancellation API** (`DELETE /api/events/:eventId/signup`)
   - After successful cancellation, sends cancellation notification
   - Non-blocking: cancellation succeeds even if telegram fails

### User Requirements
- User must be registered with telegram bot (`/register [student_id]`)
- User must have `telegram_chat_id` in their database record
- Bot must be active and accessible

### Error Handling
- **Blocked Users**: Automatically removes `telegram_chat_id` if user blocks bot
- **Invalid Chat**: Gracefully handles deleted chats or invalid IDs
- **Service Down**: Signup/cancellation still works if telegram is unavailable
- **Missing Registration**: Silently skips users without telegram registration

## 🔧 Technical Implementation

### New Backend Service
**File**: `/backend/services/telegramNotificationService.js`

**Key Methods**:
- `sendEventSignupConfirmation(userId, eventDetails)`
- `sendEventCancellationNotification(userId, eventDetails)`
- `formatSignupConfirmationMessage(event)`
- `formatCancellationMessage(event)`

### Database Requirements
- `users.telegram_chat_id` column (already exists)
- Bot token in environment variables

### Environment Variables
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### Dependencies Added
- `node-telegram-bot-api@^0.66.0` (added to backend)

## 🧪 Testing

### Manual Testing
1. **Register with bot**: `/register YOUR_STUDENT_ID`
2. **Sign up for event**: Use website to sign up for any event
3. **Verify message**: Check telegram for confirmation
4. **Cancel signup**: Cancel through website
5. **Verify cancellation**: Check telegram for cancellation message

### Automated Testing
```bash
# Test the notification service
docker-compose exec backend node scripts/test-telegram-notifications.js
```

## 📊 Monitoring

### Logs to Watch
```
# Successful notifications
✅ Sent signup confirmation to user 1007667 for event: Ultimate Frisbee
✅ Sent cancellation notification to user 1007667 for event: Ultimate Frisbee

# Error handling
⚠️ User 1007667 has no telegram_chat_id - skipping signup notification
⚠️ User has blocked the bot or chat not found, removing telegram_chat_id for user 123
```

### Success Metrics
- Users receive notifications within seconds of signup/cancellation
- No failed API calls due to telegram issues
- Graceful degradation when telegram is unavailable

## 🔒 Privacy & Security

### Data Handling
- **Minimal Data**: Only stores telegram chat IDs
- **No Content Storage**: Messages not stored, only sent
- **User Control**: Users can unregister anytime
- **Automatic Cleanup**: Removes blocked/invalid chat IDs

### Permission Model
- Bot can only send messages to registered users
- Bot cannot read user messages (privacy mode enabled)
- Service fails gracefully without affecting core functionality

## 🚀 Future Enhancements

### Potential Additions
- **Event Updates**: Notify when event details change
- **Event Reminders**: Enhanced reminder system with multiple timeframes
- **Bulk Notifications**: Admin ability to send announcements
- **Custom Preferences**: User-configurable notification settings
- **Rich Messages**: Interactive buttons for quick actions

### Configuration Options
- **Notification Types**: Allow users to choose notification types
- **Timing Options**: Configurable reminder timings
- **Message Templates**: Customizable message formats

## ✅ Current Status

**Fully Operational**: 
- ✅ Signup confirmations working
- ✅ Cancellation notifications working  
- ✅ Mandatory vs Optional event handling
- ✅ Error handling and graceful degradation
- ✅ Non-blocking integration with existing APIs
- ✅ Comprehensive logging and monitoring

Users can now enjoy immediate confirmation of their event signups via telegram! 🎉