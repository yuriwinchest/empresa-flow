-- =====================================================
-- PLANO DE CONTAS (Chart of Accounts)
-- Sistema hierárquico de categorias contábeis
-- =====================================================

-- Criar tipos ENUM apenas se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
        CREATE TYPE account_type AS ENUM (
            'asset',              -- Ativo
            'liability',          -- Passivo
            'equity',             -- Patrimônio Líquido
            'revenue',            -- Receita
            'expense',            -- Despesa
            'cost'                -- Custo
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_nature') THEN
        CREATE TYPE account_nature AS ENUM (
            'debit',              -- Devedora
            'credit'              -- Credora
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
        CREATE TYPE account_status AS ENUM (
            'active',             -- Ativa
            'inactive',           -- Inativa
            'archived'            -- Arquivada
        );
    END IF;
END $$;

-- =====================================================
-- TABELA: chart_of_accounts
-- Plano de Contas hierárquico
-- =====================================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Código e Identificação
    code VARCHAR(50) NOT NULL,                    -- Ex: 1.1.01.001
    name VARCHAR(255) NOT NULL,                   -- Nome da conta
    description TEXT,                             -- Descrição detalhada
    
    -- Hierarquia
    parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 1,             -- Nível hierárquico (1=raiz, 2=subcategoria, etc)
    path TEXT,                                    -- Caminho completo (ex: "1.1.01.001")
    
    -- Classificação
    account_type account_type NOT NULL,           -- Tipo de conta
    account_nature account_nature NOT NULL,       -- Natureza (devedora/credora)
    
    -- Configurações
    is_analytical BOOLEAN DEFAULT true,           -- Conta analítica (aceita lançamentos)
    is_synthetic BOOLEAN DEFAULT false,           -- Conta sintética (apenas agrupamento)
    accepts_manual_entry BOOLEAN DEFAULT true,    -- Aceita lançamento manual
    
    -- DRE e Relatórios
    show_in_dre BOOLEAN DEFAULT false,            -- Exibir no DRE
    dre_group VARCHAR(100),                       -- Grupo no DRE (ex: "Receita Bruta", "Despesas Operacionais")
    dre_order INTEGER,                            -- Ordem de exibição no DRE
    
    -- Integração
    tax_classification VARCHAR(100),              -- Classificação fiscal
    reference_code VARCHAR(50),                   -- Código de referência externo
    
    -- Status e Metadados
    status account_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT unique_code_per_company UNIQUE (company_id, code),
    CONSTRAINT valid_level CHECK (level > 0 AND level <= 10),
    CONSTRAINT analytical_or_synthetic CHECK (is_analytical != is_synthetic)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company ON chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent ON chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(company_id, code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_path ON chart_of_accounts(path);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_dre ON chart_of_accounts(company_id, show_in_dre, dre_order);

-- =====================================================
-- TABELA: account_templates
-- Templates de Plano de Contas (pré-configurados)
-- =====================================================
CREATE TABLE IF NOT EXISTS account_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,                   -- Nome do template (ex: "Plano de Contas Padrão - Comércio")
    description TEXT,
    industry VARCHAR(100),                        -- Setor (comércio, serviços, indústria)
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: account_template_items
-- Itens dos templates
-- =====================================================
CREATE TABLE IF NOT EXISTS account_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES account_templates(id) ON DELETE CASCADE,
    
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_code VARCHAR(50),                      -- Código do pai (para hierarquia)
    level INTEGER NOT NULL,
    account_type account_type NOT NULL,
    account_nature account_nature NOT NULL,
    is_analytical BOOLEAN DEFAULT true,
    show_in_dre BOOLEAN DEFAULT false,
    dre_group VARCHAR(100),
    dre_order INTEGER,
    
    CONSTRAINT unique_code_per_template UNIQUE (template_id, code)
);

CREATE INDEX IF NOT EXISTS idx_template_items_template ON account_template_items(template_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_template_items ENABLE ROW LEVEL SECURITY;

-- Policies para chart_of_accounts
DROP POLICY IF EXISTS "Users can view their company accounts" ON chart_of_accounts;
CREATE POLICY "Users can view their company accounts" ON chart_of_accounts
    FOR SELECT USING (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert accounts for their companies" ON chart_of_accounts;
CREATE POLICY "Users can insert accounts for their companies" ON chart_of_accounts
    FOR INSERT WITH CHECK (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update their company accounts" ON chart_of_accounts;
CREATE POLICY "Users can update their company accounts" ON chart_of_accounts
    FOR UPDATE USING (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can delete their company accounts" ON chart_of_accounts;
CREATE POLICY "Users can delete their company accounts" ON chart_of_accounts
    FOR DELETE USING (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

-- Policies para account_templates (público para leitura)
DROP POLICY IF EXISTS "Anyone can view templates" ON account_templates;
CREATE POLICY "Anyone can view templates" ON account_templates
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view template items" ON account_template_items;
CREATE POLICY "Anyone can view template items" ON account_template_items
    FOR SELECT USING (true);

-- =====================================================
-- FUNÇÃO: Atualizar updated_at automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_chart_of_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chart_of_accounts_updated_at ON chart_of_accounts;
CREATE TRIGGER trigger_update_chart_of_accounts_updated_at
    BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_chart_of_accounts_updated_at();

-- =====================================================
-- DADOS INICIAIS: Template Padrão de Plano de Contas
-- =====================================================
INSERT INTO account_templates (id, name, description, industry, is_default)
VALUES (
    gen_random_uuid(),
    'Plano de Contas Padrão - Geral',
    'Plano de contas padrão baseado em estrutura contábil brasileira',
    'geral',
    true
) ON CONFLICT DO NOTHING;

-- Inserir contas do template padrão
INSERT INTO account_template_items (template_id, code, name, parent_code, level, account_type, account_nature, is_analytical, show_in_dre, dre_group, dre_order)
SELECT 
    (SELECT id FROM account_templates WHERE is_default = true LIMIT 1),
    code, name, parent_code, level, account_type::account_type, account_nature::account_nature, is_analytical, show_in_dre, dre_group, dre_order
FROM (VALUES
    -- RECEITAS
    ('3', 'RECEITAS', NULL, 1, 'revenue', 'credit', false, true, 'Receita Bruta', 1),
    ('3.1', 'Receita Bruta', '3', 2, 'revenue', 'credit', false, true, 'Receita Bruta', 2),
    ('3.1.01', 'Receita de Vendas', '3.1', 3, 'revenue', 'credit', true, true, 'Receita Bruta', 3),
    ('3.1.02', 'Receita de Serviços', '3.1', 3, 'revenue', 'credit', true, true, 'Receita Bruta', 4),
    
    ('3.2', 'Deduções da Receita', '3', 2, 'revenue', 'debit', false, true, 'Deduções', 5),
    ('3.2.01', 'Devoluções e Cancelamentos', '3.2', 3, 'revenue', 'debit', true, true, 'Deduções', 6),
    ('3.2.02', 'Descontos Concedidos', '3.2', 3, 'revenue', 'debit', true, true, 'Deduções', 7),
    ('3.2.03', 'Impostos sobre Vendas', '3.2', 3, 'revenue', 'debit', false, true, 'Deduções', 8),
    ('3.2.03.01', 'ICMS', '3.2.03', 4, 'revenue', 'debit', true, true, 'Deduções', 9),
    ('3.2.03.02', 'PIS', '3.2.03', 4, 'revenue', 'debit', true, true, 'Deduções', 10),
    ('3.2.03.03', 'COFINS', '3.2.03', 4, 'revenue', 'debit', true, true, 'Deduções', 11),
    ('3.2.03.04', 'ISS', '3.2.03', 4, 'revenue', 'debit', true, true, 'Deduções', 12),
    
    -- CUSTOS
    ('4', 'CUSTOS', NULL, 1, 'cost', 'debit', false, true, 'Custos', 13),
    ('4.1', 'Custo das Mercadorias Vendidas (CMV)', '4', 2, 'cost', 'debit', true, true, 'Custos', 14),
    ('4.2', 'Custo dos Serviços Prestados (CSP)', '4', 2, 'cost', 'debit', true, true, 'Custos', 15),
    
    -- DESPESAS
    ('5', 'DESPESAS', NULL, 1, 'expense', 'debit', false, true, 'Despesas Operacionais', 16),
    ('5.1', 'Despesas Administrativas', '5', 2, 'expense', 'debit', false, true, 'Despesas Operacionais', 17),
    ('5.1.01', 'Salários e Encargos', '5.1', 3, 'expense', 'debit', true, true, 'Despesas Operacionais', 18),
    ('5.1.02', 'Pró-labore', '5.1', 3, 'expense', 'debit', true, true, 'Despesas Operacionais', 19),
    ('5.1.03', 'Água, Luz e Telefone', '5.1', 3, 'expense', 'debit', true, true, 'Despesas Operacionais', 20),
    ('5.1.04', 'Aluguel', '5.1', 3, 'expense', 'debit', true, true, 'Despesas Operacionais', 21),
    ('5.1.05', 'Material de Escritório', '5.1', 3, 'expense', 'debit', true, true, 'Despesas Operacionais', 22),
    ('5.1.06', 'Despesas com Veículos', '5.1', 3, 'expense', 'debit', true, true, 'Despesas Operacionais', 23),
    ('5.1.07', 'Manutenção e Reparos', '5.1', 3, 'expense', 'debit', true, true, 'Despesas Operacionais', 24),
    ('5.1.08', 'Serviços de Terceiros', '5.1', 3, 'expense', 'debit', true, true, 'Despesas Operacionais', 25),
    ('5.1.09', 'Despesas Bancárias', '5.1', 3, 'expense', 'debit', true, true, 'Despesas Operacionais', 26),
    
    ('5.2', 'Despesas Comerciais', '5', 2, 'expense', 'debit', false, true, 'Despesas Operacionais', 27),
    ('5.2.01', 'Comissões sobre Vendas', '5.2', 3, 'expense', 'debit', true, true, 'Despesas Operacionais', 28),
    ('5.2.02', 'Propaganda e Marketing', '5.2', 3, 'expense', 'debit', true, true, 'Despesas Operacionais', 29),
    ('5.2.03', 'Fretes e Carretos', '5.2', 3, 'expense', 'debit', true, true, 'Despesas Operacionais', 30),
    
    ('5.3', 'Despesas Financeiras', '5', 2, 'expense', 'debit', false, true, 'Despesas Financeiras', 31),
    ('5.3.01', 'Juros Pagos', '5.3', 3, 'expense', 'debit', true, true, 'Despesas Financeiras', 32),
    ('5.3.02', 'Tarifas Bancárias', '5.3', 3, 'expense', 'debit', true, true, 'Despesas Financeiras', 33),
    ('5.3.03', 'Descontos Concedidos', '5.3', 3, 'expense', 'debit', true, true, 'Despesas Financeiras', 34),
    
    -- RECEITAS FINANCEIRAS
    ('3.3', 'Receitas Financeiras', '3', 2, 'revenue', 'credit', false, true, 'Receitas Financeiras', 35),
    ('3.3.01', 'Juros Recebidos', '3.3', 3, 'revenue', 'credit', true, true, 'Receitas Financeiras', 36),
    ('3.3.02', 'Descontos Obtidos', '3.3', 3, 'revenue', 'credit', true, true, 'Receitas Financeiras', 37),
    ('3.3.03', 'Rendimentos de Aplicações', '3.3', 3, 'revenue', 'credit', true, true, 'Receitas Financeiras', 38),
    
    -- ATIVO
    ('1', 'ATIVO', NULL, 1, 'asset', 'debit', false, false, NULL, NULL),
    ('1.1', 'Ativo Circulante', '1', 2, 'asset', 'debit', false, false, NULL, NULL),
    ('1.1.01', 'Caixa e Equivalentes', '1.1', 3, 'asset', 'debit', false, false, NULL, NULL),
    ('1.1.01.01', 'Caixa', '1.1.01', 4, 'asset', 'debit', true, false, NULL, NULL),
    ('1.1.01.02', 'Bancos', '1.1.01', 4, 'asset', 'debit', true, false, NULL, NULL),
    ('1.1.02', 'Contas a Receber', '1.1', 3, 'asset', 'debit', true, false, NULL, NULL),
    ('1.1.03', 'Estoques', '1.1', 3, 'asset', 'debit', true, false, NULL, NULL),
    
    -- PASSIVO
    ('2', 'PASSIVO', NULL, 1, 'liability', 'credit', false, false, NULL, NULL),
    ('2.1', 'Passivo Circulante', '2', 2, 'liability', 'credit', false, false, NULL, NULL),
    ('2.1.01', 'Fornecedores', '2.1', 3, 'liability', 'credit', true, false, NULL, NULL),
    ('2.1.02', 'Contas a Pagar', '2.1', 3, 'liability', 'credit', true, false, NULL, NULL),
    ('2.1.03', 'Impostos a Recolher', '2.1', 3, 'liability', 'credit', true, false, NULL, NULL),
    
    -- PATRIMÔNIO LÍQUIDO
    ('2.2', 'Patrimônio Líquido', '2', 2, 'equity', 'credit', false, false, NULL, NULL),
    ('2.2.01', 'Capital Social', '2.2', 3, 'equity', 'credit', true, false, NULL, NULL),
    ('2.2.02', 'Lucros Acumulados', '2.2', 3, 'equity', 'credit', true, false, NULL, NULL)
) AS t(code, name, parent_code, level, account_type, account_nature, is_analytical, show_in_dre, dre_group, dre_order)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE chart_of_accounts IS 'Plano de contas hierárquico por empresa';
COMMENT ON COLUMN chart_of_accounts.is_analytical IS 'Conta analítica aceita lançamentos contábeis';
COMMENT ON COLUMN chart_of_accounts.is_synthetic IS 'Conta sintética serve apenas para agrupamento';
COMMENT ON COLUMN chart_of_accounts.show_in_dre IS 'Exibir esta conta no DRE (Demonstração do Resultado do Exercício)';
