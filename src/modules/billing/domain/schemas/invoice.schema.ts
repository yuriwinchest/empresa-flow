
import { z } from 'zod';

// ==========================================
// 1. Primitive Schemas (Building Blocks)
// ==========================================

// Validação monetária (sempre positivo, máx 2 casas decimais recomendadas na UI)
export const MoneySchema = z.number().min(0, "O valor não pode ser negativo");

// Validação de porcentagem (0.00 a 100.00)
export const PercentageSchema = z.number().min(0).max(100);

// Códigos fiscais (ex: LC116)
export const TaxCodeSchema = z.string().min(2, "Código fiscal inválido");

// ==========================================
// 2. Domain Schemas (Invoice Items)
// ==========================================

export const InvoiceItemSchema = z.object({
    id: z.string().uuid().optional(), // Opcional na criação
    description: z.string().min(3, "Descrição muito curta").max(255),
    quantity: z.number().min(0.01, "Quantidade mínima é 0.01"),
    unitPrice: MoneySchema,
    serviceCode: TaxCodeSchema.optional(), // Código LC116 para serviços
    taxes: z.array(z.string()).optional(), // IDs das estratégias de imposto aplicáveis
});

// Inferência do tipo TypeScript para uso no Frontend/Backend
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

// ==========================================
// 3. Aggregate Schemas (The Invoice)
// ==========================================

export const InvoiceStatusSchema = z.enum([
    'DRAFT',      // Rascunho
    'ISSUED',     // Emitida (Aguardando Pagamento)
    'PAID',       // Paga
    'CANCELLED',  // Cancelada
    'OVERDUE'     // Vencida
]);

export const PaymentMethodTypeSchema = z.enum(['BOLETO', 'PIX', 'CREDIT_CARD', 'TRANSFER']);

export const InvoiceSchema = z.object({
    id: z.string().uuid().optional(),

    // Relacionamentos
    companyId: z.string().uuid("ID da empresa inválido"),
    clientId: z.string().uuid("ID do cliente obrigatório"),

    // Dados Fiscais/Financeiros
    issueDate: z.date(),
    dueDate: z.date(),

    // Itens da Fatura
    items: z.array(InvoiceItemSchema).min(1, "Adicione pelo menos um item à fatura"),

    // Totais (Calculados, mas podem ser armazenados para cache)
    subtotal: MoneySchema.optional(),
    totalTaxes: MoneySchema.optional(),
    totalAmount: MoneySchema.optional(),

    // Estado e Metadados
    status: InvoiceStatusSchema.default('DRAFT'),
    notes: z.string().max(1000).optional(),

    // Configuração de Pagamento
    paymentMethod: PaymentMethodTypeSchema,
});

export type Invoice = z.infer<typeof InvoiceSchema>;
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;
