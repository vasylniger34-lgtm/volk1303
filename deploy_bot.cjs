// deploy_bot.cjs — Node.js script to deploy the Telegram bot to the VPS
const { Client } = require('ssh2');
const path = require('path');

const config = {
  host: '5.252.155.147',
  username: 'root',
  password: 'os1mw7Xk7U6t3lG5'
};

const conn = new Client();

console.log('Connecting to VPS via ssh2...');

conn.on('ready', () => {
  console.log('SSH Connection ready!');
  
  const localBotFile = path.join(__dirname, 'bot', 'volki_bot.py');
  const remoteBotFile = '/opt/bots/volki1303/volki_bot.py';
  
  console.log(`Uploading ${localBotFile} -> ${remoteBotFile}...`);
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      process.exit(1);
    }
    
    sftp.fastPut(localBotFile, remoteBotFile, (uploadErr) => {
      if (uploadErr) {
        console.error('Upload error:', uploadErr);
        conn.end();
        process.exit(1);
      }
      console.log('Uploaded volki_bot.py successfully!');
      
      // Restart the service
      const restartCmd = 'systemctl restart volki-bot';
      console.log(`Executing remote command: ${restartCmd}`);
      
      conn.exec(restartCmd, (execErr, stream) => {
        if (execErr) {
          console.error('Exec error:', execErr);
          conn.end();
          process.exit(1);
        }
        
        stream.on('close', (code) => {
          console.log(`Remote command finished with code ${code}`);
          
          // Check status and logs
          const statusCmd = 'systemctl status volki-bot --no-pager';
          conn.exec(statusCmd, (statusErr, statusStream) => {
            if (statusErr) {
              conn.end();
              process.exit(0);
            }
            statusStream.on('close', () => {
              conn.end();
              console.log('Deployment complete successfully!');
              process.exit(0);
            }).on('data', (data) => {
              process.stdout.write(data.toString());
            }).stderr.on('data', (data) => {
              process.stderr.write(data.toString());
            });
          });
        }).on('data', (data) => {
          process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
          process.stderr.write(data.toString());
        });
      });
    });
  });
}).connect(config);
