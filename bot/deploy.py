#!/usr/bin/env python3
"""Deploy VOLKI bot to Ubuntu server via SSH/SCP using paramiko"""
import paramiko
import os

SERVER = "5.252.155.147"
USER = "root"
PASS = "os1mw7Xk7U6t3lG5"
REMOTE_DIR = "/opt/bots/volki1303"
BOT_DIR = os.path.dirname(os.path.abspath(__file__))

print("\n🐺 VOLKI 13:03 — Bot Deployment")
print("=" * 40)

# Connect SSH
print("[1/5] Connecting to server...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASS, timeout=15)
print(f"  ✅ Connected to {SERVER}")

# Create directory
print("[2/5] Creating remote directory...")
ssh.exec_command(f"mkdir -p {REMOTE_DIR}")

# Upload files via SFTP
print("[3/5] Uploading bot files...")
sftp = ssh.open_sftp()

bot_file = os.path.join(BOT_DIR, "volki_bot.py")
service_file = os.path.join(BOT_DIR, "volki-bot.service")

sftp.put(bot_file, f"{REMOTE_DIR}/volki_bot.py")
print(f"  ✅ Uploaded volki_bot.py")

sftp.put(service_file, f"{REMOTE_DIR}/volki-bot.service")
print(f"  ✅ Uploaded volki-bot.service")

sftp.close()

# Install systemd service
print("[4/5] Installing systemd service...")
commands = [
    f"cp {REMOTE_DIR}/volki-bot.service /etc/systemd/system/volki-bot.service",
    "systemctl daemon-reload",
    "systemctl enable volki-bot",
    "systemctl restart volki-bot",
]
for cmd in commands:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.channel.recv_exit_status()  # Wait for completion
    err = stderr.read().decode().strip()
    if err and "Created symlink" not in err:
        print(f"  ⚠️ {err}")

# Check status
print("[5/5] Checking bot status...")
stdin, stdout, stderr = ssh.exec_command("systemctl is-active volki-bot")
status = stdout.read().decode().strip()
print(f"  Service status: {status}")

stdin, stdout, stderr = ssh.exec_command("journalctl -u volki-bot -n 5 --no-pager 2>&1")
logs = stdout.read().decode().strip()
print(f"  Recent logs:\n{logs}")

# List other bots on server
print("\n📋 All bots on server:")
stdin, stdout, stderr = ssh.exec_command("ls -la /opt/bots/ 2>/dev/null")
listing = stdout.read().decode().strip()
if listing:
    print(listing)
else:
    print("  Only volki1303 found")

ssh.close()

print(f"\n✅ Bot deployed successfully on {SERVER}!")
print(f"   systemctl status volki-bot")
print(f"   journalctl -u volki-bot -f")
