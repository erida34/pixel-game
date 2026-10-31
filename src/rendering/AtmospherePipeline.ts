import Phaser from 'phaser';
import { ATMOSPHERE } from '../data/atmosphere';
import { LightBuffer } from '../domain/lighting';

/** One base-resolution pass: colored diffuse light + moving world-space mist.
 * Texture sampling stays nearest-neighbour; no blur or bloom is applied to sprites. */
export class AtmospherePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  readonly lights: LightBuffer;
  time = 0; scrollX = 0; scrollY = 0; seed = 0; motion = true;
  constructor(game: Phaser.Game) {
    const renderer = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    // Two uniform vectors per light, plus room for the other uniforms. WebGL1 safe.
    const capacity = Math.max(1, Math.min(ATMOSPHERE.maxLights, Math.floor((renderer.gl.getParameter(renderer.gl.MAX_FRAGMENT_UNIFORM_VECTORS) - 12) / 2)));
    super({ game, name: 'Atmosphere', renderTarget: true, fragShader: `
      precision highp float;
      uniform sampler2D uMainSampler;
      varying vec2 outTexCoord;
      uniform vec2 uResolution;
      uniform vec2 uScroll;
      uniform float uTime;
      uniform float uSeed;
      uniform vec3 uAmbient;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform float uFogFloor;
      uniform float uFogFeather;
      uniform int uCount;
      uniform vec4 uLights[${capacity}];
      uniform vec3 uColors[${capacity}];
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32 + uSeed);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
      }
      float mist(vec2 p) {
        return noise(p) * 0.57 + noise(p * 2.03 + 13.7) * 0.29 + noise(p * 4.11 + 31.3) * 0.14;
      }
      void main() {
        vec4 source = texture2D(uMainSampler, outTexCoord);
        // PostFX render targets have their origin at the bottom left.
        vec2 pixel = vec2(outTexCoord.x, 1.0 - outTexCoord.y) * uResolution;
        vec3 illumination = uAmbient;
        vec3 scatter = vec3(0.0);
        float fogRemaining = 1.0;
        for (int i = 0; i < ${capacity}; ++i) {
          if (i < uCount) {
            vec4 light = uLights[i];
            vec2 delta = pixel - light.xy;
            float distanceSq = dot(delta, delta) / (light.z * light.z);
            float falloff = max(0.0, 1.0 - distanceSq);
            float energy = falloff * falloff * light.w;
            illumination += uColors[i] * energy * 1.28;
            scatter += uColors[i] * energy * 0.042;
            // Broad, smooth shoulder instead of a nearly empty circle with a hard rim.
            // The outer taper reaches zero smoothly at the existing culling radius.
            float feather = exp(-uFogFeather * distanceSq * distanceSq)
              * (1.0 - smoothstep(0.64, 1.0, distanceSq));
            float clearing = feather * min(1.0, light.w);
            // Combine overlapping clearings continuously, without max() ridges.
            fogRemaining *= 1.0 - clearing;
          }
        }
        // Two-pixel fog cells suit the pixel art. World anchoring prevents camera swimming.
        vec2 world = floor((pixel + uScroll) / 2.0) * 2.0;
        vec2 drift = vec2(uTime * 3.3, -uTime * 1.4);
        float cloud = mist((world + drift) / vec2(145.0, 83.0));
        float tendrils = noise((world - drift * 0.55) / vec2(76.0, 35.0) + cloud * 1.9);
        float fog = mix(uFogFloor, 1.0, smoothstep(0.24, 0.82, cloud * 0.78 + tendrils * 0.22)) * uFogDensity;
        fog *= mix(0.06, 1.0, fogRemaining);
        // Only actual flame/XP colors and attack-warning colors pierce unlit fog.
        // Pale wax faces are reflective surfaces, not emissive light sources.
        float fire = step(0.96, source.r) * step(0.60, source.g) * (1.0 - step(0.55, source.b));
        float warning = step(0.65, source.r) * step(0.42, source.b) * (1.0 - step(0.53, source.g));
        float needle = step(0.70, source.b) * step(0.65, source.g) * (1.0 - step(0.50, source.r));
        float emissive = max(fire, max(warning, needle));
        vec3 lit = source.rgb * min(illumination, vec3(1.48, 1.30, 1.15));
        lit = mix(lit, max(lit, source.rgb * 0.94), emissive);
        fog *= 1.0 - emissive * 0.76;
        gl_FragColor = vec4(mix(lit, uFogColor, fog) + scatter, source.a);
      }
    ` });
    this.lights = new LightBuffer(capacity);
  }
  onPreRender(): void {
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
    this.set2f('uScroll', this.scrollX, this.scrollY);
    this.set1f('uTime', this.motion ? this.time : 0);
    this.set1f('uSeed', this.seed % 997);
    this.set3f('uAmbient', ...ATMOSPHERE.ambient);
    this.set3f('uFogColor', ...ATMOSPHERE.fogColor);
    this.set1f('uFogDensity', ATMOSPHERE.fogDensity);
    this.set1f('uFogFloor', ATMOSPHERE.fogFloor);
    this.set1f('uFogFeather', ATMOSPHERE.fogFeather);
    this.set1i('uCount', this.lights.selected.length);
    this.set4fv('uLights[0]', this.lights.geometry);
    this.set3fv('uColors[0]', this.lights.colors);
  }
}
