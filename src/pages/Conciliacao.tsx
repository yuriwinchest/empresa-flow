import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parseOFX } from "@/lib/parsers/ofx";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Upload, Check, X, AlertCircle, RefreshCw, Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Conciliacao() {
    const { selectedCompany } = useCompany();
    const { activeClient } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedAccount, setSelectedAccount] = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);
    const [selectedBankTx, setSelectedBankTx] = useState<any>(null); // For pairing dialog

    // 1. Fetch Bank Accounts
    const { data: bankAccounts, error: bankError } = useQuery({
        queryKey: ["bank_accounts", selectedCompany?.id],
        queryFn: async () => {
            const { data, error } = await activeClient
                .from("bank_accounts")
                .select("*")
                .eq("company_id", selectedCompany?.id);
            if (error) throw error;
            return data;
        },
        enabled: !!selectedCompany?.id,
    });

    // Fetch Categories for "Create New"
    const { data: categories } = useQuery({
        queryKey: ["categories_conciliacao", selectedCompany?.id],
        queryFn: async () => {
            const { data, error } = await activeClient
                .from("categories")
                .select("*")
                .eq("company_id", selectedCompany?.id)
                .eq("is_active", true);
            if (error) throw error;
            return data;
        },
        enabled: !!selectedCompany?.id,
    });

    const [newTxDescription, setNewTxDescription] = useState("");
    const [newTxCategory, setNewTxCategory] = useState("");



    // 2. Fetch Pending Bank Transactions
    const { data: bankTransactions, isLoading: isLoadingBankTx } = useQuery({
        queryKey: ["bank_transactions", selectedCompany?.id, selectedAccount],
        queryFn: async () => {
            const { data, error } = await activeClient
                .from("bank_transactions")
                .select("*")
                .eq("company_id", selectedCompany?.id)
                .eq("bank_account_id", selectedAccount)
                .eq("status", "pending")
                .order("date", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!selectedCompany?.id && !!selectedAccount,
    });

    // 3. Fetch Possible Matches (System Transactions)
    // Fetching pending transactions to match against
    const { data: systemTransactions } = useQuery({
        queryKey: ["transactions_for_matching", selectedCompany?.id],
        queryFn: async () => {
            const { data, error } = await activeClient
                .from("transactions")
                .select("*")
                .eq("company_id", selectedCompany?.id)
                .eq("status", "pending")
                .order("due_date", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!selectedCompany?.id,
    });

    // Upload Mutation
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!selectedCompany?.id) throw new Error("Empresa não selecionada");
            if (!selectedAccount) throw new Error("Selecione uma conta bancária");

            const parsed = await parseOFX(file);
            if (parsed.length === 0) throw new Error("Nenhuma transação encontrada no arquivo");

            // Prepare for bulk insert
            const toInsert = parsed.map(tx => ({
                company_id: selectedCompany?.id,
                bank_account_id: selectedAccount,
                fit_id: tx.fitId,
                date: format(tx.date, 'yyyy-MM-dd'),
                amount: tx.amount,
                description: tx.description,
                memo: tx.memo,
                type: tx.type,
                status: 'pending'
            }));

            const { error } = await activeClient
                .from("bank_transactions")
                .upsert(toInsert, { onConflict: 'bank_account_id,fit_id', ignoreDuplicates: true });

            if (error) throw error;
            return parsed.length;
        },
        onSuccess: (count) => {
            toast({ title: "Importação concluída", description: `${count} transações processadas.` });
            queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
            if (fileInputRef.current) fileInputRef.current.value = "";
        },
        onError: (err: any) => {
            toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadMutation.mutate(file);
    };

    // Match Mutation
    const matchMutation = useMutation({
        mutationFn: async ({ bankTxId, sysTxId }: { bankTxId: string, sysTxId: string }) => {
            // 1. Update bank_transaction status
            const { error: bankErr } = await activeClient
                .from("bank_transactions")
                .update({ status: 'matched', matched_transaction_id: sysTxId })
                .eq("id", bankTxId);
            if (bankErr) throw bankErr;

            // 2. Update system transaction status (Mark as Paid)
            const { error: sysErr } = await activeClient
                .from("transactions")
                .update({ status: 'paid' }) // Simplified. Usually needs payment_date, etc.
                .eq("id", sysTxId);
            if (sysErr) throw sysErr;
        },
        onSuccess: () => {
            toast({ title: "Conciliado com sucesso" });
            queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
            queryClient.invalidateQueries({ queryKey: ["transactions_for_matching"] });
            setSelectedBankTx(null);
        }
    });

    // Ignore Mutation
    const ignoreMutation = useMutation({
        mutationFn: async (bankTxId: string) => {
            const { error } = await activeClient
                .from("bank_transactions")
                .update({ status: 'ignored' })
                .eq("id", bankTxId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Transação ignorada" });
            queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
        }
    });

    // Create New Transaction Mutation
    const createAndMatchMutation = useMutation({
        mutationFn: async () => {
            if (!selectedBankTx) throw new Error("Nenhuma transação selecionada");
            if (!newTxCategory) throw new Error("Selecione uma categoria");

            // 1. Insert Transaction
            const { data: newTx, error: txError } = await activeClient
                .from("transactions")
                .insert({
                    company_id: selectedCompany.id,
                    bank_account_id: selectedAccount,
                    category_id: newTxCategory,
                    type: selectedBankTx.type, // 'credit' or 'debit' matches transaction table constraint
                    amount: selectedBankTx.amount,
                    date: format(parseISO(selectedBankTx.date), 'yyyy-MM-dd'),
                    description: newTxDescription || selectedBankTx.description,
                    status: 'paid'
                })
                .select()
                .single();

            if (txError) throw txError;

            // 2. Match
            const { error: matchError } = await activeClient
                .from("bank_transactions")
                .update({ status: 'matched', matched_transaction_id: newTx.id })
                .eq('id', selectedBankTx.id);

            if (matchError) throw matchError;
        },
        onSuccess: () => {
            toast({ title: "Sucesso", description: "Lançamento criado e conciliado." });
            setNewTxCategory("");
            setNewTxDescription("");
            setSelectedBankTx(null);
            queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
            queryClient.invalidateQueries({ queryKey: ["transactions_for_matching"] });
        },
        onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" })
    });



    // Helper to find matches
    const getSuggestions = (bt: any) => {
        if (!systemTransactions) return [];
        return systemTransactions.filter(st => {
            // Match amount exact
            const amountMatch = Number(st.amount) === Number(bt.amount);
            // Check type
            // Check type
            // In system: 'credit' / 'debit'
            const typeMatch = (bt.type === 'credit' && st.type === 'credit') || (bt.type === 'debit' && st.type === 'debit');

            return amountMatch && typeMatch;
        });
    };

    return (
        <AppLayout title="Conciliação Bancária">
            <div className="space-y-6 animate-fade-in p-6">



                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-bold tracking-tight">Conciliação Bancária</h2>
                        <p className="text-muted-foreground">Importe OFX e concilie suas transações.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                            <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="Selecione a conta bancária" />
                            </SelectTrigger>
                            <SelectContent>
                                {bankAccounts?.map((acc: any) => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name} - {acc.banco}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="relative">
                            <input
                                type="file"
                                accept=".ofx"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                disabled={!selectedAccount || uploadMutation.isPending}
                            />
                            <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!selectedAccount || uploadMutation.isPending}
                            >
                                {uploadMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Importar OFX
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                {!selectedAccount ? (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20">
                        <AlertCircle className="h-10 w-10 mb-4" />
                        <p>Selecione uma conta bancária acima para começar.</p>
                    </div>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Transações Pendentes</CardTitle>
                            <CardDescription>Transações importadas que precisam ser conciliadas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!bankTransactions?.length ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhuma transação pendente para esta conta.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead>Valor</TableHead>
                                            <TableHead>Sugestão</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bankTransactions.map((bt: any) => {
                                            const suggestions = getSuggestions(bt);
                                            const hasSuggestion = suggestions.length > 0;
                                            const bestMatch = hasSuggestion ? suggestions[0] : null;

                                            return (
                                                <TableRow key={bt.id}>
                                                    <TableCell>{format(parseISO(bt.date), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{bt.description}</div>
                                                        {bt.memo && <div className="text-xs text-muted-foreground">{bt.memo}</div>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={bt.type === 'credit' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                                            {bt.type === 'debit' ? '-' : '+'}
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bt.amount)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {bestMatch ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                                Encontrado: {bestMatch.description} ({format(parseISO(bestMatch.due_date), 'dd/MM')})
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm italic">Sem correspondência automática</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {bestMatch && (
                                                                <Button
                                                                    size="sm"
                                                                    className="h-8 bg-green-600 hover:bg-green-700 text-white"
                                                                    onClick={() => matchMutation.mutate({ bankTxId: bt.id, sysTxId: bestMatch.id })}
                                                                >
                                                                    <Check className="h-4 w-4 mr-1" />
                                                                    Aceitar
                                                                </Button>
                                                            )}

                                                            <Button variant="outline" size="sm" className="h-8" onClick={() => setSelectedBankTx(bt)}>
                                                                Conciliar Manual
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 text-muted-foreground hover:text-red-600"
                                                                onClick={() => ignoreMutation.mutate(bt.id)}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Manual Conciliation Dialog */}
                <Dialog open={!!selectedBankTx} onOpenChange={(open) => !open && setSelectedBankTx(null)}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Conciliar Transação</DialogTitle>
                            <DialogDescription>
                                Vincule a transação bancária a um lançamento existente ou crie um novo.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedBankTx && (
                            <div className="grid gap-6">
                                <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-lg">{selectedBankTx.description}</p>
                                        <p className="text-sm text-muted-foreground">{format(parseISO(selectedBankTx.date), 'PPP', { locale: ptBR })}</p>
                                    </div>
                                    <div className={selectedBankTx.type === 'credit' ? 'text-green-600 text-xl font-bold' : 'text-red-600 text-xl font-bold'}>
                                        {selectedBankTx.type === 'debit' ? '-' : '+'}
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedBankTx.amount)}
                                    </div>
                                </div>

                                <Tabs defaultValue="search" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="search">Buscar Lançamento</TabsTrigger>
                                        <TabsTrigger value="create">Criar Novo</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="search" className="space-y-4 pt-4">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input placeholder="Buscar por descrição ou valor..." className="pl-8" />
                                        </div>
                                        <ScrollArea className="h-[200px] border rounded-md p-4">
                                            {/* List all pending transactions here basically */}
                                            <div className="space-y-2">
                                                {systemTransactions?.map((st: any) => (
                                                    <div key={st.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer border" onClick={() => matchMutation.mutate({ bankTxId: selectedBankTx.id, sysTxId: st.id })}>
                                                        <div>
                                                            <p className="font-medium">{st.description}</p>
                                                            <p className="text-xs text-muted-foreground">Vencimento: {format(parseISO(st.due_date), 'dd/MM/yyyy')}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={st.type === 'credit' ? 'default' : 'secondary'}>{st.type === 'credit' ? 'Receita' : 'Despesa'}</Badge>
                                                            <span className="font-bold">
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(st.amount)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {systemTransactions?.length === 0 && (
                                                    <p className="text-center text-muted-foreground text-sm">Nenhum lançamento pendente encontrado.</p>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>

                                    <TabsContent value="create" className="pt-4 space-y-4">
                                        <div className="grid gap-4">
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium">Descrição</label>
                                                <Input
                                                    value={newTxDescription}
                                                    onChange={(e) => setNewTxDescription(e.target.value)}
                                                    placeholder={selectedBankTx?.description}
                                                />
                                                <p className="text-xs text-muted-foreground">Original: {selectedBankTx?.description}</p>
                                            </div>

                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium">Categoria</label>
                                                <Select value={newTxCategory} onValueChange={setNewTxCategory}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione a categoria" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories?.map((cat: any) => (
                                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <label className="text-sm font-medium">Valor</label>
                                                    <Input disabled value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedBankTx?.amount || 0)} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <label className="text-sm font-medium">Data</label>
                                                    <Input disabled value={selectedBankTx ? format(parseISO(selectedBankTx.date), 'dd/MM/yyyy') : ''} />
                                                </div>
                                            </div>

                                            <Button onClick={() => createAndMatchMutation.mutate()} disabled={createAndMatchMutation.isPending} className="w-full">
                                                {createAndMatchMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                                <Check className="mr-2 h-4 w-4" />
                                                Confirmar e Conciliar
                                            </Button>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

            </div>
        </AppLayout>
    );
}
