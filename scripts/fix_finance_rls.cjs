const { Client } = require('pg');
require('dotenv').config();

async function fixFinanceRLS() {
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

        const tables = ['accounts_payable', 'accounts_receivable', 'cash_flow', 'transactions'];

        for (const table of tables) {
            console.log(`🛡️  Standardizing RLS for ${table}...`);
            await client.query(`
                ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
                
                -- SELECT
                DROP POLICY IF EXISTS "Users can view ${table} of accessible companies" ON ${table};
                CREATE POLICY "Users can view ${table} of accessible companies" ON ${table}
                    FOR SELECT USING (company_id IN (
                        SELECT id FROM companies WHERE owner_id = auth.uid()
                    ));

                -- INSERT
                DROP POLICY IF EXISTS "Users can insert ${table} in accessible companies" ON ${table};
                CREATE POLICY "Users can insert ${table} in accessible companies" ON ${table}
                    FOR INSERT WITH CHECK (company_id IN (
                        SELECT id FROM companies WHERE owner_id = auth.uid()
                    ));

                -- UPDATE
                DROP POLICY IF EXISTS "Users can update ${table} in accessible companies" ON ${table};
                CREATE POLICY "Users can update ${table} in accessible companies" ON ${table}
                    FOR UPDATE USING (company_id IN (
                        SELECT id FROM companies WHERE owner_id = auth.uid()
                    ));

                -- DELETE
                DROP POLICY IF EXISTS "Users can delete ${table} in accessible companies" ON ${table};
                CREATE POLICY "Users can delete ${table} in accessible companies" ON ${table}
                    FOR DELETE USING (company_id IN (
                        SELECT id FROM companies WHERE owner_id = auth.uid()
                    ));
            `);
        }
        console.log('✅ RLS standardized!');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

fixFinanceRLS();
