
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Configuração para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Client } = pg;

// Connection string para o DB do VPS
const connectionString = "postgres://postgres:TQHjl8jKrOVhgKga@db.lhkrxbhqagvuetoigqkl.supabase.co:5432/postgres";

async function run() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("🔌 Conectado ao banco de dados.");

        const migrationFile = path.join(__dirname, '../supabase/migrations/20260103120100_fix_rls_policies.sql');

        if (!fs.existsSync(migrationFile)) {
            console.error(`Arquivo não encontrado: ${migrationFile}`);
            process.exit(1);
        }

        const sql = fs.readFileSync(migrationFile, 'utf8');
        console.log(`📄 Aplicando migração: ${path.basename(migrationFile)}`);

        await client.query(sql);
        console.log("✅ Correção de RLS aplicada com sucesso!");
    } catch (err) {
        console.error("❌ Erro ao aplicar migração:", err);
    } finally {
        await client.end();
    }
}

run();
