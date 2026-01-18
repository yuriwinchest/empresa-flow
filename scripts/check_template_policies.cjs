const { Client } = require('pg');
require('dotenv').config();

async function checkTemplatePolicies() {
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

        const tables = ['account_templates', 'account_template_items'];
        for (const table of tables) {
            const { rows } = await client.query(`
                SELECT policyname, qual, with_check 
                FROM pg_policies 
                WHERE tablename = '${table}'
            `);
            console.log(`Policies for ${table}:`, rows);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

checkTemplatePolicies();
