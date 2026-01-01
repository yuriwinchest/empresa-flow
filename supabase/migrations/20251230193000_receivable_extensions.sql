-- Add extended columns to accounts_receivable to match accounts_payable logic
-- This supports "Details", "Taxes/Receipts", "Classification" tab structure

ALTER TABLE public.accounts_receivable
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS issue_date DATE,
ADD COLUMN IF NOT EXISTS register_date DATE DEFAULT CURRENT_DATE,

-- Classification
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id),
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id),

-- Taxes (Impostos a Receber / Retenções)
ADD COLUMN IF NOT EXISTS pis_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pis_retain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cofins_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cofins_retain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS csll_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS csll_retain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ir_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ir_retain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS iss_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS iss_retain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS inss_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS inss_retain BOOLEAN DEFAULT false,

-- Bank Account (ensure it exists for direct linking)
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id);
