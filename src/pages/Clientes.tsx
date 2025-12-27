import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
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
import { ClientSheet } from "@/components/clients/ClientSheet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "react-router-dom";

export default function Clientes() {
    const { selectedCompany } = useCompany();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const { data: clients, isLoading, refetch } = useQuery({
        queryKey: ["clients", selectedCompany?.id],
        queryFn: async () => {
            if (!selectedCompany?.id) return [];
            const { data, error } = await supabase
                .from("clients")
                .select("*")
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
            // Clear the param without refreshing
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

    const filteredClients = clients?.filter(client =>
        client.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.nome_fantasia && client.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.cpf_cnpj && client.cpf_cnpj.includes(searchTerm))
    );

    return (
        <AppLayout title="Clientes">
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
                    <Button onClick={handleNew}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Cliente
                    </Button>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle>Listagem de Clientes</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome ou CPF/CNPJ..."
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
                                    <TableHead>Razão Social / Nome</TableHead>
                                    <TableHead>Nome Fantasia</TableHead>
                                    <TableHead>CPF/CNPJ</TableHead>
                                    <TableHead>Contato</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Carregando clientes...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredClients?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Nenhum cliente encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredClients?.map((client) => (
                                        <TableRow key={client.id}>
                                            <TableCell className="font-medium">{client.razao_social}</TableCell>
                                            <TableCell>{client.nome_fantasia || "-"}</TableCell>
                                            <TableCell>{client.cpf_cnpj || "-"}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span>{client.email}</span>
                                                    <span className="text-muted-foreground">{client.celular || client.telefone}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
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
