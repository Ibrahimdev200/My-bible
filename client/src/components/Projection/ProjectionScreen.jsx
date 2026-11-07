import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, BookOpen } from 'lucide-react';
import api from '../../utils/api';
import { assetUrl } from '../../utils/config';
import { TRANSLATIONS } from '../../utils/bibleData';

const ProjectionScreen = ({
  previewMode = false,
  overrideScripture = null,
  overrideBranding = null,
}) => {
  const { currentScripture: socketScripture, emitClearProjection } = useSocket();
  const { user } = useAuth();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [churchBranding, setChurchBranding] = useState(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const containerRef = useRef(null);

  // Active scripture from prop override (when provided) or socket context
  const scripture = overrideScripture || socketScripture;

  // Allow Escape key on full projection screen to clear scripture, F key to toggle fullscreen
  useEffect(() => {
    if (previewMode) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && scripture && !document.fullscreenElement) {
        emitClearProjection();
      } else if ((e.key === 'f' || e.key === 'F') && e.target.tagName !== 'INPUT') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewMode, scripture, emitClearProjection]);

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
        .catch(() => {});
    }
  }, [user, overrideBranding]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else if (document.exitFullscreen) {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
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
    if (len < 90) return 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl';
    if (len < 190) return 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl';
    if (len < 340) return 'text-xl sm:text-2xl md:text-3xl lg:text-4xl';
    if (len < 520) return 'text-lg sm:text-xl md:text-2xl lg:text-3xl';
    return 'text-base sm:text-lg md:text-xl lg:text-2xl';
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
          frame: 'border-amber-900/15 bg-white/60',
          divider: 'from-transparent via-amber-700/50 to-transparent',
        };
      case 'modern':
        return {
          wrapper: 'bg-gradient-to-br from-navy-950 via-slate-950 to-indigo-950 text-white',
          churchName: 'text-slate-100 font-display',
          reference: 'text-sky-400 font-extrabold font-display',
          verseText: 'text-white font-sans font-semibold tracking-normal',
          badge: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
          frame: 'border-sky-400/20 bg-navy-950/50',
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
          frame: 'border-gold-500/25 bg-neutral-950/70',
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
          frame: 'border-gold-500/20 bg-navy-950/45',
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

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col justify-between overflow-hidden select-none transition-colors duration-700 ${
        previewMode ? 'aspect-video rounded-xl p-3.5' : 'min-h-screen p-8 md:p-12 lg:p-16'
      } ${currentStyles.wrapper}`}
      style={{
        backgroundColor: activeBranding.backgroundColor || undefined,
        color: activeBranding.textColor || undefined,
      }}
    >
      {/* Subtle Ambient Sanctuary Light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vw] h-[75vw] max-w-[760px] max-h-[760px] rounded-full bg-gold-500/8 blur-[130px] pointer-events-none" />

      {/* Top Bar: Church Logo, Church Name & Bible Version */}
      <header
        className={`relative z-10 flex items-center justify-between border-b border-white/10 ${
          previewMode ? 'pb-2' : 'pb-5'
        }`}
      >
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          {churchLogo && !logoFailed ? (
            <img
              src={churchLogo}
              alt={churchTitle}
              onError={() => setLogoFailed(true)}
              className={`${
                previewMode ? 'w-7 h-7 p-0.5' : 'w-14 h-14 md:w-16 md:h-16 p-1.5'
              } rounded-2xl object-contain bg-white/10 border border-gold-500/40 shadow-xl flex-shrink-0`}
            />
          ) : (
            <div
              className={`${
                previewMode ? 'w-7 h-7 text-xs' : 'w-14 h-14 md:w-16 md:h-16 text-xl md:text-2xl'
              } rounded-2xl bg-gradient-to-br from-gold-500/25 to-gold-600/10 flex items-center justify-center font-extrabold text-gold-400 border border-gold-500/40 shadow-xl flex-shrink-0 font-display`}
            >
              {(churchTitle || 'C').charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <h2
              className={`${
                previewMode ? 'text-xs' : 'text-lg md:text-2xl'
              } font-bold tracking-wide truncate ${currentStyles.churchName}`}
            >
              {churchTitle}
            </h2>
            {!previewMode && (
              <p className="text-xs md:text-sm text-gold-400/90 font-semibold tracking-wider uppercase">
                Holy Bible Projection
              </p>
            )}
          </div>
        </div>

        {/* Bible Version Badge & Fullscreen Toggle */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className={`rounded-xl border font-bold tracking-wider uppercase flex items-center gap-2 shadow-md ${
              previewMode ? 'px-2 py-0.5 text-[10px]' : 'px-4 py-2 text-xs md:text-sm'
            } ${currentStyles.badge}`}
          >
            <BookOpen className={previewMode ? 'w-3 h-3' : 'w-4 h-4'} />
            <span>
              {previewMode
                ? activeTranslationCode
                : `${translationFullName} (${activeTranslationCode})`}
            </span>
          </div>

          {!previewMode && (
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-all opacity-50 hover:opacity-100 cursor-pointer"
              title={isFullscreen ? 'Exit Full Screen (F)' : 'Enter Full Screen (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          )}
        </div>
      </header>

      {/* Center Body: Stylish Semi-Bold Scripture Presentation */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-2 md:px-6 my-auto">
        <AnimatePresence mode="wait">
          {scripture ? (
            <motion.div
              key={scripture.reference + (scripture.text || '') + activeTranslationCode}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.98 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`w-full max-w-6xl mx-auto rounded-3xl border backdrop-blur-sm shadow-2xl flex flex-col items-center justify-center ${
                previewMode ? 'p-3' : 'p-8 md:p-12 lg:p-14'
              } ${currentStyles.frame}`}
            >
              {/* Reference Header & Version Pill */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-2 md:mb-4">
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
                <span
                  className={`rounded-lg border font-bold uppercase tracking-widest ${
                    previewMode
                      ? 'px-1.5 py-0.5 text-[9px]'
                      : 'px-3 py-1 text-xs md:text-sm'
                  } ${currentStyles.badge}`}
                >
                  {activeTranslationCode}
                </span>
              </div>

              {/* Ornamental Gold Divider */}
              <div
                className={`w-2/3 max-w-md h-[2px] bg-gradient-to-r ${currentStyles.divider} ${
                  previewMode ? 'my-1.5' : 'my-4 md:my-6'
                }`}
              />

              {/* Semi-Bold Scripture Verse Body Text */}
              <div
                className={`max-w-5xl font-semibold tracking-wide drop-shadow-sm ${
                  previewMode
                    ? 'text-xs line-clamp-3 leading-snug'
                    : `${getDynamicFontSize(scripture.text)} leading-[1.45]`
                } ${currentStyles.verseText}`}
              >
                “{scripture.text}”
              </div>
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
                  className={`${
                    previewMode ? 'w-14 h-14 rounded-2xl' : 'w-28 h-28 md:w-36 md:h-36 rounded-3xl'
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
                        previewMode ? 'w-7 h-7 text-gold-400' : 'w-14 h-14 md:w-16 md:h-16 text-gold-400'
                      }
                    />
                  )}
                </div>
              </div>
              <h2
                className={`${
                  previewMode ? 'text-sm' : 'text-2xl md:text-4xl'
                } font-extrabold font-display text-white tracking-tight mb-2`}
              >
                {churchTitle}
              </h2>
              <p
                className={`${
                  previewMode ? 'text-[10px]' : 'text-sm md:text-base'
                } text-gold-400/90 font-semibold tracking-widest uppercase`}
              >
                {translationFullName} ({activeTranslationCode})
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Bar: Church Identity & Active Bible Translation */}
      <footer
        className={`relative z-10 flex items-center justify-between border-t border-white/10 font-semibold ${
          previewMode ? 'pt-1.5 text-[9px]' : 'pt-4 text-xs md:text-sm'
        } opacity-80`}
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
