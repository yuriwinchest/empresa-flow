
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

import { InvoiceSchema, Invoice } from "../../domain/schemas/invoice.schema";
import { BillingService } from "../../infra/billing.services";
import { useTaxCalculator } from "./useTaxCalculator";

interface UseInvoiceFormProps {
    onSuccess: (data: Invoice) => void;
    initialData?: Partial<Invoice>;
}

export function useInvoiceForm({ onSuccess, initialData }: UseInvoiceFormProps) {
    const { activeClient } = useAuth();
    const { selectedCompany } = useCompany();
    const queryClient = useQueryClient();
    const billingService = new BillingService(activeClient);

    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<Invoice>({
        resolver: zodResolver(InvoiceSchema),
        defaultValues: {
            status: 'DRAFT',
            issueDate: new Date(),
            dueDate: new Date(),
            items: [{ description: "", quantity: 1, unitPrice: 0 }],
            paymentMethod: 'BOLETO',
            companyId: selectedCompany?.id || '', // Será validado no onSubmit
            ...initialData,
        },
        mode: "onChange"
    });

    // Tax Engine Integration
    const currentItems = form.watch("items");
    const { totalTax, taxesDetail } = useTaxCalculator(currentItems || []);

    const onSubmit = async (values: Invoice) => {
        if (!selectedCompany?.id) {
            toast({ title: "Erro", description: "Selecione uma empresa antes de criar faturas.", variant: "destructive" });
            return;
        }

        try {
            setIsSaving(true);

            // Injeta dados de contexto que podem não estar no form visual
            const payload = {
                ...values,
                companyId: selectedCompany.id, // Garante ID atual
            };

            const savedInvoice = await billingService.saveInvoice(payload);

            toast({ title: "Sucesso", description: "Fatura salva com sucesso!" });
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            onSuccess(savedInvoice);
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Falha ao salvar a fatura.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return {
        form,
        onSubmit,
        isSaving,
        totalTax,
        taxesDetail
    };
}
