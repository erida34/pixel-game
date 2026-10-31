import type { Direction } from './direction';
export interface Clip { state: string; direction: Direction | 'none'; frames: string[]; fps: number; repeat: number }
export interface Asset {
  id: string; type: 'atlas'; status: 'placeholder' | 'approved'; texture: string; atlas: string;
  frameSize: { width: number; height: number }; origin: { x: number; y: number };
  directions?: Direction[]; clips?: Clip[]; provenance: string;
  transitions?: { materials: string[]; maskToFrame: Record<string, string> };
}
export interface AssetManifest { version: number; assets: Asset[] }
