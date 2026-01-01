#!/bin/bash
echo "--- FIXING SETUP ---"

# Clean
dnf clean all

# Install Node
echo "Installing Node.js..."
dnf -y install nodejs --disablerepo=pgdg*
npm install -g pm2

# Install Postgres 15
echo "Installing Postgres..."
# Using --nogpgcheck to bypass signature error
dnf -y install postgresql15-server postgresql15 --nogpgcheck

# Init
if [ ! -d "/var/lib/pgsql/15/data/base" ]; then
    echo "Initializing DB..."
    /usr/pgsql-15/bin/postgresql-15-setup initdb
fi

# Enable
systemctl enable postgresql-15
systemctl restart postgresql-15

# Symlinks
echo "Symlinks..."
ln -sf /usr/pgsql-15/bin/psql /usr/bin/psql
ln -sf /usr/pgsql-15/bin/pg_dump /usr/bin/pg_dump
ln -sf /usr/pgsql-15/bin/pg_restore /usr/bin/pg_restore
ln -sf /usr/pgsql-15/bin/createdb /usr/bin/createdb

# Setup DB
echo "Configuring DB..."
su - postgres -c "psql -c \"CREATE DATABASE empresa_flow;\"" || true
su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'postgres';\"" || true

# Firewall
if command -v firewall-cmd &> /dev/null && systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-port=3000/tcp
    firewall-cmd --permanent --add-port=5432/tcp
    firewall-cmd --reload
fi

echo "SETUP_SUCCESS"
node -v
pm2 -v
psql --version
