import { APIService, toPythonInterviewConfig } from './apiService';
import { InterviewConfig } from '../types/index';

export interface VoiceInterviewSession {
  sessionId: string;
  roomName: string;
  wsUrl: string;
  participantToken: string;
  firstQuestion?: string;
  config: InterviewConfig;
  aiAgentEnabled?: boolean;
  conversationalMode?: boolean;
  agentProvider?: string;
}

export interface VoiceResponseResult {
  responseProcessed: boolean;
  analysis?: any;
  nextQuestion?: {
    question: string;
    questionNumber: number;
    totalQuestions: number;
  };
  isComplete: boolean;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
}

export interface SessionStatus {
  found: boolean;
  sessionId?: string;
  status?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  duration?: number;
  questionsAsked?: number;
  responsesGiven?: number;
}

export class VoiceInterviewService {
  private static readonly API_BASE = '/voice-interview';
  
  /**
   * Check if we're in development mode and should allow fallback
   */
  private static isDevelopmentMode(): boolean {
    return import.meta.env.DEV || import.meta.env.MODE === 'development';
  }

  /**
   * Start a new voice interview session with provider selection
   */
  static async startVoiceInterview(
    config: InterviewConfig, 
    participantName: string,
    enableAIAgent: boolean = true,
    agentProvider: 'openai' | 'google' = 'google'
  ): Promise<VoiceInterviewSession> {
    try {
      // No case conversion here; APIService handles it
      const response = await APIService.post(`${this.API_BASE}/start`, {
        config,
        participantName,
        enableAIAgent,
        agentProvider
      });
      // Just return the response as-is (APIService returns camelCase)
      return response;
    } catch (error) {
      console.error('Error starting voice interview:', error);
      throw new Error('Failed to start voice interview. Please try again.');
    }
  }

  /**
   * Process voice response from participant
   */
  static async processVoiceResponse(
    sessionId: string,
    transcription: string,
    audioMetadata?: any
  ): Promise<VoiceResponseResult> {
    try {
      const response = await APIService.post(`${this.API_BASE}/${sessionId}/response`, {
        transcription,
        audioMetadata
      });
      return response.data;
    } catch (error) {
      console.error('Error processing voice response:', error);
      throw new Error('Failed to process voice response.');
    }
  }

  /**
   * Generate follow-up question
   */
  static async generateFollowUp(
    sessionId: string,
    responseText: string
  ): Promise<{ followUp: string; questionNumber: number; isFollowUp: boolean }> {
    try {
      const response = await APIService.post(`${this.API_BASE}/${sessionId}/followup`, {
        responseText
      });
      return response.data;
    } catch (error) {
      console.error('Error generating follow-up:', error);
      throw new Error('Failed to generate follow-up question.');
    }
  }

  /**
   * Pause interview session
   */
  static async pauseInterview(sessionId: string): Promise<{ paused: boolean; sessionId: string }> {
    try {
      const response = await APIService.post(`${this.API_BASE}/${sessionId}/pause`);
      return response.data;
    } catch (error) {
      console.error('Error pausing interview:', error);
      throw new Error('Failed to pause interview.');
    }
  }

  /**
   * Resume interview session
   */
  static async resumeInterview(sessionId: string): Promise<{ resumed: boolean; sessionId: string }> {
    try {
      const response = await APIService.post(`${this.API_BASE}/${sessionId}/resume`);
      return response.data;
    } catch (error) {
      console.error('Error resuming interview:', error);
      throw new Error('Failed to resume interview.');
    }
  }

  /**
   * End interview session
   */
  static async endInterview(sessionId: string): Promise<any> {
    try {
      const response = await APIService.post(`${this.API_BASE}/${sessionId}/end`);
      return response.data;
    } catch (error) {
      console.error('Error ending interview:', error);
      throw new Error('Failed to end interview.');
    }
  }

  /**
   * Get session status
   */
  static async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    try {
      const response = await APIService.get(`${this.API_BASE}/${sessionId}/status`);
      return response.data;
    } catch (error) {
      console.error('Error getting session status:', error);
      throw new Error('Failed to get session status.');
    }
  }

  /**
   * Reconnect to existing session
   */
  static async reconnectToSession(
    sessionId: string,
    participantName: string
  ): Promise<VoiceInterviewSession> {
    try {
      const response = await APIService.post(`${this.API_BASE}/${sessionId}/reconnect`, {
        participantName
      });
      return response.data;
    } catch (error) {
      console.error('Error reconnecting to session:', error);
      throw new Error('Failed to reconnect to session.');
    }
  }

  /**
   * Check if LiveKit is configured
   */
  static async checkLiveKitConfig(): Promise<{ configured: boolean; wsUrl?: string; aiAgent?: any; timestamp?: string }> {
    try {
      console.log('🔍 Checking LiveKit configuration...');
      console.log('🌐 API Base URL:', APIService.getBaseURL());
      
      // First, let's try to check if the backend is reachable
      try {
        const healthCheck = await APIService.checkHealth();
        console.log('🏥 Backend health check:', healthCheck);
        
        if (!healthCheck) {
          console.warn('⚠️ Backend is not healthy, LiveKit config check may fail');
        }
      } catch (healthError) {
        console.warn('⚠️ Backend health check failed:', healthError);
        
        // If backend is not reachable, try alternative endpoints
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        const alternativeUrls = [
          `${protocol}//${hostname}:3001/api`,  // Same host, backend port
          'http://localhost:3001/api',          // Local development fallback
          `${protocol}//backend:3001/api`,      // Docker service name (unlikely to work from browser)
        ];
        
        console.log('🔄 Trying alternative backend URLs...');
        for (const url of alternativeUrls) {
          try {
            console.log(`🌐 Trying: ${url}/health`);
            const response = await fetch(`${url}/health`, { 
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(3000) // 3 second timeout
            });
            
            if (response.ok) {
              console.log(`✅ Found working backend at: ${url}`);
              // Note: We can't dynamically update the API base URL here 
              // because it's already configured in APIService
              break;
            }
          } catch (altError) {
            console.log(`❌ Failed to reach: ${url} - ${altError.message}`);
          }
        }
      }
      
      // Use the relative endpoint - APIService already has the base URL configured
      const response = await APIService.get('/livekit/config');
      
      if (!response) {
        console.warn('⚠️ LiveKit config: response is undefined');
        return { configured: false };
      }
      
      console.log('📋 LiveKit Response data:', response);
      
      // Ensure we return a proper boolean for configured
      const isConfigured = Boolean(response.configured);
      console.log(`✅ LiveKit configured status: ${isConfigured}`);
      
      return {
        configured: isConfigured,
        wsUrl: response.wsUrl,
        aiAgent: response.aiAgent,
        timestamp: response.timestamp || new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error checking LiveKit config:', error);
      
      // If it's a network error, try to provide more helpful information
      if (error instanceof Error) {
        console.error('🔍 Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack?.substring(0, 500) // Limit stack trace length
        });
      }
      
      // Check if it's an axios error with more details
      if ((error as any).response) {
        const axiosError = error as any;
        console.error('🌐 HTTP Error details:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          url: axiosError.config?.url
        });
        
        // If we get a 404, the endpoint might not exist
        if (axiosError.response?.status === 404) {
          console.warn('🚫 LiveKit config endpoint not found - backend may not have LiveKit support enabled');
        }
      } else if ((error as any).request) {
        console.error('📡 Network Error: No response received from server');
        console.error('🔗 Request details:', {
          url: (error as any).config?.url,
          method: (error as any).config?.method,
          baseURL: (error as any).config?.baseURL
        });
        
        console.warn('💡 This might be a Docker networking issue. Make sure:');
        console.warn('   1. Backend service is running');
        console.warn('   2. Frontend can reach backend (check docker-compose networking)');
        console.warn('   3. Environment variables are properly set');
      }
      
      // In development mode, provide a fallback configuration
      if (this.isDevelopmentMode()) {
        console.warn('🔧 Development mode: Using fallback LiveKit configuration');
        return {
          configured: true,
          wsUrl: 'wss://test-3q4r3w5h.livekit.cloud', // From .env file
          aiAgent: { enabled: true, provider: 'google' },
          timestamp: new Date().toISOString()
        };
      }
      
      return { configured: false };
    }
  }

  /**
   * Get AI agent status
   */
  static async getAIAgentStatus(): Promise<any> {
    try {
      const response = await APIService.get('/ai-agent/status');
      return response.data;
    } catch (error) {
      console.error('Error getting AI agent status:', error);
      return { service: { enabled: false }, activeAgents: [] };
    }
  }

  /**
   * Switch AI agent provider
   */
  static async switchAIAgentProvider(provider: 'openai' | 'google'): Promise<any> {
    try {
      const response = await APIService.post('/ai-agent/switch-provider', {
        provider
      });
      return response.data;
    } catch (error) {
      console.error('Error switching AI agent provider:', error);
      throw new Error('Failed to switch AI agent provider.');
    }
  }

  /**
   * Get active sessions (admin)
   */
  static async getActiveSessions(): Promise<any[]> {
    try {
      const response = await APIService.get(`${this.API_BASE}/sessions/active`);
      return response.data.sessions;
    } catch (error) {
      console.error('Error getting active sessions:', error);
      throw new Error('Failed to get active sessions.');
    }
  }
}