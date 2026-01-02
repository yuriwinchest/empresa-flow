
// Polyfill para Promise.withResolvers (Requisito do PDF.js v4+)
// @ts-ignore
if (typeof Promise.withResolvers === 'undefined') {
    // @ts-ignore
    Promise.withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

import * as pdfjsLib from 'pdfjs-dist';

// Usando worker estático copiado para /public/pdf.worker.min.js
// Isso evita problemas de hash/MIME type no deploy do Vite e servidores que não suportam .mjs
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface CNCJData {
    endereco: any;
    contato: any;
    cnpj?: string;
    razao_social?: string;
    nome_fantasia?: string;
    porte?: string;
    natureza_juridica?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
    cep?: string;
    email?: string;
    telefone?: string;
    situacao_cadastral?: string;
    data_abertura?: string;
    cnae_principal?: string;
}

export class CNPJParserService {
    async parse(file: File): Promise<CNCJData> {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';

            // Extrair texto de todas as páginas
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');
                fullText += pageText + ' ';
            }

            console.log('Texto extraído do PDF:', fullText); // Debug

            return this.userIdCardData(fullText);
        } catch (error) {
            console.error('Erro ao ler PDF:', error);
            throw new Error('Falha ao processar o arquivo PDF. Certifique-se que é um arquivo válido.');
        }
    }

    private userIdCardData(text: string): CNCJData {
        const data: CNCJData = {};

        // Normaliza o texto para facilitar regex (remove múltiplos espaços)
        const normalized = text.replace(/\s+/g, ' ').toUpperCase();

        // 1. Número de Inscrição (CNPJ)
        // Padrão: NÚMERO DE INSCRIÇÃO XX.XXX.XXX/XXXX-XX MATRIZ
        const cnpjMatch = normalized.match(/NÚMERO DE INSCRIÇÃO\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
        if (cnpjMatch) data.cnpj = cnpjMatch[1];

        // 2. Data de Abertura
        const aberturaMatch = normalized.match(/DATA DE ABERTURA\s+(\d{2}\/\d{2}\/\d{4})/);
        if (aberturaMatch) data.data_abertura = aberturaMatch[1];

        // 3. Nome Empresarial (Razão Social)
        // Geralmente aparece após "NOME EMPRESARIAL" e antes de "TÍTULO DO ESTABELECIMENTO"
        const razaoMatch = normalized.match(/NOME EMPRESARIAL\s+(.*?)\s+TÍTULO DO ESTABELECIMENTO/);
        if (razaoMatch) data.razao_social = razaoMatch[1].trim();

        // 4. Título do Estabelecimento (Fantasia)
        // Entre "TÍTULO DO ESTABELECIMENTO (NOME DE FANTASIA)" e "PORTE" ou "CÓDIGO E DESCRIÇÃO"
        const fantasiaMatch = normalized.match(/TÍTULO DO ESTABELECIMENTO \(NOME DE FANTASIA\)\s+(.*?)\s+PORTE/);
        if (fantasiaMatch && fantasiaMatch[1] !== '********') {
            data.nome_fantasia = fantasiaMatch[1].trim();
        }

        // 5. Porte
        const porteMatch = normalized.match(/PORTE\s+(.*?)\s+CÓDIGO E DESCRIÇÃO/);
        if (porteMatch) data.porte = porteMatch[1].trim();

        // 6. CNAE Principal
        // CÓDIGO E DESCRIÇÃO DA ATIVIDADE ECONÔMICA PRINCIPAL 00.00-0-00 - Descrição
        const cnaeMatch = normalized.match(/ATIVIDADE ECONÔMICA PRINCIPAL\s+(\d{2}\.\d{2}-\d-\d{2})/);
        if (cnaeMatch) data.cnae_principal = cnaeMatch[1].replace(/[^\d]/g, ''); // Apenas números

        // 7. Natureza Jurídica
        const natJuridicaMatch = normalized.match(/CÓDIGO E DESCRIÇÃO DA NATUREZA JURÍDICA\s+\d+-\d\s+-\s+(.*?)\s+LOGRADOURO/);
        if (natJuridicaMatch) data.natureza_juridica = natJuridicaMatch[1].trim();

        // 8. Endereço
        // LOGRADOURO X NÚMERO Y COMPLEMENTO Z CEP W BAIRRO B MUNICÍPIO M UF U
        const logradouroMatch = normalized.match(/LOGRADOURO\s+(.*?)\s+NÚMERO/);
        if (logradouroMatch) data.logradouro = logradouroMatch[1].trim();

        const numeroMatch = normalized.match(/NÚMERO\s+(.*?)\s+COMPLEMENTO/);
        if (numeroMatch) data.numero = numeroMatch[1].trim();

        const complementoMatch = normalized.match(/COMPLEMENTO\s+(.*?)\s+CEP/);
        if (complementoMatch) data.complemento = complementoMatch[1].trim();

        const cepMatch = normalized.match(/CEP\s+(\d{2}\.\d{3}-\d{3})/);
        if (cepMatch) data.cep = cepMatch[1];

        const bairroMatch = normalized.match(/BAIRRO\/DISTRITO\s+(.*?)\s+MUNICÍPIO/);
        if (bairroMatch) data.bairro = bairroMatch[1].trim();

        const municipioMatch = normalized.match(/MUNICÍPIO\s+(.*?)\s+UF/);
        if (municipioMatch) data.municipio = municipioMatch[1].trim();

        const ufMatch = normalized.match(/UF\s+(\w{2})/);
        if (ufMatch) data.uf = ufMatch[1];

        // 9. Contato
        const emailMatch = normalized.match(/ENDEREÇO ELETRÔNICO\s+(.*?)\s+TELEFONE/);
        if (emailMatch) data.email = emailMatch[1].trim().toLowerCase();

        const telefoneMatch = normalized.match(/TELEFONE\s+(.*?)\s+ENTE FEDERATIVO/);
        if (telefoneMatch) data.telefone = telefoneMatch[1].trim();

        // 10. Situação Cadastral
        const situacaoMatch = normalized.match(/SITUAÇÃO CADASTRAL\s+(.*?)\s+DATA DA SITUAÇÃO/);
        if (situacaoMatch) data.situacao_cadastral = situacaoMatch[1].trim();

        return data;
    }
}
