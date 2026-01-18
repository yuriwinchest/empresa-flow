# scripts/deploy_full_stack.ps1
$key = "$HOME\.ssh\empresa-flow-key"
$target = "root@72.61.133.214"
$remotePath = "/var/www/empresa-flow"

Write-Host "--- 1. PACKAGING APP ---"
# Create a temporary directory for packaging
if (Test-Path "temp_deploy") { Remove-Item -Recurse -Force "temp_deploy" }
New-Item -ItemType Directory -Path "temp_deploy" | Out-Null

# Copy necessary files
Copy-Item "server.js" "temp_deploy\"
Copy-Item "package.json" "temp_deploy\"
Copy-Item "package-lock.json" "temp_deploy\"
Copy-Item -Recurse "dist" "temp_deploy\"
Copy-Item -Recurse "scripts" "temp_deploy\"

# Create tarball
tar -czf app.tar -C temp_deploy .

# Cleanup temp dir
Remove-Item -Recurse -Force "temp_deploy"

Write-Host "--- 2. UPLOADING TO VPS ---"
scp -i $key -o StrictHostKeyChecking=no app.tar "${target}:/root/app.tar"

Write-Host "--- 3. DEPLOYING ON VPS ---"
$deployCmd = @"
# Stop service
pm2 stop empresa-flow || true

# Backup old dist if exists
mkdir -p $remotePath/backup
if [ -d "$remotePath/dist" ]; then
    mv $remotePath/dist $remotePath/backup/dist_`$(date +%s)
fi

# Ensure directory exists
mkdir -p $remotePath

# Extract files
tar -xzf /root/app.tar -C $remotePath

# Install dependencies (only production)
cd $remotePath
npm install --production

# Fix permissions
chown -R root:root $remotePath
chmod -R 755 $remotePath

# Update Nginx Static Files (Site)
# We copy dist to /var/www/ataticagestao if that's where nginx serves static files from, 
# BUT based on our previous fix, Nginx proxies root / to localhost:3005 (Node).
# So Node (server.js) is serving static files from 'dist'. 
# We just need to make sure server.js is doing that.
# (Checking server.js... Yes, it usually does app.use(express.static('dist')))

# Restart Service on Port 3005
PORT=3005 pm2 restart empresa-flow --update-env

# Cleanup
rm /root/app.tar
"@

ssh -n -i $key -o StrictHostKeyChecking=no $target $deployCmd

Write-Host "✅ FULL DEPLOY COMPLETED!"
