# Quran with Urdu Tarjuma

A Quran Player web app featuring all 114 Surahs with recitation by Mishary Rashid and Urdu translation by Shamshad Ali Khan.

Live: https://app.tilawat.org

---

## Local Development

Test the app locally before deploying:

```bash
bash local-test.sh
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Press `Ctrl+C` to stop.

---

## Deploy to VPS

### 1. Upload to VPS

```bash
scp -r . user@your-vps-ip:/home/user/quran-player/
```

Or use FileZilla / WinSCP.

### 2. Configure

```bash
ssh user@your-vps-ip
cd /home/user/quran-player
cp .env.example .env
nano .env
```

Set your values:

```
PORT=3000
DOMAIN=quran-with-urdu-translation.com
AUDIO_BASE_URL=`https://audio.tilawat.org/`
```

### 3. Install & Start

```bash
npm install
npm start
```

### 4. Keep Running with PM2

```bash
sudo npm install -g pm2
pm2 start server.js --name "quran-player"
pm2 startup
pm2 save
```

### 5. Nginx Reverse Proxy

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/quran-player
```

Paste:

```nginx
server {
    listen 80;
    server_name quran-with-urdu-translation.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/quran-player /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d quran-with-urdu-translation.com
```

---

## Updating the App

After making changes locally:

1. Test locally: `bash local-test.sh`
2. Push to repo: `git add . && git commit -m "update" && git push`
3. On VPS: `git pull && pm2 restart quran-player`

If only `server.js` or `dist/index.html` changed, you can also just copy those files to the VPS and restart.

---

## Folder Structure

```
server.js           - Express web server
package.json        - Dependencies
.env.example        - Config template (copy to .env)
local-test.sh       - Run locally for testing
dist/               - Pre-built web app
  index.html
  fonts/            - Icon fonts (Ionicons, etc.)
  _expo/            - JS bundles
  favicon.ico
```

---

## Audio Files

MP3 files are hosted externally on R2 storage (not bundled in the app). Named `001.mp3` through `114.mp3`.

Base URL: `https://audio.tilawat.org/`

---

## Troubleshooting

**App not loading?**
- Check server: `pm2 status` / `pm2 logs quran-player`
- Make sure port 3000 is open

**Audio not playing?**
- Test: `curl https://audio.tilawat.org/001.mp3`
- Check browser console for errors

**Icons not showing?**
- Check that `dist/fonts/` has Ionicons.ttf, MaterialCommunityIcons.ttf, MaterialIcons.ttf
- Check browser console for font loading errors

**Need to rebuild the web app?**
- You don't need to. The `dist/` folder has the pre-built app
- Just edit `.env` and restart: `pm2 restart quran-player`
