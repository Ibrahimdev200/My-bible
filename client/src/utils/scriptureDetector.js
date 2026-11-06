import { BIBLE_BOOKS } from './bibleData';

// Word-to-number mapping for speech-to-text outputs
const WORD_TO_NUMBER = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  '1st': 1, '2nd': 2, '3rd': 3, '4th': 4,
};

function wordsToNumber(text) {
  if (!text) return null;
  const clean = text.trim().toLowerCase();
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);
  if (WORD_TO_NUMBER[clean] !== undefined) return WORD_TO_NUMBER[clean];

  // Compound like "twenty three"
  const parts = clean.split(/[\s-]+/);
  if (parts.length === 2 && WORD_TO_NUMBER[parts[0]] && WORD_TO_NUMBER[parts[1]]) {
    return WORD_TO_NUMBER[parts[0]] + WORD_TO_NUMBER[parts[1]];
  }
  return null;
}

// Normalize speech prefix variations for numbered books:
// "first corinthians" -> "1 corinthians", "2nd samuel" -> "2 samuel", "iii john" -> "3 john"
function normalizeBookPrefixes(input) {
  return input
    .replace(/\bfirst\b/gi, '1')
    .replace(/\b1st\b/gi, '1')
    .replace(/\bi\s+/gi, '1 ')
    .replace(/\bsecond\b/gi, '2')
    .replace(/\b2nd\b/gi, '2')
    .replace(/\bii\s+/gi, '2 ')
    .replace(/\bthird\b/gi, '3')
    .replace(/\b3rd\b/gi, '3')
    .replace(/\biii\s+/gi, '3 ');
}

// Find matched Bible book from token
function findBibleBook(nameCandidate) {
  const query = nameCandidate.trim().toLowerCase().replace(/\./g, '');
  if (!query) return null;

  for (const book of BIBLE_BOOKS) {
    if (book.name.toLowerCase() === query) return book;
    if (book.aliases.some(alias => alias.toLowerCase() === query)) return book;
  }
  return null;
}

/**
 * Detect Bible reference from transcript string.
 * Supports patterns:
 * - "John 3:16"
 * - "John 3:16-18" / "John 3:16 - 18"
 * - "John chapter 3 verse 16"
 * - "John 3 verse 16"
 * - "John chapter 3 verses 16 to 18"
 * - "turn to Psalm 23"
 * - "1 Corinthians 13:4"
 * - "Romans 8 28" (speech without colon)
 */
export function detectScripture(transcript) {
  if (!transcript || typeof transcript !== 'string') return null;

  const normalized = normalizeBookPrefixes(transcript);

  // Common filler patterns before scripture
  // e.g. "turn your bibles to", "reading from", "let's look at", "open to", "in the book of"

  // 1. Regular expression for standard colon pattern: Book Chapter:Verse(-EndVerse)
  // e.g. "John 3:16", "1 John 1:9", "Genesis 1:1-3"
  const standardColonRegex = /\b((?:[1-3]\s+)?[a-zA-Z\s]+?)\s+(\d+)\s*:\s*(\d+)(?:\s*(?:-|to|through)\s*(\d+))?\b/i;
  const colonMatch = normalized.match(standardColonRegex);
  if (colonMatch) {
    const rawBook = colonMatch[1].trim();
    const book = findBibleBook(rawBook);
    if (book) {
      const chapter = parseInt(colonMatch[2], 10);
      const startVerse = parseInt(colonMatch[3], 10);
      const endVerse = colonMatch[4] ? parseInt(colonMatch[4], 10) : startVerse;
      const ref = endVerse && endVerse !== startVerse
        ? `${book.name} ${chapter}:${startVerse}-${endVerse}`
        : `${book.name} ${chapter}:${startVerse}`;

      return {
        bookName: book.name,
        bookId: book.id,
        testament: book.testament,
        chapter,
        startVerse,
        endVerse,
        reference: ref,
        confidence: 0.95,
        matchedText: colonMatch[0],
      };
    }
  }

  // 2. Spoken phrases: "Book [chapter] X [verse|verses] Y [to Z]"
  // e.g. "John chapter 3 verse 16", "Romans chapter 8 verses 28 to 30", "1 Corinthians chapter 13 verse 4"
  const spokenChapterVerseRegex = /\b((?:[1-3]\s+)?[a-zA-Z\s]+?)\s+(?:chapter\s+)?(\d+|[a-zA-Z]+)\s+(?:verse|verses|v)\s+(\d+|[a-zA-Z]+)(?:\s*(?:to|through|-)\s*(\d+|[a-zA-Z]+))?\b/i;
  const spokenMatch = normalized.match(spokenChapterVerseRegex);
  if (spokenMatch) {
    const rawBook = spokenMatch[1].trim();
    const book = findBibleBook(rawBook);
    const chapterNum = wordsToNumber(spokenMatch[2]);
    const verseNum = wordsToNumber(spokenMatch[3]);
    const endVerseNum = spokenMatch[4] ? wordsToNumber(spokenMatch[4]) : verseNum;

    if (book && chapterNum && verseNum) {
      const ref = endVerseNum && endVerseNum !== verseNum
        ? `${book.name} ${chapterNum}:${verseNum}-${endVerseNum}`
        : `${book.name} ${chapterNum}:${verseNum}`;

      return {
        bookName: book.name,
        bookId: book.id,
        testament: book.testament,
        chapter: chapterNum,
        startVerse: verseNum,
        endVerse: endVerseNum,
        reference: ref,
        confidence: 0.90,
        matchedText: spokenMatch[0],
      };
    }
  }

  // 3. Spoken numbers without colon: "Book X Y" e.g., "John 3 16" or "Romans 8 28"
  const spokenNoColonRegex = /\b((?:[1-3]\s+)?[a-zA-Z]+)\s+(\d+)\s+(\d+)\b/i;
  const noColonMatch = normalized.match(spokenNoColonRegex);
  if (noColonMatch) {
    const rawBook = noColonMatch[1].trim();
    const book = findBibleBook(rawBook);
    if (book) {
      const chapter = parseInt(noColonMatch[2], 10);
      const startVerse = parseInt(noColonMatch[3], 10);
      if (chapter <= book.chapters && startVerse <= 180) {
        return {
          bookName: book.name,
          bookId: book.id,
          testament: book.testament,
          chapter,
          startVerse,
          endVerse: startVerse,
          reference: `${book.name} ${chapter}:${startVerse}`,
          confidence: 0.75,
          matchedText: noColonMatch[0],
        };
      }
    }
  }

  // 4. Chapter-only pattern (e.g. "Psalm 23", "Psalm chapter 23", "Genesis chapter 1", "turn to 1 Corinthians 13")
  const chapterOnlyRegex = /\b(?:read|turn\s+to|look\s+at|in)?\s*((?:[1-3]\s+)?[a-zA-Z\s]+?)\s+(?:chapter\s+)?(\d+|[a-zA-Z]+)\b/i;
  const chapterMatch = normalized.match(chapterOnlyRegex);
  if (chapterMatch) {
    const rawBook = chapterMatch[1].trim();
    const book = findBibleBook(rawBook);
    const chapterNum = wordsToNumber(chapterMatch[2]);
    if (book && chapterNum && chapterNum <= book.chapters) {
      // Avoid matching random single words unless it is clearly a book mention
      return {
        bookName: book.name,
        bookId: book.id,
        testament: book.testament,
        chapter: chapterNum,
        startVerse: 1,
        endVerse: 1,
        reference: `${book.name} ${chapterNum}`,
        confidence: 0.65,
        matchedText: chapterMatch[0],
      };
    }
  }

  return null;
}

export default detectScripture;
