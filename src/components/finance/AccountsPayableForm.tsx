
import { AccountsPayable } from "@/modules/finance/domain/schemas/accounts-payable.schema";
import { PayableForm } from "@/modules/finance/presentation/components/PayableForm";

interface AccountsPayableFormProps {
    onSuccess: () => void;
    initialData?: any; // Usando any no proxy para flexibilidade com legado, mas o interno tipa corretamente
}

/**
 * Componente Proxy para manter compatibilidade com o sistema legado,
 * redirecionando para a nova implementação modular em modules/finance.
 */
export function AccountsPayableForm({ onSuccess, initialData }: AccountsPayableFormProps) {
    // Adaptar dados iniciais se necessário (garantir tipos)
    const normalizedData: AccountsPayable | undefined = initialData ? {
        ...initialData,
        // Garantir que datas sejam Date objects se vierem strings do DB
        due_date: new Date(initialData.due_date),
        issue_date: initialData.issue_date ? new Date(initialData.issue_date) : undefined,
        register_date: initialData.register_date ? new Date(initialData.register_date) : undefined,
        payment_date: initialData.payment_date ? new Date(initialData.payment_date) : undefined,
        // Garantir que valores monetários sejam números
        amount: Number(initialData.amount),
    } : undefined;

    return <PayableForm onSuccess={onSuccess} initialData={normalizedData} />;
}
