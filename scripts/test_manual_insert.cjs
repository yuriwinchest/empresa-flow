const { Client } = require('pg');
require('dotenv').config();

async function testInsert() {
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

        // Simular o que o frontend faz
        const companyId = 'b60e212a-302d-4fc9-a8fa-89e51772f835'; // ID de exemplo da empresa do log anterior se possível, ou qualquer uma

        // Ver uma empresa do usuário
        const { rows: companies } = await client.query('SELECT id FROM companies LIMIT 1');
        if (companies.length === 0) {
            console.log('Nenhuma empresa encontrada para teste');
            return;
        }
        const testCompanyId = companies[0].id;

        const testAccount = {
            company_id: testCompanyId,
            code: 'TEST.001',
            name: 'Conta Teste',
            description: 'Teste',
            account_type: 'revenue',
            account_nature: 'credit',
            level: 1,
            parent_id: null,
            is_analytic: true,
            show_in_dre: true,
            dre_group: 'Receita',
            dre_order: 1
        };

        console.log('Tentando insert...');
        const query = `
            INSERT INTO chart_of_accounts 
            (company_id, code, name, description, account_type, account_nature, level, parent_id, is_analytic, show_in_dre, dre_group, dre_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id;
        `;
        const values = Object.values(testAccount);

        const res = await client.query(query, values);
        console.log('✅ Sucesso no insert:', res.rows[0].id);

        // Deletar o teste
        await client.query('DELETE FROM chart_of_accounts WHERE id = $1', [res.rows[0].id]);
        console.log('✅ Teste removido.');

    } catch (e) {
        console.error('❌ ERRO NO INSERT:', e.message);
        console.error('🔍 Detalhes:', e.detail);
        console.error('💡 Hint:', e.hint);
    } finally {
        await client.end();
    }
}

testInsert();
