# Use an official python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy requirements.txt to the working directory
# This file should contain your Python dependencies
COPY requirements.txt ./

# Install Python dependencies
# Use --no-cache-dir to avoid caching the installed packages
RUN pip install -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port your Python app listens on (e.g., 5000)
# Adjust the port number as necessary for your application
EXPOSE 3001

# Command to run the application
# This assumes your main application file is named 'main.py'
# Adjust the command as necessary for your application
CMD ["python", "main.py"]