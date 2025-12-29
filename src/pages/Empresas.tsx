import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "react-router-dom";
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
import { Plus, Pencil, Trash2, Building2, User, Globe, Search, Landmark, Mail, Phone, FileText } from "lucide-react";
import { useCompanies } from "@/hooks/useCompanies";
import { Company, CompanyFormData } from "@/types/company";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { maskCNPJ, maskCPF, maskPhone, maskCEP, unmask } from "@/utils/masks";
import { toast } from "sonner";
import { logDeletion } from "@/lib/audit";

type CompanyDocumentRow = {
    id: string;
    company_id: string;
    doc_type: string;
    file_name: string;
    storage_path: string;
    mime_type: string | null;
    file_size: number | string | null;
    created_at: string;
};

type CompanyNfseSettings = {
    provider: string;
    city_name: string;
    city_ibge_code: string;
    uf: string;
    environment: "homologacao" | "producao";
    login: string;
    password: string;
};

export default function Empresas() {
    const { user, activeClient } = useAuth();
    const { companies, isLoading, error: companiesError, createCompany, updateCompany, deleteCompany, suggestCategories } = useCompanies(user?.id);

    // UI State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [activeTab, setActiveTab] = useState("geral");
    const [isCnpjLookupLoading, setIsCnpjLookupLoading] = useState(false);
    const [cnaeDescricao, setCnaeDescricao] = useState<string>("");
    const [cnaeOpcoes, setCnaeOpcoes] = useState<Array<{ codigo: string; descricao: string; origem: "principal" | "secundario" }>>([]);
    const [cartaoCnpjDoc, setCartaoCnpjDoc] = useState<CompanyDocumentRow | null>(null);
    const [cartaoCnpjFile, setCartaoCnpjFile] = useState<File | null>(null);
    const [isCartaoCnpjLoading, setIsCartaoCnpjLoading] = useState(false);
    const [isCartaoCnpjUploading, setIsCartaoCnpjUploading] = useState(false);
    const [certificadoA1Doc, setCertificadoA1Doc] = useState<CompanyDocumentRow | null>(null);
    const [certificadoA1File, setCertificadoA1File] = useState<File | null>(null);
    const [isCertificadoA1Loading, setIsCertificadoA1Loading] = useState(false);
    const [isCertificadoA1Uploading, setIsCertificadoA1Uploading] = useState(false);
    const [nfseSettings, setNfseSettings] = useState<CompanyNfseSettings>({
        provider: "",
        city_name: "",
        city_ibge_code: "",
        uf: "",
        environment: "homologacao",
        login: "",
        password: "",
    });
    const [isNfseLoading, setIsNfseLoading] = useState(false);
    const [isNfseSaving, setIsNfseSaving] = useState(false);
    const [isSuggestingCategories, setIsSuggestingCategories] = useState(false);

    // Form State
    const [formData, setFormData] = useState<CompanyFormData>({
        razao_social: "",
        nome_fantasia: "",
        cnpj: "",
        inscricao_estadual: "",
        inscricao_municipal: "",
        cnae: "",
        activity_profile: "comercio",
        enable_nfse: false,
        enable_nfe: false,
        enable_nfce: false,
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

    const isSavingCompany = createCompany.isPending || updateCompany.isPending;
    const activityProfileLabel = useMemo(() => {
        const p = formData.activity_profile || "comercio";
        if (p === "servico") return "Serviço";
        if (p === "mista") return "Mista";
        return "Comércio";
    }, [formData.activity_profile]);

    const formatBytes = useCallback((bytes?: number | string | null) => {
        const n = typeof bytes === "string" ? Number(bytes) : bytes;
        if (!n || n <= 0 || Number.isNaN(n)) return "-";
        const units = ["B", "KB", "MB", "GB", "TB"];
        const exp = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
        const value = n / Math.pow(1024, exp);
        return `${value.toFixed(value >= 10 || exp === 0 ? 0 : 1)} ${units[exp]}`;
    }, []);

    const sanitizeFileName = useCallback((name: string) => {
        return name
            .normalize("NFKD")
            .replace(/[^\w.-]+/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "");
    }, []);

    const cartaoCnpjAccept = useMemo(() => "application/pdf,image/png,image/jpeg", []);
    const certificadoA1Accept = useMemo(() => ".pfx,.p12,application/x-pkcs12", []);

    const classifyCnae = useCallback((code: string) => {
        const digits = (code || "").replace(/\D/g, "");
        const prefix = digits.slice(0, 2);
        const n = Number(prefix);
        if (!prefix || Number.isNaN(n)) return null;
        if (n >= 45 && n <= 47) return "comercio" as const;
        if (n >= 41 && n <= 43) return "servico" as const;
        if (n >= 49 && n <= 99) return "servico" as const;
        return "comercio" as const;
    }, []);

    const computeProfileAndModules = useCallback((codes: string[]) => {
        const categories = new Set<"servico" | "comercio">();
        for (const code of codes) {
            const c = classifyCnae(code);
            if (c) categories.add(c);
        }
        const hasServico = categories.has("servico");
        const hasComercio = categories.has("comercio");
        if (!hasServico && !hasComercio) return null;
        const profile = hasServico && hasComercio ? "mista" : (hasServico ? "servico" : "comercio");
        return {
            activity_profile: profile as "servico" | "comercio" | "mista",
            enable_nfse: profile === "servico" || profile === "mista",
            enable_nfe: profile === "comercio" || profile === "mista",
            enable_nfce: profile === "comercio" || profile === "mista",
        };
    }, [classifyCnae]);

    const hasAllowedExtension = useCallback((name: string, extensions: string[]) => {
        const lower = (name || "").toLowerCase();
        return extensions.some((ext) => lower.endsWith(ext));
    }, []);

    const isAnyDocUploading = isCartaoCnpjUploading || isCertificadoA1Uploading;
    const isAnyBusy = isAnyDocUploading || isNfseSaving;

    const resetForm = useCallback(() => {
        setFormData({
            razao_social: "",
            nome_fantasia: "",
            cnpj: "",
            inscricao_estadual: "",
            inscricao_municipal: "",
            cnae: "",
            activity_profile: "comercio",
            enable_nfse: false,
            enable_nfe: false,
            enable_nfce: false,
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
        setCnaeDescricao("");
        setCnaeOpcoes([]);
        setEditingCompany(null);
        setCartaoCnpjDoc(null);
        setCartaoCnpjFile(null);
        setCertificadoA1Doc(null);
        setCertificadoA1File(null);
        setNfseSettings({
            provider: "",
            city_name: "",
            city_ibge_code: "",
            uf: "",
            environment: "homologacao",
            login: "",
            password: "",
        });
        setActiveTab("geral");
        setIsDialogOpen(false);
    }, []);

    const [searchParams, setSearchParams] = useSearchParams();

    const handleEdit = useCallback((company: Company) => {
        setEditingCompany(company);
        setFormData({
            razao_social: company.razao_social,
            nome_fantasia: company.nome_fantasia || "",
            cnpj: maskCNPJ(company.cnpj || ""),
            inscricao_estadual: company.inscricao_estadual || "",
            inscricao_municipal: company.inscricao_municipal || "",
            cnae: company.cnae || "",
            activity_profile: company.activity_profile || "comercio",
            enable_nfse: Boolean(company.enable_nfse),
            enable_nfe: Boolean(company.enable_nfe),
            enable_nfce: Boolean(company.enable_nfce),
            natureza_juridica: company.natureza_juridica || "",
            regime_tributario: company.regime_tributario || "",
            email: company.email || "",
            telefone: maskPhone(company.telefone || ""),
            celular: maskPhone(company.celular || ""),
            site: company.site || "",
            contato_nome: company.contato_nome || "",
            endereco_cep: maskCEP(company.endereco_cep || ""),
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
            dados_bancarios_titular_cpf_cnpj: company.dados_bancarios_titular_cpf_cnpj?.length > 11
                ? maskCNPJ(company.dados_bancarios_titular_cpf_cnpj)
                : maskCPF(company.dados_bancarios_titular_cpf_cnpj || ""),
            dados_bancarios_titular_nome: company.dados_bancarios_titular_nome || "",
        });
        setCnaeDescricao("");
        setCnaeOpcoes([]);
        setActiveTab("geral");
        setIsDialogOpen(true);
    }, []);

    const handleSuggestCategories = useCallback(async () => {
        if (!editingCompany?.id) return;
        if (isSuggestingCategories) return;
        setIsSuggestingCategories(true);
        try {
            await suggestCategories.mutateAsync({
                companyId: editingCompany.id,
                activityProfile: formData.activity_profile || "comercio",
            });
        } catch (error) {
            console.error(error);
            toast.error("Erro ao gerar categorias sugeridas");
        } finally {
            setIsSuggestingCategories(false);
        }
    }, [editingCompany?.id, formData.activity_profile, isSuggestingCategories, suggestCategories]);

    const handleLookupCnpj = useCallback(async () => {
        const cnpj = unmask(formData.cnpj || "");
        if (cnpj.length !== 14) {
            toast.error("Informe um CNPJ válido");
            return;
        }

        setIsCnpjLookupLoading(true);
        try {
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
            if (!response.ok) {
                toast.error("Não foi possível consultar este CNPJ");
                return;
            }

            const data = await response.json();
            const cnaePrincipalCodigo = data?.cnae_fiscal ? String(data.cnae_fiscal) : "";
            const cnaePrincipalDescricao = data?.cnae_fiscal_descricao ? String(data.cnae_fiscal_descricao) : "";
            const secundarias = Array.isArray(data?.cnaes_secundarios) ? data.cnaes_secundarios : [];
            const opcoes = [
                ...(cnaePrincipalCodigo && cnaePrincipalDescricao
                    ? [{ codigo: cnaePrincipalCodigo, descricao: cnaePrincipalDescricao, origem: "principal" as const }]
                    : []),
                ...secundarias
                    .filter((c: any) => c && c.codigo && c.descricao)
                    .map((c: any) => ({ codigo: String(c.codigo), descricao: String(c.descricao), origem: "secundario" as const })),
            ];
            setCnaeOpcoes(opcoes);
            setCnaeDescricao((prev) => prev || cnaePrincipalDescricao);
            setFormData((prev) => ({
                ...prev,
                razao_social: prev.razao_social || data?.razao_social || "",
                nome_fantasia: prev.nome_fantasia || data?.nome_fantasia || "",
                cnae: prev.cnae || cnaePrincipalCodigo,
                natureza_juridica: prev.natureza_juridica || data?.natureza_juridica || "",
                regime_tributario: prev.regime_tributario || (data?.opcao_pelo_simples ? "simples" : prev.regime_tributario),
                email: prev.email || data?.email || "",
                telefone: prev.telefone || maskPhone(data?.ddd_telefone_1 || data?.telefone || ""),
                endereco_cep: prev.endereco_cep || maskCEP(data?.cep || ""),
                endereco_logradouro: prev.endereco_logradouro || data?.logradouro || "",
                endereco_numero: prev.endereco_numero || data?.numero || "",
                endereco_complemento: prev.endereco_complemento || data?.complemento || "",
                endereco_bairro: prev.endereco_bairro || data?.bairro || "",
                endereco_cidade: prev.endereco_cidade || data?.municipio || "",
                endereco_estado: prev.endereco_estado || data?.uf || "",
            }));
        } catch {
            toast.error("Erro ao consultar CNPJ");
        } finally {
            setIsCnpjLookupLoading(false);
        }
    }, [formData.cnpj]);

    useEffect(() => {
        if (searchParams.get("new") === "true") {
            resetForm();
            setIsDialogOpen(true);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("new");
            setSearchParams(newParams, { replace: true });
        }
    }, [resetForm, searchParams, setSearchParams]);

    useEffect(() => {
        const editId = searchParams.get("edit");
        if (!editId) return;
        const company = (companies || []).find((c) => c.id === editId);
        if (!company) return;

        handleEdit(company);

        const tab = searchParams.get("tab");
        if (tab && ["geral", "endereco", "contato", "banco", "documentos"].includes(tab)) {
            setActiveTab(tab as any);
        }

        const newParams = new URLSearchParams(searchParams);
        newParams.delete("edit");
        newParams.delete("tab");
        setSearchParams(newParams, { replace: true });
    }, [companies, handleEdit, searchParams, setActiveTab, setSearchParams]);

    useEffect(() => {
        const cnpj = unmask(formData.cnpj || "");
        if (!isDialogOpen || isCnpjLookupLoading || cnpj.length !== 14) return;
        if (formData.razao_social) return;
        handleLookupCnpj();
    }, [formData.cnpj, formData.razao_social, handleLookupCnpj, isCnpjLookupLoading, isDialogOpen]);

    useEffect(() => {
        const codes = [
            ...(Array.isArray(cnaeOpcoes) ? cnaeOpcoes.map((o) => o.codigo) : []),
            String(formData.cnae || ""),
        ].filter(Boolean);
        const next = computeProfileAndModules(codes);
        if (!next) return;
        setFormData((prev) => {
            if (
                prev.activity_profile === next.activity_profile &&
                Boolean(prev.enable_nfse) === next.enable_nfse &&
                Boolean(prev.enable_nfe) === next.enable_nfe &&
                Boolean(prev.enable_nfce) === next.enable_nfce
            ) {
                return prev;
            }
            return { ...prev, ...next };
        });
    }, [cnaeOpcoes, computeProfileAndModules, formData.cnae]);

    const loadCartaoCnpjDoc = useCallback(async (companyId: string) => {
        setIsCartaoCnpjLoading(true);
        try {
            const { data, error } = await (activeClient as any)
                .from("company_documents")
                .select("id, company_id, doc_type, file_name, storage_path, mime_type, file_size, created_at")
                .eq("company_id", companyId)
                .eq("doc_type", "cartao_cnpj")
                .order("created_at", { ascending: false })
                .limit(1);

            if (error) throw error;
            setCartaoCnpjDoc(Array.isArray(data) && data.length ? (data[0] as CompanyDocumentRow) : null);
        } catch {
            setCartaoCnpjDoc(null);
        } finally {
            setIsCartaoCnpjLoading(false);
        }
    }, [activeClient]);

    const loadCertificadoA1Doc = useCallback(async (companyId: string) => {
        setIsCertificadoA1Loading(true);
        try {
            const { data, error } = await (activeClient as any)
                .from("company_documents")
                .select("id, company_id, doc_type, file_name, storage_path, mime_type, file_size, created_at")
                .eq("company_id", companyId)
                .eq("doc_type", "certificado_a1")
                .order("created_at", { ascending: false })
                .limit(1);

            if (error) throw error;
            setCertificadoA1Doc(Array.isArray(data) && data.length ? (data[0] as CompanyDocumentRow) : null);
        } catch {
            setCertificadoA1Doc(null);
        } finally {
            setIsCertificadoA1Loading(false);
        }
    }, [activeClient]);

    const loadNfseSettings = useCallback(async (companyId: string) => {
        setIsNfseLoading(true);
        try {
            const { data, error } = await (activeClient as any)
                .from("company_nfse_settings")
                .select("provider, city_name, city_ibge_code, uf, environment, login, password")
                .eq("company_id", companyId)
                .maybeSingle();

            if (error) throw error;
            setNfseSettings({
                provider: String(data?.provider || ""),
                city_name: String(data?.city_name || ""),
                city_ibge_code: String(data?.city_ibge_code || ""),
                uf: String(data?.uf || ""),
                environment: data?.environment === "producao" ? "producao" : "homologacao",
                login: String(data?.login || ""),
                password: String(data?.password || ""),
            });
        } catch {
            setNfseSettings({
                provider: "",
                city_name: "",
                city_ibge_code: "",
                uf: "",
                environment: "homologacao",
                login: "",
                password: "",
            });
        } finally {
            setIsNfseLoading(false);
        }
    }, [activeClient]);

    useEffect(() => {
        if (!isDialogOpen) {
            setCartaoCnpjDoc(null);
            setCartaoCnpjFile(null);
            setCertificadoA1Doc(null);
            setCertificadoA1File(null);
            setNfseSettings({
                provider: "",
                city_name: "",
                city_ibge_code: "",
                uf: "",
                environment: "homologacao",
                login: "",
                password: "",
            });
            return;
        }
        if (!editingCompany?.id) {
            setCartaoCnpjDoc(null);
            setCartaoCnpjFile(null);
            setCertificadoA1Doc(null);
            setCertificadoA1File(null);
            setNfseSettings({
                provider: "",
                city_name: "",
                city_ibge_code: "",
                uf: "",
                environment: "homologacao",
                login: "",
                password: "",
            });
            return;
        }
        loadCartaoCnpjDoc(editingCompany.id);
        loadCertificadoA1Doc(editingCompany.id);
        loadNfseSettings(editingCompany.id);
    }, [editingCompany?.id, isDialogOpen, loadCartaoCnpjDoc, loadCertificadoA1Doc, loadNfseSettings]);

    const handleOpenCartaoCnpj = useCallback(async () => {
        if (!cartaoCnpjDoc?.storage_path) return;
        const { data, error } = await activeClient.storage.from("company-documents").createSignedUrl(cartaoCnpjDoc.storage_path, 60);
        if (error || !data?.signedUrl) {
            toast.error("Não foi possível abrir o arquivo");
            return;
        }
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }, [activeClient.storage, cartaoCnpjDoc?.storage_path]);

    const handleOpenCertificadoA1 = useCallback(async () => {
        if (!certificadoA1Doc?.storage_path) return;
        const { data, error } = await activeClient.storage.from("company-documents").createSignedUrl(certificadoA1Doc.storage_path, 60);
        if (error || !data?.signedUrl) {
            toast.error("Não foi possível abrir o arquivo");
            return;
        }
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }, [activeClient.storage, certificadoA1Doc?.storage_path]);

    const handleDeleteCartaoCnpj = useCallback(async () => {
        if (!editingCompany?.id || !cartaoCnpjDoc) return;
        const ok = window.confirm("Remover o Cartão CNPJ anexado?");
        if (!ok) return;

        setIsCartaoCnpjUploading(true);
        try {
            const { error: storageError } = await activeClient.storage
                .from("company-documents")
                .remove([cartaoCnpjDoc.storage_path]);
            if (storageError) throw storageError;

            const { error: deleteError } = await (activeClient as any)
                .from("company_documents")
                .delete()
                .eq("id", cartaoCnpjDoc.id)
                .eq("company_id", editingCompany.id);
            if (deleteError) throw deleteError;

            setCartaoCnpjDoc(null);
            toast.success("Cartão CNPJ removido");
        } catch {
            toast.error("Erro ao remover Cartão CNPJ");
        } finally {
            setIsCartaoCnpjUploading(false);
        }
    }, [activeClient, cartaoCnpjDoc, editingCompany?.id]);

    const handleDeleteCertificadoA1 = useCallback(async () => {
        if (!editingCompany?.id || !certificadoA1Doc) return;
        const ok = window.confirm("Remover o Certificado Digital A1 anexado?");
        if (!ok) return;

        setIsCertificadoA1Uploading(true);
        try {
            const { error: storageError } = await activeClient.storage
                .from("company-documents")
                .remove([certificadoA1Doc.storage_path]);
            if (storageError) throw storageError;

            const { error: deleteError } = await (activeClient as any)
                .from("company_documents")
                .delete()
                .eq("id", certificadoA1Doc.id)
                .eq("company_id", editingCompany.id);
            if (deleteError) throw deleteError;

            setCertificadoA1Doc(null);
            toast.success("Certificado A1 removido");
        } catch {
            toast.error("Erro ao remover Certificado A1");
        } finally {
            setIsCertificadoA1Uploading(false);
        }
    }, [activeClient, certificadoA1Doc, editingCompany?.id]);

    const handleUploadCartaoCnpj = useCallback(async () => {
        if (!editingCompany?.id) {
            toast.error("Salve a empresa antes de anexar documentos");
            return;
        }
        const file = cartaoCnpjFile;
        if (!file) {
            toast.error("Selecione um arquivo");
            return;
        }

        if (file.type && !cartaoCnpjAccept.split(",").includes(file.type)) {
            toast.error("Arquivo inválido. Envie PDF, PNG ou JPG.");
            return;
        }

        setIsCartaoCnpjUploading(true);
        try {
            const { data: existing, error: existingError } = await (activeClient as any)
                .from("company_documents")
                .select("id, storage_path")
                .eq("company_id", editingCompany.id)
                .eq("doc_type", "cartao_cnpj")
                .order("created_at", { ascending: false })
                .limit(1);
            if (existingError) throw existingError;

            if (Array.isArray(existing) && existing.length) {
                const prev = existing[0] as { id: string; storage_path: string };
                const { error: removePrevStorageError } = await activeClient.storage
                    .from("company-documents")
                    .remove([prev.storage_path]);
                if (removePrevStorageError) throw removePrevStorageError;

                const { error: removePrevRowError } = await (activeClient as any)
                    .from("company_documents")
                    .delete()
                    .eq("id", prev.id)
                    .eq("company_id", editingCompany.id);
                if (removePrevRowError) throw removePrevRowError;
            }

            const cleanedName = sanitizeFileName(file.name || "cartao_cnpj");
            const storagePath = `${editingCompany.id}/cartao_cnpj/${Date.now()}-${cleanedName}`;
            const { error: uploadError } = await activeClient.storage
                .from("company-documents")
                .upload(storagePath, file, { contentType: file.type || undefined, upsert: false });
            if (uploadError) throw uploadError;

            const { error: insertError } = await (activeClient as any)
                .from("company_documents")
                .insert([{
                    company_id: editingCompany.id,
                    doc_type: "cartao_cnpj",
                    file_name: file.name,
                    storage_path: storagePath,
                    mime_type: file.type || null,
                    file_size: file.size,
                    uploaded_by: user?.id || null,
                }]);
            if (insertError) throw insertError;

            setCartaoCnpjFile(null);
            await loadCartaoCnpjDoc(editingCompany.id);
            toast.success("Cartão CNPJ anexado");
        } catch {
            toast.error("Erro ao anexar Cartão CNPJ");
        } finally {
            setIsCartaoCnpjUploading(false);
        }
    }, [activeClient, cartaoCnpjAccept, cartaoCnpjFile, editingCompany?.id, loadCartaoCnpjDoc, sanitizeFileName, user?.id]);

    const handleUploadCertificadoA1 = useCallback(async () => {
        if (!editingCompany?.id) {
            toast.error("Salve a empresa antes de anexar documentos");
            return;
        }
        const file = certificadoA1File;
        if (!file) {
            toast.error("Selecione um arquivo");
            return;
        }

        const allowedExts = [".pfx", ".p12"];
        const isMimeAllowed = file.type ? certificadoA1Accept.split(",").includes(file.type) : false;
        const isExtAllowed = hasAllowedExtension(file.name, allowedExts);
        if (!isMimeAllowed && !isExtAllowed) {
            toast.error("Arquivo inválido. Envie .pfx ou .p12");
            return;
        }

        setIsCertificadoA1Uploading(true);
        try {
            const { data: existing, error: existingError } = await (activeClient as any)
                .from("company_documents")
                .select("id, storage_path")
                .eq("company_id", editingCompany.id)
                .eq("doc_type", "certificado_a1")
                .order("created_at", { ascending: false })
                .limit(1);
            if (existingError) throw existingError;

            if (Array.isArray(existing) && existing.length) {
                const prev = existing[0] as { id: string; storage_path: string };
                const { error: removePrevStorageError } = await activeClient.storage
                    .from("company-documents")
                    .remove([prev.storage_path]);
                if (removePrevStorageError) throw removePrevStorageError;

                const { error: removePrevRowError } = await (activeClient as any)
                    .from("company_documents")
                    .delete()
                    .eq("id", prev.id)
                    .eq("company_id", editingCompany.id);
                if (removePrevRowError) throw removePrevRowError;
            }

            const cleanedName = sanitizeFileName(file.name || "certificado_a1.pfx");
            const storagePath = `${editingCompany.id}/certificado_a1/${Date.now()}-${cleanedName}`;
            const { error: uploadError } = await activeClient.storage
                .from("company-documents")
                .upload(storagePath, file, { contentType: file.type || undefined, upsert: false });
            if (uploadError) throw uploadError;

            const { error: insertError } = await (activeClient as any)
                .from("company_documents")
                .insert([{
                    company_id: editingCompany.id,
                    doc_type: "certificado_a1",
                    file_name: file.name,
                    storage_path: storagePath,
                    mime_type: file.type || null,
                    file_size: file.size,
                    uploaded_by: user?.id || null,
                }]);
            if (insertError) throw insertError;

            setCertificadoA1File(null);
            await loadCertificadoA1Doc(editingCompany.id);
            toast.success("Certificado A1 anexado");
        } catch {
            toast.error("Erro ao anexar Certificado A1");
        } finally {
            setIsCertificadoA1Uploading(false);
        }
    }, [activeClient, certificadoA1Accept, certificadoA1File, editingCompany?.id, hasAllowedExtension, loadCertificadoA1Doc, sanitizeFileName, user?.id]);

    const handleSaveNfseSettings = useCallback(async () => {
        if (!formData.enable_nfse) {
            toast.error("Este perfil não habilita emissão de NFS-e");
            return;
        }

        if (!editingCompany?.id) {
            toast.error("Salve a empresa antes de configurar a NFS-e");
            return;
        }

        setIsNfseSaving(true);
        try {
            const payload = {
                company_id: editingCompany.id,
                provider: nfseSettings.provider || null,
                city_name: nfseSettings.city_name || null,
                city_ibge_code: nfseSettings.city_ibge_code || null,
                uf: nfseSettings.uf || null,
                environment: nfseSettings.environment,
                login: nfseSettings.login || null,
                password: nfseSettings.password || null,
            };

            const { error } = await (activeClient as any)
                .from("company_nfse_settings")
                .upsert(payload, { onConflict: "company_id" });
            if (error) throw error;

            toast.success("Configuração de NFS-e salva");
            await loadNfseSettings(editingCompany.id);
        } catch {
            toast.error("Erro ao salvar configuração de NFS-e");
        } finally {
            setIsNfseSaving(false);
        }
    }, [activeClient, editingCompany?.id, formData.enable_nfse, loadNfseSettings, nfseSettings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const fiscalDerived = computeProfileAndModules([
                ...(Array.isArray(cnaeOpcoes) ? cnaeOpcoes.map((o) => o.codigo) : []),
                String(formData.cnae || ""),
            ].filter(Boolean)) ?? {
                activity_profile: formData.activity_profile || "comercio",
                enable_nfse: Boolean(formData.enable_nfse),
                enable_nfe: Boolean(formData.enable_nfe),
                enable_nfce: Boolean(formData.enable_nfce),
            };

            // Unmask before saving
            const dataToSave = {
                ...formData,
                cnpj: unmask(formData.cnpj || ""),
                telefone: unmask(formData.telefone || ""),
                celular: unmask(formData.celular || ""),
                endereco_cep: unmask(formData.endereco_cep || ""),
                dados_bancarios_titular_cpf_cnpj: unmask(formData.dados_bancarios_titular_cpf_cnpj || ""),
                ...fiscalDerived,
            };

            if (editingCompany) {
                await updateCompany.mutateAsync({ id: editingCompany.id, data: dataToSave });
            } else {
                await createCompany.mutateAsync(dataToSave);
            }
            resetForm();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (company: Company) => {
        const ok = window.confirm(`Excluir a empresa "${company.razao_social}"? Esta ação não pode ser desfeita.`);
        if (!ok) return;
        try {
            await deleteCompany.mutateAsync(company.id);
            if (user?.id) {
                await logDeletion(activeClient, {
                    userId: user.id,
                    companyId: company.id,
                    entity: "companies",
                    entityId: company.id,
                    payload: { razao_social: company.razao_social },
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCEPBlur = async () => {
        const cleanCEP = unmask(formData.endereco_cep || "");
        if (cleanCEP.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
                const data = await response.json();
                if (data.erro) {
                    toast.error("CEP não encontrado");
                    return;
                }
                setFormData(prev => ({
                    ...prev,
                    endereco_logradouro: data.logradouro,
                    endereco_bairro: data.bairro,
                    endereco_cidade: data.localidade,
                    endereco_estado: data.uf,
                }));
            } catch (error) {
                toast.error("Erro ao buscar CEP");
                console.error("Erro ao buscar CEP:", error);
            }
        }
    };

    const handleSearchAddress = () => {
        const parts = [
            formData.endereco_logradouro,
            formData.endereco_numero,
            formData.endereco_bairro,
            formData.endereco_cidade,
            formData.endereco_estado,
            formData.endereco_cep,
        ]
            .map((v) => (typeof v === "string" ? v.trim() : ""))
            .filter(Boolean);

        if (parts.length === 0) {
            toast.error("Preencha algum dado de endereço para pesquisar.");
            return;
        }

        const query = encodeURIComponent(parts.join(" "));
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
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
                                            <button
                                                type="button"
                                                className="text-[10px] text-green-600 flex items-center gap-1 font-semibold uppercase hover:underline disabled:opacity-60"
                                                onClick={handleLookupCnpj}
                                                disabled={isCnpjLookupLoading}
                                            >
                                                <Globe className="w-3 h-3" /> {isCnpjLookupLoading ? "Consultando..." : "Consultar CNPJ"}
                                            </button>
                                        </div>
                                        <Input
                                            value={formData.cnpj || ""}
                                            onChange={(e) => {
                                                const next = maskCNPJ(e.target.value);
                                                const prevDoc = unmask(formData.cnpj || "");
                                                const nextDoc = unmask(next);

                                                if (prevDoc !== nextDoc) {
                                                    setCnaeDescricao("");
                                                    setCnaeOpcoes([]);
                                                    setFormData({ ...formData, cnpj: next, cnae: "" });
                                                    return;
                                                }

                                                setFormData({ ...formData, cnpj: next });
                                            }}
                                            className="h-9 focus-visible:ring-green-600 border-slate-300"
                                            maxLength={18}
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
                                            onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
                                            className="h-9 focus-visible:ring-green-600 border-slate-300"
                                            maxLength={15}
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
                                        <TabsTrigger value="documentos" className="border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:text-green-700 rounded-none px-2 pb-2 text-xs font-bold uppercase tracking-wider transition-all">Documentos</TabsTrigger>
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
                                                    <Input
                                                        value={formData.cnae || ""}
                                                        onChange={(e) => {
                                                            setFormData({ ...formData, cnae: e.target.value });
                                                            if (cnaeDescricao) setCnaeDescricao("");
                                                        }}
                                                        className="h-9 border-slate-300 pr-8"
                                                    />
                                                    <Search className="w-4 h-4 text-slate-400 absolute right-2 top-2.5" />
                                                </div>
                                                {cnaeDescricao ? (
                                                    <div className="text-[11px] text-slate-500 leading-snug">
                                                        {cnaeDescricao}
                                                    </div>
                                                ) : null}
                                                {cnaeOpcoes.length > 0 ? (
                                                    <Select
                                                        value={cnaeOpcoes.some((o) => o.codigo === String(formData.cnae || "")) ? String(formData.cnae || "") : undefined}
                                                        onValueChange={(codigo) => {
                                                            const opt = cnaeOpcoes.find((o) => o.codigo === codigo);
                                                            setFormData({ ...formData, cnae: codigo });
                                                            setCnaeDescricao(opt?.descricao || "");
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-9 border-slate-300">
                                                            <SelectValue placeholder="Selecionar CNAE (principal/secundário)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {cnaeOpcoes.map((o) => (
                                                                <SelectItem key={`${o.origem}:${o.codigo}`} value={o.codigo}>
                                                                    {o.codigo} — {o.descricao} {o.origem === "principal" ? "(Principal)" : "(Secundário)"}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : null}
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                                                        Perfil: {activityProfileLabel}
                                                    </Badge>
                                                    {formData.enable_nfse ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                            NFS-e
                                                        </Badge>
                                                    ) : null}
                                                    {formData.enable_nfe ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                            NF-e
                                                        </Badge>
                                                    ) : null}
                                                    {formData.enable_nfce ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                            NFC-e
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                                <div className="pt-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={handleSuggestCategories}
                                                        disabled={!editingCompany?.id || isSavingCompany || isAnyBusy || isSuggestingCategories}
                                                        className="border-green-600 text-green-700 hover:bg-green-50 font-bold h-9"
                                                    >
                                                        {isSuggestingCategories ? "Gerando..." : "Gerar categorias sugeridas"}
                                                    </Button>
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
                                                    <Input
                                                        value={formData.endereco_cep || ""}
                                                        onChange={(e) => setFormData({ ...formData, endereco_cep: maskCEP(e.target.value) })}
                                                        onBlur={handleCEPBlur}
                                                        className="h-9 border-slate-300 pr-8"
                                                        maxLength={9}
                                                    />
                                                    <Search className="w-4 h-4 text-slate-400 absolute right-2 top-2.5" />
                                                </div>
                                            </div>
                                            <div className="col-span-1 md:col-span-2 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Logradouro</Label>
                                                    <button
                                                        type="button"
                                                        className="text-[10px] text-green-600 flex items-center gap-1 font-semibold uppercase hover:underline"
                                                        onClick={handleSearchAddress}
                                                    >
                                                        <Globe className="w-3 h-3" /> Pesquisar Endereço
                                                    </button>
                                                </div>
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
                                                    <Input
                                                        value={formData.celular || ""}
                                                        onChange={(e) => setFormData({ ...formData, celular: maskPhone(e.target.value) })}
                                                        className="h-9 border-slate-300 pr-8"
                                                        maxLength={15}
                                                    />
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
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Nome do Titular</Label>
                                                <Input value={formData.dados_bancarios_titular_nome || ""} onChange={(e) => setFormData({ ...formData, dados_bancarios_titular_nome: e.target.value })} className="h-9 border-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">CPF/CNPJ do Titular</Label>
                                                <Input
                                                    value={formData.dados_bancarios_titular_cpf_cnpj || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormData({
                                                            ...formData,
                                                            dados_bancarios_titular_cpf_cnpj: val.length > 14 ? maskCNPJ(val) : maskCPF(val)
                                                        });
                                                    }}
                                                    className="h-9 border-slate-300"
                                                    maxLength={18}
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="documentos" className="space-y-4 pt-2">
                                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-lg bg-green-50 border border-green-100">
                                                        <FileText className="h-5 w-5 text-green-600" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="font-extrabold text-slate-800">Cartão CNPJ</div>
                                                        <div className="text-xs text-slate-500">PDF, PNG ou JPG</div>
                                                        {isCartaoCnpjLoading ? (
                                                            <div className="text-xs text-slate-400">Carregando...</div>
                                                        ) : cartaoCnpjDoc ? (
                                                            <div className="text-xs text-slate-500">
                                                                <span className="font-semibold text-slate-700">{cartaoCnpjDoc.file_name}</span>
                                                                {" "}({formatBytes(cartaoCnpjDoc.file_size)})
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-slate-400">Nenhum arquivo anexado</div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={handleOpenCartaoCnpj}
                                                        disabled={!cartaoCnpjDoc || isCartaoCnpjLoading || isCartaoCnpjUploading}
                                                        className="h-9 border-slate-200"
                                                    >
                                                        Abrir
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={handleDeleteCartaoCnpj}
                                                        disabled={!cartaoCnpjDoc || isCartaoCnpjLoading || isCartaoCnpjUploading}
                                                        className="w-10 h-10 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                                                <div className="md:col-span-4 space-y-2">
                                                    <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Selecionar arquivo</Label>
                                                    <Input
                                                        type="file"
                                                        accept={cartaoCnpjAccept}
                                                        onChange={(e) => setCartaoCnpjFile(e.target.files?.[0] || null)}
                                                        disabled={!editingCompany?.id || isSavingCompany || isCartaoCnpjUploading}
                                                        className="h-10 border-slate-300"
                                                    />
                                                </div>
                                                <div className="md:col-span-2 flex items-end gap-2">
                                                    <Button
                                                        type="button"
                                                        onClick={handleUploadCartaoCnpj}
                                                        disabled={!editingCompany?.id || !cartaoCnpjFile || isSavingCompany || isCartaoCnpjUploading}
                                                        className="bg-green-600 hover:bg-green-700 font-bold h-10 flex-1"
                                                    >
                                                        {isCartaoCnpjUploading ? "Enviando..." : "Enviar"}
                                                    </Button>
                                                </div>
                                            </div>

                                            {!editingCompany?.id ? (
                                                <div className="mt-3 text-xs text-slate-500">
                                                    Salve a empresa para anexar documentos.
                                                </div>
                                            ) : null}
                                        </div>

                                        {formData.enable_nfe || formData.enable_nfce ? (
                                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 rounded-lg bg-green-50 border border-green-100">
                                                            <FileText className="h-5 w-5 text-green-600" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="font-extrabold text-slate-800">Certificado Digital A1</div>
                                                            <div className="text-xs text-slate-500">.pfx ou .p12</div>
                                                            {isCertificadoA1Loading ? (
                                                                <div className="text-xs text-slate-400">Carregando...</div>
                                                            ) : certificadoA1Doc ? (
                                                                <div className="text-xs text-slate-500">
                                                                    <span className="font-semibold text-slate-700">{certificadoA1Doc.file_name}</span>
                                                                    {" "}({formatBytes(certificadoA1Doc.file_size)})
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-slate-400">Nenhum arquivo anexado</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={handleOpenCertificadoA1}
                                                            disabled={!certificadoA1Doc || isCertificadoA1Loading || isCertificadoA1Uploading}
                                                            className="h-9 border-slate-200"
                                                        >
                                                            Abrir
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={handleDeleteCertificadoA1}
                                                            disabled={!certificadoA1Doc || isCertificadoA1Loading || isCertificadoA1Uploading}
                                                            className="w-10 h-10 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                                                    <div className="md:col-span-4 space-y-2">
                                                        <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Selecionar arquivo</Label>
                                                        <Input
                                                            type="file"
                                                            accept={certificadoA1Accept}
                                                            onChange={(e) => setCertificadoA1File(e.target.files?.[0] || null)}
                                                            disabled={!editingCompany?.id || isSavingCompany || isCertificadoA1Uploading}
                                                            className="h-10 border-slate-300"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2 flex items-end gap-2">
                                                        <Button
                                                            type="button"
                                                            onClick={handleUploadCertificadoA1}
                                                            disabled={!editingCompany?.id || !certificadoA1File || isSavingCompany || isCertificadoA1Uploading}
                                                            className="bg-green-600 hover:bg-green-700 font-bold h-10 flex-1"
                                                        >
                                                            {isCertificadoA1Uploading ? "Enviando..." : "Enviar"}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {!editingCompany?.id ? (
                                                    <div className="mt-3 text-xs text-slate-500">
                                                        Salve a empresa para anexar documentos.
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        {formData.enable_nfse ? (
                                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 rounded-lg bg-green-50 border border-green-100">
                                                            <Landmark className="h-5 w-5 text-green-600" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="font-extrabold text-slate-800">NFS-e (Prefeitura)</div>
                                                            <div className="text-xs text-slate-500">Configuração de acesso para emissão</div>
                                                            {isNfseLoading ? (
                                                                <div className="text-xs text-slate-400">Carregando...</div>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            type="button"
                                                            onClick={handleSaveNfseSettings}
                                                            disabled={!editingCompany?.id || isSavingCompany || isAnyBusy}
                                                            className="bg-green-600 hover:bg-green-700 font-bold h-9"
                                                        >
                                                            {isNfseSaving ? "Salvando..." : "Salvar"}
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Provedor / Integradora</Label>
                                                        <Input
                                                            value={nfseSettings.provider}
                                                            onChange={(e) => setNfseSettings((prev) => ({ ...prev, provider: e.target.value }))}
                                                            disabled={!editingCompany?.id || isSavingCompany || isAnyBusy}
                                                            className="h-9 border-slate-300"
                                                            placeholder="Ex: Nota Control, FocusNFe, Prefeitura"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Ambiente</Label>
                                                        <Select
                                                            value={nfseSettings.environment}
                                                            onValueChange={(v) => setNfseSettings((prev) => ({ ...prev, environment: v === "producao" ? "producao" : "homologacao" }))}
                                                            disabled={!editingCompany?.id || isSavingCompany || isAnyBusy}
                                                        >
                                                            <SelectTrigger className="h-9 border-slate-300">
                                                                <SelectValue placeholder="Selecione..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="homologacao">Homologação</SelectItem>
                                                                <SelectItem value="producao">Produção</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Município</Label>
                                                        <Input
                                                            value={nfseSettings.city_name}
                                                            onChange={(e) => setNfseSettings((prev) => ({ ...prev, city_name: e.target.value }))}
                                                            disabled={!editingCompany?.id || isSavingCompany || isAnyBusy}
                                                            className="h-9 border-slate-300"
                                                            placeholder="Ex: São Paulo"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">UF</Label>
                                                            <Input
                                                                value={nfseSettings.uf}
                                                                onChange={(e) => setNfseSettings((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                                                                disabled={!editingCompany?.id || isSavingCompany || isAnyBusy}
                                                                className="h-9 border-slate-300 uppercase"
                                                                maxLength={2}
                                                                placeholder="SP"
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Código IBGE</Label>
                                                            <Input
                                                                value={nfseSettings.city_ibge_code}
                                                                onChange={(e) => setNfseSettings((prev) => ({ ...prev, city_ibge_code: e.target.value }))}
                                                                disabled={!editingCompany?.id || isSavingCompany || isAnyBusy}
                                                                className="h-9 border-slate-300"
                                                                placeholder="Ex: 3550308"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Usuário</Label>
                                                        <Input
                                                            value={nfseSettings.login}
                                                            onChange={(e) => setNfseSettings((prev) => ({ ...prev, login: e.target.value }))}
                                                            disabled={!editingCompany?.id || isSavingCompany || isAnyBusy}
                                                            className="h-9 border-slate-300"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Senha</Label>
                                                        <Input
                                                            type="password"
                                                            value={nfseSettings.password}
                                                            onChange={(e) => setNfseSettings((prev) => ({ ...prev, password: e.target.value }))}
                                                            disabled={!editingCompany?.id || isSavingCompany || isAnyBusy}
                                                            className="h-9 border-slate-300"
                                                        />
                                                    </div>
                                                </div>

                                                {!editingCompany?.id ? (
                                                    <div className="mt-3 text-xs text-slate-500">
                                                        Salve a empresa para configurar a NFS-e.
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                                                NFS-e não está habilitada para este perfil.
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </div>

                            <div className="flex justify-end gap-3 p-6 bg-slate-50 border-t">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={resetForm}
                                    disabled={isSavingCompany || isAnyBusy}
                                    className="text-slate-500"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSavingCompany || isAnyBusy}
                                    className="bg-green-600 hover:bg-green-700 min-w-[150px] font-bold shadow-md shadow-green-200"
                                >
                                    {isSavingCompany ? "Processando..." : (editingCompany ? "Salvar Alterações" : "Concluir Cadastro")}
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
                        ) : companiesError ? (
                            <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-4">
                                <Building2 className="h-16 w-16 text-slate-100" />
                                <p className="text-lg font-medium">Não foi possível carregar as empresas.</p>
                                <Button onClick={() => window.location.reload()} variant="outline" className="border-green-600 text-green-700 hover:bg-green-50 font-bold">
                                    Tentar novamente
                                </Button>
                            </div>
                        ) : !companies || companies.length === 0 ? (
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
                                                    {company.cnpj ? maskCNPJ(company.cnpj) : "N/D"}
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
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(company)}
                                                    className="w-10 h-10 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
                                                >
                                                    <Trash2 className="h-5 w-5" />
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
