from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
out = root / 'assets'
out.mkdir(exist_ok=True)
im = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
d.rounded_rectangle((32, 32, 992, 992), radius=250, fill='#526e59')
d.arc((207, 207, 817, 817), 55, 320, fill='#f4f3e9', width=25)
d.ellipse((484, 484, 540, 540), fill='#f4f3e9')
d.line((512, 512, 512, 335), fill='#f4f3e9', width=27)
d.line((512, 512, 638, 579), fill='#f4f3e9', width=27)
d.ellipse((710, 696, 744, 730), fill='#d1dfbf')
im.resize((512, 512), Image.Resampling.LANCZOS).save(out / 'icon.png')
im.save(out / 'icon.ico', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
