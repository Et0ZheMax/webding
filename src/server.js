require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('./db');

const apiRouter = require('./routes/api');

const app = express();
const port = Number(process.env.PORT) || 3000;
const corsOrigin = process.env.CORS_ORIGIN || `http://localhost:${port}`;

fs.mkdirSync(path.join(process.cwd(), 'uploads'), { recursive: true });

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://www.openstreetmap.org', 'https://tile.openstreetmap.org'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        frameSrc: ["'self'", 'https://www.openstreetmap.org'],
      },
    },
  }),
);

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '400kb' }));
app.use(express.urlencoded({ extended: true, limit: '400kb' }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api', apiRouter);
app.use(express.static(path.join(process.cwd(), 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[server-error]', err.message);
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: 'Что-то пошло не так. Попробуйте позже.' });
});

app.listen(port, () => {
  console.log(`Wedding app listening on http://localhost:${port}`);
});
