import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BIBLE_BOOKS } from '../../utils/bibleData';
import BookList from './BookList';
import ChapterView from './ChapterView';
import TranslationSelector from './TranslationSelector';
import ProjectionPreview from '../Projection/ProjectionPreview';
import { BookOpen, Search, Sparkles } from 'lucide-react';

const BibleBrowser = () => {
  const { user } = useAuth();
  const [selectedBook, setSelectedBook] = useState(BIBLE_BOOKS[0]); // Default Genesis
  const [testamentFilter, setTestamentFilter] = useState('ALL'); // 'ALL' | 'OT' | 'NT'
  const [translation, setTranslation] = useState(user?.preferredTranslation || 'KJV');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-navy-800">
        <div>
          <h1 className="text-2xl font-bold text-white font-display flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-gold-400" />
            <span>Bible Browser & Projection Control</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Navigate all 66 books, select verses, and instantly push them to the live church screen.
          </p>
        </div>

        {/* Translation Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Translation:
          </span>
          <TranslationSelector value={translation} onChange={setTranslation} />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Book Selector with Testament Tabs (4 cols) */}
        <div className="lg:col-span-4 bg-navy-900 border border-navy-800 rounded-2xl p-4 shadow-xl flex flex-col">
          {/* Testament Tabs */}
          <div className="flex items-center p-1 bg-navy-950 rounded-xl mb-4 border border-navy-800">
            {[
              { id: 'ALL', label: 'All 66 Books' },
              { id: 'OT', label: 'Old Testament' },
              { id: 'NT', label: 'New Testament' },
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
            onSelectBook={setSelectedBook}
            activeTestament={testamentFilter}
          />
        </div>

        {/* Middle/Right Column: Chapter & Verse View (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <ChapterView book={selectedBook} translation={translation} />
        </div>
      </div>
    </div>
  );
};

export default BibleBrowser;
