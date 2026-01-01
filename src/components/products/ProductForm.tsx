import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";

const formSchema = z.object({
    description: z.string().min(1, "Descrição é obrigatória"),
    code: z.string().optional(),
    price: z.coerce.number().min(0, "Preço deve ser positivo"),
    cost_price: z.coerce.number().min(0, "Custo deve ser positivo"),
    ncm: z.string().optional(),
    cest: z.string().optional(),
    activity: z.string().optional(),
    taxation_type: z.string().optional(),
    family: z.string().optional(),
    is_active: z.boolean().default(true),
});

interface ProductFormProps {
    product?: Product;
    onSuccess: () => void;
    onCancel?: () => void;
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
    const { activeClient } = useAuth();
    const { selectedCompany } = useCompany();
    const queryClient = useQueryClient();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: "",
            code: "",
            price: 0,
            cost_price: 0,
            ncm: "",
            cest: "",
            activity: "",
            taxation_type: "",
            family: "",
            is_active: true,
        },
    });

    useEffect(() => {
        if (product) {
            form.reset({
                description: product.description,
                code: product.code || "",
                price: product.price,
                cost_price: product.cost_price,
                ncm: product.ncm || "",
                cest: product.cest || "",
                activity: product.activity || "",
                taxation_type: product.taxation_type || "",
                family: product.family || "",
                is_active: product.is_active,
            });
        }
    }, [product, form]);

    const mutation = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            if (!selectedCompany) throw new Error("Empresa não selecionada");

            const payload = {
                ...values,
                company_id: selectedCompany.id,
            };

            if (product) {
                const { error } = await activeClient
                    .from("products")
                    .update(payload)
                    .eq("id", product.id);
                if (error) throw error;
            } else {
                const { error } = await activeClient
                    .from("products")
                    .insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success(product ? "Produto atualizado!" : "Produto criado!");
            onSuccess();
        },
        onError: (error) => {
            console.error(error);
            toast.error("Erro ao salvar produto");
        },
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        mutation.mutate(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descrição *</FormLabel>
                            <FormControl>
                                <Input placeholder="Nome do produto" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Código</FormLabel>
                                <FormControl>
                                    <Input placeholder="SKU/Ref" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="family"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Família/Grupo</FormLabel>
                                <FormControl>
                                    <Input placeholder="Categoria" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Preço de Venda (R$)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="cost_price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Preço de Custo (R$)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="activity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Atividade</FormLabel>
                                <FormControl>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Comércio">Comércio</SelectItem>
                                            <SelectItem value="Serviço">Serviço</SelectItem>
                                            <SelectItem value="Indústria">Indústria</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="taxation_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tributação</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Simples Nacional" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="ncm"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>NCM</FormLabel>
                                <FormControl>
                                    <Input placeholder="0000.00.00" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="cest"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>CEST</FormLabel>
                                <FormControl>
                                    <Input placeholder="00.000.00" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Ativo</FormLabel>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-4">
                    {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
