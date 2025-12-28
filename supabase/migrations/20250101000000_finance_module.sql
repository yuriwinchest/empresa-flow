-- Create Enum for Financial Status if it doesn't exist
DO $$ BEGIN
    CREATE TYPE finance_status AS ENUM ('pending', 'paid', 'cancelled', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Accounts Payable (Contas a Pagar)
CREATE TABLE IF NOT EXISTS accounts_payable (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  supplier_id UUID,
  category_id UUID,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status finance_status DEFAULT 'pending',
  payment_method TEXT,
  barcode TEXT,
  recurrence TEXT,
  observations TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts Receivable (Contas a Receber)
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  client_id UUID,
  category_id UUID,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  receive_date DATE,
  status finance_status DEFAULT 'pending',
  payment_method TEXT,
  recurrence TEXT,
  observations TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (Movimentações Bancárias)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  bank_account_id UUID,
  category_id UUID,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  related_payable_id UUID REFERENCES accounts_payable(id),
  related_receivable_id UUID REFERENCES accounts_receivable(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_payable_company ON accounts_payable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due_date ON accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON accounts_payable(status);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_company ON accounts_receivable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_due_date ON accounts_receivable(due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_status ON accounts_receivable(status);

CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account ON transactions(bank_account_id);
