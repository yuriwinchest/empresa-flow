const { Client } = require('pg');
require('dotenv').config();

async function updateTemplate() {
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

        // Limpar template antigo
        console.log('🗑️  Limpando template antigo...');
        await client.query(`
            DELETE FROM account_template_items WHERE template_id IN (
                SELECT id FROM account_templates WHERE is_default = true
            );
            DELETE FROM account_templates WHERE is_default = true;
        `);
        console.log('✅ Template antigo removido!\n');

        // Criar novo template
        console.log('📄 Criando novo template...');
        const { rows } = await client.query(`
            INSERT INTO account_templates (name, description, industry, is_default)
            VALUES (
                'Plano de Contas DRE Completo',
                'Plano de contas baseado na estrutura DRE (Demonstração do Resultado do Exercício)',
                'geral',
                true
            )
            RETURNING id;
        `);

        const templateId = rows[0].id;
        console.log(`✅ Template criado: ${templateId}\n`);

        // Inserir contas do novo template
        console.log('📊 Inserindo contas...');
        await client.query(`
            INSERT INTO account_template_items (template_id, code, name, parent_code, level, account_type, account_nature, is_analytic, show_in_dre, dre_group, dre_order)
            VALUES
            -- Receita Operacional Bruta
            ($1, '1.0', 'Receita Operacional Bruta', NULL, 1, 'revenue', 'credit', false, true, 'Receita', 1),
            ($1, '1.1', 'Receita de Vendas de Produtos', '1.0', 2, 'revenue', 'credit', true, true, 'Receita Operacional', 2),
            ($1, '1.2', 'Receita de Prestação de Serviços', '1.0', 2, 'revenue', 'credit', true, true, 'Receita Operacional', 3),
            ($1, '1.3', 'Receita de Contratos / Mensalidades', '1.0', 2, 'revenue', 'credit', true, true, 'Receita Operacional', 4),
            ($1, '1.4', 'Outras Receitas Operacionais', '1.0', 2, 'revenue', 'credit', true, true, 'Receita Operacional', 5),
            
            -- Deduções da Receita
            ($1, '2.0', 'Deduções da Receita', NULL, 1, 'revenue', 'debit', false, true, 'Deduções da Receita', 6),
            ($1, '2.1', 'Devoluções de Vendas', '2.0', 2, 'revenue', 'debit', true, true, 'Deduções da Receita', 7),
            ($1, '2.2', 'Cancelamentos', '2.0', 2, 'revenue', 'debit', true, true, 'Deduções da Receita', 8),
            ($1, '2.3', 'Descontos Concedidos', '2.0', 2, 'revenue', 'debit', true, true, 'Deduções da Receita', 9),
            ($1, '2.4', 'Impostos sobre Vendas (ICMS / ISS / PIS / COFINS / Simples)', '2.0', 2, 'revenue', 'debit', true, true, 'Deduções da Receita', 10),
            
            -- Custos Diretos
            ($1, '3.0', 'Custos Diretos', NULL, 1, 'cost', 'debit', false, true, 'Custos Diretos', 11),
            ($1, '3.1', 'Custo das Mercadorias Vendidas (CMV)', '3.0', 2, 'cost', 'debit', true, true, 'Custos Diretos', 12),
            ($1, '3.2', 'Custo dos Produtos Fabricados (CPF)', '3.0', 2, 'cost', 'debit', true, true, 'Custos Diretos', 13),
            ($1, '3.3', 'Fretes sobre Compras', '3.0', 2, 'cost', 'debit', true, true, 'Custos Diretos', 14),
            ($1, '3.4', 'Perdas e Quebras de Estoque', '3.0', 2, 'cost', 'debit', true, true, 'Custos Diretos', 15),
            ($1, '3.5', 'Mão de Obra Direta', '3.0', 2, 'cost', 'debit', true, true, 'Custos Diretos', 16),
            ($1, '3.6', 'Honorários Técnicos', '3.0', 2, 'cost', 'debit', true, true, 'Custos Diretos', 17),
            ($1, '3.7', 'Comissões de Profissionais', '3.0', 2, 'cost', 'debit', true, true, 'Custos Diretos', 18),
            ($1, '3.8', 'Insumos Diretos do Serviço', '3.0', 2, 'cost', 'debit', true, true, 'Custos Diretos', 19),
            
            -- Despesas Operacionais
            ($1, '4.0', 'Despesas Operacionais', NULL, 1, 'expense', 'debit', false, true, 'Despesas Operacionais', 20),
            ($1, '4.1', 'Pró-labore', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Administrativas', 21),
            ($1, '4.2', 'Salários Administrativos', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Administrativas', 22),
            ($1, '4.3', 'Encargos Trabalhistas', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Administrativas', 23),
            ($1, '4.4', 'Contabilidade', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Administrativas', 24),
            ($1, '4.5', 'Sistemas e Softwares', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Administrativas', 25),
            ($1, '4.6', 'Material de Escritório', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Administrativas', 26),
            ($1, '4.7', 'Tráfego Pago', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Comerciais', 27),
            ($1, '4.8', 'Comissões de Vendas', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Comerciais', 28),
            ($1, '4.9', 'Plataformas de Venda', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Comerciais', 29),
            ($1, '4.10', 'Publicidade e Propaganda', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Comerciais', 30),
            ($1, '4.11', 'Aluguel', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Operacionais', 31),
            ($1, '4.12', 'Água', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Operacionais', 32),
            ($1, '4.13', 'Energia Elétrica', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Operacionais', 33),
            ($1, '4.14', 'Internet e Telefonia', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Operacionais', 34),
            ($1, '4.15', 'Limpeza', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Operacionais', 35),
            ($1, '4.16', 'Manutenção', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Operacionais', 36),
            ($1, '4.17', 'Segurança', '4.0', 2, 'expense', 'debit', true, true, 'Despesas Operacionais', 37),
            
            -- Resultado Financeiro
            ($1, '5.0', 'Resultado Financeiro', NULL, 1, 'revenue', 'credit', false, true, 'Resultado Financeiro', 38),
            ($1, '5.1', 'Receitas Financeiras', '5.0', 2, 'revenue', 'credit', true, true, 'Resultado Financeiro', 39),
            ($1, '5.2', 'Juros Bancários', '5.0', 2, 'expense', 'debit', true, true, 'Despesas Financeiras', 40),
            ($1, '5.3', 'Multas', '5.0', 2, 'expense', 'debit', true, true, 'Despesas Financeiras', 41),
            ($1, '5.4', 'Tarifas Bancárias', '5.0', 2, 'expense', 'debit', true, true, 'Despesas Financeiras', 42),
            ($1, '5.5', 'Antecipação de Recebíveis', '5.0', 2, 'expense', 'debit', true, true, 'Despesas Financeiras', 43),
            
            -- Impostos sobre o Lucro
            ($1, '6.0', 'Impostos sobre o Lucro', NULL, 1, 'expense', 'debit', false, true, 'Impostos', 44),
            ($1, '6.1', 'IRPJ', '6.0', 2, 'expense', 'debit', true, true, 'Impostos', 45),
            ($1, '6.2', 'CSLL', '6.0', 2, 'expense', 'debit', true, true, 'Impostos', 46),
            
            -- Lucro Líquido
            ($1, '7.0', 'Lucro Líquido do Exercício', NULL, 1, 'revenue', 'credit', false, true, 'Resultado', 47)
        `, [templateId]);

        const { rows: count } = await client.query('SELECT COUNT(*) as total FROM account_template_items WHERE template_id = $1', [templateId]);

        console.log(`✅ ${count[0].total} contas inseridas!\n`);
        console.log('✅ TEMPLATE ATUALIZADO COM SUCESSO!\n');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error);
    } finally {
        await client.end();
    }
}

updateTemplate();
