import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
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
    FormDescription,
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
import { useEffect, useState } from "react";
import { AccountsReceivable, ChartOfAccount } from "@/types/finance";
import { ClientSheet } from "@/components/clients/ClientSheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
    description: z.string().min(1, "Descrição é obrigatória"),
    amount: z.string().min(1, "Valor é obrigatório"),
    due_date: z.date({ required_error: "Data de vencimento é obrigatória" }),
    receive_date: z.date().optional(),
    client_id: z.string().optional(),
    category_id: z.string().optional(),
    payment_method: z.string().optional(),
    recurrence: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).optional(),
    observations: z.string().optional(),
    status: z.enum(["pending", "paid", "overdue", "cancelled"]).default("pending"),
    bank_account_id: z.string().optional(),

    // Extended Fields
    invoice_number: z.string().optional(),
    issue_date: z.date().optional(),
    register_date: z.date().optional(),
    project_id: z.string().optional(),
    department_id: z.string().optional(),

    // Taxes
    pis_amount: z.string().optional(),
    pis_retain: z.boolean().default(false),
    cofins_amount: z.string().optional(),
    cofins_retain: z.boolean().default(false),
    csll_amount: z.string().optional(),
    csll_retain: z.boolean().default(false),
    ir_amount: z.string().optional(),
    ir_retain: z.boolean().default(false),
    iss_amount: z.string().optional(),
    iss_retain: z.boolean().default(false),
    inss_amount: z.string().optional(),
    inss_retain: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface AccountsReceivableFormProps {
    onSuccess: () => void;
    initialData?: AccountsReceivable;
}

interface Project {
    id: string;
    name: string;
}

interface Department {
    id: string;
    name: string;
}

interface BankAccount {
    id: string;
    name: string;
}

export function AccountsReceivableForm({ onSuccess, initialData }: AccountsReceivableFormProps) {
    const { toast } = useToast();
    const { selectedCompany } = useCompany();
    const { activeClient, isUsingSecondary } = useAuth();
    const queryClient = useQueryClient();
    const [isClientSheetOpen, setIsClientSheetOpen] = useState(false);

    // Queries
    const { data: clients } = useQuery({
        queryKey: ["clients", selectedCompany?.id, isUsingSecondary],
        queryFn: async () => {
            const { data } = await activeClient.from("clients").select("id, razao_social").eq("company_id", selectedCompany!.id);
            return data || [];
        },
        enabled: !!selectedCompany?.id
    });

    const { data: categories } = useQuery({
        queryKey: ["chart_of_accounts", "receita", selectedCompany?.id],
        queryFn: async () => {
            const { data } = await activeClient
                .from("chart_of_accounts")
                .select("id, name, code, is_analytic")
                .eq("company_id", selectedCompany!.id)
                .eq("type", "receita")
                .eq("is_analytic", true)
                .order("code");
            return (data as ChartOfAccount[]) || [];
        },
        enabled: !!selectedCompany?.id
    });

    const { data: bankAccounts } = useQuery({
        queryKey: ["bank_accounts", selectedCompany?.id],
        queryFn: async () => {
            const { data } = await activeClient.from("bank_accounts").select("id, name").eq("company_id", selectedCompany!.id);
            return (data as BankAccount[]) || [];
        },
        enabled: !!selectedCompany?.id
    });

    const { data: projects } = useQuery({
        queryKey: ["projects", selectedCompany?.id],
        queryFn: async () => {
            const { data } = await activeClient.from("projects").select("id, name").eq("company_id", selectedCompany!.id);
            return (data as Project[]) || [];
        },
        enabled: !!selectedCompany?.id
    });

    const { data: departments } = useQuery({
        queryKey: ["departments", selectedCompany?.id],
        queryFn: async () => {
            const { data } = await activeClient.from("departments").select("id, name").eq("company_id", selectedCompany!.id);
            return (data as Department[]) || [];
        },
        enabled: !!selectedCompany?.id
    });

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: "",
            amount: "",
            due_date: new Date(),
            client_id: "none",
            category_id: "none",
            payment_method: "boleto",
            recurrence: "none",
            observations: "",
            status: "pending",
            bank_account_id: "none",
            invoice_number: "",
            issue_date: new Date(),
            register_date: new Date(),
            project_id: "none",
            department_id: "none",
            pis_amount: "", pis_retain: false,
            cofins_amount: "", cofins_retain: false,
            csll_amount: "", csll_retain: false,
            ir_amount: "", ir_retain: false,
            iss_amount: "", iss_retain: false,
            inss_amount: "", inss_retain: false,
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                description: initialData.description,
                amount: String(initialData.amount),
                due_date: new Date(initialData.due_date),
                receive_date: initialData.receive_date ? new Date(initialData.receive_date) : undefined,
                client_id: initialData.client_id || "none",
                category_id: initialData.category_id || "none",
                payment_method: initialData.payment_method || "boleto",
                recurrence: initialData.recurrence || "none",
                observations: initialData.observations || "",
                status: initialData.status,
                bank_account_id: initialData.bank_account_id || "none",
                invoice_number: initialData.invoice_number || "",
                issue_date: initialData.issue_date ? new Date(initialData.issue_date) : undefined,
                register_date: initialData.register_date ? new Date(initialData.register_date) : new Date(),
                project_id: initialData.project_id || "none",
                department_id: initialData.department_id || "none",
                pis_amount: initialData.pis_amount ? String(initialData.pis_amount) : "",
                pis_retain: initialData.pis_retain || false,
                cofins_amount: initialData.cofins_amount ? String(initialData.cofins_amount) : "",
                cofins_retain: initialData.cofins_retain || false,
                csll_amount: initialData.csll_amount ? String(initialData.csll_amount) : "",
                csll_retain: initialData.csll_retain || false,
                ir_amount: initialData.ir_amount ? String(initialData.ir_amount) : "",
                ir_retain: initialData.ir_retain || false,
                iss_amount: initialData.iss_amount ? String(initialData.iss_amount) : "",
                iss_retain: initialData.iss_retain || false,
                inss_amount: initialData.inss_amount ? String(initialData.inss_amount) : "",
                inss_retain: initialData.inss_retain || false,
            });
        }
    }, [initialData, form]);

    const onSubmit = async (values: FormValues) => {
        if (!selectedCompany) return;

        try {
            const formatCurrency = (val?: string) => val ? parseFloat(val.replace(",", ".")) : 0;
            const formatDate = (date?: Date) => date ? format(date, "yyyy-MM-dd") : null;
            const formatRelCheck = (val: string) => val === "none" ? null : val;

            const payload = {
                company_id: selectedCompany.id,
                description: values.description,
                amount: formatCurrency(values.amount),
                due_date: formatDate(values.due_date),
                receive_date: formatDate(values.receive_date),
                client_id: formatRelCheck(values.client_id || "none"),
                category_id: formatRelCheck(values.category_id || "none"),
                payment_method: values.payment_method,
                recurrence: values.recurrence,
                observations: values.observations,
                status: values.status,
                bank_account_id: formatRelCheck(values.bank_account_id || "none"),

                invoice_number: values.invoice_number,
                issue_date: formatDate(values.issue_date),
                register_date: formatDate(values.register_date),
                project_id: formatRelCheck(values.project_id || "none"),
                department_id: formatRelCheck(values.department_id || "none"),

                pis_amount: formatCurrency(values.pis_amount),
                pis_retain: values.pis_retain,
                cofins_amount: formatCurrency(values.cofins_amount),
                cofins_retain: values.cofins_retain,
                csll_amount: formatCurrency(values.csll_amount),
                csll_retain: values.csll_retain,
                ir_amount: formatCurrency(values.ir_amount),
                ir_retain: values.ir_retain,
                iss_amount: formatCurrency(values.iss_amount),
                iss_retain: values.iss_retain,
                inss_amount: formatCurrency(values.inss_amount),
                inss_retain: values.inss_retain,
            };

            let error;
            let receivableId: string | undefined;

            if (initialData?.id) {
                const { error: err } = await activeClient
                    .from("accounts_receivable")
                    .update(payload)
                    .eq("id", initialData.id);
                error = err;
                receivableId = initialData.id;
            } else {
                const { data, error: err } = await activeClient
                    .from("accounts_receivable")
                    .insert(payload)
                    .select("id")
                    .single();
                error = err;
                receivableId = data?.id;
            }

            if (error) throw error;

            toast({ title: "Sucesso", description: "Recebimento salvo com sucesso!" });

            // Create Transaction if Paid/Received
            if ((values.status === "paid" || values.status === "received") && values.bank_account_id && values.bank_account_id !== "none" && !initialData?.transaction_id) {
                const { data: trans, error: transError } = await activeClient
                    .from("transactions")
                    .insert({
                        company_id: selectedCompany.id,
                        bank_account_id: values.bank_account_id,
                        category_id: payload.category_id,
                        type: "credit",
                        amount: payload.amount,
                        date: payload.receive_date || payload.due_date,
                        description: `Recebimento: ${values.description}`,
                        status: "completed"
                    })
                    .select()
                    .single();

                if (!transError && trans && receivableId) {
                    await activeClient
                        .from("accounts_receivable")
                        .update({ transaction_id: trans.id })
                        .eq("id", receivableId);
                }
            }

            queryClient.invalidateQueries({ queryKey: ["accounts_receivable"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
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

    const renderTaxField = (name: string, label: string) => (
        <div className="flex items-center space-x-2 border rounded-md p-3 bg-slate-50/50">
            <div className="flex-1 space-y-1">
                <FormLabel className="text-xs font-semibold uppercase text-slate-500">{label}</FormLabel>
                <FormField
                    control={form.control}
                    name={`${name}_amount` as any}
                    render={({ field }) => (
                        <FormControl>
                            <Input
                                placeholder="0,00"
                                {...field}
                                className="h-8 border-slate-200"
                            />
                        </FormControl>
                    )}
                />
            </div>
            <FormField
                control={form.control}
                name={`${name}_retain` as any}
                render={({ field }) => (
                    <FormItem className="flex flex-col items-center justify-end h-full pb-1">
                        <div className="flex items-center space-x-2">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <FormLabel className="text-xs font-normal cursor-pointer text-slate-600">Ret?</FormLabel>
                        </div>
                    </FormItem>
                )}
            />
        </div>
    );


    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <Tabs defaultValue="main" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 bg-slate-100/50">
                            <TabsTrigger value="main">Principal</TabsTrigger>
                            <TabsTrigger value="taxes">Impostos</TabsTrigger>
                            <TabsTrigger value="classification">Classificação</TabsTrigger>
                            <TabsTrigger value="details">Detalhes</TabsTrigger>
                        </TabsList>

                        <TabsContent value="main" className="space-y-4 pt-4">
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descrição</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Venda de Serviços" {...field} className="font-medium" />
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
                                                <Input type="number" step="0.01" className="font-bold text-lg" placeholder="0.00" {...field} />
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
                                                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                                        >
                                                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date("1900-01-01")} initialFocus />
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
                                            <div className="flex items-center justify-between">
                                                <FormLabel>Cliente</FormLabel>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    className="h-auto p-0 text-[10px] text-green-600 font-bold flex items-center gap-1"
                                                    onClick={() => setIsClientSheetOpen(true)}
                                                >
                                                    <Plus className="w-3 h-3" /> NOVO
                                                </Button>
                                            </div>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">-- Nenhum --</SelectItem>
                                                    {clients?.map((s) => (
                                                        <SelectItem key={s.id} value={s.id}>{s.razao_social}</SelectItem>
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
                                                    {categories?.map((c) => (
                                                        <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

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
                                                <SelectItem value="pending">Pendente (A Receber)</SelectItem>
                                                <SelectItem value="paid">Recebido</SelectItem>
                                                <SelectItem value="cancelled">Cancelado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {(form.watch("status") === "paid" || form.watch("status") === "received") && (
                                <div className="grid grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                                    <FormField
                                        control={form.control}
                                        name="receive_date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Data Recebimento</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant={"outline"}
                                                                className={cn("w-full pl-3 text-left font-normal border-emerald-200", !field.value && "text-muted-foreground")}
                                                            >
                                                                {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date("1900-01-01")} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="bank_account_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Conta Destino</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="border-emerald-200">
                                                            <SelectValue placeholder="Selecione..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="none">-- Nenhuma --</SelectItem>
                                                        {bankAccounts?.map((acc) => (
                                                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                        </TabsContent>

                        <TabsContent value="taxes" className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-3">
                                {renderTaxField("pis", "PIS")}
                                {renderTaxField("cofins", "COFINS")}
                                {renderTaxField("csll", "CSLL")}
                                {renderTaxField("ir", "IRRF")}
                                {renderTaxField("iss", "ISS")}
                                {renderTaxField("inss", "INSS")}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                                * Marque "Ret?" se o imposto foi retido na fonte (reduz ou destaca do valor líquido).
                            </div>
                        </TabsContent>

                        <TabsContent value="classification" className="space-y-4 pt-4">
                            <FormField
                                control={form.control}
                                name="project_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Projeto</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">-- Geral --</SelectItem>
                                                {projects?.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>Associe este recebimento a um projeto específico.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="department_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Departamento</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">-- Geral --</SelectItem>
                                                {departments?.map((d) => (
                                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>Centro de custo ou departamento responsável.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </TabsContent>

                        <TabsContent value="details" className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="invoice_number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nº Nota Fiscal</FormLabel>
                                            <FormControl>
                                                <Input placeholder="000.000" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="issue_date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Data Emissão</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                                        >
                                                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="payment_method"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Forma de Pagamento Preferencial</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="boleto">Boleto Bancário</SelectItem>
                                                <SelectItem value="pix">PIX</SelectItem>
                                                <SelectItem value="transfer">Transferência</SelectItem>
                                                <SelectItem value="card">Cartão</SelectItem>
                                                <SelectItem value="cash">Dinheiro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="observations"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Observações</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Detalhes adicionais..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
                        <Button type="button" variant="ghost" onClick={onSuccess}>Cancelar</Button>
                        <Button type="submit" disabled={form.formState.isSubmitting} className="w-32">
                            {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
                        </Button>
                    </div>
                </form>
            </Form>

            <ClientSheet
                isOpen={isClientSheetOpen}
                onClose={() => setIsClientSheetOpen(false)}
            />
        </>
    );
}
