require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function deleteUser(email) {
    try {
        // Listar usuários via Admin API
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error('Erro ao listar usuários:', listError);
            return;
        }

        const user = users.users.find(u => u.email === email);

        if (!user) {
            console.log(`Usuário ${email} NÃO encontrado no banco.`);
            return;
        }

        console.log(`Usuário encontrado: ${user.email} (ID: ${user.id})`);
        console.log(`Criado em: ${user.created_at}`);
        console.log(`Email confirmado: ${user.email_confirmed_at || 'NÃO'}`);

        // Deletar usuário
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

        if (deleteError) {
            console.error('Erro ao deletar:', deleteError);
        } else {
            console.log(`✅ Usuário ${email} deletado com sucesso!`);
        }
    } catch (err) {
        console.error('Erro:', err);
    }
}

deleteUser('yuriallmeida@gmail.com');
