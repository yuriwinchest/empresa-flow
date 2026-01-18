# scripts/optimize_server.ps1
$key = "$HOME\.ssh\empresa-flow-key"
$target = "root@72.61.133.214"
$configFile = "ataticagestao_optimized.conf"

Write-Host "--- 1. UPLOADING OPTIMIZED NGINX CONFIG ---"
# Upload to conf.d
scp -i $key -o StrictHostKeyChecking=no $configFile "${target}:/etc/nginx/conf.d/ataticagestao.conf"

Write-Host "--- 2. EXECUTING SERVER OPTIMIZATION (USER & SECURITY) ---"
$script = @"
# 1. Create nodeapp user if not exists
if ! id "nodeapp" &>/dev/null; then
    echo "Creating nodeapp user..."
    useradd -m -s /bin/bash nodeapp
fi

# 2. Fix permissions
echo "Updating permissions for /var/www/empresa-flow..."
chown -R nodeapp:nodeapp /var/www/empresa-flow
# Allow Nginx (www-data) to read files (others read/execute)
chmod -R 755 /var/www/empresa-flow

# 3. Migrate PM2 from root to nodeapp
echo "Migrating PM2 processes..."
# Stop root PM2
pm2 stop all
pm2 delete all
pm2 save --force
pm2 kill

# Start PM2 as nodeapp
echo "Starting application as nodeapp..."
sudo -u nodeapp bash -c 'cd /var/www/empresa-flow && pm2 start server.js --name empresa-flow && pm2 save'

# Setup Startup for nodeapp
# We need to run the startup command as root, but generating it for nodeapp
echo "Setting up PM2 startup..."
env PATH=`$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u nodeapp --hp /home/nodeapp
# The above command enables it. We just need to save.
sudo -u nodeapp pm2 save

# 4. Restart Nginx to apply new config
echo "Restarting Nginx..."
nginx -t && systemctl restart nginx

echo "✅ Optimization Complete!"
"@

ssh -n -i $key -o StrictHostKeyChecking=no $target $script
