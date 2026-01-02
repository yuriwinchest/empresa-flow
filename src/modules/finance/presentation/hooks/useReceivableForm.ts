
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { FinanceService } from "../../infra/finance.services";
import { AccountsReceivableSchema, AccountsReceivable } from "../../domain/schemas/accounts-receivable.schema";

export function useReceivableForm(initialData?: Partial<AccountsReceivable>, onSuccess?: () => void) {
    const { toast } = useToast();
    const { selectedCompany } = useCompany();
    const { activeClient } = useAuth(); // Supabase Client
    const queryClient = useQueryClient();

    const service = new FinanceService(activeClient);

    // 1. Carregar Dependências (Categorias, Bancos, etc)
    const { data: dependencies, isLoading: isLoadingDeps } = useQuery({
        queryKey: ['finance_dependencies', selectedCompany?.id],
        queryFn: () => service.getFormDependencies(selectedCompany!.id),
        enabled: !!selectedCompany?.id,
        staleTime: 1000 * 60 * 5 // 5 minutos de cache
    });

    // 2. Configurar Formulário
    const form = useForm<AccountsReceivable>({
        resolver: zodResolver(AccountsReceivableSchema),
        defaultValues: {
            status: 'PENDING',
            recurrence: 'NONE',
            company_id: selectedCompany?.id,
            issue_date: new Date(),
            ...initialData // Merge com dados iniciais se houver
        }
    });

    // 3. Mutation para Salvar
    const saveMutation = useMutation({
        mutationFn: async (values: AccountsReceivable) => {
            // Salva o Recebível
            const { data: savedReceivable, error } = await service.saveReceivable({
                ...values,
                company_id: selectedCompany!.id // Garante ID da empresa
            });

            if (error) throw new Error(error.message);

            // Se foi marcado como PAGO na criação/edição e tem conta bancária, gera transação
            // (Esta lógica pode ser refatorada para trigger no banco dps)
            if (values.status === 'PAID' && values.payment_amount && values.payment_method) {
                // Implementar lógica de transação se necessário aqui ou no service
                // service.createTransaction(...)
            }

            return savedReceivable;
        },
        onSuccess: () => {
            toast({ title: "Sucesso", description: "Conta a receber salva com sucesso!" });
            queryClient.invalidateQueries({ queryKey: ['accounts_receivable'] });
            queryClient.invalidateQueries({ queryKey: ['cash_flow'] }); // Invalida fluxo de caixa
            if (onSuccess) onSuccess();
        },
        onError: (error: Error) => {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    });

    const onSubmit = (values: AccountsReceivable) => {
        saveMutation.mutate(values);
    };

    return {
        form,
        onSubmit,
        dependencies,
        isLoading: isLoadingDeps || saveMutation.isPending,
        isSubmitting: saveMutation.isPending
    };
}
