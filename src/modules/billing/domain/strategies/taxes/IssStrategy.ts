
import { ITaxStrategy } from './ITaxStrategy';
import { InvoiceItem } from '../../schemas/invoice.schema';

/**
 * Estratégia de Cálculo do ISS (Imposto Sobre Serviços).
 * Regra: Aplica-se apenas se o item tiver um código de serviço (Service Code) definido.
 */
export class IssStrategy implements ITaxStrategy {
    name = 'ISS';
    code = 'ISS_QN'; // ISS Qualquer Natureza

    // Em um cenário real, isso viria de um Context ou Configuração da Empresa/Cidade
    private readonly DEFAULT_RATE = 0.05; // 5%

    appliesTo(item: InvoiceItem): boolean {
        // Só aplica ISS se tiver código de serviço (LC116)
        // E se o valor for maior que zero
        return !!item.serviceCode && item.quantity > 0;
    }

    calculate(item: InvoiceItem): number {
        const baseCalculation = item.unitPrice * item.quantity;
        return baseCalculation * this.DEFAULT_RATE;
    }
}
