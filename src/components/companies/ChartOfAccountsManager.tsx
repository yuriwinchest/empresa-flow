import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { ChartOfAccount, AccountType } from "@/types/finance";

interface ChartOfAccountsManagerProps {
    companyId: string;
}

export function ChartOfAccountsManager({ companyId }: ChartOfAccountsManagerProps) {
    const { activeClient } = useAuth();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);

    // Form states
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [type, setType] = useState<AccountType>("despesa");
    const [isAnalytic, setIsAnalytic] = useState(true);
    const [parentId, setParentId] = useState<string | "none">("none");

    const { data: accounts, isLoading } = useQuery({
        queryKey: ["chart-of-accounts", companyId],
        queryFn: async () => {
            const { data, error } = await activeClient
                .from("chart_of_accounts")
                .select("*")
                .eq("company_id", companyId)
                .order("code");
            if (error) throw error;
            return data as ChartOfAccount[];
        },
        enabled: !!companyId,
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                company_id: companyId,
                code,
                name,
                type,
                is_analytic: isAnalytic,
                parent_id: parentId === "none" ? null : parentId,
            };

            if (editingAccount) {
                const { error } = await activeClient
                    .from("chart_of_accounts")
                    .update(payload)
                    .eq("id", editingAccount.id);
                if (error) throw error;
            } else {
                const { error } = await activeClient
                    .from("chart_of_accounts")
                    .insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
            setIsDialogOpen(false);
            resetForm();
            toast.success(editingAccount ? "Conta atualizada!" : "Conta criada!");
        },
        onError: (err) => {
            console.error(err);
            toast.error("Erro ao salvar conta.");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await activeClient
                .from("chart_of_accounts")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
            toast.success("Conta removida!");
        },
        onError: () => toast.error("Erro ao remover conta (verifique se não há subcontas ou lançamentos).")
    });

    const resetForm = () => {
        setEditingAccount(null);
        setCode("");
        setName("");
        setType("despesa");
        setIsAnalytic(true);
        setParentId("none");
    }

    const handleEdit = (account: ChartOfAccount) => {
        setEditingAccount(account);
        setCode(account.code);
        setName(account.name);
        setType(account.type);
        setIsAnalytic(account.is_analytic);
        setParentId(account.parent_id || "none");
        setIsDialogOpen(true);
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center gap-2">
                    <FolderTree className="h-5 w-5" />
                    Plano de Contas
                </h3>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button size="sm" onClick={resetForm}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Conta
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingAccount ? "Editar Conta" : "Nova Conta Contábil"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Código</Label>
                                    <Input value={code} onChange={e => setCode(e.target.value)} placeholder="Ex: 1.01.01" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <Select value={type} onValueChange={(v: AccountType) => setType(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="receita">Receita</SelectItem>
                                            <SelectItem value="despesa">Despesa</SelectItem>
                                            <SelectItem value="ativo">Ativo</SelectItem>
                                            <SelectItem value="passivo">Passivo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Nome da Conta</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Despesas Administrativas" />
                            </div>
                            <div className="space-y-2">
                                <Label>Conta Pai (Sintética)</Label>
                                <Select value={parentId} onValueChange={setParentId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Raiz --</SelectItem>
                                        {accounts?.filter(a => !a.is_analytic && a.id !== editingAccount?.id).map(a => (
                                            <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="analytic" checked={isAnalytic} onCheckedChange={setIsAnalytic} />
                                <Label htmlFor="analytic">Conta Analítica (aceita lançamentos)</Label>
                            </div>
                            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-center">Analítica</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
                        ) : accounts?.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center">Nenhuma conta cadastrada.</TableCell></TableRow>
                        ) : (
                            accounts?.map(account => (
                                <TableRow key={account.id}>
                                    <TableCell className="font-mono">{account.code}</TableCell>
                                    <TableCell style={{ paddingLeft: `${(account.code.match(/\./g) || []).length * 1.5}rem` }}>
                                        {account.name}
                                    </TableCell>
                                    <TableCell className="capitalize">{account.type}</TableCell>
                                    <TableCell className="text-center">{account.is_analytic ? "Sim" : "Não"}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => deleteMutation.mutate(account.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
