#!/usr/bin/env python3
# synth.py — música procedural MUY simple para la VN (drones/acordes en bucle, tono
# melancólico tipo sound novel). Sin dependencias: Python puro -> WAV -> ffmpeg -> .ogg
# en vns/hamlet/audio/. Es un PLACEHOLDER atmosférico; sustitúyelo por Suno/CC0 cuando
# quieras (el motor coge .ogg/.mp3 igual). Uso:  python3 vns/hamlet/build/synth.py
import math
import os
import struct
import subprocess
import tempfile
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'audio')
SR = 22050

# Notas (Hz) — paleta menor, melancólica.
A1, A2, A3, A4 = 55.00, 110.00, 220.00, 440.00
C3, C4, C5 = 130.81, 261.63, 523.25
D2, D3, D4 = 73.42, 146.83, 293.66
E2, E3, E4, E5 = 82.41, 164.81, 329.63, 659.25
F2, F3 = 87.31, 174.61
G2 = 98.00

# Cada mood: acordes + carácter. arp=arpegio (caja de música), pulse=latido, drum=tambor.
MOODS = {
    'principal': dict(chord=[A3, C4, E4], wave='tri',  lfo=0.07, gain=0.50),
    'corte':     dict(chord=[D3, F3, A3, D2], wave='sine', lfo=0.10, gain=0.42),
    'tension':   dict(chord=[E2, F2, E3], wave='sine', lfo=0.16, gain=0.42, delay=0.33),
    'espectro':  dict(chord=[A1, E2, A2], wave='sine', lfo=0.05, gain=0.55, trem=5.2, delay=0.5),
    'ofelia':    dict(chord=[A4, C5, E5, A4 * 2], wave='sine', gain=0.34, arp=0.5, delay=0.28),
    'lamento':   dict(chord=[A2, C3, E3], wave='tri',  lfo=0.05, gain=0.50, delay=0.45),
    'duelo':     dict(chord=[D3, F3, A3, D2], wave='tri', lfo=0.0, gain=0.46, pulse=1.4),
    'marcha':    dict(chord=[G2, D3], wave='square', lfo=0.0, gain=0.30, drum=1.0),
}
DUR = 19.0   # segundos por bucle


def osc(kind, ph):
    if kind == 'sine':   return math.sin(ph)
    if kind == 'tri':    return 2.0 / math.pi * math.asin(math.sin(ph))
    if kind == 'square': return 0.7 if math.sin(ph) > 0 else -0.7
    return math.sin(ph)


def render(m):
    n = int(SR * DUR)
    buf = [0.0] * n
    chord = m['chord']
    kind = m.get('wave', 'sine')
    # fases de cada nota (con un leve "coro": dos osciladores algo desafinados)
    voices = []
    for f in chord:
        for det in (1.0, 1.003):
            voices.append([f * det, 0.0])
    arp = m.get('arp')
    drum_ph = 0.0
    for i in range(n):
        t = i / SR
        amp = 1.0
        if m.get('lfo'):
            amp *= 0.55 + 0.45 * (0.5 + 0.5 * math.sin(2 * math.pi * m['lfo'] * t))
        if m.get('trem'):
            amp *= 0.6 + 0.4 * (0.5 + 0.5 * math.sin(2 * math.pi * m['trem'] * t))
        if m.get('pulse'):
            env = (t * m['pulse']) % 1.0
            amp *= math.exp(-3.0 * env) * 0.7 + 0.3      # latido tenso
        s = 0.0
        if arp is not None:
            # caja de música: una nota cada 'arp' s, con decaimiento
            idx = int(t / arp) % len(chord)
            local = (t % arp)
            f = chord[idx]
            s = math.sin(2 * math.pi * f * t) * math.exp(-3.2 * local)
        else:
            for v in voices:
                v[1] += 2 * math.pi * v[0] / SR
                s += osc(kind, v[1])
            s /= len(voices)
        s *= amp
        if m.get('drum'):
            db = (t * m['drum']) % 1.0
            if db < 0.06:                                # golpe grave de tambor
                s += 0.5 * math.sin(2 * math.pi * 60 * db) * math.exp(-30 * db)
        buf[i] = s * m['gain']
    # eco simple (espacio/reverb pobre)
    d = m.get('delay')
    if d:
        dn = int(d * SR)
        for i in range(dn, n):
            buf[i] += 0.34 * buf[i - dn]
    # fade de bordes (bucle "respira" sin clic) + soft clip
    fade = int(0.08 * SR)
    for i in range(fade):
        g = i / fade
        buf[i] *= g
        buf[n - 1 - i] *= g
    out = bytearray()
    for s in buf:
        s = math.tanh(s * 1.4)
        out += struct.pack('<h', int(max(-1, min(1, s)) * 30000))
    return bytes(out)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, m in MOODS.items():
        data = render(m)
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tf:
            wav = wave.open(tf.name, 'wb')
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(SR)
            wav.writeframes(data); wav.close()
            ogg = os.path.join(OUT, name + '.ogg')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tf.name,
                            '-q:a', '4', ogg], check=True)
        os.remove(tf.name)
        print(f'  ♪ {name}.ogg  ({os.path.getsize(ogg) // 1024} KB)')
    print('Listo. Reconstruye con build.py y la música suena (drop-in).')


if __name__ == '__main__':
    main()
