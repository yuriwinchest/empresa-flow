
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const keyPath = path.join(os.homedir(), '.ssh', 'empresa-flow-key');
const host = 'root@72.61.133.214';
const remoteDir = '/var/www/empresa-flow';

// Lista de pastas e arquivos para subir
const filesToUpload = [
    'package.json',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'vite.config.ts',
    'tailwind.config.ts',
    'postcss.config.js',
    'components.json',
    'index.html',
    'src', // Pasta inteira
    'public', // Pasta inteira
    '.env',
    'migration_vps.sql' // SQL novo
];

function runCommand(cmd, args) {
    return new Promise((resolve, reject) => {
        console.log(`> ${cmd} ${args.join(' ')}`);
        // Force shell true for windows compatibility
        const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });
        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with code ${code}`));
        });
    });
}

function execSSH(command) {
    return new Promise((resolve, reject) => {
        console.log(`[SSH] ${command}`);
        const ssh = spawn('ssh', ['-i', keyPath, '-o', 'StrictHostKeyChecking=no', host, command], {
            stdio: 'inherit'
        });
        ssh.on('close', (code) => {
            if (code === 0) resolve();
            // Dont reject immediately on SSH error to allow script to try to finish other steps if safe, but here we want strict.
            else reject(new Error(`SSH command failed: ${command}`));
        });
    });
}

async function deploy() {
    try {
        console.log("🚀 INICIANDO DEPLOY AUTOMATIZADO NA VPS (APP + DB)...");

        // 1. Preparar VPS
        console.log("\n📦 1. Preparando diretório remoto...");
        await execSSH(`mkdir -p ${remoteDir}`);

        // 2. Upload de Arquivos via SCP
        console.log("\n📤 2. Enviando arquivos...");
        for (const file of filesToUpload) {
            const localPath = path.resolve(__dirname, '..', file);
            if (fs.existsSync(localPath)) {
                console.log(`   - Enviando ${file}...`);
                await runCommand('scp', ['-r', '-i', keyPath, '-o', 'StrictHostKeyChecking=no', localPath, `${host}:${remoteDir}/`]);
            }
        }

        // 3. Executar Migrations no Banco (VPS)
        console.log("\n🗄️ 3. Atualizando Banco de Dados (VPS)...");
        // Tenta rodar no container 'supabase-db' (comum) ou 'db'
        const migrationScript = `
            cd ${remoteDir}
            if podman ps | grep -q supabase-db; then
                echo "Aplicando migration em supabase-db..."
                cat migration_vps.sql | podman exec -i supabase-db psql -U postgres -d postgres
            else
                echo "⚠️ Container supabase-db não encontrado. Tentando 'db'..."
                if podman ps | grep -q db; then
                     cat migration_vps.sql | podman exec -i db psql -U postgres -d postgres
                else
                     echo "❌ NENHUM CONTAINER DE DB ENCONTRADO. Migration pulada."
                fi
            fi
        `;
        await execSSH(migrationScript).catch(e => console.warn("Erro não fatal na migration:", e.message));

        // 4. Build Remoto
        console.log("\n🔨 4. Executando Build Remoto...");
        const buildScript = `
            cd ${remoteDir}
            echo "Instalando dependências..."
            npm install --silent
            
            echo "Compilando aplicação..."
            npm run build
        `;
        await execSSH(buildScript);

        // 5. Restart PM2
        console.log("\n🚀 5. Reiniciando Servidor PM2...");
        const restartScript = `
            cd ${remoteDir}
            pm2 describe empresa-flow > /dev/null
            if [ $? -eq 0 ]; then
                pm2 reload empresa-flow
            else
                pm2 serve dist 3001 --spa --name "empresa-flow"
                pm2 save
            fi
        `;
        await execSSH(restartScript);

        console.log("\n✅ DEPLOY CONCLUÍDO COM SUCESSO!");

    } catch (error) {
        console.error("\n❌ ERRO NO DEPLOY:", error);
        process.exit(1);
    }
}

deploy();
