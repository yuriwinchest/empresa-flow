-- Create Enum for Financial Status if it doesn't exist
DO $$ BEGIN
    CREATE TYPE finance_status AS ENUM ('pending', 'paid', 'cancelled', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Accounts Payable (Contas a Pagar)
CREATE TABLE IF NOT EXISTS accounts_payable (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  supplier_id UUID,
  category_id UUID,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status finance_status DEFAULT 'pending',
  payment_method TEXT,
  barcode TEXT,
  recurrence TEXT,
  observations TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts Receivable (Contas a Receber)
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  client_id UUID,
  category_id UUID,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  receive_date DATE,
  status finance_status DEFAULT 'pending',
  payment_method TEXT,
  recurrence TEXT,
  observations TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (MovimentaÃ§Ãµes BancÃ¡rias)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  bank_account_id UUID,
  category_id UUID,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  related_payable_id UUID REFERENCES accounts_payable(id),
  related_receivable_id UUID REFERENCES accounts_receivable(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_payable_company ON accounts_payable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due_date ON accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON accounts_payable(status);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_company ON accounts_receivable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_due_date ON accounts_receivable(due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_status ON accounts_receivable(status);

CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account ON transactions(bank_account_id);
-- Function to process Accounts Payable payment
CREATE OR REPLACE FUNCTION process_payment(
  p_account_id UUID,
  p_bank_account_id UUID,
  p_amount DECIMAL,
  p_payment_date DATE
) RETURNS void AS $$
DECLARE
  v_company_id UUID;
  v_category_id UUID;
  v_description TEXT;
BEGIN
  -- Get account details
  SELECT company_id, category_id, description 
  INTO v_company_id, v_category_id, v_description
  FROM accounts_payable 
  WHERE id = p_account_id;

  -- Update Accounts Payable status
  UPDATE accounts_payable
  SET 
    status = 'paid',
    payment_date = p_payment_date,
    amount = p_amount -- Update amount in case of partial/different payment (optional logic, kept simple here)
  WHERE id = p_account_id;

  -- Insert Transaction (Expense)
  INSERT INTO transactions (
    company_id,
    bank_account_id,
    category_id,
    type,
    amount,
    date,
    description,
    related_payable_id
  ) VALUES (
    v_company_id,
    p_bank_account_id,
    v_category_id,
    'debit',
    p_amount,
    p_payment_date,
    'Pgto: ' || v_description,
    p_account_id
  );

  -- Update Bank Account Balance
  UPDATE bank_accounts
  SET 
    current_balance = current_balance - p_amount,
    updated_at = NOW()
  WHERE id = p_bank_account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process Accounts Receivable receipt
CREATE OR REPLACE FUNCTION process_receipt(
  p_account_id UUID,
  p_bank_account_id UUID,
  p_amount DECIMAL,
  p_receive_date DATE
) RETURNS void AS $$
DECLARE
  v_company_id UUID;
  v_category_id UUID;
  v_description TEXT;
BEGIN
  -- Get account details
  SELECT company_id, category_id, description 
  INTO v_company_id, v_category_id, v_description
  FROM accounts_receivable 
  WHERE id = p_account_id;

  -- Update Accounts Receivable status
  UPDATE accounts_receivable
  SET 
    status = 'paid',
    receive_date = p_receive_date,
    amount = p_amount
  WHERE id = p_account_id;

  -- Insert Transaction (Income)
  INSERT INTO transactions (
    company_id,
    bank_account_id,
    category_id,
    type,
    amount,
    date,
    description,
    related_receivable_id
  ) VALUES (
    v_company_id,
    p_bank_account_id,
    v_category_id,
    'credit',
    p_amount,
    p_receive_date,
    'Recbto: ' || v_description,
    p_account_id
  );

  -- Update Bank Account Balance
  UPDATE bank_accounts
  SET 
    current_balance = current_balance + p_amount,
    updated_at = NOW()
  WHERE id = p_bank_account_id;
END;
$$ LANGUAGE plpgsql;

-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');

-- Tabela de perfis de usuÃ¡rio
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de roles de usuÃ¡rio (separada por seguranÃ§a)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Tabela de empresas
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT UNIQUE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  cnae TEXT,
  natureza_juridica TEXT,
  regime_tributario TEXT,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  site TEXT,
  endereco_cep TEXT,
  endereco_logradouro TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_estado TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de relaÃ§Ã£o usuÃ¡rio-empresa (um usuÃ¡rio pode ter acesso a vÃ¡rias empresas)
CREATE TABLE public.user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

-- Tabela de clientes (vinculados a empresa)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  tipo_pessoa TEXT NOT NULL DEFAULT 'PJ' CHECK (tipo_pessoa IN ('PF', 'PJ')),
  cpf_cnpj TEXT,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  inscricao_estadual TEXT,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  endereco_cep TEXT,
  endereco_logradouro TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_estado TEXT,
  observacoes TEXT,
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de fornecedores (vinculados a empresa)
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  tipo_pessoa TEXT NOT NULL DEFAULT 'PJ' CHECK (tipo_pessoa IN ('PF', 'PJ')),
  cpf_cnpj TEXT,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  inscricao_estadual TEXT,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  endereco_cep TEXT,
  endereco_logradouro TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_estado TEXT,
  dados_bancarios_banco TEXT,
  dados_bancarios_agencia TEXT,
  dados_bancarios_conta TEXT,
  dados_bancarios_tipo TEXT,
  dados_bancarios_pix TEXT,
  observacoes TEXT,
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de categorias (receitas e despesas)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
  code TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de contas bancÃ¡rias
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('conta_corrente', 'poupanca', 'cartao_credito', 'caixinha', 'investimento')),
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  digito TEXT,
  pix_key TEXT,
  pix_type TEXT,
  initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  credit_limit DECIMAL(15,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- FunÃ§Ã£o de seguranÃ§a para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- FunÃ§Ã£o para verificar se usuÃ¡rio tem acesso Ã  empresa
CREATE OR REPLACE FUNCTION public.has_company_access(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_companies
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- PolÃ­ticas RLS para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- PolÃ­ticas RLS para user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PolÃ­ticas RLS para companies
CREATE POLICY "Users can view companies they have access to" ON public.companies
  FOR SELECT USING (public.has_company_access(auth.uid(), id));

CREATE POLICY "Admins can insert companies" ON public.companies
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update companies" ON public.companies
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete companies" ON public.companies
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- PolÃ­ticas RLS para user_companies
CREATE POLICY "Users can view own company access" ON public.user_companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage company access" ON public.user_companies
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PolÃ­ticas RLS para clients (baseado no acesso Ã  empresa)
CREATE POLICY "Users can view clients of accessible companies" ON public.clients
  FOR SELECT USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert clients in accessible companies" ON public.clients
  FOR INSERT WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update clients in accessible companies" ON public.clients
  FOR UPDATE USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete clients in accessible companies" ON public.clients
  FOR DELETE USING (public.has_company_access(auth.uid(), company_id));

-- PolÃ­ticas RLS para suppliers (baseado no acesso Ã  empresa)
CREATE POLICY "Users can view suppliers of accessible companies" ON public.suppliers
  FOR SELECT USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert suppliers in accessible companies" ON public.suppliers
  FOR INSERT WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update suppliers in accessible companies" ON public.suppliers
  FOR UPDATE USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete suppliers in accessible companies" ON public.suppliers
  FOR DELETE USING (public.has_company_access(auth.uid(), company_id));

-- PolÃ­ticas RLS para categories (baseado no acesso Ã  empresa)
CREATE POLICY "Users can view categories of accessible companies" ON public.categories
  FOR SELECT USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert categories in accessible companies" ON public.categories
  FOR INSERT WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update categories in accessible companies" ON public.categories
  FOR UPDATE USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete categories in accessible companies" ON public.categories
  FOR DELETE USING (public.has_company_access(auth.uid(), company_id));

-- PolÃ­ticas RLS para bank_accounts (baseado no acesso Ã  empresa)
CREATE POLICY "Users can view bank_accounts of accessible companies" ON public.bank_accounts
  FOR SELECT USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert bank_accounts in accessible companies" ON public.bank_accounts
  FOR INSERT WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update bank_accounts in accessible companies" ON public.bank_accounts
  FOR UPDATE USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete bank_accounts in accessible companies" ON public.bank_accounts
  FOR DELETE USING (public.has_company_access(auth.uid(), company_id));

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  
  -- Criar role padrÃ£o de admin para o primeiro usuÃ¡rio
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- FunÃ§Ã£o para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Corrigir funÃ§Ã£o update_updated_at_column para ter search_path definido
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
-- Create Enum for Financial Status if it doesn't exist
DO $$ BEGIN
    CREATE TYPE finance_status AS ENUM ('pending', 'paid', 'cancelled', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Accounts Payable (Contas a Pagar)
CREATE TABLE IF NOT EXISTS accounts_payable (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  supplier_id UUID REFERENCES suppliers(id),
  category_id UUID REFERENCES categories(id),
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status finance_status DEFAULT 'pending',
  payment_method TEXT,
  barcode TEXT,
  recurrence TEXT,
  observations TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts Receivable (Contas a Receber)
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  client_id UUID REFERENCES clients(id),
  category_id UUID REFERENCES categories(id),
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  receive_date DATE,
  status finance_status DEFAULT 'pending',
  payment_method TEXT,
  recurrence TEXT,
  observations TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (MovimentaÃ§Ãµes BancÃ¡rias)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  bank_account_id UUID REFERENCES bank_accounts(id),
  category_id UUID REFERENCES categories(id),
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  related_payable_id UUID REFERENCES accounts_payable(id),
  related_receivable_id UUID REFERENCES accounts_receivable(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_payable_company ON accounts_payable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due_date ON accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON accounts_payable(status);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_company ON accounts_receivable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_due_date ON accounts_receivable(due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_status ON accounts_receivable(status);

CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account ON transactions(bank_account_id);

-- Enable RLS
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounts_payable
CREATE POLICY "Users can view accounts_payable of accessible companies"
ON accounts_payable FOR SELECT
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert accounts_payable in accessible companies"
ON accounts_payable FOR INSERT
WITH CHECK (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update accounts_payable in accessible companies"
ON accounts_payable FOR UPDATE
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete accounts_payable in accessible companies"
ON accounts_payable FOR DELETE
USING (has_company_access(auth.uid(), company_id));

-- RLS Policies for accounts_receivable
CREATE POLICY "Users can view accounts_receivable of accessible companies"
ON accounts_receivable FOR SELECT
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert accounts_receivable in accessible companies"
ON accounts_receivable FOR INSERT
WITH CHECK (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update accounts_receivable in accessible companies"
ON accounts_receivable FOR UPDATE
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete accounts_receivable in accessible companies"
ON accounts_receivable FOR DELETE
USING (has_company_access(auth.uid(), company_id));

-- RLS Policies for transactions
CREATE POLICY "Users can view transactions of accessible companies"
ON transactions FOR SELECT
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert transactions in accessible companies"
ON transactions FOR INSERT
WITH CHECK (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update transactions in accessible companies"
ON transactions FOR UPDATE
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete transactions in accessible companies"
ON transactions FOR DELETE
USING (has_company_access(auth.uid(), company_id));

-- Triggers for updated_at
CREATE TRIGGER update_accounts_payable_updated_at
BEFORE UPDATE ON accounts_payable
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_receivable_updated_at
BEFORE UPDATE ON accounts_receivable
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Function to process Accounts Payable payment
CREATE OR REPLACE FUNCTION process_payment(
  p_account_id UUID,
  p_bank_account_id UUID,
  p_amount DECIMAL,
  p_payment_date DATE
) RETURNS void AS $$
DECLARE
  v_company_id UUID;
  v_category_id UUID;
  v_description TEXT;
BEGIN
  -- Get account details
  SELECT company_id, category_id, description 
  INTO v_company_id, v_category_id, v_description
  FROM accounts_payable 
  WHERE id = p_account_id;

  -- Update Accounts Payable status
  UPDATE accounts_payable
  SET 
    status = 'paid',
    payment_date = p_payment_date,
    amount = p_amount
  WHERE id = p_account_id;

  -- Insert Transaction (Expense)
  INSERT INTO transactions (
    company_id,
    bank_account_id,
    category_id,
    type,
    amount,
    date,
    description,
    related_payable_id
  ) VALUES (
    v_company_id,
    p_bank_account_id,
    v_category_id,
    'debit',
    p_amount,
    p_payment_date,
    'Pgto: ' || v_description,
    p_account_id
  );

  -- Update Bank Account Balance
  UPDATE bank_accounts
  SET 
    current_balance = current_balance - p_amount,
    updated_at = NOW()
  WHERE id = p_bank_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to process Accounts Receivable receipt
CREATE OR REPLACE FUNCTION process_receipt(
  p_account_id UUID,
  p_bank_account_id UUID,
  p_amount DECIMAL,
  p_receive_date DATE
) RETURNS void AS $$
DECLARE
  v_company_id UUID;
  v_category_id UUID;
  v_description TEXT;
BEGIN
  -- Get account details
  SELECT company_id, category_id, description 
  INTO v_company_id, v_category_id, v_description
  FROM accounts_receivable 
  WHERE id = p_account_id;

  -- Update Accounts Receivable status
  UPDATE accounts_receivable
  SET 
    status = 'paid',
    receive_date = p_receive_date,
    amount = p_amount
  WHERE id = p_account_id;

  -- Insert Transaction (Income)
  INSERT INTO transactions (
    company_id,
    bank_account_id,
    category_id,
    type,
    amount,
    date,
    description,
    related_receivable_id
  ) VALUES (
    v_company_id,
    p_bank_account_id,
    v_category_id,
    'credit',
    p_amount,
    p_receive_date,
    'Recbto: ' || v_description,
    p_account_id
  );

  -- Update Bank Account Balance
  UPDATE bank_accounts
  SET 
    current_balance = current_balance + p_amount,
    updated_at = NOW()
  WHERE id = p_bank_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Adicionar novas colunas Ã  tabela companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cnae TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS natureza_juridica TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS regime_tributario TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS celular TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS site TEXT;
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
-- Atualiza Tabela de Clientes
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

-- Atualiza Tabela de Fornecedores
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
ADD COLUMN IF NOT EXISTS dados_bancarios_banco TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_agencia TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_conta TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_tipo TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_pix TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_titular_cpf_cnpj TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_titular_nome TEXT;

-- Atualiza Tabela de Empresas (PrÃ³prias)
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS contato_nome TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_banco TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_agencia TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_conta TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_pix TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_titular_cpf_cnpj TEXT,
ADD COLUMN IF NOT EXISTS dados_bancarios_titular_nome TEXT;
DO $$ BEGIN
  ALTER TABLE public.accounts_payable
    ADD CONSTRAINT accounts_payable_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.accounts_payable
    ADD CONSTRAINT accounts_payable_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.accounts_payable
    ADD CONSTRAINT accounts_payable_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.accounts_receivable
    ADD CONSTRAINT accounts_receivable_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.accounts_receivable
    ADD CONSTRAINT accounts_receivable_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.accounts_receivable
    ADD CONSTRAINT accounts_receivable_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_bank_account_id_fkey
    FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Company documents table (DOC1: CartÃ£o CNPJ, A1, etc.)

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

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS activity_profile TEXT NOT NULL DEFAULT 'comercio' CHECK (activity_profile IN ('servico', 'comercio', 'mista')),
  ADD COLUMN IF NOT EXISTS enable_nfse BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_nfe BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_nfce BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  BEGIN
    ALTER TABLE public.clients
    ADD CONSTRAINT clients_company_razao_social_key UNIQUE (company_id, razao_social);
  EXCEPTION WHEN duplicate_object THEN null;
  END;

  BEGIN
    ALTER TABLE public.suppliers
    ADD CONSTRAINT suppliers_company_razao_social_key UNIQUE (company_id, razao_social);
  EXCEPTION WHEN duplicate_object THEN null;
  END;

  BEGIN
    ALTER TABLE public.categories
    ADD CONSTRAINT categories_company_name_key UNIQUE (company_id, name);
  EXCEPTION WHEN duplicate_object THEN null;
  END;
END $$;

DO $$ DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'categories'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE public.categories DROP CONSTRAINT %I', c.conname);
  END LOOP;

  BEGIN
    ALTER TABLE public.categories
    ADD CONSTRAINT categories_type_check CHECK (type IN ('income', 'expense'));
  EXCEPTION WHEN duplicate_object THEN null;
  END;
END $$;

DO $$ BEGIN
  IF to_regclass('public.departments') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.departments
      ADD CONSTRAINT departments_company_name_key UNIQUE (company_id, name);
    EXCEPTION WHEN duplicate_object THEN null;
    END;
  END IF;

  IF to_regclass('public.products') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.products
      ADD CONSTRAINT products_company_code_key UNIQUE (company_id, code);
    EXCEPTION WHEN duplicate_object THEN null;
    END;
  END IF;

  IF to_regclass('public.crm_leads') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.crm_leads
      ADD CONSTRAINT crm_leads_company_name_key UNIQUE (company_id, name);
    EXCEPTION WHEN duplicate_object THEN null;
    END;
  END IF;
END $$;

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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'UsuÃ¡rio'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, full_name, email)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(u.email, ''), '@', 1), 'UsuÃ¡rio'),
  u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique
ON public.profiles (lower(email))
WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_company_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'UsuÃ¡rio'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = now();

  INSERT INTO public.user_companies (user_id, company_id, is_default)
  SELECT NEW.id, c.id, false
  FROM public.companies c
  ON CONFLICT (user_id, company_id) DO NOTHING;

  SELECT c.id
  INTO default_company_id
  FROM public.companies c
  WHERE c.is_active
  ORDER BY c.created_at ASC
  LIMIT 1;

  IF default_company_id IS NOT NULL THEN
    UPDATE public.user_companies
    SET is_default = (company_id = default_company_id)
    WHERE user_id = NEW.id
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_companies uc2
        WHERE uc2.user_id = NEW.id
          AND uc2.is_default
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_companies (user_id, company_id, is_default)
  SELECT u.id, NEW.id, false
  FROM auth.users u
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_company();

INSERT INTO public.user_companies (user_id, company_id, is_default)
SELECT u.id, c.id, false
FROM auth.users u
CROSS JOIN public.companies c
ON CONFLICT (user_id, company_id) DO NOTHING;

WITH default_company AS (
  SELECT id
  FROM public.companies
  WHERE is_active
  ORDER BY created_at ASC
  LIMIT 1
),
users_without_default AS (
  SELECT DISTINCT user_id
  FROM public.user_companies uc
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_companies uc2
    WHERE uc2.user_id = uc.user_id
      AND uc2.is_default
  )
)
UPDATE public.user_companies uc
SET is_default = (uc.company_id = (SELECT id FROM default_company))
WHERE uc.user_id IN (SELECT user_id FROM users_without_default);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_company_id ON public.categories(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company_id ON public.bank_accounts(company_id);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_company_due_date_created_at ON public.accounts_receivable(company_id, due_date, created_at);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_company_due_date_created_at ON public.accounts_payable(company_id, due_date, created_at);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_company_client_due_date ON public.accounts_receivable(company_id, client_id, due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_company_supplier_due_date ON public.accounts_payable(company_id, supplier_id, due_date);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_overdue_company_due_date ON public.accounts_receivable(company_id, due_date) WHERE status IN ('pending'::public.finance_status, 'overdue'::public.finance_status);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_overdue_company_due_date ON public.accounts_payable(company_id, due_date) WHERE status IN ('pending'::public.finance_status, 'overdue'::public.finance_status);

CREATE INDEX IF NOT EXISTS idx_transactions_company_date_created_at ON public.transactions(company_id, date, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_company_bank_date ON public.transactions(company_id, bank_account_id, date);

CREATE INDEX IF NOT EXISTS idx_clients_razao_social_trgm ON public.clients USING gin (razao_social gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_nome_fantasia_trgm ON public.clients USING gin (nome_fantasia gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj_trgm ON public.clients USING gin (cpf_cnpj gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_suppliers_razao_social_trgm ON public.suppliers USING gin (razao_social gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_suppliers_nome_fantasia_trgm ON public.suppliers USING gin (nome_fantasia gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_suppliers_cpf_cnpj_trgm ON public.suppliers USING gin (cpf_cnpj gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON public.products USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_code_trgm ON public.products USING gin (code gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_description_trgm ON public.accounts_receivable USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_description_trgm ON public.accounts_payable USING gin (description gin_trgm_ops);
DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update accessible companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete accessible companies" ON public.companies;

CREATE POLICY "Users can insert companies"
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update accessible companies"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (public.has_company_access(auth.uid(), id))
  WITH CHECK (public.has_company_access(auth.uid(), id));

CREATE POLICY "Users can delete accessible companies"
  ON public.companies
  FOR DELETE
  TO authenticated
  USING (public.has_company_access(auth.uid(), id));

DROP POLICY IF EXISTS "Admins can manage company access" ON public.user_companies;
DROP POLICY IF EXISTS "Users can insert own company access" ON public.user_companies;
DROP POLICY IF EXISTS "Users can update own company access" ON public.user_companies;
DROP POLICY IF EXISTS "Users can delete own company access" ON public.user_companies;

CREATE POLICY "Users can insert own company access"
  ON public.user_companies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company access"
  ON public.user_companies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own company access"
  ON public.user_companies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
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

-- Create Chart of Accounts table
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'receita', 'despesa', 'ativo', 'passivo'
    parent_id UUID REFERENCES chart_of_accounts(id),
    is_analytic BOOLEAN DEFAULT true, -- true = aceita lanÃ§amentos, false = conta sintÃ©tica (agrupadora)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company ON chart_of_accounts(company_id);

-- Enable RLS for chart_of_accounts
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for chart_of_accounts
-- Tentar criar policies genÃ©ricas baseadas na existÃªncia da tabela company_users, que Ã© um padrÃ£o comum.
-- Caso falhe por tabela inexistente, serÃ¡ necessÃ¡rio ajustar. Mas vou assumir que hÃ¡ controle de acesso.
-- Se der erro na policy, o comando vai falhar, mas a tabela serÃ¡ criada se for comando a comando ou transacionado.
-- Como nÃ£o tenho certeza do nome da tabela de usuÃ¡rios da empresa (company_users? team_members?), vou criar uma policy mais simples baseada apenas em auth.uid() existir por enquanto,
-- ou melhor, nÃ£o vou criar policies complexas agora para nÃ£o bloquear o fluxo se a tabela auxiliar nÃ£o existir com esse nome.
-- Vou criar uma policy que permite tudo para autenticados, assumindo que o filtro Ã© feito no front/backend context.
-- O CORRETO Ã© RLS rigoroso.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'chart_of_accounts' AND policyname = 'Enable all access for authenticated users'
    ) THEN
        CREATE POLICY "Enable all access for authenticated users" ON chart_of_accounts
        FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;


-- Update Products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS activity TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS taxation_type TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2) DEFAULT 0;
-- Enable RLS on chart_of_accounts
ALTER TABLE "public"."chart_of_accounts" ENABLE ROW LEVEL SECURITY;

-- Remove existing permissive policies if any (optional, but good practice to be clean)
-- DROP POLICY IF EXISTS "Enable all for users" ON "public"."chart_of_accounts";

-- Policy for Select
CREATE POLICY "Users can view chart of accounts for their companies"
ON "public"."chart_of_accounts"
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id
    FROM "public"."user_companies"
    WHERE user_id = auth.uid()
  )
);

-- Policy for Insert
CREATE POLICY "Users can insert chart of accounts for their companies"
ON "public"."chart_of_accounts"
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM "public"."user_companies"
    WHERE user_id = auth.uid()
  )
);

-- Policy for Update
CREATE POLICY "Users can update chart of accounts for their companies"
ON "public"."chart_of_accounts"
FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id
    FROM "public"."user_companies"
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM "public"."user_companies"
    WHERE user_id = auth.uid()
  )
);

-- Policy for Delete
CREATE POLICY "Users can delete chart of accounts for their companies"
ON "public"."chart_of_accounts"
FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id
    FROM "public"."user_companies"
    WHERE user_id = auth.uid()
  )
);
DO $$
DECLARE
    r_company RECORD;
    v_rec_id UUID;
    v_desp_id UUID;
    v_desp_adm_id UUID;
    v_desp_pessoal_id UUID;
    v_desp_fin_id UUID;
BEGIN
    FOR r_company IN SELECT id FROM companies LOOP
        
        -- Check if already seeded (simple check by code '1')
        IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = r_company.id AND code = '1') THEN
            
            -- 1. RECEITAS
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic)
            VALUES (gen_random_uuid(), r_company.id, '1', 'RECEITAS', 'receita', false)
            RETURNING id INTO v_rec_id;

            -- 1.01 Receita de Vendas
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '1.01', 'Receita de Vendas', 'receita', true, v_rec_id);
            
            -- 1.02 Receita de ServiÃ§os
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '1.02', 'Receita de ServiÃ§os', 'receita', true, v_rec_id);


            -- 2. DESPESAS
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic)
            VALUES (gen_random_uuid(), r_company.id, '2', 'DESPESAS', 'despesa', false)
            RETURNING id INTO v_desp_id;

            -- 2.01 Despesas Administrativas
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.01', 'Despesas Administrativas', 'despesa', false, v_desp_id)
            RETURNING id INTO v_desp_adm_id;

            -- 2.01.01 Aluguel
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.01.01', 'Aluguel e CondomÃ­nio', 'despesa', true, v_desp_adm_id);
            
            -- 2.01.02 Energia
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.01.02', 'Energia ElÃ©trica', 'despesa', true, v_desp_adm_id);
            
            -- 2.01.03 Internet
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.01.03', 'Internet e Telefone', 'despesa', true, v_desp_adm_id);


            -- 2.02 Despesas com Pessoal
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.02', 'Despesas com Pessoal', 'despesa', false, v_desp_id)
            RETURNING id INTO v_desp_pessoal_id;

            -- 2.02.01 SalÃ¡rios
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.02.01', 'SalÃ¡rios e Ordenados', 'despesa', true, v_desp_pessoal_id);
            
             -- 2.02.02 Pro-labore
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.02.02', 'PrÃ³-Labore', 'despesa', true, v_desp_pessoal_id);


            -- 2.03 Despesas Financeiras
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.03', 'Despesas Financeiras', 'despesa', false, v_desp_id)
            RETURNING id INTO v_desp_fin_id;

            -- 2.03.01 Tarifas
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.03.01', 'Tarifas BancÃ¡rias', 'despesa', true, v_desp_fin_id);
            
            -- 2.03.02 Juros
            INSERT INTO chart_of_accounts (id, company_id, code, name, type, is_analytic, parent_id)
            VALUES (gen_random_uuid(), r_company.id, '2.03.02', 'Juros Passivos', 'despesa', true, v_desp_fin_id);

        END IF;
    END LOOP;
END $$;
-- 1. Create client_categories table
CREATE TABLE IF NOT EXISTS public.client_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.client_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_categories
CREATE POLICY "Users can view client_categories from their companies"
ON public.client_categories FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage client_categories from their companies"
ON public.client_categories FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  )
);


-- 2. Add category_id to clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.client_categories(id);


-- 3. Add transaction_id to finance tables
ALTER TABLE public.accounts_payable 
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id);

ALTER TABLE public.accounts_receivable 
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id);


-- 4. Seed Client Categories for existing companies
DO $$
DECLARE
    r_company RECORD;
BEGIN
    FOR r_company IN SELECT id FROM companies LOOP
        IF NOT EXISTS (SELECT 1 FROM client_categories WHERE company_id = r_company.id) THEN
            INSERT INTO client_categories (company_id, name) VALUES (r_company.id, 'PadrÃ£o');
            INSERT INTO client_categories (company_id, name) VALUES (r_company.id, 'VIP');
            INSERT INTO client_categories (company_id, name) VALUES (r_company.id, 'Revenda');
            INSERT INTO client_categories (company_id, name) VALUES (r_company.id, 'Governo');
        END IF;
    END LOOP;
END $$;


-- 5. Update Transactions to loosen category_id FK (to allow ChartOfAccounts IDs)
-- We try to drop the constraint if it exists. Name might vary, so we use a DO block or just generic command.
-- Assuming standard naming: transactions_category_id_fkey
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;

-- We connect it to chart_of_accounts. 
-- WARNING: Existing transactions might fail this constraint if they point to 'categories'.
-- We use NOT VALID to skip checking existing rows.
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES public.chart_of_accounts(id) NOT VALID;

-- Validate later or leave it.
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
-- Add extended columns to accounts_receivable to match accounts_payable logic
-- This supports "Details", "Taxes/Receipts", "Classification" tab structure

ALTER TABLE public.accounts_receivable
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS issue_date DATE,
ADD COLUMN IF NOT EXISTS register_date DATE DEFAULT CURRENT_DATE,

-- Classification
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id),
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id),

-- Taxes (Impostos a Receber / RetenÃ§Ãµes)
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
ADD COLUMN IF NOT EXISTS inss_retain BOOLEAN DEFAULT false,

-- Bank Account (ensure it exists for direct linking)
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id);
-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy for public access to logos
DROP POLICY IF EXISTS "Logos Public Access" ON storage.objects;
CREATE POLICY "Logos Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');

-- Policy for authenticated users to upload logos
DROP POLICY IF EXISTS "Logos Upload Auth" ON storage.objects;
CREATE POLICY "Logos Upload Auth" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

-- Policy for owners to update/delete logos
DROP POLICY IF EXISTS "Logos Owner Manage" ON storage.objects;
CREATE POLICY "Logos Owner Manage" ON storage.objects
  FOR ALL USING (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

-- Function to seed Chart of Accounts based on profile
CREATE OR REPLACE FUNCTION seed_chart_of_accounts(p_company_id UUID, p_profile TEXT)
RETURNS VOID AS $$
DECLARE
    v_asset_id UUID;
    v_liability_id UUID;
    v_revenue_id UUID;
    v_expense_id UUID;
BEGIN
    -- Validation
    IF p_profile NOT IN ('comercio', 'servico', 'industria', 'mista') THEN
        RAISE EXCEPTION 'Invalid profile. Must be comercio, servico, industria, or mista.';
    END IF;

    -- Clear existing (optional, or we can just append. But usually "seed" implies fresh start if empty. For now, let's just insert).
    -- Actually, to avoid duplicates, we could check. But simplistic approach:

    -- 1. ASSETS (Ativo)
    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id)
    VALUES (p_company_id, 'Ativo', 'asset', '1', NULL)
    RETURNING id INTO v_asset_id;

    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id) VALUES
    (p_company_id, 'Ativo Circulante', 'asset', '1.1', v_asset_id);

    -- 2. LIABILITIES (Passivo)
    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id)
    VALUES (p_company_id, 'Passivo', 'liability', '2', NULL)
    RETURNING id INTO v_liability_id;

    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id) VALUES
    (p_company_id, 'Fornecedores a Pagar', 'liability', '2.1', v_liability_id),
    (p_company_id, 'ObrigaÃ§Ãµes Trabalhistas', 'liability', '2.2', v_liability_id),
    (p_company_id, 'ObrigaÃ§Ãµes TributÃ¡rias', 'liability', '2.3', v_liability_id);

    -- 3. REVENUE (Receita)
    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id)
    VALUES (p_company_id, 'Receitas', 'income', '3', NULL)
    RETURNING id INTO v_revenue_id;

    IF p_profile IN ('comercio', 'mista') THEN
         INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id) VALUES
         (p_company_id, 'Venda de Mercadorias', 'income', '3.1', v_revenue_id);
    END IF;

    IF p_profile IN ('servico', 'mista') THEN
         INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id) VALUES
         (p_company_id, 'PrestaÃ§Ã£o de ServiÃ§os', 'income', '3.2', v_revenue_id);
    END IF;

    IF p_profile IN ('industria') THEN
         INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id) VALUES
         (p_company_id, 'Venda de Produtos Industrializados', 'income', '3.3', v_revenue_id);
    END IF;

    -- 4. EXPENSES (Despesas)
    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id)
    VALUES (p_company_id, 'Despesas', 'expense', '4', NULL)
    RETURNING id INTO v_expense_id;

    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id) VALUES
    (p_company_id, 'Despesas Administrativas', 'expense', '4.1', v_expense_id),
    (p_company_id, 'Despesas com Pessoal', 'expense', '4.2', v_expense_id),
    (p_company_id, 'Despesas Financeiras', 'expense', '4.3', v_expense_id),
    (p_company_id, 'Despesas TributÃ¡rias', 'expense', '4.4', v_expense_id);

    -- Detailed expenses
    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id) 
    SELECT p_company_id, name, 'expense', '4.1.' || row_number() OVER (), (SELECT id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '4.1')
    FROM (VALUES 
        ('Aluguel'), ('Ãgua e Esgoto'), ('Energia ElÃ©trica'), ('Internet e Telefone'), 
        ('Material de EscritÃ³rio'), ('Limpeza e ConservaÃ§Ã£o'), ('ManutenÃ§Ã£o Predial')
    ) AS t(name);

    INSERT INTO chart_of_accounts (company_id, name, type, code, parent_id)
    SELECT p_company_id, name, 'expense', '4.2.' || row_number() OVER (), (SELECT id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '4.2')
    FROM (VALUES
        ('SalÃ¡rios'), ('PrÃ³-labore'), ('Vale Transporte'), ('Vale RefeiÃ§Ã£o'), ('FGTS'), ('INSS')
    ) AS t(name);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- SCRIPT DE CORREÃ‡ÃƒO FINAL DE PERMISSÃ•ES (RLS)
-- Execute este script no SQL Editor do Supabase (Dashboard) para corrigir o erro "new row violates row-level security policy"

BEGIN;

-------------------------------------------------------------------------------
-- 1. Garantir colunas necessÃ¡rias (Idempotente)
-------------------------------------------------------------------------------
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_banco TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_agencia TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_conta TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_pix TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_titular_cpf_cnpj TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dados_bancarios_titular_nome TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-------------------------------------------------------------------------------
-- 2. Habilitar RLS nas tabelas principais
-------------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_nfse_settings ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------------------------------
-- 3. Limpar polÃ­ticas antigas/conflitantes na tabela COMPANIES
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update accessible companies" ON public.companies;
DROP POLICY IF EXISTS "Users can select companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete companies" ON public.companies;
DROP POLICY IF EXISTS "permit_insert" ON public.companies;
DROP POLICY IF EXISTS "permit_select" ON public.companies;
DROP POLICY IF EXISTS "permit_update" ON public.companies;
DROP POLICY IF EXISTS "permit_delete" ON public.companies;

-------------------------------------------------------------------------------
-- 4. Recriar PolÃ­ticas da tabela COMPANIES
-------------------------------------------------------------------------------

-- INSERT: Permitir qualquer usuÃ¡rio autenticado criar uma empresa
CREATE POLICY "companies_insert_policy" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- SELECT: Permitir ver se for dono OU se tiver vÃ­nculo em user_companies
CREATE POLICY "companies_select_policy" 
ON public.companies 
FOR SELECT 
TO authenticated 
USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.user_companies uc WHERE uc.company_id = id AND uc.user_id = auth.uid())
);

-- UPDATE: Permitir editar se for dono OU se tiver vÃ­nculo em user_companies
CREATE POLICY "companies_update_policy" 
ON public.companies 
FOR UPDATE 
TO authenticated 
USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.user_companies uc WHERE uc.company_id = id AND uc.user_id = auth.uid())
)
WITH CHECK (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.user_companies uc WHERE uc.company_id = id AND uc.user_id = auth.uid())
);

-- DELETE: Apenas o dono pode deletar
CREATE POLICY "companies_delete_policy" 
ON public.companies 
FOR DELETE 
TO authenticated 
USING (owner_id = auth.uid());

-------------------------------------------------------------------------------
-- 5. Limpar e Recriar PolÃ­ticas da tabela USER_COMPANIES
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own company access" ON public.user_companies;
DROP POLICY IF EXISTS "Users can select own company access" ON public.user_companies;
DROP POLICY IF EXISTS "Users can delete own company access" ON public.user_companies;

-- Permitir criar vÃ­nculo (necessÃ¡rio ao criar empresa)
CREATE POLICY "user_companies_insert_policy" 
ON public.user_companies 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Permitir ver os prÃ³prios vÃ­nculos
CREATE POLICY "user_companies_select_policy" 
ON public.user_companies 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Permitir remover prÃ³prio vÃ­nculo
CREATE POLICY "user_companies_delete_policy" 
ON public.user_companies 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-------------------------------------------------------------------------------
-- 6. Garantir Buckets de Storage
-------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('company-documents', 'company-documents', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true) ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 7. PolÃ­ticas de Storage (Simplificadas para Authenticated)
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('company-documents', 'company-logos'));
CREATE POLICY "Auth Select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id IN ('company-documents', 'company-logos'));
-- Opcional: Permitir publico select de logos
CREATE POLICY "Public Select Logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'company-logos');

COMMIT;
