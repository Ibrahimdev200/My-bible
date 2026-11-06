const stringSimilarity = require('string-similarity');
const { bibleService, CANONICAL_BOOKS } = require('./bibleService');

// Debounce cache: key -> timestamp (ms)
const recentDetections = new Map();
const DEBOUNCE_TIME_MS = 30000; // 30 seconds

// Periodic cleanup of stale debounce entries
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentDetections.entries()) {
    if (now - timestamp > 60000) {
      recentDetections.delete(key);
    }
  }
}, 30000).unref();

// Stopwords for quotation keyword extraction
const STOP_WORDS = new Set([
  'the', 'and', 'that', 'this', 'with', 'have', 'from', 'they', 'will', 'would',
  'there', 'their', 'what', 'about', 'which', 'when', 'make', 'like', 'time', 'just',
  'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
  'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
  'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
  'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day',
  'most', 'us', 'are', 'was', 'were', 'been', 'being', 'shall', 'should', 'cannot'
]);

// Famous scripture quotations for reliable fallback matching
const FAMOUS_VERSES = [
  {
    reference: 'John 3:16',
    bookName: 'John',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'
  },
  {
    reference: 'Psalm 23:1',
    bookName: 'Psalms',
    chapter: 23,
    startVerse: 1,
    endVerse: 1,
    text: 'The Lord is my shepherd; I shall not want.'
  },
  {
    reference: 'Romans 8:28',
    bookName: 'Romans',
    chapter: 8,
    startVerse: 28,
    endVerse: 28,
    text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.'
  },
  {
    reference: 'Philippians 4:13',
    bookName: 'Philippians',
    chapter: 4,
    startVerse: 13,
    endVerse: 13,
    text: 'I can do all things through Christ which strengtheneth me.'
  },
  {
    reference: 'Jeremiah 29:11',
    bookName: 'Jeremiah',
    chapter: 29,
    startVerse: 11,
    endVerse: 11,
    text: 'For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil, to give you an expected end.'
  },
  {
    reference: 'Proverbs 3:5-6',
    bookName: 'Proverbs',
    chapter: 3,
    startVerse: 5,
    endVerse: 6,
    text: 'Trust in the Lord with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.'
  },
  {
    reference: 'Genesis 1:1',
    bookName: 'Genesis',
    chapter: 1,
    startVerse: 1,
    endVerse: 1,
    text: 'In the beginning God created the heaven and the earth.'
  },
  {
    reference: '1 Corinthians 13:4',
    bookName: '1 Corinthians',
    chapter: 13,
    startVerse: 4,
    endVerse: 4,
    text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up.'
  },
  {
    reference: 'Matthew 28:19',
    bookName: 'Matthew',
    chapter: 28,
    startVerse: 19,
    endVerse: 19,
    text: 'Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost.'
  },
  {
    reference: 'Isaiah 40:31',
    bookName: 'Isaiah',
    chapter: 40,
    startVerse: 31,
    endVerse: 31,
    text: 'But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.'
  }
];

class ScriptureDetector {
  /**
   * Cleans text for comparison
   */
  cleanText(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Checks if detection should be debounced.
   */
  isDebounced(churchId, reference) {
    const key = `${churchId || 'default'}:${reference.toLowerCase()}`;
    const lastDetected = recentDetections.get(key);
    const now = Date.now();

    if (lastDetected && now - lastDetected < DEBOUNCE_TIME_MS) {
      return true;
    }
    return false;
  }

  /**
   * Records a detected reference in the debounce cache.
   */
  recordDetection(churchId, reference) {
    const key = `${churchId || 'default'}:${reference.toLowerCase()}`;
    recentDetections.set(key, Date.now());
  }

  /**
   * Clears the debounce cache (useful for testing or manual reset).
   */
  clearDebounce(churchId) {
    if (!churchId) {
      recentDetections.clear();
      return;
    }
    for (const key of recentDetections.keys()) {
      if (key.startsWith(`${churchId}:`)) {
        recentDetections.delete(key);
      }
    }
  }

  /**
   * Method 1: Reference Pattern Detection
   * Uses regex patterns to find Bible references in spoken speech text.
   */
  detectReferencePatterns(speechText) {
    if (!speechText || typeof speechText !== 'string') return [];

    const results = [];
    const text = speechText.trim();

    // Pattern 1: Spoken reference with cues
    // e.g. "turn with me to John chapter 3 verse 16", "open your Bible to Psalm 42",
    // "In the book of Romans, chapter 8, verse 28", "Second Timothy chapter 3 verses 16 and 17"
    const spokenRegex = /(?:(?:turn\s+(?:with\s+me\s+)?to|open\s+(?:your\s+)?(?:bible[s]?\s+)?to|read(?:ing)?(?:\s+from)?|look\s+at|let'?s\s+read|in\s+the\s+book\s+of|the\s+book\s+of|book\s+of)\s+)?\b((?:(?:first|second|third|1st|2nd|3rd|1|2|3|i|ii|iii)\s+)?[a-zA-Z]+(?:\s+of\s+[a-zA-Z]+)?)\s*,?\s*(?:chapter\s+)?(\d+)(?:\s*(?:,|from)?\s*verse[s]?\s*(\d+)(?:\s*(?:-|–|through|to|and)\s*(?:verse\s*)?(\d+))?|(?::\s*(\d+)(?:\s*(?:-|–|through|to|and)\s*(\d+))?)|(?:\s+(\d+)(?:\s*-\s*(\d+))?))?\b/gi;

    let match;
    while ((match = spokenRegex.exec(text)) !== null) {
      const matchedText = match[0].trim();
      const rawBook = match[1].trim();

      // Validate book name against Bible canonical books
      const book = bibleService.findBookByName(rawBook);
      if (!book) {
        continue;
      }

      const chapter = parseInt(match[2], 10);
      if (isNaN(chapter) || chapter < 1 || (book.chapters && chapter > book.chapters)) {
        continue;
      }

      // Check verse captures:
      // Group 3 & 4: "verse X [to/and/through Y]"
      // Group 5 & 6: ": X [- Y]"
      // Group 7 & 8: " X [- Y]" (space separated)
      let startVerse = null;
      let endVerse = null;

      if (match[3]) {
        startVerse = parseInt(match[3], 10);
        endVerse = match[4] ? parseInt(match[4], 10) : startVerse;
      } else if (match[5]) {
        startVerse = parseInt(match[5], 10);
        endVerse = match[6] ? parseInt(match[6], 10) : startVerse;
      } else if (match[7] && !matchedText.toLowerCase().includes('chapter')) {
        // Space separated verse only if reasonable
        startVerse = parseInt(match[7], 10);
        endVerse = match[8] ? parseInt(match[8], 10) : startVerse;
      }

      // Format reference string
      let reference = `${book.name} ${chapter}`;
      if (startVerse !== null) {
        reference += `:${startVerse}`;
        if (endVerse !== null && endVerse !== startVerse) {
          reference += `-${endVerse}`;
        }
      }

      // Calculate confidence score
      let confidence = 0.85;
      const lowerMatch = matchedText.toLowerCase();

      if (startVerse !== null) {
        confidence = 0.95;
      }
      if (
        lowerMatch.includes('turn') ||
        lowerMatch.includes('open') ||
        lowerMatch.includes('read') ||
        lowerMatch.includes('book of') ||
        lowerMatch.includes('chapter')
      ) {
        confidence = Math.min(confidence + 0.04, 0.99);
      }

      results.push({
        reference,
        bookName: book.name,
        chapter,
        startVerse: startVerse || null,
        endVerse: endVerse || null,
        confidence,
        method: 'reference',
        matchedText
      });
    }

    // Pattern 2: Standard written references e.g. "John 3:16", "Matt 5:3-10", "1 Cor 13:1-8"
    const writtenRegex = /\b((?:(?:1|2|3|i|ii|iii|1st|2nd|3rd|first|second|third)\s+)?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+)[:\.](\d+)(?:\s*(?:-|–|to)\s*(\d+))?\b/g;

    while ((match = writtenRegex.exec(text)) !== null) {
      const matchedText = match[0].trim();
      const rawBook = match[1].trim();
      const book = bibleService.findBookByName(rawBook);
      if (!book) continue;

      const chapter = parseInt(match[2], 10);
      const startVerse = parseInt(match[3], 10);
      const endVerse = match[4] ? parseInt(match[4], 10) : startVerse;

      let reference = `${book.name} ${chapter}:${startVerse}`;
      if (endVerse !== startVerse) {
        reference += `-${endVerse}`;
      }

      // Avoid duplicates from Pattern 1
      if (!results.some((r) => r.reference === reference)) {
        results.push({
          reference,
          bookName: book.name,
          chapter,
          startVerse,
          endVerse,
          confidence: 0.96,
          method: 'reference',
          matchedText
        });
      }
    }

    return results;
  }

  /**
   * Method 2: Quotation Detection
   * Uses string-similarity to match spoken text chunks against Bible verses.
   */
  detectQuotation(speechText, translation = 'KJV') {
    if (!speechText || typeof speechText !== 'string') return null;

    const cleanInput = this.cleanText(speechText);
    const words = cleanInput.split(/\s+/).filter(Boolean);
    if (words.length < 4) {
      // Too short to reliably match a verse quotation
      return null;
    }

    // Use last 50-100 words of speech
    const speechChunk = words.slice(-80).join(' ');

    let candidates = [];

    // 1. Search database if available
    if (bibleService.isAvailable()) {
      try {
        // Extract meaningful keywords (length >= 4, not stopword)
        const keywords = words
          .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
          .slice(-10);

        if (keywords.length > 0) {
          // Use up to 3 most distinctive keywords
          for (const kw of keywords.slice(0, 3)) {
            const dbResults = bibleService.searchVerses(kw, translation, 15);
            for (const r of dbResults) {
              if (!candidates.some((c) => c.book_id === r.book_id && c.chapter === r.chapter && c.verse === r.verse)) {
                candidates.push({
                  reference: `${r.book_name} ${r.chapter}:${r.verse}`,
                  bookName: r.book_name,
                  chapter: r.chapter,
                  startVerse: r.verse,
                  endVerse: r.verse,
                  text: r.text
                });
              }
            }
          }
        }
      } catch (err) {
        // Fallback to famous verses
      }
    }

    // Merge famous verses as fallback / high-priority candidates
    for (const fv of FAMOUS_VERSES) {
      if (!candidates.some((c) => c.reference === fv.reference)) {
        candidates.push(fv);
      }
    }

    let bestMatch = null;
    let highestSimilarity = 0;
    let bestMatchedChunk = '';

    for (const candidate of candidates) {
      const cleanVerse = this.cleanText(candidate.text);
      const verseWords = cleanVerse.split(/\s+/);

      // Compare full chunk with verse
      let similarity = stringSimilarity.compareTwoStrings(speechChunk, cleanVerse);

      // Also sliding window similarity if speech chunk is longer than verse
      if (words.length > verseWords.length) {
        const windowSize = Math.max(verseWords.length, 5);
        for (let i = 0; i <= words.length - windowSize; i += 2) {
          const windowText = words.slice(i, i + windowSize).join(' ');
          const windowSim = stringSimilarity.compareTwoStrings(windowText, cleanVerse);
          if (windowSim > similarity) {
            similarity = windowSim;
            bestMatchedChunk = windowText;
          }
        }
      } else {
        bestMatchedChunk = speechChunk;
      }

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = {
          reference: candidate.reference,
          bookName: candidate.bookName,
          chapter: candidate.chapter,
          startVerse: candidate.startVerse,
          endVerse: candidate.endVerse,
          confidence: Math.round(similarity * 100) / 100,
          method: 'quotation',
          matchedText: bestMatchedChunk || candidate.text,
          verseText: candidate.text
        };
      }
    }

    // Must be above 0.6 similarity threshold
    if (bestMatch && highestSimilarity >= 0.6) {
      return bestMatch;
    }

    return null;
  }

  /**
   * Main entry point to detect scriptures from transcribed speech text.
   * Runs pattern detection first, falls back to quotation detection.
   * Applies debouncing logic.
   */
  detectScripture(speechText, options = {}) {
    const { churchId = 'default', translation = 'KJV', ignoreDebounce = false } = options;

    if (!speechText || typeof speechText !== 'string' || speechText.trim().length === 0) {
      return null;
    }

    // 1. Method 1: Reference Pattern Detection
    const patternMatches = this.detectReferencePatterns(speechText);
    if (patternMatches.length > 0) {
      // Pick the highest confidence match
      const topMatch = patternMatches.sort((a, b) => b.confidence - a.confidence)[0];

      if (!ignoreDebounce && this.isDebounced(churchId, topMatch.reference)) {
        return {
          ...topMatch,
          debounced: true
        };
      }

      this.recordDetection(churchId, topMatch.reference);
      return topMatch;
    }

    // 2. Method 2: Quotation Detection
    const quotationMatch = this.detectQuotation(speechText, translation);
    if (quotationMatch) {
      if (!ignoreDebounce && this.isDebounced(churchId, quotationMatch.reference)) {
        return {
          ...quotationMatch,
          debounced: true
        };
      }

      this.recordDetection(churchId, quotationMatch.reference);
      return quotationMatch;
    }

    return null;
  }
}

// Export singleton
const scriptureDetector = new ScriptureDetector();

module.exports = {
  scriptureDetector,
  ScriptureDetector
};
