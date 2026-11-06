import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const MicrophoneControl = ({ onTranscript, onAudioLevel, onStatusChange }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [hasPermission, setHasPermission] = useState(null);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Check Web Speech API availability on mount
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      console.warn('Web Speech API is not supported in this browser.');
    }

    return () => {
      stopListening();
    };
  }, []);

  // Setup Web Audio API analyser for live audio waveform / levels
  const setupAudioAnalyser = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!shouldListenRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        if (onAudioLevel) {
          onAudioLevel(average, dataArray);
        }

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.warn('Microphone stream access error:', err);
    }
  };

  const startListening = async () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Web Speech API not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      shouldListenRef.current = true;
      setIsListening(true);
      if (onStatusChange) onStatusChange(true);

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setHasPermission(true);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece;
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        if (onTranscript) {
          if (finalTranscript.trim()) {
            onTranscript(finalTranscript.trim(), true);
          } else if (interimTranscript.trim()) {
            onTranscript(interimTranscript.trim(), false);
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition event:', event.error);
        if (event.error === 'not-allowed') {
          setHasPermission(false);
          toast.error('Microphone access was denied. Please allow microphone permissions.');
          stopListening();
        }
      };

      recognition.onend = () => {
        // Auto-restart if user still wants to listen
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch (e) {
            // Already started or restarting
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

      // Start audio level visualizer
      setupAudioAnalyser();
      toast.success('Microphone active. AI is listening...');
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsListening(false);
      shouldListenRef.current = false;
      if (onStatusChange) onStatusChange(false);
    }
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    setIsListening(false);
    if (onStatusChange) onStatusChange(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (onAudioLevel) {
      onAudioLevel(0, new Uint8Array(0));
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      toast('Microphone paused');
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Big Circular Microphone Button */}
      <div className="relative flex items-center justify-center">
        {/* Pulsing Animated Glow Rings when Listening */}
        {isListening && (
          <>
            <span className="absolute w-36 h-36 rounded-full bg-gold-500/20 animate-ping opacity-60" />
            <span className="absolute w-44 h-44 rounded-full bg-gold-500/10 animate-pulse" />
          </>
        )}

        <button
          onClick={toggleListening}
          className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95 shadow-2xl cursor-pointer ${
            isListening
              ? 'bg-gradient-to-tr from-gold-500 to-amber-400 text-navy-950 ring-8 ring-gold-500/30 shadow-gold-500/40'
              : 'bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white border-2 border-navy-700 hover:border-gold-500/50'
          }`}
          title={isListening ? 'Click to pause listening' : 'Click to start listening'}
        >
          {isListening ? (
            <Mic className="w-10 h-10 animate-pulse stroke-[2.5]" />
          ) : (
            <MicOff className="w-10 h-10 text-slate-400" />
          )}
        </button>
      </div>

      {/* Status Label */}
      <div className="mt-5 text-center">
        <h4 className="text-base font-bold font-display text-white">
          {isListening ? (
            <span className="text-gold-400 flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              AI is Listening to Sermon...
            </span>
          ) : (
            'Microphone Standby'
          )}
        </h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          {isListening
            ? 'Speak Bible references like "John 3:16" or "Psalm 23"'
            : 'Click the button above to begin live speech recognition'}
        </p>
      </div>

      {!isSupported && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 max-w-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Speech Recognition is best supported in Google Chrome or Microsoft Edge.</span>
        </div>
      )}
    </div>
  );
};

export default MicrophoneControl;
