
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface ClientOption {
    id: string;
    razao_social: string;
    cnpj: string;
}

export function useClientSearch() {
    const { activeClient } = useAuth();
    const { selectedCompany } = useCompany();
    const [searchTerm, setSearchTerm] = useState("");
    const [clients, setClients] = useState<ClientOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchClients = async () => {
            if (!selectedCompany?.id) return;

            setIsLoading(true);
            try {
                let query = activeClient
                    .from("clients")
                    .select("id, razao_social, cpf_cnpj")
                    .eq("company_id", selectedCompany.id)
                    .limit(20);

                if (searchTerm) {
                    query = query.ilike("razao_social", `%${searchTerm}%`);
                }

                const { data, error } = await query;

                if (error) throw error;

                setClients(data.map((c: any) => ({
                    id: c.id,
                    razao_social: c.razao_social,
                    cnpj: c.cpf_cnpj
                })));
            } catch (error) {
                console.error("Erro ao buscar clientes:", error);
                setClients([]);
            } finally {
                setIsLoading(false);
            }
        };

        const debounce = setTimeout(fetchClients, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm, selectedCompany, activeClient]);

    return {
        searchTerm,
        setSearchTerm,
        clients,
        isLoading
    };
}
