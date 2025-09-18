# Deployment Guide - FilewAle Clone

This guide will help you deploy the FilewAle clone to various platforms.

## Local Development

### Quick Start
```bash
# Clone and setup
git clone <repository-url>
cd filewale-clone

# Install dependencies
npm install

# Start the server
npm start
# or
./start.sh
```

The application will be available at `http://localhost:3000`

## Production Deployment

### Environment Variables
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# File Upload Configuration
MAX_FILE_SIZE=104857600  # 100MB in bytes
UPLOAD_DIR=./public/uploads

# CORS Configuration
CORS_ORIGIN=*  # Set to your domain in production

# Security
SESSION_SECRET=your-secret-key-here
```

### Using PM2 (Recommended for VPS)

1. **Install PM2**
   ```bash
   npm install -g pm2
   ```

2. **Create ecosystem file** (`ecosystem.config.js`):
   ```javascript
   module.exports = {
     apps: [{
       name: 'filewale-clone',
       script: './backend/server.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'development',
         PORT: 3000
       },
       env_production: {
         NODE_ENV: 'production',
         PORT: 3000
       }
     }]
   }
   ```

3. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

### Using Docker

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   
   RUN mkdir -p public/uploads
   
   EXPOSE 3000
   
   USER node
   
   CMD ["npm", "start"]
   ```

2. **Create docker-compose.yml**:
   ```yaml
   version: '3.8'
   services:
     filewale:
       build: .
       ports:
         - "3000:3000"
       volumes:
         - ./uploads:/app/public/uploads
       environment:
         - NODE_ENV=production
         - PORT=3000
       restart: unless-stopped
   ```

3. **Deploy**:
   ```bash
   docker-compose up -d
   ```

### Nginx Reverse Proxy

Create `/etc/nginx/sites-available/filewale`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # File upload size limit
    client_max_body_size 100M;

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

    # Static files
    location /public/ {
        alias /path/to/filewale-clone/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/filewale /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Cloud Deployments

### Heroku

1. **Create Procfile**:
   ```
   web: node backend/server.js
   ```

2. **Deploy**:
   ```bash
   heroku create your-app-name
   git push heroku main
   ```

### Vercel

1. **Create vercel.json**:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "backend/server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "backend/server.js"
       }
     ]
   }
   ```

2. **Deploy**:
   ```bash
   npm i -g vercel
   vercel
   ```

### Railway

1. **Create railway.json**:
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm start"
     }
   }
   ```

2. **Deploy**: Connect your GitHub repository to Railway

### DigitalOcean App Platform

1. **Create .do/app.yaml**:
   ```yaml
   name: filewale-clone
   services:
   - name: web
     source_dir: /
     github:
       repo: your-username/filewale-clone
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     http_port: 3000
     routes:
     - path: /
   ```

## Security Considerations

### Production Checklist

- [ ] Set up HTTPS/SSL
- [ ] Configure proper CORS origins
- [ ] Implement rate limiting
- [ ] Set up file type validation
- [ ] Configure file size limits
- [ ] Set up monitoring and logging
- [ ] Regular security updates
- [ ] Backup uploaded files
- [ ] Set up firewall rules
- [ ] Use environment variables for secrets

### Rate Limiting

Add to your server:

```javascript
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 uploads per windowMs
  message: 'Too many upload attempts, please try again later.'
});

app.use('/api/upload', uploadLimiter);
```

### File Security

```javascript
const path = require('path');

// Validate file extensions
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};
```

## Monitoring

### Log Files
```bash
# PM2 logs
pm2 logs

# System logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Health Check Endpoint

Add to your server:
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## Backup Strategy

### Database Backup (if using database)
```bash
# MongoDB
mongodump --host localhost --db filewale --out backup/

# PostgreSQL
pg_dump filewale > backup/filewale.sql
```

### File Backup
```bash
# Sync uploads to S3
aws s3 sync ./public/uploads s3://your-bucket/uploads/

# Local backup
rsync -av ./public/uploads/ /backup/uploads/
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   lsof -i :3000
   kill -9 <PID>
   ```

2. **Permission denied for uploads**
   ```bash
   chmod 755 public/uploads
   chown -R www-data:www-data public/uploads
   ```

3. **File size too large**
   - Check nginx `client_max_body_size`
   - Check Node.js `MAX_FILE_SIZE`
   - Check system disk space

4. **Memory issues**
   - Monitor with `htop`
   - Increase swap space
   - Use PM2 cluster mode

### Performance Optimization

1. **Enable gzip compression**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

2. **Serve static files with nginx**
   ```nginx
   location /public/ {
     alias /path/to/public/;
     expires 1y;
   }
   ```

3. **Use CDN for static assets**
   - CloudFlare
   - AWS CloudFront
   - MaxCDN

## Support

For deployment issues:
1. Check the logs
2. Verify environment variables
3. Test locally first
4. Check firewall settings
5. Verify DNS configuration

---

**Note**: Always test deployments in a staging environment first!