
/**
 * Serviço de Integração para Módulo de Clientes.
 * Responsável por chamadas externas (APIs Governamentais/Terceiros).
 */

export interface ViaCepResponse {
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
    erro?: boolean;
}

export interface CnpjResponse {
    razao_social: string;
    nome_fantasia: string;
    email: string;
    telefone: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    cnae_fiscal?: number;
    cnae_fiscal_descricao?: string;
    cnaes_secundarios?: Array<{ codigo: number; descricao: string }>;
    opcao_pelo_simples?: boolean;
}

/**
 * Busca dados de endereço via API pública (ViaCEP).
 * @param cleanCep CEP apenas com números (8 dígitos)
 */
export async function fetchAddressByCep(cleanCep: string): Promise<ViaCepResponse> {
    if (cleanCep.length !== 8) throw new Error("CEP inválido");

    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!response.ok) throw new Error("Erro na conexão com ViaCEP");

    const data = await response.json();
    if (data.erro) throw new Error("CEP não encontrado");

    return data;
}

/**
 * Busca dados cadastrais de PJ via API pública (BrasilAPI).
 * @param cleanCnpj CNPJ apenas com números
 */
export async function fetchCompanyByCnpj(cleanCnpj: string): Promise<CnpjResponse> {
    if (cleanCnpj.length !== 14) throw new Error("CNPJ inválido");

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    if (!response.ok) throw new Error("CNPJ não encontrado ou serviço indisponível");

    return response.json();
}
