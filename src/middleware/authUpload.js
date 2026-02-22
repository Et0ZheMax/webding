const crypto = require('crypto');
const { all, run } = require('../db');

const COOKIE_NAME = 'upload_session';

async function issueSession(res) {
  const token = crypto.randomBytes(24).toString('hex');
  await run('INSERT INTO upload_sessions(token) VALUES(?)', [token]);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 5,
  });
}

async function requireUploadAuth(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: 'Требуется секретный код.' });
    }
    const rows = await all('SELECT id FROM upload_sessions WHERE token = ?', [token]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Сессия доступа истекла.' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { issueSession, requireUploadAuth };
