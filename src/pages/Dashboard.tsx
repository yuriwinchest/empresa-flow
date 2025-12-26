import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompany } from "@/contexts/CompanyContext";
import {
  Building2,
  Users,
  Truck,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";

export default function Dashboard() {
  const { selectedCompany } = useCompany();

  const stats = [
    {
      title: "Empresas Ativas",
      value: "0",
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-accent",
    },
    {
      title: "Clientes",
      value: "0",
      icon: Users,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "Fornecedores",
      value: "0",
      icon: Truck,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Contas Bancárias",
      value: "0",
      icon: Wallet,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  const financeiro = [
    {
      title: "A Pagar (Vencendo)",
      value: "R$ 0,00",
      icon: ArrowDownCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "A Receber (Vencendo)",
      value: "R$ 0,00",
      icon: ArrowUpCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {!selectedCompany ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma empresa selecionada
              </h3>
              <p className="text-muted-foreground text-center max-w-md">
                Cadastre uma empresa ou selecione uma existente no seletor acima para visualizar o dashboard.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">
                Bem-vindo ao Sistema Tática
              </h2>
              <p className="text-muted-foreground">
                Empresa selecionada: {selectedCompany.nome_fantasia || selectedCompany.razao_social}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <Card key={stat.title} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {financeiro.map((item) => (
                <Card key={item.title} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {item.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${item.bgColor}`}>
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{item.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
