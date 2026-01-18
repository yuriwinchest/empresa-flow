const { Client } = require('pg');
require('dotenv').config();

async function checkRLS() {
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
        const { rows } = await client.query(`
            SELECT policyname, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'accounts_receivable'
        `);
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

checkRLS();
