FROM node:20-alpine

# Install PostgreSQL client for migrations
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]