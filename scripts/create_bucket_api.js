
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ As variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    try {
        console.log("🔌 Conectando ao Supabase para configurar Storage...");

        // Caminho do arquivo SQL
        const migrationFile = path.join(__dirname, '../supabase/migrations/20260103130000_create_bucket.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        // Como o cliente JS não executa SQL arbitrário facilmente sem RPC, vamos criar o bucket via API JS
        // Mas para as policies, precisamos de SQL.
        // Vou tentar criar o bucket via API primeiro.

        console.log("📦 Verificando/Criando bucket 'company-docs'...");
        const { data: bucket, error: bucketError } = await supabase
            .storage
            .createBucket('company-docs', {
                public: false,
                fileSizeLimit: 5242880, // 5MB
                allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg']
            });

        if (bucketError) {
            if (bucketError.message.includes('already exists')) {
                console.log("✅ Bucket 'company-docs' já existe.");
            } else {
                console.error("❌ Erro ao criar bucket:", bucketError);
            }
        } else {
            console.log("✅ Bucket 'company-docs' criado com sucesso!");
        }

        // Agora aplicar o SQL para as Policies (usando a conexão Postgres direta é melhor se possível, 
        // mas vou usar o pg helper que já tenho nos outros scripts se este falhar, mas vou tentar via pg aqui)

        // NÃO consigo rodar SQL via cliente JS padrão sem uma function RPC.
        // Vou usar o pacote 'pg' como nos outros scripts.
    } catch (error) {
        console.error("❌ Erro inesperado:", error);
        process.exit(1);
    }
}

// Chamar script 'apply_bucket_migration.js' que usa 'pg'
// Eu vou criar OUTRO script que usa 'pg' para aplicar o SQL de policies.
console.log("⚠️ Use 'node scripts/apply_bucket_policies.js' para aplicar as políticas de segurança.");
applyMigration();
