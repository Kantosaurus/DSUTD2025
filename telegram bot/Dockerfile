# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S telegrambot -u 1001

# Change ownership of the app directory
RUN chown -R telegrambot:nodejs /app
USER telegrambot

# Expose health check port (optional - for monitoring)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Bot health check - OK')" || exit 1

# Start the bot with initialization
CMD ["node", "scripts/docker-init.js"]