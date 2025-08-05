import { useState, useRef } from 'react';
import { AIInterviewSimulator } from '../../../utils/aiSimulator';
import { InterviewConfig } from '../../../types/index';

export interface VoiceInterviewState {
  simulator: AIInterviewSimulator;
  isInterviewActive: boolean;
  notes: string;
  startTime: number | null;
  elapsedTime: number;
  isThinking: boolean;
  voiceSession: any;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  audioLevel: number;
  participantName: string;
  livekitReady: boolean;
  showEndConfirmation: boolean;
  conversationHistory: any[];
  currentQuestion: string;
  isAISpeaking: boolean;
  userSpeaking: boolean;
  aiAgentStatus: any;
  selectedProvider: 'openai' | 'google';
  showProviderSelection: boolean;
  showAutoplayPrompt: boolean;
  audioTestResult: 'none' | 'success' | 'failed';
}

export const useVoiceInterviewState = (config: InterviewConfig) => {
  const [simulator] = useState(() => new AIInterviewSimulator(config));
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceSession, setVoiceSession] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [audioLevel, setAudioLevel] = useState(0);
  const [participantName] = useState(`participant-${Date.now()}`);
  const [livekitReady, setLivekitReady] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [aiAgentStatus, setAiAgentStatus] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'google'>('google');
  const [showProviderSelection, setShowProviderSelection] = useState(false);
  const [showAutoplayPrompt, setShowAutoplayPrompt] = useState(false);
  const [audioTestResult, setAudioTestResult] = useState<'none' | 'success' | 'failed'>('none');

  // Audio management refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  return {
    // State
    simulator,
    isInterviewActive,
    notes,
    startTime,
    elapsedTime,
    isThinking,
    voiceSession,
    connectionStatus,
    audioLevel,
    participantName,
    livekitReady,
    showEndConfirmation,
    conversationHistory,
    currentQuestion,
    isAISpeaking,
    userSpeaking,
    aiAgentStatus,
    selectedProvider,
    showProviderSelection,
    showAutoplayPrompt,
    audioTestResult,
    
    // Setters
    setIsInterviewActive,
    setNotes,
    setStartTime,
    setElapsedTime,
    setIsThinking,
    setVoiceSession,
    setConnectionStatus,
    setAudioLevel,
    setLivekitReady,
    setShowEndConfirmation,
    setConversationHistory,
    setCurrentQuestion,
    setIsAISpeaking,
    setUserSpeaking,
    setAiAgentStatus,
    setSelectedProvider,
    setShowProviderSelection,
    setShowAutoplayPrompt,
    setAudioTestResult,
    
    // Refs
    audioContextRef,
    audioElementsRef,
    speechSynthesisRef,
    notesRef
  };
};