from pathlib import Path
import re
text = Path('supabase/seed.sql').read_text(encoding='utf-8')

# Split statements by semicolon at top level
parts = []
cur = []
depth = 0
in_str = False
for ch in text:
    if ch == "'":
        in_str = not in_str
    if not in_str:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        elif ch == ';' and depth == 0:
            piece = ''.join(cur).strip()
            if piece:
                parts.append(piece)
            cur = []
            continue
    cur.append(ch)
if cur:
    piece = ''.join(cur).strip()
    if piece:
        parts.append(piece)

for stmt in parts:
    if 'INSERT INTO' not in stmt.upper():
        continue
    m = re.match(r"INSERT\s+INTO\s+([\w.]+)\s*\(([^)]*)\)\s*VALUES\s*(.+)", stmt, re.I | re.S)
    if not m:
        continue
    table, cols_text, vals_text = m.groups()
    cols = [c.strip() for c in cols_text.split(',') if c.strip()]
    # Find each row tuple at top level
    rows = []
    buf = []
    depth = 0
    in_str = False
    i = 0
    while i < len(vals_text):
        ch = vals_text[i]
        if ch == "'":
            in_str = not in_str
            buf.append(ch)
            i += 1
            continue
        if not in_str:
            if ch == '(':
                depth += 1
            elif ch == ')':
                depth -= 1
                if depth == 0:
                    row = ''.join(buf)
                    rows.append(row)
                    buf = []
                    i += 1
                    continue
            if depth > 0:
                buf.append(ch)
            else:
                # ignore whitespace between rows
                pass
        else:
            buf.append(ch)
        i += 1
    # Actually rows built above are not correct for multiple rows? Keep simple: parse each tuple content
    for row in rows:
        if not row.startswith('(') or not row.endswith(')'):
            continue
        inner = row[1:-1]
        exprs = []
        cur2 = []
        depth2 = 0
        in_str2 = False
        for ch in inner:
            if ch == "'":
                in_str2 = not in_str2
                cur2.append(ch)
            elif not in_str2:
                if ch == '(':
                    depth2 += 1
                    cur2.append(ch)
                elif ch == ')':
                    depth2 -= 1
                    cur2.append(ch)
                elif ch == ',' and depth2 == 0:
                    exprs.append(''.join(cur2).strip())
                    cur2 = []
                else:
                    cur2.append(ch)
            else:
                cur2.append(ch)
        if cur2:
            exprs.append(''.join(cur2).strip())
        if len(exprs) != len(cols):
            print(table, 'columns', len(cols), 'expressions', len(exprs))
            print('row:', row[:400])
            print('---')
            break
else:
    print('no mismatches found')
