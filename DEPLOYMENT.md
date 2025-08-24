# Deployment Guide

This guide covers deploying ConstructPro Manager to various platforms including Vercel, Heroku, and traditional web servers.

## 🚀 Quick Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account (free tier available)
- Repository pushed to GitHub

### One-Click Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/MSMITH71910/constructpro_manager)

### Manual Vercel Deployment

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from project root:**
   ```bash
   vercel --prod
   ```

### Vercel Configuration

Create a `vercel.json` file in your project root:

```json
{
  "version": 2,
  "name": "constructpro-manager",
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    },
    {
      "src": "src/renderer/**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/src/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/src/renderer/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Environment Variables on Vercel

Set the following environment variables in your Vercel dashboard:

```
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-secure-secret-key
```

## 🌐 Alternative Deployment Options

### Heroku Deployment

1. **Install Heroku CLI and login:**
   ```bash
   npm install -g heroku
   heroku login
   ```

2. **Create Heroku app:**
   ```bash
   heroku create constructpro-manager
   ```

3. **Add Heroku Procfile:**
   ```
   web: node src/server.js
   ```

4. **Set environment variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=your-secure-secret-key
   ```

5. **Deploy:**
   ```bash
   git push heroku main
   ```

### Netlify Deployment

1. **Build command:** `npm run build`
2. **Publish directory:** `dist` or `build`
3. **Environment variables:**
   ```
   NODE_ENV=production
   ```

### Traditional Web Server (Apache/Nginx)

1. **Build the project:**
   ```bash
   npm install --production
   ```

2. **Create systemd service file** (`/etc/systemd/system/constructpro.service`):
   ```ini
   [Unit]
   Description=ConstructPro Manager
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/constructpro
   ExecStart=/usr/bin/node src/server.js
   Restart=always
   Environment=NODE_ENV=production
   Environment=PORT=3000

   [Install]
   WantedBy=multi-user.target
   ```

3. **Nginx configuration:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🔧 Production Configuration

### Environment Variables

Set these environment variables for production:

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-very-secure-secret-key-change-this
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Security Headers

Add security headers to your deployment:

```javascript
// In server.js
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

### Performance Optimization

1. **Enable gzip compression:**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

2. **Static file caching:**
   ```javascript
   app.use(express.static('src/renderer', {
     maxAge: '1d'
   }));
   ```

3. **Minify assets** (add to package.json):
   ```json
   {
     "scripts": {
       "build": "npm run minify:css && npm run minify:js",
       "minify:css": "cleancss -o dist/styles.min.css src/renderer/styles/*.css",
       "minify:js": "terser src/renderer/app.js -o dist/app.min.js"
     }
   }
   ```

## 📊 Monitoring & Analytics

### Error Tracking

1. **Install Sentry:**
   ```bash
   npm install @sentry/node
   ```

2. **Configure in server.js:**
   ```javascript
   const Sentry = require('@sentry/node');
   Sentry.init({ dsn: 'your-sentry-dsn' });
   ```

### Performance Monitoring

Add performance monitoring tools:
- New Relic
- DataDog
- Application Insights (Azure)

## 🔒 SSL/HTTPS Configuration

### Let's Encrypt (Certbot)

```bash
sudo certbot --nginx -d yourdomain.com
```

### Cloudflare SSL

1. Add your domain to Cloudflare
2. Update nameservers
3. Enable "Always Use HTTPS"
4. Set SSL/TLS encryption mode to "Full (strict)"

## 🚀 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test
      
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        vercel-args: '--prod'
```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["node", "src/server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  constructpro:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SESSION_SECRET=your-secret-key
    restart: unless-stopped
```

## 📱 Mobile App Deployment

### Progressive Web App (PWA)

Add to `index.html`:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#007bff">
```

Create `manifest.json`:

```json
{
  "name": "ConstructPro Manager",
  "short_name": "ConstructPro",
  "description": "Construction Management Solution",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#007bff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

## 🔍 Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   lsof -ti:3000 | xargs kill
   ```

2. **Memory issues on small servers:**
   ```javascript
   // Increase Node.js memory limit
   node --max-old-space-size=1024 src/server.js
   ```

3. **Static file serving issues:**
   - Check file paths are correct
   - Verify MIME types are set properly
   - Ensure permissions are correct

### Health Checks

Add a health check endpoint:

```javascript
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## 📞 Support

For deployment issues:
1. Check the logs for error messages
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed
4. Contact support with specific error details

---

*Happy deploying! 🚀*