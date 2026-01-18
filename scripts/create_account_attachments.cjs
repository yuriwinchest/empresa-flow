const { Client } = require('pg');
require('dotenv').config();

async function createAccountAttachments() {
    const client = new Client({
        host: 'aws-1-us-east-1.pooler.supabase.com',
        port: 6543,
        user: 'postgres.lhkrxbhqagvuetoigqkl',
        password: process.env.POSTGRES_PASSWORD || 'TQHjl8jKrOVhgKga',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Conectando ao Supabase...');
        await client.connect();
        console.log('✅ Conectado!\n');

        console.log('📄 Criando tabela de anexos...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS chart_account_attachments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
                file_name VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                file_size BIGINT,
                content_type VARCHAR(100),
                description TEXT,
                uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_account_attachments_account ON chart_account_attachments(account_id);
        `);
        console.log('✅ Tabela criada!\n');

        console.log('🛡️  Configurando RLS...');
        await client.query(`
            ALTER TABLE chart_account_attachments ENABLE ROW LEVEL SECURITY;

            DROP POLICY IF EXISTS "Users can view attachments of their company accounts" ON chart_account_attachments;
            CREATE POLICY "Users can view attachments of their company accounts" ON chart_account_attachments
                FOR SELECT USING (account_id IN (
                    SELECT id FROM chart_of_accounts WHERE company_id IN (
                        SELECT id FROM companies WHERE owner_id = auth.uid()
                    )
                ));

            DROP POLICY IF EXISTS "Users can insert attachments for their company accounts" ON chart_account_attachments;
            CREATE POLICY "Users can insert attachments for their company accounts" ON chart_account_attachments
                FOR INSERT WITH CHECK (account_id IN (
                    SELECT id FROM chart_of_accounts WHERE company_id IN (
                        SELECT id FROM companies WHERE owner_id = auth.uid()
                    )
                ));

            DROP POLICY IF EXISTS "Users can delete attachments of their company accounts" ON chart_account_attachments;
            CREATE POLICY "Users can delete attachments of their company accounts" ON chart_account_attachments
                FOR DELETE USING (account_id IN (
                    SELECT id FROM chart_of_accounts WHERE company_id IN (
                        SELECT id FROM companies WHERE owner_id = auth.uid()
                    )
                ));
        `);
        console.log('✅ RLS configurado!\n');

        console.log('✅ TABELA DE ANEXOS CRIADA COM SUCESSO!\n');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await client.end();
    }
}

createAccountAttachments();
