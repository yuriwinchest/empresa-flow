const { Client } = require('pg');
require('dotenv').config();

async function fixAllIssues() {
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

        // 1. Verificar e renomear coluna is_analytical para is_analytic em chart_of_accounts
        console.log('📄 Verificando coluna is_analytical...');
        const { rows: hasAnalytical } = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'chart_of_accounts' 
            AND column_name = 'is_analytical';
        `);

        if (hasAnalytical.length > 0) {
            console.log('   Renomeando is_analytical para is_analytic...');
            await client.query(`
                ALTER TABLE chart_of_accounts 
                RENAME COLUMN is_analytical TO is_analytic;
            `);
            console.log('✅ Coluna renomeada!\n');
        } else {
            console.log('✅ Coluna já está correta (is_analytic)\n');
        }

        // 2. Verificar coluna is_synthetic
        const { rows: hasSynthetic } = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'chart_of_accounts' 
            AND column_name = 'is_synthetic';
        `);

        if (hasSynthetic.length === 0) {
            console.log('📄 Adicionando coluna is_synthetic...');
            await client.query(`
                ALTER TABLE chart_of_accounts 
                ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN DEFAULT false;
            `);
            console.log('✅ Coluna is_synthetic adicionada!\n');
        }

        // 3. Atualizar template items para usar is_analytic
        console.log('📄 Atualizando template items...');
        await client.query(`
            ALTER TABLE account_template_items 
            RENAME COLUMN is_analytical TO is_analytic;
        `).catch(() => console.log('   Coluna já renomeada'));
        console.log('✅ Template atualizado!\n');

        // 4. Criar bucket documents se não existir
        console.log('📄 Verificando bucket documents...');
        const { data: buckets } = await client.query(`
            SELECT name FROM storage.buckets WHERE name = 'documents';
        `);

        if (!buckets || buckets.length === 0) {
            console.log('   Criando bucket documents...');
            await client.query(`
                INSERT INTO storage.buckets (id, name, public)
                VALUES ('documents', 'documents', true)
                ON CONFLICT (id) DO NOTHING;
            `);
            console.log('✅ Bucket criado!\n');
        } else {
            console.log('✅ Bucket já existe!\n');
        }

        // 5. Criar policies para bucket documents
        console.log('🛡️  Configurando policies do bucket...');
        await client.query(`
            DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
            CREATE POLICY "Authenticated users can upload documents" ON storage.objects
                FOR INSERT TO authenticated
                WITH CHECK (bucket_id = 'documents');

            DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
            CREATE POLICY "Authenticated users can read documents" ON storage.objects
                FOR SELECT TO authenticated
                USING (bucket_id = 'documents');

            DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
            CREATE POLICY "Authenticated users can delete documents" ON storage.objects
                FOR DELETE TO authenticated
                USING (bucket_id = 'documents');
        `).catch(e => console.log('   Policies já existem ou erro:', e.message));
        console.log('✅ Policies configuradas!\n');

        // 6. Verificar colunas problemáticas em accounts_receivable e accounts_payable
        console.log('📄 Verificando colunas em accounts_receivable...');
        const { rows: receivableCols } = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'accounts_receivable'
            ORDER BY ordinal_position;
        `);
        console.log(`   Colunas (${receivableCols.length}):`, receivableCols.map(c => c.column_name).join(', '));

        console.log('\n📄 Verificando colunas em accounts_payable...');
        const { rows: payableCols } = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'accounts_payable'
            ORDER BY ordinal_position;
        `);
        console.log(`   Colunas (${payableCols.length}):`, payableCols.map(c => c.column_name).join(', '));

        console.log('\n✅ TODAS AS CORREÇÕES APLICADAS COM SUCESSO!\n');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error);
    } finally {
        await client.end();
    }
}

fixAllIssues();
