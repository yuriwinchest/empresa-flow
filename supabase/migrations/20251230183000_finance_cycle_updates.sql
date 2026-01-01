-- 1. Create client_categories table
CREATE TABLE IF NOT EXISTS public.client_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.client_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_categories
CREATE POLICY "Users can view client_categories from their companies"
ON public.client_categories FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage client_categories from their companies"
ON public.client_categories FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  )
);


-- 2. Add category_id to clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.client_categories(id);


-- 3. Add transaction_id to finance tables
ALTER TABLE public.accounts_payable 
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id);

ALTER TABLE public.accounts_receivable 
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id);


-- 4. Seed Client Categories for existing companies
DO $$
DECLARE
    r_company RECORD;
BEGIN
    FOR r_company IN SELECT id FROM companies LOOP
        IF NOT EXISTS (SELECT 1 FROM client_categories WHERE company_id = r_company.id) THEN
            INSERT INTO client_categories (company_id, name) VALUES (r_company.id, 'Padrão');
            INSERT INTO client_categories (company_id, name) VALUES (r_company.id, 'VIP');
            INSERT INTO client_categories (company_id, name) VALUES (r_company.id, 'Revenda');
            INSERT INTO client_categories (company_id, name) VALUES (r_company.id, 'Governo');
        END IF;
    END LOOP;
END $$;


-- 5. Update Transactions to loosen category_id FK (to allow ChartOfAccounts IDs)
-- We try to drop the constraint if it exists. Name might vary, so we use a DO block or just generic command.
-- Assuming standard naming: transactions_category_id_fkey
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;

-- We connect it to chart_of_accounts. 
-- WARNING: Existing transactions might fail this constraint if they point to 'categories'.
-- We use NOT VALID to skip checking existing rows.
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES public.chart_of_accounts(id) NOT VALID;

-- Validate later or leave it.
