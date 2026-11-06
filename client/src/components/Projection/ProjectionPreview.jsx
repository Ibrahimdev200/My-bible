import React from 'react';
import { useSocket } from '../../contexts/SocketContext';
import ProjectionScreen from './ProjectionScreen';
import { ExternalLink, XCircle, Radio } from 'lucide-react';

const ProjectionPreview = ({ overrideScripture = null, overrideBranding = null }) => {
  const { currentScripture, emitClearProjection } = useSocket();
  const active = overrideScripture || currentScripture;

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-navy-950/70 border-b border-navy-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                active ? 'bg-gold-400' : 'bg-slate-500'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                active ? 'bg-gold-500' : 'bg-slate-500'
              }`}
            />
          </span>
          <span className="text-xs font-bold text-white tracking-wide uppercase font-display">
            Live Projection Output
          </span>
        </div>

        <div className="flex items-center gap-2">
          {active && (
            <button
              onClick={emitClearProjection}
              className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-semibold transition-colors cursor-pointer"
              title="Clear Projection Screen"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}

          <a
            href="/projection"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 border border-gold-500/30 text-[11px] font-semibold transition-all group"
            title="Open in new window for projector or second monitor"
          >
            <Radio className="w-3 h-3 text-gold-400" />
            <span>Open Screen</span>
            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>

      {/* Scaled Preview Frame */}
      <div className="p-3 bg-navy-950/90">
        <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-navy-800 relative group cursor-pointer">
          <a
            href="/projection"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <ProjectionScreen
              previewMode={true}
              overrideScripture={overrideScripture}
              overrideBranding={overrideBranding}
            />
            <div className="absolute inset-0 bg-navy-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
              <span className="px-4 py-2 rounded-xl bg-gold-500 text-navy-950 font-bold text-xs flex items-center gap-2 shadow-xl">
                <span>Click to Open Full Projector Window</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </div>
          </a>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2.5 bg-navy-950/50 border-t border-navy-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>Status: {active ? `Projecting ${active.reference}` : 'Waiting for scripture'}</span>
        <span className="text-slate-500">16:9 Broadcast Format</span>
      </div>
    </div>
  );
};

export default ProjectionPreview;
