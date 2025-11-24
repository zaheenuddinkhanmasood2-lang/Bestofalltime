from pathlib import Path

root = Path('.').resolve()
files = {
    'index.html': '',
    'about.html': '',
    'browse.html': '',
    'upload.html': '',
    'signup.html': '',
    'login.html': '',
    'profile.html': '',
    'upload-past-papers.html': '',
    'test-auth.html': '',
    'test_auth.html': '',
    'test-auth-fixed.html': '',
    'test-header-scrollbar.html': '',
    'test-navigation.html': '',
    'test-setup.html': '',
    'test-connection.html': '',
    'past-papers/past-papers.html': '../'
}

block_template = (
    "    <!-- Favicon -->\n"
    "    <link rel=\"icon\" type=\"image/svg+xml\" href=\"{p}favicon.svg\">\n"
    "    <link rel=\"icon\" type=\"image/png\" sizes=\"512x512\" href=\"{p}favicon-512.png\">\n"
    "    <link rel=\"icon\" type=\"image/png\" sizes=\"192x192\" href=\"{p}favicon-192.png\">\n"
    "    <link rel=\"apple-touch-icon\" sizes=\"180x180\" href=\"{p}favicon-192.png\">\n"
    "    <link rel=\"icon\" type=\"image/png\" sizes=\"64x64\" href=\"{p}favicon-64.png\">\n"
    "    <link rel=\"icon\" type=\"image/png\" sizes=\"48x48\" href=\"{p}favicon-48.png\">\n"
    "    <link rel=\"icon\" type=\"image/png\" sizes=\"32x32\" href=\"{p}favicon-32.png\">\n"
    "    <link rel=\"icon\" type=\"image/png\" sizes=\"16x16\" href=\"{p}favicon-16.png\">\n"
    "    <link rel=\"icon\" type=\"image/x-icon\" href=\"{p}favicon.ico\">\n"
    "    <link rel=\"shortcut icon\" type=\"image/x-icon\" href=\"{p}favicon.ico\">\n"
)

def find_block_end(content: str, block_start: int) -> int:
    markers = [
        '<!-- Fonts -->',
        'https://fonts.googleapis.com',
        '<link rel="stylesheet" href="styles.css"',
        '<script',
        '<style',
    ]
    for marker in markers:
        idx = content.find(marker, block_start)
        if idx != -1:
            if marker == '<!-- Fonts -->':
                return idx
            line_start = content.rfind('\n', block_start, idx)
            return (line_start + 1) if line_start != -1 else idx
    raise ValueError('Unable to locate the end of the favicon block.')


for rel_path, prefix in files.items():
    path = root / rel_path
    text = path.read_text(encoding='utf-8')
    start = text.find('<!-- Favicon -->')
    if start == -1:
        raise SystemExit(f'No favicon block in {rel_path}')
    try:
        end = find_block_end(text, start)
    except ValueError as exc:
        raise SystemExit(f'{exc} ({rel_path})') from exc
    new_block = block_template.format(p=prefix)
    text = text[:start] + new_block + '\n' + text[end:]
    path.write_text(text, encoding='utf-8')
