import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Company, CompanyFormData } from "@/types/company";
import { toast } from "sonner";

export function useCompanies(userId?: string) {
    const queryClient = useQueryClient();
    const { activeClient, isUsingSecondary } = useAuth();

    const { data: companies, isLoading } = useQuery({
        // Include isUsingSecondary in queryKey to differentiate cache between DBs
        queryKey: ["companies", isUsingSecondary],
        queryFn: async () => {
            const { data, error } = await activeClient
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
            const { error } = await activeClient.from("companies").insert([data]);
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
            const { error } = await activeClient
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
