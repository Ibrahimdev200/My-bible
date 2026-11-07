/**
 * Scripture Engine
 * ----------------
 * 1. extractReferences(): finds spoken/written references ("John chapter three verse sixteen").
 *    - strict book-name matching (no fuzzy matching on short words => no "5 pm" -> Matthew 5)
 *    - understands number words ("twenty one"), ordinals ("first corinthians"), "3:16", "3 to 5"
 *    - validates chapter/verse against the real Bible structure in the database
 * 2. matchQuote(): identifies a verse from quoted words with no reference
 *    using an inverted word index over every verse of every translation (IDF weighted).
 */
const { CANONICAL_BOOKS } = require('./bibleService');

// ---------------------------------------------------------------------------
// Number words
// ---------------------------------------------------------------------------
const UNITS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19
};
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

function parseNumberWords(t, i) {
  let j = i;
  let val = 0;
  const isUnit = (w) => Object.prototype.hasOwnProperty.call(UNITS, w);
  const isTens = (w) => Object.prototype.hasOwnProperty.call(TENS, w);

  if (isUnit(t[j]) && UNITS[t[j]] >= 1 && UNITS[t[j]] <= 9 && t[j + 1] === 'hundred') {
    val = UNITS[t[j]] * 100;
    j += 2;
  } else if (t[j] === 'hundred') {
    val = 100;
    j += 1;
  }
  const hadHundred = val >= 100;
  if (hadHundred && t[j] === 'and' && (isTens(t[j + 1]) || isUnit(t[j + 1]))) j += 1;

  if (isTens(t[j])) {
    val += TENS[t[j]];
    j += 1;
    if (isUnit(t[j]) && UNITS[t[j]] >= 1 && UNITS[t[j]] <= 9) {
      val += UNITS[t[j]];
      j += 1;
    }
  } else if (isUnit(t[j])) {
    val += UNITS[t[j]];
    j += 1;
  }
  if (j === i) return null;
  return [val, j];
}

function convertNumberWords(tokens) {
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    const parsed = parseNumberWords(tokens, i);
    if (parsed) {
      out.push(String(parsed[0]));
      i = parsed[1];
    } else {
      out.push(tokens[i]);
      i += 1;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Book name table (strict)
// ---------------------------------------------------------------------------
const ORDINALS = {
  1: ['1', '1st', 'first', 'i', 'one'],
  2: ['2', '2nd', 'second', 'ii', 'two'],
  3: ['3', '3rd', 'third', 'iii', 'three']
};

// Common speech-recognition spellings / extra names (all lowercase).
const EXTRA_NAMES = {
  19: ['psalm', 'psalms', 'the psalms', 'psalter'],
  20: ['proverb', 'proverbs'],
  22: ['song of solomon', 'song of songs', 'songs of solomon', 'song of soloman'],
  66: ['revelation', 'revelations', 'revelation of john', 'the revelation'],
  44: ['acts', 'acts of the apostles'],
  3: ['leviticus', 'levitikus'],
  5: ['deuteronomy', 'duteronomy', 'deuteronomi'],
  35: ['habakkuk', 'habakuk', 'habbakuk'],
  36: ['zephaniah', 'zephania'],
  38: ['zechariah', 'zachariah', 'zecharia'],
  26: ['ezekiel', 'ezekial'],
  23: ['isaiah', 'isaih', 'isiah'],
  24: ['jeremiah', 'jeremia'],
  16: ['nehemiah', 'nehemia'],
  31: ['obadiah', 'obadia'],
  48: ['galatians', 'gallatians', 'galations'],
  49: ['ephesians', 'efesians', 'ephesian'],
  50: ['philippians', 'phillippians', 'philipians', 'phillipians'],
  51: ['colossians', 'colosians', 'colossian'],
  57: ['philemon', 'philemon'],
  58: ['hebrews', 'hebrew'],
  59: ['james'],
  45: ['romans', 'roman']
};
// Base names (after the number) for numbered books, plus spoken variants.
const NUMBERED_BASE_VARIANTS = {
  'samuel': ['samuel', 'sam'],
  'kings': ['kings', 'king'],
  'chronicles': ['chronicles', 'chronicle', 'chron'],
  'corinthians': ['corinthians', 'corinthian', 'cor', 'corintians', 'corinthinas'],
  'thessalonians': ['thessalonians', 'thessalonian', 'thess', 'thesalonians', 'thessalonica'],
  'timothy': ['timothy', 'tim', 'timothey'],
  'peter': ['peter', 'pet'],
  'john': ['john', 'jn']
};

// Books whose names are ordinary words/personal names: a bare "<name> <number>"
// with no spoken cue must not be trusted automatically.
const NAMELIKE_BOOKS = new Set([18, 41, 44, 4, 7, 22, 43, 42, 59, 8, 17, 27, 29, 30, 32, 6, 40]);

const BOOK_LOOKUP = new Map(); // "1 corinthians" -> book
let MAX_NAME_WORDS = 1;

function tokenizeName(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function addName(name, book) {
  const key = tokenizeName(name).join(' ');
  if (!key) return;
  if (!BOOK_LOOKUP.has(key)) BOOK_LOOKUP.set(key, book);
  MAX_NAME_WORDS = Math.max(MAX_NAME_WORDS, key.split(' ').length);
}

(function buildBookLookup() {
  for (const book of CANONICAL_BOOKS) {
    addName(book.name, book);
    (EXTRA_NAMES[book.id] || []).forEach((n) => addName(n, book));

    const numbered = /^(\d)\s+(.+)$/.exec(book.name);
    if (numbered) {
      const num = parseInt(numbered[1], 10);
      const base = numbered[2].toLowerCase();
      const variants = NUMBERED_BASE_VARIANTS[base] || [base];
      for (const prefix of ORDINALS[num]) {
        for (const v of variants) addName(`${prefix} ${v}`, book);
        addName(`${prefix}${base}`, book);
      }
    } else {
      // keep distinctive abbreviations of 4+ letters only (gen, ex, is, am, pm... are too risky in speech)
      for (const alias of book.aliases) {
        if (alias.length >= 4 && /^[a-z ]+$/.test(alias)) addName(alias, book);
      }
    }
  }
  // "1 john" etc. must beat bare "john": longest-match-first handles this at scan time.
})();

// Bare words that are strong enough on their own once followed by a chapter number.
const NAME_PREFIX_CUES = new Set([
  'turn', 'turning', 'open', 'read', 'reading', 'look', 'flip', 'go', 'going', 'book', 'bible', 'scripture',
  'scriptures', 'text', 'passage', 'according', 'written', 'recorded', 'lets', 'let', 'to', 'in', 'from', 'at'
]);
const STRONG_CUES = new Set([
  'turn', 'turning', 'open', 'read', 'reading', 'flip', 'book', 'bible', 'scripture', 'scriptures', 'text',
  'passage', 'according', 'written', 'recorded', 'lets', 'look', 'go', 'going'
]);
const VERSE_WORDS = new Set(['verse', 'verses', 'vs', 'v']);
const RANGE_WORDS = new Set(['to', 'through', 'thru', 'until', 'and']);

// ---------------------------------------------------------------------------
// Bible structure (chapter -> verse counts) for validation
// ---------------------------------------------------------------------------
const structure = { ready: false, maxVerse: new Map() }; // key `${bookId}:${chapter}` -> max verse

function buildStructure(bibleService) {
  const rows = bibleService.executeQuery(
    'SELECT book_id, chapter, MAX(verse) AS maxv FROM verses GROUP BY book_id, chapter'
  );
  structure.maxVerse.clear();
  for (const r of rows) structure.maxVerse.set(`${r.book_id}:${r.chapter}`, r.maxv);
  structure.ready = true;
}

function getMaxVerse(bookId, chapter) {
  return structure.maxVerse.get(`${bookId}:${chapter}`) || null;
}

// ---------------------------------------------------------------------------
// Reference extraction
// ---------------------------------------------------------------------------
function normalizeForReferences(text) {
  let s = String(text || '').toLowerCase();
  s = s.replace(/(\d+)\s*[:.]\s*(\d+)/g, '$1 verse $2'); // 3:16 -> 3 verse 16
  s = s.replace(/(\d+)\s*[-\u2013\u2014]\s*(\d+)/g, '$1 to $2'); // 16-18 -> 16 to 18
  s = s.replace(/['\u2019]/g, ''); // lets
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  const tokens = s.split(/\s+/).filter(Boolean);
  return convertNumberWords(tokens);
}

const isNum = (w) => typeof w === 'string' && /^\d{1,3}$/.test(w);

function formatReference(bookName, chapter, startVerse, endVerse) {
  let ref = `${bookName} ${chapter}`;
  if (startVerse != null) {
    ref += `:${startVerse}`;
    if (endVerse != null && endVerse !== startVerse) ref += `-${endVerse}`;
  }
  return ref;
}

function extractReferences(text) {
  const t = normalizeForReferences(text);
  const results = [];
  let i = 0;

  while (i < t.length) {
    // longest book-name match at position i
    let book = null;
    let nameLen = 0;
    for (let n = Math.min(MAX_NAME_WORDS, t.length - i); n >= 1; n--) {
      const key = t.slice(i, i + n).join(' ');
      if (BOOK_LOOKUP.has(key)) {
        book = BOOK_LOOKUP.get(key);
        nameLen = n;
        break;
      }
    }
    if (!book) {
      i += 1;
      continue;
    }

    let j = i + nameLen;
    let chapterKeyword = false;
    if (t[j] === 'chapter' || t[j] === 'chapters') {
      chapterKeyword = true;
      j += 1;
    }
    if (!isNum(t[j])) {
      i += nameLen;
      continue;
    }
    const chapter = parseInt(t[j], 10);
    j += 1;
    if (chapter < 1 || chapter > book.chapters) {
      i += nameLen;
      continue;
    }

    // optional verse part
    let k = j;
    if (t[k] === 'from') k += 1;
    if (t[k] === 'and' && VERSE_WORDS.has(t[k + 1])) k += 1;
    let verseKeyword = false;
    let startVerse = null;
    let endVerse = null;
    let bareVerse = false;

    if (VERSE_WORDS.has(t[k]) && isNum(t[k + 1])) {
      verseKeyword = true;
      startVerse = parseInt(t[k + 1], 10);
      k += 2;
    } else if (isNum(t[k]) && !chapterKeyword) {
      // "john 3 16"
      startVerse = parseInt(t[k], 10);
      bareVerse = true;
      k += 1;
    }

    if (startVerse !== null) {
      // optional range: "to verse 10", "through 18", "and 17"
      if (RANGE_WORDS.has(t[k])) {
        let m = k + 1;
        if (VERSE_WORDS.has(t[m])) m += 1;
        if (isNum(t[m])) {
          const e = parseInt(t[m], 10);
          if (e > startVerse) {
            endVerse = e;
            k = m + 1;
          }
        }
      }
    }

    // validate verse numbers against the real chapter
    let confidencePenalty = 0;
    const maxV = getMaxVerse(book.id, chapter);
    if (startVerse !== null && maxV !== null) {
      if (startVerse < 1 || startVerse > maxV) {
        startVerse = null;
        endVerse = null;
        verseKeyword = false;
        bareVerse = false;
        confidencePenalty = 0.15;
      } else if (endVerse !== null && endVerse > maxV) {
        endVerse = maxV;
      }
    }
    if (bareVerse && startVerse === null) {
      // bare number did not validate as a verse; ignore it
    }

    // spoken cues just before the book name
    const before = t.slice(Math.max(0, i - 4), i);
    const hasCue = before.some((w) => STRONG_CUES.has(w));
    const hasBookOf = before.length >= 2 && before[before.length - 2] === 'book' && before[before.length - 1] === 'of';

    let confidence = 0.8;
    if (startVerse !== null) confidence = bareVerse ? 0.9 : 0.95;
    if (chapterKeyword || verseKeyword) confidence = Math.max(confidence, 0.93);
    if (hasCue || hasBookOf) confidence = Math.min(0.99, confidence + 0.06);
    else if (!chapterKeyword && !verseKeyword && NAMELIKE_BOOKS.has(book.id) && startVerse === null) {
      confidence = 0.62; // "Job 3 years", "Mark 5 minutes" => needs operator confirmation
    }
    confidence = Math.round(Math.max(0.3, confidence - confidencePenalty) * 100) / 100;

    results.push({
      reference: formatReference(book.name, chapter, startVerse, endVerse),
      bookName: book.name,
      bookId: book.id,
      chapter,
      startVerse: startVerse || null,
      endVerse: endVerse || null,
      confidence,
      method: 'reference',
      matchedText: t.slice(i, k).join(' '),
      position: i
    });

    i = Math.max(k, i + nameLen);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Quotation matching (inverted index over every verse of every translation)
// ---------------------------------------------------------------------------
const index = {
  ready: false,
  N: 0,
  wordId: new Map(),
  postings: [], // wordId -> Int32Array of row ids
  bookId: null,
  chapter: null,
  verse: null,
  trans: null,
  transNames: []
};
const textCache = new Map();

function wordsOf(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 || w === 'i' || w === 'a');
}

function buildIndex(bibleService) {
  const started = Date.now();
  const rows = bibleService.executeQuery(
    'SELECT book_id, chapter, verse, translation, text FROM verses'
  );
  const N = rows.length;
  index.N = N;
  index.bookId = new Uint8Array(N);
  index.chapter = new Uint16Array(N);
  index.verse = new Uint16Array(N);
  index.trans = new Uint8Array(N);
  index.transNames = [];
  index.wordId = new Map();
  const tmp = []; // wordId -> number[]

  for (let r = 0; r < N; r++) {
    const row = rows[r];
    let ti = index.transNames.indexOf(row.translation);
    if (ti === -1) {
      index.transNames.push(row.translation);
      ti = index.transNames.length - 1;
    }
    index.bookId[r] = row.book_id;
    index.chapter[r] = row.chapter;
    index.verse[r] = row.verse;
    index.trans[r] = ti;

    const seen = new Set();
    for (const w of wordsOf(row.text)) {
      if (seen.has(w)) continue;
      seen.add(w);
      let id = index.wordId.get(w);
      if (id === undefined) {
        id = tmp.length;
        index.wordId.set(w, id);
        tmp.push([]);
      }
      tmp[id].push(r);
    }
  }
  index.postings = tmp.map((arr) => Int32Array.from(arr));
  index.ready = true;
  textCache.clear();
  console.log(
    `✓ [ScriptureEngine] Quote index built: ${N} verses, ${index.wordId.size} words in ${Date.now() - started}ms`
  );
}

function idfOf(word) {
  const id = index.wordId.get(word);
  if (id === undefined) return Math.log(index.N + 1);
  return Math.log((index.N + 1) / (index.postings[id].length + 1));
}

function getVerseText(bibleService, row) {
  const key = row;
  if (textCache.has(key)) return textCache.get(key);
  const res = bibleService.executeQuery(
    'SELECT text FROM verses WHERE book_id = ? AND chapter = ? AND verse = ? AND translation = ?',
    [index.bookId[row], index.chapter[row], index.verse[row], index.transNames[index.trans[row]]]
  );
  const text = res.length ? res[0].text : '';
  if (textCache.size > 5000) textCache.clear();
  textCache.set(key, text);
  return text;
}

function lcsLength(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function scoreCandidate(S, vTokens) {
  const vset = new Set(vTokens);
  const vcount = new Map();
  for (const w of vTokens) vcount.set(w, (vcount.get(w) || 0) + 1);
  let vWeight = 0;
  for (const [w, c] of vcount) vWeight += idfOf(w) * c;
  if (vWeight === 0) return null;

  const n = S.length;
  const maxLen = Math.min(n, vTokens.length + 6);
  let best = null;
  for (let a = 0; a < n; a++) {
    let m = 0;
    let wsum = 0;
    let matched = 0;
    const used = new Map();
    for (let b = a; b < n && b - a < maxLen; b++) {
      const wt = idfOf(S[b]);
      wsum += wt;
      // a repeated word only counts as often as the verse repeats it ("he that is in you than he that is in the world")
      if (vset.has(S[b]) && (used.get(S[b]) || 0) < vcount.get(S[b])) {
        m += wt;
        matched += 1;
        used.set(S[b], (used.get(S[b]) || 0) + 1);
      }
      if (b - a + 1 >= 2) {
        const obj = m - 0.6 * (wsum - m);
        if (!best || obj > best.obj) best = { obj, m, wsum, matched, len: b - a + 1, a, b };
      }
    }
  }
  if (!best || best.m <= 0) return null;

  // word-order check: a real quotation keeps the verse's word order, a loose paraphrase does not
  const seqS = S.slice(best.a, best.b + 1).filter((w) => vset.has(w));
  const sset = new Set(seqS);
  const seqV = vTokens.filter((w) => sset.has(w));
  const order = seqS.length ? lcsLength(seqS, seqV) / seqS.length : 0;

  const precision = best.m / best.wsum;
  const recall = Math.min(1, best.m / vWeight);
  return { precision, recall, order, matched: best.matched, m: best.m, len: best.len, vLen: vTokens.length };
}

function confidenceFor(sc) {
  if (!sc) return 0;
  // very short verses ("Jesus wept"): the whole verse must be spoken, nothing else
  if (sc.vLen <= 4) {
    if (sc.matched >= 2 && sc.recall >= 0.99 && sc.precision >= 0.99 && sc.order >= 0.99 && sc.len <= sc.vLen + 1 && sc.m >= 8) return 0.9;
    return 0;
  }
  if (sc.m < 8 || sc.order < 0.75) return 0;
  if (sc.recall >= 0.7 && sc.precision >= 0.65) {
    return 0.8 + 0.19 * Math.min(1, (sc.precision + sc.recall) / 2);
  }
  // partial quotation (pastor only quotes the beginning / part of the verse)
  if (sc.matched >= 5 && sc.precision >= 0.8 && sc.order >= 0.85 && (sc.recall >= 0.25 || sc.m >= 14)) {
    const strength = Math.min(1, Math.max(sc.recall / 0.7, sc.m / 26));
    const c = 0.6 + 0.26 * strength + 0.04 * Math.min(1, (sc.precision - 0.8) / 0.2) + 0.03 * sc.order;
    return Math.min(0.9, c);
  }
  // short but very distinctive fragment (4+ words with high rarity): suggest only, operator confirms
  if (sc.matched >= 4 && sc.m >= 16 && sc.precision >= 0.92 && sc.order >= 0.9 && sc.recall >= 0.35) {
    return 0.68;
  }
  return 0;
}

function matchQuote(bibleService, speechText) {
  if (!index.ready || !speechText) return null;
  const S = wordsOf(speechText).slice(-60);
  if (S.length < 2) return null;

  // 1. candidate retrieval by rare-word votes
  const maxDf = index.N * 0.03;
  const votes = new Map();
  const seenWords = new Set();
  for (const w of S) {
    if (seenWords.has(w)) continue;
    seenWords.add(w);
    const id = index.wordId.get(w);
    if (id === undefined) continue;
    const post = index.postings[id];
    if (post.length > maxDf) continue;
    const idf = Math.log((index.N + 1) / (post.length + 1));
    for (let p = 0; p < post.length; p++) {
      votes.set(post[p], (votes.get(post[p]) || 0) + idf);
    }
  }
  if (votes.size === 0) return null;
  const top = [...votes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);

  // 2. precise scoring, best score per (book, chapter, verse) across translations
  const perVerse = new Map();
  for (const [row] of top) {
    const text = getVerseText(bibleService, row);
    const vTokens = wordsOf(text);
    if (vTokens.length === 0) continue;
    const sc = scoreCandidate(S, vTokens);
    const conf = confidenceFor(sc);
    if (conf <= 0) continue;
    const key = `${index.bookId[row]}:${index.chapter[row]}:${index.verse[row]}`;
    const prev = perVerse.get(key);
    if (!prev || conf > prev.conf) {
      perVerse.set(key, { conf, sc, row, text });
    }
  }
  if (perVerse.size === 0) return null;

  const ranked = [...perVerse.values()].sort((a, b) => b.conf - a.conf);
  let best = ranked[0];
  let confidence = best.conf;
  if (ranked.length > 1 && ranked[1].conf >= best.conf - 0.04) {
    confidence -= 0.1; // two verses fit equally well (parallel passages) -> ask the operator
  }
  if (confidence < 0.65) return null;
  const bookId = index.bookId[best.row];
  const book = CANONICAL_BOOKS.find((b) => b.id === bookId);
  const chapter = index.chapter[best.row];
  const verse = index.verse[best.row];
  return {
    reference: `${book.name} ${chapter}:${verse}`,
    bookName: book.name,
    bookId,
    chapter,
    startVerse: verse,
    endVerse: verse,
    confidence: Math.round(Math.max(0, confidence) * 100) / 100,
    method: 'quotation',
    matchedText: S.join(' '),
    verseText: best.text,
    evidence: {
      precision: Math.round(best.sc.precision * 100) / 100,
      recall: Math.round(best.sc.recall * 100) / 100,
      order: Math.round(best.sc.order * 100) / 100,
      matchedWords: best.sc.matched,
      weight: Math.round(best.sc.m * 10) / 10
    }
  };
}

module.exports = {
  buildStructure,
  buildIndex,
  extractReferences,
  matchQuote,
  convertNumberWords,
  isIndexReady: () => index.ready
};
