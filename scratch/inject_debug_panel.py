import sys

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

search = '        {/* ================= 2. MY MACHINES SCREEN ================= */}'
if search not in content:
    print('SEARCH STRING NOT FOUND')
    lines = content.split('\n')
    for i, line in enumerate(lines[1578:1592], start=1579):
        print(f'{i}: {repr(line)}')
    sys.exit(1)

replacement = (
    '        {/* P2J Step 1: Sync Debug Panel */}\n'
    '        {currentScreen === "home" && (\n'
    '          <SyncDebugPanel isOnline={isOnline} onRefresh={refreshData} />\n'
    '        )}\n\n'
    '        {/* ================= 2. MY MACHINES SCREEN ================= */}'
)

new_content = content.replace(search, replacement, 1)
with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('SUCCESS: SyncDebugPanel inserted')
