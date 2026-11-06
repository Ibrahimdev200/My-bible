import React, { useState } from 'react';
import { BIBLE_BOOKS } from '../../utils/bibleData';
import { Search } from 'lucide-react';

const BookList = ({ selectedBook, onSelectBook, activeTestament = 'ALL' }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBooks = BIBLE_BOOKS.filter((book) => {
    const matchesTestament =
      activeTestament === 'ALL' || book.testament === activeTestament;
    const matchesSearch =
      book.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.aliases.some((a) => a.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTestament && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter 66 books..."
          className="w-full pl-9 pr-3 py-2 bg-navy-950/80 border border-navy-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
        />
      </div>

      {/* Book Grid */}
      <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[600px]">
        {filteredBooks.map((book) => {
          const isSelected = selectedBook?.id === book.id;
          return (
            <button
              key={book.id}
              onClick={() => onSelectBook(book)}
              className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
                isSelected
                  ? 'bg-gold-500 text-navy-950 border-gold-500 font-bold shadow-md shadow-gold-500/20'
                  : 'bg-navy-900 hover:bg-navy-800 text-slate-200 border-navy-800 hover:border-navy-700'
              }`}
            >
              <div className="min-w-0 pr-2">
                <p className="text-xs truncate font-display font-medium">
                  {book.name}
                </p>
                <span
                  className={`text-[10px] ${
                    isSelected ? 'text-navy-900/80' : 'text-slate-400'
                  }`}
                >
                  {book.chapters} {book.chapters === 1 ? 'Chapter' : 'Chapters'}
                </span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  isSelected
                    ? 'bg-navy-950/20 text-navy-950'
                    : 'bg-navy-950 text-slate-400'
                }`}
              >
                {book.testament}
              </span>
            </button>
          );
        })}

        {filteredBooks.length === 0 && (
          <div className="col-span-2 text-center py-8 text-xs text-slate-400">
            No matching books found.
          </div>
        )}
      </div>
    </div>
  );
};

export default BookList;
