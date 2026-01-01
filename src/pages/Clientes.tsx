import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, Trash2, MoreHorizontal, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ClientSheet } from "@/components/clients/ClientSheet";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "react-router-dom";
import { maskCNPJ, maskCPF, maskPhone } from "@/utils/masks";
import { logDeletion } from "@/lib/audit";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function Clientes() {
    const { selectedCompany } = useCompany();
    const { activeClient, isUsingSecondary, user } = useAuth();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const normalizeSearch = (value: unknown) =>
        String(value ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

    const { data: clients, isLoading, refetch } = useQuery({
        queryKey: ["clients", selectedCompany?.id, isUsingSecondary],
        queryFn: async () => {
            if (!selectedCompany?.id) return [];
            // Join with category if possible, or just fetch all
            // Using standard select for now, assuming categories are joined or we adding it
            const { data, error } = await activeClient
                .from("clients")
                .select("*, category:client_categories(name)")
                .eq("company_id", selectedCompany.id)
                .order("razao_social");

            if (error) throw error;
            return data;
        },
        enabled: !!selectedCompany?.id,
    });

    useEffect(() => {
        if (searchParams.get("new") === "true") {
            handleNew();
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("new");
            setSearchParams(newParams);
        }
    }, [searchParams, setSearchParams]);

    const handleEdit = (client: any) => {
        setEditingClient(client);
        setIsSheetOpen(true);
    };

    const handleNew = () => {
        setEditingClient(null);
        setIsSheetOpen(true);
    };

    const handleDelete = async (client: any) => {
        const ok = window.confirm(`Excluir o cliente "${client.razao_social}"?`);
        if (!ok) return;
        const { error } = await activeClient.from("clients").delete().eq("id", client.id);
        if (!error) {
            refetch();
            toast({
                title: "Sucesso",
                description: "Cliente excluído",
            });
            if (user?.id) {
                await logDeletion(activeClient, {
                    userId: user.id,
                    companyId: selectedCompany?.id || null,
                    entity: "clients",
                    entityId: client.id,
                    payload: { razao_social: client.razao_social },
                });
            }
        } else {
            toast({
                title: "Erro",
                description: "Erro ao excluir",
                variant: "destructive",
            });
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    };

    const filteredClients = clients?.filter((client) => {
        const needle = normalizeSearch(searchTerm);
        if (!needle) return true;

        const doc = client.cpf_cnpj || "";
        const maskedDoc = doc ? (doc.length > 11 ? maskCNPJ(doc) : maskCPF(doc)) : "";
        const phone = client.telefone || "";
        const cell = client.celular || "";
        const maskedPhone = phone ? maskPhone(phone) : "";
        const maskedCell = cell ? maskPhone(cell) : "";

        return normalizeSearch(
            [
                client.razao_social,
                client.nome_fantasia,
                doc,
                maskedDoc,
                client.email,
                phone,
                cell,
                maskedPhone,
                maskedCell,
                client.category?.name // Search by category
            ]
                .filter(Boolean)
                .join(" "),
        ).includes(needle);
    });

    return (
        <AppLayout title="Clientes">
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            Clientes
                        </h2>
                        <p className="text-muted-foreground mt-1">Gerencie a base de clientes da sua empresa.</p>
                    </div>
                    <Button onClick={handleNew} className="bg-slate-900 hover:bg-slate-800 shadow-sm transition-all hover:scale-105">
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Cliente
                    </Button>
                </div>

                <Card className="border-0 shadow-lg bg-white/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 pb-6 border-b border-slate-100">
                        <div className="text-sm font-medium text-slate-500">
                            Total de {filteredClients?.length || 0} clientes
                        </div>
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar clientes..."
                                className="pl-9 border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="rounded-md border border-slate-100 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="hover:bg-transparent border-slate-100">
                                        <TableHead className="w-[80px]"></TableHead>
                                        <TableHead className="font-semibold text-slate-600">Razão Social / Nome</TableHead>
                                        <TableHead className="font-semibold text-slate-600">CPF/CNPJ</TableHead>
                                        <TableHead className="font-semibold text-slate-600">Contato</TableHead>
                                        <TableHead className="font-semibold text-slate-600">Categoria</TableHead>
                                        <TableHead className="w-[80px] text-right"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!selectedCompany?.id ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                                Selecione uma empresa para visualizar os clientes.
                                            </TableCell>
                                        </TableRow>
                                    ) : isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                <div className="flex items-center justify-center text-slate-500">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-500 mr-2"></div>
                                                    Carregando...
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredClients?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                                Nenhum cliente encontrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredClients?.map((client) => (
                                            <TableRow key={client.id} className="hover:bg-slate-50/50 transition-colors border-slate-100 group">
                                                <TableCell>
                                                    <Avatar className="h-9 w-9 border border-slate-200">
                                                        <AvatarFallback className="bg-slate-100 text-slate-500 font-medium">
                                                            {getInitials(client.razao_social)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-slate-900">{client.razao_social}</div>
                                                    {client.nome_fantasia && (
                                                        <div className="text-xs text-slate-500">{client.nome_fantasia}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-slate-600 font-mono text-xs">
                                                    {client.cpf_cnpj
                                                        ? (client.cpf_cnpj.length > 11 ? maskCNPJ(client.cpf_cnpj) : maskCPF(client.cpf_cnpj))
                                                        : "-"
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-sm text-slate-600">
                                                        <span>{client.email}</span>
                                                        <span className="text-xs text-slate-400">
                                                            {client.celular ? maskPhone(client.celular) : (client.telefone ? maskPhone(client.telefone) : "-")}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {client.category ? (
                                                        <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">
                                                            {client.category.name}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <span className="sr-only">Abrir menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleEdit(client)}>
                                                                <Pencil className="mr-2 h-4 w-4 text-slate-500" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleDelete(client)} className="text-red-600">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Excluir
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <ClientSheet
                    isOpen={isSheetOpen}
                    onClose={() => {
                        setIsSheetOpen(false);
                        setEditingClient(null);
                    }}
                    clientToEdit={editingClient}
                />
            </div>
        </AppLayout>
    );
}
