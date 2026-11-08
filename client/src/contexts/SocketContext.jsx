import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE, assetUrl } from '../utils/config';
import { detectScripture, detectVoiceCommand, parseReferenceContext } from '../utils/scriptureDetector';
import { fetchFallbackVerseText, matchFallbackQuote } from '../utils/bibleData';
import api from '../utils/api';
import toast from 'react-hot-toast';

const BIBLE_WHISPER_PROMPT =
  'Bible scripture reference and sanctuary commands: Genesis, Exodus, Leviticus, Numbers, Deuteronomy, Joshua, Judges, Ruth, 1 Samuel, 2 Samuel, 1 Kings, 2 Kings, 1 Chronicles, 2 Chronicles, Ezra, Nehemiah, Esther, Job, Psalms, Psalm 1 verse 2, Proverbs, Ecclesiastes, Song of Solomon, Isaiah, Jeremiah, Lamentations, Ezekiel, Daniel, Hosea, Joel, Amos, Obadiah, Jonah, Micah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi, Matthew, Mark, Luke, John 3:16, Acts, Romans 8:28, 1 Corinthians 13:4, 2 Corinthians, Galatians, Ephesians, Philippians, Colossians, 1 Thessalonians, 2 Thessalonians, 1 Timothy, 2 Timothy, Titus, Philemon, Hebrews, James, 1 Peter, 2 Peter, 1 John, 2 John, 3 John, Jude, Revelation. Commands: go to verse 4, navigate to verse 9, verse 6, next verse, previous verse, scroll down, scroll up, close, clear.';

const WHISPER_HALLUCINATION_REGEX =
  /^(\s*(thank you\.?|thanks for watching!?|you\.?|bye\.?|subtitles by.*|amara\.org.*|\.+)\s*)$/i;

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

  // OpenAI Whisper Speech-to-Text configuration & engine state
  const [speechEngine, setSpeechEngine] = useState(() => {
    try {
      const saved = localStorage.getItem('scripturelive_speech_engine');
      return saved === 'web-speech' || saved === 'hybrid' || saved === 'openai'
        ? saved
        : 'openai';
    } catch {
      return 'openai';
    }
  });
  const [openaiApiKey, setOpenaiApiKey] = useState(() => {
    try {
      return (
        localStorage.getItem('scripturelive_openai_api_key') ||
        import.meta.env.VITE_OPENAI_API_KEY ||
        ''
      );
    } catch {
      return import.meta.env.VITE_OPENAI_API_KEY || '';
    }
  });
  const [openaiSttStatus, setOpenaiSttStatus] = useState('ready');

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
  const speechEngineRef = useRef(speechEngine);
  const openaiApiKeyRef = useRef(openaiApiKey);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recorderCycleTimerRef = useRef(null);
  const currentAudioLevelRef = useRef(0);
  const peakChunkLevelRef = useRef(0);
  const lastAuthErrorToastRef = useRef(0);
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
  const lastBackendText = useRef('');

  useEffect(() => {
    speechEngineRef.current = speechEngine;
  }, [speechEngine]);

  useEffect(() => {
    openaiApiKeyRef.current = openaiApiKey;
  }, [openaiApiKey]);

  const updateSpeechEngine = useCallback((engine) => {
    setSpeechEngine(engine);
    speechEngineRef.current = engine;
    try {
      localStorage.setItem('scripturelive_speech_engine', engine);
    } catch { }
  }, []);

  const saveOpenaiApiKey = useCallback((key) => {
    const trimmed = (key || '').trim();
    setOpenaiApiKey(trimmed);
    openaiApiKeyRef.current = trimmed;
    try {
      if (trimmed) {
        localStorage.setItem('scripturelive_openai_api_key', trimmed);
      } else {
        localStorage.removeItem('scripturelive_openai_api_key');
      }
    } catch { }
    setOpenaiSttStatus(trimmed ? 'ready' : 'hybrid');
  }, []);

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

    socketInstance.on('update-branding', (branding) => {
      if (userRef.current) {
        userRef.current.branding = branding;
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
      const activeUser = userRef.current;
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
          'KJV'
        ).toUpperCase(),
        timestamp: new Date().toISOString(),
        churchId: activeUser?.id || activeUser?.churchId || 'public',
        churchName:
          scriptureData.churchName ||
          activeUser?.churchName ||
          activeUser?.name ||
          'Sanctuary Worship',
        logoUrl: assetUrl(scriptureData.logoUrl || activeUser?.logoUrl || ''),
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

  // Update branding broadcast
  const emitUpdateBranding = useCallback(
    (branding) => {
      if (socket && socket.connected) {
        const churchId = userRef.current?.id || userRef.current?.churchId || 'public';
        socket.emit('update-branding', { churchId, branding });
      }
    },
    [socket]
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

        // 2. Check for Full Bible Scripture Reference ("Psalm 1 verse 2", "John 3:16")
        const candidateText =
          rollingWindow && rollingWindow.length > text.length ? rollingWindow : text;
        const detected =
          detectScripture(text) || (rollingWindow ? detectScripture(rollingWindow) : null);

        if (detected) {
          if (interimQuoteTimer.current) {
            clearTimeout(interimQuoteTimer.current);
            interimQuoteTimer.current = null;
          }

          const now = Date.now();
          if (
            !bypassCooldown &&
            lastDetectedRef.current === detected.reference &&
            now - lastDetectedTime.current < 2000
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
        const wordCount = candidateText.trim().split(/\s+/).length;
        if (isFinal) {
          if (interimQuoteTimer.current) {
            clearTimeout(interimQuoteTimer.current);
            interimQuoteTimer.current = null;
          }
          await runBackendDetection(candidateText, currentTranslation, bypassCooldown);
        } else if (wordCount >= 5) {
          if (interimQuoteTimer.current) clearTimeout(interimQuoteTimer.current);
          interimQuoteTimer.current = setTimeout(() => {
            runBackendDetection(candidateText, currentTranslation, false);
          }, 320);
        }
      },
      [emitClearProjection, emitScrollProjection, emitScriptureDetected, runBackendDetection, saveHistory]
  );

  const processVoiceTranscriptRef = useRef(processVoiceTranscript);
  useEffect(() => {
    processVoiceTranscriptRef.current = processVoiceTranscript;
  }, [processVoiceTranscript]);

  // Convert recorded audio Blob to base64 string
  const blobToBase64 = useCallback((blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = String(reader.result || '');
        const idx = result.indexOf(',');
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  // Transcribe audio chunk via OpenAI Speech-to-Text API (/v1/audio/transcriptions, whisper-1)
  const transcribeWithOpenAI = useCallback(
    async (audioBlob, mimeType = 'audio/webm') => {
      if (!audioBlob || audioBlob.size < 900) return;

      try {
        const cleanMime = (mimeType || 'audio/webm').split(';')[0] || 'audio/webm';
        const ext = cleanMime.includes('mp4') || cleanMime.includes('m4a')
          ? 'm4a'
          : cleanMime.includes('ogg')
            ? 'ogg'
            : cleanMime.includes('wav')
              ? 'wav'
              : 'webm';

        const clientKey = (openaiApiKeyRef.current || '').trim();
        let transcript = '';

        // 1. If an OpenAI API key is configured on the client, call OpenAI /v1/audio/transcriptions directly
        if (clientKey) {
          setOpenaiSttStatus('streaming');
          const formData = new FormData();
          const audioFile = new File([audioBlob], `speech.${ext}`, { type: cleanMime });
          formData.append('file', audioFile);
          formData.append('model', 'whisper-1');
          formData.append('language', 'en');
          formData.append('temperature', '0');
          formData.append('prompt', BIBLE_WHISPER_PROMPT);

          const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${clientKey}`,
            },
            body: formData,
          });

          if (openaiRes.ok) {
            const openaiData = await openaiRes.json();
            transcript = (openaiData.text || '').trim();
            setOpenaiSttStatus('active');
          } else {
            const errData = await openaiRes.json().catch(() => ({}));
            if (openaiRes.status === 401) {
              setOpenaiSttStatus('error');
              const now = Date.now();
              if (now - lastAuthErrorToastRef.current > 10000) {
                lastAuthErrorToastRef.current = now;
                toast.error(
                  errData?.error?.message || 'Invalid OpenAI API Key. Please check your sk-... key.'
                );
              }
            } else {
              setOpenaiSttStatus('hybrid');
            }
          }
        } else {
          // 2. Otherwise try the backend /api/bible/speech-to-text endpoint (which uses server OPENAI_API_KEY if configured)
          try {
            const audioContent = await blobToBase64(audioBlob);
            const res = await api.post('/bible/speech-to-text', {
              audioContent,
              mimeType: cleanMime,
              language: 'en',
            });
            if (res.data?.provider === 'openai-whisper') {
              setOpenaiSttStatus('active');
              transcript = (res.data.transcript || '').trim();
            } else {
              setOpenaiSttStatus('hybrid');
            }
          } catch {
            setOpenaiSttStatus('hybrid');
          }
        }

        if (
          transcript &&
          !WHISPER_HALLUCINATION_REGEX.test(transcript) &&
          processVoiceTranscriptRef.current
        ) {
          processVoiceTranscriptRef.current(transcript, true, false, transcript);
        }
      } catch (err) {
        console.warn('OpenAI STT chunk error:', err);
      }
    },
    [blobToBase64]
  );

  // Start smart voice-activity endpointed MediaRecorder loop for OpenAI Whisper Speech-to-Text
  const startOpenAIRecorderLoop = useCallback(
    (stream) => {
      if (typeof window.MediaRecorder === 'undefined' || !stream) return;

      let chosenMime = '';
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      for (const mime of candidates) {
        if (window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(mime)) {
          chosenMime = mime;
          break;
        }
      }

      const runCycle = () => {
        if (!shouldListenRef.current || !mediaStreamRef.current) return;
        if (speechEngineRef.current === 'web-speech') {
          recorderCycleTimerRef.current = setTimeout(runCycle, 1500);
          return;
        }

        try {
          const chunks = [];
          peakChunkLevelRef.current = 0;
          let hasSpokenInChunk = false;
          let lastSpeechAt = Date.now();
          const chunkStartedAt = Date.now();

          const recorder = chosenMime
            ? new window.MediaRecorder(stream, { mimeType: chosenMime })
            : new window.MediaRecorder(stream);

          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          recorder.onstop = () => {
            if (
              chunks.length > 0 &&
              hasSpokenInChunk &&
              peakChunkLevelRef.current > 3.2 &&
              shouldListenRef.current
            ) {
              const blob = new Blob(chunks, { type: chosenMime || 'audio/webm' });
              transcribeWithOpenAI(blob, chosenMime || 'audio/webm');
            }
            if (shouldListenRef.current) {
              recorderCycleTimerRef.current = setTimeout(runCycle, 60);
            }
          };

          recorder.start();

          // Poll audio level every 160ms for natural utterance endpointing
          const checkEndpoint = () => {
            if (!shouldListenRef.current || recorder.state !== 'recording') return;

            const now = Date.now();
            const elapsed = now - chunkStartedAt;
            const lvl = currentAudioLevelRef.current;

            if (lvl > 3.2) {
              hasSpokenInChunk = true;
              lastSpeechAt = now;
            }

            const silenceDuration = now - lastSpeechAt;

            // Stop & transcribe as soon as speaker pauses for 650ms after speaking, or after 3.6s max utterance length, or reset after 2.4s of pure silence
            if (
              (hasSpokenInChunk && silenceDuration >= 650 && elapsed >= 900) ||
              elapsed >= 3600 ||
              (!hasSpokenInChunk && elapsed >= 2400)
            ) {
              try {
                recorder.stop();
              } catch { }
              return;
            }

            recorderCycleTimerRef.current = setTimeout(checkEndpoint, 160);
          };

          recorderCycleTimerRef.current = setTimeout(checkEndpoint, 200);
        } catch (err) {
          console.warn('MediaRecorder cycle error:', err);
        }
      };

      runCycle();
    },
    [transcribeWithOpenAI]
  );

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

      // Launch OpenAI Whisper Speech-to-Text chunk recorder on the microphone stream
      startOpenAIRecorderLoop(stream);

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
        const avg = sum / dataArray.length;
        currentAudioLevelRef.current = avg;
        if (avg > peakChunkLevelRef.current) {
          peakChunkLevelRef.current = avg;
        }
        setAudioLevel(avg);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.warn('Microphone stream access error:', err);
    }
  }, [startOpenAIRecorderLoop]);

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

    if (recorderCycleTimerRef.current) {
      clearTimeout(recorderCycleTimerRef.current);
      recorderCycleTimerRef.current = null;
    }

    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } catch { }
      mediaRecorderRef.current = null;
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

    currentAudioLevelRef.current = 0;
    setAudioLevel(0);
  }, [broadcastMicStatus]);

  const startGlobalListening = useCallback(
    async (silentToast = false) => {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition && typeof window.MediaRecorder === 'undefined') {
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
          if (!shouldListenRef.current || !SpeechRecognition) return;

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

            const startIdx = Math.max(0, event.resultIndex - 1);
            let rollingWindow = '';

            for (let i = startIdx; i < event.results.length; ++i) {
              const bestPiece = event.results[i][0].transcript;
              rollingWindow += ' ' + bestPiece;

              if (i >= event.resultIndex) {
                if (event.results[i].isFinal) {
                  finalTranscript += bestPiece;
                } else {
                  interimTranscript += bestPiece;
                }
              }
            }

            if (processVoiceTranscriptRef.current) {
              if (finalTranscript.trim()) {
                processVoiceTranscriptRef.current(
                  finalTranscript.trim(),
                  true,
                  false,
                  rollingWindow.trim()
                );
              } else if (interimTranscript.trim()) {
                processVoiceTranscriptRef.current(
                  interimTranscript.trim(),
                  false,
                  false,
                  rollingWindow.trim()
                );
              }
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
        if (SpeechRecognition) {
          createAndStartRecognition();
        }
        setupAudioAnalyser();

        if (!silentToast) {
          toast.success(
            'OpenAI Whisper Speech-to-Text active — listening for scriptures & commands'
          );
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
    speechEngine,
    updateSpeechEngine,
    openaiApiKey,
    saveOpenaiApiKey,
    openaiSttStatus,
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
