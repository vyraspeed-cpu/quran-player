const express = require('express');
const path = require('path');
const fs = require('fs');

try { require('dotenv').config(); } catch {}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const DOMAIN = process.env.DOMAIN || '';
const AUDIO_BASE_URL = process.env.AUDIO_BASE_URL || 'https://pub-0110ea35ce894d199dee01a4c041212f.r2.dev/';

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

// Fix: Redirect broken/corrupted font files to CDN
app.get('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/:font', (req, res) => {
  const fontName = req.params.font.split('.')[0]; // e.g. "MaterialCommunityIcons"
  const cdnUrl = `https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/${fontName}.ttf`;
  console.log(`Redirecting font ${fontName} to CDN`);
  res.redirect(301, cdnUrl);
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
  console.log(`Audio Base URL: ${AUDIO_BASE_URL}`);
  if (DOMAIN) console.log(`Domain: ${DOMAIN}`);
  if (hasWebBuild) console.log('Serving web app from dist/');
});