require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { customAlphabet } = require('nanoid');

const app = express();

// Configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const STORAGE_DIR = process.env.STORAGE_DIR || 'uploads';
const MAX_FILE_SIZE_MB = process.env.MAX_FILE_SIZE_MB ? parseInt(process.env.MAX_FILE_SIZE_MB, 10) : 1024; // 1GB default
const DEFAULT_EXPIRY_HOURS = process.env.DEFAULT_EXPIRY_HOURS ? parseInt(process.env.DEFAULT_EXPIRY_HOURS, 10) : 72;

// Ensure storage dir exists
fs.mkdirSync(STORAGE_DIR, { recursive: true });

// Simple in-memory index persisted to JSON file
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function readDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

let fileIndex = readDb();

// Nanoid for short IDs
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, STORAGE_DIR);
  },
  filename: function (req, file, cb) {
    const id = nanoid();
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Home page: upload form
app.get('/', (req, res) => {
  res.render('index', {
    maxFileSizeMb: MAX_FILE_SIZE_MB,
    defaultExpiryHours: DEFAULT_EXPIRY_HOURS,
  });
});

// Handle upload
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  const originalName = req.file.originalname;
  const storedFilename = req.file.filename;
  const id = path.parse(storedFilename).name; // nanoid we prefixed

  const sizeBytes = req.file.size;
  const mimeType = req.file.mimetype;
  const now = Date.now();
  const expiryHours = Number.isFinite(parseInt(req.body.expiry_hours, 10)) ? parseInt(req.body.expiry_hours, 10) : DEFAULT_EXPIRY_HOURS;
  const expiresAt = now + expiryHours * 60 * 60 * 1000;

  fileIndex[id] = {
    id,
    originalName,
    storedFilename,
    sizeBytes,
    mimeType,
    uploadedAt: now,
    expiresAt,
    downloads: 0,
  };
  writeDb(fileIndex);

  const link = `${BASE_URL}/f/${id}`;
  res.render('uploaded', { id, link, originalName, sizeBytes, expiresAt });
});

// Share/download page
app.get('/f/:id', (req, res) => {
  const id = req.params.id;
  const meta = fileIndex[id];
  if (!meta) return res.status(404).render('notfound');
  if (meta.expiresAt && Date.now() > meta.expiresAt) {
    return res.status(410).render('expired');
  }
  res.render('file', { meta, downloadUrl: `${BASE_URL}/d/${id}` });
});

// Direct download
app.get('/d/:id', (req, res) => {
  const id = req.params.id;
  const meta = fileIndex[id];
  if (!meta) return res.status(404).render('notfound');
  if (meta.expiresAt && Date.now() > meta.expiresAt) {
    return res.status(410).render('expired');
  }
  const filePath = path.join(STORAGE_DIR, meta.storedFilename);
  if (!fs.existsSync(filePath)) return res.status(404).render('notfound');
  fileIndex[id].downloads += 1;
  writeDb(fileIndex);
  res.download(filePath, meta.originalName);
});

// Cleanup endpoint (manual)
app.post('/admin/cleanup', (req, res) => {
  let removed = 0;
  const now = Date.now();
  for (const id of Object.keys(fileIndex)) {
    const meta = fileIndex[id];
    if (meta.expiresAt && now > meta.expiresAt) {
      try {
        const filePath = path.join(STORAGE_DIR, meta.storedFilename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}
      delete fileIndex[id];
      removed++;
    }
  }
  writeDb(fileIndex);
  res.json({ removed });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).render('notfound');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on ${BASE_URL}`);
});

// Periodic cleanup of expired files (every 15 minutes)
function cleanupExpiredFiles() {
  const now = Date.now();
  let removed = 0;
  for (const id of Object.keys(fileIndex)) {
    const meta = fileIndex[id];
    if (meta.expiresAt && now > meta.expiresAt) {
      try {
        const filePath = path.join(STORAGE_DIR, meta.storedFilename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}
      delete fileIndex[id];
      removed++;
    }
  }
  if (removed > 0) {
    writeDb(fileIndex);
    console.log(`Cleanup removed ${removed} expired file(s).`);
  }
}

setInterval(cleanupExpiredFiles, 15 * 60 * 1000);

