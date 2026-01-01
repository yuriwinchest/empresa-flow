import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from "recharts";
import { startOfMonth, endOfMonth, subMonths, format, parseISO, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

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

    const { data: financials } = useQuery({
        queryKey: ["dashboard_financials", companyId, isUsingSecondary],
        queryFn: async () => {
            if (!companyId) return { payable: [], receivable: [] };

            // Fetch Payables
            const { data: payableData } = await (activeClient as any)
                .from("accounts_payable")
                .select("amount, due_date, status, payment_date")
                .eq("company_id", companyId);

            // Fetch Receivables
            const { data: receivableData } = await (activeClient as any)
                .from("accounts_receivable")
                .select("amount, due_date, status, receive_date")
                .eq("company_id", companyId);

            return {
                payable: payableData || [],
                receivable: receivableData || []
            };
        },
        enabled: Boolean(companyId),
    });

    const stats = useMemo(() => {
        if (!financials) return { totalPayablePending: 0, totalReceivablePending: 0, balance: 0 };

        const totalPayablePending = financials.payable
            .filter((i: any) => i.status === 'pending')
            .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

        const totalReceivablePending = financials.receivable
            .filter((i: any) => i.status === 'pending')
            .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

        return {
            totalPayablePending,
            totalReceivablePending,
            balance: totalReceivablePending - totalPayablePending
        };
    }, [financials]);

    const chartData = useMemo(() => {
        if (!financials) return [];

        const data = [];
        const today = new Date();

        for (let i = 5; i >= 0; i--) {
            const date = subMonths(today, i);
            const monthStr = format(date, "MMM", { locale: ptBR });
            const monthFull = format(date, "yyyy-MM");

            const monthlyPayable = financials.payable
                .filter((item: any) => {
                    const itemDate = item.status === 'paid' && item.payment_date
                        ? parseISO(item.payment_date)
                        : parseISO(item.due_date);
                    return isSameMonth(itemDate, date);
                })
                .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

            const monthlyReceivable = financials.receivable
                .filter((item: any) => {
                    const itemDate = item.status === 'paid' && item.receive_date
                        ? parseISO(item.receive_date)
                        : parseISO(item.due_date);
                    return isSameMonth(itemDate, date);
                })
                .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

            data.push({
                name: monthStr.charAt(0).toUpperCase() + monthStr.slice(1),
                Entradas: monthlyReceivable,
                Saidas: monthlyPayable,
            });
        }
        return data;
    }, [financials]);

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
                    <Card className="border-0 shadow-lg bg-white overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Saldo Previsto</CardTitle>
                            <DollarSign className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.balance)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Recebíveis - Pagáveis (Pendentes)
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-l-emerald-500 overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-700">A Receber (Pendente)</CardTitle>
                            <ArrowUpRight className="h-4 w-4 text-emerald-400 group-hover:text-emerald-600 transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-700">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalReceivablePending)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-50 border-l-4 border-l-red-500 overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-red-700">A Pagar (Pendente)</CardTitle>
                            <ArrowDownRight className="h-4 w-4 text-red-400 group-hover:text-red-600 transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalPayablePending)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-white overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{headlineLabel}</CardTitle>
                            <TrendingUp className="h-4 w-4 text-slate-300 group-hover:text-purple-500 transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                    chartData[chartData.length - 1]?.Entradas || 0
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Neste mês</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-3 h-[400px]">
                    <Card className="md:col-span-2 border-0 shadow-xl bg-white/80 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="text-slate-800">Fluxo de Caixa (Últimos 6 Meses)</CardTitle>
                            <CardDescription>Comparativo de Entradas e Saídas</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `R$ ${value / 1000}k`}
                                    />
                                    <Tooltip
                                        formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number)}
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Saidas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="text-slate-800">Evolução</CardTitle>
                            <CardDescription>Tendência de Receita</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number)}
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="Entradas" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorEntradas)" />
                                </AreaChart>
                            </ResponsiveContainer>
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
