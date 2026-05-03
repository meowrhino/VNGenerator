/* core/audio.js — Sistema de audio del lector.
 *
 * Tres canales independientes:
 *   - bgm    : música de fondo, loop infinito, volumen medio. Persiste entre
 *              slides hasta que otro slide cambie el src o lo silencie con null.
 *   - voice  : línea de voz, reemplaza la anterior si suena.
 *   - se     : efectos de sonido cortos, no se solapan en la misma instancia
 *              pero pueden coincidir con bgm/voice.
 *
 * El audio HTML5 es susceptible al autoplay block del navegador antes de la
 * primera interacción del usuario. Capturamos el error y seguimos: la BGM
 * arrancará en cuanto el usuario haga el primer click. */

export class AudioMixer {
  constructor() {
    /** @type {{bgm: HTMLAudioElement|null, voice: HTMLAudioElement|null}} */
    this.channels = { bgm: null, voice: null };
    this.volume = { bgm: 0.6, voice: 1.0, se: 0.8 };
    this.muted = false;
  }

  /** Procesa el bloque audio de un slide. base es la URL absoluta de assets/audio/. */
  apply(audio, base = '') {
    if (!audio) return;
    if (audio.bgm !== undefined) {
      const url = audio.bgm ? base + audio.bgm : null;
      this._setBgm(url);
    }
    if (audio.se)    this._playOnce(base + audio.se,    this.volume.se);
    if (audio.voice) this._setVoice(base + audio.voice);
  }

  /** Cambia o silencia la BGM. No reinicia si el src es el mismo. */
  _setBgm(url) {
    if (this.channels.bgm && this.channels.bgm._url === url) return;
    if (this.channels.bgm) {
      this.channels.bgm.pause();
      this.channels.bgm = null;
    }
    if (!url) return;
    const a = new Audio(url);
    a.loop = true;
    a.volume = this.muted ? 0 : this.volume.bgm;
    a._url = url;
    a.play().catch(() => { /* autoplay block: arrancará en el primer click */ });
    this.channels.bgm = a;
  }

  _setVoice(url) {
    if (this.channels.voice) this.channels.voice.pause();
    const a = new Audio(url);
    a.volume = this.muted ? 0 : this.volume.voice;
    a.play().catch(() => {});
    this.channels.voice = a;
  }

  _playOnce(url, vol) {
    if (this.muted) return;
    const a = new Audio(url);
    a.volume = vol;
    a.play().catch(() => {});
  }

  /** Sube o baja todo de golpe. */
  setMuted(m) {
    this.muted = !!m;
    if (this.channels.bgm)   this.channels.bgm.volume   = m ? 0 : this.volume.bgm;
    if (this.channels.voice) this.channels.voice.volume = m ? 0 : this.volume.voice;
  }

  /** Pausa todos los canales (al abrir menú, save, etc). */
  pauseAll() {
    if (this.channels.bgm)   this.channels.bgm.pause();
    if (this.channels.voice) this.channels.voice.pause();
  }
  resumeAll() {
    if (this.channels.bgm)   this.channels.bgm.play().catch(() => {});
    /* la voice no se reanuda: si pausó, el momento ya pasó */
  }

  /** Para reset completo (cambio de capítulo, restart). */
  stopAll() {
    Object.values(this.channels).forEach(a => a && a.pause());
    this.channels.bgm = null;
    this.channels.voice = null;
  }
}
