export interface Company {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string | null;
    email: string | null;
    telefone: string | null;
    endereco_cep: string | null;
    endereco_logradouro: string | null;
    endereco_numero: string | null;
    endereco_bairro: string | null;
    endereco_cidade: string | null;
    endereco_estado: string | null;
    is_active: boolean;
}

export type CompanyFormData = Omit<Company, 'id' | 'is_active'>;
