import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE, assetUrl } from '../utils/config';
import { detectScripture, detectVoiceCommand, parseReferenceContext } from '../utils/scriptureDetector';
import { fetchFallbackVerseText, matchFallbackQuote } from '../utils/bibleData';
import api from '../utils/api';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentScripture, setCurrentScripture] = useState(() => {
    try {
      const saved = localStorage.getItem('scripturelive_active_scripture');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  // Default 5 minutes (300 seconds) display duration as requested
  const [displayDuration, setDisplayDuration] = useState(300);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isMicListening, setIsMicListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [autoProject, setAutoProject] = useState(true);
  const [pendingScripture, setPendingScripture] = useState(null);
  const [sessionDetections, setSessionDetections] = useState([]);
  const [scrollCommand, setScrollCommand] = useState(null);

  // Unique ID for this browser tab so only ONE tab holds the hardware SpeechRecognition lock at a time
  const tabIdRef = useRef(`tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  // Refs for global continuous voice capture
  const channelRef = useRef(null);
  const timerRef = useRef(null);
  const currentScriptureRef = useRef(currentScripture);
  // Persists the last projected chapter context even after "Close" so relative commands ("go to verse 4", "9") always work
  const lastScriptureContextRef = useRef(
    currentScripture || {
      reference: 'Psalms 1:1',
      book: 'Psalms',
      bookName: 'Psalms',
      chapter: 1,
      verse: 1,
      startVerse: 1,
      endVerse: 1,
    }
  );
  const userRef = useRef(user);
  const autoProjectRef = useRef(autoProject);
  const displayDurationRef = useRef(displayDuration);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const lastDetectedRef = useRef('');
  const lastDetectedTime = useRef(0);
  const lastCommandKey = useRef('');
  const lastCommandTime = useRef(0);
  const interimQuoteTimer = useRef(null);
  const interimProcessTimer = useRef(null);
  const lastBackendText = useRef('');

  useEffect(() => {
    currentScriptureRef.current = currentScripture;
    if (currentScripture) {
      lastScriptureContextRef.current = currentScripture;
    }
  }, [currentScripture]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    autoProjectRef.current = autoProject;
  }, [autoProject]);

  useEffect(() => {
    displayDurationRef.current = displayDuration;
  }, [displayDuration]);

  // Initialize broadcast channel for instant multi-tab syncing (Dashboard <-> Projection)
  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel('scripturelive_channel');
      channelRef.current.onmessage = (event) => {
        const { type, payload, senderTabId } = event.data;
        if (type === 'SCRIPTURE_DETECTED') {
          setCurrentScripture(payload);
          currentScriptureRef.current = payload;
        } else if (type === 'CLEAR_PROJECTION') {
          setCurrentScripture(null);
          currentScriptureRef.current = null;
        } else if (type === 'MIC_STATUS') {
          // Another tab took over or stopped the microphone
          if (payload && senderTabId && senderTabId !== tabIdRef.current) {
            // Release hardware mic in this tab so the active tab has exclusive SpeechRecognition access
            if (shouldListenRef.current) {
              shouldListenRef.current = false;
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.onend = null;
                  recognitionRef.current.stop();
                } catch { }
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
                audioContextRef.current.close().catch(() => { });
                audioContextRef.current = null;
              }
            }
          }
          setIsMicListening(Boolean(payload));
        } else if (type === 'LIVE_TRANSCRIPT') {
          setLiveTranscript(payload || '');
        } else if (type === 'SCROLL_PROJECTION') {
          setScrollCommand({ ...payload, ts: Date.now() });
        } else if (type === 'REMOTE_TOGGLE_MIC') {
          // If another tab requested stopping the mic and this tab owns it, stop cleanly
          if (payload === false && shouldListenRef.current) {
            shouldListenRef.current = false;
            setIsMicListening(false);
            if (recognitionRef.current) {
              try {
                recognitionRef.current.onend = null;
                recognitionRef.current.stop();
              } catch { }
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
              audioContextRef.current.close().catch(() => { });
              audioContextRef.current = null;
            }
          }
        } else if (type === 'CHURCH_SETTINGS_UPDATED') {
          const settings = payload || {};
          if (settings.branding?.displayDuration !== undefined) {
            setDisplayDuration(settings.branding.displayDuration);
          }
          setCurrentScripture((prev) => {
            if (!prev) return null;
            const updated = {
              ...prev,
              churchName: settings.churchName || settings.name || prev.churchName,
              logoUrl: settings.logoUrl !== undefined ? settings.logoUrl : prev.logoUrl,
              translation: settings.preferredTranslation || prev.translation || 'KJV',
            };
            try {
              localStorage.setItem('scripturelive_active_scripture', JSON.stringify(updated));
            } catch { }
            return updated;
          });
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this browser environment', e);
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, []);

  // Socket.io initialization
  useEffect(() => {
    const socketInstance = io(API_BASE || window.location.origin, {
      path: '/socket.io',
      auth: {
        token: token || '',
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      const churchId = user?.id || user?.churchId || 'public';
      socketInstance.emit('join-church', { churchId });
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('scripture-detected', (data) => {
      setCurrentScripture(data);
      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'SCRIPTURE_DETECTED', payload: data });
      }
    });

    socketInstance.on('clear-projection', () => {
      setCurrentScripture(null);
      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'CLEAR_PROJECTION' });
      }
    });

    socketInstance.on('scroll-projection', (data) => {
      const cmd = { direction: data.direction || 'down', amount: data.amount || 260, ts: Date.now() };
      setScrollCommand(cmd);
      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'SCROLL_PROJECTION', payload: cmd });
      }
    });

    socketInstance.on('update-branding', (data) => {
      const updatedBranding = data?.branding || (data?.template ? data : null);
      const updatedChurch = data?.church;
      if (userRef.current) {
        if (updatedBranding) userRef.current.branding = updatedBranding;
        if (updatedChurch) {
          userRef.current.churchName = updatedChurch.churchName || userRef.current.churchName;
          userRef.current.name = updatedChurch.name || userRef.current.name;
          if (updatedChurch.logoUrl) userRef.current.logoUrl = updatedChurch.logoUrl;
          if (updatedChurch.preferredTranslation) userRef.current.preferredTranslation = updatedChurch.preferredTranslation;
        }
      }
      if (updatedBranding?.displayDuration !== undefined) {
        setDisplayDuration(updatedBranding.displayDuration);
      }
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'CHURCH_SETTINGS_UPDATED',
          payload: { branding: updatedBranding, ...(updatedChurch || {}) },
        });
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user?.id, user?.churchId]);

  // Emit scripture detected to projection
  const emitScriptureDetected = useCallback(
    (scriptureData) => {
      const savedChurch = (() => {
        try {
          const raw = localStorage.getItem('scripturelive_local_church');
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();
      const activeUser = userRef.current || savedChurch;
      const parsedCtx = parseReferenceContext(scriptureData);

      const payload = {
        ...scriptureData,
        book: scriptureData.book || scriptureData.bookName || parsedCtx?.bookName || '',
        chapter: scriptureData.chapter || parsedCtx?.chapter || 1,
        verse:
          scriptureData.verse ||
          scriptureData.startVerse ||
          (parsedCtx
            ? parsedCtx.endVerse > parsedCtx.startVerse
              ? `${parsedCtx.startVerse}-${parsedCtx.endVerse}`
              : parsedCtx.startVerse
            : 1),
        translation: (
          scriptureData.translation ||
          activeUser?.preferredTranslation ||
          savedChurch?.preferredTranslation ||
          'KJV'
        ).toUpperCase(),
        timestamp: new Date().toISOString(),
        churchId: activeUser?.id || activeUser?.churchId || 'public',
        churchName:
          scriptureData.churchName ||
          activeUser?.churchName ||
          activeUser?.name ||
          savedChurch?.churchName ||
          savedChurch?.name ||
          'Sanctuary Worship',
        logoUrl: assetUrl(
          scriptureData.logoUrl ||
          activeUser?.logoUrl ||
          savedChurch?.logoUrl ||
          savedChurch?.logoPath ||
          ''
        ),
      };

      setCurrentScripture(payload);
      currentScriptureRef.current = payload;

      try {
        localStorage.setItem('scripturelive_active_scripture', JSON.stringify(payload));
      } catch { }

      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'SCRIPTURE_DETECTED', payload });
      }

      if (socket && socket.connected) {
        socket.emit('scripture-detected', payload);
      }

      // Reset 5-minute (or custom) auto-clear timer
      if (timerRef.current) clearTimeout(timerRef.current);
      const dur = displayDurationRef.current;
      if (dur > 0) {
        timerRef.current = setTimeout(() => {
          setCurrentScripture((prev) => {
            if (prev?.reference === payload.reference) {
              try {
                localStorage.removeItem('scripturelive_active_scripture');
              } catch { }
              if (channelRef.current) {
                channelRef.current.postMessage({ type: 'CLEAR_PROJECTION' });
              }
              if (socket && socket.connected) {
                socket.emit('clear-projection', { churchId: payload.churchId });
              }
              return null;
            }
            return prev;
          });
        }, dur * 1000);
      }
    },
    [socket]
  );

  // Emit clear projection
  const emitClearProjection = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentScripture(null);
    currentScriptureRef.current = null;
    try {
      localStorage.removeItem('scripturelive_active_scripture');
    } catch { }

    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'CLEAR_PROJECTION' });
    }

    if (socket && socket.connected) {
      const churchId = userRef.current?.id || userRef.current?.churchId || 'public';
      socket.emit('clear-projection', { churchId });
    }
  }, [socket]);

  // Emit scroll command to projector (up / down)
  const emitScrollProjection = useCallback(
    (direction = 'down', amount = 260) => {
      const cmd = { direction, amount, ts: Date.now() };
      setScrollCommand(cmd);

      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'SCROLL_PROJECTION', payload: cmd });
      }

      if (socket && socket.connected) {
        const churchId = userRef.current?.id || userRef.current?.churchId || 'public';
        socket.emit('scroll-projection', { churchId, direction, amount });
      }
    },
    [socket]
  );

  // Emit church settings and branding changes to projector and all open tabs
  const emitUpdateChurchSettings = useCallback(
    (settings) => {
      if (!settings) return;

      const resolvedName = (settings.churchName || settings.name || '').trim();

      // 1. Update localStorage offline church
      let merged = {};
      try {
        const raw = localStorage.getItem('scripturelive_local_church');
        const current = raw ? JSON.parse(raw) : {};
        merged = {
          ...current,
          ...settings,
          churchName: resolvedName || current.churchName,
          name: resolvedName || current.name,
          branding: { ...(current.branding || {}), ...(settings.branding || {}) },
          preferredTranslation: settings.preferredTranslation || current.preferredTranslation || 'KJV',
        };
        localStorage.setItem('scripturelive_local_church', JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('church-settings-updated', { detail: merged }));
      } catch { }

      // 2. Update userRef in memory
      if (userRef.current) {
        if (resolvedName) {
          userRef.current.churchName = resolvedName;
          userRef.current.name = resolvedName;
        }
        if (settings.logoUrl !== undefined) {
          userRef.current.logoUrl = settings.logoUrl;
        }
        if (settings.preferredTranslation) {
          userRef.current.preferredTranslation = settings.preferredTranslation;
        }
        if (settings.branding) {
          userRef.current.branding = {
            ...(userRef.current.branding || {}),
            ...settings.branding,
          };
        }
      }

      // 3. Update display duration if customized
      if (settings.branding?.displayDuration !== undefined) {
        setDisplayDuration(settings.branding.displayDuration);
      }

      // 4. Update currently projected scripture (if any)
      setCurrentScripture((prev) => {
        if (!prev) return null;
        const updated = {
          ...prev,
          churchName: resolvedName || prev.churchName,
          logoUrl: settings.logoUrl !== undefined ? settings.logoUrl : prev.logoUrl,
          translation: settings.preferredTranslation || prev.translation || 'KJV',
        };
        try {
          localStorage.setItem('scripturelive_active_scripture', JSON.stringify(updated));
        } catch { }
        return updated;
      });

      // 5. Multi-tab BroadcastChannel
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'CHURCH_SETTINGS_UPDATED',
          payload: {
            ...settings,
            churchName: resolvedName,
            name: resolvedName,
          },
        });
      }

      // 6. Remote Socket.IO Room broadcast
      if (socket && socket.connected) {
        const churchId = userRef.current?.id || userRef.current?.churchId || 'public';
        socket.emit('update-branding', {
          churchId,
          branding: settings.branding,
          church: {
            ...settings,
            churchName: resolvedName,
            name: resolvedName,
          },
        });
      }
    },
    [socket]
  );

  // Update branding broadcast
  const emitUpdateBranding = useCallback(
    (branding) => {
      emitUpdateChurchSettings({ branding });
    },
    [emitUpdateChurchSettings]
  );

  // Broadcast mic status
  const broadcastMicStatus = useCallback((active) => {
    setIsMicListening(active);
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'MIC_STATUS',
        payload: active,
        senderTabId: tabIdRef.current,
      });
    }
  }, []);

  // Save scripture detection to history (both local storage and backend API)
  const saveHistory = useCallback((entry, spokenText) => {
    const record = {
      id: entry.id || `${entry.reference}_${Date.now()}`,
      reference: entry.reference,
      verseText: entry.text,
      text: entry.text,
      book: entry.book || '',
      chapter: entry.chapter || '',
      verse: entry.verse || '',
      translation: entry.translation,
      confidence: entry.confidence || 0.95,
      speechText: spokenText,
      spokenText,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    try {
      const existingRaw = localStorage.getItem('scripturelive_local_history');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const next = [record, ...existing].slice(0, 150);
      localStorage.setItem('scripturelive_local_history', JSON.stringify(next));
    } catch { }

    api.post('/scripture/history', record).catch(() => { });
  }, []);

  // Query backend quote engine (with client-side quote fallback if server is unreachable)
  const runBackendDetection = useCallback(
    async (phrase, currentTranslation, bypassCooldown = false) => {
      const clean = phrase.trim();
      if (!clean) return;
      if (!bypassCooldown && clean === lastBackendText.current) return;
      lastBackendText.current = clean;

      let data = null;
      try {
        const res = await api.post('/bible/detect', {
          text: clean,
          translation: currentTranslation,
          ignoreDebounce: bypassCooldown,
        });
        if (res.data && res.data.detected && res.data.reference) {
          data = res.data;
        }
      } catch {
        data = null;
      }

      if (!data) {
        data = await matchFallbackQuote(clean, currentTranslation);
      }

      if (data && data.detected && data.reference) {
        const now = Date.now();
        if (
          !bypassCooldown &&
          lastDetectedRef.current === data.reference &&
          now - lastDetectedTime.current < 2000
        ) {
          return;
        }
        lastDetectedRef.current = data.reference;
        lastDetectedTime.current = now;

        const newEntry = {
          id: `${data.reference}_${Date.now()}`,
          reference: data.reference,
          text: data.text || data.verseText || '',
          book: data.book || data.bookName || '',
          chapter: data.chapter || '',
          verse: data.verse || data.startVerse || '',
          translation: (data.translation || currentTranslation).toUpperCase(),
          confidence: data.confidence || 0.9,
          matchedText: clean,
          timestamp: new Date().toISOString(),
        };

        lastScriptureContextRef.current = newEntry;
        setSessionDetections((prev) => [newEntry, ...prev]);
        saveHistory(newEntry, clean);

        if (autoProjectRef.current) {
          emitScriptureDetected(newEntry);
          toast.success(`Projected: ${newEntry.reference} (${newEntry.translation})`, {
            duration: 2800,
          });
        } else {
          setPendingScripture(newEntry);
          toast(`Scripture Ready: ${newEntry.reference}`, { icon: '📖' });
        }
      } else if (bypassCooldown) {
        toast.error('No Bible reference, verse quote, or command matched that phrase.');
      }
    },
    [emitScriptureDetected, saveHistory]
  );

  // Unified Voice Transcript Processor (handles Full References, Relative Verse Navigation, Scroll Up/Down, Close/Clear, and Spoken Quotes)
  const processVoiceTranscript = useCallback(
    async (text, isFinal, bypassCooldown = false, rollingWindow = '') => {
      if (!text || !text.trim()) return;
      setLiveTranscript(text);
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'LIVE_TRANSCRIPT',
          payload: text,
          senderTabId: tabIdRef.current,
        });
      }

      const currentTranslation = (userRef.current?.preferredTranslation || 'KJV').toUpperCase();

      // 1. Check for Voice Control Commands first on the latest utterance (`text`):
      //    - "close" / "clear" / "vanish"
      //    - "scroll down" / "scroll up"
      //    - "go to verse 4" / "navigate to verse 9" / "next verse" / or bare number "9"
      const activeOrLastContext =
        currentScriptureRef.current || lastScriptureContextRef.current;
      const voiceCmd = detectVoiceCommand(text, activeOrLastContext);

      if (voiceCmd) {
        const now = Date.now();
        const cmdKey =
          voiceCmd.type === 'NAVIGATE'
            ? `NAV_${voiceCmd.reference}`
            : `${voiceCmd.type}_${voiceCmd.direction || ''}`;

        // Avoid firing the exact same command twice within 1.1s during interim speech
        const cooldownMs = voiceCmd.type === 'SCROLL' ? 950 : 1200;
        if (
          !bypassCooldown &&
          lastCommandKey.current === cmdKey &&
          now - lastCommandTime.current < cooldownMs
        ) {
          return;
        }

        // For bare single numbers ("9"), wait either for `isFinal` or a clean token match so "19" isn't cut at "1"
        const isBareNumber = /^\s*\d{1,3}\s*$/.test(text);
        if (isBareNumber && !isFinal && !bypassCooldown) {
          return;
        }

        lastCommandKey.current = cmdKey;
        lastCommandTime.current = now;

        if (voiceCmd.type === 'CLEAR') {
          emitClearProjection();
          toast('Projection screen cleared', { icon: '✨', duration: 2200 });
          return;
        }

        if (voiceCmd.type === 'SCROLL') {
          emitScrollProjection(voiceCmd.direction, 280);
          toast(`Scrolled ${voiceCmd.direction}`, { duration: 1500 });
          return;
        }

        if (voiceCmd.type === 'NAVIGATE') {
          let verseText = '';
          let resolvedRef = voiceCmd.reference;
          try {
            const res = await api.get(
              `/bible/reference?ref=${encodeURIComponent(voiceCmd.reference)}&translation=${currentTranslation}`
            );
              verseText = res.data?.text || res.data?.verses || '';
              if (res.data?.reference) {
                resolvedRef = res.data.reference;
              }
            } catch (e) {
              verseText = '';
            }

            if (!verseText) {
              verseText = await fetchFallbackVerseText(voiceCmd.reference, currentTranslation);
            }

            if (verseText) {
              lastDetectedRef.current = resolvedRef;
              lastDetectedTime.current = now;

              const newEntry = {
                id: `${resolvedRef}_${Date.now()}`,
                reference: resolvedRef,
                text: verseText,
                book: voiceCmd.bookName,
                chapter: voiceCmd.chapter,
                verse:
                  voiceCmd.endVerse > voiceCmd.startVerse
                    ? `${voiceCmd.startVerse}-${voiceCmd.endVerse}`
                    : voiceCmd.startVerse,
                translation: currentTranslation,
                confidence: 0.98,
                matchedText: text,
                timestamp: new Date().toISOString(),
              };

              lastScriptureContextRef.current = newEntry;
              setSessionDetections((prev) => [newEntry, ...prev]);
              saveHistory(newEntry, text);
              emitScriptureDetected(newEntry);
              toast.success(`Navigated to ${resolvedRef}`, { duration: 2500 });
            } else if (bypassCooldown) {
              toast.error(`Verse ${voiceCmd.reference} not found in this chapter.`);
            }
            return;
          }
      }

        // 2. Check for Full Bible Scripture Reference ("Psalm 1 verse 2", "John 3:16", "Psalm 23")
        const detected = detectScripture(text);

        if (detected) {
          if (interimQuoteTimer.current) {
            clearTimeout(interimQuoteTimer.current);
            interimQuoteTimer.current = null;
          }

          const now = Date.now();
          if (
            !bypassCooldown &&
            lastDetectedRef.current === detected.reference &&
            now - lastDetectedTime.current < 2500
          ) {
            return;
          }

          lastDetectedRef.current = detected.reference;
          lastDetectedTime.current = now;

          let verseText = '';
          try {
            const res = await api.get(
              `/bible/reference?ref=${encodeURIComponent(detected.reference)}&translation=${currentTranslation}`
            );
            if (res.data) {
              verseText = res.data.text || res.data.verses || '';
            }
          } catch (e) {
            verseText = '';
          }

          if (!verseText) {
            verseText = await fetchFallbackVerseText(detected.reference, currentTranslation);
          }

          if (!verseText) {
            if (bypassCooldown) {
              toast.error(`Could not load verse text for ${detected.reference}.`);
            }
            return;
          }

          const newEntry = {
            id: `${detected.reference}_${Date.now()}`,
            reference: detected.reference,
            text: verseText,
            book: detected.bookName,
            chapter: detected.chapter,
            verse:
              detected.endVerse > detected.startVerse
                ? `${detected.startVerse}-${detected.endVerse}`
                : detected.startVerse,
            translation: currentTranslation,
            confidence: detected.confidence,
            matchedText: detected.matchedText,
            timestamp: new Date().toISOString(),
          };

          lastScriptureContextRef.current = newEntry;
          setSessionDetections((prev) => [newEntry, ...prev]);
          saveHistory(newEntry, text);

          if (autoProjectRef.current) {
            emitScriptureDetected(newEntry);
            toast.success(`Projected: ${newEntry.reference} (${currentTranslation})`, {
              duration: 2800,
            });
          } else {
            setPendingScripture(newEntry);
            toast(`Scripture Ready: ${newEntry.reference}`, { icon: '📖' });
          }
          return;
        }

        // 3. Spoken Scripture Quote Detection
        // IMPORTANT FOR CHAPTER CONSISTENCY:
        // When a chapter/scripture is already displayed on the projector (`currentScriptureRef.current` is active),
        // keep that chapter locked on screen until another explicit chapter/reference is mentioned or the timer expires,
        // rather than letting background sermon sentences fuzzily jump to other chapters.
        if (currentScriptureRef.current && !bypassCooldown) {
          return;
        }

        const wordCount = text.trim().split(/\s+/).length;
        if (isFinal && (bypassCooldown || wordCount >= 6)) {
          if (interimQuoteTimer.current) {
            clearTimeout(interimQuoteTimer.current);
            interimQuoteTimer.current = null;
          }
          await runBackendDetection(text, currentTranslation, bypassCooldown);
        }
      },
      [emitClearProjection, emitScrollProjection, emitScriptureDetected, runBackendDetection, saveHistory]
  );

  const processVoiceTranscriptRef = useRef(processVoiceTranscript);
  useEffect(() => {
    processVoiceTranscriptRef.current = processVoiceTranscript;
  }, [processVoiceTranscript]);

  // Global Microphone Engine (persists across Dashboard, Bible Browser, AND Projection Screen)
  const setupAudioAnalyser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
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
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        setAudioLevel(sum / dataArray.length);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.warn('Microphone stream access error:', err);
    }
  }, []);

  const stopGlobalListening = useCallback(() => {
    shouldListenRef.current = false;
    setIsMicListening(false);
    broadcastMicStatus(false);
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'REMOTE_TOGGLE_MIC',
        payload: false,
        senderTabId: tabIdRef.current,
      });
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch { }
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
      audioContextRef.current.close().catch(() => { });
      audioContextRef.current = null;
    }

    setAudioLevel(0);
  }, [broadcastMicStatus]);

  const startGlobalListening = useCallback(
    async (silentToast = false) => {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        if (!silentToast) {
          toast.error(
            'Voice recognition is not supported in this browser. Please use Google Chrome, Edge, or Safari.'
          );
        }
        return false;
      }

      try {
        // First notify any other open tab to release its SpeechRecognition lock BEFORE starting ours
        shouldListenRef.current = true;
        setIsMicListening(true);
        broadcastMicStatus(true);

        const createAndStartRecognition = () => {
          if (!shouldListenRef.current) return;

          // Clean up any stale instance in this tab first
          if (recognitionRef.current) {
            try {
              recognitionRef.current.onend = null;
              recognitionRef.current.onerror = null;
              recognitionRef.current.onresult = null;
              recognitionRef.current.stop();
            } catch { }
            recognitionRef.current = null;
          }

          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const bestPiece = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += bestPiece;
              } else {
                interimTranscript += bestPiece;
              }
            }

            const finalClean = finalTranscript.trim();
            const interimClean = interimTranscript.trim();

            if (finalClean) {
              if (interimProcessTimer.current) {
                clearTimeout(interimProcessTimer.current);
                interimProcessTimer.current = null;
              }
              if (processVoiceTranscriptRef.current) {
                processVoiceTranscriptRef.current(finalClean, true, false);
              }
            } else if (interimClean) {
              // Update live transcript UI immediately
              setLiveTranscript(interimClean);
              if (channelRef.current) {
                channelRef.current.postMessage({
                  type: 'LIVE_TRANSCRIPT',
                  payload: interimClean,
                  senderTabId: tabIdRef.current,
                });
              }
              // Wait 500ms for speaker to finish the chapter/verse number before triggering projection
              if (interimProcessTimer.current) {
                clearTimeout(interimProcessTimer.current);
              }
              interimProcessTimer.current = setTimeout(() => {
                if (processVoiceTranscriptRef.current) {
                  processVoiceTranscriptRef.current(interimClean, false, false);
                }
              }, 500);
            }
          };

          recognition.onerror = (event) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
              if (!silentToast) {
                toast.error('Microphone access was denied. Please allow microphone permissions.');
              }
              stopGlobalListening();
            } else if (event.error === 'aborted') {
              // Another tab or browser event interrupted this instance; do not tight-loop if we released ownership
              if (!shouldListenRef.current) return;
            }
          };

          recognition.onend = () => {
            if (shouldListenRef.current) {
              setTimeout(() => {
                if (!shouldListenRef.current) return;
                createAndStartRecognition();
              }, 150);
            }
          };

          recognitionRef.current = recognition;
          try {
            recognition.start();
          } catch { }
        };

        // Call synchronously inside user click gesture so Chrome/Edge never blocks SpeechRecognition.start()
        createAndStartRecognition();
        setupAudioAnalyser();

        if (!silentToast) {
          toast.success('Voice capture active — listening for scriptures & commands');
        }
        return true;
      } catch (err) {
        console.error('Failed to start voice capture:', err);
        shouldListenRef.current = false;
        setIsMicListening(false);
        broadcastMicStatus(false);
        return false;
      }
    },
    [broadcastMicStatus, setupAudioAnalyser, stopGlobalListening]
  );

  const toggleGlobalListening = useCallback(() => {
    if (shouldListenRef.current || isMicListening) {
      stopGlobalListening();
      toast('Microphone paused');
    } else {
      startGlobalListening(false);
    }
  }, [isMicListening, startGlobalListening, stopGlobalListening]);

  const value = {
    socket,
    isConnected,
    currentScripture,
    setCurrentScripture,
    emitScriptureDetected,
    emitClearProjection,
    emitScrollProjection,
    emitUpdateBranding,
    emitUpdateChurchSettings,
    displayDuration,
    setDisplayDuration,
    liveTranscript,
    setLiveTranscript,
    isMicListening,
    broadcastMicStatus,
    audioLevel,
    autoProject,
    setAutoProject,
    pendingScripture,
    setPendingScripture,
    sessionDetections,
    setSessionDetections,
    scrollCommand,
    processVoiceTranscript,
    startGlobalListening,
    stopGlobalListening,
    toggleGlobalListening,
  };

return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
