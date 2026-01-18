import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Plus, Trash2, Edit2, ChevronRight, ChevronDown,
    FileText, Upload, Download, X, Copy
} from "lucide-react";
import { toast } from "sonner";

interface ChartOfAccount {
    id: string;
    code: string;
    name: string;
    description?: string;
    account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost';
    account_nature: 'debit' | 'credit';
    level: number;
    parent_id: string | null;
    is_analytic: boolean;
    show_in_dre: boolean;
    dre_group?: string;
    dre_order?: number;
}

interface AccountAttachment {
    id: string;
    account_id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    content_type: string;
    description?: string;
    created_at: string;
}

interface ChartOfAccountsManagerProps {
    companyId: string;
}

const accountTypeLabels = {
    asset: 'Ativo',
    liability: 'Passivo',
    equity: 'Patrimônio Líquido',
    revenue: 'Receita',
    expense: 'Despesa',
    cost: 'Custo',
};

const accountTypeColors = {
    asset: 'bg-blue-100 text-blue-800',
    liability: 'bg-red-100 text-red-800',
    equity: 'bg-purple-100 text-purple-800',
    revenue: 'bg-green-100 text-green-800',
    expense: 'bg-orange-100 text-orange-800',
    cost: 'bg-yellow-100 text-yellow-800',
};

export function ChartOfAccountsManager({ companyId }: ChartOfAccountsManagerProps) {
    const { activeClient } = useAuth();
    const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
    const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [showInitDialog, setShowInitDialog] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);
    const [attachments, setAttachments] = useState<AccountAttachment[]>([]);
    const [uploadingFiles, setUploadingFiles] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        account_type: 'expense' as const,
        account_nature: 'debit' as const,
        parent_id: null as string | null,
        is_analytic: true,
        show_in_dre: false,
        dre_group: '',
        dre_order: 0,
    });

    useEffect(() => {
        checkInitialSetup();
    }, [companyId]);

    const checkInitialSetup = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await activeClient
                .from('chart_of_accounts')
                .select('id')
                .eq('company_id', companyId)
                .limit(1);

            if (error) throw error;

            if (!data || data.length === 0) {
                setShowInitDialog(true);
            } else {
                loadAccounts();
            }
        } catch (error: any) {
            toast.error('Erro ao verificar plano de contas: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAccounts = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await activeClient
                .from('chart_of_accounts')
                .select('*')
                .eq('company_id', companyId)
                .order('code');

            if (error) throw error;
            setAccounts(data || []);
        } catch (error: any) {
            toast.error('Erro ao carregar plano de contas: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAttachments = async (accountId: string) => {
        try {
            const { data, error } = await activeClient
                .from('chart_account_attachments')
                .select('*')
                .eq('account_id', accountId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAttachments(data || []);
        } catch (error: any) {
            toast.error('Erro ao carregar anexos: ' + error.message);
        }
    };

    const initializeFromTemplate = async () => {
        try {
            setIsLoading(true);
            toast.info('Criando plano de contas...', { duration: 2000 });

            // Buscar template padrão
            const { data: template, error: templateError } = await activeClient
                .from('account_templates')
                .select('id')
                .eq('is_default', true)
                .single();

            if (templateError || !template) {
                toast.error('Template padrão não encontrado');
                return;
            }

            // Buscar itens do template
            const { data: items, error: itemsError } = await activeClient
                .from('account_template_items')
                .select('*')
                .eq('template_id', template.id)
                .order('level')
                .order('code');

            if (itemsError) throw itemsError;
            if (!items || items.length === 0) {
                toast.error('Template não possui contas');
                return;
            }

            // Criar mapa de códigos pai -> ID criado
            const codeToIdMap = new Map<string, string>();

            // Agrupar por nível para inserir em ordem
            const itemsByLevel = items.reduce((acc, item) => {
                if (!acc[item.level]) acc[item.level] = [];
                acc[item.level].push(item);
                return acc;
            }, {} as Record<number, typeof items>);

            const maxLevel = Math.max(...Object.keys(itemsByLevel).map(Number));

            // Inserir nível por nível
            for (let level = 1; level <= maxLevel; level++) {
                const levelItems = itemsByLevel[level] || [];
                if (levelItems.length === 0) continue;

                const accountsToCreate = levelItems.map(item => ({
                    company_id: companyId,
                    code: item.code,
                    name: item.name,
                    description: item.description,
                    account_type: item.account_type,
                    account_nature: item.account_nature,
                    level: item.level,
                    parent_id: item.parent_code ? codeToIdMap.get(item.parent_code) || null : null,
                    is_analytic: item.is_analytic,
                    show_in_dre: item.show_in_dre,
                    dre_group: item.dre_group,
                    dre_order: item.dre_order,
                }));

                const { data: created, error } = await activeClient
                    .from('chart_of_accounts')
                    .insert(accountsToCreate)
                    .select('id, code');

                if (error) throw error;

                // Mapear códigos -> IDs criados
                if (created) {
                    created.forEach(acc => {
                        codeToIdMap.set(acc.code, acc.id);
                    });
                }
            }

            toast.success(`${items.length} contas criadas com sucesso!`);
            setShowInitDialog(false);
            loadAccounts();
        } catch (error: any) {
            console.error('Erro ao criar plano de contas:', error);
            toast.error('Erro ao criar plano de contas: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const startFromScratch = () => {
        setShowInitDialog(false);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload = {
                ...formData,
                company_id: companyId,
                level: formData.parent_id
                    ? (accounts.find(a => a.id === formData.parent_id)?.level || 0) + 1
                    : 1,
            };

            if (editingAccount) {
                const { error } = await activeClient
                    .from('chart_of_accounts')
                    .update(payload)
                    .eq('id', editingAccount.id);

                if (error) throw error;
                toast.success('Conta atualizada com sucesso!');
            } else {
                const { error } = await activeClient
                    .from('chart_of_accounts')
                    .insert([payload]);

                if (error) throw error;
                toast.success('Conta criada com sucesso!');
            }

            setShowForm(false);
            setEditingAccount(null);
            resetForm();
            loadAccounts();
        } catch (error: any) {
            toast.error('Erro ao salvar conta: ' + error.message);
        }
    };

    const handleFileUpload = async (accountId: string, files: FileList) => {
        if (!files || files.length === 0) return;

        try {
            setUploadingFiles(true);

            for (const file of Array.from(files)) {
                // Upload para storage
                const filePath = `chart-accounts/${companyId}/${accountId}/${Date.now()}_${file.name}`;
                const { error: uploadError } = await activeClient.storage
                    .from('company-docs')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // Salvar metadados
                const { error: dbError } = await activeClient
                    .from('chart_account_attachments')
                    .insert([{
                        account_id: accountId,
                        file_name: file.name,
                        file_path: filePath,
                        file_size: file.size,
                        content_type: file.type,
                    }]);

                if (dbError) throw dbError;
            }

            toast.success(`${files.length} arquivo(s) anexado(s) com sucesso!`);
            loadAttachments(accountId);
        } catch (error: any) {
            toast.error('Erro ao anexar arquivo: ' + error.message);
        } finally {
            setUploadingFiles(false);
        }
    };

    const handleDownload = async (attachment: AccountAttachment) => {
        try {
            const { data, error } = await activeClient.storage
                .from('company-docs')
                .download(attachment.file_path);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.file_name;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error: any) {
            toast.error('Erro ao baixar arquivo: ' + error.message);
        }
    };

    const handleDeleteAttachment = async (attachmentId: string, filePath: string) => {
        if (!confirm('Tem certeza que deseja excluir este anexo?')) return;

        try {
            // Deletar do storage
            await activeClient.storage
                .from('company-docs')
                .remove([filePath]);

            // Deletar do banco
            const { error } = await activeClient
                .from('chart_account_attachments')
                .delete()
                .eq('id', attachmentId);

            if (error) throw error;

            toast.success('Anexo excluído com sucesso!');
            if (selectedAccount) {
                loadAttachments(selectedAccount.id);
            }
        } catch (error: any) {
            toast.error('Erro ao excluir anexo: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta conta? Todas as subcategorias e anexos também serão excluídos.')) return;

        try {
            const { error } = await activeClient
                .from('chart_of_accounts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Conta excluída com sucesso!');
            loadAccounts();
        } catch (error: any) {
            toast.error('Erro ao excluir conta: ' + error.message);
        }
    };

    const handleEdit = (account: ChartOfAccount) => {
        setEditingAccount(account);
        setFormData({
            code: account.code,
            name: account.name,
            description: account.description || '',
            account_type: account.account_type,
            account_nature: account.account_nature,
            parent_id: account.parent_id,
            is_analytic: account.is_analytic,
            show_in_dre: account.show_in_dre,
            dre_group: account.dre_group || '',
            dre_order: account.dre_order || 0,
        });
        setShowForm(true);
    };

    const handleAddSubcategory = (parentAccount: ChartOfAccount) => {
        setFormData({
            ...formData,
            parent_id: parentAccount.id,
            code: parentAccount.code + '.',
            account_type: parentAccount.account_type,
            account_nature: parentAccount.account_nature,
        });
        setShowForm(true);
    };

    const handleViewAttachments = (account: ChartOfAccount) => {
        setSelectedAccount(account);
        loadAttachments(account.id);
    };

    const resetForm = () => {
        setFormData({
            code: '',
            name: '',
            description: '',
            account_type: 'expense',
            account_nature: 'debit',
            parent_id: null,
            is_analytic: true,
            show_in_dre: false,
            dre_group: '',
            dre_order: 0,
        });
    };

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedAccounts);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedAccounts(newExpanded);
    };

    const renderAccountTree = (parentId: string | null = null, level: number = 0) => {
        const children = accounts.filter(a => a.parent_id === parentId);

        return children.map(account => {
            const hasChildren = accounts.some(a => a.parent_id === account.id);
            const isExpanded = expandedAccounts.has(account.id);

            return (
                <div key={account.id} style={{ marginLeft: `${level * 24}px` }}>
                    <div className="flex items-center gap-2 py-2 px-3 hover:bg-slate-50 rounded-lg group">
                        {hasChildren ? (
                            <button
                                onClick={() => toggleExpand(account.id)}
                                className="p-1 hover:bg-slate-200 rounded"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                ) : (
                                    <ChevronRight className="w-4 h-4" />
                                )}
                            </button>
                        ) : (
                            <div className="w-6" />
                        )}

                        <span className="font-mono text-sm text-slate-600 min-w-[100px]">{account.code}</span>
                        <span className="flex-1 font-medium">{account.name}</span>

                        <Badge className={accountTypeColors[account.account_type]}>
                            {accountTypeLabels[account.account_type]}
                        </Badge>

                        {account.is_analytic && (
                            <Badge variant="outline" className="text-xs">Analítica</Badge>
                        )}

                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewAttachments(account)}
                                className="h-8 w-8 p-0"
                                title="Ver anexos"
                            >
                                <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAddSubcategory(account)}
                                className="h-8 w-8 p-0"
                                title="Adicionar subcategoria"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(account)}
                                className="h-8 w-8 p-0"
                            >
                                <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(account.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {hasChildren && isExpanded && renderAccountTree(account.id, level + 1)}
                </div>
            );
        });
    };

    if (isLoading) {
        return <div className="text-center py-8 text-slate-500">Carregando plano de contas...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Dialog de Inicialização */}
            <Dialog open={showInitDialog} onOpenChange={setShowInitDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Inicializar Plano de Contas</DialogTitle>
                        <DialogDescription>
                            Escolha como deseja criar o plano de contas para esta empresa
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Button
                            onClick={initializeFromTemplate}
                            className="w-full justify-start h-auto py-4 px-4"
                            variant="outline"
                        >
                            <div className="text-left">
                                <div className="font-semibold flex items-center gap-2">
                                    <Copy className="w-4 h-4" />
                                    Usar Template Padrão
                                </div>
                                <div className="text-sm text-slate-500 mt-1">
                                    Criar plano de contas baseado no modelo padrão (53 contas)
                                </div>
                            </div>
                        </Button>
                        <Button
                            onClick={startFromScratch}
                            className="w-full justify-start h-auto py-4 px-4"
                            variant="outline"
                        >
                            <div className="text-left">
                                <div className="font-semibold flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    Criar do Zero
                                </div>
                                <div className="text-sm text-slate-500 mt-1">
                                    Criar um plano de contas personalizado desde o início
                                </div>
                            </div>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog de Anexos */}
            <Dialog open={!!selectedAccount} onOpenChange={() => setSelectedAccount(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Anexos - {selectedAccount?.name}</DialogTitle>
                        <DialogDescription>
                            Código: {selectedAccount?.code}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="file-upload" className="cursor-pointer">
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-slate-400 transition-colors text-center">
                                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                    <p className="text-sm text-slate-600">
                                        Clique para selecionar arquivos ou arraste aqui
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        PDF, Excel, XML, imagens, etc.
                                    </p>
                                </div>
                            </Label>
                            <input
                                id="file-upload"
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && selectedAccount) {
                                        handleFileUpload(selectedAccount.id, e.target.files);
                                    }
                                }}
                            />
                        </div>

                        {attachments.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Arquivos anexados:</h4>
                                {attachments.map(attachment => (
                                    <div
                                        key={attachment.id}
                                        className="flex items-center gap-2 p-3 border rounded-lg hover:bg-slate-50"
                                    >
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                                            <p className="text-xs text-slate-500">
                                                {(attachment.file_size / 1024).toFixed(2)} KB
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDownload(attachment)}
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteAttachment(attachment.id, attachment.file_path)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cabeçalho */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Plano de Contas</h3>
                    <p className="text-sm text-slate-500">
                        {accounts.length} conta{accounts.length !== 1 ? 's' : ''} cadastrada{accounts.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <Button onClick={() => setShowForm(!showForm)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nova Categoria
                </Button>
            </div>

            {/* Formulário */}
            {showForm && (
                <Card className="p-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Código *</Label>
                                <Input
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="Ex: 3.1.01"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Nome da Conta *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Receita de Vendas"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Descrição</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descrição detalhada da conta..."
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Tipo de Conta *</Label>
                                <Select
                                    value={formData.account_type}
                                    onValueChange={(value: any) => setFormData({ ...formData, account_type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(accountTypeLabels).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Natureza *</Label>
                                <Select
                                    value={formData.account_nature}
                                    onValueChange={(value: any) => setFormData({ ...formData, account_nature: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="debit">Devedora</SelectItem>
                                        <SelectItem value="credit">Credora</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.is_analytic}
                                    onChange={(e) => setFormData({ ...formData, is_analytic: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm">Conta Analítica (aceita lançamentos)</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.show_in_dre}
                                    onChange={(e) => setFormData({ ...formData, show_in_dre: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm">Exibir no DRE</span>
                            </label>
                        </div>

                        <div className="flex gap-2">
                            <Button type="submit" className="flex-1">
                                {editingAccount ? 'Atualizar' : 'Criar'} Conta
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingAccount(null);
                                    resetForm();
                                }}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Árvore de Contas */}
            <Card className="p-4">
                {accounts.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        Nenhuma conta cadastrada. Clique em "Nova Categoria" para começar.
                    </div>
                ) : (
                    <div className="space-y-1">
                        {renderAccountTree()}
                    </div>
                )}
            </Card>
        </div>
    );
}
