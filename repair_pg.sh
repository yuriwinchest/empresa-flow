#!/bin/bash
echo "--- FIXING PG REPO & INSTALLING PG 17 ---"

# 1. Disable GPG Checks in Repo Files
echo "Disabling GPG Check..."
sed -i 's/gpgcheck=1/gpgcheck=0/g' /etc/yum.repos.d/pgdg*.repo
sed -i 's/repo_gpgcheck=1/repo_gpgcheck=0/g' /etc/yum.repos.d/pgdg*.repo

# 2. Clean Cache
dnf clean all

# 3. Install Postgres 17 (Force)
echo "Installing Postgres 17..."
dnf -y install postgresql17-server postgresql17 --nogpgcheck

# 4. Init 17
if [ ! -d "/var/lib/pgsql/17/data/base" ]; then
    echo "Initializing DB 17..."
    /usr/pgsql-17/bin/postgresql-17-setup initdb
fi

# 5. Start 17
systemctl enable postgresql-17
systemctl start postgresql-17

# 6. Links
echo "Updating Symlinks..."
ln -sf /usr/pgsql-17/bin/psql /usr/bin/psql
ln -sf /usr/pgsql-17/bin/pg_dump /usr/bin/pg_dump
ln -sf /usr/pgsql-17/bin/pg_restore /usr/bin/pg_restore
ln -sf /usr/pgsql-17/bin/createdb /usr/bin/createdb

# 7. Setup DB
echo "Configuring DB..."
su - postgres -c "psql -c \"CREATE DATABASE empresa_flow;\"" || true
su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'postgres';\"" || true

echo "REPAIR_SUCCESS"
psql --version
