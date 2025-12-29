-- Company documents table (DOC1: Cartão CNPJ, A1, etc.)

CREATE TABLE IF NOT EXISTS public.company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_documents_company_id ON public.company_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_company_documents_company_doc_type ON public.company_documents(company_id, doc_type);

ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_documents_select" ON public.company_documents;
CREATE POLICY "company_documents_select"
  ON public.company_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_documents.company_id
    )
  );

DROP POLICY IF EXISTS "company_documents_insert" ON public.company_documents;
CREATE POLICY "company_documents_insert"
  ON public.company_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_documents.company_id
    )
  );

DROP POLICY IF EXISTS "company_documents_delete" ON public.company_documents;
CREATE POLICY "company_documents_delete"
  ON public.company_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_documents.company_id
    )
  );

DROP POLICY IF EXISTS "company_documents_update" ON public.company_documents;
CREATE POLICY "company_documents_update"
  ON public.company_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_documents.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_documents.company_id
    )
  );

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-documents', 'company-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (path: <company_id>/<doc_type>/<filename>)
DROP POLICY IF EXISTS "company_documents_storage_select" ON storage.objects;
CREATE POLICY "company_documents_storage_select"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'company-documents'
    AND EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = uc.company_id::text
    )
  );

DROP POLICY IF EXISTS "company_documents_storage_insert" ON storage.objects;
CREATE POLICY "company_documents_storage_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'company-documents'
    AND EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = uc.company_id::text
    )
  );

DROP POLICY IF EXISTS "company_documents_storage_delete" ON storage.objects;
CREATE POLICY "company_documents_storage_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'company-documents'
    AND EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = uc.company_id::text
    )
  );

DROP POLICY IF EXISTS "company_documents_storage_update" ON storage.objects;
CREATE POLICY "company_documents_storage_update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'company-documents'
    AND EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = uc.company_id::text
    )
  )
  WITH CHECK (
    bucket_id = 'company-documents'
    AND EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = uc.company_id::text
    )
  );
