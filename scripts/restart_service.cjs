
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const keyPath = path.join(os.homedir(), '.ssh', 'empresa-flow-key');
const host = 'root@72.61.133.214';

function execSSH(command) {
    return new Promise((resolve, reject) => {
        console.log(`[SSH] ${command}`);
        const ssh = spawn('ssh', ['-i', keyPath, '-o', 'StrictHostKeyChecking=no', host, command], {
            stdio: 'inherit',
            shell: true
        });
        ssh.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`SSH command failed: ${command}`));
        });
    });
}

async function restart() {
    try {
        console.log("🔄 Reiniciando serviços na VPS...");
        await execSSH("pm2 restart empresa-flow && pm2 flush");
        console.log("✅ Reinicialização concluída!");
    } catch (e) {
        console.error("❌ Erro ao reiniciar:", e.message);
    }
}

restart();
