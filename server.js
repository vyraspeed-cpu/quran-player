const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');

try { require('dotenv').config(); } catch {}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const DOMAIN = process.env.DOMAIN || '';
const AUDIO_BASE_URL = process.env.AUDIO_BASE_URL || '';

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`);
    }
  });
  next();
});

// Helper to fetch a URL following redirects
function fetchWithRedirects(url, res, redirectCount = 0) {
  if (redirectCount > 5) return res.status(500).send('Too many redirects');
  https.get(url, (cdnRes) => {
    console.log(`CDN response for ${url}: ${cdnRes.statusCode}`);
    if (cdnRes.statusCode === 301 || cdnRes.statusCode === 302 || cdnRes.statusCode === 307 || cdnRes.statusCode === 308) {
      const location = cdnRes.headers.location;
      console.log(`Redirecting to: ${location}`);
      cdnRes.resume();
      fetchWithRedirects(location, res, redirectCount + 1);
    } else if (cdnRes.statusCode === 200) {
      res.setHeader('Content-Type', 'font/ttf');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      cdnRes.pipe(res);
    } else {
      res.status(cdnRes.statusCode).send('CDN error');
    }
  }).on('error', (err) => {
    console.error('Font fetch error:', err.message);
    res.status(500).send('Font proxy failed');
  });
}

// Font proxy — MUST be before express.static
const FONT_MAP = {
  'Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf':
    'https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf',
  'MaterialCommunityIcons.6e435534bd35da5fef04168860a9b8fa.ttf':
    'https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf',
};

app.get('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/:filename', (req, res) => {
  const filename = req.params.filename;
  const cdnUrl = FONT_MAP[filename];
  if (!cdnUrl) return res.status(404).send('Font not found');
  console.log(`Proxying font: ${filename}`);
  fetchWithRedirects(cdnUrl, res);
});

app.get('/api/config', (req, res) => {
  res.json({ audioBaseUrl: AUDIO_BASE_URL });
});

app.get('/api/audio-files', (req, res) => {
  res.json({ files: {}, count: 0 });
});

const distDir = path.join(__dirname, 'dist');
const hasWebBuild = fs.existsSync(path.join(distDir, 'index.html'));

if (hasWebBuild) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Quran Player server running on port ${PORT}`);
  console.log(`Audio Base URL: ${AUDIO_BASE_URL || '(not set)'}`);
  if (DOMAIN) console.log(`Domain: ${DOMAIN}`);
  if (hasWebBuild) console.log('Serving web app from dist/');
});
