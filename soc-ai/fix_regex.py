import sys

with open('app/services/llm_engine.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_content = content.replace('r"\\{[\\s\\S]*?\\}"', 'r"\\{[\\s\\S]*\\}"')

with open('app/services/llm_engine.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

if new_content != content:
    print('Replaced successfully')
else:
    print('Not found')
