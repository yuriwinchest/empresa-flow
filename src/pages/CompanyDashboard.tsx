import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CompanyDashboard() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { companies } = useCompanies(user?.id);
    const { setSelectedCompany, selectedCompany } = useCompany();

    useEffect(() => {
        if (id && companies) {
            const company = companies.find(c => c.id === id);
            if (company) {
                setSelectedCompany(company);
            }
        }
    }, [id, companies, setSelectedCompany]);

    if (!selectedCompany) {
        return (
            <AppLayout title="Detalhes da Empresa">
                <div className="flex flex-col items-center justify-center h-full py-20">
                    <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full mb-4"></div>
                    <p className="text-slate-500">Carregando dados da empresa...</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title={`${selectedCompany.nome_fantasia || selectedCompany.razao_social} - Dashboard`}>
            <div className="space-y-6 animate-fade-in">
                <Button
                    variant="ghost"
                    className="mb-4 pl-0 hover:bg-transparent hover:text-green-600"
                    onClick={() => navigate('/dashboard')}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista de Empresas
                </Button>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* Placeholder Cards for Company Specific Stats */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Vendas (Mês)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">R$ 0,00</div>
                            <p className="text-xs text-muted-foreground">+0% em relação ao mês anterior</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Produtos Ativos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">A Pagar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">R$ 0,00</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">A Receber</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">R$ 0,00</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>Últimas Movimentações</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Nenhuma movimentação recente.</p>
                        </CardContent>
                    </Card>
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>Dados da Empresa</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Razão Social:</dt>
                                    <dd className="font-medium text-right">{selectedCompany.razao_social}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">CNPJ:</dt>
                                    <dd className="font-medium">{selectedCompany.cnpj}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Cidade/UF:</dt>
                                    <dd className="font-medium">{selectedCompany.endereco_cidade}/{selectedCompany.endereco_estado}</dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
