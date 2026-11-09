const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.resolve(__dirname, '../../uploads/logos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const churchId = req.church ? req.church.id : 'unknown';
    const timestamp = Date.now();
    cb(null, `${churchId}-${timestamp}${ext}`);
  }
});

// File filter: accept only jpg, jpeg, png, gif, webp
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG, GIF, and WEBP images are allowed.'), false);
  }
};

const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10); // 5MB default

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter
});

/**
 * PUT /api/church/profile
 * Update church profile
 */
router.put(
  '/profile',
  authMiddleware,
  [
    body('name').optional().trim(),
    body('churchName').optional().trim(),
    body('pastorName').optional().trim(),
    body('phone').optional().trim(),
    body('country').optional().trim(),
    body('state').optional().trim(),
    body('address').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, churchName, pastorName, phone, country, state, address } = req.body;
      const church = req.church;

      const candidateName = churchName !== undefined && churchName !== '' ? churchName : name;
      if (candidateName !== undefined && candidateName.trim()) {
        church.name = candidateName.trim();
      }
      if (pastorName !== undefined) church.pastorName = pastorName;
      if (phone !== undefined) church.phone = phone;
      if (country !== undefined) church.country = country;
      if (state !== undefined) church.state = state;
      if (address !== undefined) church.address = address;

      await church.save();

      const churchData = church.toJSON();
      churchData.churchName = church.name;

      return res.status(200).json({
        message: 'Church profile updated successfully',
        church: churchData
      });
    } catch (error) {
      console.error('Update church profile error:', error);
      return res.status(500).json({ error: 'Failed to update church profile.' });
    }
  }
);

/**
 * POST /api/church/logo
 * Upload church logo (multipart form)
 */
router.post('/logo', authMiddleware, (req, res) => {
  upload.single('logo')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds limit of 5MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No logo file provided. Use field name "logo".' });
    }

    try {
      const church = req.church;

      // Delete old logo file if it exists and is local
      if (church.logoPath && church.logoPath.startsWith('/uploads/logos/')) {
        const oldFileName = path.basename(church.logoPath);
        const oldFilePath = path.join(uploadDir, oldFileName);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (e) {
            console.warn('Could not delete old logo file:', e.message);
          }
        }
      }

      const logoUrl = `/uploads/logos/${req.file.filename}`;
      church.logoPath = logoUrl;
      await church.save();

      return res.status(200).json({
        message: 'Logo uploaded successfully',
        logoUrl
      });
    } catch (error) {
      console.error('Save church logo error:', error);
      return res.status(500).json({ error: 'Failed to save uploaded logo.' });
    }
  });
});

/**
 * PUT /api/church/branding
 * Update branding config
 */
router.put('/branding', authMiddleware, async (req, res) => {
  try {
    const church = req.church;
    const currentBranding = church.brandingConfig || {
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6',
      backgroundColor: '#0f172a',
      textColor: '#ffffff',
      template: 'classic',
      displayDuration: 15,
      fontSize: 'large'
    };

    const {
      primaryColor,
      secondaryColor,
      backgroundColor,
      textColor,
      template,
      displayDuration,
      fontSize
    } = req.body;

    const updatedBranding = {
      ...currentBranding,
      ...(primaryColor !== undefined && { primaryColor }),
      ...(secondaryColor !== undefined && { secondaryColor }),
      ...(backgroundColor !== undefined && { backgroundColor }),
      ...(textColor !== undefined && { textColor }),
      ...(template !== undefined && { template }),
      ...(displayDuration !== undefined && {
        displayDuration: Number.isFinite(parseInt(displayDuration, 10)) ? parseInt(displayDuration, 10) : 15
      }),
      ...(fontSize !== undefined && { fontSize })
    };

    church.brandingConfig = updatedBranding;
    // Tell sequelize JSON field has changed
    church.changed('brandingConfig', true);
    await church.save();

    return res.status(200).json({
      message: 'Branding config updated successfully',
      branding: church.brandingConfig
    });
  } catch (error) {
    console.error('Update branding error:', error);
    return res.status(500).json({ error: 'Failed to update branding configuration.' });
  }
});

/**
 * GET /api/church/branding
 * Get branding config
 */
router.get('/branding', authMiddleware, async (req, res) => {
  try {
    const branding = req.church.brandingConfig || {
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6',
      backgroundColor: '#0f172a',
      textColor: '#ffffff',
      template: 'classic',
      displayDuration: 15,
      fontSize: 'large'
    };

    return res.status(200).json({ branding });
  } catch (error) {
    console.error('Get branding error:', error);
    return res.status(500).json({ error: 'Failed to retrieve branding configuration.' });
  }
});

/**
 * PUT /api/church/translation
 * Change selected translation (KJV, WEB, ASV, YLT)
 */
router.put(
  '/translation',
  authMiddleware,
  [
    body('translation')
      .trim()
      .notEmpty()
      .withMessage('Translation is required')
      .custom((value) => {
        const allowed = ['KJV', 'WEB', 'ASV', 'YLT', 'ESV', 'NIV', 'NKJV', 'NLT'];
        if (!allowed.includes(value.toUpperCase())) {
          throw new Error(`Unsupported translation. Supported: ${allowed.join(', ')}`);
        }
        return true;
      })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const translation = req.body.translation.toUpperCase();
      const church = req.church;

      church.selectedTranslation = translation;
      await church.save();

      return res.status(200).json({
        message: 'Translation updated successfully',
        translation: church.selectedTranslation
      });
    } catch (error) {
      console.error('Update translation error:', error);
      return res.status(500).json({ error: 'Failed to update selected translation.' });
    }
  }
);

module.exports = router;
