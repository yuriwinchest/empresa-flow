
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const companyId = '7109ea16-1ec9-43ed-8779-043a17626083';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

function parseNumber(value) {
    if (!value || value === '') return 0;
    const cleaned = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

function parseDate(value) {
    if (!value || value === '') return null;
    if (value.includes('-')) return value; // Already YYYY-MM-DD
    const parts = value.split('/');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return value;
}

function mapStatus(situacao) {
    const s = situacao.toLowerCase().trim();
    if (s.includes('pago') || s.includes('recebido') || s.includes('recebida')) return 'paid';
    if (s.includes('cancelado') || s.includes('cancelada')) return 'cancelled';
    if (s.includes('atrasado') || s.includes('atrasada')) return 'overdue';
    return 'pending';
}

function getCategoryType(name) {
    const incomeKeywords = ['receita', 'crédito', 'débito stone', 'pix stone', 'dinheiro', 'devolução de compra', 'adiantamento de clientes', 'reembolso', 'empréstimos bancários', 'venda de ativos', 'transferência entre contas'];
    const lowerName = name.toLowerCase();
    for (const keyword of incomeKeywords) {
        if (lowerName.includes(keyword)) return 'income';
    }
    return 'expense';
}

async function clearTable(tableName) {
    console.log(`Clearing table ${tableName}...`);
    const { error } = await supabase.from(tableName).delete().eq('company_id', companyId);
    if (error) console.error(`Error clearing ${tableName}:`, error.message);
}

async function importCategories() {
    console.log('Importing categories...');
    const filePath = path.join(__dirname, '../BECKAP/Omie_Categorias.csv');
    if (!fs.existsSync(filePath)) return new Map();
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = parseCSV(content).slice(1);
    const map = new Map();

    for (const line of lines) {
        const name = line[0]?.trim();
        if (!name) continue;
        const type = getCategoryType(name);

        const { data, error } = await supabase.from('categories').upsert({
            company_id: companyId,
            name,
            description: line[1] || null,
            type,
            is_active: true
        }, { onConflict: 'company_id, name' }).select('id').single();

        if (error) console.error(`Error category ${name}:`, error.message);
        else map.set(name.toLowerCase(), data.id);
    }
    return map;
}

async function importClientsSuppliers() {
    console.log('Importing clients and suppliers...');
    const filePath = path.join(__dirname, '../BECKAP/Omie_Clientes_Fornecedors.csv');
    if (!fs.existsSync(filePath)) return { clientMap: new Map(), supplierMap: new Map() };
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = parseCSV(content).slice(1);
    const clientMap = new Map();
    const supplierMap = new Map();

    const batch = [];
    for (const line of lines) {
        const cpfCnpj = line[1]?.trim() || null;
        const razaoSocial = line[2]?.trim();
        if (!razaoSocial) continue;

        const baseData = {
            company_id: companyId,
            razao_social: razaoSocial,
            nome_fantasia: line[3]?.trim() || razaoSocial,
            cpf_cnpj: cpfCnpj,
            telefone: line[4]?.trim() || null,
            contato_nome: line[5]?.trim() || null,
            email: line[6]?.trim() || null,
            endereco_cidade: (line[7]?.match(/^(.*?)\s*\([A-Z]{2}\)$/) || [null, line[7]])[1],
            endereco_estado: line[8]?.trim() || null,
            endereco_logradouro: line[9]?.trim() || null,
            endereco_bairro: line[10]?.trim() || null,
            endereco_cep: line[11]?.trim() || null,
            dados_bancarios_banco: line[12]?.trim() || null,
            dados_bancarios_agencia: line[13]?.trim() || null,
            dados_bancarios_conta: line[14]?.trim() || null,
            inscricao_estadual: line[15]?.trim() || null,
            inscricao_municipal: line[16]?.trim() || null,
            tipo_pessoa: cpfCnpj && cpfCnpj.includes('/') ? 'PJ' : 'PF',
            is_active: line[0]?.toLowerCase() !== 'inativo'
        };

        // We use upsert, but we need the IDs. To speed up, we'll do them individually but log success.
        const { data: c, error: ce } = await supabase.from('clients').upsert(baseData, { onConflict: 'company_id, razao_social' }).select('id').single();
        if (ce) console.error(`Error client ${razaoSocial}:`, ce.message);
        else clientMap.set(razaoSocial.toLowerCase(), c.id);

        const { data: s, error: se } = await supabase.from('suppliers').upsert(baseData, { onConflict: 'company_id, razao_social' }).select('id').single();
        if (se) console.error(`Error supplier ${razaoSocial}:`, se.message);
        else supplierMap.set(razaoSocial.toLowerCase(), s.id);
    }
    return { clientMap, supplierMap };
}

async function importDepartments() {
    console.log('Importing departments...');
    const filePath = path.join(__dirname, '../BECKAP/Omie_Departamentos.csv');
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = parseCSV(content).slice(1);
    for (const line of lines) {
        const name = line[0]?.trim();
        if (!name || name === 'Sua Empresa') continue;
        await supabase.from('departments').upsert({ company_id: companyId, name }, { onConflict: 'company_id, name' });
    }
}

async function importProducts() {
    console.log('Importing products...');
    const filePath = path.join(__dirname, '../BECKAP/Omie_Produtos.csv');
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = parseCSV(content).slice(1);
    for (const line of lines) {
        const desc = line[2]?.trim();
        if (!desc) continue;
        await supabase.from('products').upsert({
            company_id: companyId,
            code: line[1]?.trim(),
            description: desc,
            family: line[3]?.trim() || null,
            ncm: line[4]?.trim() || null,
            cest: line[5]?.trim() || null,
            ean: line[6]?.trim() || null,
            price: parseNumber(line[7]),
            type_sped: line[8]?.trim() || null,
            is_active: line[0]?.toLowerCase() === 'ativo'
        }, { onConflict: 'company_id, code' });
    }
}

async function importCRMLeads() {
    console.log('Importing CRM Leads...');
    const filePath = path.join(__dirname, '../BECKAP/Omie_CRM_Contas.csv');
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = parseCSV(content).slice(1);
    for (const line of lines) {
        const name = line[0]?.trim();
        if (!name) continue;
        await supabase.from('crm_leads').upsert({
            company_id: companyId,
            name,
            cpf_cnpj: line[1] || null,
            vertical: line[2] || null,
            seller: line[3] || null,
            reservation_validity: parseDate(line[4]),
            num_employees: line[5] || null,
            revenue_range: line[6] || null,
            address: line[7] || null,
            complement: line[8] || null,
            cep: line[9] || null,
            neighborhood: line[10] || null,
            city: line[11] || null,
            state: line[12] || null,
            country: line[13] || null,
            phone: line[14] || null,
            email: line[15] || null
        }, { onConflict: 'company_id, name' });
    }
}

async function importAccountsPayable(categoryMap, supplierMap) {
    console.log('Importing accounts payable...');
    const filePath = path.join(__dirname, '../BECKAP/Omie_Contas_Pagar.csv');
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = parseCSV(content).slice(1);

    // Clear table first as requested to guarantee completion/freshness
    await clearTable('accounts_payable');

    const dataToInsert = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length < 10) continue;
        const amount = parseNumber(line[8]);
        const dueDate = parseDate(line[20] || line[6]);
        if (!dueDate || amount === 0) continue;

        const supplierId = line[5] ? supplierMap.get(line[5].toLowerCase()) : null;
        const categoryId = line[15] ? categoryMap.get(line[15].toLowerCase()) : null;
        const status = mapStatus(line[0]);
        const docNum = line[2] || '';
        const description = `Doc: ${docNum} | Parcela: ${line[3] || ''} - ${line[5] || 'Sem fornecedor'}`.trim();

        dataToInsert.push({
            company_id: companyId,
            description,
            amount,
            due_date: dueDate,
            payment_date: status === 'paid' ? parseDate(line[7]) : null,
            status,
            supplier_id: supplierId,
            category_id: categoryId,
            payment_method: line[1]?.toLowerCase(),
            observations: line[23]
        });

        // Insert in small batches to avoid timeouts
        if (dataToInsert.length >= 100) {
            const { error } = await supabase.from('accounts_payable').insert(dataToInsert);
            if (error) console.error('Error inserting payable batch:', error.message);
            dataToInsert.length = 0;
        }
    }
    if (dataToInsert.length > 0) {
        const { error } = await supabase.from('accounts_payable').insert(dataToInsert);
        if (error) console.error('Error inserting final payable batch:', error.message);
    }
    const { count } = await supabase.from('accounts_payable').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    console.log(`Accounts payable: ${count} records in database (CSV lines: ${lines.length}).`);
}

async function importAccountsReceivable(categoryMap, clientMap) {
    console.log('Importing accounts receivable...');
    const filePath = path.join(__dirname, '../BECKAP/Omie_Contas_Receber.csv');
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = parseCSV(content).slice(1);

    // Clear table first as requested to guarantee completion/freshness
    await clearTable('accounts_receivable');

    const dataToInsert = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length < 10) continue;
        const amount = parseNumber(line[8]);
        const dueDate = parseDate(line[21] || line[6]);
        if (!dueDate || amount === 0) continue;

        const clientId = line[5] ? clientMap.get(line[5].toLowerCase()) : null;
        const categoryId = line[15] ? categoryMap.get(line[15].toLowerCase()) : null;
        const status = mapStatus(line[0]);
        const docNum = line[2] || '';
        const description = `Doc: ${docNum} | Parcela: ${line[3] || ''} - ${line[5] || 'Sem cliente'}`.trim();

        dataToInsert.push({
            company_id: companyId,
            description,
            amount,
            due_date: dueDate,
            receive_date: status === 'paid' ? parseDate(line[7]) : null,
            status,
            client_id: clientId,
            category_id: categoryId,
            payment_method: line[1]?.toLowerCase(),
            observations: line[24]
        });

        if (dataToInsert.length >= 100) {
            const { error } = await supabase.from('accounts_receivable').insert(dataToInsert);
            if (error) console.error('Error inserting receivable batch:', error.message);
            dataToInsert.length = 0;
        }
    }
    if (dataToInsert.length > 0) {
        const { error } = await supabase.from('accounts_receivable').insert(dataToInsert);
        if (error) console.error('Error inserting final receivable batch:', error.message);
    }
    const { count } = await supabase.from('accounts_receivable').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    console.log(`Accounts receivable: ${count} records in database (CSV lines: ${lines.length}).`);
}

async function run() {
    try {
        console.log('--- STARTING CONSOLIDATED IMPORT ---');
        const categoryMap = await importCategories();
        const { clientMap, supplierMap } = await importClientsSuppliers();
        await importDepartments();
        await importProducts();
        await importCRMLeads();
        await importAccountsPayable(categoryMap, supplierMap);
        await importAccountsReceivable(categoryMap, clientMap);
        console.log('--- ALL DONE ---');
    } catch (e) {
        console.error('Fatal error:', e);
    }
}

run();
