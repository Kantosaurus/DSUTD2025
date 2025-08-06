// Email configuration
const EMAIL_CONFIG = {
  VERIFICATION_CODE_EXPIRY_MINUTES: 15,
  FROM_EMAIL: process.env.EMAIL_FROM || 'noreply@dsutd2025.com',
  FROM_NAME: 'DSUTD 2025'
};

module.exports = EMAIL_CONFIG;