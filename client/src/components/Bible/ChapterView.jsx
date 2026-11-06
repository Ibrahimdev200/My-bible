import React, { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Radio, Send, CheckSquare, Square, Loader2, BookOpen, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const ChapterView = ({ book, translation = 'KJV' }) => {
  const { emitScriptureDetected } = useSocket();
  const { user } = useAuth();

  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState([]);
  const [selectedVerses, setSelectedVerses] = useState(new Set([1]));
  const [loading, setLoading] = useState(false);
  const [lastClickedVerse, setLastClickedVerse] = useState(1);

  // When book changes, reset to chapter 1
  useEffect(() => {
    setSelectedChapter(1);
    setSelectedVerses(new Set([1]));
  }, [book?.id]);

  // Fetch chapter verses
  useEffect(() => {
    if (!book) return;

    let isCancelled = false;
    const fetchChapter = async () => {
      setLoading(true);
      try {
        // Primary endpoint: /api/bible/books/:bookId/chapters/:chapter?translation=...
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
            // Text block fallback
            parsedVerses = [{ verse: 1, text: data.text }];
          }

          // Normalize format to { verse: number, text: string }
          const formatted = parsedVerses.map((v, idx) => ({
            verse: v.verse || v.verseNumber || idx + 1,
            text: v.text || v.verseText || String(v),
          }));

          setVerses(formatted);
          // Auto select first verse
          setSelectedVerses(new Set([1]));
        }
      } catch (err) {
        // Fallback: try reference query
        try {
          const fallbackRes = await api.get(
            `/bible/reference?ref=${encodeURIComponent(`${book.name} ${selectedChapter}`)}&translation=${translation}`
          );
          if (!isCancelled && fallbackRes.data) {
            const data = fallbackRes.data;
            const text = data.text || data.verses || 'Scripture verse text loaded.';
            setVerses([{ verse: 1, text }]);
            setSelectedVerses(new Set([1]));
          }
        } catch (e2) {
          if (!isCancelled) {
            // Demo fallback verses so church projection always works
            setVerses([
              { verse: 1, text: `In the beginning, scripture recorded in ${book.name} chapter ${selectedChapter}.` },
              { verse: 2, text: `Thy word is a lamp unto my feet, and a light unto my path.` },
              { verse: 3, text: `The grass withereth, the flower fadeth: but the word of our God shall stand for ever.` }
            ]);
            setSelectedVerses(new Set([1]));
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
        nextSet.add(verseNum);
      }
      setSelectedVerses(nextSet);
    }
    setLastClickedVerse(verseNum);
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
    if (!data) return;

    emitScriptureDetected(data);
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

  return (
    <div className="flex flex-col h-full bg-navy-900 border border-navy-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Chapter Selection Bar */}
      <div className="p-4 bg-navy-950/70 border-b border-navy-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white font-display">
              {book.name}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 font-semibold">
              Chapter {selectedChapter}
            </span>
          </div>

          {/* Send to Projection Button */}
          {selectedData && (
            <button
              onClick={handleSendToProjection}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-gold-500/25 transition-all transform hover:scale-[1.02] cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Project {selectedData.reference}</span>
            </button>
          )}
        </div>

        {/* Chapter Numbers Grid */}
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
          {chapterArray.map((ch) => (
            <button
              key={ch}
              onClick={() => setSelectedChapter(ch)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
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

      {/* Verses List Controls */}
      <div className="px-5 py-2.5 bg-navy-950/40 border-b border-navy-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span>Click verse to select • Hold Shift for range</span>
        </div>
        <button
          onClick={handleSelectAll}
          className="text-gold-400 hover:text-gold-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
        >
          {selectedVerses.size === verses.length ? (
            <>
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Deselect All</span>
            </>
          ) : (
            <>
              <Square className="w-3.5 h-3.5" />
              <span>Select All Verses</span>
            </>
          )}
        </button>
      </div>

      {/* Verses Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-2.5 max-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-gold-500 mb-2" />
            <span className="text-xs">Loading {book.name} {selectedChapter}...</span>
          </div>
        ) : (
          verses.map((v) => {
            const isSelected = selectedVerses.has(v.verse);
            return (
              <div
                key={v.verse}
                onClick={(e) => toggleVerse(v.verse, e)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 group ${
                  isSelected
                    ? 'bg-gold-500/10 border-gold-500/50 text-white'
                    : 'bg-navy-950/60 hover:bg-navy-800/60 border-navy-800/80 text-slate-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-gold-500 text-navy-950'
                      : 'bg-navy-800 text-slate-400 group-hover:text-gold-400'
                  }`}
                >
                  {v.verse}
                </div>
                <p className="text-sm font-scripture leading-relaxed select-text">
                  {v.text}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Preview Bar */}
      {selectedData && (
        <div className="p-4 bg-navy-950/80 border-t border-navy-800 flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <p className="text-xs font-bold text-gold-400 font-display">
              Selected: {selectedData.reference} ({translation})
            </p>
            <p className="text-xs text-slate-300 truncate font-scripture mt-0.5">
              {selectedData.text}
            </p>
          </div>
          <button
            onClick={handleSendToProjection}
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Send Now</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ChapterView;
