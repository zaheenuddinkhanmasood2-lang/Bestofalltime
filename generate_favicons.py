from pathlib import Path

from PIL import Image

ROOT = Path('.').resolve()
MASTER_PNG = ROOT / 'favicon-512.png'
PNG_SIZES = [16, 32, 48, 64, 128, 192, 256, 512]
ICO_SIZES = [16, 32, 48, 64]

if not MASTER_PNG.exists():
    raise SystemExit('favicon-512.png is required to generate raster icons.')

base_image = Image.open(MASTER_PNG).convert('RGBA')

for size in PNG_SIZES:
    resized = base_image.resize((size, size), Image.LANCZOS)
    filename = ROOT / f'favicon-{size}.png'
    resized.save(filename, format='PNG')

base_image.save(
    ROOT / 'favicon.ico',
    format='ICO',
    sizes=[(size, size) for size in ICO_SIZES],
)

print('Generated PNG and ICO favicons from favicon-512.png.')
