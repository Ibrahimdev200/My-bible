import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, BookOpen } from 'lucide-react';
import api from '../../utils/api';
import { assetUrl } from '../../utils/config';

const ProjectionScreen = ({
  previewMode = false,
  overrideScripture = null,
  overrideBranding = null,
}) => {
  const {
    currentScripture: socketScripture,
    emitClearProjection,
    isMicListening,
    startGlobalListening,
    scrollCommand,
    processVoiceTranscript,
  } = useSocket();
  const { user } = useAuth();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [churchBranding, setChurchBranding] = useState(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const containerRef = useRef(null);
  const verseScrollRef = useRef(null);

  // Active scripture from prop override (when provided) or socket context
  const scripture = overrideScripture || socketScripture;

  // Automatically ensure voice recognition is active when the Projector screen is open
  useEffect(() => {
    if (previewMode) return;
    if (!isMicListening) {
      startGlobalListening(true);
    }
  }, [previewMode, isMicListening, startGlobalListening]);

  // React to remote or voice scroll commands ("scroll down" / "scroll up")
  useEffect(() => {
    if (!scrollCommand || !verseScrollRef.current) return;
    const delta =
      scrollCommand.direction === 'up'
        ? -(scrollCommand.amount || 260)
        : scrollCommand.amount || 260;
    verseScrollRef.current.scrollBy({ top: delta, behavior: 'smooth' });
  }, [scrollCommand]);

  // Reset scroll position to top when a new verse is displayed
  useEffect(() => {
    if (verseScrollRef.current) {
      verseScrollRef.current.scrollTop = 0;
    }
  }, [scripture?.reference]);

  // Keyboard shortcuts on full projection screen:
  // - Escape: clear scripture
  // - F: toggle fullscreen
  // - ArrowRight: next verse
  // - ArrowLeft: previous verse
  // - ArrowDown / PageDown: scroll down
  // - ArrowUp / PageUp: scroll up
  useEffect(() => {
    if (previewMode) return;
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape' && scripture && !document.fullscreenElement) {
        emitClearProjection();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'ArrowRight' && scripture) {
        e.preventDefault();
        processVoiceTranscript('next verse', true, true);
      } else if (e.key === 'ArrowLeft' && scripture) {
        e.preventDefault();
        processVoiceTranscript('previous verse', true, true);
      } else if ((e.key === 'ArrowDown' || e.key === 'PageDown') && verseScrollRef.current) {
        e.preventDefault();
        verseScrollRef.current.scrollBy({ top: 220, behavior: 'smooth' });
      } else if ((e.key === 'ArrowUp' || e.key === 'PageUp') && verseScrollRef.current) {
        e.preventDefault();
        verseScrollRef.current.scrollBy({ top: -220, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewMode, scripture, emitClearProjection, processVoiceTranscript]);

  // Active branding: props override or user branding or fetched branding
  const activeBranding = overrideBranding ||
    user?.branding ||
    churchBranding || {
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
      api
        .get('/church/branding')
        .then((res) => {
          if (res.data) setChurchBranding(res.data.branding || res.data);
        })
        .catch(() => { });
    }
  }, [user, overrideBranding]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => { });
    } else if (document.exitFullscreen) {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => { });
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Manual scroll helper for on-screen Scroll Up / Scroll Down buttons
  const handleManualScroll = (dir) => {
    if (!verseScrollRef.current) return;
    verseScrollRef.current.scrollBy({
      top: dir === 'up' ? -240 : 240,
      behavior: 'smooth',
    });
  };

  // Determine dynamic font size based on verse text length
  const getDynamicFontSize = (text = '') => {
    const len = text.length;
    if (len === 0) return 'text-3xl md:text-5xl';
    if (len < 100) return 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl';
    if (len < 220) return 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl';
    if (len < 380) return 'text-xl sm:text-2xl md:text-3xl lg:text-4xl';
    return 'text-lg sm:text-xl md:text-2xl lg:text-3xl';
  };

  const template = activeBranding.template || 'classic';

  // Template-specific style classes (all use semi-bold attractive typography for projected scripture)
  const getTemplateStyles = () => {
    switch (template.toLowerCase()) {
      case 'light':
        return {
          wrapper: 'bg-gradient-to-br from-amber-50 via-stone-100 to-amber-100 text-slate-900',
          churchName: 'text-slate-800',
          reference: 'text-amber-800 font-extrabold',
          verseText: 'text-slate-900 font-scripture font-semibold',
          badge: 'bg-amber-900/15 text-amber-950 border-amber-900/30',
          frame: 'border-amber-900/15 bg-white/75',
          divider: 'from-transparent via-amber-700/50 to-transparent',
        };
      case 'modern':
        return {
          wrapper: 'bg-gradient-to-br from-navy-950 via-slate-950 to-indigo-950 text-white',
          churchName: 'text-slate-100 font-display',
          reference: 'text-sky-400 font-extrabold font-display',
          verseText: 'text-white font-sans font-semibold tracking-normal',
          badge: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
          frame: 'border-sky-400/20 bg-navy-950/60',
          divider: 'from-transparent via-sky-400/60 to-transparent',
        };
      case 'elegant':
        return {
          wrapper:
            'bg-black text-white relative before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_center,rgba(249,147,7,0.12)_0,transparent_75%)]',
          churchName: 'text-amber-100 tracking-widest uppercase font-serif',
          reference: 'text-gold-400 font-serif font-bold',
          verseText: 'text-amber-50 font-scripture font-semibold leading-relaxed',
          badge: 'bg-gold-500/20 text-gold-300 border-gold-500/45',
          frame: 'border-gold-500/25 bg-neutral-950/75',
          divider: 'from-transparent via-gold-400/70 to-transparent',
        };
      case 'classic':
      default:
        return {
          wrapper: 'bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-white',
          churchName: 'text-white font-display tracking-wide',
          reference: 'text-gold-400 font-display font-extrabold',
          verseText: 'text-white font-scripture font-semibold leading-relaxed',
          badge: 'bg-gold-500/20 text-gold-300 border-gold-500/40',
          frame: 'border-gold-500/20 bg-navy-950/55',
          divider: 'from-transparent via-gold-400/60 to-transparent',
        };
    }
  };

  const currentStyles = getTemplateStyles();
  const churchTitle =
    scripture?.churchName || user?.churchName || user?.name || 'Sanctuary Worship';
  const rawLogo = scripture?.logoUrl || user?.logoUrl || '';
  const churchLogo = assetUrl(rawLogo);

  useEffect(() => {
    setLogoFailed(false);
  }, [churchLogo]);

  const activeTranslationCode = (
    scripture?.translation ||
    user?.preferredTranslation ||
    'KJV'
  ).toUpperCase();

  return (
    <div
      ref={containerRef}
      onClick={() => {
        if (!previewMode && !isMicListening) {
          startGlobalListening(true);
        }
      }}
      onDoubleClick={() => {
        if (!previewMode) {
          toggleFullscreen();
        }
      }}
      className={`relative w-full h-full flex flex-col justify-between overflow-hidden select-none transition-colors duration-700 ${
        previewMode ? 'aspect-video rounded-xl p-3.5' : 'h-screen p-6 md:p-10 lg:p-12'
      } ${currentStyles.wrapper}`}
      style={{
        backgroundColor: activeBranding.backgroundColor || undefined,
        color: activeBranding.textColor || undefined,
      }}
    >
      {/* Subtle Ambient Sanctuary Light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vw] h-[75vw] max-w-[760px] max-h-[760px] rounded-full bg-gold-500/8 blur-[130px] pointer-events-none" />

      {/* Top Bar: ONLY the Church Logo (plus discreet Full Screen button before entering full screen) */}
      <header
        className={`relative z-10 flex items-center justify-between ${
          previewMode ? 'pb-1.5' : 'pb-3'
        }`}
      >
        <div className="flex items-center">
          {churchLogo && !logoFailed ? (
            <img
              src={churchLogo}
              alt={churchTitle}
              onError={() => setLogoFailed(true)}
              className={`${
                previewMode ? 'w-8 h-8 p-0.5' : 'w-14 h-14 md:w-16 md:h-16 p-1.5'
              } rounded-2xl object-contain bg-white/10 border border-gold-500/40 shadow-xl flex-shrink-0`}
            />
          ) : (
            <div
              className={`${
                previewMode ? 'w-8 h-8 text-xs' : 'w-14 h-14 md:w-16 md:h-16 text-xl md:text-2xl'
              } rounded-2xl bg-gradient-to-br from-gold-500/25 to-gold-600/10 flex items-center justify-center font-extrabold text-gold-400 border border-gold-500/40 shadow-xl flex-shrink-0 font-display`}
            >
              {(churchTitle || 'C').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Discreet Enter Full Screen trigger only when NOT yet in Full Screen */}
        {!previewMode && !isFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-all opacity-40 hover:opacity-100 cursor-pointer"
            title="Enter Full Screen (F)"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* Center Body: ONLY the Bible Chapter/Scripture with Scrollbar (or Church Logo when idle) */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col justify-center items-center text-center px-2 md:px-6 my-2 overflow-hidden">
        <AnimatePresence mode="wait">
          {scripture ? (
            <motion.div
              key={scripture.reference + activeTranslationCode}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`w-full max-w-6xl max-h-full mx-auto rounded-3xl border backdrop-blur-sm shadow-2xl flex flex-col items-center overflow-hidden ${
                previewMode ? 'p-3' : 'p-6 md:p-10 lg:p-12'
              } ${currentStyles.frame}`}
            >
              {/* Bible Chapter / Verse Heading */}
              <div className="flex items-center justify-center flex-shrink-0">
                <h1
                  className={`font-display tracking-tight ${
                    previewMode
                      ? 'text-base font-extrabold'
                      : 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold'
                  } ${currentStyles.reference}`}
                  style={{ color: activeBranding.primaryColor || undefined }}
                >
                  {scripture.reference}
                </h1>
              </div>

              {/* Ornamental Gold Divider */}
              <div
                className={`w-2/3 max-w-md h-[2px] flex-shrink-0 bg-gradient-to-r ${
                  currentStyles.divider
                } ${previewMode ? 'my-1.5' : 'my-4 md:my-6'}`}
              />

              {/* Scrollable Semi-Bold Scripture Verse Body Container */}
              <div
                ref={verseScrollRef}
                className={`w-full flex-1 min-h-0 overflow-y-auto projector-scroll px-2 md:px-6 ${
                  previewMode ? 'max-h-28' : 'max-h-[68vh]'
                }`}
              >
                <div
                  className={`max-w-5xl mx-auto font-semibold tracking-wide drop-shadow-sm select-text ${
                    previewMode
                      ? 'text-xs leading-relaxed py-1'
                      : `${getDynamicFontSize(scripture.text)} leading-[1.45] py-2`
                  } ${currentStyles.verseText}`}
                >
                  “{scripture.text}”
                </div>
              </div>
            </motion.div>
          ) : (
            // Idle Screen: ONLY the Church Logo
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center text-center p-6"
            >
              <div
                className={`${
                  previewMode
                    ? 'w-16 h-16 rounded-2xl'
                    : 'w-36 h-36 md:w-44 md:h-44 rounded-3xl'
                } bg-gradient-to-tr from-gold-500/20 via-navy-800/80 to-gold-500/10 border-2 border-gold-500/40 flex items-center justify-center shadow-2xl p-4`}
              >
                {churchLogo && !logoFailed ? (
                  <img
                    src={churchLogo}
                    alt={churchTitle}
                    onError={() => setLogoFailed(true)}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <BookOpen
                    className={
                      previewMode
                        ? 'w-8 h-8 text-gold-400'
                        : 'w-16 h-16 md:w-20 md:h-20 text-gold-400'
                    }
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ProjectionScreen;
