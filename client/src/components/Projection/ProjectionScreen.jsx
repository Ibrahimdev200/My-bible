import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2,
  Minimize2,
  BookOpen,
  Mic,
  MicOff,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  XCircle,
} from 'lucide-react';
import api from '../../utils/api';
import { assetUrl } from '../../utils/config';
import { TRANSLATIONS } from '../../utils/bibleData';
import { parseReferenceContext } from '../../utils/scriptureDetector';

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
    toggleGlobalListening,
    liveTranscript,
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
  const translationObj = TRANSLATIONS.find((t) => t.code === activeTranslationCode);
  const translationFullName = translationObj ? translationObj.name : activeTranslationCode;
  const activeCtx = parseReferenceContext(scripture);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col justify-between overflow-hidden select-none transition-colors duration-700 ${previewMode ? 'aspect-video rounded-xl p-3.5' : 'h-screen p-6 md:p-10 lg:p-12'
        } ${currentStyles.wrapper}`}
      style={{
        backgroundColor: activeBranding.backgroundColor || undefined,
        color: activeBranding.textColor || undefined,
      }}
    >
      {/* Subtle Ambient Sanctuary Light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vw] h-[75vw] max-w-[760px] max-h-[760px] rounded-full bg-gold-500/8 blur-[130px] pointer-events-none" />

      {/* Top Bar: Church Logo, Church Name, Bible Version & Live Voice Mic */}
      <header
        className={`relative z-10 flex items-center justify-between border-b border-white/10 ${previewMode ? 'pb-2' : 'pb-4'
          }`}
      >
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          {churchLogo && !logoFailed ? (
            <img
              src={churchLogo}
              alt={churchTitle}
              onError={() => setLogoFailed(true)}
              className={`${previewMode ? 'w-7 h-7 p-0.5' : 'w-12 h-12 md:w-14 md:h-14 p-1'
                } rounded-2xl object-contain bg-white/10 border border-gold-500/40 shadow-xl flex-shrink-0`}
            />
          ) : (
            <div
              className={`${previewMode ? 'w-7 h-7 text-xs' : 'w-12 h-12 md:w-14 md:h-14 text-lg md:text-xl'
                } rounded-2xl bg-gradient-to-br from-gold-500/25 to-gold-600/10 flex items-center justify-center font-extrabold text-gold-400 border border-gold-500/40 shadow-xl flex-shrink-0 font-display`}
            >
              {(churchTitle || 'C').charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <h2
              className={`${previewMode ? 'text-xs' : 'text-lg md:text-2xl'
                } font-bold tracking-wide truncate ${currentStyles.churchName}`}
            >
              {churchTitle}
            </h2>
            {!previewMode && (
              <p className="text-xs text-gold-400/90 font-semibold tracking-wider uppercase">
                Holy Bible Projection
              </p>
            )}
          </div>
        </div>

        {/* Right Controls: Live Voice Mic Toggle, Bible Version Badge, Clear & Fullscreen */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {!previewMode && (
            <button
              type="button"
              onClick={toggleGlobalListening}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-md ${isMicListening
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                  : 'bg-white/10 hover:bg-white/15 border-white/20 text-slate-200'
                }`}
              title={
                isMicListening
                  ? 'Voice Recognition Active — Speak scriptures or commands ("go to verse 4", "9", "scroll down", "close")'
                  : 'Click to turn on Live Voice Recognition'
              }
            >
              {isMicListening ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                  </span>
                  <Mic className="w-4 h-4 text-emerald-300" />
                  <span className="hidden sm:inline">Voice Active</span>
                </>
              ) : (
                <>
                  <MicOff className="w-4 h-4 text-slate-300" />
                  <span className="hidden sm:inline">Enable Voice</span>
                </>
              )}
            </button>
          )}

          <div
            className={`rounded-xl border font-bold tracking-wider uppercase flex items-center gap-2 shadow-md ${previewMode ? 'px-2 py-0.5 text-[10px]' : 'px-3.5 py-2 text-xs md:text-sm'
              } ${currentStyles.badge}`}
          >
            <BookOpen className={previewMode ? 'w-3 h-3' : 'w-4 h-4'} />
            <span>
              {previewMode
                ? activeTranslationCode
                : `${translationFullName} (${activeTranslationCode})`}
            </span>
          </div>

          {!previewMode && scripture && (
            <button
              type="button"
              onClick={emitClearProjection}
              className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-400/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Close / Clear Scripture (or say 'Close')"
            >
              <XCircle className="w-4 h-4" />
              <span className="hidden md:inline">Close</span>
            </button>
          )}

          {!previewMode && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-all opacity-60 hover:opacity-100 cursor-pointer"
              title={isFullscreen ? 'Exit Full Screen (F)' : 'Enter Full Screen (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          )}
        </div>
      </header>

      {/* Center Body: Stylish Semi-Bold Scripture Presentation with Built-In Scrollbar */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col justify-center items-center text-center px-2 md:px-6 my-2 overflow-hidden">
        <AnimatePresence mode="wait">
          {scripture ? (
            <motion.div
              key={scripture.reference + activeTranslationCode}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`w-full max-w-6xl max-h-full mx-auto rounded-3xl border backdrop-blur-sm shadow-2xl flex flex-col items-center overflow-hidden ${previewMode ? 'p-3' : 'p-6 md:p-10 lg:p-12'
                } ${currentStyles.frame}`}
            >
              {/* Reference Header & Version Pill */}
              <div className="flex flex-wrap items-center justify-center gap-3 flex-shrink-0">
                <h1
                  className={`font-display tracking-tight ${previewMode
                      ? 'text-base font-extrabold'
                      : 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold'
                    } ${currentStyles.reference}`}
                  style={{ color: activeBranding.primaryColor || undefined }}
                >
                  {scripture.reference}
                </h1>
                <span
                  className={`rounded-lg border font-bold uppercase tracking-widest ${previewMode
                      ? 'px-1.5 py-0.5 text-[9px]'
                      : 'px-3 py-1 text-xs md:text-sm'
                    } ${currentStyles.badge}`}
                >
                  {activeTranslationCode}
                </span>
              </div>

              {/* Ornamental Gold Divider */}
              <div
                className={`w-2/3 max-w-md h-[2px] flex-shrink-0 bg-gradient-to-r ${currentStyles.divider
                  } ${previewMode ? 'my-1.5' : 'my-3 md:my-5'}`}
              />

              {/* Scrollable Semi-Bold Scripture Verse Body Container */}
              <div
                ref={verseScrollRef}
                className={`w-full flex-1 min-h-0 overflow-y-auto projector-scroll px-2 md:px-6 ${previewMode ? 'max-h-24' : 'max-h-[54vh]'
                  }`}
              >
                <div
                  className={`max-w-5xl mx-auto font-semibold tracking-wide drop-shadow-sm select-text ${previewMode
                      ? 'text-xs leading-relaxed py-1'
                      : `${getDynamicFontSize(scripture.text)} leading-[1.45] py-2`
                    } ${currentStyles.verseText}`}
                >
                  “{scripture.text}”
                </div>
              </div>

              {/* Interactive Verse Stepping & Scroll Controls on Full Projector */}
              {!previewMode && (
                <div className="w-full pt-4 mt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => processVoiceTranscript('previous verse', true, true)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title="Previous Verse (or say 'Previous verse')"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Prev Verse</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => processVoiceTranscript('next verse', true, true)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title="Next Verse (or say 'Next verse')"
                    >
                      <span>Next Verse</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400">
                    <span>
                      Voice Control: Say{' '}
                      <strong className="text-gold-400">
                        "go to verse {(activeCtx?.startVerse || 1) + 2}"
                      </strong>
                      , say a verse number like{' '}
                      <strong className="text-gold-400">"9"</strong>,{' '}
                      <strong className="text-gold-400">"scroll down/up"</strong>, or{' '}
                      <strong className="text-gold-400">"close"</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleManualScroll('up')}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title="Scroll Up (or say 'Scroll up')"
                    >
                      <ChevronUp className="w-4 h-4" />
                      <span>Scroll Up</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleManualScroll('down')}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title="Scroll Down (or say 'Scroll down')"
                    >
                      <ChevronDown className="w-4 h-4" />
                      <span>Scroll Down</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            // Idle Sanctuary Screen with Church Logo & Name
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center text-center p-6"
            >
              <div className="relative mb-5">
                <div
                  className={`${previewMode ? 'w-14 h-14 rounded-2xl' : 'w-28 h-28 md:w-36 md:h-36 rounded-3xl'
                    } bg-gradient-to-tr from-gold-500/20 via-navy-800/80 to-gold-500/10 border-2 border-gold-500/40 flex items-center justify-center shadow-2xl p-3`}
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
                          ? 'w-7 h-7 text-gold-400'
                          : 'w-14 h-14 md:w-16 md:h-16 text-gold-400'
                      }
                    />
                  )}
                </div>
              </div>
              <h2
                className={`${previewMode ? 'text-sm' : 'text-2xl md:text-4xl'
                  } font-extrabold font-display text-white tracking-tight mb-2`}
              >
                {churchTitle}
              </h2>
              <p
                className={`${previewMode ? 'text-[10px]' : 'text-sm md:text-base'
                  } text-gold-400/90 font-semibold tracking-widest uppercase`}
              >
                {translationFullName} ({activeTranslationCode})
              </p>
              {!previewMode && (
                <p className="text-xs text-slate-400 mt-3">
                  {isMicListening
                    ? 'Listening for scriptures... Speak any reference (e.g., "Psalm 1 verse 2")'
                    : 'Click "Enable Voice" in the top bar to capture spoken scriptures directly'}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Bar: Church Identity, Live Heard Transcript Pill & Active Bible Translation */}
      <footer
        className={`relative z-10 flex items-center justify-between gap-4 border-t border-white/10 font-semibold ${previewMode ? 'pt-1.5 text-[9px]' : 'pt-3 text-xs md:text-sm'
          } opacity-85`}
      >
        <div className="flex items-center gap-2 truncate">
          {churchLogo && !logoFailed && !previewMode && (
            <img
              src={churchLogo}
              alt=""
              className="w-5 h-5 rounded-full object-contain bg-white/10 p-0.5"
            />
          )}
          <span className="truncate">{churchTitle}</span>
        </div>

        {!previewMode && isMicListening && liveTranscript && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 max-w-md truncate">
            <Mic className="w-3 h-3 text-emerald-400 flex-shrink-0 animate-pulse" />
            <span className="truncate">“{liveTranscript}”</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          {scripture?.reference ? (
            <span className="text-gold-400 font-bold">
              {scripture.reference} • {translationFullName} ({activeTranslationCode})
            </span>
          ) : (
            <span>Holy Bible • {activeTranslationCode}</span>
          )}
        </div>
      </footer>
    </div>
  );
};

export default ProjectionScreen;
