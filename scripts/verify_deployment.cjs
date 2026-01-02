
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const keyPath = path.join(os.homedir(), '.ssh', 'empresa-flow-key');
const host = 'root@72.61.133.214';

function execSSH(command) {
    return new Promise((resolve, reject) => {
        const ssh = spawn('ssh', ['-i', keyPath, '-o', 'StrictHostKeyChecking=no', host, command]);
        let output = '';
        ssh.stdout.on('data', d => output += d);
        ssh.stderr.on('data', d => console.error(d.toString())); // Log stderr but dont fail immediately
        ssh.on('close', (code) => resolve(output));
    });
}

async function verify() {
    console.log("🔍 DIAGNÓSTICO PÓS-DEPLOY (BANCO DE DADOS)");

    // Lista tabelas usando psql dentro do container
    const cmd = `
        podman exec -i supabase-db psql -U postgres -d postgres -c "
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('invoices', 'invoice_lines', 'clients', 'accounts_receivable');
        "
    `;

    const output = await execSSH(cmd);
    console.log("\n📋 Tabelas Encontradas:");
    console.log(output);

    if (output.includes('invoices') && output.includes('invoice_lines')) {
        console.log("✅ SUCESSO: Tabelas do módulo de faturamento foram criadas.");
    } else {
        console.log("⚠️ AVISO: Algumas tabelas parecem estar faltando. Verifique se a migration rodou.");
    }
}

verify();
