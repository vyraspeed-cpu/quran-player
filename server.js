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

// IMPORTANT: Font proxy MUST come before express.static
// The local .ttf files are corrupt (wrong format), so we proxy from CDN instead
const FONT_CDN_BASE = 'https://unpkg.com/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts';
const FONT_MAP = {
  'Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf': `${FONT_CDN_BASE}/Ionicons.ttf`,
  'MaterialCommunityIcons.6e435534bd35da5fef04168860a9b8fa.ttf': `${FONT_CDN_BASE}/MaterialCommunityIcons.ttf`,
};

app.get('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/:filename', (req, res) => {
  const filename = req.params.filename;
  const cdnUrl = FONT_MAP[filename];
  if (!cdnUrl) return res.status(404).send('Font not found');

  console.log(`Proxying font from CDN: ${filename}`);
  res.setHeader('Content-Type', 'font/ttf');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  https.get(cdnUrl, (cdnRes) => {
    if (cdnRes.statusCode === 301 || cdnRes.statusCode === 302) {
      // Follow redirect
      https.get(cdnRes.headers.location, (redirectRes) => {
        redirectRes.pipe(res);
      }).on('error', (err) => {
        console.error('Font redirect error:', err);
        res.status(500).send('Font proxy failed');
      });
    } else {
      cdnRes.pipe(res);
    }
  }).on('error', (err) => {
    console.error('Font proxy error:', err);
    res.status(500).send('Font proxy failed');
  });
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
  // Static middleware comes AFTER font proxy
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