const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const SECURITY_CONFIG = require('../config/security');

// Rate limiting for login attempts
const loginRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (reduced from 15)
  max: 50, // 50 attempts per 5 minutes (significantly increased)
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Slow down for login attempts
const loginSlowDown = slowDown({
  windowMs: 5 * 60 * 1000, // 5 minutes (reduced from 15)
  delayAfter: 20, // Allow 20 requests per 5 minutes without delay (significantly increased)
  delayMs: () => 250, // Add 0.25 second delay per request after delayAfter (reduced from 500ms)
  skipSuccessfulRequests: true,
  validate: { delayMs: false } // Disable the warning
});

// General rate limiting
const generalRateLimit = rateLimit({
  windowMs: SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS,
  max: SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Password reset rate limiting
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 password reset attempts per window per IP
  message: {
    error: 'Too many password reset attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Search rate limiting to prevent abuse
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 search requests per minute per IP
  message: {
    error: 'Too many search requests, please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// API endpoint rate limiting for sensitive operations
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: {
    error: 'Too many API requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginRateLimit,
  loginSlowDown,
  generalRateLimit,
  passwordResetLimiter,
  searchLimiter,
  apiLimiter
};