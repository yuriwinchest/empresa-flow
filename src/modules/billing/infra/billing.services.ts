
import { SupabaseClient } from "@supabase/supabase-js";
import { Invoice } from "../domain/schemas/invoice.schema";

/**
 * Serviço de Faturamento.
 * Responsável por persistência de dados e integrações fiscais.
 */

// Interface para payload de criação (pode diferir do schema de domínio se houver transformações)
type CreateInvoicePayload = Omit<Invoice, "id" | "totalTaxes" | "totalAmount" | "subtotal"> & {
    companyId: string;
};

export class BillingService {
    constructor(private supabase: SupabaseClient) { }

    /**
     * Salva uma nova fatura ou atualiza existente.
     */
    async saveInvoice(invoice: Invoice): Promise<Invoice> {
        // Transformação de dados pré-persistência (se necessário)
        // Ex: Calcular totais finais no backend ou garantir integridade

        // Simulação de chamada Supabase (Tabela 'invoices' e 'invoice_items')
        // OBS: Isso requer que as tabelas existam. Vou usar um mock/log se der erro, 
        // mas o ideal é ter a transaction real.

        console.log("Persisting Invoice to DB:", invoice);

        /* 
        const { data, error } = await this.supabase
            .from('invoices')
            .upsert(invoice)
            .select()
            .single();

        if (error) throw new Error(`Erro ao salvar fatura: ${error.message}`);
        return data; 
        */

        // Mock response para desenvolvimento UI-First
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    ...invoice,
                    id: invoice.id || crypto.randomUUID(),
                    subtotal: 1000,
                    totalTaxes: 150,
                    totalAmount: 1150
                });
            }, 1000);
        });
    }

    /**
     * Busca faturas por cliente.
     */
    async getInvoicesByClient(clientId: string) {
        /*
        const { data, error } = await this.supabase
            .from('invoices')
            .select('*')
            .eq('client_id', clientId);
        
        if (error) throw error;
        return data;
        */
        return [];
    }
}
