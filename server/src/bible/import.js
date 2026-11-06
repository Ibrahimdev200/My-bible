/**
 * Bible Database Import Script
 *
 * Downloads and parses public domain translations (KJV, ASV, WEB, YLT),
 * saves modular data files to src/bible/data/, and creates the SQLite
 * database at ./data/bible.db using sql.js.
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const books = require('./data/books');

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.resolve(DATA_DIR, 'bible.db');
const BIBLE_DATA_DIR = path.resolve(__dirname, 'data');

// Translation source endpoints
const SOURCES = {
  KJV: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json',
  ASV: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_asv.json',
  WEB: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_web.json',
  YLT: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/YLT.json'
};

function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/"\s*\(Elohim\)\./gi, '')
    .replace(/\s+([,.:;?!'’])/g, '$1')
    .replace(/([‘(\[])\s+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch with retry / local cache check
 */
async function loadTranslationRaw(name, url) {
  const cachePath = path.resolve(BIBLE_DATA_DIR, `${name.toLowerCase()}_raw.json`);
  if (fs.existsSync(cachePath)) {
    console.log(`[Import] Found local raw cache for ${name}`);
    try {
      return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch (e) {
      console.warn(`[Import] Error reading cached ${name}, re-fetching...`);
    }
  }

  console.log(`[Import] Downloading ${name} from ${url}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${name}: HTTP ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  fs.writeFileSync(cachePath, JSON.stringify(data));
  return data;
}

/**
 * Transform raw KJV/ASV/WEB (thiagobodruk format) into { [bookName]: { [chapter]: { [verse]: text } } }
 */
function transformThiagoFormat(rawBooks, isWeb = false) {
  const result = {};
  for (let bIndex = 0; bIndex < books.length; bIndex++) {
    const canonicalBook = books[bIndex];
    const rawBook = rawBooks[bIndex];
    if (!rawBook) continue;

    result[canonicalBook.name] = {};
    for (let c = 0; c < rawBook.chapters.length; c++) {
      const chapterNum = c + 1;
      result[canonicalBook.name][chapterNum] = {};
      const verses = rawBook.chapters[c];
      for (let v = 0; v < verses.length; v++) {
        const verseNum = v + 1;
        const text = isWeb ? cleanText(verses[v]) : (verses[v] || '').trim();
        result[canonicalBook.name][chapterNum][verseNum] = text;
      }
    }
  }
  return result;
}

/**
 * Transform raw YLT (scrollmapper format) into { [bookName]: { [chapter]: { [verse]: text } } }
 */
function transformScrollmapperFormat(raw) {
  const result = {};
  const rawBooks = raw.books || [];
  for (let bIndex = 0; bIndex < books.length; bIndex++) {
    const canonicalBook = books[bIndex];
    const rawBook = rawBooks[bIndex];
    if (!rawBook) continue;

    result[canonicalBook.name] = {};
    const chapters = rawBook.chapters || [];
    for (let c = 0; c < chapters.length; c++) {
      const chObj = chapters[c];
      const chapterNum = chObj.chapter !== undefined ? chObj.chapter : c + 1;
      result[canonicalBook.name][chapterNum] = {};
      const verses = chObj.verses || [];
      for (let v = 0; v < verses.length; v++) {
        const verseObj = verses[v];
        const verseNum = verseObj.verse !== undefined ? verseObj.verse : v + 1;
        result[canonicalBook.name][chapterNum][verseNum] = (verseObj.text || '').trim();
      }
    }
  }
  return result;
}

/**
 * Write modular translation files
 */
function writeModularDataFiles(name, structuredData) {
  const lower = name.toLowerCase();
  const jsonPath = path.resolve(BIBLE_DATA_DIR, `${lower}.json`);
  const jsPath = path.resolve(BIBLE_DATA_DIR, `${lower}.js`);

  console.log(`[Import] Writing modular files: ${lower}.json & ${lower}.js...`);
  fs.writeFileSync(jsonPath, JSON.stringify(structuredData));

  const jsContent = `/**
 * ${name} Verse Data
 * Exported dictionary organized by book, chapter, verse.
 */
module.exports = require('./${lower}.json');
`;
  fs.writeFileSync(jsPath, jsContent, 'utf8');
}

/**
 * Main import function
 */
async function runImport() {
  console.log('==============================================');
  console.log('ScriptureLive AI - Bible Database Import');
  console.log('==============================================');

  // 1. Ensure directories exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`[Import] Created data directory: ${DATA_DIR}`);
  }
  if (!fs.existsSync(BIBLE_DATA_DIR)) {
    fs.mkdirSync(BIBLE_DATA_DIR, { recursive: true });
  }

  // 2. Load and transform all 4 translations
  console.log('[Import] Loading translation data...');
  const [kjvRaw, asvRaw, webRaw, yltRaw] = await Promise.all([
    loadTranslationRaw('KJV', SOURCES.KJV),
    loadTranslationRaw('ASV', SOURCES.ASV),
    loadTranslationRaw('WEB', SOURCES.WEB),
    loadTranslationRaw('YLT', SOURCES.YLT)
  ]);

  console.log('[Import] Transforming translations into standard format...');
  const kjvData = transformThiagoFormat(kjvRaw, false);
  const asvData = transformThiagoFormat(asvRaw, false);
  const webData = transformThiagoFormat(webRaw, true);
  const yltData = transformScrollmapperFormat(yltRaw);

  // 3. Write modular data files
  writeModularDataFiles('KJV', kjvData);
  writeModularDataFiles('ASV', asvData);
  writeModularDataFiles('WEB', webData);
  writeModularDataFiles('YLT', yltData);

  // 4. Initialize SQLite via sql.js
  console.log('[Import] Initializing SQLite database via sql.js...');
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // 5. Create schema
  console.log('[Import] Creating tables and indexes...');
  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      abbreviation TEXT NOT NULL,
      testament TEXT NOT NULL CHECK(testament IN ('OT', 'NT')),
      book_order INTEGER NOT NULL UNIQUE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      text TEXT NOT NULL,
      translation TEXT NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id)
    );
  `);

  // 6. Insert all 66 books
  console.log(`[Import] Inserting ${books.length} books...`);
  db.run('BEGIN TRANSACTION;');
  const bookStmt = db.prepare('INSERT INTO books (id, name, abbreviation, testament, book_order) VALUES (?, ?, ?, ?, ?);');
  for (const b of books) {
    bookStmt.run([b.id, b.name, b.abbreviation, b.testament, b.book_order]);
  }
  bookStmt.free();
  db.run('COMMIT;');

  // 7. Insert verses for each translation
  const translations = [
    { code: 'KJV', data: kjvData },
    { code: 'ASV', data: asvData },
    { code: 'WEB', data: webData },
    { code: 'YLT', data: yltData }
  ];

  const verseCounts = {};

  for (const trans of translations) {
    console.log(`[Import] Inserting verses for translation: ${trans.code}...`);
    let count = 0;
    db.run('BEGIN TRANSACTION;');
    const verseStmt = db.prepare('INSERT INTO verses (book_id, chapter, verse, text, translation) VALUES (?, ?, ?, ?, ?);');

    for (const b of books) {
      const bookVerses = trans.data[b.name];
      if (!bookVerses) continue;

      const chapters = Object.keys(bookVerses).map(Number).sort((a, b) => a - b);
      for (const ch of chapters) {
        const versesMap = bookVerses[ch];
        const verseNums = Object.keys(versesMap).map(Number).sort((a, b) => a - b);
        for (const vNum of verseNums) {
          const text = versesMap[vNum];
          if (text) {
            verseStmt.run([b.id, ch, vNum, text, trans.code]);
            count++;
          }
        }
      }
    }

    verseStmt.free();
    db.run('COMMIT;');
    verseCounts[trans.code] = count;
    console.log(`[Import] ✓ ${trans.code}: ${count.toLocaleString()} verses inserted.`);
  }

  // 8. Create indexes
  console.log('[Import] Creating indexes for high performance lookups...');
  db.run('CREATE INDEX IF NOT EXISTS idx_verses_lookup ON verses(book_id, chapter, verse, translation);');
  db.run('CREATE INDEX IF NOT EXISTS idx_verses_translation ON verses(translation);');
  db.run('CREATE INDEX IF NOT EXISTS idx_verses_text ON verses(text);');

  // 9. Export to disk
  console.log(`[Import] Exporting database to ${DB_PATH}...`);
  const exported = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(exported));
  db.close();

  console.log(`[Import] ✓ Database created successfully! File size: ${(exported.length / (1024 * 1024)).toFixed(2)} MB`);

  // 10. Summary report
  console.log('\n==============================================');
  console.log('IMPORT COMPLETE SUMMARY');
  console.log('==============================================');
  console.log(`Books inserted: ${books.length}`);
  for (const [code, count] of Object.entries(verseCounts)) {
    console.log(`- ${code}: ${count.toLocaleString()} verses`);
  }
  const totalVerses = Object.values(verseCounts).reduce((a, b) => a + b, 0);
  console.log(`Total verses across all translations: ${totalVerses.toLocaleString()}`);
  console.log(`Database saved at: ${DB_PATH}`);
  console.log('==============================================');

  return {
    booksCount: books.length,
    verseCounts,
    totalVerses,
    dbPath: DB_PATH
  };
}

// Allow direct execution
if (require.main === module) {
  runImport()
    .then(() => {
      console.log('Import process finished successfully.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Import failed with error:', err);
      process.exit(1);
    });
}

module.exports = {
  runImport,
  cleanText
};
