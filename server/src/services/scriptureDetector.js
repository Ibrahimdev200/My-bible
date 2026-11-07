const { bibleService } = require('./bibleService');
const engine = require('./scriptureEngine');

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

class ScriptureDetector {
  /**
   * Checks if detection should be debounced.
   */
  isDebounced(churchId, reference) {
    const key = `${churchId || 'default'}:${reference.toLowerCase()}`;
    const lastDetected = recentDetections.get(key);
    return Boolean(lastDetected && Date.now() - lastDetected < DEBOUNCE_TIME_MS);
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
   * Builds the verse-structure + quotation index once the Bible database is available.
   */
  ensureEngine() {
    if (engine.isIndexReady()) return true;
    if (!bibleService.isAvailable()) return false;
    try {
      engine.buildStructure(bibleService);
      engine.buildIndex(bibleService);
      return true;
    } catch (err) {
      console.error('[ScriptureEngine] failed to build index:', err.message);
      return false;
    }
  }

  /**
   * Method 1: Reference detection (strict book names, number words, validated against the Bible).
   */
  detectReferencePatterns(speechText) {
    if (!speechText || typeof speechText !== 'string') return [];
    this.ensureEngine();
    return engine.extractReferences(speechText);
  }

  /**
   * Method 2: Quotation detection (IDF-weighted inverted index over every verse of every translation).
   */
  detectQuotation(speechText) {
    if (!speechText || typeof speechText !== 'string') return null;
    if (!this.ensureEngine()) return null;
    return engine.matchQuote(bibleService, speechText);
  }

  /**
   * Main entry point: reference first (the pastor named it), then quotation.
   * Applies per-church debouncing so the same verse is not pushed repeatedly.
   */
  detectScripture(speechText, options = {}) {
    const { churchId = 'default', ignoreDebounce = false } = options;

    if (!speechText || typeof speechText !== 'string' || speechText.trim().length === 0) {
      return null;
    }

    let match = null;
    const refs = this.detectReferencePatterns(speechText);
    if (refs.length > 0) {
      // highest confidence wins; if tied, the reference mentioned last wins
      match = refs.sort((a, b) => b.confidence - a.confidence || b.position - a.position)[0];
    } else {
      match = this.detectQuotation(speechText);
    }
    if (!match) return null;

    if (!ignoreDebounce && this.isDebounced(churchId, match.reference)) {
      return { ...match, debounced: true };
    }
    this.recordDetection(churchId, match.reference);
    return match;
  }
}

// Export singleton
const scriptureDetector = new ScriptureDetector();

module.exports = {
  scriptureDetector,
  ScriptureDetector
};
