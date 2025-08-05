export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type AudioTestResult = 'none' | 'success' | 'failed';
export type ProviderType = 'openai' | 'google';
export type ConversationType = 'question' | 'greeting' | 'feedback' | 'speaking';

export interface ConversationEntry {
  speaker: 'ai' | 'user';
  message: string;
  timestamp: number;
  type: ConversationType;
}

export interface AIAgentStatus {
  enabled: boolean;
  provider: string;
  conversational: boolean;
}

export interface VoiceSession {
  sessionId: string;
  roomName: string;
  wsUrl: string;
  participantToken: string;
  aiAgentEnabled?: boolean;
  conversationalMode?: boolean;
  agentProvider?: string;
}

export interface AudioManagerProps {
  remoteAudioTracks: any[];
  isListening: boolean;
  stopListening: () => void;
  startListening: () => void;
  isInterviewActive: boolean;
  resetTranscript: () => void;
  setIsAISpeaking: (speaking: boolean) => void;
  setUserSpeaking: (speaking: boolean) => void;
  setShowAutoplayPrompt: (show: boolean) => void;
  setAudioTestResult: (result: AudioTestResult) => void;
}