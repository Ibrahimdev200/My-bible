import React, { useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import MicrophoneControl from './MicrophoneControl';
import SpeechVisualizer from './SpeechVisualizer';
import DetectionLog from './DetectionLog';
import ProjectionPreview from '../Projection/ProjectionPreview';
import {
  Mic,
  Clock,
  BookOpen,
  Send,
  XCircle,
  Volume2,
  Cloud,
  Key,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SAMPLE_UTTERANCES = [
  'Psalm 1 verse 2',
  'Go to verse 4',
  '9',
  'Scroll down',
  'Scroll up',
  'Turn with me to John chapter 3 verse 16',
  'For God so loved the world that he gave his only begotten Son',
  'Close',
];

const LiveDetection = () => {
  const {
    emitScriptureDetected,
    emitClearProjection,
    currentScripture,
    displayDuration,
    setDisplayDuration,
    liveTranscript,
    setLiveTranscript,
    isMicListening,
    audioLevel,
    autoProject,
    setAutoProject,
    pendingScripture,
    setPendingScripture,
    sessionDetections,
    setSessionDetections,
    speechEngine,
    updateSpeechEngine,
    openaiApiKey,
    saveOpenaiApiKey,
    openaiSttStatus,
    processVoiceTranscript,
  } = useSocket();

  const [manualInput, setManualInput] = useState('');
  const [isAnalyzingManual, setIsAnalyzingManual] = useState(false);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [keyInput, setKeyInput] = useState(openaiApiKey || '');

  const handleSaveOpenaiKey = (e) => {
    e.preventDefault();
    saveOpenaiApiKey(keyInput);
    setShowKeyConfig(false);
    toast.success(
      keyInput.trim()
        ? 'OpenAI Whisper API Key saved'
        : 'Using Hybrid OpenAI Whisper & Browser Voice Engine'
    );
  };

  // Trigger manual speech or quick reference test
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const cmd = manualInput.trim();
    if (!cmd) return;
    setLiveTranscript(cmd);
    setIsAnalyzingManual(true);
    try {
      await processVoiceTranscript(cmd, true, true);
      setManualInput('');
    } finally {
      setIsAnalyzingManual(false);
    }
  };

  const handleSampleClick = async (phrase) => {
    setManualInput(phrase);
    setLiveTranscript(phrase);
    setIsAnalyzingManual(true);
    try {
      await processVoiceTranscript(phrase, true, true);
    } finally {
      setIsAnalyzingManual(false);
    }
  };

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
            <span>Live Voice Scripture Capture</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Speak any scripture, navigate verses by voice ("go to verse 4", "9"), scroll ("scroll down/up"), or say "close".
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
            <span>Auto-Project on Capture</span>
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
              <option value={300}>5 Minutes (Default)</option>
              <option value={180}>3 Minutes</option>
              <option value={60}>1 Minute</option>
              <option value={30}>30 Seconds</option>
              <option value={15}>15 Seconds</option>
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
          {/* OpenAI Whisper Speech-to-Text Engine Bar */}
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center">
                  <Cloud className="w-4 h-4 text-gold-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-display">
                      OpenAI Whisper Speech-to-Text Engine
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        openaiSttStatus === 'error'
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {openaiSttStatus === 'error'
                        ? 'Check API Key'
                        : openaiApiKey || openaiSttStatus === 'active'
                          ? 'OpenAI Whisper Active'
                          : 'Hybrid Active'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Whisper-1 with Biblical context prompt (all 66 books + verse/scroll commands)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={speechEngine}
                  onChange={(e) => updateSpeechEngine(e.target.value)}
                  className="bg-navy-950 border border-navy-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-gold-500"
                >
                  <option value="openai">OpenAI Whisper (Primary)</option>
                  <option value="hybrid">OpenAI Whisper + Browser Hybrid</option>
                  <option value="web-speech">Browser Native Speech Only</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setKeyInput(openaiApiKey || '');
                    setShowKeyConfig((prev) => !prev);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-950 hover:bg-navy-800 text-gold-400 border border-navy-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{openaiApiKey ? 'API Key Set' : 'Set OpenAI Key'}</span>
                </button>
              </div>
            </div>

            {showKeyConfig && (
              <form
                onSubmit={handleSaveOpenaiKey}
                className="pt-3 border-t border-navy-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Enter OpenAI API Key (sk-proj-... or sk-...) or leave blank to use server OPENAI_API_KEY"
                  className="flex-1 px-3 py-2 bg-navy-950 border border-navy-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 text-xs font-bold cursor-pointer"
                >
                  Save Key
                </button>
              </form>
            )}
          </div>

          {/* Mic Card */}
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
            <MicrophoneControl />

            {/* Audio Waveform */}
            <div className="w-full mt-6">
              <SpeechVisualizer isActive={isMicListening} audioLevel={audioLevel} />
            </div>
          </div>

          {/* Live Transcript Stream & Quick Operator Entry */}
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-gold-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white font-display">
                  Live Voice Transcript & Operator Command Bar
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

            <div className="min-h-[80px] max-h-36 overflow-y-auto bg-navy-950/70 rounded-xl p-4 border border-navy-800/80">
              {liveTranscript ? (
                <p className="text-sm text-slate-200 leading-relaxed font-sans">
                  {liveTranscript}
                  <span className="inline-block w-2 h-4 ml-1 bg-gold-400 animate-pulse align-middle" />
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-3">
                  {isMicListening
                    ? 'Listening live... Speak a scripture, say "go to verse 4" or "9", "scroll down", or "close"...'
                    : 'Activate the microphone above (or directly inside the Projector screen), or test a command below.'}
                </p>
              )}
            </div>

            {/* Operator Quick Reference / Command Input */}
            <form onSubmit={handleManualSubmit} className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder='Type a scripture or voice command ("Psalm 1:2", "go to verse 4", "9", "scroll down", "close")...'
                  className="flex-1 px-3.5 py-2 bg-navy-950 border border-navy-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500"
                />
                <button
                  type="submit"
                  disabled={isAnalyzingManual || !manualInput.trim()}
                  className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-navy-950 text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Run</span>
                </button>
              </div>

              {/* Quick Sample Phrases & Commands */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">
                  Try voice commands:
                </span>
                {SAMPLE_UTTERANCES.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => handleSampleClick(sample)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-navy-950 hover:bg-gold-500/20 text-slate-300 hover:text-gold-400 border border-navy-800 hover:border-gold-500/40 transition-colors cursor-pointer"
                  >
                    “{sample}”
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Pending Approval Card (when Auto-Project is OFF) */}
          {pendingScripture && (
            <div className="p-5 rounded-2xl bg-gold-500/10 border-2 border-gold-500 shadow-2xl flex flex-col gap-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-gold-400" />
                  <span className="text-sm font-bold text-white font-display">
                    Scripture Ready: {pendingScripture.reference} ({pendingScripture.translation})
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-100 font-scripture font-semibold bg-navy-950/80 p-3.5 rounded-xl border border-navy-800">
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
                  <span>Project to Screen</span>
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
