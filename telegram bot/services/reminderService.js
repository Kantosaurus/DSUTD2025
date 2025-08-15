const { pool } = require('../config/database');
const moment = require('moment');

class ReminderService {
  constructor() {
    this.reminderMinutes = parseInt(process.env.REMINDER_MINUTES_BEFORE) || 30;
  }

  /**
   * Get events that need reminders sent (starting in 30 minutes)
   */
  async getEventsNeedingReminders() {
    try {
      const now = moment();
      const reminderTime = moment().add(this.reminderMinutes, 'minutes');
      
      // Get events starting within the reminder window that haven't had reminders sent yet
      const query = `
        SELECT DISTINCT
          ce.id as event_id,
          ce.title,
          ce.description,
          ce.event_date,
          ce.start_time,
          ce.end_time,
          ce.location,
          ce.event_type,
          u.id as user_id,
          u.student_id,
          u.email,
          u.telegram_chat_id,
          es.signup_date
        FROM calendar_events ce
        INNER JOIN event_signups es ON ce.id = es.event_id
        INNER JOIN users u ON es.user_id = u.id
        LEFT JOIN reminder_notifications rn ON (
          rn.user_id = u.id 
          AND rn.event_id = ce.id 
          AND rn.reminder_type = '30_min_before'
        )
        WHERE 
          ce.is_active = true
          AND ce.status = 'approved'
          AND u.is_active = true
          AND u.telegram_chat_id IS NOT NULL
          AND rn.id IS NULL
          AND ce.event_date = $1
          AND ce.start_time >= $2
          AND ce.start_time <= $3
        ORDER BY ce.start_time ASC, ce.title ASC
      `;

      const reminderDate = reminderTime.format('YYYY-MM-DD');
      const reminderTimeStart = reminderTime.format('HH:mm:ss');
      const reminderTimeEnd = reminderTime.add(1, 'minute').format('HH:mm:ss');

      const result = await pool.query(query, [
        reminderDate,
        reminderTimeStart,
        reminderTimeEnd
      ]);

      console.log(`Found ${result.rows.length} reminder notifications to send`);
      return result.rows;

    } catch (error) {
      console.error('Error getting events needing reminders:', error);
      throw error;
    }
  }

  /**
   * Mark reminder as sent for a user and event
   */
  async markReminderSent(userId, eventId, reminderType = '30_min_before') {
    try {
      const query = `
        INSERT INTO reminder_notifications (user_id, event_id, reminder_type)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, event_id, reminder_type) DO NOTHING
      `;
      
      await pool.query(query, [userId, eventId, reminderType]);
      console.log(`Marked reminder sent for user ${userId}, event ${eventId}`);
      
    } catch (error) {
      console.error('Error marking reminder as sent:', error);
      throw error;
    }
  }

  /**
   * Format reminder message for telegram
   */
  formatReminderMessage(event) {
    const startTime = moment(`${event.event_date} ${event.start_time}`);
    const endTime = moment(`${event.event_date} ${event.end_time}`);
    
    const eventTypeEmoji = event.event_type === 'Mandatory' ? '🔴' : '🟠';
    const timeFormat = 'h:mm A';
    
    let message = `${eventTypeEmoji} **Event Reminder**\n\n`;
    message += `📅 **${event.title}**\n`;
    
    if (event.description) {
      message += `📝 ${event.description}\n\n`;
    }
    
    message += `🕒 **Time:** ${startTime.format(timeFormat)} - ${endTime.format(timeFormat)}\n`;
    message += `📍 **Location:** ${event.location}\n`;
    message += `📋 **Type:** ${event.event_type}\n\n`;
    
    message += `⏰ This event starts in ${this.reminderMinutes} minutes!\n\n`;
    
    if (event.event_type === 'Mandatory') {
      message += `🚨 This is a mandatory event - attendance is required.`;
    } else {
      message += `💡 Don't forget to attend if you signed up!`;
    }
    
    return message;
  }

  /**
   * Clean up old reminder notifications (older than 7 days)
   */
  async cleanupOldReminders() {
    try {
      const cutoffDate = moment().subtract(7, 'days').toISOString();
      
      const query = `
        DELETE FROM reminder_notifications 
        WHERE sent_at < $1
      `;
      
      const result = await pool.query(query, [cutoffDate]);
      console.log(`Cleaned up ${result.rowCount} old reminder notifications`);
      
    } catch (error) {
      console.error('Error cleaning up old reminders:', error);
      throw error;
    }
  }
}

module.exports = ReminderService;