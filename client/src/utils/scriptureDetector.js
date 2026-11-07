import { BIBLE_BOOKS } from './bibleData';

// Number words for spoken references ("chapter twenty three verse one")
const UNITS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

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
  if (val >= 100 && t[j] === 'and' && (isTens(t[j + 1]) || isUnit(t[j + 1]))) j += 1;

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

const ORDINALS = {
  1: ['1', '1st', 'first', 'i', 'one'],
  2: ['2', '2nd', 'second', 'ii', 'two'],
  3: ['3', '3rd', 'third', 'iii', 'three'],
};

const EXTRA_NAMES = {
  PSA: ['psalm', 'psalms', 'the psalms'],
  PRO: ['proverb', 'proverbs'],
  SNG: ['song of solomon', 'song of songs', 'songs of solomon'],
  REV: ['revelation', 'revelations', 'revelation of john'],
  ACT: ['acts', 'acts of the apostles'],
  EPH: ['ephesians', 'efesians'],
  PHP: ['philippians', 'phillippians', 'philipians'],
  COL: ['colossians', 'colosians'],
  HEB: ['hebrews', 'hebrew'],
};

const NUMBERED_VARIANTS = {
  samuel: ['samuel', 'sam'],
  kings: ['kings', 'king'],
  chronicles: ['chronicles', 'chronicle', 'chron'],
  corinthians: ['corinthians', 'corinthian', 'cor'],
  thessalonians: ['thessalonians', 'thessalonian', 'thess'],
  timothy: ['timothy', 'tim'],
  peter: ['peter', 'pet'],
  john: ['john', 'jn'],
};

const BOOK_LOOKUP = new Map();
let MAX_NAME_WORDS = 1;

function addBookName(raw, book) {
  const key = raw.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).join(' ');
  if (!key) return;
  if (!BOOK_LOOKUP.has(key)) BOOK_LOOKUP.set(key, book);
  MAX_NAME_WORDS = Math.max(MAX_NAME_WORDS, key.split(' ').length);
}

for (const book of BIBLE_BOOKS) {
  addBookName(book.name, book);
  (EXTRA_NAMES[book.id] || []).forEach((n) => addBookName(n, book));

  const m = /^(\d)\s+(.+)$/.exec(book.name);
  if (m) {
    const num = parseInt(m[1], 10);
    const base = m[2].toLowerCase();
    const variants = NUMBERED_VARIANTS[base] || [base];
    for (const ord of ORDINALS[num]) {
      for (const v of variants) addBookName(`${ord} ${v}`, book);
      addBookName(`${ord}${base}`, book);
    }
  } else {
    for (const alias of book.aliases || []) {
      if (alias.length >= 4 && /^[a-z ]+$/i.test(alias)) addBookName(alias, book);
    }
  }
}

const STRONG_CUES = new Set([
  'turn', 'turning', 'open', 'read', 'reading', 'flip', 'book', 'bible', 'scripture',
  'scriptures', 'text', 'passage', 'according', 'written', 'recorded', 'lets', 'look', 'go', 'going',
]);
const VERSE_WORDS = new Set(['verse', 'verses', 'vs', 'v']);
const RANGE_WORDS = new Set(['to', 'through', 'thru', 'until', 'and']);
const isNum = (w) => typeof w === 'string' && /^\d{1,3}$/.test(w);

export function detectScripture(transcript) {
  if (!transcript || typeof transcript !== 'string') return null;

  let s = transcript.toLowerCase();
  s = s.replace(/(\d+)\s*[:.]\s*(\d+)/g, '$1 verse $2');
  s = s.replace(/(\d+)\s*[-\u2013\u2014]\s*(\d+)/g, '$1 to $2');
  s = s.replace(/['\u2019]/g, '');
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  const t = convertNumberWords(s.split(/\s+/).filter(Boolean));

  const results = [];
  let i = 0;
  while (i < t.length) {
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

    let k = j;
    if (t[k] === 'from') k += 1;
    if (t[k] === 'and' && VERSE_WORDS.has(t[k + 1])) k += 1;
    let verseKeyword = false;
    let startVerse = null;
    let endVerse = null;

    if (VERSE_WORDS.has(t[k]) && isNum(t[k + 1])) {
      verseKeyword = true;
      startVerse = parseInt(t[k + 1], 10);
      k += 2;
    } else if (isNum(t[k]) && !chapterKeyword) {
      const v = parseInt(t[k], 10);
      if (v >= 1 && v <= 176) {
        startVerse = v;
        k += 1;
      }
    }

    if (startVerse !== null && RANGE_WORDS.has(t[k])) {
      let m = k + 1;
      if (VERSE_WORDS.has(t[m])) m += 1;
      if (isNum(t[m])) {
        const e = parseInt(t[m], 10);
        if (e > startVerse && e <= 176) {
          endVerse = e;
          k = m + 1;
        }
      }
    }

    const before = t.slice(Math.max(0, i - 4), i);
    const hasCue = before.some((w) => STRONG_CUES.has(w));

    let confidence = startVerse !== null ? 0.94 : 0.84;
    if (chapterKeyword || verseKeyword) confidence = Math.max(confidence, 0.92);
    if (hasCue) confidence = Math.min(0.99, confidence + 0.05);

    let reference = `${book.name} ${chapter}`;
    if (startVerse !== null) {
      reference += `:${startVerse}`;
      if (endVerse !== null && endVerse !== startVerse) reference += `-${endVerse}`;
    }

    results.push({
      bookName: book.name,
      bookId: book.id,
      testament: book.testament,
      chapter,
      startVerse: startVerse || 1,
      endVerse: endVerse || startVerse || 1,
      reference,
      confidence,
      matchedText: t.slice(i, k).join(' '),
      position: i,
    });
    i = Math.max(k, i + nameLen);
  }

  if (results.length === 0) return null;
  return results.sort((a, b) => b.confidence - a.confidence || b.position - a.position)[0];
}

export default detectScripture;
