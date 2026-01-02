
import { ReceivableForm } from "@/modules/finance/presentation/components/ReceivableForm";
import { AccountsReceivable } from "@/modules/finance/domain/schemas/accounts-receivable.schema";

interface AccountsReceivableFormProps {
    onSuccess: () => void;
    initialData?: any; // Aceita any para compatibilidade com dados legados
}

/**
 * PROXY COMPONENT
 * Este componente substitui o antigo monolito e redireciona para a nova implementação modular.
 * Mantém a interface de props antiga para não quebrar o resto do sistema.
 */
export function AccountsReceivableForm({ onSuccess, initialData }: AccountsReceivableFormProps) {
    // Adaptador simples de dados se necessário
    const adaptedData: Partial<AccountsReceivable> | undefined = initialData ? {
        ...initialData,
        // Garante conversão de datas strings para Date objects se vierem do JSON
        due_date: initialData.due_date ? new Date(initialData.due_date) : undefined,
        issue_date: initialData.issue_date ? new Date(initialData.issue_date) : undefined
    } : undefined;

    return (
        <ReceivableForm
            onSuccess={onSuccess}
            initialData={adaptedData}
            onCancel={onSuccess} // Usa onSuccess como cancelamento pois o Dialog fecha igual
        />
    );
}
