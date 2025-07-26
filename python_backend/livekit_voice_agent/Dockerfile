# Use an official Python runtime as a parent image
# Python 3.9 or later is required for LiveKit Agents [1]
FROM python:3.11-slim

# Install PulseAudio client libraries
#RUN apt-get update && apt-get install -y pulseaudio pulseaudio-utils

# Set the PulseAudio server to the host machine
#ENV PULSE_SERVER=host.docker.internal

# Set the working directory in the container
WORKDIR /app


# Install gcc and other build dependencies.
#commented    RUN apt-get update &&     apt-get install -y     gcc     python3-dev     portaudio19-dev     && rm -rf /var/lib/apt/lists/*

# Install common runtime dependencies for C/C++ extensions
# libstdc++6: GNU Standard C++ Library (required by many C++ compiled Python packages)
# libgomp1: GNU OpenMP (Open Multi-Processing) runtime library (for parallel processing)
# Add CPU optimization libraries for better ONNX performance  
#commented
#RUN apt-get update && apt-get install -y --no-install-recommends \  
#    libstdc++6 \  
#    libgomp1 \  
#    libomp-dev \  
#    && rm -rf /var/lib/apt/lists/*


# Copy only the requirements file first to leverage Docker's build cache
COPY requirements.txt ./


# e.g., livekit-agents[google,elevenlabs,gladia,silero,turn-detector]
RUN pip install -r requirements.txt

# Copy your LiveKit voice agent script
# Copy the rest of the application code
COPY . .

# Add a command to download required models before starting the app
# This is crucial for plugins like 'turn-detector' or 'silero' [2]
RUN python livekit_voice_agent.py download-files && echo "Model files downloaded successfully"


# Command to run the LiveKit agent worker
# The 'start' command runs the agent as a worker process that registers with LiveKit server
CMD ["python", "livekit_voice_agent.py", "start"]