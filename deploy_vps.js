// deploy_vps.js — Node.js deployment script for VOLK 1303 using ssh2
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
  host: '203.161.55.65',
  username: 'root',
  password: 'fWNCv520JK0fQ1i2yh'
};

const conn = new Client();

console.log('Connecting to VPS via ssh2...');

conn.on('ready', () => {
  console.log('SSH Connection ready!');
  
  // 1. Upload AuthModal.tsx
  const localAuthModal = path.join(__dirname, 'src', 'components', 'AuthModal.tsx');
  const remoteAuthModal = '/var/www/volk1303/src/components/AuthModal.tsx';
  
  // 2. Upload RegisterModal.tsx
  const localRegisterModal = path.join(__dirname, 'src', 'components', 'RegisterModal.tsx');
  const remoteRegisterModal = '/var/www/volk1303/src/components/RegisterModal.tsx';

  uploadFile(localAuthModal, remoteAuthModal, () => {
    uploadFile(localRegisterModal, remoteRegisterModal, () => {
      console.log('All files uploaded! Starting build and restart Nginx...');
      runBuildAndRestart();
    });
  });
}).connect(config);

function uploadFile(localPath, remotePath, callback) {
  console.log(`Uploading ${path.basename(localPath)} -> ${remotePath}...`);
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      process.exit(1);
    }
    
    sftp.fastPut(localPath, remotePath, (uploadErr) => {
      if (uploadErr) {
        console.error(`Upload error for ${localPath}:`, uploadErr);
        conn.end();
        process.exit(1);
      }
      console.log(`Uploaded ${path.basename(localPath)} successfully!`);
      callback();
    });
  });
}

function runBuildAndRestart() {
  const buildCmd = 'cd /var/www/volk1303 && npm run build';
  const restartCmd = 'systemctl restart nginx';
  
  console.log(`Executing remote command: ${buildCmd}`);
  
  conn.exec(`${buildCmd} && ${restartCmd}`, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      process.exit(1);
    }
    
    stream.on('close', (code, signal) => {
      console.log(`Remote command finished with code ${code}`);
      conn.end();
      console.log('Deployment complete successfully!');
      process.exit(0);
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}
