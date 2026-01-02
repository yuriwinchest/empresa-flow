
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext"; // Ajuste: usar o contexto correto
import { AccountsPayableSchema, AccountsPayable } from "../../domain/schemas/accounts-payable.schema";
import { FinanceService } from "../../infra/finance.services";
import { useState } from "react";

export function usePayableForm(initialData?: AccountsPayable, onSuccess?: () => void) {
    const { toast } = useToast();
    const { activeClient } = useAuth(); // Cliente Supabase
    const { selectedCompany } = useCompany();
    const queryClient = useQueryClient();
    const financeService = new FinanceService(activeClient);

    const [isUploading, setIsUploading] = useState(false);

    const form = useForm<AccountsPayable>({
        resolver: zodResolver(AccountsPayableSchema),
        defaultValues: initialData || {
            description: "",
            amount: 0,
            due_date: new Date(),
            status: "pending",
            recurrence: "none",
            pis_amount: 0, pis_retain: false,
            cofins_amount: 0, cofins_retain: false,
            csll_amount: 0, csll_retain: false,
            ir_amount: 0, ir_retain: false,
            iss_amount: 0, iss_retain: false,
            inss_amount: 0, inss_retain: false,
            issue_date: new Date(),
            register_date: new Date(),
        },
    });

    // Mutation para Salvar
    const saveMutation = useMutation({
        mutationFn: async (data: AccountsPayable) => {
            if (!selectedCompany?.id) throw new Error("Empresa não selecionada");
            const payload = { ...data, company_id: selectedCompany.id };

            // 1. Salvar Conta a Pagar
            const { data: savedPayable, error } = await financeService.savePayable(payload);
            if (error) throw error;

            // 2. Gerar Transação se pago e tiver conta bancária
            if (payload.status === 'paid' && payload.bank_account_id && !initialData?.transaction_id) { // Se transaction_id nao existir no tipo, ok, ignorar check ou checar payload
                await financeService.createTransactionFromPayable(savedPayable.id, payload, selectedCompany.id);
            }

            return savedPayable;
        },
        onSuccess: () => {
            toast({ title: "Sucesso", description: "Conta a pagar salva com sucesso!" });
            queryClient.invalidateQueries({ queryKey: ["accounts_payable"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            if (onSuccess) onSuccess();
        },
        onError: (error: any) => {
            console.error(error);
            toast({ title: "Erro", description: "Falha ao salvar conta.", variant: "destructive" });
        }
    });

    // Função de Upload (reutilizando lógica do legado)
    const handleFileUpload = async (file: File) => {
        if (!selectedCompany) return;
        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${selectedCompany.id}/payables/${fileName}`;

            const { error: uploadError } = await activeClient.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = activeClient.storage
                .from('documents')
                .getPublicUrl(filePath);

            form.setValue("file_url", publicUrl);
            toast({ title: "Arquivo anexado!" });
        } catch (error) {
            toast({ title: "Erro no upload", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    return {
        form,
        save: form.handleSubmit((data) => saveMutation.mutate(data)),
        isSaving: saveMutation.isPending,
        handleFileUpload,
        isUploading
    };
}
