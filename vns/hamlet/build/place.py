#!/usr/bin/env python3
# place.py — coloca lo que haya en img/_incoming/ en su sitio y reconstruye.
#   - slug de fondo  -> img/fondos/<slug>.png
#   - slug de personaje -> recorta (cutout.py) a img/<slug>/neutral.png
#   - desconocido -> avisa y lo deja en _incoming/
# Los .png los deja ahí la página (vía el bookmarklet -> save-server) con el nombre = slug.
#
# Uso:  python3 vns/hamlet/build/place.py
import os
import json
import shutil
from cutout import cutout
from build import CANON_BG, main as build_main

HERE = os.path.dirname(os.path.abspath(__file__))
HAMLET = os.path.dirname(HERE)
IMG = os.path.join(HAMLET, 'img')
INC = os.path.join(IMG, '_incoming')
ARCHIVE = os.path.join(INC, '_done')

BG_SLUGS = {slug for _, slug in CANON_BG}
CHAR_SLUGS = set(json.load(open(os.path.join(HERE, 'characters.json'))).get(k, {}).get('slug', '')
                 for k in json.load(open(os.path.join(HERE, 'characters.json')))) \
    if os.path.exists(os.path.join(HERE, 'characters.json')) else set()


def main():
    if not os.path.isdir(INC):
        print('No hay carpeta _incoming, nada que colocar.')
        return
    os.makedirs(ARCHIVE, exist_ok=True)
    placed = 0
    for fn in sorted(os.listdir(INC)):
        if not fn.lower().endswith('.png'):
            continue
        slug = os.path.splitext(fn)[0]
        src = os.path.join(INC, fn)
        if slug in BG_SLUGS:
            dst = os.path.join(IMG, 'fondos', slug + '.png')
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.move(src, dst)
            print(f'  fondo     {slug} -> fondos/{slug}.png')
            placed += 1
        elif slug in CHAR_SLUGS:
            dst = os.path.join(IMG, slug, 'neutral.png')
            cutout(src, dst)                 # recorta el fondo gris
            shutil.move(src, os.path.join(ARCHIVE, fn))   # guarda el crudo
            print(f'  personaje {slug} -> {slug}/neutral.png (recortado)')
            placed += 1
        else:
            print(f'  ⚠ slug desconocido: {fn} (lo dejo en _incoming/)')
    print(f'Colocados: {placed}. Reconstruyendo...\n')
    build_main()


if __name__ == '__main__':
    main()
