import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCompany, Company } from "@/contexts/CompanyContext";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Empresas() {
    const { companies, loading } = useCompany();

    return (
        <AppLayout title="Empresas">
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold tracking-tight">Empresas</h2>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Empresa
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Listagem de Empresas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Razão Social</TableHead>
                                    <TableHead>Nome Fantasia</TableHead>
                                    <TableHead>CNPJ</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4">Carregando...</TableCell>
                                    </TableRow>
                                ) : companies.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4">Nenhuma empresa cadastrada.</TableCell>
                                    </TableRow>
                                ) : (
                                    companies.map((company: Company) => (
                                        <TableRow key={company.id}>
                                            <TableCell className="font-medium">{company.razao_social}</TableCell>
                                            <TableCell>{company.nome_fantasia || "-"}</TableCell>
                                            <TableCell>{company.cnpj || "-"}</TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${company?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {company?.is_active ? "Ativa" : "Inativa"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">Editar</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
