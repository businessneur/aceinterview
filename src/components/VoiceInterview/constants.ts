import type { ConnectionStatus, AudioTestResult, ProviderType, ConversationType } from './types';

export const CONNECTION_STATUS: Record<string, ConnectionStatus> = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting', 
  CONNECTED: 'connected',
  ERROR: 'error'
} as const;

export const AUDIO_TEST_RESULT: Record<string, AudioTestResult> = {
  NONE: 'none',
  SUCCESS: 'success', 
  FAILED: 'failed'
} as const;

export const PROVIDER_OPTIONS: Record<string, ProviderType> = {
  OPENAI: 'openai',
  GOOGLE: 'google'
} as const;

export const CONVERSATION_TYPES: Record<string, ConversationType> = {
  QUESTION: 'question',
  GREETING: 'greeting',
  FEEDBACK: 'feedback',
  SPEAKING: 'speaking'
} as const;

export const AUDIO_CONFIG = {
  ECHO_CANCELLATION: true,
  NOISE_SUPPRESSION: true,
  AUTO_GAIN_CONTROL: true,
  SAMPLE_RATE: 48000,
  CHANNEL_COUNT: 1,
  TTS_RATE: 0.9,
  TTS_PITCH: 1.0,
  TTS_VOLUME: 1.0
} as const;

export const TIMING = {
  LIVEKIT_CONNECTION_DELAY: 200,
  LISTENING_RESUME_DELAY: 500,
  AUDIO_RETRY_DELAY: 600,
  LISTENING_START_DELAY: 1000
} as const;