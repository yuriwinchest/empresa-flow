const { Client } = require('pg');
require('dotenv').config();

async function fixCoreRLS() {
    const client = new Client({
        host: 'aws-1-us-east-1.pooler.supabase.com', port: 6543,
        user: 'postgres.lhkrxbhqagvuetoigqkl', password: process.env.POSTGRES_PASSWORD || 'TQHjl8jKrOVhgKga',
        database: 'postgres', ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const tables = ['bank_accounts', 'suppliers', 'clients', 'projects', 'departments'];

        for (const table of tables) {
            console.log(`🛡️  Standardizing RLS for ${table}...`);
            await client.query(`
                ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
                
                DROP POLICY IF EXISTS "Users can view ${table} of accessible companies" ON ${table};
                CREATE POLICY "Users can view ${table} of accessible companies" ON ${table}
                    FOR SELECT USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

                DROP POLICY IF EXISTS "Users can insert ${table} in accessible companies" ON ${table};
                CREATE POLICY "Users can insert ${table} in accessible companies" ON ${table}
                    FOR INSERT WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

                DROP POLICY IF EXISTS "Users can update ${table} in accessible companies" ON ${table};
                CREATE POLICY "Users can update ${table} in accessible companies" ON ${table}
                    FOR UPDATE USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

                DROP POLICY IF EXISTS "Users can delete ${table} in accessible companies" ON ${table};
                CREATE POLICY "Users can delete ${table} in accessible companies" ON ${table}
                    FOR DELETE USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
            `);
        }

        // Also fix companies RLS - might be tricky because of owner_id
        console.log(`🛡️  Standardizing RLS for companies...`);
        await client.query(`
            ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can view their own companies" ON companies;
            CREATE POLICY "Users can view their own companies" ON companies
                FOR SELECT USING (owner_id = auth.uid());
            
            DROP POLICY IF EXISTS "Users can insert their own companies" ON companies;
            CREATE POLICY "Users can insert their own companies" ON companies
                FOR INSERT WITH CHECK (owner_id = auth.uid());
            
            DROP POLICY IF EXISTS "Users can update their own companies" ON companies;
            CREATE POLICY "Users can update their own companies" ON companies
                FOR UPDATE USING (owner_id = auth.uid());
                
            DROP POLICY IF EXISTS "Users can delete their own companies" ON companies;
            CREATE POLICY "Users can delete their own companies" ON companies
                FOR DELETE USING (owner_id = auth.uid());
        `);

        console.log('✅ Core RLS standardized!');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
fixCoreRLS();
