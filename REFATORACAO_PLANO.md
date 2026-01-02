# Planejamento de Arquitetura e Refatoração (Modular Domain-Driven)

Este documento define o plano mestre para a evolução da arquitetura do projeto `empresa-flow`, focando na criação do Novo Módulo de Faturamento e na Refatoração do Módulo de Clientes, utilizando a abordagem **Clean Architecture** e **Feature-Sliced Design**.

---

## 🏛️ 1. Princípios Fundamentais (Code Constitution)

1.  **Limite de Linhas**: Arquivos > **500 linhas** são proibidos. Componentes de UI > **250 linhas** são candidatos a refatoração.
2.  **Schema-First**: Desenvolvimento começa pelo `schema.ts`. Se não está no schema, não existe.
3.  **Clean Architecture**: UI (`.tsx`) não contém regras de negócio. Regras vivem em Hooks ou Strategies.
4.  **Strategy Pattern**: Obrigatório para lógicas com > 3 variações (ex: impostos, pagamentos).
5.  **Tipagem Estrita**: `any` é estritamente proibido.
6.  **Zod is King**: Validação única para Forms, API e Tipagem TS.

---

## 📂 2. Nova Estrutura de Diretórios (Target)

O código será reorganizado em **Módulos de Domínio** dentro de `src/modules`.

```text
src/
├── modules/
│   ├── billing/              # [NOVO] Faturamento
│   │   ├── domain/           # Regras Puras
│   │   │   ├── schemas/      # Zod Schemas
│   │   │   └── strategies/   # Lógica (Impostos/Pagamentos)
│   │   ├── infra/            # Serviços e API
│   │   └── presentation/     # UI e Hooks
│   │       ├── components/
│   │       └── hooks/
│   │
│   └── clients/              # [REFATORAÇÃO] Clientes
│       ├── domain/           # client.schema.ts
│       ├── infra/            # APIs Externas (ViaCEP, BrasilAPI)
│       └── presentation/     # ClientForm (Dividido)
│           ├── hooks/        # useClientForm, useClientServices
│           └── partials/     # Abas (Endereco, Contato, etc.)
```

---

## 📅 3. Cronograma de Execução

### FASE 1: Fundação do Módulo de Faturamento [CONCLUÍDO]

- [x] **1.1 Estrutura**: Criar pastas `src/modules/billing` e subpastas.
- [x] **1.2 Schema**: Criar `src/modules/billing/domain/schemas/invoice.schema.ts`.
- [x] **1.3 Strategy**: Criar interface `ITaxStrategy.ts` e implementação básica.
- [x] **1.4 UI Base**: Criar estrutura do formulário de faturamento (vazia).
- [x] **1.5 Persistência Real**: Criar tabelas no Supabase e conectar `BillingService`.

### FASE 2: Refatoração do Módulo de Clientes [CONCLUÍDO]

- [x] **2.1 Migração**: Criar pastas `src/modules/clients`.
- [x] **2.2 Desacoplamento**: Extrair `clientFormSchema`.
- [x] **2.3 Lógica**: Mover chamadas de API (BrasilAPI/ViaCEP) para `client.services.ts`.
- [x] **2.4 Hooks**: Criar `useClientForm.ts` para gerenciar o estado.
- [x] **2.5 UI**: Quebrar `ClientForm.tsx` em Components Partials limpos.

### FASE 2.5: Refatoração do Módulo Financeiro (Contas a Receber) [CONCLUÍDO]

- [x] **2.5.1 Schema**: Criar `accounts-receivable.schema.ts`.
- [x] **2.5.2 Infra**: Criar `finance.services.ts` para centralizar queries.
- [x] **2.5.3 Hooks**: Criar `useReceivableForm.ts`.
- [x] **2.5.4 UI Receber**: Criar novo `ReceivableForm` modular.
- [x] **2.5.5 Schema Pagar**: Criar `accounts-payable.schema.ts`.
- [x] **2.5.6 Hook Pagar**: Criar `usePayableForm.ts`.
- [x] **2.5.7 UI Pagar**: Criar `PayableForm` modular e Proxy legado.

### FASE 2.6: Automação e UX (Feature Extra) [CONCLUÍDO]

- [x] **2.6.1 OCR**: Implementar Leitor de Cartão CNPJ (PDF) e corrigir importação de Worker para produção.

### FASE 3: Integração e Expansão [FUTURO]

- [ ] Integrar Faturamento com Clientes (Selecionar cliente na fatura).
- [ ] Implementar motor de impostos real (ISS, IRRF).
- [ ] Testes unitários para Schemas e Strategies.

---

## ✅ Checklist de Qualidade (Definition of Done)

Para cada tarefa ser considerada concluída:
- [ ] O arquivo principal tem < 500 linhas?
- [ ] Existe um Schema Zod definindo os dados?
- [ ] A lógica está separada da UI?
- [ ] O código compila sem erros de TypeScript?
