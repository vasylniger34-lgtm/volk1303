import os

filepath = 'bot/volki_bot.py'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('VOLKI', 'VOLK')
text = text.replace('volki1303', 'volk1303')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
