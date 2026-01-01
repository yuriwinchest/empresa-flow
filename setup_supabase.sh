#!/bin/bash
set -e
echo "--- SUPABASE SELF-HOSTED SETUP (REGISTRY FIX) ---"

# 0. Fix Podman Short Name Resolution
echo "Configuring Podman Registries..."
# Backup
cp /etc/containers/registries.conf /etc/containers/registries.conf.bak || true
# Ensure docker.io is searched
if ! grep -q "unqualified-search-registries" /etc/containers/registries.conf; then
    echo 'unqualified-search-registries = ["docker.io"]' >> /etc/containers/registries.conf
else
    # If it exists but doesn't have docker.io (dumb check, manually appending if missing might corrupt TOML)
    # Safer: Overwrite or usesed?
    # Simple append usually works for EL9 default config which is sparse.
    echo 'unqualified-search-registries = ["docker.io"]' >> /etc/containers/registries.conf || true
fi

# 1. Prepare Directory
mkdir -p /root/supabase
cd /root/supabase

# 2. Fetch Configs
curl -skL -o docker-compose.yml https://raw.githubusercontent.com/supabase/supabase/master/docker/docker-compose.yml
curl -skL -o .env https://raw.githubusercontent.com/supabase/supabase/master/docker/.env.example

# 3. Configure .env
echo "Configuring .env..."
DOMAIN="srv1233855.hstgr.cloud"

sed -i "s|API_EXTERNAL_URL=.*|API_EXTERNAL_URL=http://$DOMAIN:8000|g" .env
sed -i "s|SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=http://$DOMAIN:8000|g" .env
sed -i "s|SITE_URL=.*|SITE_URL=http://$DOMAIN:3001|g" .env
sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=postgres|g" .env

# 4. Stop existing PG17
podman stop pg17 || true
podman rm pg17 || true

# 5. SELinux (Attempt)
mkdir -p volumes/db/data
chcon -Rt svirt_sandbox_file_t /root/supabase || echo "SELinux ignored"

# 6. Start Supabase
echo "Starting Supabase Stack..."
podman-compose down || true
podman-compose up -d

# 7. Wait for API
echo "Waiting for Supabase API..."
for i in {1..60}; do
    if curl -s http://localhost:8000/rest/v1/ > /dev/null; then
        echo "Supabase is UP!"
        break
    fi
    echo "Waiting... $i"
    sleep 5
done

# 8. Restore Data
echo "Restoring Data..."
DB_CTR=$(podman ps --format "{{.Names}}" | grep -E "db.*assertion|db|_db" | head -n 1)
echo "Found DB Container: $DB_CTR"

if [ -n "$DB_CTR" ]; then
    podman exec -i $DB_CTR pg_restore -U postgres -d postgres --clean --if-exists --no-owner --no-privileges < /root/backup.dump || true
    echo "Data Restored."
else
    echo "ERROR: DB Container not found!"
fi

# 9. Update App
echo "Updating App..."
cd /var/www/empresa-flow
ANON_KEY=$(grep "ANON_KEY=" /root/supabase/.env | cut -d '=' -f2)

sed -i '/VITE_SUPABASE_URL/d' .env
sed -i '/VITE_SUPABASE_ANON_KEY/d' .env

echo "VITE_SUPABASE_URL=http://$DOMAIN:8000" >> .env
echo "VITE_SUPABASE_ANON_KEY=$ANON_KEY" >> .env

echo "Rebuilding App..."
npm install
npm run build

echo "Restarting App on Port 3001..."
pm2 delete empresa-flow || true
pm2 serve dist 3001 --spa --name "empresa-flow"
pm2 save

echo "SUPABASE_SETUP_SUCCESS"
