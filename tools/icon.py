"""Generate the SceneTemple folded-page mark and native application icons."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
img = Image.new('RGBA',(1024,1024))
draw = ImageDraw.Draw(img)
draw.rounded_rectangle((20,20,1004,1004),radius=210,fill='#21443b')
draw.polygon([(193,369),(513,194),(830,369),(830,415),(193,415)],fill='#f7edd8')
draw.polygon([(247,459),(419,459),(419,758),(366,811),(247,811)],fill='#f7edd8')
draw.polygon([(468,459),(572,459),(572,675),(468,729)],fill='#e5b88b')
draw.polygon([(621,459),(778,459),(778,811),(621,811)],fill='#f7edd8')
img.resize((512,512),Image.Resampling.LANCZOS).save(root/'app/assets/icon.png')
img.save(root/'desktop/icon.ico',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
img.save(root/'desktop/icon.icns',formats=['ICNS'])
