const { Client } = require('pg');
require('dotenv').config();

async function checkTemplates() {
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

        const templates = await client.query('SELECT * FROM account_templates');
        console.log('Templates:', templates.rows);

        const itemsCount = await client.query('SELECT count(*) FROM account_template_items');
        console.log('Items count:', itemsCount.rows[0].count);

        const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'account_template_items'");
        console.log('Account Template Items Cols:', cols.rows.map(c => c.column_name));

        const chartCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'chart_of_accounts'");
        console.log('Chart of Accounts Cols:', chartCols.rows.map(c => c.column_name));

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

checkTemplates();
