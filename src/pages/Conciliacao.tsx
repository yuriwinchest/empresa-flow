
import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBankAccounts } from "@/modules/finance/presentation/hooks/useBankAccounts";
import { useBankReconciliation, SystemTransaction } from "@/modules/finance/presentation/hooks/useBankReconciliation";
import { useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Check, AlertCircle, RefreshCw, ArrowLeft, Search, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BankTransaction } from "@/modules/finance/domain/schemas/bank-reconciliation.schema";

export default function Conciliacao() {
    const [searchParams, setSearchParams] = useSearchParams();
    const accountIdFromUrl = searchParams.get("conta") || "";

    // Se não tiver conta na URL, usa estado local para o dropdown
    const [selectedAccountId, setSelectedAccountId] = useState(accountIdFromUrl);

    // Sincroniza URL se mudar no state
    const handleAccountChange = (val: string) => {
        setSelectedAccountId(val);
        setSearchParams({ conta: val });
    };

    const { accounts } = useBankAccounts();
    const {
        bankTransactions,
        systemTransactions,
        isLoading,
        uploadOFX,
        matchTransaction
    } = useBankReconciliation(selectedAccountId);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedBankTx, setSelectedBankTx] = useState<BankTransaction | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadOFX.mutate(file);
    };

    // Helper: Encontra sugestões
    const getSuggestions = (bt: BankTransaction) => {
        if (!systemTransactions) return [];
        return systemTransactions.filter(st => {
            // Regra 1: Valor exato
            // OFX: Débito é negativo (ex: -100). Contas a Pagar é positivo (100).
            // OFX: Crédito é positivo (ex: 100). Contas a Receber é positivo (100).

            let amountMatch = false;

            if (st.type === 'payable') {
                // Pagamento: BT deve ser negativo e o valor absoluto igual
                amountMatch = (bt.amount < 0) && (Math.abs(bt.amount) === Number(st.amount));
            } else {
                // Recebimento: BT positivo e valor igual
                amountMatch = (bt.amount > 0) && (Math.abs(bt.amount) === Number(st.amount));
            }

            return amountMatch;
        });
    };

    // Helper: Filtrar transações do sistema na busca manual
    const filteredSystemTransactions = systemTransactions?.filter(st => {
        const needle = searchTerm.toLowerCase();
        const matchesSearch = st.description.toLowerCase().includes(needle) ||
            st.entity_name?.toLowerCase().includes(needle) ||
            String(st.amount).includes(needle);

        // Se estamos conciliando uma transação bancária específica, filtrar por tipo compatível
        if (selectedBankTx) {
            // Se BT < 0 (Saída), só mostrar Payables
            // Se BT > 0 (Entrada), só mostrar Receivables
            const compatibleType = selectedBankTx.amount < 0 ? 'payable' : 'receivable';
            return matchesSearch && st.type === compatibleType;
        }

        return matchesSearch;
    });

    return (
        <AppLayout title="Conciliação Bancária">
            <div className="space-y-6 animate-in fade-in duration-500">

                {/* Header e Seleção de Conta */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Select value={selectedAccountId} onValueChange={handleAccountChange}>
                                <SelectTrigger className="w-[280px] h-10 text-lg font-medium border-slate-300">
                                    <SelectValue placeholder="Selecione uma conta..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id || ""}>
                                            {acc.name} - {acc.bank_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-sm text-slate-500 ml-1">
                            Selecione a conta para visualizar e importar extratos.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            accept=".ofx"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            disabled={!selectedAccountId || uploadOFX.isPending}
                        />
                        <Button
                            variant="outline"
                            className="border-slate-300 text-slate-700"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!selectedAccountId || uploadOFX.isPending}
                        >
                            {uploadOFX.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Importar OFX
                        </Button>
                    </div>
                </div>

                {!selectedAccountId ? (
                    <div className="flex flex-col items-center justify-center p-16 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center">
                        <div className="bg-white p-4 rounded-full mb-4 shadow-sm">
                            <ArrowLeft className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Selecione uma conta acima</h3>
                        <p className="text-slate-500 max-w-md">
                            Para iniciar a conciliação, escolha qual conta bancária você deseja gerenciar no menu suspenso.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span>Transações do Extrato (Pendentes)</span>
                                    <Badge variant="secondary" className="text-slate-600 bg-slate-100">
                                        {bankTransactions?.length || 0} itens
                                    </Badge>
                                </CardTitle>
                                <CardDescription>
                                    Itens importados do banco que ainda não foram vinculados ao sistema.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!bankTransactions?.length ? (
                                    <div className="text-center py-12">
                                        <Check className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                                        <h3 className="text-lg font-medium text-slate-900">Tudo em dia!</h3>
                                        <p className="text-slate-500">Não há transações pendentes para conciliar nesta conta.</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50">
                                                <TableHead>Data</TableHead>
                                                <TableHead>Descrição Banco</TableHead>
                                                <TableHead>Valor</TableHead>
                                                <TableHead>Sugestão do Sistema</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {bankTransactions.map((bt) => {
                                                const suggestions = getSuggestions(bt);
                                                const bestMatch = suggestions[0];

                                                return (
                                                    <TableRow key={bt.id} className="group hover:bg-slate-50 transition-colors">
                                                        <TableCell className="font-medium text-slate-600">
                                                            {format(parseISO(bt.date), 'dd/MM')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{bt.description}</div>
                                                            {bt.memo && <div className="text-xs text-slate-400">{bt.memo}</div>}
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={`font-bold ${bt.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bt.amount)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            {bestMatch ? (
                                                                <div className="flex flex-col gap-1 items-start">
                                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer" onClick={() => matchTransaction.mutate({ bankTx: bt, sysTx: bestMatch })}>
                                                                        <Check className="h-3 w-3 mr-1" />
                                                                        {bestMatch.entity_name} - {bestMatch.description}
                                                                    </Badge>
                                                                    <span className="text-[10px] text-slate-400">Venc: {format(parseISO(bestMatch.date), 'dd/MM')}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 italic">Sem match automático</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {bestMatch && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                        onClick={() => matchTransaction.mutate({ bankTx: bt, sysTx: bestMatch })}
                                                                    >
                                                                        Aceitar
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 border-slate-300"
                                                                    onClick={() => {
                                                                        setSelectedBankTx(bt);
                                                                        setSearchTerm("");
                                                                    }}
                                                                >
                                                                    Buscar
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
                    </div>
                )}

                {/* Modal de Conciliação Manual */}
                <Dialog open={!!selectedBankTx} onOpenChange={(open) => !open && setSelectedBankTx(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Conciliar Manualmente</DialogTitle>
                            <DialogDescription>
                                Selecione um lançamento do sistema para vincular a esta transação.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedBankTx && (
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center border border-slate-100">
                                    <div>
                                        <p className="font-semibold text-slate-800">{selectedBankTx.description}</p>
                                        <p className="text-sm text-slate-500">{format(parseISO(selectedBankTx.date), 'PPP', { locale: ptBR })}</p>
                                    </div>
                                    <span className={`text-xl font-bold ${selectedBankTx.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedBankTx.amount)}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Buscar lançamentos (descrição, valor, fornecedor)..."
                                            className="pl-9"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    <ScrollArea className="h-[300px] border rounded-md p-2">
                                        {!filteredSystemTransactions?.length && (
                                            <div className="text-center py-8 text-slate-400 text-sm">
                                                Nenhum lançamento compatível encontrado.
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            {filteredSystemTransactions?.map((st) => (
                                                <div
                                                    key={`${st.type}-${st.id}`}
                                                    className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-md cursor-pointer border border-transparent hover:border-slate-200 transition-all"
                                                    onClick={() => {
                                                        matchTransaction.mutate({ bankTx: selectedBankTx, sysTx: st });
                                                        setSelectedBankTx(null);
                                                    }}
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={st.type === 'payable' ? 'destructive' : 'default'} className="h-5 text-[10px] px-1">
                                                                {st.type === 'payable' ? 'Pagar' : 'Receber'}
                                                            </Badge>
                                                            <span className="font-medium text-slate-700">{st.description}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 pl-1 mt-1">
                                                            {st.entity_name} • Venc: {format(parseISO(st.date), 'dd/MM/yyyy')}
                                                        </p>
                                                    </div>
                                                    <span className="font-bold text-slate-800">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(st.amount)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

