ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS logo_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "client_logos_storage_select" ON storage.objects;
CREATE POLICY "client_logos_storage_select"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'client-logos'
    AND EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = uc.company_id::text
    )
  );

DROP POLICY IF EXISTS "client_logos_storage_insert" ON storage.objects;
CREATE POLICY "client_logos_storage_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'client-logos'
    AND EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = uc.company_id::text
    )
  );

DROP POLICY IF EXISTS "client_logos_storage_delete" ON storage.objects;
CREATE POLICY "client_logos_storage_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'client-logos'
    AND EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = uc.company_id::text
    )
  );

DROP POLICY IF EXISTS "client_logos_storage_update" ON storage.objects;
CREATE POLICY "client_logos_storage_update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'client-logos'
    AND EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = uc.company_id::text
    )
  )
  WITH CHECK (
    bucket_id = 'client-logos'
    AND EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = uc.company_id::text
    )
  );
