export const BIBLE_BOOKS = [
  // Old Testament (39 books)
  { id: 'GEN', name: 'Genesis', testament: 'OT', chapters: 50, aliases: ['gen', 'genesis', 'ge', 'gn'] },
  { id: 'EXO', name: 'Exodus', testament: 'OT', chapters: 40, aliases: ['exo', 'exod', 'exodus', 'ex'] },
  { id: 'LEV', name: 'Leviticus', testament: 'OT', chapters: 27, aliases: ['lev', 'leviticus', 'le', 'lv'] },
  { id: 'NUM', name: 'Numbers', testament: 'OT', chapters: 36, aliases: ['num', 'numbers', 'nu', 'nm', 'nb'] },
  { id: 'DEU', name: 'Deuteronomy', testament: 'OT', chapters: 34, aliases: ['deu', 'deut', 'deuteronomy', 'dt'] },
  { id: 'JOS', name: 'Joshua', testament: 'OT', chapters: 24, aliases: ['jos', 'josh', 'joshua'] },
  { id: 'JDG', name: 'Judges', testament: 'OT', chapters: 21, aliases: ['jdg', 'judg', 'judges', 'jg', 'jdgs'] },
  { id: 'RUT', name: 'Ruth', testament: 'OT', chapters: 4, aliases: ['rut', 'ruth', 'ru', 'rth'] },
  { id: '1SA', name: '1 Samuel', testament: 'OT', chapters: 31, aliases: ['1samuel', '1 samuel', '1 sam', '1st samuel', 'first samuel', 'i samuel', '1sa', '1s'] },
  { id: '2SA', name: '2 Samuel', testament: 'OT', chapters: 24, aliases: ['2samuel', '2 samuel', '2 sam', '2nd samuel', 'second samuel', 'ii samuel', '2sa', '2s'] },
  { id: '1KI', name: '1 Kings', testament: 'OT', chapters: 22, aliases: ['1kings', '1 kings', '1 kgs', '1st kings', 'first kings', 'i kings', '1ki', '1k'] },
  { id: '2KI', name: '2 Kings', testament: 'OT', chapters: 25, aliases: ['2kings', '2 kings', '2 kgs', '2nd kings', 'second kings', 'ii kings', '2ki', '2k'] },
  { id: '1CH', name: '1 Chronicles', testament: 'OT', chapters: 29, aliases: ['1chronicles', '1 chronicles', '1 chron', '1st chronicles', 'first chronicles', 'i chronicles', '1ch'] },
  { id: '2CH', name: '2 Chronicles', testament: 'OT', chapters: 36, aliases: ['2chronicles', '2 chronicles', '2 chron', '2nd chronicles', 'second chronicles', 'ii chronicles', '2ch'] },
  { id: 'EZR', name: 'Ezra', testament: 'OT', chapters: 10, aliases: ['ezr', 'ezra'] },
  { id: 'NEH', name: 'Nehemiah', testament: 'OT', chapters: 13, aliases: ['neh', 'nehemiah', 'ne'] },
  { id: 'EST', name: 'Esther', testament: 'OT', chapters: 10, aliases: ['est', 'esther', 'es'] },
  { id: 'JOB', name: 'Job', testament: 'OT', chapters: 42, aliases: ['job', 'jb'] },
  { id: 'PSA', name: 'Psalms', testament: 'OT', chapters: 150, aliases: ['psa', 'psalm', 'psalms', 'ps', 'psm', 'pss'] },
  { id: 'PRO', name: 'Proverbs', testament: 'OT', chapters: 31, aliases: ['pro', 'prov', 'proverbs', 'pr', 'prv'] },
  { id: 'ECC', name: 'Ecclesiastes', testament: 'OT', chapters: 12, aliases: ['ecc', 'eccl', 'ecclesiastes', 'ec', 'qoh'] },
  { id: 'SNG', name: 'Song of Solomon', testament: 'OT', chapters: 8, aliases: ['song of solomon', 'song of songs', 'song', 'songs', 'canticle of canticles', 'canticles', 'sos'] },
  { id: 'ISA', name: 'Isaiah', testament: 'OT', chapters: 66, aliases: ['isa', 'isaiah', 'is'] },
  { id: 'JER', name: 'Jeremiah', testament: 'OT', chapters: 52, aliases: ['jer', 'jeremiah', 'jr'] },
  { id: 'LAM', name: 'Lamentations', testament: 'OT', chapters: 5, aliases: ['lam', 'lamentations', 'la'] },
  { id: 'EZK', name: 'Ezekiel', testament: 'OT', chapters: 48, aliases: ['ezk', 'ezek', 'ezekiel', 'eze'] },
  { id: 'DAN', name: 'Daniel', testament: 'OT', chapters: 12, aliases: ['dan', 'daniel', 'da', 'dn'] },
  { id: 'HOS', name: 'Hosea', testament: 'OT', chapters: 14, aliases: ['hos', 'hosea', 'ho'] },
  { id: 'JOL', name: 'Joel', testament: 'OT', chapters: 3, aliases: ['jol', 'joel', 'jl'] },
  { id: 'AMO', name: 'Amos', testament: 'OT', chapters: 9, aliases: ['amo', 'amos', 'am'] },
  { id: 'OBA', name: 'Obadiah', testament: 'OT', chapters: 1, aliases: ['oba', 'obad', 'obadiah', 'ob'] },
  { id: 'JON', name: 'Jonah', testament: 'OT', chapters: 4, aliases: ['jon', 'jonah', 'jnh'] },
  { id: 'MIC', name: 'Micah', testament: 'OT', chapters: 7, aliases: ['mic', 'micah', 'mc'] },
  { id: 'NAM', name: 'Nahum', testament: 'OT', chapters: 3, aliases: ['nam', 'nah', 'nahum', 'na'] },
  { id: 'HAB', name: 'Habakkuk', testament: 'OT', chapters: 3, aliases: ['hab', 'habakkuk', 'hb'] },
  { id: 'ZEP', name: 'Zephaniah', testament: 'OT', chapters: 3, aliases: ['zep', 'zeph', 'zephaniah', 'zp'] },
  { id: 'HAG', name: 'Haggai', testament: 'OT', chapters: 2, aliases: ['hag', 'haggai', 'hg'] },
  { id: 'ZEC', name: 'Zechariah', testament: 'OT', chapters: 14, aliases: ['zec', 'zech', 'zechariah', 'zc'] },
  { id: 'MAL', name: 'Malachi', testament: 'OT', chapters: 4, aliases: ['mal', 'malachi', 'ml'] },

  // New Testament (27 books)
  { id: 'MAT', name: 'Matthew', testament: 'NT', chapters: 28, aliases: ['mat', 'matt', 'matthew', 'mt'] },
  { id: 'MRK', name: 'Mark', testament: 'NT', chapters: 16, aliases: ['mrk', 'mark', 'mk', 'mr'] },
  { id: 'LUK', name: 'Luke', testament: 'NT', chapters: 24, aliases: ['luk', 'luke', 'lk'] },
  { id: 'JHN', name: 'John', testament: 'NT', chapters: 21, aliases: ['jhn', 'john', 'jn', 'joh'] },
  { id: 'ACT', name: 'Acts', testament: 'NT', chapters: 28, aliases: ['act', 'acts', 'ac'] },
  { id: 'ROM', name: 'Romans', testament: 'NT', chapters: 16, aliases: ['rom', 'romans', 'ro', 'rm'] },
  { id: '1CO', name: '1 Corinthians', testament: 'NT', chapters: 16, aliases: ['1corinthians', '1 corinthians', '1 cor', '1st corinthians', 'first corinthians', 'i corinthians', '1co'] },
  { id: '2CO', name: '2 Corinthians', testament: 'NT', chapters: 13, aliases: ['2corinthians', '2 corinthians', '2 cor', '2nd corinthians', 'second corinthians', 'ii corinthians', '2co'] },
  { id: 'GAL', name: 'Galatians', testament: 'NT', chapters: 6, aliases: ['gal', 'galatians', 'ga'] },
  { id: 'EPH', name: 'Ephesians', testament: 'NT', chapters: 6, aliases: ['eph', 'ephesians', 'ep'] },
  { id: 'PHP', name: 'Philippians', testament: 'NT', chapters: 4, aliases: ['php', 'phil', 'philippians', 'phi'] },
  { id: 'COL', name: 'Colossians', testament: 'NT', chapters: 4, aliases: ['col', 'colossians'] },
  { id: '1TH', name: '1 Thessalonians', testament: 'NT', chapters: 5, aliases: ['1thessalonians', '1 thessalonians', '1 thess', '1st thessalonians', 'first thessalonians', 'i thessalonians', '1th'] },
  { id: '2TH', name: '2 Thessalonians', testament: 'NT', chapters: 3, aliases: ['2thessalonians', '2 thessalonians', '2 thess', '2nd thessalonians', 'second thessalonians', 'ii thessalonians', '2th'] },
  { id: '1TI', name: '1 Timothy', testament: 'NT', chapters: 6, aliases: ['1timothy', '1 timothy', '1 tim', '1st timothy', 'first timothy', 'i timothy', '1ti'] },
  { id: '2TI', name: '2 Timothy', testament: 'NT', chapters: 4, aliases: ['2timothy', '2 timothy', '2 tim', '2nd timothy', 'second timothy', 'ii timothy', '2ti'] },
  { id: 'TIT', name: 'Titus', testament: 'NT', chapters: 3, aliases: ['tit', 'titus', 'ti'] },
  { id: 'PHM', name: 'Philemon', testament: 'NT', chapters: 1, aliases: ['phm', 'philem', 'philemon', 'pm'] },
  { id: 'HEB', name: 'Hebrews', testament: 'NT', chapters: 13, aliases: ['heb', 'hebrews', 'he'] },
  { id: 'JAS', name: 'James', testament: 'NT', chapters: 5, aliases: ['jas', 'james', 'jm', 'ja'] },
  { id: '1PE', name: '1 Peter', testament: 'NT', chapters: 5, aliases: ['1peter', '1 peter', '1 pet', '1st peter', 'first peter', 'i peter', '1pe', '1p'] },
  { id: '2PE', name: '2 Peter', testament: 'NT', chapters: 3, aliases: ['2peter', '2 peter', '2 pet', '2nd peter', 'second peter', 'ii peter', '2pe', '2p'] },
  { id: '1JN', name: '1 John', testament: 'NT', chapters: 5, aliases: ['1john', '1 john', '1 jn', '1st john', 'first john', 'i john', '1jn', '1j'] },
  { id: '2JN', name: '2 John', testament: 'NT', chapters: 1, aliases: ['2john', '2 john', '2 jn', '2nd john', 'second john', 'ii john', '2jn', '2j'] },
  { id: '3JN', name: '3 John', testament: 'NT', chapters: 1, aliases: ['3john', '3 john', '3 jn', '3rd john', 'third john', 'iii john', '3jn', '3j'] },
  { id: 'JUD', name: 'Jude', testament: 'NT', chapters: 1, aliases: ['jud', 'jude', 'jd'] },
  { id: 'REV', name: 'Revelation', testament: 'NT', chapters: 22, aliases: ['rev', 'revelation', 'revelations', 're'] }
];

export const TRANSLATIONS = [
  { code: 'KJV', name: 'King James Version', year: '1611' },
  { code: 'WEB', name: 'World English Bible', year: '2000' },
  { code: 'ASV', name: 'American Standard Version', year: '1901' },
  { code: 'YLT', name: "Young's Literal Translation", year: '1898' },
];

export function findBibleBook(query) {
  if (!query) return null;
  const q = String(query).trim().toLowerCase();
  return (
    BIBLE_BOOKS.find(
      (b) =>
        b.id.toLowerCase() === q ||
        b.name.toLowerCase() === q ||
        (b.aliases && b.aliases.includes(q))
    ) || null
  );
}

// Instant offline fallback verses for common passages & Operator Command Bar demos
export const FALLBACK_VERSES = {
  'Psalms 1:1':
    'Blessed is the man that walketh not in the counsel of the ungodly, nor standeth in the way of sinners, nor sitteth in the seat of the scornful.',
  'Psalms 1:2':
    'But his delight is in the law of the LORD; and in his law doth he meditate day and night.',
  'Psalms 1:3':
    'And he shall be like a tree planted by the rivers of water, that bringeth forth his fruit in his season; his leaf also shall not wither; and whatsoever he doeth shall prosper.',
  'Psalms 1:4':
    'The ungodly are not so: but are like the chaff which the wind driveth away.',
  'Psalms 1:5':
    'Therefore the ungodly shall not stand in the judgment, nor sinners in the congregation of the righteous.',
  'Psalms 1:6':
    'For the LORD knoweth the way of the righteous: but the way of the ungodly shall perish.',
  'Psalms 23:1': 'The LORD is my shepherd; I shall not want.',
  'Psalms 23:2':
    'He maketh me to lie down in green pastures: he leadeth me beside the still waters.',
  'Psalms 23:3':
    'He restoreth my soul: he leadeth me in the paths of righteousness for his name’s sake.',
  'Psalms 23:4':
    'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.',
  'Psalms 23:5':
    'Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.',
  'Psalms 23:6':
    'Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.',
  'Psalms 119:9':
    'Wherewithal shall a young man cleanse his way? by taking heed thereto according to thy word.',
  'John 3:16':
    'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
  'John 3:17':
    'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.',
  'John 1:1':
    'In the beginning was the Word, and the Word was with God, and the Word was God.',
  'Genesis 1:1': 'In the beginning God created the heaven and the earth.',
  'Genesis 1:2':
    'And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.',
  'Genesis 1:3': 'And God said, Let there be light: and there was light.',
  'Genesis 1:4':
    'And God saw the light, that it was good: and God divided the light from the darkness.',
  'Genesis 1:9':
    'And God said, Let the waters under the heaven be gathered together unto one place, and let the dry land appear: and it was so.',
  'Romans 8:28':
    'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
  'Philippians 4:13': 'I can do all things through Christ which strengtheneth me.',
  'Jeremiah 29:11':
    'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
  'Proverbs 3:5':
    'Trust in the LORD with all thine heart; and lean not unto thine own understanding.',
  'Proverbs 3:6':
    'In all thy ways acknowledge him, and he shall direct thy paths.',
  'Isaiah 40:31':
    'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.',
  'Matthew 28:19':
    'Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost:',
  'Matthew 28:20':
    'Teaching them to observe all things whatsoever I have commanded you: and, lo, I am with you alway, even unto the end of the world. Amen.',
};

// Public fallback fetcher if our own backend is cold-starting or unreachable
export async function fetchFallbackVerseText(reference, translation = 'KJV') {
  if (!reference) return '';
  if (FALLBACK_VERSES[reference]) {
    return FALLBACK_VERSES[reference];
  }
  try {
    const t = ['KJV', 'WEB', 'ASV', 'YLT'].includes(String(translation).toUpperCase())
      ? String(translation).toLowerCase()
      : 'kjv';
    const resp = await fetch(
      `https://bible-api.com/${encodeURIComponent(reference)}?translation=${t}`
    );
    if (resp.ok) {
      const data = await resp.json();
      if (data && Array.isArray(data.verses) && data.verses.length > 1) {
        return data.verses
          .map((v, idx) => `[${v.verse || idx + 1}] ${String(v.text || '').replace(/\s+/g, ' ').trim()}`)
          .join(' ');
      }
      if (data && data.text) {
        return String(data.text).replace(/\s+/g, ' ').trim();
      }
    }
  } catch {
    // ignore network error
  }

  // Offline chapter or range fallback from bundled FALLBACK_VERSES
  if (!String(reference).includes(':')) {
    const prefix = `${reference}:`;
    const chapterMatches = Object.entries(FALLBACK_VERSES)
      .filter(([k]) => k.toLowerCase().startsWith(prefix.toLowerCase()))
      .map(([k, text]) => ({
        verse: parseInt(k.split(':')[1], 10) || 1,
        text,
      }))
      .sort((a, b) => a.verse - b.verse);
    if (chapterMatches.length > 0) {
      return chapterMatches.length > 1
        ? chapterMatches.map((v) => `[${v.verse}] ${v.text}`).join(' ')
        : chapterMatches[0].text;
    }
  }
  return '';
}

// Fetch an entire chapter's verses from public fallback if backend is unreachable
export async function fetchFallbackChapterVerses(bookName, chapter, translation = 'KJV') {
  if (!bookName || !chapter) return [];
  try {
    const t = ['KJV', 'WEB', 'ASV', 'YLT'].includes(String(translation).toUpperCase())
      ? String(translation).toLowerCase()
      : 'kjv';
    const resp = await fetch(
      `https://bible-api.com/${encodeURIComponent(`${bookName} ${chapter}`)}?translation=${t}`
    );
    if (resp.ok) {
      const data = await resp.json();
      if (data && Array.isArray(data.verses) && data.verses.length > 0) {
        return data.verses.map((v, idx) => ({
          verse: v.verse || idx + 1,
          text: String(v.text || '').replace(/\s+/g, ' ').trim(),
        }));
      }
    }
  } catch { }

  // Offline fallback from bundled FALLBACK_VERSES for this book + chapter
  const prefix = `${bookName} ${chapter}:`;
  const list = Object.entries(FALLBACK_VERSES)
    .filter(([k]) => k.toLowerCase().startsWith(prefix.toLowerCase()))
    .map(([k, text]) => {
      const vNum = parseInt(k.split(':')[1], 10) || 1;
      return { verse: vNum, text };
    })
    .sort((a, b) => a.verse - b.verse);

  return list;
}

// Match spoken quotation or search query against FALLBACK_VERSES + public API
export async function matchFallbackQuote(phrase, translation = 'KJV') {
  if (!phrase || phrase.trim().length < 4) return null;
  const clean = phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (clean.length === 0) return null;

  let bestRef = null;
  let bestText = null;
  let bestScore = 0;

  for (const [ref, text] of Object.entries(FALLBACK_VERSES)) {
    const lowerText = text.toLowerCase();
    let hits = 0;
    for (const w of clean) {
      if (lowerText.includes(w)) hits++;
    }
    const score = hits / clean.length;
    if (hits >= 3 && score > bestScore) {
      bestScore = score;
      bestRef = ref;
      bestText = text;
    }
  }

  if (bestRef && bestScore >= 0.5) {
    const parts = bestRef.match(/^(.+?)\s+(\d+):(\d+)$/);
    return {
      detected: true,
      reference: bestRef,
      text: bestText,
      book: parts ? parts[1] : '',
      chapter: parts ? Number(parts[2]) : 1,
      verse: parts ? Number(parts[3]) : 1,
      translation: String(translation).toUpperCase(),
      confidence: Math.min(0.96, bestScore),
    };
  }
  return null;
}


