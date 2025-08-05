import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Square, 
  MessageCircle,
  Clock,
  FileText,
  Send,
  Loader,
  Wifi,
  WifiOff,
  AlertCircle,
  Phone,
  PhoneOff,
  Users,
  Signal,
  StopCircle,
  Settings,
  Brain,
  Zap,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { InterviewConfig } from '../types/index';
import { AIInterviewSimulator } from '../utils/aiSimulator';
import { useLiveKit } from '../hooks/useLiveKit';
import { VoiceInterviewService } from '../services/voiceInterviewService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { toPythonInterviewConfig } from '../services/apiService';

interface VoiceInterviewScreenProps {
  config: InterviewConfig;
  onEndInterview: (simulator: AIInterviewSimulator) => void;
  onBackToConfig: () => void;
}

export const VoiceInterviewScreen: React.FC<VoiceInterviewScreenProps> = ({
  config,
  onEndInterview,
  onBackToConfig
}) => {
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
  
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: speechSupported
  } = useSpeechRecognition();

  // Handle data messages from AI agent
  const handleDataMessage = useCallback((data: any) => {
    console.log('[VoiceInterview] 📨 Received data message:', data);
    
    if (data.type === 'question' && data.text) {
      setCurrentQuestion(data.text);
      setConversationHistory(prev => [...prev, {
        speaker: 'ai',
        message: data.text,
        timestamp: Date.now(),
        type: 'question'
      }]);
    } else if (data.type === 'greeting' && data.text) {
      setCurrentQuestion(data.text);
      setConversationHistory(prev => [...prev, {
        speaker: 'ai',
        message: data.text,
        timestamp: Date.now(),
        type: 'greeting'
      }]);
    } else if (data.type === 'feedback' && data.text) {
      setConversationHistory(prev => [...prev, {
        speaker: 'ai',
        message: data.text,
        timestamp: Date.now(),
        type: 'feedback'
      }]);
    }
  }, []);

  // Create LiveKit props using the backend-provided URL when we have a session
  const livekitProps = voiceSession && voiceSession.participantToken ? {
    wsUrl: voiceSession.wsUrl,
    token: voiceSession.participantToken,
    onConnected: () => {
      setConnectionStatus('connected');
      console.log('[VoiceInterview] ✅ Connected to LiveKit room');
    },
    onDisconnected: () => {
      setConnectionStatus('disconnected');
      console.log('[VoiceInterview] ❌ Disconnected from LiveKit room');
    },
    onError: (error: Error) => {
      setConnectionStatus('error');
      console.error('[VoiceInterview] ❌ LiveKit error:', error);
    },
    onDataMessageReceived: handleDataMessage
  } : null;

  // Only initialize LiveKit hook when we have valid props
  const {
    room,
    isConnected: livekitConnected,
    isConnecting: livekitConnecting,
    error: livekitError,
    localAudioTrack,
    remoteAudioTracks,
    connect: connectLiveKit,
    disconnect: disconnectLiveKit,
    startAudio,
    stopAudio,
    sendDataMessage
  } = useLiveKit(livekitProps || {
    wsUrl: '',
    token: '',
    onConnected: () => {},
    onDisconnected: () => {},
    onError: () => {},
    onDataMessageReceived: () => {}
  });

  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Initialize audio context and speech synthesis
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // 🔁 Close any existing context (important for repeated tests)
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          await audioContextRef.current.close();
          console.log('🎧 Closed previous AudioContext');
        }
        // ✅ Create a new AudioContext
        audioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
        console.log('🎧 New AudioContext initialized');

        // Initialize Speech Synthesis for fallback TTS
        if ('speechSynthesis' in window) {
          speechSynthesisRef.current = window.speechSynthesis;
          console.log('🗣️ Speech Synthesis initialized');
        }

      } catch (error) {
        console.error('❌ Error initializing audio:', error);
      }
    };
    
    // Call the initialize function
    void initializeAudio();

    return () => {
      console.log('🧹 Running cleanup on unmount or interview end');

      // Stop and remove all audio elements
      audioElementsRef.current.forEach(audio => {
        try {
          audio.pause();
          audio.srcObject = null;
          audio.remove();
        } catch (e) {
          console.warn('Error cleaning up audio element:', e);
        }
      });
      audioElementsRef.current.clear();

        // Stop local audio track
      if (localAudioTrack) {
        try {
          localAudioTrack.stop();
          console.log('🎤 Local audio track stopped');
        } catch (e) {
          console.warn('Error stopping local audio track:', e);
        }
      }

      // Cancel speech synthesis if active
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }

        // Close and reset audio context
      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            console.log('🎧 AudioContext closed');
          }
        } catch (e) {
          console.warn('Error closing AudioContext:', e);
        } finally {
          audioContextRef.current = null;
        }
      }
        // Disconnect from LiveKit room
      if (disconnectLiveKit) {
        try {
          disconnectLiveKit();
          console.log('📡 LiveKit room disconnected');
        } catch (e) {
          console.warn('Error disconnecting LiveKit room:', e);
        }
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInterviewActive && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isInterviewActive, startTime]);


  const playWithRetry = async (audioElement: HTMLAudioElement, retries = 3) => {
    try {
      await audioElement.play();
      console.log('✅ Audio played successfully');
    } catch (error: any) {
      console.warn(`⚠️ play() failed (${4 - retries}/3):`, error);
      if (retries > 0) {
        setTimeout(() => {
            void playWithRetry(audioElement, retries - 1);
            }, 600);
      } else {
        setShowAutoplayPrompt(true);
      }
    }
  };


  // Enhanced remote audio track handling with proper audio playback and autoplay detection
  useEffect(() => {
    if (remoteAudioTracks.length > 0) {
      console.log(`🎵 Processing ${remoteAudioTracks.length} remote audio tracks`);
      
      remoteAudioTracks.forEach((track, index) => {
        const trackId = track.sid || `track-${index}`;
        
        // Check if we already have an audio element for this track
        if (!audioElementsRef.current.has(trackId)) {
          console.log(`🎵 Creating new audio element for track: ${trackId}`);
          
          // Create audio element
          const audioElement = document.createElement('audio') as any;
          audioElement.autoplay = true;
          audioElement.playsInline = true;
          audioElement.volume = 1.0;
          
          // Set up event listeners
          audioElement.onplay = () => {
            console.log(`🎵 Audio started playing for track: ${trackId}`);
            setIsAISpeaking(true);
            setUserSpeaking(false);
            setShowAutoplayPrompt(false);
            // Stop user listening when AI starts speaking
            if (isListening) {
              stopListening();
            }
            // Clear transcript when AI starts speaking
            resetTranscript();
          };
          
          audioElement.onended = () => {
            console.log(`🎵 Audio ended for track: ${trackId}`);
            setIsAISpeaking(false);
            // Resume listening after AI finishes speaking
            setTimeout(() => {
              if (isInterviewActive && !isListening) {
                startListening();
                setUserSpeaking(false);
              }
            }, 500);
          };
          
          audioElement.onpause = () => {
            console.log(`🎵 Audio paused for track: ${trackId}`);
            setIsAISpeaking(false);
          };
          
          audioElement.onerror = (error: any) => {
            console.error(`❌ Audio error for track ${trackId}:`, error);
            setIsAISpeaking(false);
          };
          
          audioElement.onloadstart = () => {
            console.log(`🎵 Audio loading started for track: ${trackId}`);
          };
          
          audioElement.oncanplay = () => {
            console.log(`🎵 Audio can play for track: ${trackId}`);
          };
          
          // Attach the track to the audio element
          try {
            track.attach(audioElement);
            console.log(`🎵 Track attached to audio element: ${trackId}`);
            
            // Add to DOM (hidden)
            audioElement.style.display = 'none';
            document.body.appendChild(audioElement);
            
            // Store reference
            audioElementsRef.current.set(trackId, audioElement);
            
            // Force play if needed (handle autoplay restrictions)
            playWithRetry(audioElement);
            
          } catch (attachError) {
            console.error(`❌ Error attaching track ${trackId}:`, attachError);
          }
        }
      });
    }

    // Cleanup removed tracks
    const currentTrackIds = new Set(remoteAudioTracks.map((track, index) => track.sid || `track-${index}`));
    audioElementsRef.current.forEach((audioElement, trackId) => {
      if (!currentTrackIds.has(trackId)) {
        console.log(`🗑️ Cleaning up audio element for removed track: ${trackId}`);
        audioElement.pause();
        audioElement.remove();
        audioElementsRef.current.delete(trackId);
      }
    });

  }, [remoteAudioTracks, isListening, stopListening, startListening, isInterviewActive, resetTranscript]);
  
  // Audio level monitoring
  useEffect(() => {
    if (localAudioTrack) {
      const analyzeAudio = () => {
        setAudioLevel(Math.random() * 100);
      };
      
      const interval = setInterval(analyzeAudio, 100);
      return () => clearInterval(interval);
    }
  }, [localAudioTrack]);

  // Update connection status based on LiveKit state
  useEffect(() => {
    if (!livekitProps) {
      return;
    }
    
    if (livekitConnecting) {
      setConnectionStatus('connecting');
    } else if (livekitConnected) {
      setConnectionStatus('connected');
    } else if (livekitError) {
      setConnectionStatus('error');
    } else if (voiceSession) {
      setConnectionStatus('disconnected');
    }
  }, [livekitConnecting, livekitConnected, livekitError, voiceSession, livekitProps]);

  // Effect to handle LiveKit connection after session is set
  useEffect(() => {
    if (voiceSession && voiceSession.participantToken && !livekitReady) {
      console.log('[VoiceInterview] Session ready, preparing LiveKit connection');
      setLivekitReady(true);

      setTimeout(async () => {
        try {
          console.log('[VoiceInterview] ========== ATTEMPTING LIVEKIT CONNECTION ==========');
          
          await connectLiveKit();
          if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
          console.log('🎧 AudioContext resumed after connect');
          }
          setIsInterviewActive(true);
          setStartTime(Date.now());
          setIsThinking(false);
          
          // Start listening after connection
          setTimeout(() => {
            if (speechSupported && !isListening) {
              startListening();
              setUserSpeaking(true);
            }
          }, 1000);
          
          console.log('[VoiceInterview] ✅ Voice interview started successfully');
        } catch (connectError) {
          console.error('[VoiceInterview] ❌ Failed to connect to LiveKit:', connectError);
          setConnectionStatus('error');
          setIsThinking(false);
          alert(`Failed to connect to voice interview: ${connectError instanceof Error ? connectError.message : 'Unknown error'}`);
        }
      }, 200);
    }
    // Only run once when voiceSession and livekitReady change from false to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceSession, livekitReady]);

  // Handle transcript changes
  useEffect(() => {
    if (transcript && transcript.trim().length > 0) {
      setUserSpeaking(true);
      
      // Add user speech to conversation history
      const lastEntry = conversationHistory[conversationHistory.length - 1];
      if (!lastEntry || lastEntry.speaker !== 'user' || lastEntry.type !== 'speaking') {
        setConversationHistory(prev => [...prev, {
          speaker: 'user',
          message: transcript,
          timestamp: Date.now(),
          type: 'speaking'
        }]);
      } else {
        // Update the last user entry
        setConversationHistory(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            message: transcript,
            timestamp: Date.now()
          };
          return updated;
        });
      }
    }
  }, [transcript, conversationHistory]);

  // Enable audio function for autoplay prompt
const enableAudio = async () => {
  try {
    // Resume AudioContext if it's suspended
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
      console.log('🎧 AudioContext resumed');
    }

    // Try playing all audio tracks
    audioElementsRef.current.forEach(audioElement => {
      audioElement.play().catch((error: any) => {
        console.error('Failed to enable audio:', error);
      });
    });

    setShowAutoplayPrompt(false);
  } catch (error) {
    console.error('Error in enableAudio:', error);
  }
};


  // Fallback Text-to-Speech function
  const speakTextFallback = (text: string) => {
    if (speechSynthesisRef.current) {
      // Cancel any ongoing speech
      speechSynthesisRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Try to use a female voice
      const voices = speechSynthesisRef.current.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('woman') ||
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('karen')
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      
      utterance.onstart = () => {
        console.log('🗣️ Fallback TTS started');
        setIsAISpeaking(true);
        setAudioTestResult('success');
        if (isListening) {
          stopListening();
        }
      };
      
      utterance.onend = () => {
        console.log('🗣️ Fallback TTS ended');
        setIsAISpeaking(false);
        setTimeout(() => {
          if (isInterviewActive && !isListening) {
            startListening();
          }
        }, 500);
      };
      
      utterance.onerror = (error: any) => {
        console.error('❌ Fallback TTS error:', error);
        setIsAISpeaking(false);
        setAudioTestResult('failed');
      };
      
      speechSynthesisRef.current.speak(utterance);
      console.log('🗣️ Speaking with fallback TTS:', text.substring(0, 50) + '...');
    }
  };



  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Local utility to convert snake_case keys to camelCase (shallow, for session object)
  function camelCaseSession(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const toCamel = (s: string) =>
      s.replace(/([-_][a-z])/g, group =>
        group.toUpperCase().replace('-', '').replace('_', '')
      );
    const result: any = {};
    for (const key in obj) {
      result[toCamel(key)] = obj[key];
    }
    return result;
  }

  const startVoiceInterview = async () => {
    try {
      setIsThinking(true);
      setConnectionStatus('connecting');
      setShowEndConfirmation(false);


      // ✅ Resume AudioContext if needed
      if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
      console.log('🎧 AudioContext resumed in startVoiceInterview');
      }
      
      console.log('[VoiceInterview] ========== STARTING VOICE INTERVIEW ==========');
      console.log('[VoiceInterview] Selected provider:', selectedProvider);
      console.log('[VoiceInterview] participant name:', participantName);

      
      const session = await VoiceInterviewService.startVoiceInterview(
        config,
        participantName,
        true,
        selectedProvider
      );

      if (!session) {
        throw new Error('No session received from backend');
      }

      // Defensive: log session object and check for participantToken
      console.log('[VoiceInterview] Session object:', session);

      const participantToken = session.participantToken;
      if (!participantToken) {
        throw new Error('No participant token received from backend');
      }

      // Set the session
      setVoiceSession(session);
      setAiAgentStatus({
        enabled: session.aiAgentEnabled,
        provider: session.agentProvider,
        conversational: session.conversationalMode
      });

      // Clear conversation history - it will be populated by data messages
      setConversationHistory([]);
      setCurrentQuestion('');

    } catch (error) {
      console.error('[VoiceInterview] ❌ Error starting voice interview:', error);
      setConnectionStatus('error');
      setIsThinking(false);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to start voice interview: ${errorMessage}`);
    }
  };

  const endInterview = async () => {
    setIsInterviewActive(false);
    stopListening();
    
    // Stop all audio
    audioElementsRef.current.forEach(audio => {
      audio.pause();
    });
    
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
    
    if (livekitProps) {
      stopAudio();
      disconnectLiveKit();
    }
    
    // Call backend to end the voice interview session (triggers agent goodbye)
    try {
      await fetch('/api/voice-interview/end', {
        method: 'POST'
      });
    } catch (error) {
      console.error('[VoiceInterview] Error sending end signal to backend:', error);
    }

    if (voiceSession) {
      try {
        await VoiceInterviewService.endInterview(voiceSession.sessionId);
      } catch (error) {
        console.error('[VoiceInterview] Error ending interview:', error);
      }
    }
    
    onEndInterview(simulator);
  };

// Handle browser/tab close during interview
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isInterviewActive) {
      // Optionally show a confirmation dialog (not always supported)
      e.preventDefault();
      e.returnValue = '';
      // End interview cleanly
      endInterview();
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [isInterviewActive, endInterview]);


  const handleEndInterviewClick = () => {
    setShowEndConfirmation(true);
  };

  const confirmEndInterview = () => {
    setShowEndConfirmation(false);
    endInterview();
  };

  const cancelEndInterview = () => {
    setShowEndConfirmation(false);
  };

  const toggleMicrophone = async () => {
    if (isListening) {
      stopListening();
      setUserSpeaking(false);
      if (livekitProps) {
        stopAudio();
      }
    } else {
      if (livekitProps) {
        await startAudio();
      }
      startListening();
      setUserSpeaking(true);
    }
  };

  const testAudio = () => {
    const testMessage = "This is a test of the audio system. If you can hear this, the audio is working correctly.";
    setAudioTestResult('none');
    speakTextFallback(testMessage);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'connecting': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Voice Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  const progress = simulator.getProgress();

  // Safe participant count with null checks
  const participantCount = room?.numParticipants ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">

          {/* Interview Starting Modal */}
          {isThinking && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-xl flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Loader className="w-8 h-8 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Interview Starting...</h3>
                <p className="text-gray-600 mb-4 text-center">
                  Please wait, your interview will start in a few seconds.<br />
                  The AI interviewer is joining the meeting.
                </p>
              </div>
            </div>
          )}

          {/* Autoplay Prompt Modal */}
          {showAutoplayPrompt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md mx-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Volume2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Enable Audio</h3>
                  <p className="text-gray-600 mb-6">
                    Your browser requires user interaction to play audio. Click the button below to enable audio for the AI interviewer.
                  </p>
                  <button
                    onClick={enableAudio}
                    className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all"
                  >
                    <Volume2 className="w-4 h-4 mr-2 inline" />
                    Enable Audio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* End Interview Confirmation Modal */}
          {showEndConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md mx-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <StopCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">End Voice Interview?</h3>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to end the voice interview? You'll receive analytics based on the conversation so far.
                  </p>
                  <div className="flex space-x-4">
                    <button
                      onClick={cancelEndInterview}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors"
                    >
                      Continue Interview
                    </button>
                    <button
                      onClick={confirmEndInterview}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                    >
                      End & Analyze
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Phone className="w-6 h-6 mr-2 text-blue-600" />
                  Voice Interview - {config.style.charAt(0).toUpperCase() + config.style.slice(1).replace('-', ' ')}
                </h1>
                <p className="text-gray-600">Topic: {config.topic}</p>
                {config.companyName && (
                  <p className="text-gray-600">Company: {config.companyName}</p>
                )}
                {aiAgentStatus && (
                  <div className="mt-2 flex items-center space-x-4 text-sm">
                    <span className="text-purple-600">
                      Powered by {aiAgentStatus.provider?.toUpperCase() || 'AI'} Agent
                    </span>
                    {aiAgentStatus.conversational && (
                      <span className="text-green-600">Conversational Mode</span>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center text-lg font-semibold text-blue-600 mb-2">
                  <Clock className="w-5 h-5 mr-2" />
                  {formatTime(elapsedTime)}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Duration: {config.duration} minutes
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getConnectionStatusColor()}`}>
                  {connectionStatus === 'connecting' ? (
                    <Loader className="w-4 h-4 mr-1 animate-spin" />
                  ) : connectionStatus === 'connected' ? (
                    <Signal className="w-4 h-4 mr-1" />
                  ) : connectionStatus === 'error' ? (
                    <AlertCircle className="w-4 h-4 mr-1" />
                  ) : (
                    <WifiOff className="w-4 h-4 mr-1" />
                  )}
                  {getConnectionStatusText()}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {connectionStatus === 'error' && livekitError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-red-800 text-sm">
                    <p className="font-medium mb-1">Connection Error</p>
                    <p className="mb-2">
                      {/* Fix: livekitError may be a string or an object */}
                      {typeof livekitError === 'string'
                        ? livekitError
                        : (livekitError as any)?.message || String(livekitError)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Question {progress.current} of {progress.total}
                </span>
                <span className="text-sm text-gray-600">
                  {Math.round(progress.percentage)}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>

            {/* Voice Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {!isInterviewActive ? (
                  <>
                    <button
                      // Remove onClick={() => setShowProviderSelection(true)}
                      onClick={startVoiceInterview}
                      disabled={isThinking}
                      className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all disabled:opacity-50"
                    >
                      {isThinking ? (
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Phone className="w-4 h-4 mr-2" />
                      )}
                      {startTime ? 'Resume Voice Interview' : 'Start Voice Interview'}
                    </button>
                    
                    <button
                      onClick={testAudio}
                      className="inline-flex items-center px-4 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 transition-all"
                    >
                      <Volume2 className="w-4 h-4 mr-2" />
                      Test Audio
                      {audioTestResult === 'success' && <CheckCircle className="w-4 h-4 ml-2 text-green-300" />}
                      {audioTestResult === 'failed' && <XCircle className="w-4 h-4 ml-2 text-red-300" />}
                    </button>
                  </>
                ) : (
                  // Pause Interview button removed
                  null
                )}
                
                <button
                  onClick={handleEndInterviewClick}
                  className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transition-all"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  End Interview
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-600">
                  Participants: {participantCount}
                </div>
                <Users className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interviewer Question */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-4">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Interviewer Question</h3>
                    <p className="text-sm text-gray-600 flex items-center">
                      <span className="mr-2">(Real-time)</span>
                      {isAISpeaking && (
                        <span className="text-purple-600 flex items-center">
                          <Volume2 className="w-4 h-4 mr-1" />
                          AI Speaking
                        </span>
                      )}
                      {userSpeaking && !isAISpeaking && (
                        <span className="text-green-600 flex items-center">
                          <Mic className="w-4 h-4 mr-1" />
                          You're Speaking
                        </span>
                      )}
                      {!isAISpeaking && !userSpeaking && isInterviewActive && (
                        <span className="text-blue-600 flex items-center">
                          <Signal className="w-4 h-4 mr-1" />
                          Listening...
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Show only the latest AI question/message, or fallback to currentQuestion */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 min-h-[120px] max-h-[200px] overflow-y-auto flex items-center">
                  {(() => {
                    // Find the last AI message (question/greeting/feedback)
                    const lastAI = [...conversationHistory].reverse().find(
                      entry => entry.speaker === 'ai'
                    );
                    // Show last AI message if available
                    if (lastAI) {
                      return (
                        <div className="w-full">
                          <div className="flex items-center mb-2">
                            <Brain className="w-5 h-5 text-purple-600 mr-2" />
                            <span className="font-semibold text-purple-900">AI Interviewer</span>
                            <span className="text-xs opacity-70 ml-2">
                              {new Date(lastAI.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-gray-800">{lastAI.message}</p>
                          {lastAI.type && (
                            <span className={`text-xs px-2 py-1 rounded-full mt-2 inline-block ${
                              lastAI.type === 'greeting' ? 'bg-green-100 text-green-700' :
                              lastAI.type === 'question' ? 'bg-blue-100 text-blue-700' :
                              lastAI.type === 'feedback' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {lastAI.type}
                            </span>
                          )}
                        </div>
                      );
                    }
                    // Fallback: show currentQuestion if no AI message in conversationHistory
                    if (currentQuestion && currentQuestion.trim().length > 0) {
                      return (
                        <div className="w-full">
                          <div className="flex items-center mb-2">
                            <Brain className="w-5 h-5 text-purple-600 mr-2" />
                            <span className="font-semibold text-purple-900">AI Interviewer</span>
                          </div>
                          {/* Show currentQuestion and also the latest AI transcript if available */}
                          <p className="text-gray-800">
                            {currentQuestion}
                            {/* Show the latest AI transcript if available */}
                            {isAISpeaking && transcript && (
                              <span className="block mt-2 text-purple-700 font-mono">
                                {transcript}
                              </span>
                            )}
                          </p>
                        </div>
                      );
                    }
                    // Only show the static message if interview is NOT active
                    if (!isInterviewActive) {
                      return (
                        <div className="flex items-center justify-center w-full text-gray-500">
                          <Phone className="w-8 h-8 mr-3" />
                          <span>Click "Start Voice Interview" to begin the conversation</span>
                        </div>
                      );
                    }
                    // If interview is active but no AI message, show "Waiting for interviewer..."
                    return (
                      <div className="flex items-center justify-center w-full text-gray-400">
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        <span>Waiting for interviewer...</span>
                      </div>
                    );
                  })()}
                </div>
              
              {/* User Response */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Mic className="w-5 h-5 mr-2 text-blue-600" />
                  User Response
                </h3>
                <div className="space-y-4">
                  {/* Live Transcript */}
                  <div className="bg-gray-50 rounded-xl p-4 min-h-[80px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Live Transcript</span>
                      {isListening && (
                        <div className="flex items-center text-sm text-green-600">
                          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse mr-2"></div>
                          AI Managed
                        </div>
                      )}
                    </div>
                    <p className="text-gray-800">
                      {/* Only show transcript if user is speaking */}
                      {userSpeaking && transcript
                        ? transcript
                        : 'Your speech will appear here in real-time...'}
                    </p>
                  </div>

                  {/* Audio Level Indicator */}
                  {localAudioTrack && (
                    <div className="flex items-center space-x-3">
                      <Volume2 className="w-5 h-5 text-gray-600" />
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-100"
                          style={{ width: `${audioLevel}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{Math.round(audioLevel)}%</span>
                    </div>
                  )}

                  {/* Voice Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {speechSupported && (
                        <button
                          onClick={toggleMicrophone}
                          disabled={!isInterviewActive || connectionStatus !== 'connected'}
                          className={`p-4 rounded-xl transition-all ${
                            isListening
                              ? 'bg-green-100 text-green-600'
                              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                        </button>
                      )}
                      <div className="text-sm text-gray-600">
                        {/* Show "Unmuted" if listening, otherwise prompt to unmute */}
                        {isListening ? "Unmuted, you may speak" : "Please unmute to answer"}
                      </div>
                    </div>
                    {/* Remove the "Powered by GOOGLE Agent" message */}
                  </div>
                </div>
              </div>
            </div>
            {/* Notes Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <FileText className="w-5 h-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Interview Notes</h3>
              </div>
              
              <textarea
                ref={notesRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Jot down key points, thoughts, or reminders during the voice interview..."
                className="w-full h-64 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
              />
              
              <div className="mt-4 text-xs text-gray-500">
                Your notes will be saved and available in the analytics section.
              </div>

              {/* AI Status */}
              <div className="mt-6 p-4 bg-purple-50 rounded-xl">
                <h4 className="font-medium text-purple-900 mb-2">{aiAgentStatus?.provider?.toUpperCase() || 'AI'} Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-700">LiveKit:</span>
                    <span className={connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}>
                      {getConnectionStatusText()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Audio Track:</span>
                    <span className={localAudioTrack ? 'text-green-600' : 'text-gray-600'}>
                      {localAudioTrack ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Remote Audio:</span>
                    <span className={remoteAudioTracks.length > 0 ? 'text-green-600' : 'text-gray-600'}>
                      {remoteAudioTracks.length} tracks
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">AI Agent:</span>
                    <span className={aiAgentStatus?.enabled ? 'text-green-600' : 'text-red-600'}>
                      {aiAgentStatus?.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Mode:</span>
                    <span className="text-green-600">
                      {aiAgentStatus?.conversational ? 'Conversational' : 'Standard'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Provider:</span>
                    <span className="text-purple-600">
                      {aiAgentStatus?.provider?.toUpperCase() || 'Not Set'}
                    </span>
                  </div>
                  {voiceSession && (
                    <div className="mt-3 pt-2 border-t border-purple-200">
                      <div className="text-xs text-purple-600">
                        <div><strong>Session:</strong> {voiceSession.sessionId}</div>
                        <div><strong>Room:</strong> {voiceSession.roomName}</div>
                        <div><strong>Token Length:</strong> {voiceSession.participantToken?.length || 0}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
    