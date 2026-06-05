# Hamlet — guía de arte (Gemini / Nano Banana)

Todo el arte se genera con **Gemini 2.5 Flash Image ("Nano Banana")** en
[Google AI Studio](https://aistudio.google.com) y se suelta en `vns/hamlet/img/`.
El motor lo encaja solo: **generar → arrastrar el archivo a su carpeta → `python3 vns/hamlet/build/build.py`**.

Los prompts están **en inglés** a propósito (los modelos obedecen mejor); las imágenes no llevan texto, así que da igual para una VN en español.

---

## El bucle (tu trabajo mínimo)

1. Pega un prompt en AI Studio (modelo *Nano Banana / Gemini 2.5 Flash Image*). **Run**.
2. Descarga el PNG.
3. **Fondos** → guárdalo en `vns/hamlet/img/fondos/<slug>.png`.
   **Personajes** → primero quítale el fondo (sección *Alpha*), luego guárdalo en `vns/hamlet/img/<slug>/neutral.png`.
4. `python3 vns/hamlet/build/build.py` → recarga el lector. El arte aparece.

> El build te imprime un **checklist** (`✓`/`·`) de lo que falta. Empieza por los **fondos** (impacto inmediato en toda la obra y **no necesitan alpha**), luego los personajes principales.

---

## Reglas de oro

- **Consistencia (lo más importante):** genera **un sprite base** por personaje y deriva las expresiones *editando esa imagen* (subiéndola como referencia), nunca volviendo a generar desde cero. Nano Banana mantiene la identidad si parte de la referencia.
- **Mismo mundo:** corte ~1600, corte danés renacentista, paleta apagada y melancólica. Reusa el mismo *style bible* en cada prompt.
- **Naïf, no anime pulido:** es el requisito que más cuesta. El *style bible* empuja hacia el dibujo sincero/tosco; si te sale demasiado "gacha", insiste en *flat colors, rough linework, amateur, NOT polished*.
- **Fondos:** sin personajes, composición vacía para colocar sprites delante, 16:9.
- **Sprites:** cuerpo entero o ¾, pose neutra de frente, **fondo plano liso** (para recortar limpio), sin sombra en el suelo, 9:16.

---

## STYLE BIBLE (pégalo SIEMPRE, al final de cada prompt)

```
ART STYLE: a sincere, slightly naive hand-drawn visual-novel illustration in the
spirit of late-2000s indie/doujin sound novels. Flat cel coloring, visible imperfect
ink linework, simple cheap shading, muted desaturated palette, gentle and a little
melancholic. NOT polished modern anime, NOT glossy, NOT gacha, no airbrushing, no
heavy rendering. Amateur-but-heartfelt, storybook honesty. Soft even lighting.
```

---

## Paso a paso en AI Studio

1. Entra en https://aistudio.google.com (con tu cuenta Google).
2. Modelo: **Gemini 2.5 Flash Image** (alias *Nano Banana*). Salida: *Image*.
3. **Base del personaje:** pega el prompt base → Run → elige la mejor de varias tiradas.
4. **Expresiones:** sube la base como imagen de referencia y pega el prompt de expresión
   (*"the same character… change only the expression to X"*). Una por tirada.
5. Descarga PNG.

---

## PERSONAJES

Plantilla base (sustituye `[DESCRIPCIÓN]`):

```
Full-body character sprite of [DESCRIPCIÓN], standing in a calm neutral pose facing
the viewer, full figure head-to-toe, centered, on a plain flat solid light-grey
background with no scenery and no floor shadow, even frontal lighting, vertical 9:16.
<STYLE BIBLE>
```

Plantilla de expresión (con la base subida como referencia):

```
Use the SAME character from the reference image — identical face, hairstyle, costume,
proportions and art style. Change ONLY the facial expression to [EXPRESIÓN]. Same neutral
pose, same plain light-grey background. <STYLE BIBLE>
```

| Carpeta (`img/<slug>/`) | Personaje | `[DESCRIPCIÓN]` para la base | Expresiones a generar |
|---|---|---|---|
| `hamlet` | Hamlet (365) | a melancholic Danish prince, around 25, pale, dark tousled hair, black mourning doublet with a plain ruff, black cloak, brooding | neutral, melancólico, ira, sonrisa-irónica, llanto-contenido, locura (mirada perdida), determinación |
| `horacio` | Horacio (109) | a loyal young scholar, around 25, plain sober grey-brown clothes, no ornaments, calm and earnest | neutral, asombro, preocupación |
| `claudio` | Claudio (104) | the usurper king of Denmark, around 50, brown greying beard, golden crown, red and gold robe, rings, a controlled smile | neutral, afable-falso, culpa-miedo, ira |
| `polonio` | Polonio (89) | an old pompous court counselor, around 60, long grey beard, dark courtier's robe, chain of office, fussy gesture | neutral, intrigante, paternal, sorpresa |
| `gertrudis` | Gertrudis (69) | the queen of Denmark, around 45, elegant crimson-and-gold velvet gown, small diadem, pearls, dignified | neutral, preocupada, vergüenza-dolida, ternura |
| `laertes` | Laertes (59) | a young nobleman, around 22, elegant travelling clothes, a rapier at the hip, energetic | neutral, afecto, furia-vengativa, dolor |
| `ofelia` | Ofelia (58) | a gentle young woman, around 18, light auburn hair, pale blue-and-white dress, holding small flowers, fragile | neutral, sonrojo, llanto, locura (mirada ida con flores), miedo |
| `ricardo` | Ricardo / Rosencrantz (49) | a young courtier, fashionable muted clothes, ingratiating; looks almost a twin of Guillermo | neutral, sonrisa-falsa, nervioso |
| `marcelo` | Marcelo (32) | a castle night-watch soldier, helmet, breastplate, halberd, dark cloak | neutral, alarma |
| `sepulturero-1` | Sepulturero 1º (30) | a coarse cheerful old gravedigger, peasant clothes, a spade, dirt on his hands | neutral, socarrón |
| `guillermo` | Guillermo / Guildenstern (28) | a young courtier, fashionable muted clothes, ingratiating; looks almost a twin of Ricardo | neutral, sonrisa-falsa, nervioso |
| `enrique` | Enrique / Osric (23) | an affected fop courtier, over-decorated clothes, plumed hat, simpering | neutral, adulador |
| `bernardo` | Bernardo (19) | a castle night-watch soldier, helmet, breastplate, halberd (slightly different from Marcelo) | neutral, alarma |
| `la-sombra` | La Sombra / el Espectro (14) | the ghost of the dead king in full pale plate armor, semi-transparent and spectral, sorrowful face, cold ghostly light | neutral (espectral, triste), acusador-severo |

> Secundarios menores (Francisco, Reynaldo, Fortimbrás, Voltiman, Cómicos, Cura, Capitán…): de momento se quedan sin sprite (texto-solo). Si quieres, luego les hacemos siluetas o reusamos un sprite genérico.

### Truco de gemelos (Ricardo y Guillermo)
Genera primero a Ricardo; para Guillermo, sube a Ricardo como referencia y pide *"a different but clearly related young courtier, same art style and world, slightly different hair/clothes colour"*. Quedan como pareja, que es justo el chiste de Rosencrantz y Guildenstern.

---

## FONDOS  (sin alpha, 16:9, ningún personaje)

Plantilla:

```
Visual-novel background illustration, 16:9, no people and no characters, empty stage
to place character sprites in front: [ESCENA]. Painterly soft watercolor look.
<STYLE BIBLE>
```

| Archivo (`img/fondos/`) | `[ESCENA]` |
|---|---|
| `muralla-noche.png` | the stone battlements of Elsinore castle at night, cold moonlight, drifting mist, dark blue palette, a sentry walkway with crenellations, distant towers |
| `salon-trono.png` | the great gloomy throne hall of a Danish renaissance castle, tall columns, hanging banners, a raised throne on a dais, candlelight, ornate but cold |
| `casa-polonio.png` | an interior room of a nobleman's house, wooden panelling, a leaded window, modest furniture, warm dim light |
| `costa.png` | a remote rocky shore by a cold grey sea, the silhouette of Elsinore castle far in the distance, overcast windy sky |
| `galeria.png` | a long stone castle gallery with tall arched windows, melancholic pale light, empty |
| `gabinete.png` | the king's private study, a writing desk, heavy curtains, a small crucifix, a single candle, shadowy and tense |
| `cuarto-reina.png` | the queen's private bedchamber, a canopy bed, tapestries, a tall mirror, warm but uneasy atmosphere |
| `cuarto-hamlet.png` | a prince's modest chamber, scattered books and papers, a window onto the night, a candle, introspective |
| `campo.png` | a desolate windswept plain on the frontier of Denmark, low grey clouds, a distant marching army, bleak |
| `casa-horacio.png` | a plain scholar's room, simple furniture, books, a small window, cold morning light |
| `cementerio.png` | an old churchyard graveyard beside a stone church, leaning tombstones, an open grave, bare trees, overcast and melancholic |

---

## Alpha (quitar el fondo de los sprites)

Los sprites se generan sobre gris liso; hay que recortarlos a PNG transparente. Opciones:

- **Web, cero instalación:** sube el PNG a un quitafondos (p. ej. un *space* de BiRefNet en Hugging Face, o remove.bg para pruebas) y descarga el PNG transparente.
- **Local (mejor para tandas):** `pip install rembg[gpu]` (o `pipx run rembg`), luego
  `rembg i entrada.png salida.png`. BiRefNet/rembg recortan bien el pelo.
- Si quieres, te monto un `cutout.py` que procese toda una carpeta de golpe. Dímelo.

> Truco anti-halo: el fondo gris liso ayuda a recortar limpio. Si quedan bordes claros, en el quitafondos elige "decontaminate edges" o pásalo por GIMP (Capa → Transparencia → Quitar halo).

---

## Orden recomendado

1. **Test (1 tarde):** `muralla-noche` (fondo) + `hamlet/neutral` (con alpha). Re-build y mira el arranque. Valida estilo + identidad + recorte. Si el look "mola" → sigue. Si sale muy pulido → insiste en el *style bible*.
2. **Los 11 fondos** (rápidos, sin alpha): la obra entera deja de ser negra.
3. **Neutrales del reparto principal** (los 14 de la tabla): aparecen los personajes.
4. **Expresiones** (pulido): las encajaremos por línea en una segunda pasada.

Cuando tengas neutrales + fondos, avísame y hago la **pasada de expresiones por línea**
(marcar qué cara toca en los momentos clave) y el **skin Umineko** del lector.
