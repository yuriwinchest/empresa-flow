
import { useMemo } from 'react';
import { InvoiceItem } from '../domain/schemas/invoice.schema';
import { ITaxStrategy } from '../domain/strategies/taxes/ITaxStrategy';
import { IssStrategy } from '../domain/strategies/taxes/IssStrategy';

/**
 * Hook para orquestrar o cálculo de impostos de uma fatura.
 * Aplica o padrão Composite/Strategy para iterar sobre múltiplos impostos sem complexidade ciclomática.
 */
export const useTaxCalculator = (items: InvoiceItem[]) => {

    // 1. Instancia as estratégias disponíveis.
    // Futuramente, isso pode vir de uma Factory ou Configuração Dinâmica.
    const activeStrategies: ITaxStrategy[] = useMemo(() => [
        new IssStrategy(),
        // new IrrfStrategy(), // Futuro
        // new PisCofinsStrategy() // Futuro
    ], []);

    /**
     * Calcula o total de impostos para todos os itens da fatura.
     */
    const calculateTotalTaxes = useMemo(() => {
        let totalTax = 0;
        const taxesDetail: Record<string, number> = {};

        items.forEach(item => {
            activeStrategies.forEach(strategy => {
                if (strategy.appliesTo(item)) {
                    const taxValue = strategy.calculate(item);
                    totalTax += taxValue;

                    // Acumula detalhe por imposto (ex: Total ISS da fatura)
                    taxesDetail[strategy.name] = (taxesDetail[strategy.name] || 0) + taxValue;
                }
            });
        });

        return { totalTax, taxesDetail };
    }, [items, activeStrategies]);

    return calculateTotalTaxes;
};
