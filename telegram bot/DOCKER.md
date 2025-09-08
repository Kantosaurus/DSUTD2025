# Docker Setup for DSUTD Telegram Bot

The telegram bot is now fully integrated with the Docker Compose setup and will automatically start when you run the main application.

## Quick Start

From the project root directory:

```bash
# Build and start all services including the telegram bot
docker-compose up -d --build

# Check if all services are running
docker-compose ps

# View telegram bot logs
docker-compose logs -f telegram-bot
```

## Configuration

The bot uses environment variables from the root `.env` file:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Bot Configuration  
CHECK_INTERVAL_MINUTES=1
REMINDER_MINUTES_BEFORE=30
```

## Architecture in Docker

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │  Telegram Bot   │
│   (port 3000)   │◄──►│   (port 3001)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────────────────────────┐
                       │         PostgreSQL Database         │
                       │            (port 5431)              │
                       └─────────────────────────────────────┘
```

## Bot Features in Docker

✅ **Auto-initialization**: Automatically waits for database and verifies tables  
✅ **Health checks**: Docker health monitoring included  
✅ **Graceful shutdown**: Handles Docker stop signals properly  
✅ **Network isolation**: Runs in secure Docker network  
✅ **Auto-restart**: Restarts automatically if it crashes  

## Database Integration

The telegram bot tables are included in the main `/backend/init.sql` file, so they're created automatically when the database starts.

The bot automatically:
1. Waits for the PostgreSQL database to be ready
2. Verifies required telegram bot tables exist
3. Starts monitoring for events and sending reminders

No manual setup required!

## Monitoring

### View Bot Status
```bash
# Check if bot container is running
docker-compose ps telegram-bot

# View bot logs (real-time)
docker-compose logs -f telegram-bot

# View recent bot logs
docker-compose logs --tail=50 telegram-bot
```

### Bot Health Check
```bash
# Check container health
docker inspect webapp-telegram-bot --format='{{.State.Health.Status}}'
```

### Restart Bot Only
```bash
# Restart just the telegram bot
docker-compose restart telegram-bot

# Rebuild and restart bot
docker-compose up -d --build telegram-bot
```

## Troubleshooting

### Bot Not Starting
```bash
# Check bot logs for errors
docker-compose logs telegram-bot

# Common issues:
# 1. Invalid TELEGRAM_BOT_TOKEN
# 2. Database connection problems  
# 3. Missing environment variables
```

### Database Connection Issues
```bash
# Check if database is ready
docker-compose logs postgres

# Restart database and bot
docker-compose restart postgres telegram-bot
```

### Environment Variables
```bash
# Check bot environment
docker-compose exec telegram-bot env | grep -E "(TELEGRAM|DB_|CHECK_|REMINDER_)"
```

## Development

### Running Bot Outside Docker
If you need to run the bot locally for development:

```bash
cd "telegram bot"
cp .env.example .env
# Edit .env with local database settings
npm install
npm run dev
```

### Testing
```bash
# Run tests inside Docker container
docker-compose exec telegram-bot node scripts/test-reminder.js

# Or run locally
cd "telegram bot"
node scripts/test-reminder.js [CHAT_ID]
```

## Security Notes

🔒 **Environment Variables**: Bot token and database credentials are passed securely via Docker environment  
🔒 **Network Isolation**: Bot runs in isolated Docker network  
🔒 **Non-root User**: Container runs as non-privileged user  
🔒 **No Volumes**: No sensitive files mounted from host  

## Production Deployment

For production, consider:

1. **Environment Variables**: Use Docker secrets or external secret management
2. **Logging**: Configure proper log aggregation
3. **Monitoring**: Set up health check alerts
4. **Backup**: Ensure database backups include telegram bot tables

```bash
# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Complete Service Management

```bash
# Start everything
docker-compose up -d --build

# Stop everything  
docker-compose down

# View all logs
docker-compose logs -f

# Restart specific service
docker-compose restart telegram-bot

# Scale services (if needed)
docker-compose up -d --scale telegram-bot=2
```

The telegram bot is now a fully integrated part of your DSUTD application stack! 🎉