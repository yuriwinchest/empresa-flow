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

        const tables = ['chart_of_accounts', 'chart_account_attachments'];

        for (const table of tables) {
            console.log(`🛡️  Standardizing RLS for ${table}...`);
            await client.query(`
                ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
                
                -- SELECT
                DROP POLICY IF EXISTS "Users can view ${table}" ON ${table};
                CREATE POLICY "Users can view ${table}" ON ${table}
                    FOR SELECT USING (company_id IN (
                        SELECT id FROM companies WHERE owner_id = auth.uid()
                    ));

                -- INSERT
                DROP POLICY IF EXISTS "Users can insert ${table}" ON ${table};
                CREATE POLICY "Users can insert ${table}" ON ${table}
                    FOR INSERT WITH CHECK (company_id IN (
                        SELECT id FROM companies WHERE owner_id = auth.uid()
                    ));

                -- UPDATE
                DROP POLICY IF EXISTS "Users can update ${table}" ON ${table};
                CREATE POLICY "Users can update ${table}" ON ${table}
                    FOR UPDATE USING (company_id IN (
                        SELECT id FROM companies WHERE owner_id = auth.uid()
                    ));

                -- DELETE
                DROP POLICY IF EXISTS "Users can delete ${table}" ON ${table};
                CREATE POLICY "Users can delete ${table}" ON ${table}
                    FOR DELETE USING (company_id IN (
                        SELECT id FROM companies WHERE owner_id = auth.uid()
                    ));
            `);
        }

        // Specific fix for attachments: they join on chart_of_accounts which has company_id
        // But the policy above tries to use company_id directly. 
        // Let's check if chart_account_attachments has company_id.
        const { rows: hasCompanyId } = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'chart_account_attachments' AND column_name = 'company_id'
        `);

        if (hasCompanyId.length === 0) {
            console.log('   Note: chart_account_attachments does not have company_id. Fixing policies...');
            await client.query(`
                DROP POLICY IF EXISTS "Users can view chart_account_attachments" ON chart_account_attachments;
                CREATE POLICY "Users can view chart_account_attachments" ON chart_account_attachments
                    FOR ALL USING (account_id IN (
                        SELECT id FROM chart_of_accounts WHERE company_id IN (
                            SELECT id FROM companies WHERE owner_id = auth.uid()
                        )
                    ));
            `);
        }

        console.log('✅ RLS for Chart of Accounts standardized!');

    } catch (e) {
        console.error('❌ Erro:', e.message);
    } finally {
        await client.end();
    }
}

fixChartRLS();
