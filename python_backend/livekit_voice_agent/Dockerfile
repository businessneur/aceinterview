# Use an official Python runtime as a parent image
# Python 3.9 or later is required for LiveKit Agents [1]
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy only the requirements file first to leverage Docker's build cache
COPY requirements.txt ./

# Install Python dependencies
# Use --no-cache-dir to avoid caching the installed packages
# Ensure your requirements.txt includes all LiveKit Agents and plugin dependencies
# e.g., livekit-agents[google,elevenlabs,gladia,silero,turn-detector]
RUN pip install -r requirements.txt

# Copy your LiveKit voice agent script
# Copy the rest of the application code
COPY . .

# Add a command to download required models before starting the app
# This is crucial for plugins like 'turn-detector' or 'silero' [2]
RUN python livekit_voice_agent.py download-files && \
    echo "Model files downloaded successfully"

# LiveKit agent workers communicate via WebSockets to the LiveKit server
# and do not need to expose any inbound ports to the public internet.[3, 4]
# Therefore, no EXPOSE instruction is needed for the agent worker.

# Command to run the LiveKit agent worker
# The 'start' command runs the agent as a worker process that registers with LiveKit server [4, 5]
CMD ["python", "livekit_voice_agent.py", "start"]