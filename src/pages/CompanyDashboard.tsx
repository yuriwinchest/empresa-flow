import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export default function CompanyDashboard() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, activeClient, isUsingSecondary } = useAuth();
    const { companies } = useCompanies(user?.id);
    const { setSelectedCompany, selectedCompany } = useCompany();

    useEffect(() => {
        if (id && companies) {
            const company = companies.find(c => c.id === id);
            if (company) {
                setSelectedCompany(company);
            }
        }
    }, [id, companies, setSelectedCompany]);
    const companyId = selectedCompany?.id || null;

    const activityProfileLabel = useMemo(() => {
        const p = selectedCompany?.activity_profile || "comercio";
        if (p === "servico") return "Serviço";
        if (p === "mista") return "Mista";
        return "Comércio";
    }, [selectedCompany?.activity_profile]);

    const headlineLabel = useMemo(() => {
        const p = selectedCompany?.activity_profile || "comercio";
        return p === "servico" ? "Serviços (Mês)" : "Vendas (Mês)";
    }, [selectedCompany?.activity_profile]);

    const secondLabel = useMemo(() => {
        const p = selectedCompany?.activity_profile || "comercio";
        if (p === "servico") return "Contratos Ativos";
        if (p === "mista") return "Clientes / Produtos";
        return "Produtos Ativos";
    }, [selectedCompany?.activity_profile]);

    const { data: nfseSettings } = useQuery({
        queryKey: ["company_nfse_settings", companyId, isUsingSecondary],
        queryFn: async () => {
            if (!companyId) return null;
            const { data, error } = await (activeClient as any)
                .from("company_nfse_settings")
                .select("provider, city_name, city_ibge_code, uf, environment")
                .eq("company_id", companyId)
                .maybeSingle();
            if (error) throw error;
            return data as any;
        },
        enabled: Boolean(companyId) && Boolean(selectedCompany?.enable_nfse),
    });

    const { data: certificadoA1Doc } = useQuery({
        queryKey: ["company_document", companyId, "certificado_a1", isUsingSecondary],
        queryFn: async () => {
            if (!companyId) return null;
            const { data, error } = await (activeClient as any)
                .from("company_documents")
                .select("id, file_name, created_at")
                .eq("company_id", companyId)
                .eq("doc_type", "certificado_a1")
                .order("created_at", { ascending: false })
                .limit(1);
            if (error) throw error;
            return Array.isArray(data) && data.length ? data[0] : null;
        },
        enabled: Boolean(companyId) && (Boolean(selectedCompany?.enable_nfe) || Boolean(selectedCompany?.enable_nfce)),
    });

    const isNfseConfigured = useMemo(() => {
        if (!selectedCompany?.enable_nfse) return false;
        const provider = String((nfseSettings as any)?.provider || "").trim();
        const city = String((nfseSettings as any)?.city_name || "").trim();
        const ibge = String((nfseSettings as any)?.city_ibge_code || "").trim();
        return Boolean(provider && (ibge || city));
    }, [nfseSettings, selectedCompany?.enable_nfse]);

    const hasCertificadoA1 = useMemo(() => Boolean((certificadoA1Doc as any)?.id), [certificadoA1Doc]);

    if (!selectedCompany) {
        return (
            <AppLayout title="Detalhes da Empresa">
                <div className="flex flex-col items-center justify-center h-full py-20">
                    <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full mb-4"></div>
                    <p className="text-slate-500">Carregando dados da empresa...</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title={`${selectedCompany.nome_fantasia || selectedCompany.razao_social} - Dashboard`}>
            <div className="space-y-6 animate-fade-in">
                <Button
                    variant="ghost"
                    className="mb-4 pl-0 hover:bg-transparent hover:text-green-600"
                    onClick={() => navigate('/dashboard')}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista de Empresas
                </Button>

                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                        Perfil: {activityProfileLabel}
                    </Badge>
                    {selectedCompany.enable_nfse ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            NFS-e
                        </Badge>
                    ) : null}
                    {selectedCompany.enable_nfe ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            NF-e
                        </Badge>
                    ) : null}
                    {selectedCompany.enable_nfce ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            NFC-e
                        </Badge>
                    ) : null}
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* Placeholder Cards for Company Specific Stats */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{headlineLabel}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">R$ 0,00</div>
                            <p className="text-xs text-muted-foreground">+0% em relação ao mês anterior</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{secondLabel}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">A Pagar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">R$ 0,00</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">A Receber</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">R$ 0,00</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>Últimas Movimentações</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Nenhuma movimentação recente.</p>
                        </CardContent>
                    </Card>
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>Dados da Empresa</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Razão Social:</dt>
                                    <dd className="font-medium text-right">{selectedCompany.razao_social}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">CNPJ:</dt>
                                    <dd className="font-medium">{selectedCompany.cnpj}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Cidade/UF:</dt>
                                    <dd className="font-medium">{selectedCompany.endereco_cidade}/{selectedCompany.endereco_estado}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Perfil:</dt>
                                    <dd className="font-medium">{activityProfileLabel}</dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>
                    <Card className="col-span-1 md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between gap-3">
                            <CardTitle>Módulos Fiscais</CardTitle>
                            <Button
                                variant="outline"
                                className="border-green-600 text-green-700 hover:bg-green-50 font-bold"
                                onClick={() => navigate(`/empresas?edit=${selectedCompany.id}&tab=documentos`)}
                            >
                                Configurar
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                <Badge
                                    variant="outline"
                                    className={selectedCompany.enable_nfse ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}
                                >
                                    NFS-e
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={selectedCompany.enable_nfe ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}
                                >
                                    NF-e
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={selectedCompany.enable_nfce ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}
                                >
                                    NFC-e
                                </Badge>
                            </div>

                            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                                {selectedCompany.enable_nfse ? (
                                    <div className={isNfseConfigured ? "text-green-700" : "text-amber-700"}>
                                        NFS-e: {isNfseConfigured ? "configurada" : "pendente de configuração"}
                                    </div>
                                ) : null}
                                {selectedCompany.enable_nfe || selectedCompany.enable_nfce ? (
                                    <div className={hasCertificadoA1 ? "text-green-700" : "text-amber-700"}>
                                        Certificado A1: {hasCertificadoA1 ? "anexado" : "pendente"}
                                    </div>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
