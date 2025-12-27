import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const supplierFormSchema = z.object({
    tipo_pessoa: z.enum(["PF", "PJ"]),
    razao_social: z.string().min(1, "Razão social é obrigatória"),
    nome_fantasia: z.string().optional(),
    cpf_cnpj: z.string().min(1, "CPF/CNPJ é obrigatório"),
    inscricao_estadual: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    telefone: z.string().optional(),
    celular: z.string().optional(),
    cep: z.string().optional(),
    endereco_logradouro: z.string().optional(),
    endereco_numero: z.string().optional(),
    endereco_complemento: z.string().optional(),
    endereco_bairro: z.string().optional(),
    endereco_cidade: z.string().optional(),
    endereco_estado: z.string().optional(),
    observacoes: z.string().optional(),
    dados_bancarios_banco: z.string().optional(),
    dados_bancarios_agencia: z.string().optional(),
    dados_bancarios_conta: z.string().optional(),
    dados_bancarios_tipo: z.string().optional(),
    dados_bancarios_pix: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
    onSuccess: () => void;
    initialData?: any;
}

export function SupplierForm({ onSuccess, initialData }: SupplierFormProps) {
    const { toast } = useToast();
    const { selectedCompany } = useCompany();
    const queryClient = useQueryClient();

    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierFormSchema),
        defaultValues: {
            tipo_pessoa: "PJ",
            razao_social: "",
            nome_fantasia: "",
            cpf_cnpj: "",
            inscricao_estadual: "",
            email: "",
            telefone: "",
            celular: "",
            cep: "",
            endereco_logradouro: "",
            endereco_numero: "",
            endereco_complemento: "",
            endereco_bairro: "",
            endereco_cidade: "",
            endereco_estado: "",
            observacoes: "",
            dados_bancarios_banco: "",
            dados_bancarios_agencia: "",
            dados_bancarios_conta: "",
            dados_bancarios_tipo: "corrente",
            dados_bancarios_pix: "",
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                tipo_pessoa: initialData.tipo_pessoa || "PJ",
                razao_social: initialData.razao_social || "",
                nome_fantasia: initialData.nome_fantasia || "",
                cpf_cnpj: initialData.cpf_cnpj || "",
                inscricao_estadual: initialData.inscricao_estadual || "",
                email: initialData.email || "",
                telefone: initialData.telefone || "",
                celular: initialData.celular || "",
                cep: initialData.endereco_cep || "",
                endereco_logradouro: initialData.endereco_logradouro || "",
                endereco_numero: initialData.endereco_numero || "",
                endereco_complemento: initialData.endereco_complemento || "",
                endereco_bairro: initialData.endereco_bairro || "",
                endereco_cidade: initialData.endereco_cidade || "",
                endereco_estado: initialData.endereco_estado || "",
                observacoes: initialData.observacoes || "",
                dados_bancarios_banco: initialData.dados_bancarios_banco || "",
                dados_bancarios_agencia: initialData.dados_bancarios_agencia || "",
                dados_bancarios_conta: initialData.dados_bancarios_conta || "",
                dados_bancarios_tipo: initialData.dados_bancarios_tipo || "corrente",
                dados_bancarios_pix: initialData.dados_bancarios_pix || "",
            });
        }
    }, [initialData, form]);

    const onSubmit = async (values: SupplierFormValues) => {
        if (!selectedCompany) {
            toast({
                title: "Erro",
                description: "Selecione uma empresa primeiro.",
                variant: "destructive",
            });
            return;
        }

        try {
            const supplierData = {
                company_id: selectedCompany.id,
                razao_social: values.razao_social,
                nome_fantasia: values.nome_fantasia,
                cpf_cnpj: values.cpf_cnpj,
                inscricao_estadual: values.inscricao_estadual,
                tipo_pessoa: values.tipo_pessoa,
                email: values.email,
                telefone: values.telefone,
                celular: values.celular,
                endereco_cep: values.cep,
                endereco_logradouro: values.endereco_logradouro,
                endereco_numero: values.endereco_numero,
                endereco_complemento: values.endereco_complemento,
                endereco_bairro: values.endereco_bairro,
                endereco_cidade: values.endereco_cidade,
                endereco_estado: values.endereco_estado,
                observacoes: values.observacoes,
                dados_bancarios_banco: values.dados_bancarios_banco,
                dados_bancarios_agencia: values.dados_bancarios_agencia,
                dados_bancarios_conta: values.dados_bancarios_conta,
                dados_bancarios_tipo: values.dados_bancarios_tipo,
                dados_bancarios_pix: values.dados_bancarios_pix,
            };

            let error;

            if (initialData?.id) {
                const { error: updateError } = await supabase
                    .from("suppliers")
                    .update(supplierData)
                    .eq("id", initialData.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from("suppliers")
                    .insert(supplierData);
                error = insertError;
            }

            if (error) throw error;

            toast({
                title: "Sucesso",
                description: `Fornecedor ${initialData ? "atualizado" : "cadastrado"} com sucesso!`,
            });

            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            onSuccess();
            if (!initialData) form.reset();

        } catch (error: any) {
            console.error("Error saving supplier:", error);
            toast({
                title: "Erro",
                description: "Erro ao salvar fornecedor. Verifique se o CPF/CNPJ já existe.",
                variant: "destructive",
            });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Tabs defaultValue="geral" className="w-full">
                    <TabsList className="grid w-full grid-cols-5 mb-4">
                        <TabsTrigger value="geral">Geral</TabsTrigger>
                        <TabsTrigger value="contato">Contato</TabsTrigger>
                        <TabsTrigger value="endereco">Endereço</TabsTrigger>
                        <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                        <TabsTrigger value="obs">Obs</TabsTrigger>
                    </TabsList>

                    <TabsContent value="geral" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="tipo_pessoa"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="PF">Pessoa Física</SelectItem>
                                                <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="cpf_cnpj"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CPF/CNPJ</FormLabel>
                                        <FormControl>
                                            <Input placeholder="000.000.000-00" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="razao_social"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Razão Social / Nome Completo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="nome_fantasia"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome Fantasia</FormLabel>
                                    <FormControl>
                                        <Input placeholder="" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="inscricao_estadual"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Inscrição Estadual</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Isento se não houver" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </TabsContent>

                    <TabsContent value="contato" className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="email@empresa.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="telefone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telefone Fixo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="(00) 0000-0000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="celular"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Celular / WhatsApp</FormLabel>
                                        <FormControl>
                                            <Input placeholder="(00) 90000-0000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="endereco" className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="cep"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CEP</FormLabel>
                                        <FormControl>
                                            <Input placeholder="00000-000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            <FormField
                                control={form.control}
                                name="endereco_logradouro"
                                render={({ field }) => (
                                    <FormItem className="col-span-3">
                                        <FormLabel>Logradouro</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Rua, Av..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="endereco_numero"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Número</FormLabel>
                                        <FormControl>
                                            <Input placeholder="123" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="endereco_complemento"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Complemento</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ao lado de..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="endereco_bairro"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bairro</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Bairro" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-3 gap-2">
                                <FormField
                                    control={form.control}
                                    name="endereco_cidade"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Cidade</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Cidade" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endereco_estado"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>UF</FormLabel>
                                            <FormControl>
                                                <Input placeholder="UF" maxLength={2} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="financeiro" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="dados_bancarios_banco"
                                render={({ field }) => (
                                    <FormItem className="col-span-1">
                                        <FormLabel>Banco</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: 001 - Banco do Brasil" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="dados_bancarios_tipo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Conta</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="corrente">Conta Corrente</SelectItem>
                                                <SelectItem value="poupanca">Poupança</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="dados_bancarios_agencia"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Agência</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="dados_bancarios_conta"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Conta</FormLabel>
                                        <FormControl>
                                            <Input placeholder="00000-0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="dados_bancarios_pix"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Chave PIX</FormLabel>
                                    <FormControl>
                                        <Input placeholder="CPF, Email ou Aleatória" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </TabsContent>

                    <TabsContent value="obs" className="space-y-4">
                        <FormField
                            control={form.control}
                            name="observacoes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Observações..." className="min-h-[150px]" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                    <Button type="button" variant="outline" onClick={onSuccess}>Cancelar</Button>
                    <Button type="submit">Salvar Fornecedor</Button>
                </div>
            </form>
        </Form>
    );
}
