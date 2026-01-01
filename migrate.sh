#!/bin/bash
echo "--- DATA MIGRATION ---"

# Remote (Supabase) Credentials
R_HOST="db.lhkrxbhqagvuetoigqkl.supabase.co"
R_USER="postgres"
R_DB="postgres"
R_PASS="TQHjl8jKrOVhgKga"

# Local Credentials
L_HOST="localhost"
L_USER="postgres"
L_DB="empresa_flow"
L_PASS="postgres"

echo "Dumping from Supabase..."
# -Fc for custom format (compressed, cleaner restore)
PGPASSWORD="$R_PASS" pg_dump -v -h $R_HOST -U $R_USER -d $R_DB --no-owner --no-privileges --clean --if-exists -Fc -f /root/full_backup.dump

if [ $? -eq 0 ]; then
    echo "Dump Successful. Restoring to Local DB..."
    
    PGPASSWORD="$L_PASS" pg_restore -v -h $L_HOST -U $L_USER -d $L_DB --clean --if-exists --no-owner --no-privileges /root/full_backup.dump
    
    if [ $? -eq 0 ]; then
        echo "MIGRATION_SUCCESS"
    else
        echo "RESTORE_FAILED"
        exit 1
    fi
else
    echo "DUMP_FAILED. Check network or credentials."
    exit 1
fi
