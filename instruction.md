# Instruções de Execução e Manutenção

Este documento registra as melhorias e correções implementadas, bem como os princípios de engenharia de software aplicados, conforme solicitado.

## 1. Princípios de Engenharia Aplicados

### 1.1 Separação de Responsabilidades (SOLID - Single Responsibility Principle)
- **Refatoração do `Empresas.tsx`**: A lógica de busca e manipulação de dados (CRUD) foi extraída do componente de interface e movida para um hook customizado (`src/hooks/useCompanies.ts`).
  - **Componente (`Empresas.tsx`)**: Responsável apenas por renderizar a UI e gerenciar o estado do formulário/modal.
  - **Hook (`useCompanies.ts`)**: Responsável por toda a interação com o Supabase (API) e gerenciamento de estado assíncrono (React Query).
  - **Tipagem (`src/types/company.ts`)**: Definições de interfaces movidas para arquivo dedicado.

### 1.2 Limite de Tamanho de Arquivo
- Todos os arquivos foram mantidos bem abaixo do limite de 800 linhas para garantir legibilidade e manutenibilidade. A refatoração reduziu significativamente o tamanho do `Empresas.tsx`.

### 1.3 Correção de UI/UX (Modal Clipping)
- **Problema**: O modal de criação de empresas cortava o conteúdo em telas menores ou devido ao tamanho do formulário.
- **Solução**: Adicionado CSS utilitário `max-h-[90vh] overflow-y-auto` ao `DialogContent`. Isso garante que o modal nunca exceda 90% da altura da tela e crie uma barra de rolagem interna se necessário, mantendo todo o conteúdo acessível.

## 2. Implementações Realizadas

### 2.1 Correções Críticas
- **Dependências**: Executado `npm install` para instalar pacotes faltantes (`react`, `supabase-js`, etc.) que causavam erros de importação.
- **AuthContext**: Corrigida a exportação da interface `AuthContextType`, resolvendo erros de compilação em todo o sistema.
- **Componente Badge**: Resolvido erro de tipagem (`children` missing) através da instalação correta das definições de tipo do React.

### 2.2 Refatoração Financeira / Empresas
- Criado arquivo de tipos: `src/types/company.ts`
- Criado hook de serviço: `src/hooks/useCompanies.ts`
- Refatorado componente: `src/pages/Empresas.tsx`

## 3. Estado Atual e Observações
- O sistema compila sem erros (TypeScript check).
- A conexão com o Supabase (Lovable Cloud) está configurada via `.env`.
- O código está modularizado e segue padrões modernos de React (Hooks, Query, Clean Code).

## 4. O que falta / Próximos Passos
- Implementar máscaras de input (CPF/CNPJ, Telefone, CEP) no formulário de Empresas para melhor UX.
- Validar se outros modais (Financeiro) precisam da mesma correção de CSS (`max-h-[90vh]`).
- Integração da API de CEP para preenchimento automático de endereço.

## 5. Como aplicar as migrations no Supabase via CLI

### 5.1 Pré-requisitos
- Ter o Supabase CLI instalado
- Estar dentro da pasta do projeto (onde existe a pasta `supabase/`)

### 5.2 Linkar o projeto
O `project_id` fica em `supabase/config.toml`. Para linkar:

```powershell
supabase login
supabase link --project-ref lhkrxbhqagvuetoigqkl
```

### 5.3 Ver o que será aplicado (dry-run)
```powershell
supabase db push --dry-run --include-all
```

### 5.4 Aplicar no banco remoto
```powershell
supabase db push --include-all --yes
```

### 5.5 Conferência rápida
- No Supabase Dashboard: Database → Tables
- Verificar se existem: `company_documents`, `company_nfse_settings`
- Verificar em `companies` as colunas: `activity_profile`, `enable_nfse`, `enable_nfe`, `enable_nfce`
