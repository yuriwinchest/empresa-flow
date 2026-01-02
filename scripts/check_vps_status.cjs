
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const keyPath = path.join(os.homedir(), '.ssh', 'empresa-flow-key');
const host = 'root@72.61.133.214';

const execSSH = (command) => {
    return new Promise((resolve, reject) => {
        console.log(`Executing: ${command}`);
        const ssh = spawn('ssh', ['-i', keyPath, '-o', 'StrictHostKeyChecking=no', host, command]);
        let output = '';
        ssh.stdout.on('data', d => { output += d; console.log(d.toString()); });
        ssh.stderr.on('data', d => console.error(d.toString()));
        ssh.on('close', (code) => resolve({ code, output }));
    });
};

async function checkVPS() {
    console.log("--- Checking Connectivity & Services ---");

    // 1. Check Podman
    console.log("\n[1] Checking Podman:");
    await execSSH('podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"');

    // 2. Check Postgres Native
    console.log("\n[2] Checking Native Postgres:");
    await execSSH('systemctl status postgresql-15 | grep "Active"');

    // 3. Check App Directory
    console.log("\n[3] Checking Web Dir:");
    await execSSH('ls -la /var/www/empresa-flow');
}

checkVPS();
