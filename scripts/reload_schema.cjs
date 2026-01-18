const { Client } = require('pg');
require('dotenv').config();

async function reloadSchema() {
    const client = new Client({
        host: 'aws-1-us-east-1.pooler.supabase.com',
        port: 6543,
        user: 'postgres.lhkrxbhqagvuetoigqkl',
        password: process.env.POSTGRES_PASSWORD || 'TQHjl8jKrOVhgKga',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('🔌 Conectado!');

        console.log('🔄 Notificando PostgREST para recarregar o schema...');
        await client.query('NOTIFY pgrst, \'reload schema\'');

        console.log('✅ Notificação enviada!');

    } catch (e) {
        console.error('❌ Erro:', e.message);
    } finally {
        await client.end();
    }
}

reloadSchema();
