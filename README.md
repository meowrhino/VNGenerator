# VNGenerator

Motor de novela visual web. **Vanilla HTML/CSS/JS, sin frameworks**, sin build step. Inspirado en NScripter pero pensado para JAMstack moderno (Cloudflare Pages, Netlify, GitHub Pages).

Estética arxiu/github (serio, tipográfico, sin sombras llamativas, paleta sobria con accent azul GitHub).

---

## 🎭 Hamlet — novela visual incluida

Hay una VN completa montada con este motor: **Hamlet**, texto íntegro de la traducción de
Leandro Fernández de Moratín (dominio público), con estética *sound novel* tipo Umineko.

**▶ Jugar online: https://meowrhino.github.io/VNGenerator/** (entra en «Hamlet»)

- **1233 slides**, 5 actos íntegros · **11 fondos** + **14 personajes** generados con IA
- Skin propio (`css/theme-umineko.css`, se activa con `chapter.theme: "umineko"`), tarjetas
  de acto/escena, colocación de varios personajes y resaltado del que habla
- **Motor de expresiones** y **cues de audio** ya cableados en *drop-in*: sueltas la cara
  (`vns/hamlet/img/<personaje>/<expresión>.png`) o el tema (`vns/hamlet/audio/<mood>.mp3`)
  y aparece/suena solo donde toca

Pipeline (`vns/hamlet/`):

```
build/build.py    # texto de Moratín -> chapter.json (parser + montaje)
build/cutout.py   # recorta el fondo gris de un sprite -> PNG alpha
build/place.py    # coloca lo de img/_incoming/ y reconstruye
source/           # texto extraído del PDF
PROMPTS-*.txt     # prompts para generar personajes, expresiones y música
ART.md · TODO.md  # guía de arte y estado del proyecto
```

Para regenerar el capítulo tras añadir/parsear texto: `python3 vns/hamlet/build/build.py`.

---

## Cómo arrancarlo

Necesita servirlo por HTTP (los módulos ES no funcionan con `file://`):

```bash
cd vngenerator
python3 -m http.server 8080
# o: npx serve
```

Páginas:

- `http://localhost:8080/` — biblioteca (gallery)
- `http://localhost:8080/reader.html?vn=./vns/demo/chapter.json` — lector
- `http://localhost:8080/cg.html?vn=./vns/demo/chapter.json` — galería de CG por VN
- `http://localhost:8080/generator.html` — editor

## Estructura

```
vngenerator/
├── index.html       # Biblioteca
├── reader.html      # Lector
├── cg.html          # Galería de CG
├── generator.html   # Editor
├── manifest.json    # Lista de VNs visibles en la biblioteca
├── css/
│   ├── tokens.css         # Variables (paleta, tipografía, espaciado)
│   ├── base.css           # Reset, botones, inputs, links
│   ├── gallery.css        # Listado tipo arxiv/github
│   ├── reader.css         # Stage, capas, textbox, choices, topbar
│   ├── ui.css             # Overlays: backlog, save menu, menú, toast
│   ├── cg.css             # Galería de CG con lightbox
│   └── generator.css      # Editor split (3 columnas)
├── js/
│   ├── core/              # Núcleo del motor
│   │   ├── engine.js      # Orquestador
│   │   ├── layers.js      # 5 capas DOM apiladas
│   │   ├── transitions.js # 14 tipos + perLayer + motion (msp/amsp)
│   │   ├── audio.js       # BGM + voice + SE
│   │   ├── input.js       # Teclado + click + atajos
│   │   ├── typewriter.js  # Texto carácter a carácter + wait + formato inline
│   │   └── util.js        # Helpers (waitAnim, escape, setPath…)
│   ├── state/
│   │   ├── vars.js        # Variables + evaluador de condiciones
│   │   ├── flow.js        # goto, gosub/return, history
│   │   ├── history.js     # Backlog (datos)
│   │   └── saves.js       # Slots con localStorage + tracker de CG
│   ├── ui/
│   │   ├── textbox.js     # Caja de texto + speaker
│   │   ├── choices.js     # Pantalla de elecciones
│   │   ├── topbar.js      # Barra superior
│   │   ├── menu.js        # Menú pausa
│   │   ├── backlog.js     # Overlay del historial
│   │   ├── save-menu.js   # Panel de slots
│   │   └── toast.js       # Notificaciones flotantes
│   ├── data/
│   │   └── loader.js      # Carga JSON, valida, resuelve paths
│   ├── pages/             # Entry points de cada HTML
│   │   ├── gallery.js
│   │   ├── reader.js
│   │   ├── cg.js
│   │   └── generator.js
│   └── generator/         # Submódulos del editor
│       ├── state.js       # Estado + event bus
│       ├── panels.js      # Meta + lista de slides
│       ├── editors.js     # Editor de slide + sub-editores
│       └── preview.js     # Preview en vivo con engine real
└── vns/
    ├── demo/              # 15 slides con personajes y bifurcación
    ├── cap-vars/          # Demo de variables, gosub, motion, formato
    └── cap-test/          # Una slide por cada tipo de transición
```

## Schema JSON

```json
{
  "$schema": "vngenerator/v1",
  "id": "mi-cap",
  "title": "Capítulo 1",
  "author": "Manu",
  "resolution": { "w": 1920, "h": 1080 },
  "vars": { "afinidad_ana": 0, "tiene_llave": false },
  "defaults": {
    "transition": { "type": "fade", "duration": 400 },
    "textSpeed": 30
  },
  "assets": { "images": "./img/", "audio": "./audio/" },
  "slides": [
    {
      "id": "s001",
      "layers": {
        "bg1":        { "src": "fondo.webp" },
        "overBg":     { "src": "niebla.webp" },
        "charLeft":   { "src": "ana.webp",  "x": 0.25, "y": 0 },
        "charCenter": { "src": "luis.webp", "x": 0.5,  "y": 0, "scale": 1.1 },
        "charRight":  { "src": "eva.webp",  "x": 0.78, "y": 0 }
      },
      "text": { "speaker": "Ana", "body": "Hola...[w:400] **importante**." },
      "audio": { "bgm": "tema.mp3", "se": "puerta.mp3", "voice": "ana_001.mp3" },
      "transition": { "type": "fade", "duration": 500 },
      "motion": {
        "charLeft": { "to": { "x": 0.4 }, "duration": 600 }
      },
      "vars": { "add": { "afinidad_ana": 1 }, "setFlag": "habló_ana" },
      "tag": "cg"
    },
    {
      "id": "s_choice",
      "choice": {
        "prompt": "¿Qué haces?",
        "options": [
          { "label": "Correr",   "next": "s_correr",   "vars": { "add": { "afinidad_ana": -1 } } },
          { "label": "Quedarse", "next": "s_quedarse", "condition": "afinidad_ana >= 1" }
        ]
      }
    },
    {
      "id": "s_jump",
      "text": { "body": "Salto automático tras el delay..." },
      "goto": "s001",
      "gotoIf": "afinidad_ana < 3",
      "gotoDelay": 800
    },
    { "id": "s_sub",  "gosub": "ayuda" },
    { "id": "s_back", "return": true }
  ]
}
```

### Capas

- Orden z (de fondo a frente): `bg1` → `overBg` → `charLeft` → `charCenter` → `charRight`
- `bg1` y `overBg` sin `x`/`y` → llenan toda la pantalla (`object-fit: cover`)
- `charLeft/Center/Right` con `x`/`y`:
  - **x**: 0 = izquierda, 0.5 = centro, 1 = derecha (también acepta px > 1)
  - **y**: 0 = suelo (default), 1 = techo (también acepta px > 1)
  - `scale`: factor de escala (default 1)

### Transiciones

Tipos: `instant`, `fade`, `fadeWhite`, `crossfade`, `wipe-left/right/up/down`, `dissolve`, `pixelate`, `iris-in/out`, `slide-in`, `blinds`, `shake`.

Tres modos:

```json
"transition": null                                // sin animación
"transition": "fade"                              // alias rápido
"transition": { "type": "fade", "duration": 500 } // global
"transition": {                                   // por capa
  "perLayer": {
    "bg1":        { "type": "crossfade", "duration": 800 },
    "charCenter": { "type": "slide-in",  "from": "right" },
    "charLeft":   null
  }
}
```

### Motion (msp/amsp)

Anima propiedades de capas existentes sin recrear el `<img>`. Útil para acercar/alejar a un personaje, sacudirlo, desvanecerlo:

```json
"motion": {
  "charLeft":   { "to": { "x": 0.7, "scale": 1.1 }, "duration": 600 },
  "charCenter": { "shake": { "amplitude": 8, "duration": 400 } },
  "charRight":  { "to": { "opacity": 0 }, "duration": 300 }
}
```

### Variables y condicionales

El estado del juego es un objeto plano con claves arbitrarias. Se inicializa en `chapter.vars` y se modifica desde slides u opciones de choices:

```json
"vars": {
  "set":       { "afinidad_ana": 5 },
  "add":       { "afinidad_ana": 1 },
  "setFlag":   "leyendo_diario",
  "unsetFlag": "leyendo_diario"
}
```

Las **condiciones** son strings con `&&`, `||`, `!`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `+`, `-`, `*`, `/`, paréntesis e identificadores:

```
"afinidad_ana >= 3"
"tiene_llave && !sabia_la_verdad"
"(afinidad_ana > 0 || gusta_luis) && capitulo == 2"
```

Se evalúan con un parser propio (no `eval`, sin riesgo de XSS).

### gosub / return

Saltar a un slide y volver al siguiente del que llamó:

```json
{ "id": "s_call", "gosub": "subrutina_ayuda" },
{ "id": "subrutina_ayuda",   "text": { "body": "Texto reutilizable..." } },
{ "id": "subrutina_ayuda_2", "text": { "body": "...sigue." }, "return": true }
```

### Formato inline en texto

Dentro de `text.body`:

| Marcador | Significado |
|---|---|
| `**bold**` | Negrita |
| `*italic*` | Itálica |
| `[w:500]` | Pausa de 500 ms en mitad del typewriter |
| `[c:#ff6b9d]rosa[/c]` | Cambia de color hasta el cierre |
| `\\n` | Salto de línea literal |

### CG gallery

Marca un slide con `"tag": "cg"` y su `bg1` aparecerá en `cg.html?vn=...` cuando el jugador lo haya visto.

## Atajos en el lector

| Tecla | Acción |
|---|---|
| Click / Espacio / Enter / → | Siguiente |
| ← / Backspace | Anterior |
| Esc | Menú |
| L | Backlog (historial de líneas) |
| S | Save / Load |
| A | Toggle auto-avance |
| M | Mute audio |
| Ctrl (mantenido) | Skip rápido |

## Save slots

- Slot **0**: autosave (cada slide visto)
- Slot **-1**: quicksave
- Slots **1..9**: manuales

Persistencia en `localStorage` con clave `vng:save:<chapter>:<slot>`. Cada slot guarda `{idx, history, callStack, vars, log, preview}`.

## Producción

Para deploy en Cloudflare Pages: subir el directorio tal cual. No necesita build step. Para imágenes, comprime a webp con tu herramienta `imgtoweb` y reemplaza los SVG demo. La carpeta `vns/<slug>/img/` es el contenedor por capítulo.
