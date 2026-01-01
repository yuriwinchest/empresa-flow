#!/bin/bash
set -e
echo "--- MIGRATION VIA TUNNEL ---"

# 1. Cleanup & Install
rpm -e pgdg-redhat-repo || true
dnf clean all
dnf -y install podman

# 2. Start PG17 Container (if not running)
if ! podman ps | grep -q pg17; then
    podman rm -f pg17 || true
    echo "Starting PG17..."
    # Using host network to access forwarded port 5433 easier? 
    # Or plain bridge and access host IP '10.0.2.2' or 'host.containers.internal'?
    # Podman 'host.containers.internal' works if configured.
    # Easiest: use --network host for the DB container too?
    # No, keep DB isolated, start a temporary dumper with host networking.
    
    podman run -d --name pg17 --restart always -p 5432:5432 -e POSTGRES_PASSWORD=postgres -v pg_data:/var/lib/postgresql/data docker.io/library/postgres:17
    echo "Waiting for DB..."
    sleep 15
fi

# 3. Migration
echo "Migrating via Tunnel (localhost:5433)..."
R_PASS="TQHjl8jKrOVhgKga"

# Dump Remote (via Tunnel on Host Port 5433)
# We run a temporary podman container attached to HOST network to access localhost:5433
echo "Dumping..."
podman run --rm --network host -e PGPASSWORD=$R_PASS docker.io/library/postgres:17 \
    pg_dump -v -h 127.0.0.1 -p 5433 -U postgres -d postgres --no-owner --no-privileges --clean --if-exists -Fc > /root/backup.dump

echo "Dump Size:"
ls -lh /root/backup.dump

# Restore (to pg17 container)
echo "Restoring..."
# Create DB
podman exec -i pg17 psql -U postgres -c "CREATE DATABASE empresa_flow;" || true
podman exec -i pg17 psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';" || true

# Restore
podman exec -i pg17 pg_restore -v -U postgres -d empresa_flow --no-owner --no-privileges < /root/backup.dump

echo "TUNNEL_MIGRATION_SUCCESS"
