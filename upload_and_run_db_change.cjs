// upload_and_run_db_change.cjs — Uploads and executes the database update script on the VPS
const { Client } = require('ssh2');
const path = require('path');

const config = {
  host: '5.252.155.147',
  username: 'root',
  password: 'os1mw7Xk7U6t3lG5'
};

const conn = new Client();

console.log('Connecting to VPS...');

conn.on('ready', () => {
  console.log('SSH Connection ready!');
  
  const localFile = path.join(__dirname, '..', 'scratch', 'change_reg_balance.py');
  const remoteFile = '/tmp/change_reg_balance.py';
  
  console.log(`Uploading ${localFile} -> ${remoteFile}...`);
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      process.exit(1);
    }
    
    sftp.fastPut(localFile, remoteFile, (uploadErr) => {
      if (uploadErr) {
        console.error('Upload error:', uploadErr);
        conn.end();
        process.exit(1);
      }
      console.log('Uploaded change_reg_balance.py successfully!');
      
      const execCmd = 'python3 /tmp/change_reg_balance.py';
      console.log(`Executing remote command: ${execCmd}`);
      
      conn.exec(execCmd, (execErr, stream) => {
        if (execErr) {
          console.error('Exec error:', execErr);
          conn.end();
          process.exit(1);
        }
        
        stream.on('close', (code) => {
          console.log(`Remote execution completed with code ${code}`);
          conn.end();
          process.exit(code);
        }).on('data', (data) => {
          process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
          process.stderr.write(data.toString());
        });
      });
    });
  });
}).connect(config);
