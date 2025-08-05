import React, { useState, useEffect, useCallback } from 'react';
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
import { useLiveKit } from '../hooks/useLiveKit';
import { VoiceInterviewService } from '../services/voiceInterviewService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

// Import new hooks and utilities
import { useVoiceInterviewState } from './VoiceInterview/hooks/useVoiceInterviewState';
import { useAudioManager } from './VoiceInterview/hooks/useAudioManager';
import { formatTime, getConnectionStatusColor, getConnectionStatusText } from './VoiceInterview/utils';
import { CONNECTION_STATUS, TIMING, CONVERSATION_TYPES } from './VoiceInterview/constants';
import { 
  InterviewStartingModal, 
  AutoplayPromptModal, 
  EndInterviewModal 
} from './VoiceInterview/components/InterviewModals';

interface VoiceInterviewScreenProps {
  config: InterviewConfig;
  onEndInterview: (simulator: any) => void;
  onBackToConfig: () => void;
}

export const VoiceInterviewScreen: React.FC<VoiceInterviewScreenProps> = ({
  config,
  onEndInterview,
  onBackToConfig
}) => {
  // Use custom hooks for state management
  const {
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
    showAutoplayPrompt,
    audioTestResult,
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
    setShowAutoplayPrompt,
    setAudioTestResult,
    notesRef
  } = useVoiceInterviewState(config);

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
    
    const messageTypes = {
      [CONVERSATION_TYPES.QUESTION]: () => {
        setCurrentQuestion(data.text);
        setConversationHistory(prev => [...prev, {
          speaker: 'ai',
          message: data.text,
          timestamp: Date.now(),
          type: CONVERSATION_TYPES.QUESTION
        }]);
      },
      [CONVERSATION_TYPES.GREETING]: () => {
        setCurrentQuestion(data.text);
        setConversationHistory(prev => [...prev, {
          speaker: 'ai',
          message: data.text,
          timestamp: Date.now(),
          type: CONVERSATION_TYPES.GREETING
        }]);
      },
      [CONVERSATION_TYPES.FEEDBACK]: () => {
        setConversationHistory(prev => [...prev, {
          speaker: 'ai',
          message: data.text,
          timestamp: Date.now(),
          type: CONVERSATION_TYPES.FEEDBACK
        }]);
      }
    };

    if (data.type && data.text && messageTypes[data.type]) {
      messageTypes[data.type]();
    }
  }, [setCurrentQuestion, setConversationHistory]);

  // Create LiveKit props using the backend-provided URL when we have a session
  const livekitProps = voiceSession && voiceSession.participantToken ? {
    wsUrl: voiceSession.wsUrl,
    token: voiceSession.participantToken,
    onConnected: () => {
      setConnectionStatus(CONNECTION_STATUS.CONNECTED);
      console.log('[VoiceInterview] ✅ Connected to LiveKit room');
    },
    onDisconnected: () => {
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      console.log('[VoiceInterview] ❌ Disconnected from LiveKit room');
    },
    onError: (error: Error) => {
      setConnectionStatus(CONNECTION_STATUS.ERROR);
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

  // Use audio manager hook
  const { audioContextRef, enableAudio, speakTextFallback } = useAudioManager({
    remoteAudioTracks,
    isListening,
    stopListening,
    startListening,
    isInterviewActive,
    resetTranscript,
    setIsAISpeaking,
    setUserSpeaking,
    setShowAutoplayPrompt,
    setAudioTestResult
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInterviewActive && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isInterviewActive, startTime, setElapsedTime]);

  // Audio level monitoring
  useEffect(() => {
    if (localAudioTrack) {
      const analyzeAudio = () => {
        setAudioLevel(Math.random() * 100);
      };
      
      const interval = setInterval(analyzeAudio, 100);
      return () => clearInterval(interval);
    }
  }, [localAudioTrack, setAudioLevel]);

  // Update connection status based on LiveKit state
  useEffect(() => {
    if (!livekitProps) {
      return;
    }
    
    if (livekitConnecting) {
      setConnectionStatus(CONNECTION_STATUS.CONNECTING);
    } else if (livekitConnected) {
      setConnectionStatus(CONNECTION_STATUS.CONNECTED);
    } else if (livekitError) {
      setConnectionStatus(CONNECTION_STATUS.ERROR);
    } else if (voiceSession) {
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
    }
  }, [livekitConnecting, livekitConnected, livekitError, voiceSession, livekitProps, setConnectionStatus]);

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
          }, TIMING.LISTENING_START_DELAY);
          
          console.log('[VoiceInterview] ✅ Voice interview started successfully');
        } catch (connectError) {
          console.error('[VoiceInterview] ❌ Failed to connect to LiveKit:', connectError);
          setConnectionStatus(CONNECTION_STATUS.ERROR);
          setIsThinking(false);
          alert(`Failed to connect to voice interview: ${connectError instanceof Error ? connectError.message : 'Unknown error'}`);
        }
      }, TIMING.LIVEKIT_CONNECTION_DELAY);
    }
  }, [voiceSession, livekitReady, connectLiveKit, audioContextRef, setIsInterviewActive, setStartTime, setIsThinking, speechSupported, isListening, startListening, setUserSpeaking, setConnectionStatus, setLivekitReady]);

  // Handle transcript changes
  useEffect(() => {
    if (transcript && transcript.trim().length > 0) {
      setUserSpeaking(true);
      
      // Add user speech to conversation history
      const lastEntry = conversationHistory[conversationHistory.length - 1];
      if (!lastEntry || lastEntry.speaker !== 'user' || lastEntry.type !== CONVERSATION_TYPES.SPEAKING) {
        setConversationHistory(prev => [...prev, {
          speaker: 'user',
          message: transcript,
          timestamp: Date.now(),
          type: CONVERSATION_TYPES.SPEAKING
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
  }, [transcript, conversationHistory, setUserSpeaking, setConversationHistory]);

  // Handle browser/tab close during interview
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isInterviewActive) {
        e.preventDefault();
        e.returnValue = '';
        endInterview();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isInterviewActive]);

  const startVoiceInterview = async () => {
    try {
      setIsThinking(true);
      setConnectionStatus(CONNECTION_STATUS.CONNECTING);
      setShowEndConfirmation(false);

      // Resume AudioContext if needed
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
      setConnectionStatus(CONNECTION_STATUS.ERROR);
      setIsThinking(false);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to start voice interview: ${errorMessage}`);
    }
  };

  const endInterview = async () => {
    setIsInterviewActive(false);
    stopListening();
    
    if (livekitProps) {
      stopAudio();
      disconnectLiveKit();
    }
    
    // Call backend to end the voice interview session
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

  const progress = simulator.getProgress();
  const participantCount = room?.numParticipants ?? 0;

  const renderCurrentQuestion = () => {
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
              lastAI.type === CONVERSATION_TYPES.GREETING ? 'bg-green-100 text-green-700' :
              lastAI.type === CONVERSATION_TYPES.QUESTION ? 'bg-blue-100 text-blue-700' :
              lastAI.type === CONVERSATION_TYPES.FEEDBACK ? 'bg-yellow-100 text-yellow-700' :
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
          <p className="text-gray-800">{currentQuestion}</p>
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">

          {/* Modals */}
          <InterviewStartingModal isVisible={isThinking} />
          <AutoplayPromptModal 
            isVisible={showAutoplayPrompt} 
            onEnableAudio={enableAudio} 
          />
          <EndInterviewModal 
            isVisible={showEndConfirmation}
            onConfirm={confirmEndInterview}
            onCancel={cancelEndInterview}
          />

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
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getConnectionStatusColor(connectionStatus)}`}>
                  {connectionStatus === CONNECTION_STATUS.CONNECTING ? (
                    <Loader className="w-4 h-4 mr-1 animate-spin" />
                  ) : connectionStatus === CONNECTION_STATUS.CONNECTED ? (
                    <Signal className="w-4 h-4 mr-1" />
                  ) : connectionStatus === CONNECTION_STATUS.ERROR ? (
                    <AlertCircle className="w-4 h-4 mr-1" />
                  ) : (
                    <WifiOff className="w-4 h-4 mr-1" />
                  )}
                  {getConnectionStatusText(connectionStatus)}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {connectionStatus === CONNECTION_STATUS.ERROR && livekitError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-red-800 text-sm">
                    <p className="font-medium mb-1">Connection Error</p>
                    <p className="mb-2">
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
                ) : null}
                
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

                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 min-h-[120px] max-h-[200px] overflow-y-auto flex items-center">
                  {renderCurrentQuestion()}
                </div>
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
                          disabled={!isInterviewActive || connectionStatus !== CONNECTION_STATUS.CONNECTED}
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
                        {isListening ? "Unmuted, you may speak" : "Please unmute to answer"}
                      </div>
                    </div>
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
                    <span className={connectionStatus === CONNECTION_STATUS.CONNECTED ? 'text-green-600' : 'text-red-600'}>
                      {getConnectionStatusText(connectionStatus)}
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
  );
};