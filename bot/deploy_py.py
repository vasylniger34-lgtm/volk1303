import paramiko
import sys
import os

ip = '5.252.155.147'
username = 'root'
password = 'os1mw7Xk7U6t3lG5'
remote_dir = '/opt/bots/volki1303'
files_to_upload = ['bot/volki_bot.py', 'bot/volki-bot.service']

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(ip, username=username, password=password)
    print('Connected')
    ssh.exec_command(f'mkdir -p {remote_dir}')
    sftp = ssh.open_sftp()
    for f in files_to_upload:
        basename = os.path.basename(f)
        sftp.put(f, f'{remote_dir}/{basename}')
        print(f'Uploaded {basename}')
    sftp.close()
    cmd = f'cp {remote_dir}/volki-bot.service /etc/systemd/system/volki-bot.service && systemctl daemon-reload && systemctl enable volki-bot && systemctl restart volki-bot'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())
    print(stderr.read().decode())
    print('Service restarted successfully.')
finally:
    ssh.close()
