/** Presentation only. Radii are base-resolution pixels, independent of weapon damage. */
export const ATMOSPHERE = {
  maxLights: 24,
  ambient: [0.25, 0.31, 0.42] as const,
  fogColor: [0.19, 0.27, 0.31] as const,
  fogDensity: 0.94,
  fogFloor: 0.80,
  fogFeather: 2.4,
  fire: { minIntensity: 0.68, intensityRange: 0.72, minRadius: 0.90, radiusRange: 0.16, sway: 2.4 },
  hero: { radius: 138, intensity: 1.08 },
  street: { radius: 112, intensity: 0.95 },
  moth: { radius: 45, intensity: 0.65 },
  spark: { radius: 19, intensity: 0.32 },
  colors: {
    amber: [1, 0.60, 0.20] as const,
    gold: [1, 0.82, 0.38] as const,
    cyan: [0.38, 0.80, 1] as const,
    violet: [0.78, 0.36, 0.80] as const,
  },
};
