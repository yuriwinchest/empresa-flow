import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Company, CompanyFormData } from "@/types/company";
import { toast } from "sonner";

export function useCompanies(userId?: string) {
    const queryClient = useQueryClient();

    const { data: companies, isLoading } = useQuery({
        queryKey: ["companies"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("companies")
                .select("*")
                .order("razao_social");
            if (error) throw error;
            return data as Company[];
        },
        enabled: !!userId,
    });

    const createMutation = useMutation({
        mutationFn: async (data: CompanyFormData) => {
            const { error } = await supabase.from("companies").insert([data]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companies"] });
            toast.success("Empresa criada com sucesso!");
        },
        onError: () => {
            toast.error("Erro ao criar empresa");
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: CompanyFormData }) => {
            const { error } = await supabase
                .from("companies")
                .update(data)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companies"] });
            toast.success("Empresa atualizada com sucesso!");
        },
        onError: () => {
            toast.error("Erro ao atualizar empresa");
        },
    });

    return {
        companies,
        isLoading,
        createCompany: createMutation,
        updateCompany: updateMutation,
    };
}
