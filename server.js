const express = require('express');
const path = require('path');
const fs = require('fs');

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

app.get('/api/config', (req, res) => {
  res.json({ audioBaseUrl: AUDIO_BASE_URL });
});

app.get('/api/audio-files', (req, res) => {
  res.json({ files: {}, count: 0 });
});

const distDir = path.join(__dirname, 'dist');
const hasWebBuild = fs.existsSync(path.join(distDir, 'index.html'));

if (hasWebBuild) {
  const fontsDir = path.join(distDir, 'fonts');

  app.use('/fonts', express.static(fontsDir, {
    setHeaders: (res) => {
      res.setHeader('Content-Type', 'font/ttf');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }));

  const fontMap = {};
  if (fs.existsSync(fontsDir)) {
    fs.readdirSync(fontsDir).forEach(f => {
      fontMap[f.replace('.ttf', '').toLowerCase()] = path.join(fontsDir, f);
    });
  }

  app.get('*.ttf', (req, res) => {
    const reqPath = decodeURIComponent(req.path);
    const basename = path.basename(reqPath, '.ttf').replace(/\.[a-f0-9]+$/, '').toLowerCase();
    const fontFile = fontMap[basename];
    if (fontFile && fs.existsSync(fontFile)) {
      res.setHeader('Content-Type', 'font/ttf');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.sendFile(fontFile);
    }
    res.status(404).end();
  });

  app.use(express.static(distDir, {
    setHeaders: (res, filePath) => {
      if (filePath.match(/\.(js|css|png|jpg|ico)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    if (req.path.match(/\.(ttf|woff|woff2|eot|svg|png|jpg|gif|mp3|mp4)$/)) {
      return res.status(404).end();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Quran Player server running on port ${PORT}`);
  console.log(`Audio Base URL: ${AUDIO_BASE_URL || '(not set - using local fallback)'}`);
  if (DOMAIN) console.log(`Domain: ${DOMAIN}`);
  if (hasWebBuild) console.log('Serving web app from dist/');
});
