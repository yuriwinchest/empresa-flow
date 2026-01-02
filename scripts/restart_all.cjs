
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const keyPath = path.join(os.homedir(), '.ssh', 'empresa-flow-key');
const host = 'root@72.61.133.214';

function execSSH(command) {
    return new Promise((resolve, reject) => {
        const ssh = spawn('ssh', ['-i', keyPath, '-o', 'StrictHostKeyChecking=no', host, command], {
            stdio: 'inherit',
            shell: true
        });
        ssh.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`SSH command failed`));
        });
    });
}

execSSH("pm2 restart all && pm2 flush");
