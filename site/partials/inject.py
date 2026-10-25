"""Insert/refresh the shared mobile CSS and JS (partials/mobile-fixes.html) in every page.
Run from site/:  python partials/inject.py"""
import io, glob, re, os
part = io.open(os.path.join(os.path.dirname(__file__), 'mobile-fixes.html'), encoding='utf-8').read()
css = part[part.index('<!--mobile:css-->'):part.index('<!--mobile:css-end-->') + len('<!--mobile:css-end-->')]
js = part[part.index('<!--mobile:js-->'):part.index('<!--mobile:js-end-->') + len('<!--mobile:js-end-->')]
for p in sorted(glob.glob('*.html')):
    s = io.open(p, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in s else '\n'
    s = re.sub(r'\r?\n?<!--mobile:css-->.*?<!--mobile:css-end-->', '', s, flags=re.S)
    s = re.sub(r'\r?\n?<!--mobile:js-->.*?<!--mobile:js-end-->', '', s, flags=re.S)
    s = s.replace('</head>', css.replace('\n', nl) + nl + '</head>', 1)
    i = s.rindex('</body>')
    s = s[:i] + js.replace('\n', nl) + nl + s[i:]
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('ok', p)
