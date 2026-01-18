const { Client } = require('pg');
require('dotenv').config();

async function checkTransactions() {
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
        const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions'");
        console.log('Transactions Cols:', cols.rows.map(c => c.column_name));
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

checkTransactions();
