import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, Trash2, Landmark } from "lucide-react";
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
import { BankAccountSheet } from "@/components/bank-accounts/BankAccountSheet";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Badge } from "@/components/ui/badge";
import { logDeletion } from "@/lib/audit";

export default function ContasBancarias() {
    const { selectedCompany } = useCompany();
    const { activeClient, isUsingSecondary, user } = useAuth();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const { data: accounts, isLoading, refetch } = useQuery({
        queryKey: ["bank_accounts", selectedCompany?.id, isUsingSecondary],
        queryFn: async () => {
            if (!selectedCompany?.id) return [];
            const { data, error } = await activeClient
                .from("bank_accounts")
                .select("*")
                .eq("company_id", selectedCompany.id)
                .order("name");

            if (error) throw error;
            return data;
        },
        enabled: !!selectedCompany?.id,
    });

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setIsSheetOpen(true);
    };

    const handleNew = () => {
        setEditingItem(null);
        setIsSheetOpen(true);
    };

    const handleDelete = async (acc: any) => {
        const ok = window.confirm(`Excluir a conta "${acc.name}"?`);
        if (!ok) return;
        const { error } = await activeClient.from("bank_accounts").delete().eq("id", acc.id);
        if (!error) {
            refetch();
            if (user?.id) {
                await logDeletion(activeClient, {
                    userId: user.id,
                    companyId: selectedCompany?.id || null,
                    entity: "bank_accounts",
                    entityId: acc.id,
                    payload: { name: acc.name },
                });
            }
        }
    };
    const filteredAccounts = accounts?.filter(acc =>
        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (acc.banco || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppLayout title="Contas Bancárias">
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Landmark className="h-8 w-8 text-primary" />
                        Contas Bancárias
                    </h2>
                    <Button onClick={handleNew}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Conta
                    </Button>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle>Minhas Contas</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome ou banco..."
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
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Banco</TableHead>
                                    <TableHead>Ag/Conta</TableHead>
                                    <TableHead>Saldo Atual</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Carregando contas...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredAccounts?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Nenhuma conta bancária encontrada.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAccounts?.map((acc) => (
                                        <TableRow key={acc.id}>
                                            <TableCell className="font-medium">{acc.name}</TableCell>
                                            <TableCell>{acc.banco || "-"}</TableCell>
                                            <TableCell>
                                                {acc.agencia && acc.conta ? `${acc.agencia} / ${acc.conta}${acc.digito ? '-' + acc.digito : ''}` : '-'}
                                            </TableCell>
                                            <TableCell className={acc.current_balance >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.current_balance)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(acc)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(acc)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <BankAccountSheet
                    isOpen={isSheetOpen}
                    onClose={() => {
                        setIsSheetOpen(false);
                        setEditingItem(null);
                    }}
                    dataToEdit={editingItem}
                />
            </div>
        </AppLayout>
    );
}
