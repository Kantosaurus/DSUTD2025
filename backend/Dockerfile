FROM node:20-alpine

# Install PostgreSQL client for migrations
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies reproducibly (omit dev deps in image)
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
