import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Company, CompanyFormData } from "@/types/company";
import { toast } from "sonner";

export function useCompanies(userId?: string) {
    const queryClient = useQueryClient();
    const { activeClient, isUsingSecondary } = useAuth();

    const { data: companies, isLoading, error } = useQuery({
        // Include isUsingSecondary in queryKey to differentiate cache between DBs
        queryKey: ["companies", isUsingSecondary, userId],
        queryFn: async () => {
            if (!userId) return [];

            const { data: accessRows, error: accessError } = await activeClient
                .from("user_companies")
                .select("company:companies(*)")
                .eq("user_id", userId);

            if (!accessError) {
                const mapped = (accessRows || [])
                    .map((row: any) => row.company)
                    .filter((c: any) => c && c.is_active);
                mapped.sort((a: any, b: any) => (a.razao_social || "").localeCompare(b.razao_social || ""));
                return mapped as Company[];
            }

            const { data: companiesData, error: companiesError } = await activeClient
                .from("companies")
                .select("*")
                .eq("is_active", true)
                .order("razao_social");

            if (companiesError) throw companiesError;
            return (companiesData || []) as Company[];
        },
        enabled: !!userId,
    });

    const createMutation = useMutation({
        mutationFn: async (data: CompanyFormData) => {
            const { error } = await activeClient.from("companies").insert([data]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companies", isUsingSecondary, userId] });
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
            queryClient.invalidateQueries({ queryKey: ["companies", isUsingSecondary, userId] });
            toast.success("Empresa atualizada com sucesso!");
        },
        onError: () => {
            toast.error("Erro ao atualizar empresa");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await activeClient
                .from("companies")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companies", isUsingSecondary, userId] });
            toast.success("Empresa excluída com sucesso!");
        },
        onError: () => {
            toast.error("Erro ao excluir empresa");
        },
    });

    return {
        companies,
        isLoading,
        error,
        createCompany: createMutation,
        updateCompany: updateMutation,
        deleteCompany: deleteMutation,
    };
}
