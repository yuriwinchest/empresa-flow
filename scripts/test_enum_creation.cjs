const { Client } = require('pg');
require('dotenv').config();

async function testEnumCreation() {
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

        // Verificar se os tipos já existem
        const { rows: existingTypes } = await client.query(`
            SELECT typname FROM pg_type 
            WHERE typname IN ('account_type', 'account_nature', 'account_status');
        `);

        console.log('📋 Tipos ENUM existentes:');
        existingTypes.forEach(row => console.log(`  - ${row.typname}`));

        if (existingTypes.length === 3) {
            console.log('\n✅ Todos os tipos já existem! Pulando criação...\n');
        } else {
            console.log('\n📄 Criando tipos ENUM...');

            const createTypesSQL = `
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
                        CREATE TYPE account_type AS ENUM (
                            'asset', 'liability', 'equity', 'revenue', 'expense', 'cost'
                        );
                        RAISE NOTICE 'Tipo account_type criado';
                    END IF;
                END $$;

                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_nature') THEN
                        CREATE TYPE account_nature AS ENUM ('debit', 'credit');
                        RAISE NOTICE 'Tipo account_nature criado';
                    END IF;
                END $$;

                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
                        CREATE TYPE account_status AS ENUM ('active', 'inactive', 'archived');
                        RAISE NOTICE 'Tipo account_status criado';
                    END IF;
                END $$;
            `;

            await client.query(createTypesSQL);
            console.log('✅ Tipos criados!\n');
        }

        // Verificar novamente
        const { rows: finalTypes } = await client.query(`
            SELECT typname FROM pg_type 
            WHERE typname IN ('account_type', 'account_nature', 'account_status');
        `);

        console.log('📋 Tipos ENUM finais:');
        finalTypes.forEach(row => console.log(`  ✓ ${row.typname}`));

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error('Code:', error.code);
    } finally {
        await client.end();
    }
}

testEnumCreation();
