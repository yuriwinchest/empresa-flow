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
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Building2, User, Globe, Search, Landmark, Mail, Phone, FileText } from "lucide-react";
import { useCompanies } from "@/hooks/useCompanies";
import { Company, CompanyFormData } from "@/types/company";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function Empresas() {
    const { user } = useAuth();
    const { companies, isLoading, createCompany, updateCompany } = useCompanies(user?.id);

    // UI State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [activeTab, setActiveTab] = useState("geral");

    // Form State
    const [formData, setFormData] = useState<CompanyFormData>({
        razao_social: "",
        nome_fantasia: "",
        cnpj: "",
        inscricao_estadual: "",
        inscricao_municipal: "",
        cnae: "",
        natureza_juridica: "",
        regime_tributario: "",
        email: "",
        telefone: "",
        celular: "",
        site: "",
        contato_nome: "",
        endereco_cep: "",
        endereco_logradouro: "",
        endereco_numero: "",
        endereco_complemento: "",
        endereco_bairro: "",
        endereco_cidade: "",
        endereco_estado: "",
        logo_url: "",
        dados_bancarios_banco: "",
        dados_bancarios_agencia: "",
        dados_bancarios_conta: "",
        dados_bancarios_pix: "",
        dados_bancarios_titular_cpf_cnpj: "",
        dados_bancarios_titular_nome: "",
    });

    const resetForm = () => {
        setFormData({
            razao_social: "",
            nome_fantasia: "",
            cnpj: "",
            inscricao_estadual: "",
            inscricao_municipal: "",
            cnae: "",
            natureza_juridica: "",
            regime_tributario: "",
            email: "",
            telefone: "",
            celular: "",
            site: "",
            contato_nome: "",
            endereco_cep: "",
            endereco_logradouro: "",
            endereco_numero: "",
            endereco_complemento: "",
            endereco_bairro: "",
            endereco_cidade: "",
            endereco_estado: "",
            logo_url: "",
            dados_bancarios_banco: "",
            dados_bancarios_agencia: "",
            dados_bancarios_conta: "",
            dados_bancarios_pix: "",
            dados_bancarios_titular_cpf_cnpj: "",
            dados_bancarios_titular_nome: "",
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
            inscricao_estadual: company.inscricao_estadual || "",
            inscricao_municipal: company.inscricao_municipal || "",
            cnae: company.cnae || "",
            natureza_juridica: company.natureza_juridica || "",
            regime_tributario: company.regime_tributario || "",
            email: company.email || "",
            telefone: company.telefone || "",
            celular: company.celular || "",
            site: company.site || "",
            contato_nome: company.contato_nome || "",
            endereco_cep: company.endereco_cep || "",
            endereco_logradouro: company.endereco_logradouro || "",
            endereco_numero: company.endereco_numero || "",
            endereco_complemento: company.endereco_complemento || "",
            endereco_bairro: company.endereco_bairro || "",
            endereco_cidade: company.endereco_cidade || "",
            endereco_estado: company.endereco_estado || "",
            logo_url: company.logo_url || "",
            dados_bancarios_banco: company.dados_bancarios_banco || "",
            dados_bancarios_agencia: company.dados_bancarios_agencia || "",
            dados_bancarios_conta: company.dados_bancarios_conta || "",
            dados_bancarios_pix: company.dados_bancarios_pix || "",
            dados_bancarios_titular_cpf_cnpj: company.dados_bancarios_titular_cpf_cnpj || "",
            dados_bancarios_titular_nome: company.dados_bancarios_titular_nome || "",
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
            resetForm();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <AppLayout title="Empresas">
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Empresas</h2>
                        <p className="text-muted-foreground">
                            Gerencie as unidades de negócio cadastradas no seu ecossistema
                        </p>
                    </div>
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-green-600 hover:bg-green-700 shadow-md">
                        <Plus className="mr-2 h-4 w-4 font-bold" />
                        Nova Empresa
                    </Button>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
                        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg overflow-hidden">
                            {/* Cabeçalho do Formulário (Estilo Unificado) */}
                            <div className="flex gap-6 items-start bg-slate-50 p-6 border-b border-slate-200">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-4 border-slate-100 shadow-sm overflow-hidden p-1">
                                        {formData.logo_url ? (
                                            <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <Building2 className="w-12 h-12 text-green-600" />
                                        )}
                                    </div>
                                    <button type="button" className="text-xs text-blue-600 font-semibold hover:underline">Alterar Logotipo</button>
                                </div>

                                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
                                    <div className="md:col-span-3 space-y-1">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-slate-600 text-[10px] font-bold uppercase tracking-wider">Razão Social / Nome da Matriz</Label>
                                        </div>
                                        <Input
                                            value={formData.razao_social}
                                            onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                                            className="h-9 focus-visible:ring-green-600 border-slate-300"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-slate-600 text-[10px] font-bold uppercase tracking-wider">CNPJ Principal</Label>
                                            <button type="button" className="text-[10px] text-green-600 flex items-center gap-1 font-semibold uppercase hover:underline"><Globe className="w-3 h-3" /> SEFAZ</button>
                                        </div>
                                        <Input
                                            value={formData.cnpj || ""}
                                            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                                            className="h-9 focus-visible:ring-green-600 border-slate-300"
                                        />
                                    </div>

                                    <div className="md:col-span-2 space-y-1">
                                        <Label className="text-slate-600 text-[10px] font-bold uppercase tracking-wider">Nome de Exibição / Fantasia</Label>
                                        <Input
                                            value={formData.nome_fantasia || ""}
                                            onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                                            className="h-9 focus-visible:ring-green-600 border-slate-300"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-slate-600 text-[10px] font-bold uppercase tracking-wider">Fixo / Geral</Label>
                                        <Input
                                            value={formData.telefone || ""}
                                            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                            className="h-9 focus-visible:ring-green-600 border-slate-300"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-slate-600 text-[10px] font-bold uppercase tracking-wider">Pessoa de Contato</Label>
                                        <Input
                                            value={formData.contato_nome || ""}
                                            onChange={(e) => setFormData({ ...formData, contato_nome: e.target.value })}
                                            className="h-9 focus-visible:ring-green-600 border-slate-300"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="px-6">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="mb-4 w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
                                        <TabsTrigger value="geral" className="border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:text-green-700 rounded-none px-2 pb-2 text-xs font-bold uppercase tracking-wider transition-all">Dados Fiscais</TabsTrigger>
                                        <TabsTrigger value="endereco" className="border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:text-green-700 rounded-none px-2 pb-2 text-xs font-bold uppercase tracking-wider transition-all">Endereço</TabsTrigger>
                                        <TabsTrigger value="contato" className="border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:text-green-700 rounded-none px-2 pb-2 text-xs font-bold uppercase tracking-wider transition-all">Comunicação</TabsTrigger>
                                        <TabsTrigger value="banco" className="border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:text-green-700 rounded-none px-2 pb-2 text-xs font-bold uppercase tracking-wider transition-all">Dados Bancários</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="geral" className="space-y-4 pt-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Inscrição Estadual</Label>
                                                <Input value={formData.inscricao_estadual || ""} onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })} className="h-9 border-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Inscrição Municipal</Label>
                                                <Input value={formData.inscricao_municipal || ""} onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })} className="h-9 border-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">CNAE Principal</Label>
                                                <div className="relative">
                                                    <Input value={formData.cnae || ""} onChange={(e) => setFormData({ ...formData, cnae: e.target.value })} className="h-9 border-slate-300 pr-8" />
                                                    <Search className="w-4 h-4 text-slate-400 absolute right-2 top-2.5" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Natureza Jurídica</Label>
                                                <Input value={formData.natureza_juridica || ""} onChange={(e) => setFormData({ ...formData, natureza_juridica: e.target.value })} className="h-9 border-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Regime Tributário</Label>
                                                <Select onValueChange={(v) => setFormData({ ...formData, regime_tributario: v })} value={formData.regime_tributario || undefined}>
                                                    <SelectTrigger className="h-9 border-slate-300">
                                                        <SelectValue placeholder="Selecione..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="simples">Simples Nacional</SelectItem>
                                                        <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                                                        <SelectItem value="lucro_real">Lucro Real</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="endereco" className="space-y-4 pt-2">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">CEP</Label>
                                                </div>
                                                <div className="relative">
                                                    <Input value={formData.endereco_cep || ""} onChange={(e) => setFormData({ ...formData, endereco_cep: e.target.value })} className="h-9 border-slate-300 pr-8" />
                                                    <Search className="w-4 h-4 text-slate-400 absolute right-2 top-2.5" />
                                                </div>
                                            </div>
                                            <div className="col-span-1 md:col-span-2 space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Logradouro</Label>
                                                <Input value={formData.endereco_logradouro || ""} onChange={(e) => setFormData({ ...formData, endereco_logradouro: e.target.value })} className="h-9 border-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Número</Label>
                                                <Input value={formData.endereco_numero || ""} onChange={(e) => setFormData({ ...formData, endereco_numero: e.target.value })} className="h-9 border-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Complemento</Label>
                                                <Input value={formData.endereco_complemento || ""} onChange={(e) => setFormData({ ...formData, endereco_complemento: e.target.value })} className="h-9 border-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Bairro</Label>
                                                <Input value={formData.endereco_bairro || ""} onChange={(e) => setFormData({ ...formData, endereco_bairro: e.target.value })} className="h-9 border-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Cidade</Label>
                                                <Input value={formData.endereco_cidade || ""} onChange={(e) => setFormData({ ...formData, endereco_cidade: e.target.value })} className="h-9 border-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Estado (UF)</Label>
                                                <Input value={formData.endereco_estado || ""} onChange={(e) => setFormData({ ...formData, endereco_estado: e.target.value })} maxLength={2} className="h-9 border-slate-300 uppercase" />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="contato" className="space-y-4 pt-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">E-mail Principal</Label>
                                                <div className="relative">
                                                    <Input value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-9 border-slate-300 pr-8" />
                                                    <Mail className="w-4 h-4 text-slate-400 absolute right-2 top-2.5" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Celular / WhatsApp</Label>
                                                <div className="relative">
                                                    <Input value={formData.celular || ""} onChange={(e) => setFormData({ ...formData, celular: e.target.value })} className="h-9 border-slate-300 pr-8" />
                                                    <Phone className="w-4 h-4 text-slate-400 absolute right-2 top-2.5" />
                                                </div>
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Website Corporativo</Label>
                                                <div className="relative">
                                                    <Input placeholder="https://..." value={formData.site || ""} onChange={(e) => setFormData({ ...formData, site: e.target.value })} className="h-9 border-slate-300 pr-8" />
                                                    <Globe className="w-4 h-4 text-slate-400 absolute right-2 top-2.5" />
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="banco" className="space-y-4 pt-2">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Banco</Label>
                                                <Input value={formData.dados_bancarios_banco || ""} onChange={(e) => setFormData({ ...formData, dados_bancarios_banco: e.target.value })} className="h-9 border-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Agência</Label>
                                                <Input value={formData.dados_bancarios_agencia || ""} onChange={(e) => setFormData({ ...formData, dados_bancarios_agencia: e.target.value })} className="h-9 border-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Conta Corrente</Label>
                                                <Input value={formData.dados_bancarios_conta || ""} onChange={(e) => setFormData({ ...formData, dados_bancarios_conta: e.target.value })} className="h-9 border-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Chave Pix</Label>
                                                <Input value={formData.dados_bancarios_pix || ""} onChange={(e) => setFormData({ ...formData, dados_bancarios_pix: e.target.value })} className="h-9 border-slate-300" />
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>

                            <div className="flex justify-end gap-3 p-6 bg-slate-50 border-t">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={resetForm}
                                    disabled={createCompany.isPending || updateCompany.isPending}
                                    className="text-slate-500"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createCompany.isPending || updateCompany.isPending}
                                    className="bg-green-600 hover:bg-green-700 min-w-[150px] font-bold shadow-md shadow-green-200"
                                >
                                    {createCompany.isPending || updateCompany.isPending ? "Processando..." : (editingCompany ? "Salvar Alterações" : "Concluir Cadastro")}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                <Card className="border-none shadow-xl rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50/70 border-b p-6">
                        <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-800 tracking-tight">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Building2 className="h-6 w-6 text-green-600" />
                            </div>
                            Minhas Unidades de Negócio
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="text-center py-20 text-muted-foreground">
                                <div className="animate-spin h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="font-bold text-slate-500">Sincronizando empresas...</p>
                            </div>
                        ) : companies?.length === 0 ? (
                            <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-4">
                                <Building2 className="h-16 w-16 text-slate-100" />
                                <p className="text-lg font-medium">Nenhuma empresa encontrada.</p>
                                <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="border-green-600 text-green-700 hover:bg-green-50 font-bold">Cadastrar Minha Primeira Empresa</Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-b border-slate-100">
                                        <TableHead className="font-black text-slate-600 text-xs uppercase p-6">Nome / Razão Social</TableHead>
                                        <TableHead className="font-black text-slate-600 text-xs uppercase">Documento</TableHead>
                                        <TableHead className="font-black text-slate-600 text-xs uppercase">E-mail de Contato</TableHead>
                                        <TableHead className="font-black text-slate-600 text-xs uppercase">Localização</TableHead>
                                        <TableHead className="font-black text-slate-600 text-xs uppercase text-center">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {companies?.map((company) => (
                                        <TableRow key={company.id} className="group hover:bg-slate-50/80 transition-all border-b border-slate-50">
                                            <TableCell className="p-6">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-slate-800 text-lg leading-tight group-hover:text-green-700 transition-colors">{company.razao_social}</span>
                                                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{company.nome_fantasia || "-"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-[11px] bg-slate-50 text-slate-600 border-slate-200">
                                                    {company.cnpj || "N/D"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-slate-600 font-medium">{company.email || "-"}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                    <span className="text-sm text-slate-600 font-bold">{company.endereco_cidade || "-"}</span>
                                                    <span className="text-xs text-slate-400 font-black uppercase">{company.endereco_estado || ""}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(company)}
                                                    className="w-10 h-10 rounded-xl hover:bg-green-50 hover:text-green-600 transition-all"
                                                >
                                                    <Pencil className="h-5 w-5" />
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
