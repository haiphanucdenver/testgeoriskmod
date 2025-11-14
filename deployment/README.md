# GeoRisk LightSail Deployment Guide

This guide will help you set up automatic startup for both the frontend and API server on your AWS LightSail instance.

## Overview

This deployment sets up:

### Frontend Deployment (Apache)
- **Primary**: React frontend served via Bitnami Apache (port 80/443)
- Build files copied to `/opt/bitnami/apache/htdocs/`
- Managed via `/opt/bitnami/ctlscript.sh`

### Backend Service (systemd)
- **georisk-api.service** - Python FastAPI server (port 8001)
- Auto-starts on server boot
- Auto-restarts if it crashes
- Logs to systemd journal

### Optional: Frontend Service (systemd - for port 5173)
- **georisk-frontend.service** - Alternative React frontend via `serve` (port 5173)
- Can be used for testing or development alongside Apache
- Not required if using Apache deployment

## Prerequisites

Before deploying, ensure your LightSail server has:
- Python 3 installed
- Node.js and npm installed
- Git configured with access to your repository
- PostgreSQL running (for the API database)

## Quick Deploy (Automated)

1. **SSH into your LightSail server:**
   ```bash
   ssh bitnami@your-lightsail-ip
   ```

2. **Navigate to your project directory:**
   ```bash
   cd /home/bitnami/my-app
   ```

3. **Pull the latest deployment files:**
   ```bash
   git pull
   ```

4. **Make the deploy script executable:**
   ```bash
   chmod +x deployment/deploy.sh
   ```

5. **Run the deployment script:**
   ```bash
   ./deployment/deploy.sh
   ```

The script will:
- Pull latest code
- Install dependencies
- Build the frontend
- Deploy frontend to Apache htdocs
- Restart Apache
- Install and configure systemd services
- Start both API and frontend services

## Manual Setup (Step by Step)

If you prefer to set up manually or need to customize:

### 1. Update Service Files

Edit `deployment/georisk-api.service` and `deployment/georisk-frontend.service` if your paths differ:
- Default project path: `/home/bitnami/my-app`
- Default user: `bitnami`
- Update Python path if needed (`which python3`)
- Update Node path if needed (`which node`)

### 2. Copy Service Files

```bash
sudo cp deployment/georisk-api.service /etc/systemd/system/
sudo cp deployment/georisk-frontend.service /etc/systemd/system/
```

### 3. Reload Systemd

```bash
sudo systemctl daemon-reload
```

### 4. Enable Services (Auto-start on Boot)

```bash
sudo systemctl enable georisk-api.service
sudo systemctl enable georisk-frontend.service
```

### 5. Start Services

```bash
sudo systemctl start georisk-api.service
sudo systemctl start georisk-frontend.service
```

### 6. Check Status

```bash
sudo systemctl status georisk-api.service
sudo systemctl status georisk-frontend.service
```

## Service Management Commands

### Check Status
```bash
sudo systemctl status georisk-api
sudo systemctl status georisk-frontend
```

### Start/Stop/Restart
```bash
sudo systemctl start georisk-api
sudo systemctl stop georisk-api
sudo systemctl restart georisk-api

sudo systemctl start georisk-frontend
sudo systemctl stop georisk-frontend
sudo systemctl restart georisk-frontend
```

### View Logs
```bash
# View recent logs
sudo journalctl -u georisk-api -n 100
sudo journalctl -u georisk-frontend -n 100

# Follow logs in real-time
sudo journalctl -u georisk-api -f
sudo journalctl -u georisk-frontend -f
```

### Disable Auto-start
```bash
sudo systemctl disable georisk-api
sudo systemctl disable georisk-frontend
```

## Deploying Code Updates

When you have new code to deploy:

```bash
cd /home/bitnami/my-app

# Pull latest code
git pull

# Install any new dependencies
npm install

# Rebuild frontend
npm run build

# Deploy to Apache
sudo rm -rf /opt/bitnami/apache/htdocs/*
sudo cp -r build/* /opt/bitnami/apache/htdocs/

# Restart Apache
sudo /opt/bitnami/ctlscript.sh restart apache

# Restart API service to pick up changes
sudo systemctl restart georisk-api
```

Or simply run the deploy script again:
```bash
./deployment/deploy.sh
```

This will handle all steps including Apache deployment and service restarts.

## Troubleshooting

### Services Won't Start

1. **Check service status for errors:**
   ```bash
   sudo systemctl status georisk-api
   ```

2. **View detailed logs:**
   ```bash
   sudo journalctl -u georisk-api -n 50
   ```

3. **Common issues:**
   - Wrong project path in service file
   - Wrong user/group in service file
   - Missing dependencies (run `npm install`)
   - Port already in use
   - Database not running

### API Can't Connect to Database

Check that PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

Verify database credentials in your environment or configuration files.

### Frontend Not Serving Latest Changes

Make sure you rebuilt and deployed to Apache:
```bash
npm run build
sudo rm -rf /opt/bitnami/apache/htdocs/*
sudo cp -r build/* /opt/bitnami/apache/htdocs/
sudo /opt/bitnami/ctlscript.sh restart apache
```

### Apache Not Starting

Check Apache status and logs:
```bash
sudo /opt/bitnami/ctlscript.sh status apache
sudo tail -f /opt/bitnami/apache/logs/error_log
```

### Check Port Usage

```bash
sudo lsof -i :5173  # Frontend
sudo lsof -i :8001  # API
```

## Environment Variables

If you need to add environment variables (e.g., for database credentials, API keys):

1. **Create an environment file:**
   ```bash
   sudo nano /etc/georisk/api.env
   ```

2. **Add variables:**
   ```
   DATABASE_HOST=localhost
   DATABASE_USER=your_user
   DATABASE_PASSWORD=your_password
   MAPBOX_API_KEY=your_key
   ```

3. **Update the service file** to load the environment:
   ```bash
   sudo nano /etc/systemd/system/georisk-api.service
   ```

   Add under `[Service]`:
   ```
   EnvironmentFile=/etc/georisk/api.env
   ```

4. **Reload and restart:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart georisk-api
   ```

## Security Notes

- Services run with limited permissions (NoNewPrivileges=true)
- Services use private temporary directories
- For production, consider:
  - Running behind nginx reverse proxy
  - Setting up SSL/TLS certificates
  - Configuring firewall rules
  - Setting up log rotation

## Testing the Deployment

After deployment, test your application:

1. **Check if Apache is serving the frontend:**
   ```bash
   curl http://localhost  # Apache frontend
   sudo /opt/bitnami/ctlscript.sh status apache
   ```

2. **Check if API is running:**
   ```bash
   curl http://localhost:8001/health  # API (if you have a health endpoint)
   sudo systemctl status georisk-api
   ```

3. **Test from your browser:**
   - Navigate to `http://your-lightsail-ip` (Apache serves on port 80)
   - Try submitting data from H, L, or V cards
   - Check if data saves to database

4. **Test after reboot:**
   ```bash
   sudo reboot
   ```

   After server restarts, verify services are running:
   ```bash
   sudo /opt/bitnami/ctlscript.sh status apache
   sudo systemctl status georisk-api
   ```

## Support

If you encounter issues:
1. Check service status and logs
2. Verify all paths in service files are correct
3. Ensure all dependencies are installed
4. Check database connectivity
5. Verify firewall/security group settings allow traffic on ports 5173 and 8001
