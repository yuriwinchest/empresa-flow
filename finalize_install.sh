#!/bin/bash
set -e
echo "--- FINALIZING INSTALLATION ---"

# 1. Wait for Supabase API (Port 8000)
echo "Waiting for Supabase Stack to start (this may take time)..."
# Loop for up to 10 minutes
for i in {1..120}; do
    if curl -s http://localhost:8000/rest/v1/ > /dev/null; then
        echo "Supabase API is UP!"
        break
    fi
    echo "Waiting for API... ($i/120)"
    sleep 5
done

# 2. Restore Database
echo "Restoring Data to Supabase DB..."
# Find container name
DB_CTR=$(podman ps --format "{{.Names}}" | grep -E "db" | grep -E "supabase|db_1" | head -n 1)
# Fallback
if [ -z "$DB_CTR" ]; then DB_CTR=$(podman ps --format "{{.Names}}" | grep "_db" | head -n 1); fi

if [ -n "$DB_CTR" ]; then
    echo "Found Container: $DB_CTR"
    # Create role if missing (some dumps rely on it)
    podman exec -i $DB_CTR psql -U postgres -c "CREATE USER postgres_old;" || true
    # Restore
    podman exec -i $DB_CTR pg_restore -U postgres -d postgres --clean --if-exists --no-owner --no-privileges < /root/backup.dump || true
    echo "Data Restored."
else
    echo "ERROR: DB Container not found. Is Supabase running?"
    # Continue to app config anyway or exit?
    # Exit to warn user
    exit 1
fi

# 3. Configure App
echo "Configuring App Environment..."
cd /var/www/empresa-flow
DOMAIN="srv1233855.hstgr.cloud"
# Use Anon Key from Supabase .env (Example key if not changed)
ANON_KEY=$(grep "ANON_KEY=" /root/supabase/.env | cut -d '=' -f2)

# Update .env
sed -i '/VITE_SUPABASE_URL/d' .env
sed -i '/VITE_SUPABASE_ANON_KEY/d' .env
echo "VITE_SUPABASE_URL=http://$DOMAIN:8000" >> .env
echo "VITE_SUPABASE_ANON_KEY=$ANON_KEY" >> .env

# 4. Rebuild App
echo "Rebuilding App (Vite)..."
npm install
npm run build

# 5. Restart PM2 (Port 3001)
echo "Restarting PM2 on Port 3001..."
pm2 delete empresa-flow || true
pm2 serve dist 3001 --spa --name "empresa-flow"
pm2 save

# 6. Firewall Rules (Try iptables)
iptables -I INPUT -p tcp --dport 3001 -j ACCEPT || true
iptables -I INPUT -p tcp --dport 8000 -j ACCEPT || true
# Save
service iptables save || true

echo "FINAL_SUCCESS"
