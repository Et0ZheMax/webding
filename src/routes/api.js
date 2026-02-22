const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const archiver = require('archiver');
const rateLimit = require('express-rate-limit');
const { run, all } = require('../db');
const { sanitizeText, parsePositiveInt } = require('../utils');
const { issueSession, requireUploadAuth } = require('../middleware/authUpload');

const router = express.Router();

const allowedMime = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'video/mp4',
  'video/quicktime',
]);

const imageMime = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

const maxFileSize = (Number(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024;
const maxFiles = Number(process.env.MAX_FILES_PER_UPLOAD) || 12;

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много загрузок, попробуйте позже.' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSize,
    files: maxFiles,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) {
      return cb(new Error('Неподдерживаемый формат файла.'));
    }
    return cb(null, true);
  },
});

router.post('/rsvp', async (req, res, next) => {
  try {
    const name = sanitizeText(req.body.name, 80);
    const attendance = sanitizeText(req.body.attendance, 20);
    const guestCount = parsePositiveInt(req.body.guestCount, 1);
    const foodPreference = sanitizeText(req.body.foodPreference, 100);
    const alcoholPreference = sanitizeText(req.body.alcoholPreference, 100);
    const comment = sanitizeText(req.body.comment, 500);

    if (!name || !['yes', 'no'].includes(attendance)) {
      return res.status(400).json({ error: 'Проверьте обязательные поля RSVP.' });
    }

    await run(
      `INSERT INTO rsvp(name, attendance, guest_count, food_preference, alcohol_preference, comment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, attendance, guestCount, foodPreference, alcoholPreference, comment],
    );

    return res.json({ ok: true, name });
  } catch (error) {
    return next(error);
  }
});

router.post('/upload/access', async (req, res, next) => {
  try {
    const code = sanitizeText(req.body.code, 40);
    if (!code || code !== process.env.UPLOAD_ACCESS_CODE) {
      return res.status(401).json({ error: 'Неверный код доступа.' });
    }
    await issueSession(res);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/upload/media', requireUploadAuth, async (req, res, next) => {
  try {
    const month = sanitizeText(req.query.month || '', 20);
    const day = sanitizeText(req.query.day || '', 20);
    const params = [];
    let where = 'WHERE 1=1';
    if (month) {
      where += ' AND month_key = ?';
      params.push(month);
    }
    if (day) {
      where += ' AND day_key = ?';
      params.push(day);
    }

    const rows = await all(
      `SELECT id, guest_name, original_name, mime, size, month_key, day_key, relative_path, preview_path, created_at
       FROM media_uploads ${where}
       ORDER BY datetime(created_at) DESC`,
      params,
    );

    return res.json({ items: rows });
  } catch (error) {
    return next(error);
  }
});

router.post('/upload/files', requireUploadAuth, uploadLimiter, upload.array('media', maxFiles), async (req, res, next) => {
  try {
    if (req.body.website) {
      return res.status(400).json({ error: 'Похоже на спам.' });
    }

    const guestName = sanitizeText(req.body.guestName, 80);
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ error: 'Выберите файлы для загрузки.' });
    }

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dayKey = now.toISOString().slice(0, 10);
    const targetDir = path.join(process.cwd(), 'uploads', monthKey);
    const previewDir = path.join(targetDir, 'previews');
    fs.mkdirSync(previewDir, { recursive: true });

    const saved = [];
    for (const file of files) {
      const ext = path.extname(file.originalname) || (file.mimetype.includes('video') ? '.mp4' : '.jpg');
      const storedName = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}${ext.toLowerCase()}`;
      const absolutePath = path.join(targetDir, storedName);
      fs.writeFileSync(absolutePath, file.buffer);

      let previewPath = null;
      if (imageMime.has(file.mimetype)) {
        const previewName = `preview-${storedName.replace(/\.[^.]+$/, '.webp')}`;
        const absolutePreview = path.join(previewDir, previewName);
        await sharp(file.buffer)
          .rotate()
          .resize({ width: 640, height: 640, fit: 'inside' })
          .webp({ quality: 78 })
          .toFile(absolutePreview);
        previewPath = path.join('uploads', monthKey, 'previews', previewName).replace(/\\/g, '/');
      }

      const relativePath = path.join('uploads', monthKey, storedName).replace(/\\/g, '/');
      await run(
        `INSERT INTO media_uploads(guest_name, stored_name, original_name, mime, size, month_key, day_key, relative_path, preview_path, ip)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [guestName, storedName, sanitizeText(file.originalname, 140), file.mimetype, file.size, monthKey, dayKey, relativePath, previewPath, req.ip],
      );

      saved.push({ originalName: file.originalname, path: relativePath });
    }

    return res.json({ ok: true, saved });
  } catch (error) {
    return next(error);
  }
});

router.get('/upload/download.zip', requireUploadAuth, async (req, res, next) => {
  try {
    const rows = await all('SELECT original_name, relative_path FROM media_uploads ORDER BY datetime(created_at) DESC');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="wedding-media.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => next(err));
    archive.pipe(res);

    rows.forEach((item) => {
      const abs = path.join(process.cwd(), item.relative_path);
      if (fs.existsSync(abs)) {
        archive.file(abs, { name: item.original_name });
      }
    });

    await archive.finalize();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
