FROM node:20-alpine

# Accept build-time argument for API URL
ARG NEXT_PUBLIC_API_URL=http://localhost:3001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Remove any existing build artifacts
RUN rm -rf .next

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 