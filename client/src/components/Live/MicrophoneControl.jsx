import React, { useState, useEffect } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';

const MicrophoneControl = () => {
  const { isMicListening, toggleGlobalListening } = useSocket();
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Big Circular Microphone Button */}
      <div className="relative flex items-center justify-center">
        {isMicListening && (
          <>
            <span className="absolute w-36 h-36 rounded-full bg-gold-500/20 animate-ping opacity-60" />
            <span className="absolute w-44 h-44 rounded-full bg-gold-500/10 animate-pulse" />
          </>
        )}

        <button
          onClick={toggleGlobalListening}
          className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-200 transform active:scale-95 shadow-2xl cursor-pointer ${
            isMicListening
              ? 'bg-gradient-to-tr from-gold-500 to-amber-400 text-navy-950 ring-8 ring-gold-500/30 shadow-gold-500/40'
              : 'bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white border-2 border-navy-700 hover:border-gold-500/50'
          }`}
          title={isMicListening ? 'Click to pause microphone' : 'Click to start live voice capture'}
        >
          {isMicListening ? (
            <Mic className="w-10 h-10 animate-pulse stroke-[2.5]" />
          ) : (
            <MicOff className="w-10 h-10 text-slate-400" />
          )}
        </button>
      </div>

      {/* Status Label */}
      <div className="mt-5 text-center">
        <h4 className="text-base font-bold font-display text-white">
          {isMicListening ? (
            <span className="text-gold-400 flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              Live Voice Capture Active
            </span>
          ) : (
            'Microphone Standby'
          )}
        </h4>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          {isMicListening
            ? 'Say a scripture ("Psalm 1:2"), navigate ("go to verse 4" or "9"), scroll ("scroll down/up"), or say "close"'
            : 'Click the microphone above to start continuous voice capture across Dashboard & Projector'}
        </p>
      </div>

      {!isSupported && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 max-w-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Voice recognition works best in Google Chrome or Microsoft Edge.</span>
        </div>
      )}
    </div>
  );
};

export default MicrophoneControl;
