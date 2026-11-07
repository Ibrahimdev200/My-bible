const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { ScriptureHistory, sequelize } = require('../models');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/scripture/history?limit=50&offset=0
 * Get paginated scripture history for current church
 */
router.get(
  '/history',
  authMiddleware,
  [
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const { count, rows } = await ScriptureHistory.findAndCountAll({
        where: { churchId: req.church.id },
        order: [['detectedAt', 'DESC']],
        limit,
        offset
      });

      const formattedRows = rows.map((r) => {
        const json = r.toJSON();
        return {
          ...json,
          text: json.verseText,
          spokenText: json.speechText,
          timestamp: json.detectedAt
        };
      });

      return res.status(200).json({
        total: count,
        limit,
        offset,
        history: formattedRows
      });
    } catch (error) {
      console.error('Get history error:', error);
      return res.status(500).json({ error: 'Failed to retrieve scripture history.' });
    }
  }
);

/**
 * POST /api/scripture/history
 * Save a detected scripture
 */
router.post(
  '/history',
  authMiddleware,
  (req, res, next) => {
    if (req.body) {
      if (!req.body.verseText && req.body.text) {
        req.body.verseText = String(req.body.text);
      }
      if (!req.body.speechText && req.body.spokenText) {
        req.body.speechText = String(req.body.spokenText);
      }
    }
    next();
  },
  [
    body('reference').trim().notEmpty().withMessage('Scripture reference is required'),
    body('verseText').trim().notEmpty().withMessage('Verse text is required'),
    body('translation').optional().trim(),
    body('speechText').optional({ nullable: true }).trim(),
    body('confidence').optional({ nullable: true }).isFloat({ min: 0, max: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { reference, translation, verseText, speechText, confidence } = req.body;

      const newEntry = await ScriptureHistory.create({
        churchId: req.church.id,
        reference,
        translation: (translation || req.church.selectedTranslation || 'KJV').toUpperCase(),
        verseText,
        speechText: speechText || null,
        confidence: confidence !== undefined ? parseFloat(confidence) : 1.0,
        detectedAt: new Date()
      });

      return res.status(201).json({
        message: 'Scripture history recorded successfully',
        scripture: newEntry
      });
    } catch (error) {
      console.error('Save history error:', error);
      return res.status(500).json({ error: 'Failed to record scripture history.' });
    }
  }
);

/**
 * GET /api/scripture/history/export
 * Export church's scripture history as downloadable JSON
 */
router.get('/history/export', authMiddleware, async (req, res) => {
  try {
    const history = await ScriptureHistory.findAll({
      where: { churchId: req.church.id },
      order: [['detectedAt', 'DESC']]
    });

    const exportData = {
      church: {
        id: req.church.id,
        name: req.church.name
      },
      exportedAt: new Date().toISOString(),
      totalRecords: history.length,
      history: history.map((h) => ({
        id: h.id,
        reference: h.reference,
        translation: h.translation,
        verseText: h.verseText,
        speechText: h.speechText,
        confidence: h.confidence,
        detectedAt: h.detectedAt
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="scripture-history-${req.church.id}-${Date.now()}.json"`
    );

    return res.status(200).send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    console.error('Export history error:', error);
    return res.status(500).json({ error: 'Failed to export scripture history.' });
  }
});

/**
 * DELETE /api/scripture/history/:id
 * Delete a history entry
 */
router.delete(
  '/history/:id',
  authMiddleware,
  [param('id').isUUID().withMessage('Valid history entry UUID required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      const entry = await ScriptureHistory.findOne({
        where: { id, churchId: req.church.id }
      });

      if (!entry) {
        return res.status(404).json({ error: 'Scripture history entry not found.' });
      }

      await entry.destroy();

      return res.status(200).json({
        message: 'Scripture history entry deleted successfully',
        deletedId: id
      });
    } catch (error) {
      console.error('Delete history error:', error);
      return res.status(500).json({ error: 'Failed to delete scripture history entry.' });
    }
  }
);

/**
 * GET /api/scripture/history/stats
 * Get stats (total count, today's count, most referenced)
 */
router.get('/history/stats', authMiddleware, async (req, res) => {
  try {
    const churchId = req.church.id;

    // Total count
    const totalCount = await ScriptureHistory.count({
      where: { churchId }
    });

    // Today's count (from midnight)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayCount = await ScriptureHistory.count({
      where: {
        churchId,
        detectedAt: {
          [Op.gte]: startOfToday
        }
      }
    });

    // Most referenced scriptures
    const allRecords = await ScriptureHistory.findAll({
      where: { churchId },
      attributes: ['reference', 'translation']
    });

    // Compute frequency counts in JS for guaranteed dialect compatibility (PG & SQLite)
    const refCounts = {};
    const transCounts = {};

    for (const item of allRecords) {
      refCounts[item.reference] = (refCounts[item.reference] || 0) + 1;
      transCounts[item.translation] = (transCounts[item.translation] || 0) + 1;
    }

    const mostReferenced = Object.entries(refCounts)
      .map(([reference, count]) => ({ reference, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const translationsBreakdown = Object.entries(transCounts)
      .map(([translation, count]) => ({ translation, count }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      totalCount,
      todayCount,
      mostReferenced,
      translationsBreakdown
    });
  } catch (error) {
    console.error('Get history stats error:', error);
    return res.status(500).json({ error: 'Failed to retrieve scripture statistics.' });
  }
});

module.exports = router;
