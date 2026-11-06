import React, { useRef, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { Send, Clock, Mic, CheckCircle2, AlertTriangle, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const DetectionLog = ({ detections = [], onClearLog }) => {
  const { emitScriptureDetected } = useSocket();
  const logContainerRef = useRef(null);

  // Auto-scroll to top when a new detection arrives
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [detections.length]);

  const handleProjectAgain = (item) => {
    emitScriptureDetected({
      reference: item.reference,
      text: item.text,
      book: item.book,
      chapter: item.chapter,
      verse: item.verse,
      translation: item.translation || 'KJV',
    });
    toast.success(`Reprojected ${item.reference}`);
  };

  // Confidence color badges
  const getConfidenceBadge = (confidence = 0.9) => {
    if (confidence >= 0.8) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" />
          <span>{Math.round(confidence * 100)}% match</span>
        </span>
      );
    }
    if (confidence >= 0.6) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3" />
          <span>{Math.round(confidence * 100)}% match</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
        <AlertCircle className="w-3 h-3" />
        <span>{Math.round(confidence * 100)}% match</span>
      </span>
    );
  };

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-5 py-3.5 bg-navy-950/70 border-b border-navy-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gold-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">
            Session Scripture Log ({detections.length})
          </h3>
        </div>

        {detections.length > 0 && onClearLog && (
          <button
            onClick={onClearLog}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            title="Clear session log"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Log</span>
          </button>
        )}
      </div>

      {/* Log List */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[380px]"
      >
        {detections.length > 0 ? (
          detections.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3.5 rounded-xl bg-navy-950/70 border border-navy-800 hover:border-gold-500/40 transition-all flex flex-col gap-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gold-400 font-display">
                    {item.reference}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-800 text-slate-300 font-semibold">
                    {item.translation || 'KJV'}
                  </span>
                  {getConfidenceBadge(item.confidence)}
                </div>

                <button
                  onClick={() => handleProjectAgain(item)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold-500/10 hover:bg-gold-500 text-gold-400 hover:text-navy-950 text-xs font-bold border border-gold-500/30 transition-all cursor-pointer"
                  title="Project again"
                >
                  <Send className="w-3 h-3" />
                  <span>Project</span>
                </button>
              </div>

              {/* Spoken Quote or Verse Text */}
              <p className="text-xs text-slate-300 font-scripture leading-relaxed">
                {item.text || 'Scripture verse text.'}
              </p>

              {/* Metadata */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-navy-800/60">
                <span className="flex items-center gap-1">
                  <Mic className="w-3 h-3 text-gold-400/80" />
                  <span>Heard: "{item.matchedText || item.reference}"</span>
                </span>
                <span>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Just now'}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-xs text-slate-500">
            No scriptures detected in this session yet.
            <br />
            Spoken verses will appear here automatically.
          </div>
        )}
      </div>
    </div>
  );
};

export default DetectionLog;
