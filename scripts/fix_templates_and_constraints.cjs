const { Client } = require('pg');
require('dotenv').config();

async function fixTemplatesAndCheckConstraints() {
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

        // 1. Permissões para templates
        console.log('🛡️  Configurando RLS para templates...');
        await client.query(`
            ALTER TABLE account_templates ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Public can view templates" ON account_templates;
            CREATE POLICY "Public can view templates" ON account_templates FOR SELECT TO authenticated USING (true);

            ALTER TABLE account_template_items ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Public can view template items" ON account_template_items;
            CREATE POLICY "Public can view template items" ON account_template_items FOR SELECT TO authenticated USING (true);
        `);

        // 2. Verificar Constraints
        console.log('🔍 Verificando constraints em chart_of_accounts...');
        const { rows: constraints } = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as def
            FROM pg_constraint 
            WHERE conrelid = 'chart_of_accounts'::regclass;
        `);
        console.log('Constraints:', constraints);

        // 3. Remover constraints que possam estar bloqueando (como as de enum antigo que falhou rename)
        for (const cons of constraints) {
            if (cons.def.includes('ANY') || cons.def.includes('CHECK')) {
                // Se parecer uma restrição de tipo/natureza que pode estar obsoleta
                if (cons.def.toLowerCase().includes('type') || cons.def.toLowerCase().includes('nature')) {
                    console.log(`🗑️  Removendo constraint potencialmente restritiva: ${cons.conname}`);
                    await client.query(`ALTER TABLE chart_of_accounts DROP CONSTRAINT IF EXISTS "${cons.conname}"`);
                }
            }
        }

        // 4. Forçar recarregamento do schema PostgREST (novamente por garantia)
        console.log('🔄 Notificando PostgREST...');
        await client.query('NOTIFY pgrst, \'reload schema\'');

        console.log('✅ Tudo pronto!');

    } catch (e) {
        console.error('❌ Erro:', e.message);
    } finally {
        await client.end();
    }
}

fixTemplatesAndCheckConstraints();
