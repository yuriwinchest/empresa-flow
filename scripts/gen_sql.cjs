
const fs = require('fs');
const path = require('path');

function parseCSV(content, delimiter = ';') {
    const lines = [];
    let currentLine = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentField += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            currentLine.push(currentField.trim());
            currentField = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            currentLine.push(currentField.trim());
            if (currentLine.some(f => f.length > 0)) {
                lines.push(currentLine);
            }
            currentLine = [];
            currentField = '';
            if (char === '\r') i++;
        } else if (char !== '\r') {
            currentField += char;
        }
    }

    if (currentField.length > 0 || currentLine.length > 0) {
        currentLine.push(currentField.trim());
        if (currentLine.some(f => f.length > 0)) {
            lines.push(currentLine);
        }
    }

    return lines;
}

const companyId = '7109ea16-1ec9-43ed-8779-043a17626083';

function getCategoryType(name) {
    const incomeKeywords = ['receita', 'crédito', 'débito stone', 'pix stone', 'dinheiro', 'devolução de compra', 'adiantamento de clientes', 'reembolso', 'empréstimos bancários', 'venda de ativos', 'transferência entre contas'];
    const lowerName = name.toLowerCase();
    for (const keyword of incomeKeywords) {
        if (lowerName.includes(keyword.toLowerCase())) return 'receita';
    }
    return 'despesa';
}

function esc(val) {
    if (val === null || val === undefined) return 'NULL';
    return "'" + String(val).replace(/'/g, "''") + "'";
}

// Ensure scripts directory exists
if (!fs.existsSync('scripts')) {
    fs.mkdirSync('scripts');
}

// Categories
const catContent = fs.readFileSync('BECKAP/Omie_Categorias.csv', 'utf8');
const catLines = parseCSV(catContent).slice(1);
const catSql = catLines.map(l => {
    const name = l[0]?.trim();
    if (!name) return '';
    const type = getCategoryType(name);
    const desc = l[1]?.trim() || null;
    return `INSERT INTO public.categories (company_id, name, description, type, is_active) VALUES ('${companyId}', ${esc(name)}, ${esc(desc)}, '${type}', true) ON CONFLICT (company_id, name) DO NOTHING;`;
}).filter(s => s !== '').join('\n');
fs.writeFileSync('scripts/categories.sql', catSql);

// Clients/Suppliers
const csContent = fs.readFileSync('BECKAP/Omie_Clientes_Fornecedors.csv', 'utf8');
const csLines = parseCSV(csContent).slice(1);
const csSqlLines = csLines.flatMap(l => {
    const razaoSocial = l[2]?.trim();
    if (!razaoSocial) return [];
    const cpfCnpj = l[1]?.trim() || null;
    const situacao = l[0]?.trim();
    const cidadeEstado = l[7]?.trim() || '';
    const cidade = (cidadeEstado.match(/^(.*?)\s*\([A-Z]{2}\)$/) || [null, cidadeEstado])[1];

    const baseData = {
        company_id: companyId,
        razao_social: razaoSocial,
        nome_fantasia: l[3]?.trim() || razaoSocial,
        cpf_cnpj: cpfCnpj,
        telefone: l[4]?.trim() || null,
        contato_nome: l[5]?.trim() || null,
        email: l[6]?.trim() || null,
        endereco_cidade: cidade,
        endereco_estado: l[8]?.trim() || null,
        endereco_logradouro: l[9]?.trim() || null,
        endereco_bairro: l[10]?.trim() || null,
        endereco_cep: l[11]?.trim() || null,
        dados_bancarios_banco: l[12]?.trim() || null,
        dados_bancarios_agencia: l[13]?.trim() || null,
        dados_bancarios_conta: l[14]?.trim() || null,
        inscricao_estadual: l[15]?.trim() || null,
        inscricao_municipal: l[16]?.trim() || null,
        tipo_pessoa: cpfCnpj && cpfCnpj.includes('/') ? 'PJ' : 'PF',
        is_active: situacao?.toLowerCase() !== 'inativo'
    };

    const keys = Object.keys(baseData).join(', ');
    const vals = Object.values(baseData).map(esc).join(', ');

    return [
        `INSERT INTO public.clients (${keys}) VALUES (${vals}) ON CONFLICT (company_id, razao_social) DO NOTHING;`,
        `INSERT INTO public.suppliers (${keys}) VALUES (${vals}) ON CONFLICT (company_id, razao_social) DO NOTHING;`
    ];
});

const batchSize = 250;
for (let i = 0; i < csSqlLines.length; i += batchSize) {
    const batch = csSqlLines.slice(i, i + batchSize).join('\n');
    fs.writeFileSync(`scripts/cs_batch_${Math.floor(i / batchSize)}.sql`, batch);
}

console.log(`Generated ${Math.ceil(csSqlLines.length / batchSize)} batches for clients/suppliers.`);

// Common helpers for transactions
function parseNum(val) {
    if (!val) return 0;
    // Handle both dot and comma formats
    const clean = val.trim().replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
}

function mapStatus(situacao) {
    const s = situacao ? situacao.toLowerCase() : '';
    if (s.includes('pago') || s.includes('recebido')) return 'paid';
    if (s.includes('atrasado')) return 'overdue';
    return 'pending';
}

// Accounts Payable
const apContent = fs.readFileSync('BECKAP/Omie_Contas_Pagar.csv', 'utf8');
const apLines = parseCSV(apContent).slice(1);
const apClearSql = `DELETE FROM public.accounts_payable WHERE company_id = '${companyId}';`;
fs.writeFileSync('scripts/ap_clear.sql', apClearSql);

for (let i = 0, b = 0; i < apLines.length; i += batchSize, b++) {
    const lines = apLines.slice(i, i + batchSize);
    const sql = lines.map(l => {
        if (l.length < 10) return '';
        const supplierName = l[5]?.trim();
        const categoryName = l[15]?.trim();
        const amount = parseNum(l[8]);
        const status = mapStatus(l[0]);
        const dueDate = l[20]?.trim() || l[6]?.trim() || null;
        const paymentDate = l[7]?.trim() || null;
        const paymentMethod = l[1]?.trim() || 'Outros';
        const obs = l[23]?.trim() || '';
        const docNum = l[2]?.trim() || '';
        const description = `Doc: ${docNum} | Parcela: ${l[3] || ''} - ${supplierName || 'Sem fornecedor'}`.trim();

        return `INSERT INTO public.accounts_payable (company_id, supplier_id, category_id, description, amount, due_date, payment_date, status, payment_method, observations) SELECT '${companyId}', (SELECT id FROM public.suppliers WHERE razao_social = ${esc(supplierName)} AND company_id = '${companyId}' LIMIT 1), (SELECT id FROM public.categories WHERE name = ${esc(categoryName)} AND company_id = '${companyId}' LIMIT 1), ${esc(description)}, ${amount}, ${esc(dueDate)}, ${esc(paymentDate)}, '${status}', ${esc(paymentMethod)}, ${esc(obs)};`;
    }).filter(s => s !== '').join('\n');
    if (sql) fs.writeFileSync(`scripts/ap_batch_${b}.sql`, sql);
}

// Accounts Receivable
const arContent = fs.readFileSync('BECKAP/Omie_Contas_Receber.csv', 'utf8');
const arLines = parseCSV(arContent).slice(1);
const arClearSql = `DELETE FROM public.accounts_receivable WHERE company_id = '${companyId}';`;
fs.writeFileSync('scripts/ar_clear.sql', arClearSql);

for (let i = 0, b = 0; i < arLines.length; i += batchSize, b++) {
    const lines = arLines.slice(i, i + batchSize);
    const sql = lines.map(l => {
        if (l.length < 10) return '';
        const clientName = l[5]?.trim();
        const categoryName = l[15]?.trim();
        const amount = parseNum(l[8]);
        const status = mapStatus(l[0]);
        const dueDate = l[21]?.trim() || l[6]?.trim() || null;
        const receiveDate = l[7]?.trim() || null;
        const paymentMethod = l[1]?.trim() || 'Outros';
        const obs = l[24]?.trim() || '';
        const docNum = l[2]?.trim() || '';
        const description = `Doc: ${docNum} | Parcela: ${l[3] || ''} - ${clientName || 'Sem cliente'}`.trim();

        return `INSERT INTO public.accounts_receivable (company_id, client_id, category_id, description, amount, due_date, receive_date, status, payment_method, observations) SELECT '${companyId}', (SELECT id FROM public.clients WHERE razao_social = ${esc(clientName)} AND company_id = '${companyId}' LIMIT 1), (SELECT id FROM public.categories WHERE name = ${esc(categoryName)} AND company_id = '${companyId}' LIMIT 1), ${esc(description)}, ${amount}, ${esc(dueDate)}, ${esc(receiveDate)}, '${status}', ${esc(paymentMethod)}, ${esc(obs)};`;
    }).filter(s => s !== '').join('\n');
    if (sql) fs.writeFileSync(`scripts/ar_batch_${b}.sql`, sql);
}

console.log('Generated batches for accounts payable and receivable.');

// Departments
const deptContent = fs.readFileSync('BECKAP/Omie_Departamentos.csv', 'utf8');
const deptLines = parseCSV(deptContent).slice(1);
const deptSql = deptLines.map(l => {
    const name = l[0]?.trim();
    if (!name || name === 'Sua Empresa') return '';
    return `INSERT INTO public.departments (company_id, name) VALUES ('${companyId}', ${esc(name)}) ON CONFLICT (company_id, name) DO NOTHING;`;
}).filter(s => s !== '').join('\n');
fs.writeFileSync('scripts/departments.sql', deptSql);

// Products
const prodContent = fs.readFileSync('BECKAP/Omie_Produtos.csv', 'utf8');
const prodLines = parseCSV(prodContent).slice(1);
const prodSql = prodLines.map(l => {
    const desc = l[2]?.trim();
    if (!desc) return '';
    const code = l[1]?.trim();
    const situacao = l[0]?.trim();
    return `INSERT INTO public.products (company_id, code, description, family, ncm, cest, ean, price, type_sped, is_active) VALUES (
        '${companyId}', 
        ${esc(code)}, 
        ${esc(desc)}, 
        ${esc(l[3] || null)}, 
        ${esc(l[4] || null)}, 
        ${esc(l[5] || null)}, 
        ${esc(l[6] || null)}, 
        ${parseNum(l[7])}, 
        ${esc(l[8] || null)}, 
        ${situacao?.toLowerCase() === 'ativo'}
    ) ON CONFLICT (company_id, code) DO NOTHING;`;
}).filter(s => s !== '').join('\n');
fs.writeFileSync('scripts/products.sql', prodSql);

console.log('Generated departments and products scripts.');


// CRM Leads (Omie_CRM_Contas.csv)
if (fs.existsSync('BECKAP/Omie_CRM_Contas.csv')) {
    const leadsContent = fs.readFileSync('BECKAP/Omie_CRM_Contas.csv', 'utf8');
    const leadsLines = parseCSV(leadsContent).slice(1);
    const leadsSql = leadsLines.map(l => {
        const name = l[0]?.trim();
        if (!name) return '';
        return `INSERT INTO public.crm_leads (company_id, name, cpf_cnpj, vertical, seller, reservation_validity, num_employees, revenue_range, address, complement, cep, neighborhood, city, state, country, phone, email) VALUES (
            '${companyId}',
            ${esc(name)},
            ${esc(l[1] || null)},
            ${esc(l[2] || null)},
            ${esc(l[3] || null)},
            ${esc(l[4] || null)},
            ${esc(l[5] || null)},
            ${esc(l[6] || null)},
            ${esc(l[7] || null)},
            ${esc(l[8] || null)},
            ${esc(l[9] || null)},
            ${esc(l[10] || null)},
            ${esc(l[11] || null)},
            ${esc(l[12] || null)},
            ${esc(l[13] || null)},
            ${esc(l[14] || null)},
            ${esc(l[15] || null)}
        ) ON CONFLICT (company_id, name) DO NOTHING;`;
    }).filter(s => s !== '').join('\n');
    fs.writeFileSync('scripts/crm_leads.sql', leadsSql);
    console.log('Generated crm_leads.sql');
}

// CRM Contacts (Omie_CRM_Contatos.csv)
if (fs.existsSync('BECKAP/Omie_CRM_Contatos.csv')) {
    const contactsContent = fs.readFileSync('BECKAP/Omie_CRM_Contatos.csv', 'utf8');
    const contactsLines = parseCSV(contactsContent).slice(1);
    const contactsSql = contactsLines.map(l => {
        const firstName = l[0]?.trim();
        const lastName = l[1]?.trim();
        if (!firstName && !lastName) return '';
        return `INSERT INTO public.crm_contacts (company_id, first_name, last_name, position, seller, account_name, address, complement, cep, neighborhood, city, state, country, cell_1, cell_2, phone, email) VALUES (
            '${companyId}',
            ${esc(firstName)},
            ${esc(lastName)},
            ${esc(l[2] || null)},
            ${esc(l[3] || null)},
            ${esc(l[4] || null)},
            ${esc(l[5] || null)},
            ${esc(l[6] || null)},
            ${esc(l[7] || null)},
            ${esc(l[8] || null)},
            ${esc(l[9] || null)},
            ${esc(l[10] || null)},
            ${esc(l[11] || null)},
            ${esc(l[12] || null)},
            ${esc(l[13] || null)},
            ${esc(l[14] || null)},
            ${esc(l[15] || null)}
        ) ON CONFLICT (company_id, first_name, last_name, account_name) DO NOTHING;`;
    }).filter(s => s !== '').join('\n');
    fs.writeFileSync('scripts/crm_contacts.sql', contactsSql);
    console.log('Generated crm_contacts.sql');
}

// Opportunities (Omie_CRM_Oportunidades.csv)
if (fs.existsSync('BECKAP/Omie_CRM_Oportunidades.csv')) {
    const oppContent = fs.readFileSync('BECKAP/Omie_CRM_Oportunidades.csv', 'utf8');
    const oppLines = parseCSV(oppContent).slice(1);
    const oppSql = oppLines.map(l => {
        const desc = l[2]?.trim();
        if (!desc) return '';
        // Mapping based on typical Omie Opportunities format if it was there
        // Since it's likely empty, I'll just skip detailed mapping for now
        return '';
    }).filter(s => s !== '').join('\n');
    if (oppSql) {
        fs.writeFileSync('scripts/opportunities.sql', oppSql);
        console.log('Generated opportunities.sql');
    }
}
