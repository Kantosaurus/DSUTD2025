/**
 * Test script for telegram notification service
 * Usage: node scripts/test-telegram-notifications.js
 */

require('dotenv').config();
const telegramNotificationService = require('../services/telegramNotificationService');

async function testNotificationService() {
  console.log('🧪 Testing Telegram Notification Service...\n');

  // Test 1: Check service connection
  console.log('1. Testing service connection...');
  const connectionTest = await telegramNotificationService.testConnection();
  
  if (connectionTest.success) {
    console.log(`✅ ${connectionTest.message}`);
    console.log(`   Bot info: ${JSON.stringify(connectionTest.botInfo, null, 2)}`);
  } else {
    console.log(`❌ ${connectionTest.message}`);
    return;
  }
  
  console.log('\n2. Testing message formatting...');
  
  // Test 2: Test message formatting
  const sampleEvent = {
    title: 'Test Event Signup',
    description: 'This is a test event to verify signup confirmations',
    event_date: '2025-08-16',
    start_time: '14:30:00',
    end_time: '16:00:00',
    location: 'Test Location',
    event_type: 'Optional'
  };

  const signupMessage = telegramNotificationService.formatSignupConfirmationMessage(sampleEvent);
  console.log('✅ Signup confirmation message formatted');
  console.log('📝 Sample message:');
  console.log('─'.repeat(60));
  console.log(signupMessage);
  console.log('─'.repeat(60));

  const cancellationMessage = telegramNotificationService.formatCancellationMessage(sampleEvent);
  console.log('\n✅ Cancellation message formatted');
  console.log('📝 Sample message:');
  console.log('─'.repeat(60));
  console.log(cancellationMessage);
  console.log('─'.repeat(60));

  // Test 3: Test with mandatory event
  console.log('\n3. Testing mandatory event formatting...');
  const mandatoryEvent = { ...sampleEvent, event_type: 'Mandatory', title: 'Mandatory Test Event' };
  const mandatoryMessage = telegramNotificationService.formatSignupConfirmationMessage(mandatoryEvent);
  console.log('✅ Mandatory event message formatted');
  console.log('📝 Sample message:');
  console.log('─'.repeat(60));
  console.log(mandatoryMessage);
  console.log('─'.repeat(60));

  console.log('\n🎉 All tests completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Register with the telegram bot: /register YOUR_STUDENT_ID');
  console.log('2. Sign up for an event via the website');
  console.log('3. Check that you receive a confirmation message');
  console.log('4. Cancel the signup and verify cancellation message');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

testNotificationService().catch(error => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});