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

