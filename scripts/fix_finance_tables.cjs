const { Client } = require('pg');
require('dotenv').config();

async function fixFinanceTables() {
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

        // 1. Adicionar bank_account_id em accounts_payable se não existir
        console.log('📄 Verificando coluna bank_account_id em accounts_payable...');
        await client.query(`
            ALTER TABLE accounts_payable 
            ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
        `);
        console.log('✅ Coluna bank_account_id adicionada/verificada!\n');

        // 2. Criar tabela cash_flow
        console.log('📄 Criando tabela cash_flow...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS cash_flow (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
                category_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
                type VARCHAR(20) NOT NULL CHECK (type IN ('inflow', 'outflow')),
                amount DECIMAL(15,2) NOT NULL,
                date DATE NOT NULL,
                description TEXT,
                status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
                origin_type VARCHAR(50),
                origin_id UUID,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_cash_flow_company ON cash_flow(company_id);
            CREATE INDEX IF NOT EXISTS idx_cash_flow_date ON cash_flow(date);
            CREATE INDEX IF NOT EXISTS idx_cash_flow_type ON cash_flow(type);
            CREATE INDEX IF NOT EXISTS idx_cash_flow_bank_account ON cash_flow(bank_account_id);
        `);
        console.log('✅ Tabela cash_flow criada!\n');

        // 3. RLS para cash_flow
        console.log('🛡️  Configurando RLS para cash_flow...');
        await client.query(`
            ALTER TABLE cash_flow ENABLE ROW LEVEL SECURITY;

            DROP POLICY IF EXISTS "Users can view cash_flow of accessible companies" ON cash_flow;
            CREATE POLICY "Users can view cash_flow of accessible companies" ON cash_flow
                FOR SELECT USING (company_id IN (
                    SELECT id FROM companies WHERE owner_id = auth.uid()
                ));

            DROP POLICY IF EXISTS "Users can insert cash_flow in accessible companies" ON cash_flow;
            CREATE POLICY "Users can insert cash_flow in accessible companies" ON cash_flow
                FOR INSERT WITH CHECK (company_id IN (
                    SELECT id FROM companies WHERE owner_id = auth.uid()
                ));

            DROP POLICY IF EXISTS "Users can update cash_flow in accessible companies" ON cash_flow;
            CREATE POLICY "Users can update cash_flow in accessible companies" ON cash_flow
                FOR UPDATE USING (company_id IN (
                    SELECT id FROM companies WHERE owner_id = auth.uid()
                ));

            DROP POLICY IF EXISTS "Users can delete cash_flow in accessible companies" ON cash_flow;
            CREATE POLICY "Users can delete cash_flow in accessible companies" ON cash_flow
                FOR DELETE USING (company_id IN (
                    SELECT id FROM companies WHERE owner_id = auth.uid()
                ));
        `);
        console.log('✅ RLS configurado!\n');

        // 4. Criar tabela transactions se não existir
        console.log('📄 Criando tabela transactions...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
                category_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
                type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
                amount DECIMAL(15,2) NOT NULL,
                date DATE NOT NULL,
                description TEXT,
                status VARCHAR(20) DEFAULT 'completed',
                origin_type VARCHAR(50),
                origin_id UUID,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
            CREATE INDEX IF NOT EXISTS idx_transactions_bank_account ON transactions(bank_account_id);
        `);
        console.log('✅ Tabela transactions criada!\n');

        // 5. RLS para transactions
        console.log('🛡️  Configurando RLS para transactions...');
        await client.query(`
            ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

            DROP POLICY IF EXISTS "Users can view transactions of accessible companies" ON transactions;
            CREATE POLICY "Users can view transactions of accessible companies" ON transactions
                FOR SELECT USING (company_id IN (
                    SELECT id FROM companies WHERE owner_id = auth.uid()
                ));

            DROP POLICY IF EXISTS "Users can insert transactions in accessible companies" ON transactions;
            CREATE POLICY "Users can insert transactions in accessible companies" ON transactions
                FOR INSERT WITH CHECK (company_id IN (
                    SELECT id FROM companies WHERE owner_id = auth.uid()
                ));

            DROP POLICY IF EXISTS "Users can update transactions in accessible companies" ON transactions;
            CREATE POLICY "Users can update transactions in accessible companies" ON transactions
                FOR UPDATE USING (company_id IN (
                    SELECT id FROM companies WHERE owner_id = auth.uid()
                ));

            DROP POLICY IF EXISTS "Users can delete transactions in accessible companies" ON transactions;
            CREATE POLICY "Users can delete transactions in accessible companies" ON transactions
                FOR DELETE USING (company_id IN (
                    SELECT id FROM companies WHERE owner_id = auth.uid()
                ));
        `);
        console.log('✅ RLS configurado!\n');

        console.log('✅ TODAS AS TABELAS FINANCEIRAS CONFIGURADAS COM SUCESSO!\n');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error);
    } finally {
        await client.end();
    }
}

fixFinanceTables();
