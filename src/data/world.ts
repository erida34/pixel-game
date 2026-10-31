/** World distances are in pixels, sampling coordinates in tiles. */
export const WORLD = {
  tileSize: 32, chunkSize: 32, startRadius: 4, corridorPeriod: 16, corridorHalfWidth: 1,
  obstacleChance: 0.13, decorationChance: 0.22, obstacleRadius: 12,
  noiseScale: 10, broadNoiseScale: 29, grassThreshold: 0.42, cobbleThreshold: 0.59,
  environmentFps: 4, environmentFrames: 4
} as const;
