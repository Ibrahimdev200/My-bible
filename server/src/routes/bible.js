const express = require('express');
const { query, param, body, validationResult } = require('express-validator');
const { bibleService } = require('../services/bibleService');
const { scriptureDetector } = require('../services/scriptureDetector');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * Middleware to ensure the Bible database is available
 */
function checkBibleDb(req, res, next) {
  if (!bibleService.isAvailable()) {
    // Try reloading in case the import script just finished
    if (bibleService.reloadDatabase()) {
      return next();
    }
    return res.status(503).json({
      error: 'Bible database is not available. Please run the Bible import script first (npm run import-bible).'
    });
  }
  next();
}

/**
 * GET /api/bible/books?testament=OT|NT
 * Get books, optionally filtered by testament (OT or NT)
 */
router.get(
  '/books',
  authMiddleware.optional,
  [
    query('testament')
      .optional()
      .isIn(['OT', 'NT', 'ot', 'nt'])
      .withMessage('Testament must be either OT or NT')
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const testament = req.query.testament ? req.query.testament.toUpperCase() : null;
      const books = bibleService.getBooks(testament);

      return res.status(200).json({
        total: books.length,
        testament: testament || 'ALL',
        books
      });
    } catch (error) {
      console.error('Get books error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch Bible books.' });
    }
  }
);

/**
 * GET /api/bible/translations
 * Get available translations
 */
  router.get('/translations', authMiddleware.optional, (req, res) => {
    try {
      const translations = bibleService.getTranslations();
      return res.status(200).json({
        translations,
        default: req.church ? req.church.selectedTranslation : 'KJV'
      });
    } catch (error) {
      console.error('Get translations error:', error);
      return res.status(500).json({ error: 'Failed to fetch Bible translations.' });
    }
  });

  /**
   * GET /api/bible/books/:bookId/chapters
   * Get chapter list for a book
   */
  router.get(
    '/books/:bookId/chapters',
    authMiddleware.optional,
    [param('bookId').notEmpty().withMessage('bookId is required')],
    (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { bookId } = req.params;
        const book = bibleService.getBook(bookId);

        if (!book) {
          return res.status(404).json({ error: `Book '${bookId}' not found.` });
        }

        const chapters = bibleService.getChapters(book.id);

        return res.status(200).json({
          book: {
            id: book.id,
            name: book.name,
            abbr: book.abbr,
            testament: book.testament
          },
          totalChapters: chapters.length,
          chapters
        });
      } catch (error) {
        console.error('Get chapters error:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch chapters.' });
      }
    }
  );

  /**
   * GET /api/bible/books/:bookId/chapters/:chapter?translation=KJV
   * Get all verses in chapter
   */
  router.get(
    '/books/:bookId/chapters/:chapter',
    authMiddleware.optional,
    checkBibleDb,
    [
      param('bookId').notEmpty().withMessage('bookId is required'),
      param('chapter').isInt({ min: 1 }).withMessage('chapter must be a positive integer'),
      query('translation').optional().isString()
    ],
    (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { bookId, chapter } = req.params;
        const translation = (req.query.translation || (req.church ? req.church.selectedTranslation : 'KJV')).toUpperCase();

        const book = bibleService.getBook(bookId);
        if (!book) {
          return res.status(404).json({ error: `Book '${bookId}' not found.` });
        }

        const verses = bibleService.getVerses(book.id, parseInt(chapter, 10), translation);

        return res.status(200).json({
          book: {
            id: book.id,
            name: book.name,
            testament: book.testament
          },
          chapter: parseInt(chapter, 10),
          translation,
          totalVerses: verses.length,
          verses
        });
      } catch (error) {
        console.error('Get chapter verses error:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch chapter verses.' });
      }
    }
  );

  /**
   * GET /api/bible/verse/:bookId/:chapter/:verse?translation=KJV
   * Get single verse
   */
  router.get(
    '/verse/:bookId/:chapter/:verse',
    authMiddleware.optional,
    checkBibleDb,
    [
      param('bookId').notEmpty().withMessage('bookId is required'),
      param('chapter').isInt({ min: 1 }).withMessage('chapter must be a positive integer'),
      param('verse').isInt({ min: 1 }).withMessage('verse must be a positive integer'),
      query('translation').optional().isString()
    ],
    (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { bookId, chapter, verse } = req.params;
        const translation = (req.query.translation || (req.church ? req.church.selectedTranslation : 'KJV')).toUpperCase();

        const book = bibleService.getBook(bookId);
        if (!book) {
          return res.status(404).json({ error: `Book '${bookId}' not found.` });
        }

        const verseData = bibleService.getVerse(book.id, parseInt(chapter, 10), parseInt(verse, 10), translation);
        if (!verseData) {
          return res.status(404).json({
            error: `Verse not found: ${book.name} ${chapter}:${verse} (${translation})`
          });
        }

        return res.status(200).json({
          verse: verseData
        });
      } catch (error) {
        console.error('Get single verse error:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch verse.' });
      }
    }
  );

  /**
   * GET /api/bible/search?q=query&translation=KJV&limit=20
   * Search verses
   */
  router.get(
    '/search',
    authMiddleware.optional,
    checkBibleDb,
    [
      query('q').trim().notEmpty().withMessage('Search query "q" is required'),
      query('translation').optional().isString(),
      query('limit').optional().isInt({ min: 1, max: 100 })
    ],
    (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const q = req.query.q;
        const translation = (req.query.translation || (req.church ? req.church.selectedTranslation : 'KJV')).toUpperCase();
        const limit = parseInt(req.query.limit || '20', 10);

        const verses = bibleService.searchVerses(q, translation, limit);

        return res.status(200).json({
          query: q,
          translation,
          limit,
          total: verses.length,
          results: verses
        });
      } catch (error) {
        console.error('Search verses error:', error);
        return res.status(500).json({ error: error.message || 'Failed to execute Bible search.' });
      }
    }
  );

  /**
   * GET /api/bible/reference?ref=John+3:16&translation=KJV
   * Parse a reference string and return verses
   */
  router.get(
    '/reference',
    authMiddleware.optional,
    checkBibleDb,
    [
      query('ref').trim().notEmpty().withMessage('Reference parameter "ref" is required'),
      query('translation').optional().isString()
    ],
    (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const ref = req.query.ref;
        const translation = (req.query.translation || (req.church ? req.church.selectedTranslation : 'KJV')).toUpperCase();

        const result = bibleService.getVersesByReference(ref, translation);

        return res.status(200).json(result);
      } catch (error) {
        console.error('Get reference verses error:', error);
        return res.status(400).json({ error: error.message });
      }
    }
  );

  /**
   * POST /api/bible/detect
   * Detect scripture reference or quotation from speech text
   */
  router.post(
    '/detect',
    authMiddleware.optional,
    [body('text').trim().notEmpty().withMessage('Speech text is required')],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { text, ignoreDebounce } = req.body;
        const translation = req.body.translation || (req.church ? req.church.selectedTranslation : 'KJV');

        const detected = scriptureDetector.detectScripture(text, {
          churchId: req.church ? req.church.id : 'public',
          translation,
          ignoreDebounce: Boolean(ignoreDebounce)
        });

        if (!detected) {
          return res.status(200).json({
            detected: false,
            message: 'No scripture reference or quotation detected in speech text.'
          });
        }

        if (detected.debounced) {
          return res.status(200).json({
            detected: false,
            debounced: true,
            reference: detected.reference,
            message: `Scripture ${detected.reference} was recently detected (debounced).`
          });
        }

        // Fetch the full verse text if available
        let verseData = null;
        if (bibleService.isAvailable()) {
          try {
            verseData = bibleService.getVersesByReference(detected.reference, translation);
          } catch (e) { }
        }

        const resolvedText = verseData
          ? verseData.text || verseData.combinedText
          : detected.verseText || '';

        return res.status(200).json({
          detected: true,
          ...detected,
          book: detected.bookName,
          verse: detected.startVerse
            ? detected.endVerse && detected.endVerse !== detected.startVerse
              ? `${detected.startVerse}-${detected.endVerse}`
              : detected.startVerse
            : 1,
          translation: translation.toUpperCase(),
          text: resolvedText,
          verseText: resolvedText,
          fullText: resolvedText,
          verseData: verseData ? verseData.verses : null
        });
      } catch (error) {
        console.error('Detect scripture error:', error);
        return res.status(500).json({ error: error.message || 'Failed to detect scripture.' });
      }
    }
  );

  module.exports = router;
