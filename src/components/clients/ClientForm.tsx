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

const clientFormSchema = z.object({
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
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
    onSuccess: () => void;
    initialData?: any;
}

export function ClientForm({ onSuccess, initialData }: ClientFormProps) {
    const { toast } = useToast();
    const { selectedCompany } = useCompany();
    const queryClient = useQueryClient();

    const form = useForm<ClientFormValues>({
        resolver: zodResolver(clientFormSchema),
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
            });
        }
    }, [initialData, form]);

    const onSubmit = async (values: ClientFormValues) => {
        if (!selectedCompany) {
            toast({
                title: "Erro",
                description: "Selecione uma empresa primeiro.",
                variant: "destructive",
            });
            return;
        }

        try {
            const clientData = {
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
            };

            let error;

            if (initialData?.id) {
                const { error: updateError } = await supabase
                    .from("clients")
                    .update(clientData)
                    .eq("id", initialData.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from("clients")
                    .insert(clientData);
                error = insertError;
            }

            if (error) throw error;

            toast({
                title: "Sucesso",
                description: `Cliente ${initialData ? "atualizado" : "cadastrado"} com sucesso!`,
            });

            queryClient.invalidateQueries({ queryKey: ["clients"] });
            onSuccess();
            if (!initialData) form.reset();

        } catch (error: any) {
            console.error("Error saving client:", error);
            toast({
                title: "Erro",
                description: "Erro ao salvar cliente. Verifique se o CPF/CNPJ já existe.",
                variant: "destructive",
            });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Tabs defaultValue="geral" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-4">
                        <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
                        <TabsTrigger value="contato">Contato</TabsTrigger>
                        <TabsTrigger value="endereco">Endereço</TabsTrigger>
                        <TabsTrigger value="obs">Observações</TabsTrigger>
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
                                        <Input placeholder="Nome da Empresa ou Pessoa" {...field} />
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
                                        <Input placeholder="Nome fantasia do estabelecimento" {...field} />
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
                                        <Input type="email" placeholder="contato@exemplo.com" {...field} />
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
                                        <Input placeholder="Apto 101, Bloco A..." {...field} />
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
                                            <Input placeholder="Centro" {...field} />
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
                                                <Input placeholder="SP" maxLength={2} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="obs" className="space-y-4">
                        <FormField
                            control={form.control}
                            name="observacoes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações Adicionais</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Informações importantes sobre o cliente..."
                                            className="min-h-[150px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                    <Button type="button" variant="outline" onClick={onSuccess}>Cancelar</Button>
                    <Button type="submit">Salvar Cliente</Button>
                </div>
            </form>
        </Form>
    );
}
