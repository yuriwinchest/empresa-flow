
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:tatita123@72.61.133.214:5432/postgres" // Fallback pro VPS
});

async function applyMigration() {
    try {
        await client.connect();
        console.log("🔌 Conectado ao banco de dados.");

        const migrationPath = path.join(__dirname, '../supabase/migrations/20260103130000_create_bucket.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log(`📄 Aplicando migração: 20260103130000_create_bucket.sql`);
        await client.query(sql);

        console.log("✅ Bucket e Políticas configurados com SUCESSO!");
    } catch (err) {
        console.error("❌ Erro ao aplicar migração:", err);
    } finally {
        await client.end();
    }
}

applyMigration();
