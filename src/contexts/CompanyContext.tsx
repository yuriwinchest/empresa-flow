import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";

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
        .select("company:companies(id, cnpj, razao_social, nome_fantasia, is_active)")
        .eq("user_id", user.id);

      if (error) throw error;

      const mapped = (data || [])
        .map((row: any) => row.company)
        .filter((c: any) => c && c.is_active);
      mapped.sort((a: any, b: any) => (a.razao_social || "").localeCompare(b.razao_social || ""));

      setCompanies(mapped);

      // Select first company if none selected
      if (mapped && mapped.length > 0 && !selectedCompany) {
        setSelectedCompany(mapped[0]);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
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
