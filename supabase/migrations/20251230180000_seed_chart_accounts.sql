DO $$
DECLARE
    r_company RECORD;
    v_rec_id UUID;
    v_desp_id UUID;
    v_desp_adm_id UUID;
    v_desp_pessoal_id UUID;
    v_desp_fin_id UUID;
BEGIN
    FOR r_company IN SELECT id FROM companies LOOP
        
        -- Check if already seeded (simple check by code '1')
        IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = r_company.id AND code = '1') THEN
            
            -- 1. RECEITAS
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic)
            VALUES (gen_random_uuid(), r_company.id, '1', 'RECEITAS', 'receita', false)
            RETURNING id INTO v_rec_id;

            -- 1.01 Receita de Vendas
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '1.01', 'Receita de Vendas', 'receita', true, v_rec_id);
            
            -- 1.02 Receita de Serviços
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '1.02', 'Receita de Serviços', 'receita', true, v_rec_id);


            -- 2. DESPESAS
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic)
            VALUES (gen_random_uuid(), r_company.id, '2', 'DESPESAS', 'despesa', false)
            RETURNING id INTO v_desp_id;

            -- 2.01 Despesas Administrativas
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.01', 'Despesas Administrativas', 'despesa', false, v_desp_id)
            RETURNING id INTO v_desp_adm_id;

            -- 2.01.01 Aluguel
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.01.01', 'Aluguel e Condomínio', 'despesa', true, v_desp_adm_id);
            
            -- 2.01.02 Energia
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.01.02', 'Energia Elétrica', 'despesa', true, v_desp_adm_id);
            
            -- 2.01.03 Internet
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.01.03', 'Internet e Telefone', 'despesa', true, v_desp_adm_id);


            -- 2.02 Despesas com Pessoal
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.02', 'Despesas com Pessoal', 'despesa', false, v_desp_id)
            RETURNING id INTO v_desp_pessoal_id;

            -- 2.02.01 Salários
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.02.01', 'Salários e Ordenados', 'despesa', true, v_desp_pessoal_id);
            
             -- 2.02.02 Pro-labore
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.02.02', 'Pró-Labore', 'despesa', true, v_desp_pessoal_id);


            -- 2.03 Despesas Financeiras
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.03', 'Despesas Financeiras', 'despesa', false, v_desp_id)
            RETURNING id INTO v_desp_fin_id;

            -- 2.03.01 Tarifas
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.03.01', 'Tarifas Bancárias', 'despesa', true, v_desp_fin_id);
            
            -- 2.03.02 Juros
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.03.02', 'Juros Passivos', 'despesa', true, v_desp_fin_id);

        END IF;
    END LOOP;
END $$;
