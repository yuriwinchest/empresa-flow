CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_company_id ON public.categories(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company_id ON public.bank_accounts(company_id);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_company_due_date_created_at ON public.accounts_receivable(company_id, due_date, created_at);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_company_due_date_created_at ON public.accounts_payable(company_id, due_date, created_at);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_company_client_due_date ON public.accounts_receivable(company_id, client_id, due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_company_supplier_due_date ON public.accounts_payable(company_id, supplier_id, due_date);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_overdue_company_due_date ON public.accounts_receivable(company_id, due_date) WHERE status IN ('pending'::public.finance_status, 'overdue'::public.finance_status);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_overdue_company_due_date ON public.accounts_payable(company_id, due_date) WHERE status IN ('pending'::public.finance_status, 'overdue'::public.finance_status);

CREATE INDEX IF NOT EXISTS idx_transactions_company_date_created_at ON public.transactions(company_id, date, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_company_bank_date ON public.transactions(company_id, bank_account_id, date);

CREATE INDEX IF NOT EXISTS idx_clients_razao_social_trgm ON public.clients USING gin (razao_social gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_nome_fantasia_trgm ON public.clients USING gin (nome_fantasia gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj_trgm ON public.clients USING gin (cpf_cnpj gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_suppliers_razao_social_trgm ON public.suppliers USING gin (razao_social gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_suppliers_nome_fantasia_trgm ON public.suppliers USING gin (nome_fantasia gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_suppliers_cpf_cnpj_trgm ON public.suppliers USING gin (cpf_cnpj gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON public.products USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_code_trgm ON public.products USING gin (code gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_description_trgm ON public.accounts_receivable USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_description_trgm ON public.accounts_payable USING gin (description gin_trgm_ops);
