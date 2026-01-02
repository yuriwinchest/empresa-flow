
-- Adicionar colunas faltantes para dados completos do Cartão CNPJ
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS porte text, 
ADD COLUMN IF NOT EXISTS data_abertura date,
ADD COLUMN IF NOT EXISTS situacao_cadastral text,
ADD COLUMN IF NOT EXISTS data_situacao_cadastral date;

-- Comentários para documentação
COMMENT ON COLUMN companies.porte IS 'Porte da empresa (ME, EPP, DEMAIS)';
COMMENT ON COLUMN companies.data_abertura IS 'Data de abertura da empresa';
COMMENT ON COLUMN companies.situacao_cadastral IS 'Situação cadastral (ATIVA, BAIXADA, etc)';
