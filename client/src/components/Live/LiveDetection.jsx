import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import MicrophoneControl from './MicrophoneControl';
import SpeechVisualizer from './SpeechVisualizer';
import DetectionLog from './DetectionLog';
import ProjectionPreview from '../Projection/ProjectionPreview';
import detectScripture from '../../utils/scriptureDetector';
import api from '../../utils/api';
import {
  Mic,
  Clock,
  Sparkles,
  Send,
  XCircle,
  Check,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  Volume2,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const LiveDetection = () => {
  const { user } = useAuth();
  const {
    emitScriptureDetected,
    emitClearProjection,
    currentScripture,
    displayDuration,
    setDisplayDuration,
    broadcastMicStatus,
  } = useSocket();

  const [audioLevel, setAudioLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [pendingScripture, setPendingScripture] = useState(null);
  const [sessionDetections, setSessionDetections] = useState([]);
  const [autoProject, setAutoProject] = useState(true);

  // Keep a reference of recently matched refs to prevent spamming duplicate events
  const lastDetectedRef = useRef('');
  const lastDetectedTime = useRef(0);

  // Sync mic state to socket context for top header
  const handleStatusChange = (status) => {
    setIsListening(status);
    broadcastMicStatus(status);
  };

  // Process live transcript
  const handleTranscript = useCallback(
    async (text, isFinal) => {
      setLiveTranscript(text);

      // Run client-side regex detector
      const detected = detectScripture(text);

      if (detected) {
        const now = Date.now();
        // Prevent duplicate detections within 4 seconds of the same reference
        if (
          lastDetectedRef.current === detected.reference &&
          now - lastDetectedTime.current < 4000
        ) {
          return;
        }

        lastDetectedRef.current = detected.reference;
        lastDetectedTime.current = now;

        const currentTranslation = user?.preferredTranslation || 'KJV';

        // Fetch verse text from backend reference endpoint
        let verseText = '';
        try {
          const res = await api.get(
            `/bible/reference?ref=${encodeURIComponent(detected.reference)}&translation=${currentTranslation}`
          );
          if (res.data) {
            verseText = res.data.text || res.data.verses || '';
          }
        } catch (e) {
          verseText = `Scripture reference ${detected.reference} detected.`;
        }

        const newEntry = {
          id: `${detected.reference}_${Date.now()}`,
          reference: detected.reference,
          text: verseText,
          book: detected.bookName,
          chapter: detected.chapter,
          verse: detected.startVerse,
          translation: currentTranslation,
          confidence: detected.confidence,
          matchedText: detected.matchedText,
          timestamp: new Date().toISOString(),
        };

        // Add to session log
        setSessionDetections((prev) => [newEntry, ...prev]);

        // Save to backend history
        try {
          api.post('/scripture/history', {
            reference: newEntry.reference,
            text: newEntry.text,
            translation: newEntry.translation,
            confidence: newEntry.confidence,
            spokenText: text,
          }).catch(() => {});
        } catch (e) {}

        if (autoProject) {
          // Push directly to projection
          emitScriptureDetected(newEntry);
          toast.success(`AI Detected & Projected: ${newEntry.reference}`, {
            icon: '✨',
            duration: 3500,
          });
        } else {
          // Place into pending approval box
          setPendingScripture(newEntry);
          toast(`Detected: ${newEntry.reference} (Awaiting confirmation)`, {
            icon: '📖',
          });
        }
      } else if (isFinal) {
        // Send final phrase to backend AI detector for quotation/semantic matching
        try {
          const res = await api.post('/bible/detect', { text });
          if (res.data && res.data.detected && res.data.reference) {
            const data = res.data;
            const newEntry = {
              id: `${data.reference}_${Date.now()}`,
              reference: data.reference,
              text: data.text,
              book: data.book || '',
              chapter: data.chapter || '',
              verse: data.verse || '',
              translation: data.translation || user?.preferredTranslation || 'KJV',
              confidence: data.confidence || 0.85,
              matchedText: text,
              timestamp: new Date().toISOString(),
            };

            setSessionDetections((prev) => [newEntry, ...prev]);

            if (autoProject) {
              emitScriptureDetected(newEntry);
              toast.success(`AI Matched: ${newEntry.reference}`);
            } else {
              setPendingScripture(newEntry);
            }
          }
        } catch (err) {
          // Silent catch for live speech chunks
        }
      }
    },
    [autoProject, emitScriptureDetected, user]
  );

  // Approve pending scripture
  const handleApprovePending = () => {
    if (pendingScripture) {
      emitScriptureDetected(pendingScripture);
      toast.success(`Projecting ${pendingScripture.reference}`);
      setPendingScripture(null);
    }
  };

  // Dismiss pending scripture
  const handleDismissPending = () => {
    setPendingScripture(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-navy-800">
        <div>
          <h1 className="text-2xl font-bold text-white font-display flex items-center gap-2">
            <Mic className="w-6 h-6 text-gold-400" />
            <span>Live AI Speech Recognition</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time speech recognition listens to preaching, identifies Bible references, and
            projects them instantly.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Auto-Project Toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer bg-navy-900 border border-navy-800 px-3 py-2 rounded-xl">
            <input
              type="checkbox"
              checked={autoProject}
              onChange={(e) => setAutoProject(e.target.checked)}
              className="rounded bg-navy-950 border-navy-700 text-gold-500 focus:ring-gold-500 cursor-pointer"
            />
            <span>Auto-Project on Detection</span>
          </label>

          {/* Display Duration Selector */}
          <div className="flex items-center gap-2 bg-navy-900 border border-navy-800 px-3 py-1.5 rounded-xl text-xs">
            <Clock className="w-3.5 h-3.5 text-gold-400" />
            <span className="text-slate-400 font-semibold">Duration:</span>
            <select
              value={displayDuration}
              onChange={(e) => setDisplayDuration(Number(e.target.value))}
              className="bg-navy-950 border border-navy-800 rounded-lg px-2 py-1 text-white font-semibold focus:outline-none focus:border-gold-500"
            >
              <option value={10}>10 Seconds</option>
              <option value={15}>15 Seconds</option>
              <option value={30}>30 Seconds</option>
              <option value={60}>1 Minute</option>
              <option value={0}>Permanent (Until Cleared)</option>
            </select>
          </div>

          {/* Clear Projection Button */}
          {currentScripture && (
            <button
              onClick={emitClearProjection}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all cursor-pointer"
              title="Clear projection screen immediately"
            >
              <XCircle className="w-4 h-4" />
              <span>Clear Screen</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Mic & Speech Analysis (Left) vs Detections & Screen Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Microphone & Speech Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Mic Card */}
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
            <MicrophoneControl
              onTranscript={handleTranscript}
              onAudioLevel={(lvl) => setAudioLevel(lvl)}
              onStatusChange={handleStatusChange}
            />

            {/* Audio Waveform */}
            <div className="w-full mt-6">
              <SpeechVisualizer isActive={isListening} audioLevel={audioLevel} />
            </div>
          </div>

          {/* Live Transcript Stream Card */}
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-navy-800">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-gold-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white font-display">
                  Live Transcript Stream
                </h3>
              </div>
              {liveTranscript && (
                <button
                  onClick={() => setLiveTranscript('')}
                  className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Clear Transcript
                </button>
              )}
            </div>

            <div className="min-h-[90px] max-h-36 overflow-y-auto bg-navy-950/70 rounded-xl p-4 border border-navy-800/80">
              {liveTranscript ? (
                <p className="text-sm text-slate-200 leading-relaxed font-sans">
                  {liveTranscript}
                  <span className="inline-block w-2 h-4 ml-1 bg-gold-400 animate-pulse align-middle" />
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-4">
                  {isListening
                    ? 'Listening... Start speaking scripture references...'
                    : 'Turn on the microphone to begin transcription.'}
                </p>
              )}
            </div>
          </div>

          {/* Pending Approval Card (when Auto-Project is OFF) */}
          {pendingScripture && (
            <div className="p-5 rounded-2xl bg-gold-500/10 border-2 border-gold-500 shadow-2xl flex flex-col gap-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gold-400" />
                  <span className="text-sm font-bold text-white font-display">
                    Pending Scripture Match: {pendingScripture.reference}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 font-bold">
                    {Math.round(pendingScripture.confidence * 100)}% Match
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-200 font-scripture bg-navy-950/80 p-3 rounded-xl border border-navy-800">
                “{pendingScripture.text}”
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleDismissPending}
                  className="px-4 py-2 rounded-xl border border-navy-700 hover:bg-navy-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleApprovePending}
                  className="px-5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-gold-500/20 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Push to Screen</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Projection Preview & Session Log (5 cols) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          {/* Projection Preview */}
          <ProjectionPreview />

          {/* Session Detection Log */}
          <div className="flex-1">
            <DetectionLog
              detections={sessionDetections}
              onClearLog={() => setSessionDetections([])}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDetection;
