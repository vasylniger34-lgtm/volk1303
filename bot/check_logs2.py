import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('5.252.155.147', username='root', password='os1mw7Xk7U6t3lG5')
stdin, stdout, stderr = ssh.exec_command('journalctl -u volki-bot -n 20 --no-pager')
text = stdout.read().decode('utf-8', errors='ignore')
for line in text.splitlines():
    if 'WebApp URL' in line:
        print(line)
ssh.close()
