
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

// Conexão direta
const connectionString = "postgres://postgres:TQHjl8jKrOVhgKga@db.lhkrxbhqagvuetoigqkl.supabase.co:5432/postgres";

console.log(`🔌 Conectando ao Supabase para Migração Financeira...`);

const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        await client.connect();
        console.log('✅ Conexão estabelecida.');

        const migrationFile = path.join(__dirname, '../supabase/migrations/20260102160000_finance_reconciliation.sql');

        if (!fs.existsSync(migrationFile)) {
            throw new Error(`Arquivo não encontrado: ${migrationFile}`);
        }

        const sql = fs.readFileSync(migrationFile, 'utf8');
        console.log(`📄 Aplicando: ${path.basename(migrationFile)}`);

        await client.query(sql);
        console.log('🎉 Tabelas financeiras criadas com SUCESSO!');

    } catch (err) {
        console.error('❌ Erro:', err);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Conexão encerrada.');
    }
}

runMigration();
