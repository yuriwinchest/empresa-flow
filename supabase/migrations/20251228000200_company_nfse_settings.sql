CREATE TABLE IF NOT EXISTS public.company_nfse_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT,
  city_name TEXT,
  city_ibge_code TEXT,
  uf TEXT,
  environment TEXT NOT NULL DEFAULT 'homologacao' CHECK (environment IN ('homologacao', 'producao')),
  login TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

ALTER TABLE public.company_nfse_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_nfse_settings_select" ON public.company_nfse_settings;
CREATE POLICY "company_nfse_settings_select"
  ON public.company_nfse_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_nfse_settings.company_id
    )
  );

DROP POLICY IF EXISTS "company_nfse_settings_insert" ON public.company_nfse_settings;
CREATE POLICY "company_nfse_settings_insert"
  ON public.company_nfse_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_nfse_settings.company_id
    )
  );

DROP POLICY IF EXISTS "company_nfse_settings_update" ON public.company_nfse_settings;
CREATE POLICY "company_nfse_settings_update"
  ON public.company_nfse_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_nfse_settings.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_nfse_settings.company_id
    )
  );

DROP POLICY IF EXISTS "company_nfse_settings_delete" ON public.company_nfse_settings;
CREATE POLICY "company_nfse_settings_delete"
  ON public.company_nfse_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_nfse_settings.company_id
    )
  );

DROP TRIGGER IF EXISTS update_company_nfse_settings_updated_at ON public.company_nfse_settings;
CREATE TRIGGER update_company_nfse_settings_updated_at
  BEFORE UPDATE ON public.company_nfse_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

