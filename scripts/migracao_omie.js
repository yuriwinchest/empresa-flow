
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const BASE_DIR = 'd:\\TATITA\\empresa-flow\\BECKAP'

const FILES = {
    CLIENTES: 'Omie_Clientes_Fornecedors.csv',
    PRODUTOS: 'Omie_Produtos.csv',
    RECEBER: 'Omie_Contas_Receber.csv',
    PAGAR: 'Omie_Contas_Pagar.csv',
    CATEGORIAS: 'Omie_Categorias.csv',
    EMPRESA: 'modelo - site(1 CADASTRO DA EMPRESA).csv'
}

// Utilitários
function cleanNumber(val) {
    if (!val) return 0
    if (typeof val === 'number') return val
    const clean = val.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
    return parseFloat(clean) || 0
}

function cleanString(val) {
    return val ? val.toString().trim() : null
}

function parseDate(dateStr) {
    if (!dateStr) return null
    const parts = dateStr.toString().split('/')
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
    return null
}

function removeBOM(content) {
    if (content.charCodeAt(0) === 0xFEFF) return content.slice(1)
    return content
}

function cleanCnpj(val) {
    if (!val) return null
    return val.toString().replace(/\D/g, '')
}

async function run() {
    console.log('🚀 Iniciando Migração Omie -> Supabase (V2 com Progress Logs)...')

    // 1. Empresa
    const { data: existingComp } = await supabase.from('companies').select('id').limit(1).single()
    const mainCompanyId = existingComp?.id
    if (!mainCompanyId) return console.error('❌ Erro: Empresa não encontrada no banco. Crie-a primeiro.')
    console.log(`🏢 Empresa ID: ${mainCompanyId}`)

    // 2. Categorias
    console.log('\n📂 Sincronizando Categorias...')
    const categoryMap = new Map()
    try {
        let content = fs.readFileSync(path.join(BASE_DIR, FILES.CATEGORIAS), 'utf-8')
        content = removeBOM(content)
        const records = parse(content, { columns: true, skip_empty_lines: true, delimiter: ';' })

        for (const row of records) {
            const rawName = row['Descrição'] || row['Descri\u00e7\u00e3o'] || Object.values(row)[0]
            const name = cleanString(rawName)
            if (!name) continue

            const lowerName = name.toLowerCase()
            const type = (lowerName.includes('receita') || lowerName.includes('entrada') || lowerName.includes('venda')) ? 'income' : 'expense'

            let { data: existing } = await supabase.from('categories').select('id').eq('company_id', mainCompanyId).eq('name', name).maybeSingle()
            let catId = existing?.id

            if (!catId) {
                const { data: newCat, error } = await supabase.from('categories').insert({ company_id: mainCompanyId, name, type, is_active: true }).select().single()
                if (newCat) catId = newCat.id
                else if (error) console.warn(`⚠️ Erro cat [${name}]: ${error.message}`)
            }
            if (catId) categoryMap.set(name, catId)
        }
        console.log(`✅ ${categoryMap.size} categorias mapeadas.`)
    } catch (e) { console.error('❌ Erro Categorias:', e.message) }

    // 3. Clientes/Fornecedores (Cache)
    console.log('\n👥 Sincronizando Parceiros...')
    const clientMap = new Map()
    const supplierMap = new Map()
    try {
        const { data: clients } = await supabase.from('clients').select('id, razao_social').eq('company_id', mainCompanyId)
        clients?.forEach(c => clientMap.set(c.razao_social, c.id))
        const { data: suppliers } = await supabase.from('suppliers').select('id, razao_social').eq('company_id', mainCompanyId)
        suppliers?.forEach(s => supplierMap.set(s.razao_social, s.id))
        console.log(`ℹ️ Cache: ${clientMap.size} clientes, ${supplierMap.size} fornecedores.`)
    } catch (e) { console.error('❌ Erro Cache:', e.message) }

    // 5. Contas a Pagar
    console.log('\n💸 Importando Contas a Pagar...')
    try {
        let content = fs.readFileSync(path.join(BASE_DIR, FILES.PAGAR), 'utf-8')
        content = removeBOM(content)
        const records = parse(content, { columns: true, skip_empty_lines: true, delimiter: ';' })

        let count = 0, errors = 0
        for (const row of records) {
            const supplierName = cleanString(row['Nome do Fornecedor'])
            const catName = cleanString(row['Categoria'])
            const status = (row['Situação'] || '').toUpperCase().includes('PAGO') ? 'paid' : 'pending'

            const { error } = await supabase.from('accounts_payable').insert({
                company_id: mainCompanyId,
                supplier_id: supplierMap.get(supplierName),
                category_id: categoryMap.get(catName),
                description: `${row['Tipo de Documento'] || 'Conta'}: ${row['Número do Documento'] || 'S/N'}`,
                amount: cleanNumber(row['Valor a Pagar'] || row['Valor da Conta']),
                due_date: parseDate(row['Data de Vencimento']),
                payment_date: parseDate(row['Último Pagamento']),
                status: status
            })

            if (error) {
                // console.warn(`⚠️ Erro linha ${count}: ${error.message}`)
                errors++
            } else {
                count++
            }
            if ((count + errors) % 50 === 0) console.log(`... processadas ${count + errors}/${records.length} linhas`)
        }
        console.log(`✅ ${count} contas a pagar importadas. (${errors} falhas)`)
    } catch (e) { console.error('❌ Erro Contas Pagar:', e.message) }

    // 6. Contas a Receber
    console.log('\n💰 Importando Contas a Receber...')
    try {
        let content = fs.readFileSync(path.join(BASE_DIR, FILES.RECEBER), 'utf-8')
        content = removeBOM(content)
        const records = parse(content, { columns: true, skip_empty_lines: true, delimiter: ';' })

        let count = 0, errors = 0
        for (const row of records) {
            const clientName = cleanString(row['Nome do Cliente'])
            const catName = cleanString(row['Categoria'])
            const status = (row['Situação'] || '').toUpperCase().includes('RECEBIDO') ? 'paid' : 'pending'

            const { error } = await supabase.from('accounts_receivable').insert({
                company_id: mainCompanyId,
                client_id: clientMap.get(clientName),
                category_id: categoryMap.get(catName),
                description: `${row['Tipo de Documento'] || 'Recebimento'}: ${row['Número do Documento'] || 'S/N'}`,
                amount: cleanNumber(row['Valor a Receber'] || row['Valor da Conta']),
                due_date: parseDate(row['Data de Vencimento']),
                receive_date: parseDate(row['Último Recebimento']),
                status: status
            })

            if (error) errors++
            else count++
            if ((count + errors) % 50 === 0) console.log(`... processadas ${count + errors}/${records.length} linhas`)
        }
        console.log(`✅ ${count} contas a receber importadas. (${errors} falhas)`)
    } catch (e) { console.error('❌ Erro Contas Receber:', e.message) }

    console.log('\n🏁 Migração Concluída Total!')
}

run()
