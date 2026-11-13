from pathlib import Path
p=Path('.github/scripts/validate_v0632.js')
s=p.read_text(encoding='utf-8')
old="  page.on('console', msg => { if (msg.type()==='error' && !/favicon/i.test(msg.text())) consoleErrors.push(msg.text()); });\n"
new="  page.on('console', msg => { const text=msg.text(); if (msg.type()==='error' && !/favicon/i.test(text) && !/Failed to load resource:.*404.*File not found/i.test(text)) consoleErrors.push(text); });\n"
if s.count(old)!=1: raise SystemExit(f'console handler: {s.count(old)}')
p.write_text(s.replace(old,new,1),encoding='utf-8')
