#!/usr/bin/env python3
# build.py — Conversor Hamlet (Moratín) -> chapter.json del motor VNGenerator.
#
# Pipeline en dos conceptos:
#   1) PARSE: texto plano (source/hamlet-moratin.txt) -> IR estructurado (build/script.json)
#      actos -> escenas (lugar, presentes) -> líneas (speaker, texto).
#   2) COMPOSE: IR + mapa de assets (build/assets-map.json) -> chapter.json jugable.
#      Mientras el mapa esté vacío, sale un VN solo-texto (capas vacías). Cuando se
#      vayan generando sprites/fondos, se rellena el mapa y se vuelve a ejecutar:
#      las anotaciones _scene/_location/_present/_speaker de cada slide guían el encaje.
#
# Uso:  python3 vns/hamlet/build/build.py
import os, re, json, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
HAMLET = os.path.dirname(HERE)            # vns/hamlet
SRC = os.path.join(HAMLET, 'source', 'hamlet-moratin.txt')

# --- Registro canónico de personajes (KEY mayúsculas -> nombre a mostrar) ----
KNOWN = {
    'HAMLET': 'Hamlet', 'HORACIO': 'Horacio', 'CLAUDIO': 'Claudio',
    'POLONIO': 'Polonio', 'GERTRUDIS': 'Gertrudis', 'LAERTES': 'Laertes',
    'OFELIA': 'Ofelia', 'RICARDO': 'Ricardo', 'MARCELO': 'Marcelo',
    'GUILLERMO': 'Guillermo', 'ENRIQUE': 'Enrique', 'BERNARDO': 'Bernardo',
    'LA SOMBRA': 'La Sombra', 'REYNALDO': 'Reynaldo', 'FRANCISCO': 'Francisco',
    'TODOS': 'Todos', 'CAPITÁN': 'Capitán', 'FORTIMBRÁS': 'Fortimbrás',
    'CABALLERO': 'Caballero', 'LOS DOS': 'Los dos', 'VOCES': 'Voces',
    'VOLTIMAN': 'Voltiman', 'EL CURA': 'El Cura', 'CRIADO': 'Criado',
    'SEPULTURERO': 'Sepulturero',
}

ACT_RE = re.compile(r'^Acto\s+(Primero|Segundo|Tercero|Cuarto|Quinto)\s*$')
SCENE_RE = re.compile(r'^Escena\s+([IVXLCDM]+)\s*$')
# Speaker normal:  NOMBRE[ Nº].-  texto      (admite ordinal: CÓMICO 1.º.- / SEPULTURERO 2.º.-)
SPEAKER_RE = re.compile(
    r'^([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ ]{0,20}?(?:\s+\d+\s*\.?\s*[º°ªo]?)?)\s*\.\s*[-‐–—]\s*(.*)$')
# Variante sin guion (un verso cantado del sepulturero): ROL Nº.  texto normal
# Se descarta si lo que sigue empieza por OTRO nombre en mayúsculas (eso es un
# roster tipo "SEPULTURERO 1.º SEPULTURERO 2.º", no una línea de diálogo).
SPEAKER_NODASH_RE = re.compile(
    r'^(CÓMICO|SEPULTURERO|MARINERO)\s+(\d+)\.?\s*[º°ªo]?\.?\s*(\S.*)$')
ACT_NUM = {'Primero': 1, 'Segundo': 2, 'Tercero': 3, 'Cuarto': 4, 'Quinto': 5}

# Cabecera de escena: distinguir LUGAR (descripción) de REPARTO (quién está presente).
PLACE_START = {'explanada', 'salon', 'sala', 'galeria', 'cuarto', 'gabinete',
               'cementerio', 'campo', 'parte', 'aposento', 'plataforma', 'bosque',
               'habitacion', 'plaza', 'calle', 'patio'}
ROSTER_WORDS = {'dicho', 'dichos', 'dichas', 'acompanamiento', 'demas', 'caballeros',
                'damas', 'pajes', 'guardias', 'guardia', 'soldados', 'criados', 'criado',
                'marineros', 'marinero', 'cornelio', 'voltiman', 'comicos', 'comico',
                'sequito', 'embajadores', 'embajador', 'sepultureros', 'sepulturero',
                'cura', 'curas'}

NOISE_RE = re.compile(
    r'(elejandria|Libro descargado|dominio p[úu]blico|Esperamos que|'
    r'^\s*\d+\s*$|^William Shakespeare\s*$|^Hamlet\s*$|^Por\s*$|^PERSONAJES\s*$)',
    re.IGNORECASE)


def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn')


def slugify(s):
    s = strip_accents(s).lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return re.sub(r'-+', '-', s)[:48]


def collapse(s):
    return re.sub(r'\s+', ' ', s).strip()


def canon(name):
    key = collapse(name).upper()
    if key in KNOWN:
        return key, KNOWN[key]
    m = re.match(r'^(.*?)\s+(\d+)\s*\.?\s*[º°ªo]?$', key)   # rol numerado
    if m:
        role, num = collapse(m.group(1)), m.group(2)
        return f'{role} {num}', f'{role.title()} {num}º'
    return key, key.title()


def titlecase_names(line):
    out = []
    for tok in re.split(r'(\W+)', line):
        out.append(tok.capitalize() if tok.isupper() and len(tok) > 1 else tok)
    return ''.join(out)


def split_sentences(line):
    return [s for s in re.split(r'(?<=\.)\s+', line.strip()) if s.strip()]


def first_word_key(sent):
    w = sent.strip().split(' ', 1)[0]
    return strip_accents(w.lower()).strip('.,;:')


def is_roster_sentence(sent):
    for t in re.split(r'[,\s]+', sent.strip().rstrip('.')):
        if collapse(t).upper() in KNOWN:
            return True
        if strip_accents(t.lower()) in ROSTER_WORDS:
            return True
    return False


# ---------------------------------------------------------------- PARSE -------
def parse(text):
    # Nota global de escenografía (para el intro)
    note = ''
    m = re.search(r'La escena se representa.*?\.', text, re.S)
    if m:
        note = collapse(m.group(0))

    # Arrancamos en el primer "Acto Primero"
    start = text.find('Acto Primero')
    body = text[start:] if start >= 0 else text
    lines = body.split('\n')

    acts = []
    cur_act = cur_scene = None
    speaker = None      # KEY del que habla ahora
    disp = None         # nombre a mostrar
    buf = ''            # acumulador de texto de la línea en curso
    awaiting_header = False

    def flush():
        nonlocal speaker, disp, buf
        if cur_scene is not None and speaker is not None and buf.strip():
            cur_scene['lines'].append(
                {'speaker': speaker, 'display': disp, 'text': collapse(buf)})
        speaker = disp = None
        buf = ''

    for raw in lines:
        ln = raw.strip()
        if not ln or NOISE_RE.search(ln):
            continue

        ma = ACT_RE.match(ln)
        if ma:
            flush()
            cur_act = {'n': ACT_NUM[ma.group(1)], 'name': ma.group(1),
                       'title': f'Acto {ma.group(1)}', 'scenes': []}
            acts.append(cur_act)
            cur_scene = None
            awaiting_header = False
            continue

        ms = SCENE_RE.match(ln)
        if ms and cur_act is not None:
            flush()
            cur_scene = {'roman': ms.group(1), 'label': f'Escena {ms.group(1)}',
                         'location': '', 'present': [], 'lines': []}
            cur_act['scenes'].append(cur_scene)
            awaiting_header = True
            continue

        msp = SPEAKER_RE.match(ln)
        mnd = SPEAKER_NODASH_RE.match(ln) if not msp else None
        if mnd and re.match(r'^[A-ZÁÉÍÓÚÑÜ]{2,}', mnd.group(3)):
            mnd = None   # le sigue otro nombre en mayúsculas => es reparto, no diálogo
        if (msp or mnd) and cur_scene is not None:
            flush()
            if msp:
                speaker, disp = canon(msp.group(1))
                buf = msp.group(2)
            else:
                speaker, disp = canon(f'{mnd.group(1)} {mnd.group(2)}')
                buf = mnd.group(3)
            awaiting_header = False
            continue

        # Línea no-marcador, no-speaker: cabecera de escena (lugar y/o reparto presente)
        if awaiting_header and speaker is None and cur_scene is not None:
            cur_scene['header_raw'] = collapse(cur_scene.get('header_raw', '') + ' ' + ln)
            for sent in split_sentences(ln):
                if first_word_key(sent) in PLACE_START:
                    cur_scene['location'] = collapse(cur_scene['location'] + ' ' + sent)
                elif is_roster_sentence(sent):
                    for tk in re.split(r',|\sy\s|\se\s', sent.rstrip('.')):
                        k = collapse(tk).upper()
                        if k in KNOWN:
                            cur_scene['present'].append(k)
                else:  # descripción/atmósfera ("Noche obscura", "Suena la marcha…")
                    cur_scene['location'] = collapse(cur_scene['location'] + ' ' + sent)
            continue

        if speaker is not None:        # continuación del diálogo
            buf += ' ' + ln

    flush()
    return acts, note


# -------------------------------------------------------------- COMPOSE -------
# Sin mapa que mantener a mano: convención de rutas + detección en disco.
#   Fondos:      vns/hamlet/img/fondos/<bgslug>.webp
#   Personajes:  vns/hamlet/img/<charslug>/neutral.webp   (charslug = slug del KEY)
# Si el archivo existe, se encaja; si no, ese trozo se queda en texto-solo.
IMG = os.path.join(HAMLET, 'img')

# Las 16 localizaciones del texto se agrupan en ~11 fondos canónicos. El orden
# importa (el primer keyword que casa gana).
CANON_BG = [
    ('explanada', 'muralla-noche'),
    ('cementerio', 'cementerio'),
    ('galeria', 'galeria'),
    ('cuarto de la reina', 'cuarto-reina'),
    ('cuarto de hamlet', 'cuarto-hamlet'),
    ('casa de polonio', 'casa-polonio'),
    ('casa de horacio', 'casa-horacio'),
    ('cercana al mar', 'costa'),
    ('parte remota', 'costa'),
    ('campo', 'campo'),
    ('gabinete', 'gabinete'),
    ('marcha danica', 'salon-trono'),
    ('salon', 'salon-trono'),
    ('palacio', 'salon-trono'),     # comodín: interior de palacio
]


def bg_for(loc):
    if not loc:
        return None
    l = strip_accents(loc.lower())
    for kw, slug in CANON_BG:
        if kw in l:
            return slug
    return slugify(loc)


ASSET_EXTS = ('.webp', '.png', '.jpg', '.jpeg')


def find_asset(relbase):
    """Ruta relativa (con extensión) del primer archivo que exista para <relbase>,
    probando webp/png/jpg. None si no hay ninguno. Así puedes soltar el PNG de
    Gemini tal cual, sin convertir."""
    for e in ASSET_EXTS:
        if os.path.exists(os.path.join(IMG, relbase + e)):
            return relbase + e
    return None


AUDIO = os.path.join(HAMLET, 'audio')
AUDIO_EXTS = ('.mp3', '.ogg', '.m4a')


def find_audio(name):
    """Ruta del audio <name> si existe (mp3/ogg/m4a). None si no. Drop-in: el cue
    musical/sfx solo se cablea cuando metes el archivo en vns/hamlet/audio/."""
    if not name:
        return None
    for e in AUDIO_EXTS:
        if os.path.exists(os.path.join(AUDIO, name + e)):
            return name + e
    return None


# Layout de hasta 3 personajes a la vez (layer, x). El motor posiciona por x:
# 0 izq, 0.5 centro, 1 der. Repartimos para que no se solapen.
CAST_LAYOUT = {
    1: [('charCenter', 0.5)],
    2: [('charLeft', 0.30), ('charRight', 0.70)],
    3: [('charLeft', 0.17), ('charCenter', 0.5), ('charRight', 0.83)],
}

# --- Expresiones --------------------------------------------------------------
# Vocabulario por personaje (las caras que tiene sentido generar, aparte de neutral).
EXPR_VOCAB = {
    'HAMLET':    ['ira', 'ironia', 'dolor', 'locura', 'decidido', 'melancolico'],
    'OFELIA':    ['sonrojo', 'llanto', 'locura', 'miedo'],
    'CLAUDIO':   ['afable', 'culpa', 'ira'],
    'GERTRUDIS': ['preocupada', 'verguenza', 'ternura'],
    'POLONIO':   ['intrigante', 'sorpresa'],
    'LAERTES':   ['furia', 'dolor'],
    'HORACIO':   ['asombro', 'preocupacion'],
    'LA SOMBRA': ['acusador'],
}
# Heurística: (emoción, palabras clave SIN acento). Conservadora: ante la duda, neutral.
EXPR_RULES = [
    ('ira',     ['infame', 'traidor', 'villano', 'maldit', 'venganza', 'aborrezco',
                 'perfid', 'indigno', 'colera', 'furor', 'rabia', 'odio', 'vil ']),
    ('miedo',   ['espanto', 'horror', 'horrible', 'pavor', 'terror', 'espantos',
                 'tiembl', 'palido']),
    ('dolor',   ['llanto', 'lagrimas', 'lloro', 'dolor', 'funesto', 'luto', 'desdicha',
                 'desgracia', 'sepulcro', 'difunto']),
    ('asombro', ['cielos', 'prodigio', 'portento', 'que veo', 'que miro']),
]
# Cómo cae cada emoción genérica en el vocabulario concreto de cada personaje.
EXPR_ALIASES = {
    'ira':     ['ira', 'furia', 'acusador'],
    'miedo':   ['miedo', 'culpa', 'preocupada', 'preocupacion'],
    'dolor':   ['dolor', 'llanto', 'melancolico', 'verguenza'],
    'asombro': ['asombro', 'sorpresa', 'preocupacion', 'intrigante'],
}
# Overrides curados de momentos clave: slide_id -> expresión (se rellena a mano).
EXPR_OVERRIDE = {}


def pick_expr(speaker, text):
    """Expresión para una línea según su contenido. 'neutral' por defecto."""
    vocab = EXPR_VOCAB.get(speaker)
    if not vocab:
        return 'neutral'
    t = strip_accents(text.lower())
    for emo, kws in EXPR_RULES:
        if any(k in t for k in kws):
            for cand in EXPR_ALIASES.get(emo, [emo]):
                if cand in vocab:
                    return cand
    return 'neutral'


# --- Audio: tono musical por escena (drop-in) --------------------------------
MOOD_BY_LOC = {
    'muralla-noche': 'tension', 'costa': 'espectro', 'salon-trono': 'corte',
    'casa-polonio': 'principal', 'galeria': 'principal', 'gabinete': 'corte',
    'cuarto-reina': 'tension', 'campo': 'marcha', 'casa-horacio': 'principal',
    'cementerio': 'lamento',
}


MOOD_SCENE = {(4, 12): 'ofelia', (4, 13): 'ofelia', (4, 17): 'ofelia'}  # locura de Ofelia


def mood_for(act, si, loc):
    if (act, si) in MOOD_SCENE:
        return MOOD_SCENE[(act, si)]
    if act == 5 and loc == 'salon-trono':
        return 'duelo'                       # el duelo final del Acto V
    return MOOD_BY_LOC.get(loc, 'principal')


SFX_SCENE = {(1, 12): 'aparicion', (5, 9): 'espadas'}   # efectos puntuales (drop-in)

SCENE_TRANSITION = {                                     # entradas especiales de escena
    (1, 12): {'type': 'dissolve', 'duration': 1300},     # aparición del Espectro
    (5, 1):  {'type': 'fade', 'duration': 1100},         # el cementerio
}

# Overrides curados de expresión por escena: (acto, escena) -> {PERSONAJE: expresión}.
# Se aplican encima de la heurística en los momentos cumbre (siguen siendo drop-in:
# si la cara no existe aún, cae a neutral).
EXPR_SCENE_OVERRIDE = {
    (1, 12): {'LA SOMBRA': 'acusador', 'HAMLET': 'dolor'},    # revelación del Espectro
    (1, 13): {'HAMLET': 'decidido'},
    (3, 4):  {'OFELIA': 'llanto'},                            # escena del convento
    (3, 13): {'CLAUDIO': 'culpa', 'HAMLET': 'ironia'},        # la ratonera
    (3, 24): {'CLAUDIO': 'culpa'},                            # el rezo del Rey
    (3, 26): {'HAMLET': 'ira', 'GERTRUDIS': 'verguenza'},     # la alcoba de la Reina
    (3, 27): {'HAMLET': 'ira', 'GERTRUDIS': 'verguenza'},
    (3, 28): {'HAMLET': 'decidido', 'GERTRUDIS': 'verguenza'},
    (4, 12): {'OFELIA': 'locura'},                            # locura de Ofelia
    (4, 13): {'OFELIA': 'locura'},
    (4, 16): {'LAERTES': 'furia'},                            # Laertes vuelve airado
    (4, 17): {'OFELIA': 'locura', 'LAERTES': 'dolor'},
    (4, 21): {'CLAUDIO': 'afable', 'LAERTES': 'furia'},       # el Rey manipula a Laertes
    (4, 22): {'LAERTES': 'dolor'},                            # muerte de Ofelia
    (5, 2):  {'HAMLET': 'melancolico'},                       # Yorick
    (5, 3):  {'HAMLET': 'dolor', 'LAERTES': 'furia'},         # entierro de Ofelia
    (5, 9):  {'HAMLET': 'decidido', 'LAERTES': 'furia'},      # el duelo
}


def scene_cast(lines):
    """Reparto en escena: hasta 3 personajes CON sprite (los que más hablan),
    colocados de izquierda a derecha por orden de aparición.
    Devuelve { KEY: (layer, x, sprite_path) }."""
    cnt, first, spr = {}, {}, {}
    for i, ln in enumerate(lines):
        sp = ln['speaker']
        if sp not in spr:
            spr[sp] = find_asset(f'{slugify(sp)}/neutral')
        if spr[sp]:
            cnt[sp] = cnt.get(sp, 0) + 1
            first.setdefault(sp, i)
    top = sorted(cnt, key=lambda c: -cnt[c])[:3]          # los 3 que más hablan
    top.sort(key=lambda c: first[c])                       # izq -> der por aparición
    slots = CAST_LAYOUT.get(len(top), [])
    # (layer, x, slug, ruta_neutral)
    return {c: (slots[i][0], slots[i][1], slugify(c), spr[c]) for i, c in enumerate(top)}


def compose(acts, note):
    slides = []
    cur_loc = ''   # localización vigente; se arrastra entre escenas hasta que cambie

    slides.append({'id': 'intro', 'layers': {},
                   'text': {'body': '**H · A · M · L · E · T**', 'center': True},
                   'transition': {'type': 'fadeWhite', 'duration': 1000}})
    slides.append({'id': 'intro2', 'layers': {},
                   'text': {'body': '*Tragedia de William Shakespeare.*  '
                            'Traducción de Leandro Fernández de Moratín.', 'center': True},
                   'transition': {'type': 'fade', 'duration': 700}})
    if note:
        slides.append({'id': 'intro3', 'layers': {},
                       'text': {'body': f'*{note}*', 'center': True},
                       'transition': {'type': 'fade', 'duration': 700}})

    roman = {1: 'PRIMERO', 2: 'SEGUNDO', 3: 'TERCERO', 4: 'CUARTO', 5: 'QUINTO'}
    for act in acts:
        ai = act['n']
        slides.append({'id': f'a{ai}', 'layers': {},
                       'text': {'body': f"**ACTO {roman[ai]}**", 'center': True},
                       'transition': {'type': 'fade', 'duration': 900}})
        for si, sc in enumerate(act['scenes'], 1):
            if sc['location'].strip():
                cur_loc = sc['location'].strip()
            bgslug = bg_for(cur_loc)
            bg = find_asset(f'fondos/{bgslug}') if bgslug else None
            # Tarjeta de escena: muestra el lugar solo si ESTA escena lo declara
            body = f"❖ {sc['label']}"
            if sc['location'].strip():
                body += f" — *{sc['location'].strip()}*"
            card = {'id': f'a{ai}_s{si}',
                    'layers': {'bg1': {'src': bg}} if bg else {},
                    'text': {'body': body, 'center': True},
                    'transition': SCENE_TRANSITION.get((ai, si), {'type': 'fade', 'duration': 600}),
                    '_scene': f'{ai}.{si}', '_location': bgslug or '',
                    '_present': sc['present']}
            audio = {}                       # cues drop-in (solo si el archivo existe)
            bgm = find_audio(mood_for(ai, si, bgslug))
            if bgm:
                audio['bgm'] = bgm
            sfx = find_audio(SFX_SCENE.get((ai, si)))
            if sfx:
                audio['se'] = sfx
            if audio:
                card['audio'] = audio
            slides.append(card)

            castpos = scene_cast(sc['lines'])   # reparto fijo de la escena (hasta 3)
            for li, line in enumerate(sc['lines'], 1):
                # Estado visual COMPLETO por slide: fondo + todos los presentes con
                # sprite en sus posiciones fijas (el motor mantiene los que no cambian).
                sid = f'a{ai}_s{si}_{li:03d}'
                layers = {}
                if bg:
                    layers['bg1'] = {'src': bg}
                for ch, (layer, x, slug, npath) in castpos.items():
                    if ch == line['speaker']:
                        expr = (EXPR_OVERRIDE.get(sid)
                                or EXPR_SCENE_OVERRIDE.get((ai, si), {}).get(ch)
                                or pick_expr(ch, line['text']))
                        path = find_asset(f'{slug}/{expr}') or npath   # drop-in: cae a neutral
                    else:
                        path = npath
                    layers[layer] = {'src': path, 'x': x, 'y': 0}
                sl = {'id': sid,
                      'text': {'speaker': line['display'], 'body': line['text']},
                      'transition': None,        # instant: sin parpadeo a negro por línea
                      '_speaker': line['speaker']}
                sp_slot = castpos.get(line['speaker'])
                if sp_slot:
                    sl['emphasis'] = sp_slot[0]   # capa del que habla (los demás se atenúan)
                if layers:
                    sl['layers'] = layers
                slides.append(sl)

    slides.append({'id': 'fin', 'layers': {},
                   'text': {'body': '**FIN**', 'center': True},
                   'transition': {'type': 'fadeWhite', 'duration': 1200}})

    return {
        '$schema': 'vngenerator/v1',
        'id': 'hamlet',
        'title': 'Hamlet',
        'theme': 'umineko',
        'author': 'William Shakespeare · trad. Moratín',
        'description': 'La tragedia de Hamlet, príncipe de Dinamarca. '
                       'Texto íntegro de la traducción de Leandro Fernández de Moratín.',
        'resolution': {'w': 1920, 'h': 1080},
        'defaults': {'transition': {'type': 'fade', 'duration': 400},
                     'textSpeed': 28},
        'assets': {'images': './img/', 'audio': './audio/'},
        'slides': slides,
    }


# ----------------------------------------------------------------- MAIN -------
def main():
    text = open(SRC, encoding='utf-8').read()
    acts, note = parse(text)
    chapter = compose(acts, note)

    os.makedirs(os.path.join(HAMLET, 'img'), exist_ok=True)
    os.makedirs(os.path.join(HAMLET, 'audio'), exist_ok=True)

    # IR estructurado + registros para la fase de arte
    json.dump({'note': note, 'acts': acts},
              open(os.path.join(HERE, 'script.json'), 'w'),
              ensure_ascii=False, indent=1)

    # Registro de personajes con conteo de líneas
    counts, displays, locset = {}, {}, {}
    for act in acts:
        for sc in act['scenes']:
            if sc['location']:
                locset.setdefault(slugify(sc['location']), sc['location'])
            for ln in sc['lines']:
                counts[ln['speaker']] = counts.get(ln['speaker'], 0) + 1
                displays[ln['speaker']] = ln['display']
    chars_registry = {k: {'display': displays.get(k, k.title()),
                          'slug': slugify(k),
                          'lines': counts[k],
                          'expressions': ['neutral']}
                      for k in sorted(counts, key=lambda k: -counts[k])}
    json.dump(chars_registry, open(os.path.join(HERE, 'characters.json'), 'w'),
              ensure_ascii=False, indent=1)
    json.dump(locset, open(os.path.join(HERE, 'locations.json'), 'w'),
              ensure_ascii=False, indent=1)

    # Carpetas de destino para arrastrar el arte (fondos + reparto principal)
    os.makedirs(os.path.join(IMG, 'fondos'), exist_ok=True)
    for k in list(chars_registry)[:14]:
        os.makedirs(os.path.join(IMG, slugify(k)), exist_ok=True)

    # chapter.json final
    out = os.path.join(HAMLET, 'chapter.json')
    json.dump(chapter, open(out, 'w'), ensure_ascii=False, indent=1)

    # ---- Validación + diagnósticos ----
    ids = [s['id'] for s in chapter['slides']]
    assert len(ids) == len(set(ids)), 'IDs de slide duplicados'
    n_dialog = sum(len(sc['lines']) for a in acts for sc in a['scenes'])
    print('OK ->', out)
    print(f'Actos: {len(acts)} | Escenas: {sum(len(a["scenes"]) for a in acts)} '
          f'| Líneas diálogo: {n_dialog} | Slides totales: {len(chapter["slides"])}')
    for a in acts:
        print(f'  Acto {a["n"]}: {len(a["scenes"]):2d} escenas, '
              f'{sum(len(sc["lines"]) for sc in a["scenes"]):4d} líneas')
    print(f'Personajes: {len(chars_registry)} | Localizaciones distintas: {len(locset)}')
    # Chequeos: lugares anormalmente largos o speakers fugados a la cabecera = parser miss
    warns = 0
    for a in acts:
        for sc in a['scenes']:
            if len(sc['location']) > 110:
                print(f'  ⚠ A{a["n"]} {sc["label"]}: lugar largo -> {sc["location"][:70]}…')
                warns += 1
            if '.-' in sc.get('header_raw', ''):
                print(f'  ⚠ A{a["n"]} {sc["label"]}: speaker fugado a cabecera')
                warns += 1
    print('Avisos de parseo:', warns)

    # ---- Checklist de arte: qué hay en disco y qué falta ----
    print('\n=== FONDOS  (vns/hamlet/img/fondos/<slug>.png|webp) ===')
    for slug in sorted({s for _, s in CANON_BG}):
        found = find_asset(f'fondos/{slug}')
        print(f'  {"✓" if found else "·"} {found or f"fondos/{slug}.(falta)"}')
    print('\n=== PERSONAJES principales (vns/hamlet/img/<slug>/neutral.png|webp) ===')
    for k in list(chars_registry)[:14]:
        found = find_asset(f'{slugify(k)}/neutral')
        rel = found or f'{slugify(k)}/neutral.(falta)'
        print(f'  {"✓" if found else "·"} {rel:28s} {chars_registry[k]["display"]:14s} ({chars_registry[k]["lines"]} líneas)')


if __name__ == '__main__':
    main()
