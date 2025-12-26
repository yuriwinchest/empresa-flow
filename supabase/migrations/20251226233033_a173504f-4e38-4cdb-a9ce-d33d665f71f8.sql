-- Create Enum for Financial Status if it doesn't exist
DO $$ BEGIN
    CREATE TYPE finance_status AS ENUM ('pending', 'paid', 'cancelled', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Accounts Payable (Contas a Pagar)
CREATE TABLE IF NOT EXISTS accounts_payable (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  supplier_id UUID REFERENCES suppliers(id),
  category_id UUID REFERENCES categories(id),
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
  company_id UUID NOT NULL REFERENCES companies(id),
  client_id UUID REFERENCES clients(id),
  category_id UUID REFERENCES categories(id),
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
  company_id UUID NOT NULL REFERENCES companies(id),
  bank_account_id UUID REFERENCES bank_accounts(id),
  category_id UUID REFERENCES categories(id),
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

-- Enable RLS
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounts_payable
CREATE POLICY "Users can view accounts_payable of accessible companies"
ON accounts_payable FOR SELECT
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert accounts_payable in accessible companies"
ON accounts_payable FOR INSERT
WITH CHECK (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update accounts_payable in accessible companies"
ON accounts_payable FOR UPDATE
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete accounts_payable in accessible companies"
ON accounts_payable FOR DELETE
USING (has_company_access(auth.uid(), company_id));

-- RLS Policies for accounts_receivable
CREATE POLICY "Users can view accounts_receivable of accessible companies"
ON accounts_receivable FOR SELECT
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert accounts_receivable in accessible companies"
ON accounts_receivable FOR INSERT
WITH CHECK (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update accounts_receivable in accessible companies"
ON accounts_receivable FOR UPDATE
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete accounts_receivable in accessible companies"
ON accounts_receivable FOR DELETE
USING (has_company_access(auth.uid(), company_id));

-- RLS Policies for transactions
CREATE POLICY "Users can view transactions of accessible companies"
ON transactions FOR SELECT
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert transactions in accessible companies"
ON transactions FOR INSERT
WITH CHECK (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update transactions in accessible companies"
ON transactions FOR UPDATE
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete transactions in accessible companies"
ON transactions FOR DELETE
USING (has_company_access(auth.uid(), company_id));

-- Triggers for updated_at
CREATE TRIGGER update_accounts_payable_updated_at
BEFORE UPDATE ON accounts_payable
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_receivable_updated_at
BEFORE UPDATE ON accounts_receivable
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();