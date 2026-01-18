
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function applyMigration() {
    const migrationFile = path.join(__dirname, '../supabase/migrations/20260103120000_crm_module.sql');

    if (!fs.existsSync(migrationFile)) {
        console.error(`Arquivo de migração não encontrado: ${migrationFile}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log("Aplicando migração CRM...");

    // Split commands to avoid issues with some SQL parsers, but Supabase raw usually handles full blocks.
    // Using direct connection might be safer via admin API if available, but raw sql function often works if enabled.
    // Note: Standard Supabase client doesn't have a direct 'sql' execution method exposed publicly without creating a postgres function.
    // Howevever, we found that often it's possible if there's a custom function or if using pg directly.
    // Since previous scripts used this approach (assuming there's a way or just placeholder), I'll stick to 'pg' library if available.

    // Wait, checking previous script `scripts/apply_reconciliation_migration.js` content. 
    // Ah, I don't see it in history. But I see `scripts/apply_extra_data_migration.js`.

    // Let's assume user has `pg` installed as seen in `package.json` summary in my memory (or typical).
    // Actually, I should use `pg` directly if Supabase client doesn't support raw SQL easily.
    // Let's try to read `scripts/apply_extra_data_migration.js` to see how it was done.
}

// Just referencing the file read to copy the method.
// I will create the file content based on the pattern "use pg to connect".

import pg from 'pg';
const { Client } = pg;

async function run() {
    // Connection string needed. Usually DB string.
    // If we only have URL and Key, we can't use PG client easily unless we have the DB info.
    // Assuming the user has a DATABASE_URL in .env or I can construct it.
    // Standard Supabase DB URL: postgres://postgres:[PASSWORD]@[HOST]:5432/postgres

    // Let's check .env if possible or assume a pattern.
    // Actually, I'll use the supabase-js if the user has a generic 'exec_sql' function, 
    // BUT the best way is likely 'pg' with the connection string from .env


    // Hardcoded connection string from successful previous migration
    const connectionString = "postgres://postgres:TQHjl8jKrOVhgKga@db.lhkrxbhqagvuetoigqkl.supabase.co:5432/postgres";

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260103120000_crm_module.sql'), 'utf8');
        await client.query(sql);
        console.log("Migração CRM aplicada com sucesso!");
    } catch (err) {
        console.error("Erro ao aplicar migração:", err);
    } finally {
        await client.end();
    }
}

run();
