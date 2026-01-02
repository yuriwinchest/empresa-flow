
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import dotenv from 'dotenv'

dotenv.config()
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
const BASE_DIR = 'd:\\TATITA\\empresa-flow\\BECKAP'

const FILES = {
    CLIENTES: 'Omie_Clientes_Fornecedors.csv',
    RECEBER: 'Omie_Contas_Receber.csv',
    CATEGORIAS: 'Omie_Categorias.csv'
}

function cleanNumber(val) {
    if (!val) return 0
    const s = val.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
    return parseFloat(s) || 0
}

function cleanString(val) {
    return val ? val.toString().trim() : null
}

function parseDate(dateStr) {
    if (!dateStr) return null
    const s = dateStr.toString()
    if (s.includes('-')) return s
    const parts = s.split('/')
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
    return null
}

function removeBOM(content) {
    if (content.charCodeAt(0) === 0xFEFF) return content.slice(1)
    return content
}

async function run() {
    console.log('🚀 Finalizando Migração: Foco em Contas a Receber...')

    const { data: comp } = await supabase.from('companies').select('id').limit(1).single()
    const mainCompanyId = comp.id

    // Mapas necessarios
    const categoryMap = new Map()
    const clientMap = new Map()

    console.log('📂 Carregando Mapas...')
    const { data: cats } = await supabase.from('categories').select('id, name').eq('company_id', mainCompanyId)
    cats?.forEach(c => categoryMap.set(c.name, c.id))

    const { data: clients } = await supabase.from('clients').select('id, razao_social').eq('company_id', mainCompanyId)
    clients?.forEach(c => clientMap.set(c.razao_social, c.id))

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
                receive_date: parseDate(row['Último Recebimento'] || row['Data de Registro']),
                status: status
            })

            if (error) {
                // Se o erro for de id nulo (cliente ou categoria), logar
                if (error.message.includes('null value in column')) {
                    // console.warn(`⚠️ Erro dados nulos: ${clientName} / ${catName}`)
                }
                errors++
            } else {
                count++
            }
            if ((count + errors) % 100 === 0) console.log(`... processadas ${count + errors}/${records.length} linhas`)
        }
        console.log(`✅ ${count} contas a receber importadas. (${errors} falhas)`)
    } catch (e) {
        console.error('Erro:', e.message)
    }

    console.log('\n🏁 Fim da Importação de Recebíveis!')
}

run()
