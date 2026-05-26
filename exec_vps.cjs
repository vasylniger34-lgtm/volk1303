// exec_vps.cjs — Exec remote SSH command
const { Client } = require('ssh2');

const config = {
  host: '5.252.155.147',
  username: 'root',
  password: 'os1mw7Xk7U6t3lG5'
};

const cmd = process.argv.slice(2).join(' ') || 'cat /opt/bots/volki1303/volki_bot.py | grep -i http';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', data => process.stdout.write(data.toString()))
      .stderr.on('data', data => process.stderr.write(data.toString()));
  });
}).connect(config);
