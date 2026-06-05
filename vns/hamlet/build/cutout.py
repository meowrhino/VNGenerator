#!/usr/bin/env python3
# cutout.py — recorta el fondo plano de un sprite (el gris liso de Gemini) y deja
# un PNG con transparencia, recortado al personaje. Sin dependencias pesadas: solo PIL.
#
# Uso:
#   python3 vns/hamlet/build/cutout.py entrada.png salida.png
#   python3 vns/hamlet/build/cutout.py entrada.png hamlet     # -> img/hamlet/neutral.png
#
# Cómo funciona: flood-fill desde los bordes (quita solo el fondo CONECTADo, no los
# grises de dentro del personaje), se queda con el componente central (mata motas
# sueltas como la marca ✦), erosiona 1-2 px para borrar el halo gris y suaviza el borde.
import os
import sys
from collections import deque
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(os.path.dirname(HERE), 'img')
SENT = (255, 0, 255)   # color centinela para marcar el fondo


def keep_central_blob(mask):
    """Conserva solo el blob opaco conectado al centro; descarta motas sueltas."""
    w, h = mask.size
    m = mask.load()
    cx, cy = w // 2, h // 2
    if not m[cx, cy]:                       # si el centro cae en transparente, sube/baja
        for dy in range(1, h // 2):
            if cy + dy < h and m[cx, cy + dy]:
                cy += dy; break
            if cy - dy >= 0 and m[cx, cy - dy]:
                cy -= dy; break
    if not m[cx, cy]:
        return mask
    keep = Image.new('L', (w, h), 0)
    k = keep.load()
    q = deque([(cx, cy)]); m[cx, cy] = 0; k[cx, cy] = 255
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and m[nx, ny]:
                m[nx, ny] = 0; k[nx, ny] = 255; q.append((nx, ny))
    return keep


def cutout(src, dst, thresh=42, erode=2, feather=0.6, pad=10):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    work = im.copy()
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
             (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    for s in seeds:
        if work.getpixel(s) != SENT:
            ImageDraw.floodfill(work, s, SENT, thresh=thresh)
    # máscara binaria: 0 donde quedó centinela (fondo)
    px = work.load()
    mask = Image.new('L', (w, h), 0)
    mk = mask.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] != SENT:
                mk[x, y] = 255
    mask = keep_central_blob(mask)
    for _ in range(erode):
        mask = mask.filter(ImageFilter.MinFilter(3))
    if feather:
        mask = mask.filter(ImageFilter.GaussianBlur(feather))
    out = im.convert('RGBA')
    out.putalpha(mask)
    bbox = mask.getbbox()
    if bbox:
        l, t, r, b = bbox
        out = out.crop((max(0, l - pad), max(0, t - pad),
                        min(w, r + pad), min(h, b + pad)))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    out.save(dst)
    print(f'cutout -> {dst}  {out.size[0]}x{out.size[1]}')


def main():
    if len(sys.argv) < 3:
        print('uso: cutout.py entrada.png salida.png | <slug>')
        sys.exit(1)
    src, dst = sys.argv[1], sys.argv[2]
    if '/' not in dst and not dst.lower().endswith('.png'):
        expr = sys.argv[3] if len(sys.argv) > 3 else 'neutral'
        dst = os.path.join(IMG, dst, expr + '.png')   # atajo: slug [expresion]
    cutout(src, dst)


if __name__ == '__main__':
    main()
