const { Client } = require('pg');
require('dotenv').config();

async function fixChartRLS() {
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

        // 1. Chart of Accounts - POSSUI company_id
        console.log('🛡️  Standardizing RLS for chart_of_accounts...');
        await client.query(`
            ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
            
            DROP POLICY IF EXISTS "Users can view chart_of_accounts" ON chart_of_accounts;
            CREATE POLICY "Users can view chart_of_accounts" ON chart_of_accounts FOR SELECT USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

            DROP POLICY IF EXISTS "Users can insert chart_of_accounts" ON chart_of_accounts;
            CREATE POLICY "Users can insert chart_of_accounts" ON chart_of_accounts FOR INSERT WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

            DROP POLICY IF EXISTS "Users can update chart_of_accounts" ON chart_of_accounts;
            CREATE POLICY "Users can update chart_of_accounts" ON chart_of_accounts FOR UPDATE USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

            DROP POLICY IF EXISTS "Users can delete chart_of_accounts" ON chart_of_accounts;
            CREATE POLICY "Users can delete chart_of_accounts" ON chart_of_accounts FOR DELETE USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
        `);

        // 2. Chart Account Attachments - NÃO POSSUI company_id (usa account_id)
        console.log('🛡️  Standardizing RLS for chart_account_attachments...');
        await client.query(`
            ALTER TABLE chart_account_attachments ENABLE ROW LEVEL SECURITY;
            
            DROP POLICY IF EXISTS "Users can manage chart_account_attachments" ON chart_account_attachments;
            CREATE POLICY "Users can manage chart_account_attachments" ON chart_account_attachments
                FOR ALL USING (account_id IN (
                    SELECT id FROM chart_of_accounts WHERE company_id IN (
                        SELECT id FROM companies WHERE owner_id = auth.uid()
                    )
                ));
        `);

        console.log('✅ RLS for Chart of Accounts standardized!');

    } catch (e) {
        console.error('❌ Erro:', e.message);
    } finally {
        await client.end();
    }
}

fixChartRLS();
