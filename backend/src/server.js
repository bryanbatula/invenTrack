require('dotenv').config();
const express = require('express');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const setCors = (res, origin) => {
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
};

app.use((req, res, next) => {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  next();
});

app.options('*', (req, res) => {
  setCors(res, req.headers.origin);
  res.status(204).send('');
});

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/inventory',   require('./routes/inventory'));
app.use('/api/procurement', require('./routes/procurement'));
app.use('/api/suppliers',   require('./routes/suppliers'));
app.use('/api/reports',     require('./routes/reports'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
