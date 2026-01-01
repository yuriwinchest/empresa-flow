#!/bin/bash
set -e
echo "--- DEPLOYING APP ---"

# 1. Install Unzip
dnf -y install unzip

# 2. Extract
mkdir -p /var/www/empresa-flow
unzip -o /root/app.zip -d /var/www/empresa-flow
cd /var/www/empresa-flow

# 3. Install Deps
echo "Installing Dependencies..."
npm install

# 4. Build
echo "Building Project..."
# Ensure tsc is available (devDependencies)
npm run build

# 5. Serve
echo "Starting PM2..."
pm2 delete empresa-flow || true
# Serving the 'dist' folder as an SPA on port 3001
pm2 serve dist 3001 --spa --name "empresa-flow"
pm2 save
pm2 startup | tail -n 1 | bash || true

echo "APP_DEPLOY_SUCCESS"
