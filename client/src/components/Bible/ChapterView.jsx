import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import {
  Radio,
  Send,
  CheckSquare,
  Square,
  Loader2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ChapterView = ({ book, translation = 'KJV', targetLocation }) => {
  const { emitScriptureDetected } = useSocket();
  const { user } = useAuth();

  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState([]);
  const [selectedVerses, setSelectedVerses] = useState(new Set([1]));
  const [loading, setLoading] = useState(false);
  const [lastClickedVerse, setLastClickedVerse] = useState(1);
  const [verseFilter, setVerseFilter] = useState('');

  const verseRefs = useRef({});
  const pendingScrollVerse = useRef(null);

  // Sync when targetLocation or book changes
  useEffect(() => {
    if (targetLocation && targetLocation.chapter) {
      const chap = Math.min(Math.max(1, targetLocation.chapter), book?.chapters || 150);
      setSelectedChapter(chap);

      const startV = targetLocation.verse || 1;
      const endV = targetLocation.endVerse || startV;
      const nextSet = new Set();
      for (let v = startV; v <= endV; v++) {
        nextSet.add(v);
      }
      setSelectedVerses(nextSet);
      setLastClickedVerse(startV);
      pendingScrollVerse.current = startV;
    } else {
      setSelectedChapter(1);
      setSelectedVerses(new Set([1]));
      setLastClickedVerse(1);
    }
    setVerseFilter('');
  }, [book?.id, targetLocation?.key]);

  // Fetch chapter verses
  useEffect(() => {
    if (!book) return;

    let isCancelled = false;
    const fetchChapter = async () => {
      setLoading(true);
      try {
        const res = await api.get(
          `/bible/books/${book.id}/chapters/${selectedChapter}?translation=${translation}`
        );

        if (!isCancelled) {
          const data = res.data;
          let parsedVerses = [];

          if (Array.isArray(data)) {
            parsedVerses = data;
          } else if (data.verses && Array.isArray(data.verses)) {
            parsedVerses = data.verses;
          } else if (typeof data.text === 'string') {
            parsedVerses = [{ verse: 1, text: data.text }];
          }

          const formatted = parsedVerses.map((v, idx) => ({
            verse: v.verse || v.verseNumber || idx + 1,
            text: v.text || v.verseText || String(v),
          }));

          setVerses(formatted);

          if (pendingScrollVerse.current) {
            const targetV = pendingScrollVerse.current;
            pendingScrollVerse.current = null;
            setTimeout(() => {
              const el = verseRefs.current[targetV];
              if (el && el.scrollIntoView) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 80);
          }
        }
      } catch (err) {
        try {
          const fallbackRes = await api.get(
            `/bible/reference?ref=${encodeURIComponent(`${book.name} ${selectedChapter}`)}&translation=${translation}`
          );
          if (!isCancelled && fallbackRes.data) {
            const data = fallbackRes.data;
            const text = data.text || data.verses || 'Scripture verse text loaded.';
            setVerses([{ verse: 1, text }]);
          }
        } catch (e2) {
          if (!isCancelled) {
            setVerses([
              {
                verse: 1,
                text: `In the beginning, scripture recorded in ${book.name} chapter ${selectedChapter}.`,
              },
            ]);
          }
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchChapter();

    return () => {
      isCancelled = true;
    };
  }, [book, selectedChapter, translation]);

  // Log projection to backend history
  const logHistory = (payload) => {
    api
      .post('/scripture/history', {
        reference: payload.reference,
        verseText: payload.text,
        text: payload.text,
        translation: payload.translation || translation,
        confidence: 1.0,
        speechText: `Bible Reader: ${payload.reference}`,
      })
      .catch(() => {});
  };

  // Handle verse selection (single or shift+click range)
  const toggleVerse = (verseNum, e) => {
    if (e.shiftKey && lastClickedVerse !== null) {
      const min = Math.min(lastClickedVerse, verseNum);
      const max = Math.max(lastClickedVerse, verseNum);
      const nextSet = new Set(selectedVerses);
      for (let i = min; i <= max; i++) {
        nextSet.add(i);
      }
      setSelectedVerses(nextSet);
    } else {
      const nextSet = new Set(selectedVerses);
      if (nextSet.has(verseNum) && nextSet.size > 1) {
        nextSet.delete(verseNum);
      } else {
        nextSet.clear();
        nextSet.add(verseNum);
      }
      setSelectedVerses(nextSet);
    }
    setLastClickedVerse(verseNum);
  };

  // Direct 1-click project on a single verse
  const handleProjectSingleVerse = (v, e) => {
    e.stopPropagation();
    const nextSet = new Set([v.verse]);
    setSelectedVerses(nextSet);
    setLastClickedVerse(v.verse);

    const payload = {
      reference: `${book.name} ${selectedChapter}:${v.verse}`,
      text: v.text,
      book: book.name,
      chapter: selectedChapter,
      verse: v.verse,
      translation,
    };

    emitScriptureDetected(payload);
    logHistory(payload);
    toast.success(`Projected ${payload.reference}`);
  };

  // Step to Previous or Next verse and immediately project it
  const handleStepVerse = (direction) => {
    if (verses.length === 0) return;
    const sorted = Array.from(selectedVerses).sort((a, b) => a - b);
    const currentAnchor =
      direction > 0
        ? sorted[sorted.length - 1] || 1
        : sorted[0] || 1;

    const targetNum = Math.min(Math.max(1, currentAnchor + direction), verses.length);
    const targetObj = verses.find((v) => v.verse === targetNum);
    if (!targetObj) return;

    setSelectedVerses(new Set([targetNum]));
    setLastClickedVerse(targetNum);

    const el = verseRefs.current[targetNum];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const payload = {
      reference: `${book.name} ${selectedChapter}:${targetObj.verse}`,
      text: targetObj.text,
      book: book.name,
      chapter: selectedChapter,
      verse: targetObj.verse,
      translation,
    };

    emitScriptureDetected(payload);
    logHistory(payload);
    toast.success(`Projected ${payload.reference}`, { duration: 2000 });
  };

  // Select all verses in this chapter
  const handleSelectAll = () => {
    if (selectedVerses.size === verses.length) {
      setSelectedVerses(new Set([1]));
    } else {
      setSelectedVerses(new Set(verses.map((v) => v.verse)));
    }
  };

  // Build combined reference & text for projection
  const getSelectedData = () => {
    const sorted = Array.from(selectedVerses).sort((a, b) => a - b);
    if (sorted.length === 0) return null;

    const start = sorted[0];
    const end = sorted[sorted.length - 1];
    const refString =
      sorted.length === 1
        ? `${book.name} ${selectedChapter}:${start}`
        : `${book.name} ${selectedChapter}:${start}-${end}`;

    const combinedText = verses
      .filter((v) => selectedVerses.has(v.verse))
      .map((v) => (selectedVerses.size > 1 ? `[${v.verse}] ${v.text}` : v.text))
      .join(' ');

    return {
      reference: refString,
      text: combinedText,
      book: book.name,
      chapter: selectedChapter,
      verse: sorted.length === 1 ? start : `${start}-${end}`,
      translation,
    };
  };

  const handleSendToProjection = () => {
    const data = getSelectedData();
    if (!data || !data.text) return;

    emitScriptureDetected(data);
    logHistory(data);
    toast.success(`Sent ${data.reference} to projector`);
  };

  if (!book) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-slate-400">
        <BookOpen className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-sm">Select a book from the left to view chapters and verses</p>
      </div>
    );
  }

  const selectedData = getSelectedData();
  const chapterArray = Array.from({ length: book.chapters }, (_, i) => i + 1);

  const filteredVerses = verses.filter((v) => {
    if (!verseFilter.trim()) return true;
    const q = verseFilter.trim().toLowerCase();
    if (String(v.verse) === q) return true;
    return v.text.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full bg-navy-900 border border-navy-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Chapter Selection Bar */}
      <div className="p-4 bg-navy-950/70 border-b border-navy-800">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white font-display">{book.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 font-semibold">
              Chapter {selectedChapter} of {book.chapters}
            </span>
          </div>

          {/* Live Stepping + Project Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleStepVerse(-1)}
              title="Project Previous Verse"
              className="px-2.5 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              onClick={() => handleStepVerse(1)}
              title="Project Next Verse"
              className="px-2.5 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {selectedData && (
              <button
                onClick={handleSendToProjection}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-gold-500/25 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Project {selectedData.reference}</span>
              </button>
            )}
          </div>
        </div>

        {/* Chapter Numbers Grid */}
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
          {chapterArray.map((ch) => (
            <button
              key={ch}
              onClick={() => {
                setSelectedChapter(ch);
                setSelectedVerses(new Set([1]));
              }}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                selectedChapter === ch
                  ? 'bg-gold-500 text-navy-950 shadow-md shadow-gold-500/20'
                  : 'bg-navy-900 hover:bg-navy-800 text-slate-300 border border-navy-800'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Verses List Controls & Quick Filter */}
      <div className="px-4 py-2 bg-navy-950/40 border-b border-navy-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={verseFilter}
            onChange={(e) => setVerseFilter(e.target.value)}
            placeholder="Filter verse # or keyword in chapter..."
            className="w-full pl-8 pr-3 py-1 bg-navy-950 border border-navy-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[11px] text-slate-500">
            Shift+Click for range • Double-click to project
          </span>
          <button
            onClick={handleSelectAll}
            className="text-gold-400 hover:text-gold-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            {selectedVerses.size === verses.length ? (
              <>
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Deselect</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>Select All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Verses Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-gold-500 mb-2" />
            <span className="text-xs">
              Loading {book.name} {selectedChapter}...
            </span>
          </div>
        ) : filteredVerses.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500">
            No verses in Chapter {selectedChapter} match "{verseFilter}".
          </div>
        ) : (
          filteredVerses.map((v) => {
            const isSelected = selectedVerses.has(v.verse);
            return (
              <div
                key={v.verse}
                ref={(el) => {
                  verseRefs.current[v.verse] = el;
                }}
                onClick={(e) => toggleVerse(v.verse, e)}
                onDoubleClick={(e) => handleProjectSingleVerse(v, e)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 group ${
                  isSelected
                    ? 'bg-gold-500/10 border-gold-500/50 text-white'
                    : 'bg-navy-950/60 hover:bg-navy-800/60 border-navy-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-gold-500 text-navy-950'
                        : 'bg-navy-800 text-slate-400 group-hover:text-gold-400'
                    }`}
                  >
                    {v.verse}
                  </div>
                  <p className="text-sm font-scripture leading-relaxed select-text">{v.text}</p>
                </div>

                <button
                  onClick={(e) => handleProjectSingleVerse(v, e)}
                  title={`Project ${book.name} ${selectedChapter}:${v.verse} immediately`}
                  className="opacity-80 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 px-2.5 py-1 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 text-[11px] font-bold flex items-center gap-1 flex-shrink-0 transition-all cursor-pointer shadow"
                >
                  <Radio className="w-3 h-3" />
                  <span>Live</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Preview Bar */}
      {selectedData && (
        <div className="p-3.5 bg-navy-950/80 border-t border-navy-800 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gold-400 font-display">
              Selected: {selectedData.reference} ({translation})
            </p>
            <p className="text-xs text-slate-300 truncate font-scripture mt-0.5">
              {selectedData.text}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleStepVerse(-1)}
              className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 transition-colors cursor-pointer"
              title="Previous Verse"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleSendToProjection}
              className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Send Live</span>
            </button>
            <button
              onClick={() => handleStepVerse(1)}
              className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 transition-colors cursor-pointer"
              title="Next Verse"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChapterView;
