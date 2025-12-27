import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AccountsReceivable } from "@/types/finance";

const formSchema = z.object({
    description: z.string().min(1, "Descrição é obrigatória"),
    amount: z.string().min(1, "Valor é obrigatório"),
    due_date: z.date({ required_error: "Data de vencimento é obrigatória" }),
    client_id: z.string().optional(),
    category_id: z.string().optional(),
    payment_method: z.string().optional(),
    recurrence: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).default("none"),
    observations: z.string().optional(),
    status: z.enum(["pending", "paid", "overdue", "cancelled"]).default("pending"),
});

type FormValues = z.infer<typeof formSchema>;

interface AccountsReceivableFormProps {
    onSuccess: () => void;
    initialData?: AccountsReceivable;
}

export function AccountsReceivableForm({ onSuccess, initialData }: AccountsReceivableFormProps) {
    const { toast } = useToast();
    const { selectedCompany } = useCompany();
    const { activeClient } = useAuth();
    const queryClient = useQueryClient();

    // Load clients and categories
    const { data: clients } = useQuery({
        queryKey: ["clients", selectedCompany?.id, activeClient],
        queryFn: async () => {
            const { data } = await activeClient.from("clients").select("id, razao_social").eq("company_id", selectedCompany!.id);
            return data || [];
        },
        enabled: !!selectedCompany?.id
    });

    const { data: categories } = useQuery({
        queryKey: ["categories", selectedCompany?.id, activeClient],
        queryFn: async () => {
            const { data } = await activeClient.from("categories").select("id, name").eq("company_id", selectedCompany!.id);
            return data || [];
        },
        enabled: !!selectedCompany?.id
    });

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: "",
            amount: "",
            client_id: "none",
            category_id: "none",
            payment_method: "boleto",
            recurrence: "none",
            observations: "",
            status: "pending",
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                description: initialData.description,
                amount: String(initialData.amount),
                due_date: new Date(initialData.due_date),
                client_id: initialData.client_id || "none",
                category_id: initialData.category_id || "none",
                payment_method: initialData.payment_method || "boleto",
                recurrence: initialData.recurrence || "none",
                observations: initialData.observations || "",
                status: initialData.status,
            });
        }
    }, [initialData, form]);

    const onSubmit = async (values: FormValues) => {
        if (!selectedCompany) return;

        try {
            const payload = {
                company_id: selectedCompany.id,
                description: values.description,
                amount: parseFloat(values.amount.replace(",", ".")),
                due_date: format(values.due_date, "yyyy-MM-dd"),
                client_id: values.client_id === "none" ? null : values.client_id,
                category_id: values.category_id === "none" ? null : values.category_id,
                payment_method: values.payment_method,
                recurrence: values.recurrence,
                observations: values.observations,
                status: values.status,
            };

            let error;
            if (initialData?.id) {
                const { error: err } = await activeClient
                    .from("accounts_receivable")
                    .update(payload)
                    .eq("id", initialData.id);
                error = err;
            } else {
                const { error: err } = await activeClient
                    .from("accounts_receivable")
                    .insert(payload);
                error = err;
            }

            if (error) throw error;

            toast({
                title: "Sucesso",
                description: `Recebimento ${initialData ? "atualizado" : "criado"} com sucesso!`,
            });

            queryClient.invalidateQueries({ queryKey: ["accounts_receivable"] });
            onSuccess();
            if (!initialData) form.reset();
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erro",
                description: "Falha ao salvar recebimento.",
                variant: "destructive",
            });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Venda de Produto, Serviço X" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Valor (R$)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="due_date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Vencimento</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "dd/MM/yyyy")
                                                ) : (
                                                    <span>Selecione a data</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="client_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cliente</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">-- Nenhum --</SelectItem>
                                        {clients?.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="category_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Categoria</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">-- Nenhuma --</SelectItem>
                                        {categories?.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
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
                        name="recurrence"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Recorrência</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">Não recorrente</SelectItem>
                                        <SelectItem value="monthly">Mensal</SelectItem>
                                        <SelectItem value="weekly">Semanal</SelectItem>
                                        <SelectItem value="daily">Diária</SelectItem>
                                        <SelectItem value="yearly">Anual</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="pending">Pendente</SelectItem>
                                        <SelectItem value="paid">Recebido</SelectItem>
                                        <SelectItem value="cancelled">Cancelado</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>


                <FormField
                    control={form.control}
                    name="observations"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Observações</FormLabel>
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
