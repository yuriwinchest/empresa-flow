import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSV_PATH = String.raw`d:\TATITA\empresa-flow\BECKAP\Omie_Clientes_Fornecedors.csv`;
const OUTPUT_PATH = String.raw`d:\TATITA\empresa-flow\src\data\companies_import.json`;

// Ensure output dir
const outputDir = dirname(OUTPUT_PATH);
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

try {
    const content = readFileSync(CSV_PATH, 'utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

    // Headers: "Situação";"CNPJ ou CPF";...
    const headers = lines[0].split(';').map(h => h.replace(/^"|"$/g, '').trim());

    function parseLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ';' && !inQuotes) {
                result.push(current.replace(/^"|"$/g, '').trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.replace(/^"|"$/g, '').trim());
        return result;
    }

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        if (values.length < 2) continue;

        const entry = {};
        headers.forEach((h, idx) => {
            if (values[idx] !== undefined) {
                entry[h] = values[idx];
            }
        });

        const dbEntry = {
            razao_social: entry['Razão Social'] || entry['Nome Fantasia'] || 'Unknown',
            nome_fantasia: entry['Nome Fantasia'] || entry['Razão Social'],
            cnpj: entry['CNPJ ou CPF'],
            is_active: entry['Situação'] === 'Ativo',
            email: entry['E-mail'],
            telefone: entry['Telefone'],
            endereco_logradouro: entry['Endereço'],
            endereco_cidade: entry['Cidade'],
            endereco_estado: entry['Estado'],
            endereco_cep: entry['CEP'],
            endereco_bairro: entry['Bairro'],
            inscricao_estadual: entry['Inscrição Estadual'],
            inscricao_municipal: entry['Inscrição Municipal'],
        };

        if (dbEntry.razao_social && dbEntry.razao_social !== 'Unknown') {
            data.push(dbEntry);
        }
    }

    writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
    console.log(`Successfully converted ${data.length} records to ${OUTPUT_PATH}`);

} catch (error) {
    console.error("Error converting CSV:", error);
    process.exit(1);
}
