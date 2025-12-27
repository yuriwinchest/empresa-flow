import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountsReceivableSheet } from "@/components/finance/AccountsReceivableSheet";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { format } from "date-fns";
import { AccountsReceivable } from "@/types/finance";
import { Badge } from "@/components/ui/badge";

import { PaymentModal } from "@/components/transactions/PaymentModal";

export default function ContasReceber() {
    const { selectedCompany } = useCompany();
    const { activeClient } = useAuth();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<AccountsReceivable | undefined>(undefined);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentItem, setPaymentItem] = useState<AccountsReceivable | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all"); // all, pending, paid

    const { data: bills, isLoading } = useQuery({
        queryKey: ["accounts_receivable", selectedCompany?.id, activeClient],
        queryFn: async () => {
            if (!selectedCompany?.id) return [];
            const { data, error } = await activeClient
                .from("accounts_receivable")
                .select(`
            *,
            client:clients(razao_social, nome_fantasia),
            category:categories(name)
        `)
                .eq("company_id", selectedCompany.id)
                .order("due_date", { ascending: true });

            if (error) throw error;
            return data as unknown as AccountsReceivable[];
        },
        enabled: !!selectedCompany?.id,
    });

    const handleEdit = (item: AccountsReceivable) => {
        setEditingItem(item);
        setIsSheetOpen(true);
    };

    const handleNew = () => {
        setEditingItem(undefined);
        setIsSheetOpen(true);
    };

    const filteredBills = bills?.filter(bill => {
        const matchesSearch =
            bill.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (bill.client?.razao_social || "").toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string, dueDate: string) => {
        const isOverdue = new Date(dueDate) < new Date() && status === 'pending';

        if (status === 'paid') return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Recebido</Badge>;
        if (status === 'cancelled') return <Badge variant="secondary">Cancelado</Badge>;
        if (isOverdue) return <Badge variant="destructive">Atrasado</Badge>;
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Pendente</Badge>;
    };

    return (
        <AppLayout title="Contas a Receber">
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-3xl font-bold tracking-tight text-green-700 flex items-center gap-2">
                        <DollarSign className="h-8 w-8" />
                        Contas a Receber
                    </h2>
                    <Button onClick={handleNew} className="bg-green-600 hover:bg-green-700">
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Recebimento
                    </Button>
                </div>

                <Card>
                    <CardHeader className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 pb-4">
                        <div className="flex items-center gap-2">
                            <Button
                                variant={statusFilter === 'all' ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setStatusFilter('all')}
                            >
                                Todas
                            </Button>
                            <Button
                                variant={statusFilter === 'pending' ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setStatusFilter('pending')}
                            >
                                A Receber
                            </Button>
                            <Button
                                variant={statusFilter === 'paid' ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setStatusFilter('paid')}
                            >
                                Recebidas
                            </Button>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por descrição ou cliente..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Vencimento</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            Carregando recebimentos...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredBills?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            Nenhum recebimento encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBills?.map((bill) => (
                                        <TableRow key={bill.id}>
                                            <TableCell className="font-medium whitespace-nowrap">
                                                {format(new Date(bill.due_date), "dd/MM/yyyy")}
                                            </TableCell>
                                            <TableCell>{bill.description}</TableCell>
                                            <TableCell>{bill.client?.razao_social || "-"}</TableCell>
                                            <TableCell className="font-bold text-green-600">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.amount)}
                                            </TableCell>
                                            <TableCell>{bill.category?.name || "-"}</TableCell>
                                            <TableCell>
                                                {getStatusBadge(bill.status, bill.due_date)}
                                            </TableCell>
                                            <TableCell className="text-right flex justify-end gap-2">
                                                {bill.status === 'pending' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                        onClick={() => {
                                                            setPaymentItem(bill);
                                                            setIsPaymentModalOpen(true);
                                                        }}
                                                    >
                                                        <DollarSign className="h-4 w-4 mr-1" />
                                                        Receber
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(bill)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <AccountsReceivableSheet
                    isOpen={isSheetOpen}
                    onClose={() => {
                        setIsSheetOpen(false);
                        setEditingItem(undefined);
                    }}
                    dataToEdit={editingItem}
                />

                {paymentItem && (
                    <PaymentModal
                        isOpen={isPaymentModalOpen}
                        onClose={() => {
                            setIsPaymentModalOpen(false);
                            setPaymentItem(null);
                        }}
                        accountingId={paymentItem.id}
                        type="receivable"
                        initialAmount={paymentItem.amount}
                        description={`Recebimento: ${paymentItem.description}`}
                        onSuccess={() => {
                            // Refetch data
                            window.location.reload();
                        }}
                    />
                )}
            </div>
        </AppLayout>
    );
}
