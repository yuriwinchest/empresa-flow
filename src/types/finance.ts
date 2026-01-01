
export type FinanceStatus = 'pending' | 'paid' | 'cancelled' | 'overdue';
export type PaymentMethod = 'pix' | 'boleto' | 'transfer' | 'cash' | 'card' | 'other';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type AccountType = 'receita' | 'despesa' | 'ativo' | 'passivo';

export interface ChartOfAccount {
    id: string;
    company_id: string;
    code: string;
    name: string;
    type: AccountType;
    parent_id?: string;
    is_analytic: boolean;
    created_at: string;
}

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
    transaction_id?: string;
    bank_account_id?: string;

    // Extended Fields
    invoice_number?: string;
    issue_date?: string;
    register_date?: string;
    project_id?: string;
    department_id?: string;

    // Taxes
    pis_amount?: number;
    pis_retain?: boolean;
    cofins_amount?: number;
    cofins_retain?: boolean;
    csll_amount?: number;
    csll_retain?: boolean;
    ir_amount?: number;
    ir_retain?: boolean;
    iss_amount?: number;
    iss_retain?: boolean;
    inss_amount?: number;
    inss_retain?: boolean;

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
    transaction_id?: string;
    bank_account_id?: string; // Ensured

    // Extended Fields
    invoice_number?: string;
    issue_date?: string;
    register_date?: string;
    project_id?: string;
    department_id?: string;

    // Taxes
    pis_amount?: number;
    pis_retain?: boolean;
    cofins_amount?: number;
    cofins_retain?: boolean;
    csll_amount?: number;
    csll_retain?: boolean;
    ir_amount?: number;
    ir_retain?: boolean;
    iss_amount?: number;
    iss_retain?: boolean;
    inss_amount?: number;
    inss_retain?: boolean;

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

export interface Transaction {
    id: string;
    company_id: string;
    bank_account_id: string;
    category_id: string;
    type: 'credit' | 'debit';
    amount: number;
    date: string;
    description: string;
    status?: string;
    created_at: string;
    bank_account?: { name: string };
    category?: { name: string };
}
