# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
# to install dependencies
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application (if applicable)
RUN npm run build

# Install serve globally to serve static files
# This is useful if you're serving a static site or a built React app
RUN npm install -g serve

# Expose the port your Node.js app listens on (e.g., 3000)
EXPOSE 3000

# Command to run the application
# This assumes your build output is in the 'dist' directory
CMD ["serve", "-s", "dist", "-l", "3000"]