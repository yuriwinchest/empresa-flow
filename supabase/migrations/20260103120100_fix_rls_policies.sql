
-- Fix RLS Policies for Core Tables

-- COMPANIES
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON companies;
DROP POLICY IF EXISTS "Users can manage their own companies" ON companies;

DROP POLICY IF EXISTS "Users can view and update their own companies" ON companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert companies" ON companies;

CREATE POLICY "Users can view and update their own companies" ON companies
    FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own companies" ON companies
    FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own companies" ON companies
    FOR DELETE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert companies" ON companies
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- CLIENTS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view clients of their companies" ON clients;
DROP POLICY IF EXISTS "Users can insert clients for their companies" ON clients;
DROP POLICY IF EXISTS "Users can update clients of their companies" ON clients;
DROP POLICY IF EXISTS "Users can delete clients of their companies" ON clients;
DROP POLICY IF EXISTS "Users can manage clients of their companies" ON clients;

CREATE POLICY "Users can manage clients of their companies" ON clients
    FOR ALL
    USING (
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    );

-- BANK ACCOUNTS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bank_accounts of their companies" ON bank_accounts;
DROP POLICY IF EXISTS "Users can manage bank_accounts of their companies" ON bank_accounts;

CREATE POLICY "Users can manage bank_accounts of their companies" ON bank_accounts
    FOR ALL
    USING (
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    );

-- BANK TRANSACTIONS
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bank_transactions of their companies" ON bank_transactions;
DROP POLICY IF EXISTS "Users can manage bank_transactions of their companies" ON bank_transactions;

CREATE POLICY "Users can manage bank_transactions of their companies" ON bank_transactions
    FOR ALL
    USING (
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    );

-- CRM TABLES (Just in case)
-- CRM Pipelines
ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage pipelines of their companies" ON crm_pipelines;
DROP POLICY IF EXISTS "Users can view pipelines of their companies" ON crm_pipelines;

CREATE POLICY "Users can manage pipelines of their companies" ON crm_pipelines
    FOR ALL
    USING (
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    );

-- CRM Stages
ALTER TABLE crm_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage stages via pipeline" ON crm_stages;
DROP POLICY IF EXISTS "Users can view stages via pipeline access" ON crm_stages;

CREATE POLICY "Users can manage stages via pipeline" ON crm_stages
    FOR ALL
    USING (
        pipeline_id IN (
            SELECT id FROM crm_pipelines WHERE company_id IN (
                SELECT id FROM companies WHERE owner_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        pipeline_id IN (
            SELECT id FROM crm_pipelines WHERE company_id IN (
                SELECT id FROM companies WHERE owner_id = auth.uid()
            )
        )
    );

-- CRM Opportunities
ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage opportunities of their companies" ON crm_opportunities;
DROP POLICY IF EXISTS "Users can view opportunities of their companies" ON crm_opportunities;

CREATE POLICY "Users can manage opportunities of their companies" ON crm_opportunities
    FOR ALL
    USING (
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT id FROM companies WHERE owner_id = auth.uid()
        )
    );
