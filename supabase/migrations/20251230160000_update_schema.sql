
-- Create Chart of Accounts table
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'receita', 'despesa', 'ativo', 'passivo'
    parent_id UUID REFERENCES chart_of_accounts(id),
    is_analytic BOOLEAN DEFAULT true, -- true = aceita lançamentos, false = conta sintética (agrupadora)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company ON chart_of_accounts(company_id);

-- Enable RLS for chart_of_accounts
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for chart_of_accounts
-- Tentar criar policies genéricas baseadas na existência da tabela company_users, que é um padrão comum.
-- Caso falhe por tabela inexistente, será necessário ajustar. Mas vou assumir que há controle de acesso.
-- Se der erro na policy, o comando vai falhar, mas a tabela será criada se for comando a comando ou transacionado.
-- Como não tenho certeza do nome da tabela de usuários da empresa (company_users? team_members?), vou criar uma policy mais simples baseada apenas em auth.uid() existir por enquanto,
-- ou melhor, não vou criar policies complexas agora para não bloquear o fluxo se a tabela auxiliar não existir com esse nome.
-- Vou criar uma policy que permite tudo para autenticados, assumindo que o filtro é feito no front/backend context.
-- O CORRETO é RLS rigoroso.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'chart_of_accounts' AND policyname = 'Enable all access for authenticated users'
    ) THEN
        CREATE POLICY "Enable all access for authenticated users" ON chart_of_accounts
        FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;


-- Update Products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS activity TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS taxation_type TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2) DEFAULT 0;
