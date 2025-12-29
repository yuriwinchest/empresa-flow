import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

export default function Relatorios() {
    const { selectedCompany } = useCompany();
    const { activeClient, isUsingSecondary } = useAuth();
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
        end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    });

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

    type ReportTransaction = {
        date: string;
        type: "credit" | "debit";
        amount: number;
        category?: { name: string; type?: string } | null;
    };

    const { data: transactions, isLoading } = useQuery({
        queryKey: ["reports_transactions", selectedCompany?.id, dateRange, isUsingSecondary],
        queryFn: async () => {
            if (!selectedCompany?.id) return [];

            const { data, error } = await (activeClient as any)
                .from("transactions")
                .select(
                    `
                    date,
                    type,
                    amount,
                    category:categories(name,type)
                `,
                )
                .eq("company_id", selectedCompany.id)
                .gte("date", dateRange.start)
                .lte("date", dateRange.end)
                .order("date", { ascending: true })
                .order("created_at", { ascending: true });

            if (error) throw error;
            return (data || []) as ReportTransaction[];
        },
        enabled: !!selectedCompany?.id,
    });

    const summary = useMemo(() => {
        const rows = transactions ?? [];
        let totalIn = 0;
        let totalOut = 0;

        for (const t of rows) {
            const amount = Number(t.amount || 0);
            if (t.type === "credit") totalIn += amount;
            if (t.type === "debit") totalOut += amount;
        }

        return { totalIn, totalOut, net: totalIn - totalOut };
    }, [transactions]);

    const bucketed = useMemo(() => {
        const rows = transactions ?? [];
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        const dayMs = 24 * 60 * 60 * 1000;
        const totalDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / dayMs) + 1);
        const groupByMonth = totalDays > 45;

        const map = new Map<
            string,
            { key: string; label: string; receitas: number; despesas: number; saldo: number; acumulado: number }
        >();

        for (const t of rows) {
            const key = groupByMonth ? t.date.slice(0, 7) : t.date;
            const label = groupByMonth
                ? format(new Date(`${key}-01`), "MM/yyyy")
                : format(new Date(t.date), "dd/MM");
            const prev = map.get(key) ?? { key, label, receitas: 0, despesas: 0, saldo: 0, acumulado: 0 };

            const amount = Number(t.amount || 0);
            if (t.type === "credit") prev.receitas += amount;
            if (t.type === "debit") prev.despesas += amount;
            prev.saldo = prev.receitas - prev.despesas;

            map.set(key, prev);
        }

        const sorted = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
        let running = 0;
        for (const item of sorted) {
            running += item.saldo;
            item.acumulado = running;
        }

        return { groupByMonth, data: sorted };
    }, [transactions, dateRange.start, dateRange.end]);

    const topCategories = useMemo(() => {
        const rows = transactions ?? [];
        const expenses = new Map<string, number>();
        const income = new Map<string, number>();

        for (const t of rows) {
            const name = t.category?.name || "Sem categoria";
            const amount = Number(t.amount || 0);
            if (t.type === "debit") expenses.set(name, (expenses.get(name) ?? 0) + amount);
            if (t.type === "credit") income.set(name, (income.get(name) ?? 0) + amount);
        }

        const top = (m: Map<string, number>) =>
            Array.from(m.entries())
                .map(([name, total]) => ({ name, total }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 8);

        return { expenses: top(expenses), income: top(income) };
    }, [transactions]);

    return (
        <AppLayout title="Relatórios">
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                            className="h-9 w-40"
                        />
                        <span className="text-muted-foreground">a</span>
                        <Input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                            className="h-9 w-40"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas no período</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
                                <ArrowUpCircle className="h-6 w-6" />
                                {formatCurrency(summary.totalIn)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas no período</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
                                <ArrowDownCircle className="h-6 w-6" />
                                {formatCurrency(summary.totalOut)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado do período</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`text-2xl font-bold flex items-center gap-2 ${summary.net >= 0 ? "text-blue-600" : "text-red-600"}`}
                            >
                                <TrendingUp className="h-6 w-6" />
                                {formatCurrency(summary.net)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Receitas x Despesas {bucketed.groupByMonth ? "(mensal)" : "(diário)"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer
                                className="w-full"
                                config={{
                                    receitas: { label: "Receitas", color: "hsl(var(--success))" },
                                    despesas: { label: "Despesas", color: "hsl(var(--destructive))" },
                                }}
                            >
                                <BarChart data={bucketed.data} margin={{ left: 8, right: 8, top: 8 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="label" tickMargin={8} minTickGap={12} />
                                    <YAxis tickFormatter={(v) => new Intl.NumberFormat("pt-BR").format(v)} width={80} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <ChartLegend content={<ChartLegendContent />} />
                                    <Bar dataKey="receitas" fill="var(--color-receitas)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="despesas" fill="var(--color-despesas)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Saldo acumulado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer
                                className="w-full"
                                config={{
                                    acumulado: { label: "Saldo acumulado", color: "hsl(var(--primary))" },
                                }}
                            >
                                <LineChart data={bucketed.data} margin={{ left: 8, right: 8, top: 8 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="label" tickMargin={8} minTickGap={12} />
                                    <YAxis tickFormatter={(v) => new Intl.NumberFormat("pt-BR").format(v)} width={80} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Line
                                        type="monotone"
                                        dataKey="acumulado"
                                        stroke="var(--color-acumulado)"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Top despesas por categoria</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer
                                className="w-full"
                                config={{
                                    total: { label: "Despesas", color: "hsl(var(--destructive))" },
                                }}
                            >
                                <BarChart data={topCategories.expenses} layout="vertical" margin={{ left: 80, right: 8, top: 8 }}>
                                    <CartesianGrid horizontal={false} />
                                    <XAxis type="number" tickFormatter={(v) => new Intl.NumberFormat("pt-BR").format(v)} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={160}
                                        tickFormatter={(v) => String(v).slice(0, 22)}
                                    />
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(value) => (
                                                    <span className="font-mono font-medium tabular-nums text-foreground">
                                                        {formatCurrency(Number(value))}
                                                    </span>
                                                )}
                                            />
                                        }
                                    />
                                    <Bar dataKey="total" fill="var(--color-total)" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Top receitas por categoria</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer
                                className="w-full"
                                config={{
                                    total: { label: "Receitas", color: "hsl(var(--success))" },
                                }}
                            >
                                <BarChart data={topCategories.income} layout="vertical" margin={{ left: 80, right: 8, top: 8 }}>
                                    <CartesianGrid horizontal={false} />
                                    <XAxis type="number" tickFormatter={(v) => new Intl.NumberFormat("pt-BR").format(v)} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={160}
                                        tickFormatter={(v) => String(v).slice(0, 22)}
                                    />
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(value) => (
                                                    <span className="font-mono font-medium tabular-nums text-foreground">
                                                        {formatCurrency(Number(value))}
                                                    </span>
                                                )}
                                            />
                                        }
                                    />
                                    <Bar dataKey="total" fill="var(--color-total)" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>

                {isLoading && (
                    <div className="text-center py-8 text-muted-foreground">
                        Carregando dados do relatório...
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
