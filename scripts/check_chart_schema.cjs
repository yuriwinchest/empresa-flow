const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkSchemaAndRLS() {
    try {
        await client.connect();
        console.log("--- Checking Tables Existence ---");
        const tables = ['chart_of_accounts', 'account_templates', 'account_template_items', 'chart_account_attachments'];
        
        for (const table of tables) {
            const res = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [table]);
            console.log(`Table '${table}': ${res.rows[0].exists ? 'EXISTS' : 'MISSING'}`);
        }

        console.log("\n--- Checking RLS Policies ---");
        const policiesRes = await client.query(`
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename IN ('chart_of_accounts', 'account_templates', 'account_template_items', 'chart_account_attachments');
        `);
        console.table(policiesRes.rows.map(p => ({
            table: p.tablename,
            policy: p.policyname,
            cmd: p.cmd,
            roles: p.roles
        })));

        console.log("\n--- Checking Storage Policies (via storage.policies) ---");
        // Storage policies are in storage schema, but we can query them if we have access
        try {
            const storagePolicies = await client.query(`
                SELECT name, bucket_id, definition, operation 
                FROM storage.policies 
                WHERE bucket_id IN ('company-docs');
            `);
             console.table(storagePolicies.rows);
        } catch (e) {
            console.log("Could not query storage.policies directly (might need permissions or different query).");
            console.error(e.message);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkSchemaAndRLS();
