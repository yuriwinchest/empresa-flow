-- Create overload for has_company_access(company_id) to default to auth.uid()
CREATE OR REPLACE FUNCTION public.has_company_access(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_company_access(auth.uid(), _company_id);
$function$;

-- Ensure chart_account_attachments table RLS
ALTER TABLE chart_account_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Attachments access policy" ON chart_account_attachments;

CREATE POLICY "Attachments access policy" ON chart_account_attachments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM chart_of_accounts ca
        WHERE ca.id = chart_account_attachments.account_id
        AND has_company_access(ca.company_id)
    )
);

-- Ensure company-docs bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-docs', 'company-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Fix Storage Policies for company-docs
DROP POLICY IF EXISTS "Company Docs Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload company docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view company docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company docs" ON storage.objects;

-- Create a comprehensive policy
CREATE POLICY "Company Docs Access" ON storage.objects
FOR ALL TO authenticated
USING (
    bucket_id = 'company-docs' 
    AND (
       -- Check if the path starts with a GUID (company_id) that the user has access to
       has_company_access(
           (regexp_match(name, '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1]::uuid
       )
    )
)
WITH CHECK (
    bucket_id = 'company-docs' 
    AND (
       has_company_access(
           (regexp_match(name, '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1]::uuid
       )
    )
);
