// scratch/check_new_vps.cjs - Check if the local changes exist in remote bot
const { Client } = require('ssh2');

const config = {
  host: '5.252.155.147',
  username: 'root',
  password: 'os1mw7Xk7U6t3lG5'
};

const conn = new Client();

console.log('Connecting to NEW VPS 5.252.155.147 to check bot code...');

conn.on('ready', () => {
  console.log('SSH Connection successful!');
  
  const cmd = 'grep -n "setChatMenuButton" /opt/bots/volki1303/volki_bot.py || echo "NOT FOUND"';
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    
    stream.on('close', () => {
      conn.end();
    })
    .on('data', data => process.stdout.write(data.toString()))
    .stderr.on('data', data => process.stderr.write(data.toString()));
  });
}).on('error', (err) => {
  console.error('SSH Connection failed:', err);
}).connect(config);
