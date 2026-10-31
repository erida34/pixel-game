/** Original synthesized sound recipes; no samples, downloads or simulation RNG. */
export const SOUNDS = {
  pulse: { frequency: 180, end: 65, duration: 0.18, gain: 0.12, type: 'sine' },
  needle: { frequency: 980, end: 360, duration: 0.07, gain: 0.035, type: 'triangle' },
  bell: { frequency: 540, end: 510, duration: 0.4, gain: 0.08, type: 'sine' },
  pickup: { frequency: 680, end: 1050, duration: 0.09, gain: 0.04, type: 'sine' },
  hit: { frequency: 110, end: 45, duration: 0.16, gain: 0.1, type: 'triangle' },
  upgrade: { frequency: 520, end: 1040, duration: 0.3, gain: 0.1, type: 'triangle' },
  victory: { frequency: 330, end: 990, duration: 0.8, gain: 0.1, type: 'sine' },
  defeat: { frequency: 220, end: 55, duration: 0.7, gain: 0.1, type: 'triangle' },
  ui: { frequency: 440, end: 660, duration: 0.08, gain: 0.05, type: 'sine' }
} as const;
export type SoundId = keyof typeof SOUNDS;
export const AUDIO = { voices: 12, minInterval: 0.055, ambient: [110, 164.81, 220], ambientGain: 0.009 };
