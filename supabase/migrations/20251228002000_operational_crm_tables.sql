CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_company_id ON public.departments(company_id);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view departments of accessible companies"
ON public.departments FOR SELECT
USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert departments in accessible companies"
ON public.departments FOR INSERT
WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update departments in accessible companies"
ON public.departments FOR UPDATE
USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete departments in accessible companies"
ON public.departments FOR DELETE
USING (public.has_company_access(auth.uid(), company_id));

DROP TRIGGER IF EXISTS update_departments_updated_at ON public.departments;
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code TEXT,
  description TEXT NOT NULL,
  family TEXT,
  ncm TEXT,
  cest TEXT,
  ean TEXT,
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  type_sped TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products(company_id);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products of accessible companies"
ON public.products FOR SELECT
USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert products in accessible companies"
ON public.products FOR INSERT
WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update products in accessible companies"
ON public.products FOR UPDATE
USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete products in accessible companies"
ON public.products FOR DELETE
USING (public.has_company_access(auth.uid(), company_id));

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  company_name TEXT,
  origin TEXT,
  status TEXT,
  cpf_cnpj TEXT,
  vertical TEXT,
  seller TEXT,
  reservation_validity DATE,
  num_employees TEXT,
  revenue_range TEXT,
  address TEXT,
  complement TEXT,
  cep TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_company_id ON public.crm_leads(company_id);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view crm_leads of accessible companies"
ON public.crm_leads FOR SELECT
USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert crm_leads in accessible companies"
ON public.crm_leads FOR INSERT
WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update crm_leads in accessible companies"
ON public.crm_leads FOR UPDATE
USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete crm_leads in accessible companies"
ON public.crm_leads FOR DELETE
USING (public.has_company_access(auth.uid(), company_id));

DROP TRIGGER IF EXISTS update_crm_leads_updated_at ON public.crm_leads;
CREATE TRIGGER update_crm_leads_updated_at
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  account_name TEXT,
  position TEXT,
  email TEXT,
  phone TEXT,
  cell_1 TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_company_id ON public.crm_contacts(company_id);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view crm_contacts of accessible companies"
ON public.crm_contacts FOR SELECT
USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert crm_contacts in accessible companies"
ON public.crm_contacts FOR INSERT
WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update crm_contacts in accessible companies"
ON public.crm_contacts FOR UPDATE
USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete crm_contacts in accessible companies"
ON public.crm_contacts FOR DELETE
USING (public.has_company_access(auth.uid(), company_id));

DROP TRIGGER IF EXISTS update_crm_contacts_updated_at ON public.crm_contacts;
CREATE TRIGGER update_crm_contacts_updated_at
BEFORE UPDATE ON public.crm_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  account_name TEXT,
  description TEXT,
  solution TEXT,
  phase TEXT,
  total_value DECIMAL(15,2),
  expected_month INTEGER,
  expected_year INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_company_id ON public.opportunities(company_id);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view opportunities of accessible companies"
ON public.opportunities FOR SELECT
USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert opportunities in accessible companies"
ON public.opportunities FOR INSERT
WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update opportunities in accessible companies"
ON public.opportunities FOR UPDATE
USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete opportunities in accessible companies"
ON public.opportunities FOR DELETE
USING (public.has_company_access(auth.uid(), company_id));

DROP TRIGGER IF EXISTS update_opportunities_updated_at ON public.opportunities;
CREATE TRIGGER update_opportunities_updated_at
BEFORE UPDATE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

