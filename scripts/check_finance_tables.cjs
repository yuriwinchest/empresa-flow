const { Client } = require('pg');
require('dotenv').config();

async function checkFinanceTables() {
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

        // Verificar tabelas financeiras
        const tables = ['accounts_payable', 'accounts_receivable', 'cash_flow'];

        for (const table of tables) {
            console.log(`\n📋 Verificando tabela: ${table}`);

            // Verificar se existe
            const { rows: exists } = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [table]);

            if (!exists[0].exists) {
                console.log(`❌ Tabela ${table} NÃO EXISTE!`);
                continue;
            }

            console.log(`✅ Tabela existe`);

            // Verificar colunas
            const { rows: columns } = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `, [table]);

            console.log(`   Colunas (${columns.length}):`);
            columns.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type})`);
            });

            // Verificar RLS
            const { rows: rls } = await client.query(`
                SELECT relrowsecurity as enabled
                FROM pg_class
                WHERE relname = $1;
            `, [table]);

            console.log(`   RLS: ${rls[0]?.enabled ? '✅ Habilitado' : '❌ Desabilitado'}`);

            // Verificar policies
            const { rows: policies } = await client.query(`
                SELECT policyname, cmd
                FROM pg_policies
                WHERE tablename = $1;
            `, [table]);

            console.log(`   Policies (${policies.length}):`);
            policies.forEach(p => {
                console.log(`   - ${p.policyname} (${p.cmd})`);
            });

            // Contar registros
            const { rows: count } = await client.query(`SELECT COUNT(*) as total FROM ${table}`);
            console.log(`   Registros: ${count[0].total}`);
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await client.end();
    }
}

checkFinanceTables();
