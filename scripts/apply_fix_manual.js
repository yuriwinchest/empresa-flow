
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config();

// Configura conexão direta (Porta 5432 - Transaction Mode / Session Mode)
// Usamos a senha direta do .env: TQHjl8jKrOVhgKga
const connectionString = "postgres://postgres:TQHjl8jKrOVhgKga@db.lhkrxbhqagvuetoigqkl.supabase.co:5432/postgres";

console.log(`🔌 Conectando ao Supabase (Direct): db.lhkrxbhqagvuetoigqkl.supabase.co...`);

const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Necessário para Supabase Cloud
});

async function runMigration() {
    try {
        await client.connect();
        console.log('✅ Conexão estabelecida.');

        const migrationFile = path.join(process.cwd(), 'supabase/migrations/20260101000000_vps_fix_rls_final.sql');

        if (!fs.existsSync(migrationFile)) {
            throw new Error(`Arquivo de migração não encontrado: ${migrationFile}`);
        }

        const sql = fs.readFileSync(migrationFile, 'utf8');
        console.log(`📄 Lendo arquivo: ${path.basename(migrationFile)}`);
        console.log(`🚀 Executando SQL...`);

        const res = await client.query(sql);
        console.log('🎉 Migração aplicada com SUCESSO!');

    } catch (err) {
        console.error('❌ Erro ao aplicar migração:', err);
    } finally {
        await client.end();
        console.log('🔌 Conexão encerrada.');
    }
}

runMigration();
