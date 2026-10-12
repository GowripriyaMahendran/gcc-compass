"""Bundle src/ + data/data.json into one self-contained index.html (no server needed)."""
d = open('data/data.json', encoding='utf-8').read().replace('</', '<\\/')
html = open('src/shell.html', encoding='utf-8').read()
html = html.replace('/*CSS*/', open('src/app.css', encoding='utf-8').read())
html = html.replace('/*DATA*/', d)
js = open('src/engine.js', encoding='utf-8').read() + '\n' + open('src/ui.js', encoding='utf-8').read()
html = html.replace('/*JS*/', js.replace('</script', '<\\/script'))
open('index.html', 'w', encoding='utf-8').write(html)
print('index.html', len(html) // 1024, 'KB')
