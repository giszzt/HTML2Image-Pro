# Use official Playwright image to ensure all OS dependencies are met
# Using jammy (Ubuntu 22.04) as base
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

# Set working directory in the container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Microsoft YaHei fonts (copied from local Windows system)
COPY fonts/*.ttc /usr/share/fonts/truetype/msyh/
RUN fc-cache -fv

# Install dependencies
RUN npm install

# Install Chromium specifically (we only use Chromium for this app)
# This ensures the browser version matches the installed Playwright library version
RUN npx playwright install chromium

# Copy the rest of the application code
COPY . .

# Set environment variable for port (Render.com uses 10000 by default but sets PORT env)
ENV PORT=3015

# Expose the port
EXPOSE 3015

# Start the application
CMD ["npm", "start"]
