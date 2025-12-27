-- Adicionando campos extras para Clientes
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT,
ADD COLUMN IF NOT EXISTS inscricao_suframa TEXT,
ADD COLUMN IF NOT EXISTS cnae TEXT,
ADD COLUMN IF NOT EXISTS tipo_atividade TEXT,
ADD COLUMN IF NOT EXISTS contato_nome TEXT,
ADD COLUMN IF NOT EXISTS telefone_2 TEXT,
ADD COLUMN IF NOT EXISTS fax TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS optante_simples BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS produtor_rural BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contribuinte BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS observacoes_internas TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_banco TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_agencia TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_conta TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_tipo TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_pix TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_titular_cpf_cnpj TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_titular_nome TEXT;

-- Garantindo campos extras para Fornecedores
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT,
ADD COLUMN IF NOT EXISTS inscricao_suframa TEXT,
ADD COLUMN IF NOT EXISTS cnae TEXT,
ADD COLUMN IF NOT EXISTS tipo_atividade TEXT,
ADD COLUMN IF NOT EXISTS contato_nome TEXT,
ADD COLUMN IF NOT EXISTS telefone_2 TEXT,
ADD COLUMN IF NOT EXISTS fax TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS optante_simples BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS produtor_rural BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contribuinte BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS observacoes_internas TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_titular_cpf_cnpj TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_titular_nome TEXT;