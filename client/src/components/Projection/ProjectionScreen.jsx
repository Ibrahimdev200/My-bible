import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, BookOpen, Sparkles } from 'lucide-react';
import api from '../../utils/api';

const ProjectionScreen = ({ previewMode = false, overrideScripture = null, overrideBranding = null }) => {
  const { currentScripture: socketScripture } = useSocket();
  const { user } = useAuth();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [churchBranding, setChurchBranding] = useState(null);
  const containerRef = useRef(null);

  // Active scripture from prop override (for preview) or socket context
  const scripture = overrideScripture !== undefined ? overrideScripture : socketScripture;

  // Active branding: props override or user branding or fetched branding
  const activeBranding = overrideBranding || user?.branding || churchBranding || {
    template: 'classic',
    primaryColor: '#f99307',
    secondaryColor: '#1a3dff',
    backgroundColor: '#0b1137',
    textColor: '#ffffff',
    fontSize: 48,
  };

  // Fetch church branding on load if not available
  useEffect(() => {
    if (!user?.branding && !overrideBranding) {
      api.get('/church/branding')
        .then((res) => {
          if (res.data) setChurchBranding(res.data.branding || res.data);
        })
        .catch(() => {
          // Defaults are already set
        });
    }
  }, [user, overrideBranding]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Determine dynamic font size based on verse text length
  const getDynamicFontSize = (text = '') => {
    const len = text.length;
    if (len === 0) return 'text-3xl md:text-5xl';
    if (len < 80) return 'text-4xl md:text-5xl lg:text-6xl';
    if (len < 180) return 'text-3xl md:text-4xl lg:text-5xl';
    if (len < 320) return 'text-2xl md:text-3xl lg:text-4xl';
    if (len < 500) return 'text-xl md:text-2xl lg:text-3xl';
    return 'text-lg md:text-xl lg:text-2xl';
  };

  const template = activeBranding.template || 'classic';

  // Template-specific style classes
  const getTemplateStyles = () => {
    switch (template.toLowerCase()) {
      case 'light':
        return {
          wrapper: 'bg-gradient-to-br from-amber-50 via-slate-100 to-amber-100 text-slate-900',
          churchName: 'text-slate-600',
          reference: 'text-amber-800 font-bold',
          verseText: 'text-slate-900 font-scripture',
          badge: 'bg-amber-900/10 text-amber-900 border-amber-900/20',
          accent: '#b74b06',
        };
      case 'modern':
        return {
          wrapper: 'bg-gradient-to-br from-navy-950 via-blue-950 to-indigo-950 text-white',
          churchName: 'text-blue-300 font-display',
          reference: 'text-sky-400 font-extrabold font-display',
          verseText: 'text-white font-sans font-medium tracking-normal',
          badge: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
          accent: '#38bdf8',
        };
      case 'elegant':
        return {
          wrapper: 'bg-black text-white relative before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_center,rgba(249,147,7,0.08)_0,transparent_75%)]',
          churchName: 'text-gold-200/70 tracking-widest uppercase font-serif',
          reference: 'text-gold-400 font-serif font-bold italic',
          verseText: 'text-amber-50 font-scripture italic leading-relaxed',
          badge: 'bg-gold-500/15 text-gold-400 border-gold-500/40',
          accent: '#f99307',
        };
      case 'classic':
      default:
        return {
          wrapper: 'bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-white',
          churchName: 'text-slate-400 font-display tracking-wider uppercase',
          reference: 'text-gold-400 font-display font-bold',
          verseText: 'text-slate-100 font-scripture leading-relaxed',
          badge: 'bg-gold-500/20 text-gold-300 border-gold-500/30',
          accent: '#f99307',
        };
    }
  };

  const currentStyles = getTemplateStyles();
  const churchTitle = scripture?.churchName || user?.churchName || user?.name || 'ScriptureLive Church';
  const churchLogo = scripture?.logoUrl || user?.logoUrl;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col justify-between overflow-hidden select-none transition-colors duration-700 ${
        previewMode ? 'aspect-video rounded-xl p-4' : 'min-h-screen p-8 md:p-14 lg:p-20'
      } ${currentStyles.wrapper}`}
      style={{
        backgroundColor: activeBranding.backgroundColor || undefined,
        color: activeBranding.textColor || undefined,
      }}
    >
      {/* Subtle Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[700px] max-h-[700px] rounded-full bg-gold-500/5 blur-[120px] pointer-events-none" />

      {/* Top Bar: Church Identity */}
      <header className={`relative z-10 flex items-center justify-between ${previewMode ? 'pb-2' : 'pb-6'}`}>
        <div className="flex items-center gap-3">
          {churchLogo ? (
            <img
              src={churchLogo}
              alt={churchTitle}
              className={`${previewMode ? 'w-6 h-6' : 'w-12 h-12 md:w-16 md:h-16'} rounded-full object-contain bg-white/5 p-1 border border-white/10 shadow-lg`}
            />
          ) : (
            <div
              className={`${previewMode ? 'w-6 h-6 text-xs' : 'w-12 h-12 md:w-16 md:h-16 text-lg md:text-xl'} rounded-full bg-white/10 flex items-center justify-center font-bold text-gold-400 border border-white/15 shadow-lg`}
            >
              <BookOpen className={previewMode ? 'w-3 h-3' : 'w-6 h-6'} />
            </div>
          )}
          <div>
            <h2 className={`${previewMode ? 'text-xs' : 'text-base md:text-xl'} font-semibold tracking-wide ${currentStyles.churchName}`}>
              {churchTitle}
            </h2>
          </div>
        </div>

        {/* Translation & Live Indicator */}
        <div className="flex items-center gap-2">
          {scripture && (
            <span
              className={`px-3 py-1 rounded-full border text-xs font-bold tracking-wider uppercase ${currentStyles.badge}`}
            >
              {scripture.translation || user?.preferredTranslation || 'KJV'}
            </span>
          )}

          {/* Fullscreen Button (hidden in preview mode) */}
          {!previewMode && (
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-all opacity-40 hover:opacity-100 cursor-pointer"
              title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          )}
        </div>
      </header>

      {/* Center Body: Scripture or Idle Resting Screen */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-4 my-auto">
        <AnimatePresence mode="wait">
          {scripture ? (
            <motion.div
              key={scripture.reference + (scripture.text || '')}
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="max-w-5xl mx-auto flex flex-col items-center justify-center"
            >
              {/* Reference Title (e.g., John 3:16) */}
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className={`font-display tracking-tight mb-4 md:mb-6 ${
                  previewMode ? 'text-base font-bold' : 'text-3xl md:text-5xl lg:text-6xl font-black'
                } ${currentStyles.reference}`}
                style={{ color: activeBranding.primaryColor || undefined }}
              >
                {scripture.reference}
              </motion.h1>

              {/* Bible Verse Body Text */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`leading-relaxed max-w-4xl font-normal drop-shadow-md ${
                  previewMode ? 'text-xs line-clamp-3' : getDynamicFontSize(scripture.text)
                } ${currentStyles.verseText}`}
              >
                “{scripture.text || 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'}”
              </motion.div>
            </motion.div>
          ) : (
            // Idle Resting State: Elegant Church Screen
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center text-center p-6"
            >
              <div className="relative mb-6">
                <div className="w-24 h-24 md:w-36 md:h-36 rounded-3xl bg-gradient-to-tr from-gold-500/20 via-navy-800 to-gold-500/10 border border-gold-500/30 flex items-center justify-center shadow-2xl animate-pulse-glow">
                  {churchLogo ? (
                    <img src={churchLogo} alt={churchTitle} className="w-16 h-16 md:w-24 md:h-24 object-contain" />
                  ) : (
                    <BookOpen className="w-12 h-12 md:w-16 md:h-16 text-gold-400" />
                  )}
                </div>
              </div>
              <h2 className={`${previewMode ? 'text-sm' : 'text-2xl md:text-3xl'} font-bold font-display text-white mb-2`}>
                {churchTitle}
              </h2>
              <p className={`${previewMode ? 'text-[10px]' : 'text-sm md:text-base'} text-slate-400 max-w-md flex items-center justify-center gap-2`}>
                <Sparkles className="w-4 h-4 text-gold-400/80" />
                <span>Scripture projection is active and waiting for reference...</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Bar: Clean subtle watermark / footer */}
      <footer className={`relative z-10 flex items-center justify-between text-[11px] opacity-60 ${previewMode ? 'pt-2' : 'pt-6'}`}>
        <div>
          {scripture?.reference ? (
            <span>Displaying Holy Bible • {scripture.translation || 'KJV'}</span>
          ) : (
            <span>ScriptureLive AI Live System</span>
          )}
        </div>
        <div>
          <span>ScriptureLive AI</span>
        </div>
      </footer>
    </div>
  );
};

export default ProjectionScreen;
