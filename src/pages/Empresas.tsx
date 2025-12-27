import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Building2 } from "lucide-react";
import { useCompanies } from "@/hooks/useCompanies";
import { Company, CompanyFormData } from "@/types/company";

export default function Empresas() {
    const { user } = useAuth();
    const { companies, isLoading, createCompany, updateCompany } = useCompanies(user?.id);

    // UI State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);

    // Form State
    const [formData, setFormData] = useState<CompanyFormData>({
        razao_social: "",
        nome_fantasia: "",
        cnpj: "",
        email: "",
        telefone: "",
        endereco_cep: "",
        endereco_logradouro: "",
        endereco_numero: "",
        endereco_bairro: "",
        endereco_cidade: "",
        endereco_estado: "",
    });

    const resetForm = () => {
        setFormData({
            razao_social: "",
            nome_fantasia: "",
            cnpj: "",
            email: "",
            telefone: "",
            endereco_cep: "",
            endereco_logradouro: "",
            endereco_numero: "",
            endereco_bairro: "",
            endereco_cidade: "",
            endereco_estado: "",
        });
        setEditingCompany(null);
        setIsDialogOpen(false);
    };

    const handleEdit = (company: Company) => {
        setEditingCompany(company);
        setFormData({
            razao_social: company.razao_social,
            nome_fantasia: company.nome_fantasia || "",
            cnpj: company.cnpj || "",
            email: company.email || "",
            telefone: company.telefone || "",
            endereco_cep: company.endereco_cep || "",
            endereco_logradouro: company.endereco_logradouro || "",
            endereco_numero: company.endereco_numero || "",
            endereco_bairro: company.endereco_bairro || "",
            endereco_cidade: company.endereco_cidade || "",
            endereco_estado: company.endereco_estado || "",
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCompany) {
                await updateCompany.mutateAsync({ id: editingCompany.id, data: formData });
            } else {
                await createCompany.mutateAsync(formData);
            }
            // Reset is handled by mutation onSuccess in the hook if desired, 
            // but here we can close dialog immediately or wait.
            // The hook toast indicates success.
            resetForm();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <AppLayout title="Empresas">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Empresas</h2>
                        <p className="text-muted-foreground">
                            Gerencie as empresas cadastradas no sistema
                        </p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => resetForm()}>
                                <Plus className="mr-2 h-4 w-4" />
                                Nova Empresa
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingCompany ? "Editar Empresa" : "Nova Empresa"}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="razao_social">Razão Social *</Label>
                                        <Input
                                            id="razao_social"
                                            value={formData.razao_social}
                                            onChange={(e) =>
                                                setFormData({ ...formData, razao_social: e.target.value })
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                                        <Input
                                            id="nome_fantasia"
                                            value={formData.nome_fantasia || ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, nome_fantasia: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cnpj">CNPJ</Label>
                                        <Input
                                            id="cnpj"
                                            value={formData.cnpj || ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, cnpj: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">E-mail</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email || ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, email: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="telefone">Telefone</Label>
                                        <Input
                                            id="telefone"
                                            value={formData.telefone || ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, telefone: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endereco_cep">CEP</Label>
                                        <Input
                                            id="endereco_cep"
                                            value={formData.endereco_cep || ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, endereco_cep: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label htmlFor="endereco_logradouro">Logradouro</Label>
                                        <Input
                                            id="endereco_logradouro"
                                            value={formData.endereco_logradouro || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    endereco_logradouro: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endereco_numero">Número</Label>
                                        <Input
                                            id="endereco_numero"
                                            value={formData.endereco_numero || ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, endereco_numero: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endereco_bairro">Bairro</Label>
                                        <Input
                                            id="endereco_bairro"
                                            value={formData.endereco_bairro || ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, endereco_bairro: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endereco_cidade">Cidade</Label>
                                        <Input
                                            id="endereco_cidade"
                                            value={formData.endereco_cidade || ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, endereco_cidade: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endereco_estado">Estado</Label>
                                        <Input
                                            id="endereco_estado"
                                            value={formData.endereco_estado || ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, endereco_estado: e.target.value })
                                            }
                                            maxLength={2}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsDialogOpen(false)}
                                        disabled={createCompany.isPending || updateCompany.isPending}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={createCompany.isPending || updateCompany.isPending}>
                                        {editingCompany ? "Salvar" : "Criar"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Lista de Empresas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Carregando...
                            </div>
                        ) : companies?.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhuma empresa cadastrada
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Razão Social</TableHead>
                                        <TableHead>Nome Fantasia</TableHead>
                                        <TableHead>CNPJ</TableHead>
                                        <TableHead>Cidade/UF</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-[100px]">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {companies?.map((company) => (
                                        <TableRow key={company.id}>
                                            <TableCell className="font-medium">
                                                {company.razao_social}
                                            </TableCell>
                                            <TableCell>{company.nome_fantasia || "-"}</TableCell>
                                            <TableCell>{company.cnpj || "-"}</TableCell>
                                            <TableCell>
                                                {company.endereco_cidade && company.endereco_estado
                                                    ? `${company.endereco_cidade}/${company.endereco_estado}`
                                                    : "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={company.is_active ? "default" : "secondary"}
                                                >
                                                    {company.is_active ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(company)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
