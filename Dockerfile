# Use Node.js LTS version for stability
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create data directory if it doesn't exist and ensure Word template is accessible
RUN mkdir -p data && \
    if [ ! -f "data/Group Profile CorporateHRA Scan.docx" ] && [ -f "Group Profile CorporateHRA Scan.docx" ]; then \
        cp "Group Profile CorporateHRA Scan.docx" data/; \
    fi

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "server.js"]
