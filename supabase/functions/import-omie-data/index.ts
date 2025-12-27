import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CategoryRow {
  descricao: string;
  observacoes: string;
}

interface ClientSupplierRow {
  situacao: string;
  cpf_cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  telefone: string;
  contato: string;
  email: string;
  cidade: string;
  estado: string;
  endereco: string;
  bairro: string;
  cep: string;
  banco: string;
  agencia: string;
  conta_corrente: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
}

interface AccountsPayableRow {
  situacao: string;
  tipo_documento: string;
  numero_documento: string;
  parcela: string;
  nota_fiscal: string;
  nome_fornecedor: string;
  previsao_pagamento: string;
  ultimo_pagamento: string;
  valor_conta: string;
  valor_liquido: string;
  impostos_retidos: string;
  desconto: string;
  juros_multa: string;
  valor_pago: string;
  valor_pagar: string;
  categoria: string;
  operacao: string;
  vendedor: string;
  projeto: string;
  conta_corrente: string;
  data_vencimento: string;
  data_emissao: string;
  data_registro: string;
  observacao: string;
}

interface AccountsReceivableRow {
  situacao: string;
  tipo_documento: string;
  numero_documento: string;
  parcela: string;
  nota_fiscal: string;
  nome_cliente: string;
  previsao_recebimento: string;
  ultimo_recebimento: string;
  valor_conta: string;
  valor_liquido: string;
  impostos_retidos: string;
  desconto: string;
  juros_multa: string;
  valor_recebido: string;
  valor_receber: string;
  categoria: string;
  operacao: string;
  vendedor: string;
  projeto: string;
  conta_corrente: string;
  nsu: string;
  data_vencimento: string;
  data_emissao: string;
  data_registro: string;
  observacao: string;
}

function parseCSV(content: string, delimiter: string = ';'): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
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

function parseNumber(value: string): number {
  if (!value || value === '') return 0;
  // Remove spaces and handle Brazilian number format (comma as decimal separator)
  const cleaned = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function mapStatus(situacao: string): 'pending' | 'paid' | 'cancelled' | 'overdue' {
  const s = situacao.toLowerCase().trim();
  if (s === 'pago' || s === 'recebido') return 'paid';
  if (s === 'cancelado' || s === 'cancelada') return 'cancelled';
  if (s === 'atrasado' || s === 'atrasada') return 'overdue';
  return 'pending';
}

function getCategoryType(name: string): 'income' | 'expense' {
  const incomeKeywords = ['receita', 'crédito', 'débito stone', 'pix stone', 'dinheiro', 'devolução de compra', 'adiantamento de clientes', 'reembolso', 'empréstimos bancários', 'venda de ativos', 'transferência entre contas'];
  const lowerName = name.toLowerCase();

  for (const keyword of incomeKeywords) {
    if (lowerName.includes(keyword.toLowerCase())) {
      return 'income';
    }
  }
  return 'expense';
}

function parseDate(value: string): string | null {
  if (!value || value === '') return null;
  // Handle DD/MM/YYYY format
  const parts = value.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return value; // Assume it's already YYYY-MM-DD or other valid format
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      companyId,
      companyData,
      categories,
      clientsSuppliers,
      accountsPayable,
      accountsReceivable
    } = await req.json();

    console.log('Starting import process...');

    let targetCompanyId = companyId;

    // Create company if companyData is provided
    if (companyData && !companyId) {
      console.log('Creating new company:', companyData.razao_social);
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert([companyData])
        .select()
        .single();

      if (companyError) {
        console.error('Error creating company:', companyError);
        throw new Error(`Error creating company: ${companyError.message}`);
      }

      targetCompanyId = newCompany.id;
      console.log('Company created with ID:', targetCompanyId);
    }

    if (!targetCompanyId) {
      throw new Error('Company ID is required');
    }

    const results = {
      categories: { imported: 0, errors: 0 },
      clients: { imported: 0, errors: 0 },
      suppliers: { imported: 0, errors: 0 },
      accountsPayable: { imported: 0, errors: 0 },
      accountsReceivable: { imported: 0, errors: 0 },
    };

    // Pre-fetch lookups
    console.log('Fetching existing data for lookups...');
    const [existingCategories, existingClients, existingSuppliers] = await Promise.all([
      supabase.from('categories').select('id, name').eq('company_id', targetCompanyId),
      supabase.from('clients').select('id, razao_social').eq('company_id', targetCompanyId),
      supabase.from('suppliers').select('id, razao_social').eq('company_id', targetCompanyId),
    ]);

    const categoryMap = new Map<string, string>(
      existingCategories.data?.map(c => [c.name.toLowerCase(), c.id]) || []
    );
    const clientMap = new Map<string, string>(
      existingClients.data?.map(c => [c.razao_social.toLowerCase(), c.id]) || []
    );
    const supplierMap = new Map<string, string>(
      existingSuppliers.data?.map(s => [s.razao_social.toLowerCase(), s.id]) || []
    );

    // 1. Import Categories
    if (categories) {
      console.log('Importing categories...');
      const catLines = typeof categories === 'string' ? parseCSV(categories) : categories;

      // Skip header if it's string (raw CSV)
      const startIndex = typeof categories === 'string' ? 1 : 0;

      for (let i = startIndex; i < catLines.length; i++) {
        const line = catLines[i];
        if (line.length < 1) continue;

        const name = line[0]?.trim();
        const description = line[1]?.trim() || null;

        if (!name) continue;

        const cleanName = name.trim();
        const categoryType = getCategoryType(cleanName);

        try {
          const { data: cat, error } = await supabase
            .from('categories')
            .upsert({
              company_id: targetCompanyId,
              name: cleanName,
              description,
              type: categoryType,
              is_active: true
            }, {
              onConflict: 'company_id, name'
            })
            .select()
            .single();

          if (error) {
            console.error('Error inserting category:', cleanName, error);
            results.categories.errors++;
          } else {
            categoryMap.set(cleanName.toLowerCase(), cat.id);
            results.categories.imported++;
          }
        } catch (e) {
          console.error('Exception inserting category:', e);
          results.categories.errors++;
        }
      }
    }

    // 2. Import Clients and Suppliers
    if (clientsSuppliers) {
      console.log('Importing clients and suppliers...');
      const csLines = typeof clientsSuppliers === 'string' ? parseCSV(clientsSuppliers) : clientsSuppliers;
      const startIndex = typeof clientsSuppliers === 'string' ? 1 : 0;

      for (let i = startIndex; i < csLines.length; i++) {
        const line = csLines[i];
        if (line.length < 3) continue;

        const situacao = line[0]?.trim();
        const cpfCnpj = line[1]?.trim() || null;
        const razaoSocial = line[2]?.trim();
        const nomeFantasia = line[3]?.trim() || razaoSocial;
        const telefone = line[4]?.trim() || null;
        const contato = line[5]?.trim() || null;
        const email = line[6]?.trim() || null;
        const cidadeEstado = line[7]?.trim() || '';
        const estado = line[8]?.trim() || null;
        const endereco = line[9]?.trim() || null;
        const bairro = line[10]?.trim() || null;
        const cep = line[11]?.trim() || null;
        const banco = line[12]?.trim() || null;
        const agencia = line[13]?.trim() || null;
        const contaCorrente = line[14]?.trim() || null;
        const inscricaoEstadual = line[15]?.trim() || null;
        const inscricaoMunicipal = line[16]?.trim() || null;

        if (!razaoSocial) continue;

        const cidadeMatch = cidadeEstado.match(/^(.*?)\s*\([A-Z]{2}\)$/);
        const cidade = cidadeMatch ? cidadeMatch[1].trim() : cidadeEstado;

        const isActive = situacao?.toLowerCase() !== 'inativo';
        const tipoPessoa = cpfCnpj && cpfCnpj.includes('/') ? 'PJ' : 'PF';

        const baseData = {
          company_id: targetCompanyId,
          razao_social: razaoSocial,
          nome_fantasia: nomeFantasia,
          cpf_cnpj: cpfCnpj,
          telefone,
          contato_nome: contato,
          email,
          endereco_logradouro: endereco,
          endereco_bairro: bairro,
          endereco_cidade: cidade,
          endereco_estado: estado,
          endereco_cep: cep,
          dados_bancarios_banco: banco,
          dados_bancarios_agencia: agencia,
          dados_bancarios_conta: contaCorrente,
          inscricao_estadual: inscricaoEstadual,
          inscricao_municipal: inscricaoMunicipal,
          tipo_pessoa: tipoPessoa,
          is_active: isActive
        };

        // Client
        try {
          const { data: client, error } = await supabase
            .from('clients')
            .upsert(baseData, { onConflict: 'company_id, razao_social' })
            .select()
            .single();

          if (error) {
            console.error('Error inserting client:', razaoSocial, error.message);
            results.clients.errors++;
          } else {
            clientMap.set(razaoSocial.toLowerCase(), client.id);
            results.clients.imported++;
          }
        } catch (e) {
          console.error('Exception inserting client:', e);
          results.clients.errors++;
        }

        // Supplier
        try {
          const { data: supplier, error } = await supabase
            .from('suppliers')
            .upsert(baseData, { onConflict: 'company_id, razao_social' })
            .select()
            .single();

          if (error) {
            console.error('Error inserting supplier:', razaoSocial, error.message);
            results.suppliers.errors++;
          } else {
            supplierMap.set(razaoSocial.toLowerCase(), supplier.id);
            results.suppliers.imported++;
          }
        } catch (e) {
          console.error('Exception inserting supplier:', e);
          results.suppliers.errors++;
        }
      }
    }

    // 3. Import Accounts Payable
    if (accountsPayable) {
      console.log('Importing accounts payable...');
      const apLines = typeof accountsPayable === 'string' ? parseCSV(accountsPayable) : accountsPayable;
      const startIndex = typeof accountsPayable === 'string' ? 1 : 0;

      for (let i = startIndex; i < apLines.length; i++) {
        const line = apLines[i];
        if (line.length < 10) continue;

        const situacao = line[0]?.trim();
        const tipoDocumento = line[1]?.trim();
        const parcela = line[3]?.trim();
        const nomeFornecedor = line[5]?.trim();
        const previsaoPagamento = line[6]?.trim();
        const ultimoPagamento = line[7]?.trim();
        const valorConta = line[8]?.trim();
        const categoria = line[15]?.trim();
        const dataVencimento = line[20]?.trim();
        const observacao = line[23]?.trim();

        const dueDate = parseDate(dataVencimento || previsaoPagamento);
        const amount = parseNumber(valorConta);

        if (!dueDate || amount === 0) continue;

        const supplierId = nomeFornecedor ? supplierMap.get(nomeFornecedor.toLowerCase()) : null;
        const categoryId = categoria ? categoryMap.get(categoria.toLowerCase()) : null;
        const status = mapStatus(situacao);
        const paymentDate = status === 'paid' ? parseDate(ultimoPagamento) : null;

        const description = `${tipoDocumento || 'Conta'} ${parcela ? `- ${parcela}` : ''} - ${nomeFornecedor || 'Sem fornecedor'}`.trim();

        try {
          // Check for existing record to avoid exact duplicates
          const { data: existing } = await supabase
            .from('accounts_payable')
            .select('id')
            .eq('company_id', targetCompanyId)
            .eq('description', description)
            .eq('amount', amount)
            .eq('due_date', dueDate)
            .maybeSingle();

          if (existing) {
            results.accountsPayable.imported++; // Count as "processed"
            continue;
          }

          const { error } = await supabase
            .from('accounts_payable')
            .insert([{
              company_id: targetCompanyId,
              description,
              amount,
              due_date: dueDate,
              payment_date: paymentDate,
              status,
              supplier_id: supplierId,
              category_id: categoryId,
              payment_method: tipoDocumento?.toLowerCase(),
              observations: observacao
            }]);

          if (error) {
            console.error('Error inserting account payable:', error.message);
            results.accountsPayable.errors++;
          } else {
            results.accountsPayable.imported++;
          }
        } catch (e) {
          console.error('Exception inserting account payable:', e);
          results.accountsPayable.errors++;
        }
      }
    }

    // 4. Import Accounts Receivable
    if (accountsReceivable) {
      console.log('Importing accounts receivable...');
      const arLines = typeof accountsReceivable === 'string' ? parseCSV(accountsReceivable) : accountsReceivable;
      const startIndex = typeof accountsReceivable === 'string' ? 1 : 0;

      for (let i = startIndex; i < arLines.length; i++) {
        const line = arLines[i];
        if (line.length < 10) continue;

        const situacao = line[0]?.trim();
        const tipoDocumento = line[1]?.trim();
        const parcela = line[3]?.trim();
        const nomeCliente = line[5]?.trim();
        const previsaoRecebimento = line[6]?.trim();
        const ultimoRecebimento = line[7]?.trim();
        const valorConta = line[8]?.trim();
        const categoria = line[15]?.trim();
        const dataVencimento = line[21]?.trim();
        const observacao = line[24]?.trim();

        const dueDate = parseDate(dataVencimento || previsaoRecebimento);
        const amount = parseNumber(valorConta);

        if (!dueDate || amount === 0) continue;

        const clientId = nomeCliente ? clientMap.get(nomeCliente.toLowerCase()) : null;
        const categoryId = categoria ? categoryMap.get(categoria.toLowerCase()) : null;
        const status = mapStatus(situacao);
        const receiveDate = status === 'paid' ? parseDate(ultimoRecebimento) : null;

        const description = `${tipoDocumento || 'Conta'} ${parcela ? `- ${parcela}` : ''} - ${nomeCliente || 'Sem cliente'}`.trim();

        try {
          // Check for existing record to avoid exact duplicates
          const { data: existing } = await supabase
            .from('accounts_receivable')
            .select('id')
            .eq('company_id', targetCompanyId)
            .eq('description', description)
            .eq('amount', amount)
            .eq('due_date', dueDate)
            .maybeSingle();

          if (existing) {
            results.accountsReceivable.imported++; // Count as "processed"
            continue;
          }

          const { error } = await supabase
            .from('accounts_receivable')
            .insert([{
              company_id: targetCompanyId,
              description,
              amount,
              due_date: dueDate,
              receive_date: receiveDate,
              status,
              client_id: clientId,
              category_id: categoryId,
              payment_method: tipoDocumento?.toLowerCase(),
              observations: observacao
            }]);

          if (error) {
            console.error('Error inserting account receivable:', error.message);
            results.accountsReceivable.errors++;
          } else {
            results.accountsReceivable.imported++;
          }
        } catch (e) {
          console.error('Exception inserting account receivable:', e);
          results.accountsReceivable.errors++;
        }
      }
    }

    console.log('Import completed!', results);

    return new Response(
      JSON.stringify({
        success: true,
        companyId: targetCompanyId,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
