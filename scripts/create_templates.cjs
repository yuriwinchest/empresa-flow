const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function createTemplates() {
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

        // Criar tabelas de templates
        console.log('📄 Criando tabelas de templates...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS account_templates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                industry VARCHAR(100),
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS account_template_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                template_id UUID NOT NULL REFERENCES account_templates(id) ON DELETE CASCADE,
                code VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                parent_code VARCHAR(50),
                level INTEGER NOT NULL,
                account_type account_type NOT NULL,
                account_nature account_nature NOT NULL,
                is_analytical BOOLEAN DEFAULT true,
                show_in_dre BOOLEAN DEFAULT false,
                dre_group VARCHAR(100),
                dre_order INTEGER,
                CONSTRAINT unique_code_per_template UNIQUE (template_id, code)
            );
        `);
        console.log('✅ Tabelas criadas!\n');

        // RLS
        console.log('🛡️  Configurando RLS...');
        await client.query(`
            ALTER TABLE account_templates ENABLE ROW LEVEL SECURITY;
            ALTER TABLE account_template_items ENABLE ROW LEVEL SECURITY;

            DROP POLICY IF EXISTS "Anyone can view templates" ON account_templates;
            CREATE POLICY "Anyone can view templates" ON account_templates FOR SELECT USING (true);

            DROP POLICY IF EXISTS "Anyone can view template items" ON account_template_items;
            CREATE POLICY "Anyone can view template items" ON account_template_items FOR SELECT USING (true);
        `);
        console.log('✅ RLS configurado!\n');

        // Inserir template padrão
        console.log('📊 Inserindo template padrão...');
        const templateSQL = fs.readFileSync(
            path.join(__dirname, '../supabase/migrations/20260103140001_chart_tables.sql'),
            'utf8'
        );

        // Extrair apenas a parte dos INSERTs
        const insertMatch = templateSQL.match(/INSERT INTO account_templates[\s\S]*?ON CONFLICT DO NOTHING;[\s\S]*?INSERT INTO account_template_items[\s\S]*?ON CONFLICT DO NOTHING;/);

        if (insertMatch) {
            await client.query(insertMatch[0]);

            const { rows } = await client.query('SELECT COUNT(*) as count FROM account_template_items');
            console.log(`✅ Template criado com ${rows[0].count} contas!\n`);
        }

        console.log('✅ TEMPLATES CONFIGURADOS COM SUCESSO!\n');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error('Code:', error.code);
        if (error.code !== '23505') { // Ignorar duplicatas
            process.exit(1);
        }
    } finally {
        await client.end();
    }
}

createTemplates();
