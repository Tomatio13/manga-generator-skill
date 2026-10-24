from pathlib import Path
from PIL import Image
base=Path('works/auto-c4339911528c/workflow')
for p in ('01','02'):
    im=Image.open(base/'review'/f'page-{p}.png')
    im.resize((256,384),Image.Resampling.LANCZOS).save(base/'quality'/f'page-{p}-thumbnail.png')
