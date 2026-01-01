
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
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react"; // Added useState
import { format } from "date-fns";
import { CalendarIcon, Upload, Loader2, Plus, Paperclip } from "lucide-react"; // Icons
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { AccountsPayable, ChartOfAccount } from "@/types/finance";
import { AccountsPayableSheet } from "./AccountsPayableSheet"; // Verify logic
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Tabs
import { Checkbox } from "@/components/ui/checkbox"; // Checkbox for retain
import { SupplierSheet } from "@/components/suppliers/SupplierSheet";

const formSchema = z.object({
    description: z.string().min(1, "Descrição é obrigatória"),
    amount: z.string().min(1, "Valor é obrigatório"),
    due_date: z.date({ required_error: "Data de vencimento é obrigatória" }),
    issue_date: z.date().optional(), // Emissão
    register_date: z.date().default(new Date()), // Registro
    supplier_id: z.string().optional(),
    category_id: z.string().optional(),
    project_id: z.string().optional(),
    department_id: z.string().optional(),
    invoice_number: z.string().optional(),

    payment_method: z.string().optional(),
    barcode: z.string().optional(),
    recurrence: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).optional(),
    observations: z.string().optional(),
    bank_account_id: z.string().optional(),
    status: z.enum(["pending", "paid", "overdue", "cancelled"]).default("pending"),
    payment_date: z.date().optional(),

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

interface AccountsPayableFormProps {
    onSuccess: () => void;
    initialData?: AccountsPayable;
}

export function AccountsPayableForm({ onSuccess, initialData }: AccountsPayableFormProps) {
    const { toast } = useToast();
    const { selectedCompany } = useCompany();
    const { activeClient } = useAuth();
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);
    const [fileUrl, setFileUrl] = useState<string | null>(initialData?.file_url || null);
    const [isSupplierSheetOpen, setIsSupplierSheetOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("principal");

    const { data: suppliers } = useQuery({
        queryKey: ["suppliers", selectedCompany?.id],
        queryFn: async () => {
            const { data } = await activeClient.from("suppliers").select("id, razao_social").eq("company_id", selectedCompany!.id);
            return data || [];
        },
        enabled: !!selectedCompany?.id
    });

    const { data: categories } = useQuery({
        queryKey: ["chart_of_accounts", selectedCompany?.id, 'despesa'],
        queryFn: async () => {
            const { data } = await activeClient
                .from("chart_of_accounts")
                .select("*")
                .eq("company_id", selectedCompany!.id)
                .eq("type", 'despesa')
                .order('code');
            return (data as ChartOfAccount[]) || [];
        },
        enabled: !!selectedCompany?.id
    });

    const { data: bankAccounts } = useQuery({
        queryKey: ["bank_accounts", selectedCompany?.id],
        queryFn: async () => {
            const { data } = await activeClient
                .from("bank_accounts")
                .select("id, name")
                .eq("company_id", selectedCompany!.id);
            return data || [];
        },
        enabled: !!selectedCompany?.id,
    });

    const { data: projects } = useQuery({
        queryKey: ["projects", selectedCompany?.id],
        queryFn: async () => {
            const { data } = await activeClient.from("projects").select("id, name").eq("company_id", selectedCompany!.id);
            return data || [];
        },
        enabled: !!selectedCompany?.id
    });

    const { data: departments } = useQuery({
        queryKey: ["departments", selectedCompany?.id],
        queryFn: async () => {
            const { data } = await activeClient.from("departments").select("id, name").eq("company_id", selectedCompany!.id);
            return data || [];
        },
        enabled: !!selectedCompany?.id
    });

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: "",
            amount: "",
            due_date: new Date(),
            invoice_number: "",
            supplier_id: "none",
            category_id: "none",
            project_id: "none",
            department_id: "none",
            payment_method: "boleto",
            barcode: "",
            recurrence: "none",
            observations: "",
            bank_account_id: undefined,
            status: "pending",
            issue_date: new Date(),
            register_date: new Date(),
            pis_amount: "0,00", pis_retain: false,
            cofins_amount: "0,00", cofins_retain: false,
            csll_amount: "0,00", csll_retain: false,
            ir_amount: "0,00", ir_retain: false,
            iss_amount: "0,00", iss_retain: false,
            inss_amount: "0,00", inss_retain: false,
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                description: initialData.description,
                amount: String(initialData.amount),
                due_date: new Date(initialData.due_date),
                invoice_number: initialData.invoice_number || "",
                supplier_id: initialData.supplier_id || "none",
                category_id: initialData.category_id || "none",
                project_id: initialData.project_id || "none",
                department_id: initialData.department_id || "none",
                payment_method: initialData.payment_method || "boleto",
                barcode: initialData.barcode || "",
                recurrence: initialData.recurrence || "none",
                observations: initialData.observations || "",
                bank_account_id: initialData.bank_account_id || undefined,
                status: initialData.status,
                issue_date: initialData.issue_date ? new Date(initialData.issue_date) : new Date(),
                register_date: initialData.register_date ? new Date(initialData.register_date) : new Date(),
                payment_date: initialData.payment_date ? new Date(initialData.payment_date) : undefined,

                pis_amount: String(initialData.pis_amount || "0,00"), pis_retain: initialData.pis_retain || false,
                cofins_amount: String(initialData.cofins_amount || "0,00"), cofins_retain: initialData.cofins_retain || false,
                csll_amount: String(initialData.csll_amount || "0,00"), csll_retain: initialData.csll_retain || false,
                ir_amount: String(initialData.ir_amount || "0,00"), ir_retain: initialData.ir_retain || false,
                iss_amount: String(initialData.iss_amount || "0,00"), iss_retain: initialData.iss_retain || false,
                inss_amount: String(initialData.inss_amount || "0,00"), inss_retain: initialData.inss_retain || false,
            });
            setFileUrl(initialData.file_url || null);
        }
    }, [initialData, form]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedCompany) return;

        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${selectedCompany.id}/payables/${fileName}`;

            const { error: uploadError } = await activeClient.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = activeClient.storage
                .from('documents')
                .getPublicUrl(filePath);

            setFileUrl(publicUrl);
            toast({ title: "Arquivo anexado com sucesso!" });
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao anexar arquivo", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const onSubmit = async (values: FormValues) => {
        if (!selectedCompany) return;

        try {
            const formatCurrency = (val?: string) => val ? parseFloat(val.toString().replace(/\./g, '').replace(',', '.')) : 0;
            const payload = {
                company_id: selectedCompany.id,
                description: values.description,
                amount: parseFloat(values.amount.replace(",", ".")),
                due_date: format(values.due_date, "yyyy-MM-dd"),
                issue_date: values.issue_date ? format(values.issue_date, "yyyy-MM-dd") : null,
                register_date: values.register_date ? format(values.register_date, "yyyy-MM-dd") : null,
                invoice_number: values.invoice_number,

                supplier_id: values.supplier_id === "none" ? null : values.supplier_id,
                category_id: values.category_id === "none" ? null : values.category_id,
                project_id: values.project_id === "none" ? null : values.project_id,
                department_id: values.department_id === "none" ? null : values.department_id,

                payment_method: values.payment_method,
                barcode: values.barcode,
                recurrence: values.recurrence,
                observations: values.observations,
                status: values.status,
                bank_account_id: values.bank_account_id || null,
                payment_date: values.payment_date ? format(values.payment_date, "yyyy-MM-dd") : (values.status === 'paid' ? format(values.due_date, "yyyy-MM-dd") : null),
                file_url: fileUrl,

                pis_amount: formatCurrency(values.pis_amount), pis_retain: values.pis_retain,
                cofins_amount: formatCurrency(values.cofins_amount), cofins_retain: values.cofins_retain,
                csll_amount: formatCurrency(values.csll_amount), csll_retain: values.csll_retain,
                ir_amount: formatCurrency(values.ir_amount), ir_retain: values.ir_retain,
                iss_amount: formatCurrency(values.iss_amount), iss_retain: values.iss_retain,
                inss_amount: formatCurrency(values.inss_amount), inss_retain: values.inss_retain,
            };

            let error;
            let payableId = initialData?.id;

            if (initialData?.id) {
                const { error: err } = await activeClient
                    .from("accounts_payable")
                    .update(payload)
                    .eq("id", initialData.id);
                error = err;
            } else {
                const { data: newPayable, error: err } = await activeClient
                    .from("accounts_payable")
                    .insert(payload)
                    .select("id")
                    .single();
                error = err;
                if (newPayable) payableId = newPayable.id;
            }

            if (error) throw error;

            toast({
                title: "Sucesso",
                description: `Conta ${initialData ? "atualizada" : "criada"} com sucesso!`,
            });

            // Transaction Generation Logic (Copied from previous step)
            if (values.status === "paid" && values.bank_account_id && !initialData?.transaction_id) {
                const { data: trans, error: transError } = await activeClient
                    .from("transactions")
                    .insert({
                        company_id: selectedCompany.id,
                        bank_account_id: values.bank_account_id,
                        category_id: values.category_id !== "none" ? values.category_id : null,
                        type: "debit",
                        amount: payload.amount,
                        date: payload.payment_date || payload.due_date,
                        description: `Pagamento: ${values.description}`,
                        status: "completed"
                    })
                    .select()
                    .single();

                if (!transError && trans && payableId) {
                    await activeClient
                        .from("accounts_payable")
                        .update({ transaction_id: trans.id })
                        .eq("id", payableId);
                }
            }

            queryClient.invalidateQueries({ queryKey: ["accounts_payable"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            onSuccess();
            if (!initialData) {
                form.reset();
                setFileUrl(null);
            }
        } catch (err: any) {
            console.error("Error saving payable:", err);
            toast({
                title: "Erro",
                description: "Erro ao salvar conta.",
                variant: "destructive",
            });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-2">
                        <TabsTrigger value="principal" className="border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-green-50/10 rounded-none px-4 py-2">Dados Principais</TabsTrigger>
                        <TabsTrigger value="impostos" className="border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-green-50/10 rounded-none px-4 py-2">Impostos e Recibo</TabsTrigger>
                        <TabsTrigger value="classificacao" className="border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-green-50/10 rounded-none px-4 py-2">Classificação</TabsTrigger>
                        <TabsTrigger value="detalhes" className="border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-green-50/10 rounded-none px-4 py-2">Detalhes</TabsTrigger>
                    </TabsList>

                    <TabsContent value="principal" className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl><Input placeholder="Ex: Aluguel" {...field} /></FormControl>
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
                                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="supplier_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between"><FormLabel>Fornecedor</FormLabel>
                                            <Button type="button" variant="ghost" className="h-auto p-0 text-xs text-green-600" onClick={() => setIsSupplierSheetOpen(true)}><Plus className="w-3" /> Novo</Button></div>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">-- Nenhum --</SelectItem>{suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.razao_social}</SelectItem>)}</SelectContent></Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="due_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Vencimento</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="paid">Pago</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )}
                            />
                            {form.watch("status") === "paid" && (
                                <FormField
                                    control={form.control}
                                    name="bank_account_id"
                                    render={({ field }) => (
                                        <FormItem><FormLabel>Conta Bancária</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{bankAccounts?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                    )}
                                />
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="impostos" className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            {['pis', 'cofins', 'csll', 'ir', 'iss', 'inss'].map((tax) => (
                                <div key={tax} className="flex items-end gap-2 p-2 border rounded bg-slate-50">
                                    <FormField
                                        control={form.control}
                                        name={`${tax}_amount` as any}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel className="uppercase">{tax} (R$)</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`${tax}_retain` as any}
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2 pb-2">
                                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                <FormLabel className="font-normal">Reter</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="classificacao" className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="category_id"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Categoria (Plano de Contas)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">-- Nenhuma --</SelectItem>{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="project_id"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Projeto</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">-- Nenhum --</SelectItem>{projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="department_id"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Departamento</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">-- Nenhum --</SelectItem>{departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="detalhes" className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="invoice_number"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Nota Fiscal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="barcode"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Código de Barras</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="issue_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Data de Emissão</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="register_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Data de Registro</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="observations"
                            render={({ field }) => (
                                <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="recurrence"
                            render={({ field }) => (
                                <FormItem><FormLabel>Repetição</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Não repetir</SelectItem><SelectItem value="monthly">Mensal</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )}
                        />

                        <div className="flex items-center gap-2 mt-4">
                            <Input type="file" className="hidden" id="file-upload" onChange={handleFileUpload} disabled={isUploading} />
                            <Button type="button" variant="outline" onClick={() => document.getElementById("file-upload")?.click()} disabled={isUploading}>
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Paperclip className="w-4 h-4 mr-2" />}
                                {fileUrl ? "Arquivo Anexado" : "Anexar Arquivo"}
                            </Button>
                            {fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Ver arquivo</a>}
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">Salvar Conta</Button>
                </div>
            </form>
            <SupplierSheet isOpen={isSupplierSheetOpen} onOpenChange={setIsSupplierSheetOpen} />
        </Form>
    );
}
