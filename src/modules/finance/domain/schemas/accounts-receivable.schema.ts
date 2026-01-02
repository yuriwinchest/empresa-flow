
import { z } from "zod";

// Schema para Contas a Receber (Baseado na análise do formulário antigo)
export const AccountsReceivableSchema = z.object({
    id: z.string().uuid().optional(),
    company_id: z.string().uuid("Empresa obrigatória"),

    // Dados Básicos
    description: z.string().min(3, "Descrição muito curta").max(255),
    client_id: z.string().uuid("Cliente obrigatório").nullable().optional(), // Pode ser venda avulsa? Validar regra.

    // Valores e Datas
    amount: z.number().min(0.01, "Valor deve ser maior que zero"),
    due_date: z.date({ required_error: "Data de vencimento obrigatória" }),
    issue_date: z.date().default(() => new Date()),
    competence_date: z.date().optional(), // Data de competência

    // Classificação
    category_id: z.string().uuid("Categoria obrigatória").optional(), // Validar se é obrigatório no DB
    department_id: z.string().uuid().optional(),
    cost_center_id: z.string().uuid().optional(),
    project_id: z.string().uuid().optional(), // Novo campo mencionado anteriormente

    // Status e Recorrência
    status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).default('PENDING'),
    recurrence: z.enum(['NONE', 'MONTHLY', 'WEEKLY', 'YEARLY']).default('NONE'),
    recurrence_end_date: z.date().optional(),

    // Pagamento Realizado
    payment_date: z.date().optional(),
    payment_method: z.string().optional(),
    payment_amount: z.number().optional(), // Valor pago (pode ser parcial)

    // Metadados
    notes: z.string().optional(),
    document_number: z.string().optional(), // Nro Nota Fiscal ou Boleto
});

export type AccountsReceivable = z.infer<typeof AccountsReceivableSchema>;
