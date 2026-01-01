const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const logFile = 'ssh.log';
// Append to log instead of overwriting to keep history if needed, or overwrite as before.
fs.writeFileSync(logFile, 'Log started\n');

const log = (msg) => {
    fs.appendFileSync(logFile, msg + '\n');
    console.log(msg);
};

const keyPath = path.join(os.homedir(), '.ssh', 'empresa-flow-key');

log('Starting ssh with key...');
// Using standard ssh client
const ssh = spawn('ssh', ['-i', keyPath, '-o', 'StrictHostKeyChecking=no', 'root@72.61.133.214', 'ls -la'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

ssh.stdout.on('data', (data) => log('STDOUT: ' + data));
ssh.stderr.on('data', (data) => log('STDERR: ' + data));

ssh.on('close', (code) => {
    log(`\nSSH process exited with code ${code}`);
});

// No need for fallback "y" sending logic with batch mode and keys

