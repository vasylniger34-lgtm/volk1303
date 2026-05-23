import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('5.252.155.147', username='root', password='os1mw7Xk7U6t3lG5')
stdin, stdout, stderr = ssh.exec_command('journalctl -u volki-bot -n 10 --no-pager')
print(stdout.read().decode())
ssh.close()
