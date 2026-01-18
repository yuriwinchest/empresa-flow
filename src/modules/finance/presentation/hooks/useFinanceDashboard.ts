
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useFinanceDashboard() {
    const { selectedCompany } = useCompany();

    // 1. Saldo Total em Bancos
    const { data: accountsBalance } = useQuery({
        queryKey: ['dashboard_accounts_balance', selectedCompany?.id],
        queryFn: async () => {
            if (!selectedCompany?.id) return 0;
            const { data, error } = await supabase
                .from('bank_accounts')
                .select('current_balance')
                .eq('company_id', selectedCompany.id);
            if (error) throw error;
            return data.reduce((acc, curr) => acc + (curr.current_balance || 0), 0);
        },
        enabled: !!selectedCompany?.id
    });

    // 2. Contas a Receber (Total Vencido, Hoje, Mês)
    const { data: receivablesSummary } = useQuery({
        queryKey: ['dashboard_receivables', selectedCompany?.id],
        queryFn: async () => {
            if (!selectedCompany?.id) return { overdue: 0, today: 0, month: 0 };
            const today = new Date();
            const startMonth = startOfMonth(today).toISOString();
            const endMonth = endOfMonth(today).toISOString();
            const startDay = startOfDay(today).toISOString();
            const endDay = endOfDay(today).toISOString();

            // Buscar todos pendentes
            const { data, error } = await supabase
                .from('accounts_receivable')
                .select('amount, due_date')
                .eq('company_id', selectedCompany.id)
                .eq('status', 'pending');

            if (error) throw error;

            let overdue = 0;
            let amountToday = 0;
            let month = 0;

            data.forEach((r: any) => {
                const dueDate = new Date(r.due_date);
                if (dueDate < startOfDay(today)) overdue += r.amount;
                if (dueDate >= startOfDay(today) && dueDate <= endOfDay(today)) amountToday += r.amount;
                if (dueDate >= startOfMonth(today) && dueDate <= endOfMonth(today)) month += r.amount;
            });

            return { overdue, today: amountToday, month };
        },
        enabled: !!selectedCompany?.id
    });

    // 3. Contas a Pagar (Total Vencido, Hoje, Mês)
    const { data: payablesSummary } = useQuery({
        queryKey: ['dashboard_payables', selectedCompany?.id],
        queryFn: async () => {
            if (!selectedCompany?.id) return { overdue: 0, today: 0, month: 0 };
            const today = new Date();

            // Buscar todos pendentes
            const { data, error } = await supabase
                .from('accounts_payable')
                .select('amount, due_date')
                .eq('company_id', selectedCompany.id)
                .eq('status', 'pending');

            if (error) throw error;

            let overdue = 0;
            let amountToday = 0;
            let month = 0;

            data.forEach((p: any) => {
                const dueDate = new Date(p.due_date);
                if (dueDate < startOfDay(today)) overdue += p.amount;
                if (dueDate >= startOfDay(today) && dueDate <= endOfDay(today)) amountToday += p.amount;
                if (dueDate >= startOfMonth(today) && dueDate <= endOfMonth(today)) month += p.amount;
            });

            return { overdue, today: amountToday, month };
        },
        enabled: !!selectedCompany?.id
    });

    // 4. Fluxo de Caixa Previsto (Gráfico)
    const { data: cashFlowData } = useQuery({
        queryKey: ['dashboard_cashflow', selectedCompany?.id],
        queryFn: async () => {
            if (!selectedCompany?.id) return [];

            const today = new Date();
            const days = eachDayOfInterval({
                start: startOfMonth(today),
                end: endOfMonth(today)
            });

            // Buscar Recebimentos e Pagamentos do Mês (Pagos e Pendentes)
            // Aqui simplificando para Previsto (Baseado em Vencimento)
            const { data: receivables } = await supabase
                .from('accounts_receivable')
                .select('amount, due_date')
                .eq('company_id', selectedCompany.id)
                .gte('due_date', startOfMonth(today).toISOString())
                .lte('due_date', endOfMonth(today).toISOString());

            const { data: payables } = await supabase
                .from('accounts_payable')
                .select('amount, due_date')
                .eq('company_id', selectedCompany.id)
                .gte('due_date', startOfMonth(today).toISOString())
                .lte('due_date', endOfMonth(today).toISOString());


            // Buscar saldo inicial (Soma dos bancos hoje)
            const { data: bankData } = await supabase
                .from('bank_accounts')
                .select('current_balance')
                .eq('company_id', selectedCompany.id);

            let currentBalance = bankData?.reduce((acc, curr) => acc + (curr.current_balance || 0), 0) || 0;

            const chartData = days.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');

                const rec = receivables?.filter((r: any) => r.due_date.startsWith(dayStr))
                    .reduce((sum, r) => sum + r.amount, 0) || 0;

                const pay = payables?.filter((p: any) => p.due_date.startsWith(dayStr))
                    .reduce((sum, p) => sum + p.amount, 0) || 0;

                const dailyNet = rec - pay;
                currentBalance += dailyNet;

                return {
                    date: format(day, 'dd/MM'),
                    receitas: rec,
                    despesas: pay,
                    saldo_do_dia: dailyNet,
                    saldo_acumulado: currentBalance
                };
            });

            return chartData;
        },
        enabled: !!selectedCompany?.id
    });

    // 5. Resumo DRE (Baseado em Transações Reais do Mês)
    const { data: dreSummary } = useQuery({
        queryKey: ['dashboard_dre', selectedCompany?.id],
        queryFn: async () => {
            if (!selectedCompany?.id) return [];
            const today = new Date();
            const start = startOfMonth(today).toISOString();
            const end = endOfMonth(today).toISOString();

            // Buscar transações com join no plano de contas
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    amount,
                    type,
                    category:chart_of_accounts (
                        name,
                        dre_group,
                        dre_order
                    )
                `)
                .eq('company_id', selectedCompany.id)
                .gte('date', start)
                .lte('date', end);

            if (error) throw error;

            // Agrupar por dre_group
            const groups: Record<string, { name: string, total: number, order: number }> = {};

            data.forEach((t: any) => {
                const groupName = t.category?.dre_group || 'Outros';
                const order = t.category?.dre_order || 99;

                if (!groups[groupName]) {
                    groups[groupName] = { name: groupName, total: 0, order };
                }

                // Crédito aumenta, Débito diminui (simplificado para DRE)
                // Geralmente DRE mostra Receitas (+) e Custos/Despesas (-)
                if (t.type === 'credit') groups[groupName].total += t.amount;
                else groups[groupName].total -= t.amount;
            });

            return Object.values(groups).sort((a, b) => a.order - b.order);
        },
        enabled: !!selectedCompany?.id
    });

    return {
        accountsBalance,
        receivablesSummary,
        payablesSummary,
        cashFlowData,
        dreSummary
    };
}
