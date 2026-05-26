// upload_sql_to_vps.cjs — Node.js script to upload updated SQL migration files to the VPS
const { Client } = require('ssh2');
const path = require('path');

const config = {
  host: '203.161.55.65',
  username: 'root',
  password: 'fWNCv520JK0fQ1i2yh'
};

const filesToUpload = [
  { local: '../supabase_migration.sql', remote: '/var/www/volk1303/supabase_migration.sql' },
  { local: '../fix_register_telegram_user.sql', remote: '/var/www/volk1303/fix_register_telegram_user.sql' },
  { local: '../fix_auth_identities.sql', remote: '/var/www/volk1303/fix_auth_identities.sql' },
  { local: '../fix_auth_schema.sql', remote: '/var/www/volk1303/fix_auth_schema.sql' }
];

const conn = new Client();

console.log('Connecting to VPS to upload SQL files...');

conn.on('ready', () => {
  console.log('SSH Connection ready!');
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      process.exit(1);
    }
    
    let completed = 0;
    
    filesToUpload.forEach(file => {
      const localPath = path.resolve(__dirname, file.local);
      console.log(`Uploading ${localPath} -> ${file.remote}...`);
      
      sftp.fastPut(localPath, file.remote, (uploadErr) => {
        if (uploadErr) {
          console.error(`Upload error for ${localPath}:`, uploadErr);
          conn.end();
          process.exit(1);
        }
        console.log(`Uploaded ${path.basename(localPath)} successfully!`);
        completed++;
        
        if (completed === filesToUpload.length) {
          console.log('All SQL files uploaded successfully!');
          conn.end();
          process.exit(0);
        }
      });
    });
  });
}).connect(config);
