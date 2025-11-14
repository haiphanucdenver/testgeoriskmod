#!/bin/bash

# GeoRisk Deployment Script for LightSail
# This script sets up systemd services and deploys the latest code

set -e

echo "================================"
echo "GeoRisk Deployment Script"
echo "================================"
echo ""

# Configuration - UPDATE THESE VALUES FOR YOUR SERVER
PROJECT_DIR="/home/bitnami/my-app"
CURRENT_USER=$(whoami)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running on LightSail
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}Warning: Expected project directory not found at $PROJECT_DIR${NC}"
    read -p "Enter the correct project directory path: " PROJECT_DIR
fi

echo -e "${GREEN}Step 1: Pulling latest code from GitHub${NC}"
cd "$PROJECT_DIR"
git pull

echo ""
echo -e "${GREEN}Step 2: Installing dependencies${NC}"
echo "Installing Python dependencies..."
pip3 install -r requirements.txt
echo "Installing Node dependencies..."
npm install

echo ""
echo -e "${GREEN}Step 3: Building frontend${NC}"
npm run build

echo ""
echo -e "${GREEN}Step 4: Deploying frontend to Apache${NC}"
sudo rm -rf /opt/bitnami/apache/htdocs/*
sudo cp -r build/* /opt/bitnami/apache/htdocs/

echo ""
echo -e "${GREEN}Step 5: Installing 'serve' for production static file serving${NC}"
sudo npm install -g serve

echo ""
echo -e "${GREEN}Step 6: Setting up systemd services${NC}"

# Update service files with correct paths
sed -i "s|/home/bitnami/GeoRiskModTest|$PROJECT_DIR|g" deployment/georisk-api.service
sed -i "s|/home/bitnami/GeoRiskModTest|$PROJECT_DIR|g" deployment/georisk-frontend.service

# Copy service files to systemd directory
sudo cp deployment/georisk-api.service /etc/systemd/system/
sudo cp deployment/georisk-frontend.service /etc/systemd/system/

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable services to start on boot
sudo systemctl enable georisk-api.service
sudo systemctl enable georisk-frontend.service

echo ""
echo -e "${GREEN}Step 7: Restarting Apache${NC}"
sudo /opt/bitnami/ctlscript.sh restart apache

echo ""
echo -e "${GREEN}Step 8: Starting systemd services${NC}"
sudo systemctl restart georisk-api.service
sudo systemctl restart georisk-frontend.service

echo ""
echo -e "${GREEN}Step 9: Checking service status${NC}"
echo ""
echo "API Service Status:"
sudo systemctl status georisk-api.service --no-pager -l

echo ""
echo "Frontend Service Status:"
sudo systemctl status georisk-frontend.service --no-pager -l

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Services are now running and will auto-start on server reboot."
echo ""
echo "Useful commands:"
echo "  sudo systemctl status georisk-api       # Check API status"
echo "  sudo systemctl status georisk-frontend  # Check frontend status"
echo "  sudo systemctl restart georisk-api      # Restart API"
echo "  sudo systemctl restart georisk-frontend # Restart frontend"
echo "  sudo journalctl -u georisk-api -f       # View API logs"
echo "  sudo journalctl -u georisk-frontend -f  # View frontend logs"
echo ""
