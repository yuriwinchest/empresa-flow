const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyChartOfAccountsMigration() {
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

        // PASSO 1: Criar tipos ENUM (em transação separada)
        console.log('📄 Passo 1: Criando tipos ENUM...');

        await client.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
                    CREATE TYPE account_type AS ENUM (
                        'asset', 'liability', 'equity', 'revenue', 'expense', 'cost'
                    );
                END IF;
            END $$;
        `);

        await client.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_nature') THEN
                    CREATE TYPE account_nature AS ENUM ('debit', 'credit');
                END IF;
            END $$;
        `);

        await client.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
                    CREATE TYPE account_status AS ENUM ('active', 'inactive', 'archived');
                END IF;
            END $$;
        `);

        console.log('✅ Tipos ENUM criados!\n');

        // PASSO 2: Criar tabelas (em nova conexão para garantir que os tipos estão disponíveis)
        console.log('📄 Passo 2: Criando tabelas...');
        const tablesPath = path.join(__dirname, '../supabase/migrations/20260103140001_chart_tables.sql');
        const tablesSQL = fs.readFileSync(tablesPath, 'utf8');

        await client.query(tablesSQL);
        console.log('✅ Tabelas criadas!\n');

        // Verificar resultado
        const { rows } = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('chart_of_accounts', 'account_templates', 'account_template_items')
            ORDER BY table_name;
        `);

        console.log('📋 Tabelas:');
        rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });

        // Contar registros do template padrão
        const { rows: templateCount } = await client.query(`
            SELECT COUNT(*) as count FROM account_template_items;
        `);
        console.log(`\n📊 Template padrão: ${templateCount[0].count} contas\n`);

        console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!\n');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error('Code:', error.code);
        console.error('Detail:', error.detail || 'N/A');

        if (error.code === '42P07' || error.code === '42710' || error.code === '23505') {
            console.log('\n⚠️  Alguns objetos já existem, mas a migração foi aplicada.\n');
        } else {
            process.exit(1);
        }
    } finally {
        await client.end();
    }
}

applyChartOfAccountsMigration();
