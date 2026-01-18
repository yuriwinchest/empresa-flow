const { Client } = require('pg');
require('dotenv').config();

async function fixChartOfAccounts() {
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

        // Verificar se a tabela existe
        const { rows: tableExists } = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'chart_of_accounts'
            );
        `);

        if (!tableExists[0].exists) {
            console.log('📄 Tabela chart_of_accounts não existe. Criando...\n');

            // Criar tipos ENUM primeiro
            await client.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
                        CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense', 'cost');
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_nature') THEN
                        CREATE TYPE account_nature AS ENUM ('debit', 'credit');
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
                        CREATE TYPE account_status AS ENUM ('active', 'inactive', 'archived');
                    END IF;
                END $$;
            `);

            // Criar tabela completa
            await client.query(`
                CREATE TABLE chart_of_accounts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    code VARCHAR(50) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
                    level INTEGER NOT NULL DEFAULT 1,
                    path TEXT,
                    account_type account_type NOT NULL,
                    account_nature account_nature NOT NULL,
                    is_analytical BOOLEAN DEFAULT true,
                    is_synthetic BOOLEAN DEFAULT false,
                    accepts_manual_entry BOOLEAN DEFAULT true,
                    show_in_dre BOOLEAN DEFAULT false,
                    dre_group VARCHAR(100),
                    dre_order INTEGER,
                    tax_classification VARCHAR(100),
                    reference_code VARCHAR(50),
                    status account_status DEFAULT 'active',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW(),
                    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
                    CONSTRAINT unique_code_per_company UNIQUE (company_id, code),
                    CONSTRAINT valid_level CHECK (level > 0 AND level <= 10),
                    CONSTRAINT analytical_or_synthetic CHECK (is_analytical != is_synthetic)
                );
            `);

            console.log('✅ Tabela criada!\n');
        } else {
            console.log('✅ Tabela chart_of_accounts já existe\n');

            // Verificar e adicionar colunas faltantes
            const { rows: columns } = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'chart_of_accounts';
            `);

            const existingColumns = columns.map(c => c.column_name);
            console.log('📋 Colunas existentes:', existingColumns.join(', '), '\n');

            const requiredColumns = {
                'path': 'ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS path TEXT;',
                'show_in_dre': 'ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS show_in_dre BOOLEAN DEFAULT false;',
                'dre_group': 'ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS dre_group VARCHAR(100);',
                'dre_order': 'ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS dre_order INTEGER;',
                'tax_classification': 'ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS tax_classification VARCHAR(100);',
                'reference_code': 'ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS reference_code VARCHAR(50);'
            };

            for (const [colName, sql] of Object.entries(requiredColumns)) {
                if (!existingColumns.includes(colName)) {
                    console.log(`➕ Adicionando coluna: ${colName}`);
                    await client.query(sql);
                }
            }
        }

        // Criar índices
        console.log('\n📊 Criando índices...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company ON chart_of_accounts(company_id);
            CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent ON chart_of_accounts(parent_id);
            CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(company_id, code);
        `);

        // Habilitar RLS
        console.log('🛡️  Configurando RLS...');
        await client.query(`
            ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
            
            DROP POLICY IF EXISTS "Users can view their company accounts" ON chart_of_accounts;
            CREATE POLICY "Users can view their company accounts" ON chart_of_accounts
                FOR SELECT USING (company_id IN (
                    SELECT id FROM companies WHERE owner_id = auth.uid()
                ));

            DROP POLICY IF EXISTS "Users can insert accounts for their companies" ON chart_of_accounts;
            CREATE POLICY "Users can insert accounts for their companies" ON chart_of_accounts
                FOR INSERT WITH CHECK (company_id IN (
                    SELECT id FROM companies WHERE owner_id = auth.uid()
                ));

            DROP POLICY IF EXISTS "Users can update their company accounts" ON chart_of_accounts;
            CREATE POLICY "Users can update their company accounts" ON chart_of_accounts
                FOR UPDATE USING (company_id IN (
                    SELECT id FROM companies WHERE owner_id = auth.uid()
                ));

            DROP POLICY IF EXISTS "Users can delete their company accounts" ON chart_of_accounts;
            CREATE POLICY "Users can delete their company accounts" ON chart_of_accounts
                FOR DELETE USING (company_id IN (
                    SELECT id FROM companies WHERE owner_id = auth.uid()
                ));
        `);

        console.log('\n✅ PLANO DE CONTAS CONFIGURADO COM SUCESSO!\n');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error('Code:', error.code);
    } finally {
        await client.end();
    }
}

fixChartOfAccounts();
