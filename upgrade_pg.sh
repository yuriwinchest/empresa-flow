#!/bin/bash
echo "--- UPGRADING TO PG 17 ---"

# Stop 15
systemctl stop postgresql-15
systemctl disable postgresql-15

# Remove 15
dnf -y remove postgresql15*

# Install 17
echo "Installing Postgres 17..."
dnf -y install postgresql17-server postgresql17 --nogpgcheck

# Init 17
if [ ! -d "/var/lib/pgsql/17/data/base" ]; then
    echo "Initializing DB 17..."
    /usr/pgsql-17/bin/postgresql-17-setup initdb
fi

# Start 17
systemctl enable postgresql-17
systemctl start postgresql-17

# Links
echo "Updating Links..."
ln -sf /usr/pgsql-17/bin/psql /usr/bin/psql
ln -sf /usr/pgsql-17/bin/pg_dump /usr/bin/pg_dump
ln -sf /usr/pgsql-17/bin/pg_restore /usr/bin/pg_restore
ln -sf /usr/pgsql-17/bin/createdb /usr/bin/createdb

# Setup DB (Re-create since new cluster)
echo "Configuring DB..."
su - postgres -c "psql -c \"CREATE DATABASE empresa_flow;\"" || true
su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'postgres';\"" || true

echo "UPGRADE_SUCCESS"
psql --version
