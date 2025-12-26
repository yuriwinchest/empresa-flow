
-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de roles de usuário (separada por segurança)
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
  email TEXT,
  telefone TEXT,
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

-- Tabela de relação usuário-empresa (um usuário pode ter acesso a várias empresas)
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

-- Tabela de contas bancárias
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

-- Função de segurança para verificar roles
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

-- Função para verificar se usuário tem acesso à empresa
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

-- Políticas RLS para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas RLS para user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para companies
CREATE POLICY "Users can view companies they have access to" ON public.companies
  FOR SELECT USING (public.has_company_access(auth.uid(), id));

CREATE POLICY "Admins can insert companies" ON public.companies
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update companies" ON public.companies
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete companies" ON public.companies
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para user_companies
CREATE POLICY "Users can view own company access" ON public.user_companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage company access" ON public.user_companies
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para clients (baseado no acesso à empresa)
CREATE POLICY "Users can view clients of accessible companies" ON public.clients
  FOR SELECT USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert clients in accessible companies" ON public.clients
  FOR INSERT WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update clients in accessible companies" ON public.clients
  FOR UPDATE USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete clients in accessible companies" ON public.clients
  FOR DELETE USING (public.has_company_access(auth.uid(), company_id));

-- Políticas RLS para suppliers (baseado no acesso à empresa)
CREATE POLICY "Users can view suppliers of accessible companies" ON public.suppliers
  FOR SELECT USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert suppliers in accessible companies" ON public.suppliers
  FOR INSERT WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update suppliers in accessible companies" ON public.suppliers
  FOR UPDATE USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete suppliers in accessible companies" ON public.suppliers
  FOR DELETE USING (public.has_company_access(auth.uid(), company_id));

-- Políticas RLS para categories (baseado no acesso à empresa)
CREATE POLICY "Users can view categories of accessible companies" ON public.categories
  FOR SELECT USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert categories in accessible companies" ON public.categories
  FOR INSERT WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update categories in accessible companies" ON public.categories
  FOR UPDATE USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete categories in accessible companies" ON public.categories
  FOR DELETE USING (public.has_company_access(auth.uid(), company_id));

-- Políticas RLS para bank_accounts (baseado no acesso à empresa)
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
  
  -- Criar role padrão de admin para o primeiro usuário
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at
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
