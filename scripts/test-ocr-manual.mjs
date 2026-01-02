
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

// Configurar o worker simulado para Node (não precisa de arquivo externo no legacy)
// Mas as vezes precisa setar workerSrc para null ou algo fake no Node puro.
// No modo legacy/node ele roda na main thread muitas vezes.

async function extractTextFromPDF(path) {
    const dataBuffer = new Uint8Array(fs.readFileSync(path));
    const loadingTask = pdfjsLib.getDocument({
        data: dataBuffer,
        // Desabilitar worker para Node puro se necessário
        disableFontFace: true,
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + ' ';
    }
    return fullText;
}

function parseCNPJData(text) {
    const data = {};
    const normalized = text.replace(/\s+/g, ' ').toUpperCase();

    const cnpjMatch = normalized.match(/NÚMERO DE INSCRIÇÃO\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    if (cnpjMatch) data.cnpj = cnpjMatch[1];

    const razaoMatch = normalized.match(/NOME EMPRESARIAL\s+(.*?)\s+TÍTULO DO ESTABELECIMENTO/);
    if (razaoMatch) data.razao_social = razaoMatch[1].trim();

    const fantasiaMatch = normalized.match(/TÍTULO DO ESTABELECIMENTO \(NOME DE FANTASIA\)\s+(.*?)\s+PORTE/);
    if (fantasiaMatch && fantasiaMatch[1] !== '********') {
        data.nome_fantasia = fantasiaMatch[1].trim();
    }

    const logradouroMatch = normalized.match(/LOGRADOURO\s+(.*?)\s+NÚMERO/);
    if (logradouroMatch) data.logradouro = logradouroMatch[1].trim();

    const numeroMatch = normalized.match(/NÚMERO\s+(.*?)\s+COMPLEMENTO/);
    if (numeroMatch) data.numero = numeroMatch[1].trim();

    const bairroMatch = normalized.match(/BAIRRO\/DISTRITO\s+(.*?)\s+MUNICÍPIO/);
    if (bairroMatch) data.bairro = bairroMatch[1].trim();

    const municipioMatch = normalized.match(/MUNICÍPIO\s+(.*?)\s+UF/);
    if (municipioMatch) data.municipio = municipioMatch[1].trim();

    const ufMatch = normalized.match(/UF\s+(\w{2})/);
    if (ufMatch) data.uf = ufMatch[1];

    const cepMatch = normalized.match(/CEP\s+(\d{2}\.\d{3}-\d{3})/);
    if (cepMatch) data.cep = cepMatch[1];

    return data;
}

(async () => {
    try {
        const filePath = "d:\\TATITA\\empresa-flow\\BECKAP\\CNPJ DRIMO.PDF";
        console.log(`Lendo arquivo: ${filePath}`);

        const text = await extractTextFromPDF(filePath);
        console.log("\n--- Texto Extraído (Raw) ---");
        console.log(text.substring(0, 500) + "..."); // Mostrar início

        console.log("\n--- Dados Parseados ---");
        const data = parseCNPJData(text);
        console.log(JSON.stringify(data, null, 2));

        if (data.cnpj && data.razao_social) {
            console.log("\n✅ SUCESSO: CNPJ e Razão Social identificados.");
        } else {
            console.log("\n❌ FALHA: Não foi possível identificar dados principais.");
        }

    } catch (error) {
        console.error("Erro fatal:", error);
    }
})();
