import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Target,
  Layers,
  Search,
  ExternalLink
} from "lucide-react";
import { useCompanies } from "@/hooks/useCompanies";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { maskCNPJ } from "@/utils/masks";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useCompany } from "@/contexts/CompanyContext";

export default function Dashboard() {
  const { user } = useAuth();
  const { companies, isLoading } = useCompanies(user?.id);
  const { setSelectedCompany } = useCompany();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("empresas");

  const handleCompanyClick = (company: any) => {
    setSelectedCompany(company);
    navigate(`/dashboard/${company.id}`);
  };

  const filteredCompanies = companies?.filter(company =>
    company.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (company.nome_fantasia && company.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (company.cnpj && company.cnpj.includes(searchTerm))
  );

  const tabs = [
    { id: "empresas", label: "Empresas", icon: Building2, color: "text-blue-600", bg: "bg-blue-100" },
    { id: "produtos", label: "Produtos", icon: Package, color: "text-orange-600", bg: "bg-orange-100" },
    { id: "contas_pagar", label: "Contas a Pagar", icon: ArrowDownCircle, color: "text-red-600", bg: "bg-red-100" },
    { id: "contas_receber", label: "Contas a Receber", icon: ArrowUpCircle, color: "text-green-600", bg: "bg-green-100" },
    { id: "clientes", label: "Clientes", icon: Users, color: "text-indigo-600", bg: "bg-indigo-100" },
    { id: "oportunidades", label: "Oportunidades", icon: Target, color: "text-purple-600", bg: "bg-purple-100" },
    { id: "departamentos", label: "Departamentos", icon: Layers, color: "text-slate-600", bg: "bg-slate-100" },
  ];

  return (
    <AppLayout title="Painel Principal">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Visão Geral</h2>
          <p className="text-muted-foreground">
            Selecione um módulo ou uma empresa para gerenciar
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${activeTab === tab.id
                  ? "bg-white border-green-500 shadow-md ring-1 ring-green-500"
                  : "bg-white border-slate-200 hover:border-green-300 hover:bg-slate-50"
                }`}
            >
              <div className={`p-2 rounded-full ${tab.bg} mb-2`}>
                <tab.icon className={`h-5 w-5 ${tab.color}`} />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wide ${activeTab === tab.id ? "text-green-700" : "text-slate-600"}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <Card className="border-none shadow-xl rounded-xl overflow-hidden bg-white min-h-[500px]">
          <CardHeader className="bg-slate-50/70 border-b p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
              {tabs.find(t => t.id === activeTab)?.icon && (
                <div className={`p-2 rounded-lg ${tabs.find(t => t.id === activeTab)?.bg}`}>
                  {(() => {
                    const Icon = tabs.find(t => t.id === activeTab)?.icon!;
                    return <Icon className={`h-5 w-5 ${tabs.find(t => t.id === activeTab)?.color}`} />;
                  })()}
                </div>
              )}
              {activeTab === "empresas" ? "Listagem de Empresas" : `Gestão de ${tabs.find(t => t.id === activeTab)?.label}`}
            </CardTitle>

            {activeTab === "empresas" && (
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 border-slate-300 focus-visible:ring-green-600"
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {activeTab === "empresas" ? (
              isLoading ? (
                <div className="text-center py-20">
                  <div className="animate-spin h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-slate-500 font-medium">Carregando empresas...</p>
                </div>
              ) : filteredCompanies?.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-4">
                  <Building2 className="h-16 w-16 text-slate-200" />
                  <p className="text-lg font-medium">Nenhuma empresa encontrada.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700 uppercase p-6">Empresa</TableHead>
                      <TableHead className="font-bold text-slate-700 uppercase">CNPJ</TableHead>
                      <TableHead className="font-bold text-slate-700 uppercase">Localização</TableHead>
                      <TableHead className="font-bold text-slate-700 uppercase">Contato</TableHead>
                      <TableHead className="font-bold text-slate-700 uppercase text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies?.map((company) => (
                      <TableRow
                        key={company.id}
                        className="cursor-pointer hover:bg-slate-50 transition-colors group"
                        onClick={() => handleCompanyClick(company)}
                      >
                        <TableCell className="p-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-lg group-hover:text-green-700 transition-colors">
                              {company.razao_social}
                            </span>
                            <span className="text-xs text-slate-500 uppercase font-medium">
                              {company.nome_fantasia || "Sem Nome Fantasia"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-slate-600 bg-slate-50">
                            {company.cnpj ? maskCNPJ(company.cnpj) : "N/D"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm text-slate-600">
                            <span className="font-bold">{company.endereco_cidade || "-"}</span>
                            <span className="text-xs uppercase text-slate-400">{company.endereco_estado || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">{company.email || "-"}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50 font-medium">
                            Acessar Painel <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <Building2 className="h-16 w-16 text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-slate-700 mb-2">Selecione uma Empresa</h3>
                <p className="text-slate-500 max-w-md mb-6">
                  Para visualizar {tabs.find(t => t.id === activeTab)?.label.toLowerCase()}, por favor selecione uma empresa na aba "Empresas" primeiro.
                </p>
                <Button onClick={() => setActiveTab("empresas")} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                  Voltar para Lista de Empresas
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
