# Hamlet VN — estado y tareas

Leyenda: **[TÚ]** lo haces tú · **[YO]** lo hace Claude · **[TÚ→YO]** tú generas, yo lo encajo

---

## ✅ Hecho (todo lo que no depende de generar assets)
- [YO] Motor + parser Moratín → `chapter.json` (1233 slides, obra íntegra)
- [YO] Pipeline drop-in (`build.py`, `cutout.py`, `place.py`, save-server, bookmarklet)
- [TÚ→YO] **11/11 fondos** + **14/14 personajes** (neutrales)
- [YO] **Skin Umineko** + tarjetas de acto/escena centradas
- [YO] **Colocación múltiple** (≤3 en escena) + **resaltado del hablante**
- [YO] **Motor de expresiones**: heurística por línea + **overrides curados de los hitos**
  (espectro, ratonera, alcoba, locura de Ofelia, entierro, duelo) — drop-in
- [YO] **Hoja de cues musical** (8 temas) + **SFX** + **transiciones dramáticas**, todo drop-in
- [YO] Deploy listo (`.nojekyll`, rutas relativas, raíz limpia, fuentes en `_src/`)
- [YO] Prompt-packs: personajes, **expresiones**, **música/SFX**

## 🎭 Expresiones — generar las caras  ·  [TÚ→YO]
Prompts en `PROMPTS-expresiones.txt` (editar-desde-el-neutral). Empieza por:
- [TÚ→YO] **Hamlet**: ira · ironia · dolor · locura · decidido · melancolico
- [TÚ→YO] **Ofelia**: llanto · locura · sonrojo · miedo
- [TÚ→YO] Luego Claudio, Gertrudis, Laertes, La Sombra (ver el archivo)
> En cuanto sueltes `hamlet/ira.png` etc., aparecen solas donde toca.

## 🎵 Música y SFX — conseguir los archivos  ·  [TÚ→YO]
Prompts en `PROMPTS-musica.txt`. 8 temas en bucle + 2 efectos → `vns/hamlet/audio/`:
- [TÚ→YO] `principal · corte · tension · espectro · ofelia · lamento · duelo · marcha`
- [TÚ→YO] `aparicion` (espectro) · `espadas` (duelo)
> Drop-in: suenan en cuanto los metas. Yo ya los tengo cableados por escena.
- [TÚ] (antes) lanzar la investigación de audio en Claude chat para elegir herramienta

## 🖼️ CGs full-screen (opcional)  ·  [TÚ→YO]
- [TÚ→YO] Generar: veneno en el oído · Ofelia ahogándose · cráneo de Yorick · el duelo
- [YO] Insertarlos como slides `tag:"cg"` (entran en la galería) cuando decidamos

## 🚀 Publicar  ·  [YO]+[TÚ]
- [YO] (listo) revisión de rutas para GitHub Pages
- [YO] preparar el commit cuando digas
- [TÚ] `git push` → online en meowrhino.github.io/VNGenerator/
