
import { InvoiceItem } from '../../schemas/invoice.schema';

/**
 * Interface Strategy para Cálculo de Impostos.
 * Desacopla a regra de cálculo (o COMO) do motor de faturamento (o QUANDO).
 */
export interface ITaxStrategy {
    /** Nome identificador do imposto (ex: 'ISS', 'IRRF') */
    name: string;

    /** Código fiscal ou identificador único para logs/auditoria */
    code: string;

    /**
     * Verifica se este imposto se aplica ao item atual.
     * Evita ifs hardcoded no componente principal.
     */
    appliesTo(item: InvoiceItem): boolean;

    /**
     * Executa o cálculo do imposto.
     * @returns O valor monetário do imposto a ser retido/acrescido.
     */
    calculate(item: InvoiceItem): number;
}
