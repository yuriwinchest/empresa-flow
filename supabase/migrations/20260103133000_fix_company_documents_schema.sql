
-- Tabela de Documentos da Empresa (Corrigida e compatível com o schema esperado pelo frontend)
-- Frontend espera: document_type, file_path, file_name, file_size, content_type

CREATE TABLE IF NOT EXISTS company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- "cartao_cnpj", "certificado_a1"
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  content_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_doc_type_per_company UNIQUE (company_id, document_type)
);

-- Habilitar RLS
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view docs of their companies" ON company_documents;
CREATE POLICY "Users can view docs of their companies" ON company_documents
    FOR SELECT USING (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert docs for their companies" ON company_documents;
CREATE POLICY "Users can insert docs for their companies" ON company_documents
    FOR INSERT WITH CHECK (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ) OR EXISTS ( -- Permitir insert se a empresa acabou de ser criada (owner_id checado no insert da empresa)
        SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update docs of their companies" ON company_documents;
CREATE POLICY "Users can update docs of their companies" ON company_documents
    FOR UPDATE USING (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can delete docs of their companies" ON company_documents;
CREATE POLICY "Users can delete docs of their companies" ON company_documents
    FOR DELETE USING (company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
    ));
