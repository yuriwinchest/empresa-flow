
-- Tabela de Contas Bancárias
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- "Itaú Principal", "Caixinha"
    bank_name TEXT, -- "Itaú", "Nubank"
    agency TEXT,
    account_number TEXT,
    initial_balance DECIMAL(15, 2) DEFAULT 0,
    current_balance DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para Bank Accounts
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bank accounts of their companies" ON bank_accounts;
CREATE POLICY "Users can view bank accounts of their companies" ON bank_accounts
    FOR SELECT USING (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert bank accounts for their companies" ON bank_accounts;
CREATE POLICY "Users can insert bank accounts for their companies" ON bank_accounts
    FOR INSERT WITH CHECK (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update bank accounts of their companies" ON bank_accounts;
CREATE POLICY "Users can update bank accounts of their companies" ON bank_accounts
    FOR UPDATE USING (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

-- Tabela de Transações Bancárias (Importadas do OFX ou manuais)
CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE, -- redundância útil para RLS
    
    date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL, -- Positivo = Entrada, Negativo = Saída
    description TEXT,
    memo TEXT, -- Detalhes adicionais do OFX
    
    fit_id TEXT, -- ID único do OFX para evitar duplicidade
    
    status TEXT DEFAULT 'pending', -- pending, reconciled, ignored
    
    -- Links para conciliação
    reconciled_payable_id UUID REFERENCES accounts_payable(id) ON DELETE SET NULL,
    reconciled_receivable_id UUID REFERENCES accounts_receivable(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_fit_id_per_account UNIQUE (bank_account_id, fit_id)
);

-- Habilitar RLS para Bank Transactions
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bank transactions of their companies" ON bank_transactions;
CREATE POLICY "Users can view bank transactions of their companies" ON bank_transactions
    FOR SELECT USING (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert bank transactions for their companies" ON bank_transactions;
CREATE POLICY "Users can insert bank transactions for their companies" ON bank_transactions
    FOR INSERT WITH CHECK (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update their bank transactions" ON bank_transactions;
CREATE POLICY "Users can update their bank transactions" ON bank_transactions
    FOR UPDATE USING (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_bank_transactions_fit_id ON bank_transactions(fit_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
