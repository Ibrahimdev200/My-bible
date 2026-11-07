import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { BIBLE_BOOKS, findBibleBook } from '../../utils/bibleData';
import api from '../../utils/api';
import BookList from './BookList';
import ChapterView from './ChapterView';
import TranslationSelector from './TranslationSelector';
import ProjectionPreview from '../Projection/ProjectionPreview';
import {
  BookOpen,
  Search,
  Sparkles,
  Send,
  X,
  Loader2,
  Bookmark,
  ArrowRight,
  Radio,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const POPULAR_VERSES = [
  { label: 'John 3:16', bookName: 'John', chapter: 3, verse: 16 },
  { label: 'Psalms 23:1', bookName: 'Psalms', chapter: 23, verse: 1 },
  { label: 'Romans 8:28', bookName: 'Romans', chapter: 8, verse: 28 },
  { label: 'Philippians 4:13', bookName: 'Philippians', chapter: 4, verse: 13 },
  { label: 'Jeremiah 29:11', bookName: 'Jeremiah', chapter: 29, verse: 11 },
  { label: 'Psalms 91:1', bookName: 'Psalms', chapter: 91, verse: 1 },
  { label: 'Proverbs 3:5-6', bookName: 'Proverbs', chapter: 3, verse: 5, endVerse: 6 },
  { label: 'Isaiah 40:31', bookName: 'Isaiah', chapter: 40, verse: 31 },
];

const BibleBrowser = () => {
  const { user } = useAuth();
  const { emitScriptureDetected, emitClearProjection, currentScripture } = useSocket();

  const [selectedBook, setSelectedBook] = useState(BIBLE_BOOKS[0]); // Default Genesis
  const [targetLocation, setTargetLocation] = useState({ chapter: 1, verse: 1, endVerse: null, key: 0 });
  const [testamentFilter, setTestamentFilter] = useState('ALL'); // 'ALL' | 'OT' | 'NT'
  const [translation, setTranslation] = useState(user?.preferredTranslation || 'KJV');

  // Universal Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Sync preferred translation if user profile loads later
  useEffect(() => {
    if (user?.preferredTranslation) {
      setTranslation(user.preferredTranslation);
    }
  }, [user?.preferredTranslation]);

  // Debounced Universal Search (handles references like "John 3:16" and keywords like "shepherd")
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(
          `/bible/search?q=${encodeURIComponent(trimmed)}&translation=${translation}&limit=15`
        );
        const list = res.data?.results || (Array.isArray(res.data) ? res.data : []);
        setSearchResults(list);
        setShowSearchDropdown(true);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, translation]);

  // Helper to log projected verse to history
  const logToHistory = (entry) => {
    api
      .post('/scripture/history', {
        reference: entry.reference,
        verseText: entry.text,
        text: entry.text,
        translation: entry.translation || translation,
        confidence: 1.0,
        speechText: `Manual Projection: ${entry.reference}`,
      })
      .catch(() => {});
  };

  // Directly project a search result
  const handleProjectSearchResult = (item) => {
    const ref = item.reference || `${item.book_name || item.book} ${item.chapter}:${item.verse}`;
    const payload = {
      reference: ref,
      text: item.text,
      book: item.book_name || item.book,
      chapter: item.chapter,
      verse: item.verse,
      translation: item.translation || translation,
    };
    emitScriptureDetected(payload);
    logToHistory(payload);
    toast.success(`Projected ${ref} (${payload.translation})`);
  };

  // Open a search result or quick-access pill in ChapterView
  const handleOpenInReader = (bookName, chapter, verse = 1, endVerse = null) => {
    const matchedBook =
      BIBLE_BOOKS.find((b) => b.name.toLowerCase() === String(bookName).toLowerCase()) ||
      findBibleBook(String(bookName));

    if (matchedBook) {
      setSelectedBook(matchedBook);
      setTargetLocation({
        chapter: Number(chapter) || 1,
        verse: Number(verse) || 1,
        endVerse: endVerse ? Number(endVerse) : null,
        key: Date.now(),
      });
      setShowSearchDropdown(false);
    }
  };

  // Quick-project a popular scripture pill & open it in the reader
  const handleQuickVerse = async (pill) => {
    handleOpenInReader(pill.bookName, pill.chapter, pill.verse, pill.endVerse);
    try {
      const res = await api.get(
        `/bible/reference?ref=${encodeURIComponent(pill.label)}&translation=${translation}`
      );
      if (res.data && res.data.text) {
        const payload = {
          reference: res.data.reference || pill.label,
          text: res.data.text,
          book: pill.bookName,
          chapter: pill.chapter,
          verse: pill.endVerse ? `${pill.verse}-${pill.endVerse}` : pill.verse,
          translation,
        };
        emitScriptureDetected(payload);
        logToHistory(payload);
        toast.success(`Projected ${payload.reference} (${translation})`);
      }
    } catch (err) {
      toast.error(`Could not load ${pill.label}`);
    }
  };

  // When selecting a book manually from BookList
  const handleBookSelect = (book) => {
    setSelectedBook(book);
    setTargetLocation({ chapter: 1, verse: 1, endVerse: null, key: Date.now() });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-navy-800">
        <div>
          <h1 className="text-2xl font-bold text-white font-display flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-gold-400" />
            <span>Bible Browser & Live Projection Studio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Instant verse search, 1-click live projection, and full 66-book chapter navigation.
          </p>
        </div>

        {/* Translation Selector & Clear Screen */}
        <div className="flex flex-wrap items-center gap-3">
          {currentScripture && (
            <button
              onClick={emitClearProjection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Clear Screen</span>
            </button>
          )}
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Translation:
          </span>
          <TranslationSelector value={translation} onChange={setTranslation} />
        </div>
      </div>

      {/* Universal Search & Quick Reference Bar */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl p-4 shadow-xl space-y-3 relative">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gold-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search any reference ("John 3:16", "Rom 8:28") or phrase ("For God so loved the world", "shepherd")...'
              className="w-full pl-10 pr-10 py-2.5 bg-navy-950 border border-navy-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
            />
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-gold-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            ) : searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchDropdown(false);
                }}
                className="text-slate-400 hover:text-white absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Quick-Access Popular Scriptures Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gold-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Quick Project:
          </span>
          {POPULAR_VERSES.map((pill) => (
            <button
              key={pill.label}
              onClick={() => handleQuickVerse(pill)}
              className="px-2.5 py-1 rounded-lg bg-navy-950 hover:bg-gold-500/20 text-slate-300 hover:text-gold-400 border border-navy-800 hover:border-gold-500/40 text-xs font-medium transition-all cursor-pointer"
              title={`Project & open ${pill.label}`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search Results Panel */}
        {showSearchDropdown && searchQuery.trim().length >= 2 && (
          <div className="mt-2 bg-navy-950 border border-navy-700 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-navy-800/80">
            <div className="px-4 py-2 bg-navy-900/90 flex items-center justify-between text-xs text-slate-400 sticky top-0 z-10">
              <span>
                Found <strong className="text-gold-400">{searchResults.length}</strong> matches in{' '}
                <strong>{translation}</strong>
              </span>
              <button
                onClick={() => setShowSearchDropdown(false)}
                className="text-slate-400 hover:text-white text-[11px] font-semibold cursor-pointer"
              >
                Close Results
              </button>
            </div>

            {searchResults.length === 0 && !isSearching ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No verses matched "{searchQuery}". Try another keyword or reference like "Psalm 23:1".
              </div>
            ) : (
              searchResults.map((item, idx) => {
                const ref =
                  item.reference || `${item.book_name || item.book} ${item.chapter}:${item.verse}`;
                const bName = item.book_name || item.book;
                return (
                  <div
                    key={`${ref}_${idx}`}
                    className="p-3.5 hover:bg-navy-900/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gold-400 font-display">{ref}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-800 text-slate-400 font-semibold">
                          {item.translation || translation}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 font-scripture mt-1 line-clamp-2">
                        {item.text}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleOpenInReader(bName, item.chapter, item.verse)}
                        className="px-2.5 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Open Chapter</span>
                      </button>
                      <button
                        onClick={() => handleProjectSearchResult(item)}
                        className="px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 text-xs font-bold flex items-center gap-1 shadow transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Project Now</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Book Selector with Testament Tabs (3 cols) */}
        <div className="lg:col-span-3 bg-navy-900 border border-navy-800 rounded-2xl p-4 shadow-xl flex flex-col">
          {/* Testament Tabs */}
          <div className="flex items-center p-1 bg-navy-950 rounded-xl mb-4 border border-navy-800">
            {[
              { id: 'ALL', label: 'All (66)' },
              { id: 'OT', label: 'OT (39)' },
              { id: 'NT', label: 'NT (27)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTestamentFilter(tab.id)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  testamentFilter === tab.id
                    ? 'bg-gold-500 text-navy-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Book List */}
          <BookList
            selectedBook={selectedBook}
            onSelectBook={handleBookSelect}
            activeTestament={testamentFilter}
          />
        </div>

        {/* Middle Column: Chapter & Verse View (6 cols) */}
        <div className="lg:col-span-6 flex flex-col">
          <ChapterView
            book={selectedBook}
            translation={translation}
            targetLocation={targetLocation}
          />
        </div>

        {/* Right Column: Live Projection Monitor (3 cols) */}
        <div className="lg:col-span-3 flex flex-col space-y-6">
          <ProjectionPreview />
        </div>
      </div>
    </div>
  );
};

export default BibleBrowser;
