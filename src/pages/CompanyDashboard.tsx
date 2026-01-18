
import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Wallet } from "lucide-react";
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
    LineChart,
    Line,
    ReferenceLine
} from "recharts";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useFinanceDashboard } from "@/modules/finance/presentation/hooks/useFinanceDashboard";

export default function CompanyDashboard() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, activeClient, isUsingSecondary } = useAuth();
    const { companies } = useCompanies(user?.id);
    const { setSelectedCompany, selectedCompany } = useCompany();

    // Sincroniza empresa selecionada via URL
    useEffect(() => {
        if (id && companies) {
            const company = companies.find(c => c.id === id);
            if (company) {
                setSelectedCompany(company);
            }
        }
    }, [id, companies, setSelectedCompany]);

    const companyId = selectedCompany?.id || null;

    // Hook novo de Dashboard Financeiro
    const {
        accountsBalance,
        receivablesSummary,
        payablesSummary,
        cashFlowData
    } = useFinanceDashboard();

    const activityProfileLabel = useMemo(() => {
        const p = selectedCompany?.activity_profile || "comercio";
        if (p === "servico") return "Serviço";
        if (p === "mista") return "Mista";
        return "Comércio";
    }, [selectedCompany?.activity_profile]);

    // Dados para gráfico (já vêm formatados do hook, mas garantindo array vazio)
    const chartData = cashFlowData || [];

    // Settings (mantido do original para status de configuração)
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

    const isNfseConfigured = useMemo(() => {
        if (!selectedCompany?.enable_nfse) return false;
        const provider = String((nfseSettings as any)?.provider || "").trim();
        const city = String((nfseSettings as any)?.city_name || "").trim();
        const ibge = String((nfseSettings as any)?.city_ibge_code || "").trim();
        return Boolean(provider && (ibge || city));
    }, [nfseSettings, selectedCompany?.enable_nfse]);

    if (!selectedCompany) {
        return (
            <AppLayout title="Detalhes da Empresa">
                <div className="flex flex-col items-center justify-center h-full py-20">
                    <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full mb-4"></div>
                    <p className="text-slate-500">Carregando dados da empresa...</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title={`${selectedCompany.nome_fantasia || selectedCompany.razao_social} - Dashboard`}>
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                    <Button
                        variant="ghost"
                        className="pl-0 hover:bg-transparent hover:text-emerald-600"
                        onClick={() => navigate('/dashboard')}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista
                    </Button>
                    <div className="flex gap-2">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                            {activityProfileLabel}
                        </Badge>
                        {selectedCompany.enable_nfse && <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">NFS-e</Badge>}
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

                    {/* Saldo em Banco */}
                    <Card className="border-0 shadow-lg bg-white overflow-hidden relative group hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Saldo Bancário (Atual)</CardTitle>
                            <Wallet className="h-4 w-4 text-blue-400 group-hover:text-blue-600 transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(accountsBalance || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Conforme conciliação</p>
                        </CardContent>
                    </Card>

                    {/* A Receber */}
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-white border-l-4 border-l-emerald-500 hover:shadow-xl transition-all">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-700">A Receber (Pendentes)</CardTitle>
                            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-700">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((receivablesSummary?.overdue || 0) + (receivablesSummary?.today || 0) + (receivablesSummary?.month || 0))}
                            </div>
                            <div className="flex gap-2 mt-1 text-xs">
                                <span className="text-red-600 font-medium">Vencidos: {new Intl.NumberFormat('pt-BR', { compactDisplay: "short", notation: "compact", currency: 'BRL', style: 'currency' }).format(receivablesSummary?.overdue || 0)}</span>
                                <span className="text-emerald-600">Hoje: {new Intl.NumberFormat('pt-BR', { compactDisplay: "short", notation: "compact", currency: 'BRL', style: 'currency' }).format(receivablesSummary?.today || 0)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* A Pagar */}
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-50 to-white border-l-4 border-l-red-500 hover:shadow-xl transition-all">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-red-700">A Pagar (Pendentes)</CardTitle>
                            <ArrowDownRight className="h-4 w-4 text-red-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((payablesSummary?.overdue || 0) + (payablesSummary?.today || 0) + (payablesSummary?.month || 0))}
                            </div>
                            <div className="flex gap-2 mt-1 text-xs">
                                <span className="text-red-600 font-medium">Vencidos: {new Intl.NumberFormat('pt-BR', { compactDisplay: "short", notation: "compact", currency: 'BRL', style: 'currency' }).format(payablesSummary?.overdue || 0)}</span>
                                <span className="text-slate-500">Hoje: {new Intl.NumberFormat('pt-BR', { compactDisplay: "short", notation: "compact", currency: 'BRL', style: 'currency' }).format(payablesSummary?.today || 0)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Projeção (Saldo Final do Mês) */}
                    <Card className="border-0 shadow-lg bg-white border-l-4 border-l-purple-500 hover:shadow-xl transition-all">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Projeção (Fim do Mês)</CardTitle>
                            <TrendingUp className="h-4 w-4 text-purple-400" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${(chartData[chartData.length - 1]?.saldo_acumulado || 0) >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                    chartData[chartData.length - 1]?.saldo_acumulado || 0
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Saldo Estimado</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Gráficos */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 h-[450px]">

                    {/* Fluxo de Caixa Diário (Bars) */}
                    <Card className="lg:col-span-2 border-0 shadow-xl bg-white/80 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="text-slate-800">Fluxo de Caixa Diário (Este Mês)</CardTitle>
                            <CardDescription>Entradas e Saídas previstas dia a dia</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `R$${val / 1000}k`}
                                    />
                                    <Tooltip
                                        formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number)}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <ReferenceLine y={0} stroke="#000" strokeOpacity={0.1} />
                                    <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Saldo Acumulado (Line) */}
                    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="text-slate-800">Projeção de Saldo</CardTitle>
                            <CardDescription>Evolução do Saldo Acumulado</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={30} />
                                    <YAxis
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `${val >= 0 ? '' : '-'}${Math.abs(val) / 1000}k`}
                                    />
                                    <Tooltip
                                        formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number)}
                                        labelStyle={{ color: '#6b7280' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                                    <Area
                                        type="monotone"
                                        dataKey="saldo_acumulado"
                                        name="Saldo Acumulado"
                                        stroke="#8b5cf6"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorSaldo)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6 pb-12">
                    <Card className="border-0 shadow-lg bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-slate-800 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                                Resultado do Mês (DRE)
                            </CardTitle>
                            <CardDescription>Resumo baseado no Plano de Contas</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="font-bold">Grupo/Categoria</TableHead>
                                        <TableHead className="text-right font-bold">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(!dreSummary || dreSummary.length === 0) ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-8 text-muted-foreground italic">
                                                Nenhuma transação categorizada este mês.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        dreSummary.map((group: any) => (
                                            <TableRow key={group.name} className="hover:bg-slate-50 transition-colors">
                                                <TableCell className="py-3 font-medium text-slate-700">
                                                    {group.name}
                                                </TableCell>
                                                <TableCell className={`py-3 text-right font-bold ${group.total >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(group.total)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    {dreSummary && dreSummary.length > 0 && (
                                        <TableRow className="bg-slate-100/50">
                                            <TableCell className="py-4 font-black text-slate-800">RESULTADO LÍQUIDO</TableCell>
                                            <TableCell className={`py-4 text-right font-black ${dreSummary.reduce((acc: number, curr: any) => acc + curr.total, 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                    dreSummary.reduce((acc: number, curr: any) => acc + curr.total, 0)
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-white">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-slate-800">Status de Configuração</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-slate-600 font-medium">NFS-e Configurada</span>
                                    <Badge variant={isNfseConfigured ? 'default' : 'secondary'} className={isNfseConfigured ? 'bg-green-100 text-green-700' : ''}>
                                        {isNfseConfigured ? 'Ativo' : 'Pendente'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-slate-600 font-medium">Plano de Contas</span>
                                    <Badge variant={dreSummary && dreSummary.length > 0 ? 'default' : 'secondary'} className={dreSummary && dreSummary.length > 0 ? 'bg-blue-100 text-blue-700' : ''}>
                                        {dreSummary && dreSummary.length > 0 ? 'Em Uso' : 'Configurado'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-slate-600 font-medium">Certificado Digital</span>
                                    <Badge variant="outline" className="text-slate-400">Não Detectado</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
