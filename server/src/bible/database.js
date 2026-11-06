/**
 * Bible Database Query Helper
 * Provides high-level query access to the Bible SQLite database via sql.js.
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
let stringSimilarity;
try {
  stringSimilarity = require('string-similarity');
} catch {
  stringSimilarity = null;
}

const booksMetadata = require('./data/books');

const DB_PATH = path.resolve(__dirname, '../../data/bible.db');

let dbInstance = null;
let sqlPromise = null;

/**
 * Initialize / obtain active sql.js Database instance
 */
async function getDb() {
  if (dbInstance) return dbInstance;
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const SQL = await initSqlJs();
      if (!fs.existsSync(DB_PATH)) {
        throw new Error(`Bible database file not found at ${DB_PATH}. Run 'node src/bible/import.js' first.`);
      }
      const buffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(buffer);
      return dbInstance;
    })();
  }
  return sqlPromise;
}

/**
 * Close and release the active database instance
 */
function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (_) {}
    dbInstance = null;
    sqlPromise = null;
  }
}

/**
 * Helper to run a SELECT query and return array of row objects
 */
function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
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
 * Helper to run a SELECT query and return the first row object or null
 */
function queryOne(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

// -------------------------------------------------------------
// Book Name Normalization & Fuzzy Matching Map
// -------------------------------------------------------------
const bookAliases = {
  // Old Testament
  'genesis': 1, 'gen': 1, 'ge': 1, 'gn': 1,
  'exodus': 2, 'exo': 2, 'ex': 2, 'exod': 2,
  'leviticus': 3, 'lev': 3, 'le': 3, 'lv': 3,
  'numbers': 4, 'num': 4, 'nu': 4, 'nm': 4, 'nb': 4,
  'deuteronomy': 5, 'deu': 5, 'deut': 5, 'dt': 5, 'de': 5,
  'joshua': 6, 'jos': 6, 'josh': 6, 'jsh': 6,
  'judges': 7, 'jdg': 7, 'judg': 7, 'jg': 7, 'jdgs': 7,
  'ruth': 8, 'rut': 8, 'rth': 8, 'ru': 8,
  '1 samuel': 9, '1samuel': 9, '1sam': 9, '1sa': 9, '1s': 9, 'first samuel': 9, '1st samuel': 9, 'i samuel': 9, 'i sam': 9,
  '2 samuel': 10, '2samuel': 10, '2sam': 10, '2sa': 10, '2s': 10, 'second samuel': 10, '2nd samuel': 10, 'ii samuel': 10, 'ii sam': 10,
  '1 kings': 11, '1kings': 11, '1kgs': 11, '1ki': 11, '1k': 11, 'first kings': 11, '1st kings': 11, 'i kings': 11, 'i kgs': 11,
  '2 kings': 12, '2kings': 12, '2kgs': 12, '2ki': 12, '2k': 12, 'second kings': 12, '2nd kings': 12, 'ii kings': 12, 'ii kgs': 12,
  '1 chronicles': 13, '1chronicles': 13, '1chron': 13, '1chr': 13, '1ch': 13, 'first chronicles': 13, '1st chronicles': 13, 'i chronicles': 13, 'i chron': 13,
  '2 chronicles': 14, '2chronicles': 14, '2chron': 14, '2chr': 14, '2ch': 14, 'second chronicles': 14, '2nd chronicles': 14, 'ii chronicles': 14, 'ii chron': 14,
  'ezra': 15, 'ezr': 15, 'ez': 15,
  'nehemiah': 16, 'neh': 16, 'ne': 16,
  'esther': 17, 'est': 17, 'esth': 17, 'es': 17,
  'job': 18, 'jb': 18,
  'psalms': 19, 'psalm': 19, 'psa': 19, 'ps': 19, 'psm': 19, 'pss': 19,
  'proverbs': 20, 'proverb': 20, 'pro': 20, 'prov': 20, 'prv': 20, 'pr': 20,
  'ecclesiastes': 21, 'ecc': 21, 'eccl': 21, 'ec': 21, 'qoh': 21, 'qoheleth': 21,
  'song of solomon': 22, 'song of songs': 22, 'songs': 22, 'song': 22, 'sng': 22, 'sos': 22, 'canticles': 22,
  'isaiah': 23, 'isa': 23, 'is': 23,
  'jeremiah': 24, 'jer': 24, 'je': 24, 'jr': 24,
  'lamentations': 25, 'lam': 25, 'la': 25,
  'ezekiel': 26, 'ezk': 26, 'ezek': 26, 'eze': 26,
  'daniel': 27, 'dan': 27, 'da': 27, 'dn': 27,
  'hosea': 28, 'hos': 28, 'ho': 28,
  'joel': 29, 'jol': 29, 'joe': 29, 'jl': 29,
  'amos': 30, 'amo': 30, 'am': 30,
  'obadiah': 31, 'oba': 31, 'ob': 31,
  'jonah': 32, 'jon': 32, 'jnh': 32,
  'micah': 33, 'mic': 33, 'mc': 33,
  'nahum': 34, 'nam': 34, 'nah': 34, 'na': 34,
  'habakkuk': 35, 'hab': 35, 'hb': 35,
  'zephaniah': 36, 'zep': 36, 'zeph': 36, 'zp': 36,
  'haggai': 37, 'hag': 37, 'hg': 37,
  'zechariah': 38, 'zec': 38, 'zech': 38, 'zc': 38,
  'malachi': 39, 'mal': 39, 'ml': 39,

  // New Testament
  'matthew': 40, 'mat': 40, 'matt': 40, 'mt': 40,
  'mark': 41, 'mrk': 41, 'mk': 41, 'mr': 41,
  'luke': 42, 'luk': 42, 'lk': 42, 'lu': 42,
  'john': 43, 'jhn': 43, 'jn': 43, 'joh': 43,
  'acts': 44, 'act': 45 ? 44 : 44, 'ac': 44, 'acts of the apostles': 44,
  'romans': 45, 'rom': 45, 'ro': 45, 'rm': 45,
  '1 corinthians': 46, '1corinthians': 46, '1cor': 46, '1co': 46, '1 cor': 46, 'first corinthians': 46, '1st corinthians': 46, 'i corinthians': 46, 'i cor': 46,
  '2 corinthians': 47, '2corinthians': 47, '2cor': 47, '2co': 47, '2 cor': 47, 'second corinthians': 47, '2nd corinthians': 47, 'ii corinthians': 47, 'ii cor': 47,
  'galatians': 48, 'gal': 48, 'ga': 48,
  'ephesians': 49, 'eph': 49, 'ep': 49,
  'philippians': 50, 'php': 50, 'phil': 50, 'pp': 50,
  'colossians': 51, 'col': 51, 'co': 51,
  '1 thessalonians': 52, '1thessalonians': 52, '1thess': 52, '1th': 52, '1 thess': 52, 'first thessalonians': 52, '1st thessalonians': 52, 'i thessalonians': 52, 'i thess': 52,
  '2 thessalonians': 53, '2thessalonians': 53, '2thess': 53, '2th': 53, '2 thess': 53, 'second thessalonians': 53, '2nd thessalonians': 53, 'ii thessalonians': 53, 'ii thess': 53,
  '1 timothy': 54, '1timothy': 54, '1tim': 54, '1ti': 54, '1 tim': 54, 'first timothy': 54, '1st timothy': 54, 'i timothy': 54, 'i tim': 54,
  '2 timothy': 55, '2timothy': 55, '2tim': 55, '2ti': 55, '2 tim': 55, 'second timothy': 55, '2nd timothy': 55, 'ii timothy': 55, 'ii tim': 55,
  'titus': 56, 'tit': 56, 'ti': 56, 'tt': 56,
  'philemon': 57, 'phm': 57, 'philem': 57, 'pm': 57,
  'hebrews': 58, 'heb': 58, 'he': 58,
  'james': 59, 'jas': 59, 'jm': 59, 'jam': 59,
  '1 peter': 60, '1peter': 60, '1pet': 60, '1pe': 60, '1pt': 60, '1 pet': 60, 'first peter': 60, '1st peter': 60, 'i peter': 60, 'i pet': 60,
  '2 peter': 61, '2peter': 61, '2pet': 61, '2pe': 61, '2pt': 61, '2 pet': 61, 'second peter': 61, '2nd peter': 61, 'ii peter': 61, 'ii pet': 61,
  '1 john': 62, '1john': 62, '1jn': 62, '1jhn': 62, '1 jn': 62, '1 jhn': 62, 'first john': 62, '1st john': 62, 'i john': 62, 'i jhn': 62,
  '2 john': 63, '2john': 63, '2jn': 63, '2jhn': 63, '2 jn': 63, '2 jhn': 63, 'second john': 63, '2nd john': 63, 'ii john': 63, 'ii jhn': 63,
  '3 john': 64, '3john': 64, '3jn': 64, '3jhn': 64, '3 jn': 64, '3 jhn': 64, 'third john': 64, '3rd john': 64, 'iii john': 64, 'iii jhn': 64,
  'jude': 65, 'jud': 65, 'jd': 65,
  'revelation': 66, 'rev': 66, 're': 66, 'rv': 66, 'revelations': 66, 'apocalypse': 66, 'revelation of john': 66
};

/**
 * Normalizes input name for comparison
 */
function normalizeName(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .toLowerCase()
    .trim()
    .replace(/^the\s+book\s+of\s+/, '')
    .replace(/^the\s+/, '')
    .replace(/[.,:;]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Fuzzy book name matching:
 * Handles full names ("Genesis", "Revelation"), abbreviations ("Gen", "Rev", "Ps", "Matt"),
 * numbered books ("1 Corinthians", "First Corinthians", "1Cor", "I Corinthians"),
 * and common variations/misspellings via string-similarity.
 *
 * @param {string} name
 * @returns {object|null} Matched book object or null
 */
function findBookByName(name) {
  if (!name) return null;
  const normalized = normalizeName(name);

  // 1. Check exact match in alias dictionary
  if (bookAliases[normalized] !== undefined) {
    const bookId = bookAliases[normalized];
    return booksMetadata.find(b => b.id === bookId) || null;
  }

  // 2. Normalize numbered prefix (e.g. "1st", "first", "i ", "ii ", "iii ")
  let standard = normalized
    .replace(/^first\s+/, '1 ')
    .replace(/^1st\s+/, '1 ')
    .replace(/^i\s+/, '1 ')
    .replace(/^second\s+/, '2 ')
    .replace(/^2nd\s+/, '2 ')
    .replace(/^ii\s+/, '2 ')
    .replace(/^third\s+/, '3 ')
    .replace(/^3rd\s+/, '3 ')
    .replace(/^iii\s+/, '3 ');

  if (bookAliases[standard] !== undefined) {
    const bookId = bookAliases[standard];
    return booksMetadata.find(b => b.id === bookId) || null;
  }

  // 3. Check directly against booksMetadata name or abbreviation
  const directMatch = booksMetadata.find(
    b => b.name.toLowerCase() === normalized || b.abbreviation.toLowerCase() === normalized
  );
  if (directMatch) return directMatch;

  // 4. Starts with prefix match
  const startsWith = booksMetadata.find(b => b.name.toLowerCase().startsWith(normalized));
  if (startsWith && normalized.length >= 3) return startsWith;

  // 5. Fuzzy match using string-similarity if available
  if (stringSimilarity) {
    const aliasKeys = Object.keys(bookAliases);
    const bestMatch = stringSimilarity.findBestMatch(normalized, aliasKeys);
    if (bestMatch && bestMatch.bestMatch && bestMatch.bestMatch.rating >= 0.55) {
      const matchedKey = bestMatch.bestMatch.target;
      const bookId = bookAliases[matchedKey];
      return booksMetadata.find(b => b.id === bookId) || null;
    }
  }

  return null;
}

/**
 * Get books, optionally filtered by 'OT' or 'NT'
 *
 * @param {'OT'|'NT'} [testament]
 * @returns {Promise<Array>}
 */
async function getBooks(testament) {
  const db = await getDb();
  let sql = 'SELECT * FROM books';
  const params = [];
  if (testament && (testament.toUpperCase() === 'OT' || testament.toUpperCase() === 'NT')) {
    sql += ' WHERE testament = ?';
    params.push(testament.toUpperCase());
  }
  sql += ' ORDER BY book_order ASC';
  return queryAll(db, sql, params);
}

/**
 * Get a single book by ID
 *
 * @param {number} bookId
 * @returns {Promise<object|null>}
 */
async function getBook(bookId) {
  const db = await getDb();
  return queryOne(db, 'SELECT * FROM books WHERE id = ?', [bookId]);
}

/**
 * Get list of chapter numbers for a book
 *
 * @param {number} bookId
 * @returns {Promise<number[]>}
 */
async function getChapters(bookId) {
  const db = await getDb();
  const rows = queryAll(
    db,
    'SELECT DISTINCT chapter FROM verses WHERE book_id = ? ORDER BY chapter ASC',
    [bookId]
  );
  return rows.map(r => r.chapter);
}

/**
 * Get all verses in a chapter
 *
 * @param {number} bookId
 * @param {number} chapter
 * @param {string} [translation='KJV']
 * @returns {Promise<Array>}
 */
async function getVerses(bookId, chapter, translation = 'KJV') {
  const db = await getDb();
  const sql = `
    SELECT v.id, v.book_id, b.name as book_name, b.abbreviation, v.chapter, v.verse, v.text, v.translation
    FROM verses v
    JOIN books b ON v.book_id = b.id
    WHERE v.book_id = ? AND v.chapter = ? AND v.translation = ?
    ORDER BY v.verse ASC
  `;
  return queryAll(db, sql, [bookId, chapter, translation.toUpperCase()]);
}

/**
 * Get a single verse
 *
 * @param {number} bookId
 * @param {number} chapter
 * @param {number} verse
 * @param {string} [translation='KJV']
 * @returns {Promise<object|null>}
 */
async function getVerse(bookId, chapter, verse, translation = 'KJV') {
  const db = await getDb();
  const sql = `
    SELECT v.id, v.book_id, b.name as book_name, b.abbreviation, v.chapter, v.verse, v.text, v.translation
    FROM verses v
    JOIN books b ON v.book_id = b.id
    WHERE v.book_id = ? AND v.chapter = ? AND v.verse = ? AND v.translation = ?
    LIMIT 1
  `;
  return queryOne(db, sql, [bookId, chapter, verse, translation.toUpperCase()]);
}

/**
 * Full-text search across verses
 *
 * @param {string} query
 * @param {string} [translation='KJV']
 * @param {number} [limit=50]
 * @returns {Promise<Array>}
 */
async function searchVerses(query, translation = 'KJV', limit = 50) {
  if (!query || !query.trim()) return [];
  const db = await getDb();
  const sql = `
    SELECT v.id, v.book_id, b.name as book_name, b.abbreviation, v.chapter, v.verse, v.text, v.translation
    FROM verses v
    JOIN books b ON v.book_id = b.id
    WHERE v.translation = ? AND v.text LIKE ?
    ORDER BY b.book_order ASC, v.chapter ASC, v.verse ASC
    LIMIT ?
  `;
  return queryAll(db, sql, [translation.toUpperCase(), `%${query.trim()}%`, limit]);
}

/**
 * Get verse by reference (e.g., "John", 3, 16, "KJV")
 *
 * @param {string} bookName
 * @param {number} chapter
 * @param {number} verse
 * @param {string} [translation='KJV']
 * @returns {Promise<object|null>}
 */
async function getVerseByReference(bookName, chapter, verse, translation = 'KJV') {
  const book = findBookByName(bookName);
  if (!book) return null;
  return getVerse(book.id, chapter, verse, translation);
}

/**
 * Get verse range (e.g., Genesis 1:1 - 1:5 or Romans 8:28 - 8:30)
 *
 * @param {string} bookName
 * @param {number} startChapter
 * @param {number} startVerse
 * @param {number} [endChapter]
 * @param {number} [endVerse]
 * @param {string} [translation='KJV']
 * @returns {Promise<Array>}
 */
async function getVerseRange(
  bookName,
  startChapter,
  startVerse,
  endChapter,
  endVerse,
  translation = 'KJV'
) {
  const book = findBookByName(bookName);
  if (!book) return [];

  const eChapter = endChapter !== undefined && endChapter !== null ? Number(endChapter) : Number(startChapter);
  const sChapter = Number(startChapter);
  const sVerse = Number(startVerse);
  const eVerse = endVerse !== undefined && endVerse !== null ? Number(endVerse) : sVerse;
  const trans = (translation || 'KJV').toUpperCase();

  const db = await getDb();
  let sql;
  let params;

  if (sChapter === eChapter) {
    sql = `
      SELECT v.id, v.book_id, b.name as book_name, b.abbreviation, v.chapter, v.verse, v.text, v.translation
      FROM verses v
      JOIN books b ON v.book_id = b.id
      WHERE v.book_id = ? AND v.translation = ? AND v.chapter = ? AND v.verse >= ? AND v.verse <= ?
      ORDER BY v.verse ASC
    `;
    params = [book.id, trans, sChapter, sVerse, eVerse];
  } else {
    sql = `
      SELECT v.id, v.book_id, b.name as book_name, b.abbreviation, v.chapter, v.verse, v.text, v.translation
      FROM verses v
      JOIN books b ON v.book_id = b.id
      WHERE v.book_id = ? AND v.translation = ? AND (
        (v.chapter = ? AND v.verse >= ?) OR
        (v.chapter > ? AND v.chapter < ?) OR
        (v.chapter = ? AND v.verse <= ?)
      )
      ORDER BY v.chapter ASC, v.verse ASC
    `;
    params = [book.id, trans, sChapter, sVerse, sChapter, eChapter, eChapter, eVerse];
  }

  return queryAll(db, sql, params);
}

module.exports = {
  getDb,
  closeDatabase,
  getBooks,
  getBook,
  getChapters,
  getVerses,
  getVerse,
  searchVerses,
  getVerseByReference,
  getVerseRange,
  findBookByName
};
