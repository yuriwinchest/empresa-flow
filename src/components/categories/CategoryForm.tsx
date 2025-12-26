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

const categoryFormSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    type: z.enum(["income", "expense"]),
    description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
    onSuccess: () => void;
    initialData?: any;
}

export function CategoryForm({ onSuccess, initialData }: CategoryFormProps) {
    const { toast } = useToast();
    const { selectedCompany } = useCompany();
    const queryClient = useQueryClient();

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categoryFormSchema),
        defaultValues: {
            name: "",
            type: "expense",
            description: "",
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                type: initialData.type,
                description: initialData.description || "",
            });
        }
    }, [initialData, form]);

    const onSubmit = async (values: CategoryFormValues) => {
        if (!selectedCompany) return;

        try {
            const payload = {
                company_id: selectedCompany.id,
                name: values.name,
                type: values.type,
                description: values.description,
            };

            let error;
            if (initialData?.id) {
                const { error: err } = await supabase
                    .from("categories")
                    .update(payload)
                    .eq("id", initialData.id);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from("categories")
                    .insert(payload);
                error = err;
            }

            if (error) throw error;

            toast({
                title: "Sucesso",
                description: `Categoria ${initialData ? "atualizada" : "criada"} com sucesso!`,
            });

            queryClient.invalidateQueries({ queryKey: ["categories"] });
            onSuccess();
            if (!initialData) form.reset();
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erro",
                description: "Falha ao salvar categoria.",
                variant: "destructive",
            });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome da Categoria</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Material de Escritório" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Movimentação</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="expense">Despesa (Saída)</SelectItem>
                                    <SelectItem value="income">Receita (Entrada)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                                <Textarea placeholder="" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
                    <Button type="submit">Salvar</Button>
                </div>
            </form>
        </Form>
    );
}
