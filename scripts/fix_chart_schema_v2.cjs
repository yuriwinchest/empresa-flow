const { Client } = require('pg');
require('dotenv').config();

async function fixChartTableSchema() {
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

        // 1. Renomear 'type' para 'account_type' se existir
        const { rows: hasType } = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'chart_of_accounts' AND column_name = 'type'
        `);

        if (hasType.length > 0) {
            console.log('   Renomeando type para account_type...');
            await client.query('ALTER TABLE chart_of_accounts RENAME COLUMN type TO account_type');
        }

        // 2. Adicionar account_nature se não existir
        const { rows: hasNature } = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'chart_of_accounts' AND column_name = 'account_nature'
        `);

        if (hasNature.length === 0) {
            console.log('   Adicionando account_nature...');
            await client.query("ALTER TABLE chart_of_accounts ADD COLUMN account_nature VARCHAR(10) DEFAULT 'debit'");
        }

        // 3. Adicionar level se não existir
        const { rows: hasLevel } = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'chart_of_accounts' AND column_name = 'level'
        `);

        if (hasLevel.length === 0) {
            console.log('   Adicionando level...');
            await client.query('ALTER TABLE chart_of_accounts ADD COLUMN level INTEGER DEFAULT 1');
        }

        // 4. Adicionar description se não existir
        const { rows: hasDesc } = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'chart_of_accounts' AND column_name = 'description'
        `);

        if (hasDesc.length === 0) {
            console.log('   Adicionando description...');
            await client.query('ALTER TABLE chart_of_accounts ADD COLUMN description TEXT');
        }

        // 5. Garantir que os enums de account_type estejam corretos no DB
        // (Isso depende se a coluna é varchar ou enum. Se for varchar, ok. Se for enum, precisa ajustar).
        console.log('📄 Ajustando tipos de dados...');
        await client.query('ALTER TABLE chart_of_accounts ALTER COLUMN account_type TYPE VARCHAR(50)');
        await client.query('ALTER TABLE chart_of_accounts ALTER COLUMN account_nature TYPE VARCHAR(10)');

        console.log('✅ Tabela chart_of_accounts padronizada!');

    } catch (e) {
        console.error('❌ Erro:', e.message);
    } finally {
        await client.end();
    }
}

fixChartTableSchema();
