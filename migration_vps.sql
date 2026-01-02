
-- Migration para criar tabelas de Faturamento na VPS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL, 
    client_id UUID NOT NULL, 
    issue_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_date TIMESTAMPTZ NOT NULL,
    subtotal NUMERIC(15,2) DEFAULT 0,
    total_taxes NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED', 'OVERDUE')) DEFAULT 'DRAFT',
    notes TEXT,
    payment_method TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tentar criar FKs se as tabelas existirem (defensivo)
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_invoices_company') THEN
            ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_company FOREIGN KEY (company_id) REFERENCES public.companies(id);
        END IF;
    END IF;

    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_invoices_client') THEN
            ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_client FOREIGN KEY (client_id) REFERENCES public.clients(id);
        END IF;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.invoice_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    service_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Policies (Permissiva para teste na VPS se Auth estiver complexo, ou restritiva se Auth estiver OK)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.invoices;
    CREATE POLICY "Enable all access for authenticated users" ON public.invoices FOR ALL USING (true); -- ATENÇÃO: Política permissiva para evitar bloqueios na VPS por enquanto. Ajustar para auth.role() = 'authenticated' depois.
    
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.invoice_lines;
    CREATE POLICY "Enable all access for authenticated users" ON public.invoice_lines FOR ALL USING (true);
END $$;
