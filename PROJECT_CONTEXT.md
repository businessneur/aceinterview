# Project Context: AI Interview Practice Platform

This document provides a high-level overview of the AI Interview Practice Platform, a comprehensive application designed for practicing interviews with an AI-powered interviewer. The platform leverages real-time voice communication, dynamic question generation, and intelligent feedback to create a realistic and effective interview experience.

## 1. Core Features

*   **LiveKit Voice Interviews:** Real-time voice communication using LiveKit's WebRTC infrastructure, featuring an AI-powered voice interviewer that speaks questions and listens to responses.
*   **LLM-Powered Question Generation:** Dynamic question generation based on user-defined topics, experience levels, and interview styles.
*   **Intelligent Analytics:** AI-powered response analysis, personalized feedback, and performance tracking.
*   **Multiple Interview Types:** Supports various interview formats, including technical, HR, behavioral, and case study interviews.

## 2. Tech Stack

The platform is built with a modern tech stack, comprising a React frontend, a Node.js backend, and a Python backend for AI-powered features.

### 2.1. Frontend

*   **Framework:** React 18 with TypeScript
*   **Styling:** Tailwind CSS
*   **Build Tool:** Vite
*   **Real-time Communication:** LiveKit Client SDK

### 2.2. Backend

*   **Node.js Backend:** An Express server that provides the main API for the frontend, including endpoints for generating questions, analyzing responses, and managing voice interview sessions.
*   **Python Backend:** A FastAPI application that provides AI-powered features, including question generation, response analysis, and voice agent management.

### 2.3. AI Agents

*   **Framework:** LiveKit Agents Framework (Python)
*   **Providers:** OpenAI and Google Cloud
*   **Capabilities:** Speech-to-text, text-to-speech, and real-time conversation management.

## 3. Architecture

The platform is designed with a microservices architecture, with the frontend, backend, and AI agents running as separate services.

*   **Frontend:** The React application provides the user interface for the platform, including screens for configuring interviews, conducting interviews, and viewing analytics.
*   **Backend:** The Node.js and Python backends provide the business logic for the platform, including the AI-powered features.
*   **AI Agents:** The Python-based AI agents are responsible for handling the real-time voice communication and conversation management.

## 4. Setup and Deployment

The platform is designed to be run with Docker and `docker-compose`.

*   **Docker:** The `Dockerfile` and `docker-compose.yml` files are used to build and run the platform's services.
*   **Environment Variables:** The `.env` file is used to configure the platform, including the API keys for the LLM providers and LiveKit.
*   **Scripts:** The `package.json` file contains scripts for installing dependencies, setting up the Python environment, and starting the application.

## 5. Key Files

*   `src/App.tsx`: The main component of the React application.
*   `server/index.js`: The entry point for the Node.js backend.
*   `python_backend/main.py`: The entry point for the Python backend.
*   `docker-compose.yml`: The Docker Compose file for running the platform's services.
*   `README.md`: The main documentation for the project.