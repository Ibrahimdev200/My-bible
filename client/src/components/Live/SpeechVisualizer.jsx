import React from 'react';

const SpeechVisualizer = ({ isActive = false, audioLevel = 0 }) => {
  // Generate 24 equalizer bars
  const barCount = 24;

  return (
    <div className="w-full bg-navy-950/80 border border-navy-800 rounded-2xl p-4 flex flex-col items-center justify-center">
      <div className="w-full flex items-center justify-between text-[11px] text-slate-400 mb-3 px-1">
        <span>Speech Waveform Visualizer</span>
        <span className={isActive ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
          {isActive ? 'Live Audio Stream' : 'Audio Inactive'}
        </span>
      </div>

      <div className="w-full h-16 flex items-center justify-center gap-1.5 px-4 overflow-hidden">
        {Array.from({ length: barCount }).map((_, i) => {
          // Calculate height with variation based on audio level
          let heightPercent = 10;
          if (isActive) {
            const factor = Math.sin((i / barCount) * Math.PI);
            const dynamic = (audioLevel / 255) * 100 * (0.6 + factor * 0.8);
            // Minimum baseline bounce
            const baseline = Math.sin(Date.now() / 200 + i) * 10 + 15;
            heightPercent = Math.min(100, Math.max(12, dynamic + baseline));
          }

          return (
            <div
              key={i}
              className="flex-1 max-w-[8px] rounded-full transition-all duration-75"
              style={{
                height: `${heightPercent}%`,
                backgroundColor: isActive
                  ? heightPercent > 70
                    ? '#f99307' // Gold on high spikes
                    : heightPercent > 40
                    ? '#ffb620'
                    : '#1a3dff' // Blue on moderate
                  : '#1e293b', // Muted slate when inactive
                opacity: isActive ? 0.9 : 0.4,
              }}
            />
          );
        })}
      </div>

      <div className="w-full flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
        <span>0 dB</span>
        <span>Voice Frequency Band</span>
        <span>+12 dB</span>
      </div>
    </div>
  );
};

export default SpeechVisualizer;
