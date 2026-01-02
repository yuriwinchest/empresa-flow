
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
    const { data: company } = await supabase.from('companies').select('id').limit(1).single()
    if (!company) return console.error('Nenhuma empresa encontrada')

    console.log('Testando insert de categoria...')
    const { data, error } = await supabase.from('categories').insert({
        company_id: company.id,
        name: 'Categoria Teste ' + Date.now(),
        type: 'expense'
    }).select()

    if (error) {
        console.log('--- ERROR_START ---')
        console.log(JSON.stringify(error, null, 2))
        console.log('--- ERROR_END ---')
    } else {
        console.log('✅ Sucesso!', data)
    }
}

test()
