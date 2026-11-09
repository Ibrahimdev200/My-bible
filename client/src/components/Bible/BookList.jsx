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

      {/* Clean Full-Name Passage / Book List (Single Column, Full Spelling, Easy Access) */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 max-h-[600px]">
        {filteredBooks.map((book) => {
          const isSelected = selectedBook?.id === book.id;
          return (
            <button
              key={book.id}
              onClick={() => onSelectBook(book)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-left transition-all flex items-center cursor-pointer ${
                isSelected
                  ? 'bg-gold-500 text-navy-950 border-gold-500 font-bold shadow-md shadow-gold-500/20'
                  : 'bg-navy-950/60 hover:bg-navy-800 text-slate-100 border-navy-800 hover:border-gold-500/40 font-semibold'
              }`}
            >
              <span className="text-sm font-display tracking-wide break-words">
                {book.name}
              </span>
            </button>
          );
        })}

        {filteredBooks.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400">
            No matching books found.
          </div>
        )}
      </div>
    </div>
  );
};

export default BookList;
