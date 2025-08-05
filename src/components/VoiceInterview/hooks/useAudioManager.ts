import { useEffect, useCallback, useRef } from 'react';
import { RemoteAudioTrack } from 'livekit-client';
import type { AudioManagerProps } from '../types';

interface UseAudioManagerProps extends AudioManagerProps {
  remoteAudioTracks: RemoteAudioTrack[];
}

export const useAudioManager = ({
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
}: UseAudioManagerProps) => {
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

  // Initialize audio context and speech synthesis
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          await audioContextRef.current.close();
        }
        audioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
        
        if ('speechSynthesis' in window) {
          speechSynthesisRef.current = window.speechSynthesis;
        }
      } catch (error) {
        console.error('❌ Error initializing audio:', error);
      }
    };
    
    void initializeAudio();

    return () => {
      // Cleanup audio resources
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

      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }

      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
          }
        } catch (e) {
          console.warn('Error closing AudioContext:', e);
        } finally {
          audioContextRef.current = null;
        }
      }
    };
  }, []);

  const playWithRetry = useCallback(async (audioElement: HTMLAudioElement, retries = 3) => {
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
  }, [setShowAutoplayPrompt]);

  // Handle remote audio tracks
  useEffect(() => {
    if (remoteAudioTracks.length > 0) {
      console.log(`🎵 Processing ${remoteAudioTracks.length} remote audio tracks`);
      
      remoteAudioTracks.forEach((track, index) => {
        const trackId = track.sid || `track-${index}`;
        
        if (!audioElementsRef.current.has(trackId)) {
          const audioElement = document.createElement('audio') as any;
          audioElement.autoplay = true;
          audioElement.playsInline = true;
          audioElement.volume = 1.0;
          
          audioElement.onplay = () => {
            setIsAISpeaking(true);
            setUserSpeaking(false);
            setShowAutoplayPrompt(false);
            if (isListening) {
              stopListening();
            }
            resetTranscript();
          };
          
          audioElement.onended = () => {
            setIsAISpeaking(false);
            setTimeout(() => {
              if (isInterviewActive && !isListening) {
                startListening();
                setUserSpeaking(false);
              }
            }, 500);
          };
          
          audioElement.onpause = () => setIsAISpeaking(false);
          audioElement.onerror = (error: any) => {
            console.error(`❌ Audio error for track ${trackId}:`, error);
            setIsAISpeaking(false);
          };
          
          try {
            track.attach(audioElement);
            audioElement.style.display = 'none';
            document.body.appendChild(audioElement);
            audioElementsRef.current.set(trackId, audioElement);
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
        audioElement.pause();
        audioElement.remove();
        audioElementsRef.current.delete(trackId);
      }
    });
  }, [remoteAudioTracks, isListening, stopListening, startListening, isInterviewActive, resetTranscript, setIsAISpeaking, setUserSpeaking, setShowAutoplayPrompt, playWithRetry]);

  const enableAudio = useCallback(async () => {
    try {
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      audioElementsRef.current.forEach(audioElement => {
        audioElement.play().catch((error: any) => {
          console.error('Failed to enable audio:', error);
        });
      });

      setShowAutoplayPrompt(false);
    } catch (error) {
      console.error('Error in enableAudio:', error);
    }
  }, [setShowAutoplayPrompt]);

  const speakTextFallback = useCallback((text: string) => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
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
        setIsAISpeaking(true);
        setAudioTestResult('success');
        if (isListening) {
          stopListening();
        }
      };
      
      utterance.onend = () => {
        setIsAISpeaking(false);
        setTimeout(() => {
          if (isInterviewActive && !isListening) {
            startListening();
          }
        }, 500);
      };
      
      utterance.onerror = () => {
        setIsAISpeaking(false);
        setAudioTestResult('failed');
      };
      
      speechSynthesisRef.current.speak(utterance);
    }
  }, [isListening, stopListening, startListening, isInterviewActive, setIsAISpeaking, setAudioTestResult]);

  return {
    audioContextRef,
    audioElementsRef,
    enableAudio,
    speakTextFallback
  };
};