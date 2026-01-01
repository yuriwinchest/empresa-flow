-- 1. Create departments and projects tables
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view departments" ON public.departments FOR SELECT USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage departments" ON public.departments FOR ALL USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can view projects" ON public.projects FOR SELECT USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage projects" ON public.projects FOR ALL USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));


-- 2. Add columns to accounts_payable
ALTER TABLE public.accounts_payable 
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS issue_date DATE,
ADD COLUMN IF NOT EXISTS register_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id),
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id),

-- Taxes (Impostos)
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
ADD COLUMN IF NOT EXISTS inss_retain BOOLEAN DEFAULT false;


-- 3. Seed defaults
DO $$
DECLARE
    r_company RECORD;
BEGIN
    FOR r_company IN SELECT id FROM companies LOOP
        IF NOT EXISTS (SELECT 1 FROM departments WHERE company_id = r_company.id) THEN
            INSERT INTO departments (company_id, name) VALUES (r_company.id, 'Administrativo');
            INSERT INTO departments (company_id, name) VALUES (r_company.id, 'Comercial');
            INSERT INTO departments (company_id, name) VALUES (r_company.id, 'Operacional');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM projects WHERE company_id = r_company.id) THEN
            INSERT INTO projects (company_id, name) VALUES (r_company.id, 'Geral');
        END IF;
    END LOOP;
END $$;
