import { AUDIO, SOUNDS, type SoundId } from '../data/audio';
import { settings } from './settingsStore';
class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private ambient: { oscillator: OscillatorNode; gain: GainNode }[] = [];
  private voices = new Set<OscillatorNode>();
  private last = new Map<SoundId, number>();
  private playing = false;
  private played = 0;
  private failed = false;
  private level = 0;
  /** Called synchronously from a trusted keyboard/pointer event only. */
  unlock(): void {
    if (this.failed) return;
    try {
      if (!this.context) {
        this.context = new AudioContext(); this.master = this.context.createGain();
        this.master.connect(this.context.destination); this.applySettings();
        this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 256; this.master.connect(this.analyser);
      }
      void this.context.resume().then(() => this.syncAmbient()).catch(() => { this.failed = true; });
    } catch { this.failed = true; }
  }
  applySettings(): void {
    const c = this.context;
    this.level = document.hidden || !document.hasFocus() ? 0 : settings.value.volume;
    if (c && this.master) this.master.gain.setTargetAtTime(this.level, c.currentTime, 0.015);
    this.syncAmbient();
  }
  setPlaying(playing: boolean): void { this.playing = playing; this.syncAmbient(); }
  private syncAmbient(): void {
    const c = this.context;
    const active = this.playing && this.level > 0 && c?.state === 'running';
    if (!active) {
      for (const voice of this.ambient) { voice.oscillator.stop(); voice.oscillator.disconnect(); voice.gain.disconnect(); }
      this.ambient = []; return;
    }
    if (this.ambient.length) return;
    this.ambient = AUDIO.ambient.map(frequency => {
      const oscillator = c.createOscillator(), gain = c.createGain();
      oscillator.frequency.value = frequency; gain.gain.value = AUDIO.ambientGain;
      oscillator.connect(gain); gain.connect(this.master!); oscillator.start();
      return { oscillator, gain };
    });
  }
  play(id: SoundId): void {
    const c = this.context;
    if (!c || c.state !== 'running' || this.level === 0 || document.hidden || !document.hasFocus() || this.voices.size >= AUDIO.voices) return;
    if (c.currentTime - (this.last.get(id) ?? -Infinity) < AUDIO.minInterval) return;
    this.last.set(id, c.currentTime);
    const sound = SOUNDS[id], oscillator = c.createOscillator(), gain = c.createGain(), at = c.currentTime;
    oscillator.type = sound.type; oscillator.frequency.setValueAtTime(sound.frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(sound.end, at + sound.duration);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(sound.gain, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + sound.duration);
    oscillator.connect(gain); gain.connect(this.master!); this.voices.add(oscillator); this.played++;
    oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(at); oscillator.stop(at + sound.duration);
  }
  silence(): void {
    this.setPlaying(false);
    for (const voice of this.voices) voice.stop();
  }
  get diagnostics(): object {
    const samples = new Float32Array(256); this.analyser?.getFloatTimeDomainData(samples);
    const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
    return { state: this.context?.state ?? 'locked', voices: this.voices.size, ambient: this.ambient.length, played: this.played, volume: this.level, rms, unavailable: this.failed };
  }
}
export const gameAudio = new GameAudio();
