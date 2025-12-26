export type FinanceStatus = 'pending' | 'paid' | 'cancelled' | 'overdue';
export type PaymentMethod = 'pix' | 'boleto' | 'transfer' | 'cash' | 'card' | 'other';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface AccountsPayable {
    id: string;
    company_id: string;
    supplier_id?: string;
    category_id?: string;
    description: string;
    amount: number;
    due_date: string;
    payment_date?: string;
    status: FinanceStatus;
    payment_method?: PaymentMethod;
    barcode?: string;
    recurrence?: RecurrenceType;
    observations?: string;
    file_url?: string;
    created_at: string;
    updated_at: string;
    supplier?: {
        razao_social: string;
        nome_fantasia?: string;
    };
    category?: {
        name: string;
    };
}

export interface AccountsReceivable {
    id: string;
    company_id: string;
    client_id?: string;
    category_id?: string;
    description: string;
    amount: number;
    due_date: string;
    receive_date?: string;
    status: FinanceStatus;
    payment_method?: PaymentMethod;
    recurrence?: RecurrenceType;
    observations?: string;
    file_url?: string;
    created_at: string;
    updated_at: string;
    client?: {
        razao_social: string;
        nome_fantasia?: string;
    };
    category?: {
        name: string;
    };
}
