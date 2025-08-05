import React from 'react';
import { Loader, Volume2, StopCircle } from 'lucide-react';

interface InterviewStartingModalProps {
  isVisible: boolean;
}

export const InterviewStartingModal: React.FC<InterviewStartingModalProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
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
  );
};

interface AutoplayPromptModalProps {
  isVisible: boolean;
  onEnableAudio: () => void;
}

export const AutoplayPromptModal: React.FC<AutoplayPromptModalProps> = ({ 
  isVisible, 
  onEnableAudio 
}) => {
  if (!isVisible) return null;

  return (
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
            onClick={onEnableAudio}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all"
          >
            <Volume2 className="w-4 h-4 mr-2 inline" />
            Enable Audio
          </button>
        </div>
      </div>
    </div>
  );
};

interface EndInterviewModalProps {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const EndInterviewModal: React.FC<EndInterviewModalProps> = ({ 
  isVisible, 
  onConfirm, 
  onCancel 
}) => {
  if (!isVisible) return null;

  return (
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
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors"
            >
              Continue Interview
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              End & Analyze
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};