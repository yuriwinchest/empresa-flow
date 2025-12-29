import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Briefcase, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function CRM() {
    const { selectedCompany } = useCompany();
    const { activeClient, isUsingSecondary } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("contacts");

    const normalizeSearch = (value: unknown) =>
        String(value ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

    // Fetch Contacts
    const { data: contacts, isLoading: contactsLoading } = useQuery({
        queryKey: ["crm_contacts", selectedCompany?.id, isUsingSecondary],
        queryFn: async () => {
            if (!selectedCompany?.id) return [];
            const { data, error } = await activeClient
                .from("crm_contacts")
                .select("*")
                .eq("company_id", selectedCompany.id)
                .order("first_name");
            if (error) throw error;
            return data;
        },
        enabled: !!selectedCompany?.id && activeTab === "contacts",
    });

    // Fetch Opportunities
    const { data: opportunities, isLoading: opportunitiesLoading } = useQuery({
        queryKey: ["opportunities", selectedCompany?.id, isUsingSecondary],
        queryFn: async () => {
            if (!selectedCompany?.id) return [];
            const { data, error } = await activeClient
                .from("opportunities")
                .select("*")
                .eq("company_id", selectedCompany.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!selectedCompany?.id && activeTab === "opportunities",
    });

    // Fetch Leads
    const { data: leads, isLoading: leadsLoading } = useQuery({
        queryKey: ["crm_leads", selectedCompany?.id, isUsingSecondary],
        queryFn: async () => {
            if (!selectedCompany?.id) return [];
            const { data, error } = await activeClient
                .from("crm_leads")
                .select("*")
                .eq("company_id", selectedCompany.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!selectedCompany?.id && activeTab === "leads",
    });

    const filteredContacts = contacts?.filter((c) => {
        const needle = normalizeSearch(searchTerm);
        if (!needle) return true;
        const location = c.city ? `${c.city}/${c.state || ""}` : "";
        return normalizeSearch(
            [
                c.first_name,
                c.last_name,
                `${c.first_name || ""} ${c.last_name || ""}`.trim(),
                c.account_name,
                c.position,
                c.email,
                c.cell_1,
                c.phone,
                location,
            ]
                .filter(Boolean)
                .join(" "),
        ).includes(needle);
    });

    const filteredOpportunities = opportunities?.filter((o) => {
        const needle = normalizeSearch(searchTerm);
        if (!needle) return true;
        const totalValue = Number(o.total_value || 0);
        const formattedValue = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue);
        const numberValue = new Intl.NumberFormat("pt-BR").format(totalValue);
        const valueRaw = String(totalValue);
        const valueComma = valueRaw.replace(".", ",");
        const expected = o.expected_month && o.expected_year ? `${o.expected_month}/${o.expected_year}` : "";
        return normalizeSearch(
            [
                o.account_name,
                o.solution,
                o.description,
                o.phase,
                o.status,
                expected,
                totalValue,
                formattedValue,
                numberValue,
                valueRaw,
                valueComma,
            ]
                .filter(Boolean)
                .join(" "),
        ).includes(needle);
    });

    const filteredLeads = leads?.filter((l) => {
        const needle = normalizeSearch(searchTerm);
        if (!needle) return true;
        const createdAt = l.created_at ? format(new Date(l.created_at), "dd/MM/yyyy") : "";
        return normalizeSearch(
            [l.name, l.company_name, l.origin, l.status, l.email, createdAt]
                .filter(Boolean)
                .join(" "),
        ).includes(needle);
    });

    return (
        <AppLayout title="CRM">
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800">Central CRM</h2>
                </div>

                <Tabs defaultValue="contacts" className="w-full" onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3 md:w-[600px] mb-8">
                        <TabsTrigger value="contacts" className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Contatos
                        </TabsTrigger>
                        <TabsTrigger value="opportunities" className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Oportunidades
                        </TabsTrigger>
                        <TabsTrigger value="leads" className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Leads
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex justify-end mb-4">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Pesquisar..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <TabsContent value="contacts">
                        <Card>
                            <CardHeader>
                                <CardTitle>Lista de Contatos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Empresa/Conta</TableHead>
                                            <TableHead>Cargo</TableHead>
                                            <TableHead>E-mail / Telefone</TableHead>
                                            <TableHead>Localização</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {contactsLoading ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
                                        ) : filteredContacts?.length === 0 ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhum contato encontrado.</TableCell></TableRow>
                                        ) : (
                                            filteredContacts?.map((c) => (
                                                <TableRow key={c.id}>
                                                    <TableCell className="font-bold">{c.first_name} {c.last_name}</TableCell>
                                                    <TableCell>{c.account_name || "-"}</TableCell>
                                                    <TableCell>{c.position || "-"}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col text-sm">
                                                            <span>{c.email || "-"}</span>
                                                            <span className="text-muted-foreground">{c.cell_1 || c.phone || "-"}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{c.city ? `${c.city}/${c.state}` : "-"}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="opportunities">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pipeline de Oportunidades</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Conta</TableHead>
                                            <TableHead>Descrição/Solução</TableHead>
                                            <TableHead>Fase</TableHead>
                                            <TableHead>Valor</TableHead>
                                            <TableHead>Expectativa</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {opportunitiesLoading ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
                                        ) : filteredOpportunities?.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-8">Nenhuma oportunidade encontrada.</TableCell></TableRow>
                                        ) : (
                                            filteredOpportunities?.map((o) => (
                                                <TableRow key={o.id}>
                                                    <TableCell className="font-bold">{o.account_name}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span>{o.solution || "-"}</span>
                                                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{o.description}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{o.phase || "-"}</Badge>
                                                    </TableCell>
                                                    <TableCell className="font-bold">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(o.total_value || 0))}
                                                    </TableCell>
                                                    <TableCell>
                                                        {o.expected_month && o.expected_year ? `${o.expected_month}/${o.expected_year}` : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={o.status === 'Won' ? 'bg-green-500' : o.status === 'Lost' ? 'bg-red-500' : 'bg-blue-500'}>
                                                            {o.status || "-"}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="leads">
                        <Card>
                            <CardHeader>
                                <CardTitle>Leads Cadastrados</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Empresa</TableHead>
                                            <TableHead>Origem</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Data Criação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leadsLoading ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
                                        ) : filteredLeads?.length === 0 ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhum lead encontrado.</TableCell></TableRow>
                                        ) : (
                                            filteredLeads?.map((l) => (
                                                <TableRow key={l.id}>
                                                    <TableCell className="font-bold">{l.name}</TableCell>
                                                    <TableCell>{l.company_name || "-"}</TableCell>
                                                    <TableCell>{l.origin || "-"}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{l.status || "-"}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {l.created_at ? format(new Date(l.created_at), "dd/MM/yyyy") : "-"}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
