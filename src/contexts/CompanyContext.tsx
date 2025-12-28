import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface Company {
  id: string;
  cnpj: string | null;
  razao_social: string;
  nome_fantasia: string | null;
  is_active: boolean;
}

export interface CompanyContextType {
  companies: Company[];
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  loading: boolean;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, activeClient } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    if (!user) {
      setCompanies([]);
      setSelectedCompany(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await activeClient
        .from("user_companies")
        .select("is_default, company:companies(id, cnpj, razao_social, nome_fantasia, is_active)")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });

      if (!error) {
        const mapped = (data || [])
          .map((row: any) => ({ company: row.company, is_default: row.is_default }))
          .filter((row: any) => row.company && row.company.is_active);
        mapped.sort((a: any, b: any) => (a.company.razao_social || "").localeCompare(b.company.razao_social || ""));

        const onlyCompanies = mapped.map((row: any) => row.company) as Company[];
        setCompanies(onlyCompanies);

        if (onlyCompanies.length > 0) {
          const defaultCompany = mapped.find((row: any) => row.is_default)?.company || onlyCompanies[0];
          if (!selectedCompany || !onlyCompanies.some((c) => c.id === selectedCompany.id)) {
            setSelectedCompany(defaultCompany);
          }
        } else {
          setSelectedCompany(null);
        }

        return;
      }

      const { data: companiesData, error: companiesError } = await activeClient
        .from("companies")
        .select("id, cnpj, razao_social, nome_fantasia, is_active")
        .eq("is_active", true)
        .order("razao_social");

      if (companiesError) throw companiesError;

      const mapped = (companiesData || []).filter((c: any) => c && c.is_active) as Company[];
      setCompanies(mapped);
      if (mapped.length > 0 && (!selectedCompany || !mapped.some((c) => c.id === selectedCompany.id))) {
        setSelectedCompany(mapped[0]);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      setCompanies([]);
      setSelectedCompany(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [user, activeClient]);

  const refreshCompanies = async () => {
    await fetchCompanies();
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompany,
        setSelectedCompany,
        loading,
        refreshCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
