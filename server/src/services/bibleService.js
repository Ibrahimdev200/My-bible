const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const stringSimilarity = require('string-similarity');

// Canonical list of all 66 books of the Bible
const CANONICAL_BOOKS = [
  // Old Testament (1-39)
  { id: 1, name: 'Genesis', testament: 'OT', chapters: 50, abbr: 'Gen', aliases: ['gen', 'ge', 'gn'] },
  { id: 2, name: 'Exodus', testament: 'OT', chapters: 40, abbr: 'Exo', aliases: ['exo', 'ex', 'exod'] },
  { id: 3, name: 'Leviticus', testament: 'OT', chapters: 27, abbr: 'Lev', aliases: ['lev', 'le', 'lv'] },
  { id: 4, name: 'Numbers', testament: 'OT', chapters: 36, abbr: 'Num', aliases: ['num', 'nu', 'nm', 'nb'] },
  { id: 5, name: 'Deuteronomy', testament: 'OT', chapters: 34, abbr: 'Deut', aliases: ['deut', 'de', 'dt'] },
  { id: 6, name: 'Joshua', testament: 'OT', chapters: 24, abbr: 'Josh', aliases: ['josh', 'jos', 'jsh'] },
  { id: 7, name: 'Judges', testament: 'OT', chapters: 21, abbr: 'Judg', aliases: ['judg', 'jdg', 'jg', 'jdgs'] },
  { id: 8, name: 'Ruth', testament: 'OT', chapters: 4, abbr: 'Rth', aliases: ['ruth', 'rth', 'ru'] },
  { id: 9, name: '1 Samuel', testament: 'OT', chapters: 31, abbr: '1Sam', aliases: ['1 samuel', '1samuel', '1 sam', '1sam', '1sa', '1s', 'i samuel', 'i sam', 'i sa', 'first samuel', '1st samuel'] },
  { id: 10, name: '2 Samuel', testament: 'OT', chapters: 24, abbr: '2Sam', aliases: ['2 samuel', '2samuel', '2 sam', '2sam', '2sa', '2s', 'ii samuel', 'ii sam', 'ii sa', 'second samuel', '2nd samuel'] },
  { id: 11, name: '1 Kings', testament: 'OT', chapters: 22, abbr: '1Kgs', aliases: ['1 kings', '1kings', '1 kgs', '1kgs', '1ki', '1k', 'i kings', 'i kgs', 'i ki', 'first kings', '1st kings'] },
  { id: 12, name: '2 Kings', testament: 'OT', chapters: 25, abbr: '2Kgs', aliases: ['2 kings', '2kings', '2 kgs', '2kgs', '2ki', '2k', 'ii kings', 'ii kgs', 'ii ki', 'second kings', '2nd kings'] },
  { id: 13, name: '1 Chronicles', testament: 'OT', chapters: 29, abbr: '1Chr', aliases: ['1 chronicles', '1chronicles', '1 chron', '1ch', 'i chronicles', 'i chron', 'first chronicles', '1st chronicles'] },
  { id: 14, name: '2 Chronicles', testament: 'OT', chapters: 36, abbr: '2Chr', aliases: ['2 chronicles', '2chronicles', '2 chron', '2ch', 'ii chronicles', 'ii chron', 'second chronicles', '2nd chronicles'] },
  { id: 15, name: 'Ezra', testament: 'OT', chapters: 10, abbr: 'Ezr', aliases: ['ezra', 'ezr'] },
  { id: 16, name: 'Nehemiah', testament: 'OT', chapters: 13, abbr: 'Neh', aliases: ['nehemiah', 'neh', 'ne'] },
  { id: 17, name: 'Esther', testament: 'OT', chapters: 10, abbr: 'Esth', aliases: ['esther', 'esth', 'est'] },
  { id: 18, name: 'Job', testament: 'OT', chapters: 42, abbr: 'Job', aliases: ['job', 'jb'] },
  { id: 19, name: 'Psalms', testament: 'OT', chapters: 150, abbr: 'Psa', aliases: ['psalms', 'psalm', 'psa', 'ps', 'pslm'] },
  { id: 20, name: 'Proverbs', testament: 'OT', chapters: 31, abbr: 'Prov', aliases: ['proverbs', 'proverb', 'prov', 'pro', 'pr', 'prv'] },
  { id: 21, name: 'Ecclesiastes', testament: 'OT', chapters: 12, abbr: 'Eccl', aliases: ['ecclesiastes', 'eccl', 'ecc', 'ec', 'qoh'] },
  { id: 22, name: 'Song of Solomon', testament: 'OT', chapters: 8, abbr: 'Song', aliases: ['song of solomon', 'song of songs', 'song', 'canticle of canticles', 'canticles', 'sos'] },
  { id: 23, name: 'Isaiah', testament: 'OT', chapters: 66, abbr: 'Isa', aliases: ['isaiah', 'isa', 'is'] },
  { id: 24, name: 'Jeremiah', testament: 'OT', chapters: 52, abbr: 'Jer', aliases: ['jeremiah', 'jer', 'je', 'jr'] },
  { id: 25, name: 'Lamentations', testament: 'OT', chapters: 5, abbr: 'Lam', aliases: ['lamentations', 'lam', 'la'] },
  { id: 26, name: 'Ezekiel', testament: 'OT', chapters: 48, abbr: 'Ezek', aliases: ['ezekiel', 'ezek', 'eze', 'ezk'] },
  { id: 27, name: 'Daniel', testament: 'OT', chapters: 12, abbr: 'Dan', aliases: ['daniel', 'dan', 'da', 'dn'] },
  { id: 28, name: 'Hosea', testament: 'OT', chapters: 14, abbr: 'Hos', aliases: ['hosea', 'hos', 'ho'] },
  { id: 29, name: 'Joel', testament: 'OT', chapters: 3, abbr: 'Joel', aliases: ['joel', 'joe', 'jl'] },
  { id: 30, name: 'Amos', testament: 'OT', chapters: 9, abbr: 'Amos', aliases: ['amos', 'amo', 'am'] },
  { id: 31, name: 'Obadiah', testament: 'OT', chapters: 1, abbr: 'Obad', aliases: ['obadiah', 'obad', 'ob'] },
  { id: 32, name: 'Jonah', testament: 'OT', chapters: 4, abbr: 'Jonah', aliases: ['jonah', 'jona', 'jon', 'jnh'] },
  { id: 33, name: 'Micah', testament: 'OT', chapters: 7, abbr: 'Mic', aliases: ['micah', 'mic', 'mc'] },
  { id: 34, name: 'Nahum', testament: 'OT', chapters: 3, abbr: 'Nah', aliases: ['nahum', 'nah', 'na'] },
  { id: 35, name: 'Habakkuk', testament: 'OT', chapters: 3, abbr: 'Hab', aliases: ['habakkuk', 'hab', 'hb'] },
  { id: 36, name: 'Zephaniah', testament: 'OT', chapters: 3, abbr: 'Zeph', aliases: ['zephaniah', 'zeph', 'zep', 'zp'] },
  { id: 37, name: 'Haggai', testament: 'OT', chapters: 2, abbr: 'Hag', aliases: ['haggai', 'hag', 'hg'] },
  { id: 38, name: 'Zechariah', testament: 'OT', chapters: 14, abbr: 'Zech', aliases: ['zechariah', 'zech', 'zec', 'zc'] },
  { id: 39, name: 'Malachi', testament: 'OT', chapters: 4, abbr: 'Mal', aliases: ['malachi', 'mal', 'ml'] },

  // New Testament (40-66)
  { id: 40, name: 'Matthew', testament: 'NT', chapters: 28, abbr: 'Matt', aliases: ['matthew', 'matt', 'mat', 'mt'] },
  { id: 41, name: 'Mark', testament: 'NT', chapters: 16, abbr: 'Mark', aliases: ['mark', 'mrk', 'mar', 'mk'] },
  { id: 42, name: 'Luke', testament: 'NT', chapters: 24, abbr: 'Luke', aliases: ['luke', 'luk', 'lu', 'lk'] },
  { id: 43, name: 'John', testament: 'NT', chapters: 21, abbr: 'John', aliases: ['john', 'joh', 'jhn', 'jn'] },
  { id: 44, name: 'Acts', testament: 'NT', chapters: 28, abbr: 'Acts', aliases: ['acts', 'act', 'ac'] },
  { id: 45, name: 'Romans', testament: 'NT', chapters: 16, abbr: 'Rom', aliases: ['romans', 'rom', 'ro', 'rm'] },
  { id: 46, name: '1 Corinthians', testament: 'NT', chapters: 16, abbr: '1Cor', aliases: ['1 corinthians', '1corinthians', '1 cor', '1cor', '1co', 'i corinthians', 'i cor', 'i co', 'first corinthians', '1st corinthians'] },
  { id: 47, name: '2 Corinthians', testament: 'NT', chapters: 13, abbr: '2Cor', aliases: ['2 corinthians', '2corinthians', '2 cor', '2cor', '2co', 'ii corinthians', 'ii cor', 'ii co', 'second corinthians', '2nd corinthians'] },
  { id: 48, name: 'Galatians', testament: 'NT', chapters: 6, abbr: 'Gal', aliases: ['galatians', 'gal', 'ga'] },
  { id: 49, name: 'Ephesians', testament: 'NT', chapters: 6, abbr: 'Eph', aliases: ['ephesians', 'eph', 'ep'] },
  { id: 50, name: 'Philippians', testament: 'NT', chapters: 4, abbr: 'Phil', aliases: ['philippians', 'phil', 'php', 'pp'] },
  { id: 51, name: 'Colossians', testament: 'NT', chapters: 4, abbr: 'Col', aliases: ['colossians', 'col', 'co'] },
  { id: 52, name: '1 Thessalonians', testament: 'NT', chapters: 5, abbr: '1Thess', aliases: ['1 thessalonians', '1thessalonians', '1 thess', '1th', 'i thessalonians', 'i thess', 'first thessalonians', '1st thessalonians'] },
  { id: 53, name: '2 Thessalonians', testament: 'NT', chapters: 3, abbr: '2Thess', aliases: ['2 thessalonians', '2thessalonians', '2 thess', '2th', 'ii thessalonians', 'ii thess', 'second thessalonians', '2nd thessalonians'] },
  { id: 54, name: '1 Timothy', testament: 'NT', chapters: 6, abbr: '1Tim', aliases: ['1 timothy', '1timothy', '1 tim', '1ti', 'i timothy', 'i tim', 'first timothy', '1st timothy'] },
  { id: 55, name: '2 Timothy', testament: 'NT', chapters: 4, abbr: '2Tim', aliases: ['2 timothy', '2timothy', '2 tim', '2ti', 'ii timothy', 'ii tim', 'second timothy', '2nd timothy'] },
  { id: 56, name: 'Titus', testament: 'NT', chapters: 3, abbr: 'Tit', aliases: ['titus', 'tit', 'ti'] },
  { id: 57, name: 'Philemon', testament: 'NT', chapters: 1, abbr: 'Phlm', aliases: ['philemon', 'philem', 'phm', 'pm'] },
  { id: 58, name: 'Hebrews', testament: 'NT', chapters: 13, abbr: 'Heb', aliases: ['hebrews', 'heb', 'he'] },
  { id: 59, name: 'James', testament: 'NT', chapters: 5, abbr: 'Jas', aliases: ['james', 'jas', 'jm'] },
  { id: 60, name: '1 Peter', testament: 'NT', chapters: 5, abbr: '1Pet', aliases: ['1 peter', '1peter', '1 pet', '1pe', '1p', 'i peter', 'i pet', 'first peter', '1st peter'] },
  { id: 61, name: '2 Peter', testament: 'NT', chapters: 3, abbr: '2Pet', aliases: ['2 peter', '2peter', '2 pet', '2pe', '2p', 'ii peter', 'ii pet', 'second peter', '2nd peter'] },
  { id: 62, name: '1 John', testament: 'NT', chapters: 5, abbr: '1Jn', aliases: ['1 john', '1john', '1 jn', '1jhn', '1jo', 'i john', 'i jn', 'first john', '1st john'] },
  { id: 63, name: '2 John', testament: 'NT', chapters: 1, abbr: '2Jn', aliases: ['2 john', '2john', '2 jn', '2jhn', '2jo', 'ii john', 'ii jn', 'second john', '2nd john'] },
  { id: 64, name: '3 John', testament: 'NT', chapters: 1, abbr: '3Jn', aliases: ['3 john', '3john', '3 jn', '3jhn', '3jo', 'iii john', 'iii jn', 'third john', '3rd john'] },
  { id: 65, name: 'Jude', testament: 'NT', chapters: 1, abbr: 'Jude', aliases: ['jude', 'jud', 'jd'] },
  { id: 66, name: 'Revelation', testament: 'NT', chapters: 22, abbr: 'Rev', aliases: ['revelation', 'revelations', 'rev', 're', 'apocalypse'] }
];

class BibleService {
  constructor() {
    this.SQL = null;
    this.db = null;
    this.dbPath = path.resolve(process.env.BIBLE_DB_PATH || path.join(__dirname, '../../data/bible.db'));
    this.initialized = false;
  }

  /**
   * Initializes sql.js and loads the SQLite database file if it exists.
   */
  async init() {
    try {
      this.SQL = await initSqlJs();

      if (fs.existsSync(this.dbPath)) {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(fileBuffer);
        this.initialized = true;
        console.log(`✓ [BibleService] SQLite Bible database loaded from ${this.dbPath}`);
      } else {
        console.warn(`! [BibleService] SQLite Bible database not found at ${this.dbPath}.`);
        console.info('ℹ [BibleService] Run "npm run import-bible" to import Bible data.');
        this.initialized = false;
      }
    } catch (error) {
      console.error('! [BibleService] Failed to initialize sql.js:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Reload database file (e.g. after running import-bible without restarting server).
   */
  reloadDatabase() {
    if (!this.SQL) return false;
    if (fs.existsSync(this.dbPath)) {
      if (this.db) {
        try { this.db.close(); } catch (e) {}
      }
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(fileBuffer);
      this.initialized = true;
      console.log(`✓ [BibleService] SQLite Bible database reloaded from ${this.dbPath}`);
      return true;
    }
    return false;
  }

  /**
   * Returns true if the Bible database is loaded and ready.
   */
  isAvailable() {
    return Boolean(this.db && this.initialized);
  }

  /**
   * Helper to execute a query using prepared statement and return array of objects.
   */
  executeQuery(sql, params = []) {
    if (!this.isAvailable()) {
      // Try reloading in case it was created recently
      if (!this.reloadDatabase()) {
        throw new Error('Bible database is not available. Please run "npm run import-bible" first.');
      }
    }

    const stmt = this.db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  /**
   * Get all books, optionally filtered by testament (OT or NT).
   */
  getBooks(testament) {
    let books = CANONICAL_BOOKS;

    if (this.isAvailable()) {
      try {
        let sql = 'SELECT * FROM books ORDER BY id ASC';
        let params = [];
        if (testament) {
          sql = 'SELECT * FROM books WHERE testament = ? ORDER BY id ASC';
          params = [testament.toUpperCase()];
        }
        const dbBooks = this.executeQuery(sql, params);
        if (dbBooks.length > 0) {
          return dbBooks;
        }
      } catch (err) {
        // Fall back to canonical books list
      }
    }

    if (testament) {
      return books.filter((b) => b.testament.toUpperCase() === testament.toUpperCase());
    }
    return books;
  }

  /**
   * Get single book by ID or name.
   */
  getBook(bookId) {
    const numericId = parseInt(bookId, 10);
    if (!isNaN(numericId)) {
      const found = CANONICAL_BOOKS.find((b) => b.id === numericId);
      if (found) return found;
    }
    return this.findBookByName(bookId);
  }

  /**
   * Get chapter list for a book.
   */
  getChapters(bookId) {
    const book = this.getBook(bookId);
    if (!book) return [];

    if (this.isAvailable()) {
      try {
        const rows = this.executeQuery(
          'SELECT DISTINCT chapter FROM verses WHERE book_id = ? ORDER BY chapter ASC',
          [book.id]
        );
        if (rows.length > 0) {
          return rows.map((r) => r.chapter);
        }
      } catch (err) {}
    }

    // Fallback to canonical chapter count
    const count = book.chapters || 1;
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  /**
   * Get single verse.
   */
  getVerse(bookId, chapter, verse, translation = 'KJV') {
    const book = this.getBook(bookId);
    if (!book) return null;

    if (!this.isAvailable()) {
      throw new Error('Bible database not available. Please run import-bible first.');
    }

    const sql = `
      SELECT v.*, b.name AS book_name 
      FROM verses v 
      JOIN books b ON v.book_id = b.id 
      WHERE v.book_id = ? AND v.chapter = ? AND v.verse = ? AND UPPER(v.translation) = ?
      LIMIT 1
    `;
    const rows = this.executeQuery(sql, [
      book.id,
      parseInt(chapter, 10),
      parseInt(verse, 10),
      translation.toUpperCase()
    ]);

    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get all verses in a chapter.
   */
  getVerses(bookId, chapter, translation = 'KJV') {
    const book = this.getBook(bookId);
    if (!book) return [];

    if (!this.isAvailable()) {
      throw new Error('Bible database not available. Please run import-bible first.');
    }

    const sql = `
      SELECT v.*, b.name AS book_name 
      FROM verses v 
      JOIN books b ON v.book_id = b.id 
      WHERE v.book_id = ? AND v.chapter = ? AND UPPER(v.translation) = ? 
      ORDER BY v.verse ASC
    `;
    return this.executeQuery(sql, [book.id, parseInt(chapter, 10), translation.toUpperCase()]);
  }

  /**
   * Search verses matching query.
   */
  searchVerses(query, translation = 'KJV', limit = 20) {
    if (!this.isAvailable()) {
      throw new Error('Bible database not available. Please run import-bible first.');
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const sql = `
      SELECT v.*, b.name AS book_name 
      FROM verses v 
      JOIN books b ON v.book_id = b.id 
      WHERE v.text LIKE ? AND UPPER(v.translation) = ? 
      ORDER BY v.book_id ASC, v.chapter ASC, v.verse ASC 
      LIMIT ?
    `;

    return this.executeQuery(sql, [`%${query.trim()}%`, translation.toUpperCase(), safeLimit]);
  }

  /**
   * Get available translations in the database.
   */
  getTranslations() {
    if (this.isAvailable()) {
      try {
        const rows = this.executeQuery('SELECT DISTINCT translation FROM verses ORDER BY translation ASC');
        if (rows.length > 0) {
          return rows.map((r) => r.translation);
        }
      } catch (err) {}
    }
    return ['KJV', 'WEB', 'ASV', 'YLT'];
  }

  /**
   * Find book by name or abbreviation with fuzzy matching.
   */
  findBookByName(name) {
    if (!name || typeof name !== 'string') return null;

    const clean = name.trim().toLowerCase().replace(/^(the\s+book\s+of\s+|book\s+of\s+)/i, '');

    // 1. Exact match on canonical name
    const exactName = CANONICAL_BOOKS.find((b) => b.name.toLowerCase() === clean);
    if (exactName) return exactName;

    // 2. Exact match on alias or abbreviation
    for (const book of CANONICAL_BOOKS) {
      if (book.abbr.toLowerCase() === clean) return book;
      if (book.aliases.some((alias) => alias.toLowerCase() === clean)) {
        return book;
      }
    }

    // 3. Normalized number word match (e.g. "first corinthians" -> "1 corinthians")
    let normalized = clean
      .replace(/^first\s+/i, '1 ')
      .replace(/^second\s+/i, '2 ')
      .replace(/^third\s+/i, '3 ')
      .replace(/^1st\s+/i, '1 ')
      .replace(/^2nd\s+/i, '2 ')
      .replace(/^3rd\s+/i, '3 ')
      .replace(/^i\s+/i, '1 ')
      .replace(/^ii\s+/i, '2 ')
      .replace(/^iii\s+/i, '3 ');

    const normMatch = CANONICAL_BOOKS.find(
      (b) => b.name.toLowerCase() === normalized || b.aliases.includes(normalized)
    );
    if (normMatch) return normMatch;

    // 4. Fuzzy match using string-similarity
    const allNames = [];
    const nameToBookMap = new Map();

    for (const book of CANONICAL_BOOKS) {
      allNames.push(book.name.toLowerCase());
      nameToBookMap.set(book.name.toLowerCase(), book);

      for (const alias of book.aliases) {
        allNames.push(alias.toLowerCase());
        nameToBookMap.set(alias.toLowerCase(), book);
      }
    }

    const matches = stringSimilarity.findBestMatch(clean, allNames);
    if (matches && matches.bestMatch && matches.bestMatch.rating >= 0.6) {
      return nameToBookMap.get(matches.bestMatch.target);
    }

    return null;
  }

  /**
   * Parse a reference string like:
   * - "John 3:16"
   * - "John 3:16-18"
   * - "Psalm 23"
   * - "1 Corinthians 13"
   * - "Genesis 1:1-2:3"
   * - "Matt 5:3-10"
   */
  parseReference(referenceString) {
    if (!referenceString || typeof referenceString !== 'string') return null;

    const trimmed = referenceString.trim();

    // Pattern 1: Cross-chapter range: "Genesis 1:1-2:3"
    const crossChapterRegex = /^(.+?)\s+(\d+)[:\.](\d+)\s*(?:-|–|to)\s*(\d+)[:\.](\d+)$/i;
    const crossMatch = trimmed.match(crossChapterRegex);
    if (crossMatch) {
      const book = this.findBookByName(crossMatch[1]);
      if (book) {
        return {
          book: book.name,
          bookId: book.id,
          startChapter: parseInt(crossMatch[2], 10),
          startVerse: parseInt(crossMatch[3], 10),
          endChapter: parseInt(crossMatch[4], 10),
          endVerse: parseInt(crossMatch[5], 10),
          isRange: true,
          isCrossChapter: true
        };
      }
    }

    // Pattern 2: Single chapter verse range or single verse: "John 3:16-18", "John 3:16"
    const verseRangeRegex = /^(.+?)\s+(\d+)[:\.](\d+)(?:\s*(?:-|–|through|to)\s*(\d+))?$/i;
    const verseMatch = trimmed.match(verseRangeRegex);
    if (verseMatch) {
      const book = this.findBookByName(verseMatch[1]);
      if (book) {
        const chapter = parseInt(verseMatch[2], 10);
        const startVerse = parseInt(verseMatch[3], 10);
        const endVerse = verseMatch[4] ? parseInt(verseMatch[4], 10) : startVerse;
        return {
          book: book.name,
          bookId: book.id,
          chapter,
          startVerse,
          endVerse,
          isRange: startVerse !== endVerse
        };
      }
    }

    // Pattern 3: Chapter only: "Psalm 23", "1 Corinthians 13"
    const chapterOnlyRegex = /^(.+?)\s+(\d+)$/i;
    const chapterMatch = trimmed.match(chapterOnlyRegex);
    if (chapterMatch) {
      const book = this.findBookByName(chapterMatch[1]);
      if (book) {
        return {
          book: book.name,
          bookId: book.id,
          chapter: parseInt(chapterMatch[2], 10),
          startVerse: null,
          endVerse: null,
          isRange: false
        };
      }
    }

    return null;
  }

  /**
   * Combines parseReference + verse retrieval from SQLite database.
   */
  getVersesByReference(referenceString, translation = 'KJV') {
    const parsed = this.parseReference(referenceString);
    if (!parsed) {
      throw new Error(`Invalid Bible reference format: "${referenceString}"`);
    }

    if (!this.isAvailable()) {
      throw new Error('Bible database not available. Please run "npm run import-bible" to import Bible data.');
    }

    const { bookId, book, isCrossChapter } = parsed;
    let verses = [];

    if (isCrossChapter) {
      const { startChapter, startVerse, endChapter, endVerse } = parsed;
      const sql = `
        SELECT v.*, b.name AS book_name 
        FROM verses v 
        JOIN books b ON v.book_id = b.id 
        WHERE v.book_id = ? 
          AND UPPER(v.translation) = ? 
          AND (
            (v.chapter = ? AND v.verse >= ?) OR 
            (v.chapter > ? AND v.chapter < ?) OR 
            (v.chapter = ? AND v.verse <= ?)
          )
        ORDER BY v.chapter ASC, v.verse ASC
      `;
      verses = this.executeQuery(sql, [
        bookId,
        translation.toUpperCase(),
        startChapter,
        startVerse,
        startChapter,
        endChapter,
        endChapter,
        endVerse
      ]);
    } else if (parsed.startVerse !== null) {
      const { chapter, startVerse, endVerse } = parsed;
      const sql = `
        SELECT v.*, b.name AS book_name 
        FROM verses v 
        JOIN books b ON v.book_id = b.id 
        WHERE v.book_id = ? AND v.chapter = ? AND v.verse >= ? AND v.verse <= ? AND UPPER(v.translation) = ? 
        ORDER BY v.verse ASC
      `;
      verses = this.executeQuery(sql, [
        bookId,
        chapter,
        startVerse,
        endVerse,
        translation.toUpperCase()
      ]);
    } else {
      // Entire chapter
      verses = this.getVerses(bookId, parsed.chapter, translation);
    }

    const combinedText = verses.map((v) => `${v.verse}. ${v.text}`).join(' ');

    return {
      reference: referenceString,
      parsed,
      book,
      translation: translation.toUpperCase(),
      count: verses.length,
      verses,
      combinedText
    };
  }
}

// Export singleton instance
const bibleService = new BibleService();

module.exports = {
  bibleService,
  CANONICAL_BOOKS
};
