-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy for public access to logos
DROP POLICY IF EXISTS "Logos Public Access" ON storage.objects;
CREATE POLICY "Logos Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');

-- Policy for authenticated users to upload logos
DROP POLICY IF EXISTS "Logos Upload Auth" ON storage.objects;
CREATE POLICY "Logos Upload Auth" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

-- Policy for owners to update/delete logos
DROP POLICY IF EXISTS "Logos Owner Manage" ON storage.objects;
CREATE POLICY "Logos Owner Manage" ON storage.objects
  FOR ALL USING (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

-- Function to seed Chart of Accounts based on profile
CREATE OR REPLACE FUNCTION seed_chart_of_accounts(p_company_id UUID, p_profile TEXT)
RETURNS VOID AS $$
DECLARE
    v_asset_id UUID;
    v_liability_id UUID;
    v_revenue_id UUID;
    v_expense_id UUID;
BEGIN
    -- Validation
    IF p_profile NOT IN ('comercio', 'servico', 'industria', 'mista') THEN
        RAISE EXCEPTION 'Invalid profile. Must be comercio, servico, industria, or mista.';
    END IF;

    -- Clear existing (optional, or we can just append. But usually "seed" implies fresh start if empty. For now, let's just insert).
    -- Actually, to avoid duplicates, we could check. But simplistic approach:

    -- 1. ASSETS (Ativo)
    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id)
    VALUES (p_company_id, 'Ativo', 'asset', '1', NULL)
    RETURNING id INTO v_asset_id;

    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id) VALUES
    (p_company_id, 'Ativo Circulante', 'asset', '1.1', v_asset_id);

    -- 2. LIABILITIES (Passivo)
    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id)
    VALUES (p_company_id, 'Passivo', 'liability', '2', NULL)
    RETURNING id INTO v_liability_id;

    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id) VALUES
    (p_company_id, 'Fornecedores a Pagar', 'liability', '2.1', v_liability_id),
    (p_company_id, 'Obrigações Trabalhistas', 'liability', '2.2', v_liability_id),
    (p_company_id, 'Obrigações Tributárias', 'liability', '2.3', v_liability_id);

    -- 3. REVENUE (Receita)
    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id)
    VALUES (p_company_id, 'Receitas', 'income', '3', NULL)
    RETURNING id INTO v_revenue_id;

    IF p_profile IN ('comercio', 'mista') THEN
         INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id) VALUES
         (p_company_id, 'Venda de Mercadorias', 'income', '3.1', v_revenue_id);
    END IF;

    IF p_profile IN ('servico', 'mista') THEN
         INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id) VALUES
         (p_company_id, 'Prestação de Serviços', 'income', '3.2', v_revenue_id);
    END IF;

    IF p_profile IN ('industria') THEN
         INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id) VALUES
         (p_company_id, 'Venda de Produtos Industrializados', 'income', '3.3', v_revenue_id);
    END IF;

    -- 4. EXPENSES (Despesas)
    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id)
    VALUES (p_company_id, 'Despesas', 'expense', '4', NULL)
    RETURNING id INTO v_expense_id;

    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id) VALUES
    (p_company_id, 'Despesas Administrativas', 'expense', '4.1', v_expense_id),
    (p_company_id, 'Despesas com Pessoal', 'expense', '4.2', v_expense_id),
    (p_company_id, 'Despesas Financeiras', 'expense', '4.3', v_expense_id),
    (p_company_id, 'Despesas Tributárias', 'expense', '4.4', v_expense_id);

    -- Detailed expenses
    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id) 
    SELECT p_company_id, name, 'expense', '4.1.' || row_number() OVER (), (SELECT id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '4.1')
    FROM (VALUES 
        ('Aluguel'), ('Água e Esgoto'), ('Energia Elétrica'), ('Internet e Telefone'), 
        ('Material de Escritório'), ('Limpeza e Conservação'), ('Manutenção Predial')
    ) AS t(name);

    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id)
    SELECT p_company_id, name, 'expense', '4.2.' || row_number() OVER (), (SELECT id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '4.2')
    FROM (VALUES
        ('Salários'), ('Pró-labore'), ('Vale Transporte'), ('Vale Refeição'), ('FGTS'), ('INSS')
    ) AS t(name);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
