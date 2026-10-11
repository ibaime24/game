// Splat-mapped terrain material: MeshStandardMaterial with injected texture blending.
// Vertex attributes: splat (grass, dirt, rock, sand), splat2 (snow, cobble), color (macro tint).
import * as THREE from 'three';
import * as TG from './texgen.js';

export function createTerrainMaterial() {
  const grass = TG.grassTex(), dirt = TG.dirtTex(), rock = TG.rockTex(), sand = TG.sandTex(), snow = TG.snowTex(), cobble = TG.cobbleTex();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  const uniforms = {
    tGrass: { value: grass.map }, tDirt: { value: dirt.map }, tRock: { value: rock.map },
    tSand: { value: sand.map }, tSnow: { value: snow.map }, tCobble: { value: cobble.map },
    nGrass: { value: grass.normalMap }, nDirt: { value: dirt.normalMap }, nRock: { value: rock.normalMap }, nCobble: { value: cobble.normalMap },
    // photo textures need real-world tiling and a push toward Cyrodiil's lush green
    uScale: { value: grass.photo ? new THREE.Vector4(1 / 2.6, 1 / 3.0, 1 / 6.5, 1 / 4.0) : new THREE.Vector4(1 / 6.5, 1.2 / 6.5, 1 / 11, 1 / 6.5) },
    uGrassTint: { value: grass.photo ? new THREE.Vector3(0.62, 0.92, 0.38) : new THREE.Vector3(1, 1, 1) },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 splat;
        attribute vec2 splat2;
        varying vec4 vSplat;
        varying vec2 vSplat2;
        varying vec3 vWPos;
        varying vec3 vWNormal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vSplat = splat;
        vSplat2 = splat2;
        vWPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vWNormal = normalize(mat3(modelMatrix) * normal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D tGrass, tDirt, tRock, tSand, tSnow, tCobble, nGrass, nDirt, nRock, nCobble;
        uniform vec4 uScale;
        uniform vec3 uGrassTint;
        varying vec4 vSplat;
        varying vec2 vSplat2;
        varying vec3 vWPos;
        varying vec3 vWNormal;
        vec4 tri(sampler2D t, vec3 p, vec3 w, float s) {
          return texture2D(t, p.zy * s) * w.x + texture2D(t, p.xz * s) * w.y + texture2D(t, p.xy * s) * w.z;
        }
        mat3 terrainTBN(vec3 eye_pos, vec3 surf_norm, vec2 uv) {
          vec3 q0 = dFdx(eye_pos); vec3 q1 = dFdy(eye_pos);
          vec2 st0 = dFdx(uv); vec2 st1 = dFdy(uv);
          vec3 N = surf_norm;
          vec3 q1perp = cross(q1, N); vec3 q0perp = cross(N, q0);
          vec3 T = q1perp * st0.x + q0perp * st1.x;
          vec3 B = q1perp * st0.y + q0perp * st1.y;
          float det = max(dot(T, T), dot(B, B));
          float sc = (det == 0.0) ? 0.0 : inversesqrt(det);
          return mat3(T * sc, B * sc, N);
        }
        vec4 gTerrainW;
        vec2 gTerrainUV;
        float gSnow, gCobble;`)
      .replace('#include <map_fragment>', `
        {
          vec2 uvA = vWPos.xz * uScale.x;
          vec2 uvD = vWPos.xz * uScale.y;
          vec2 uvS = vWPos.xz * uScale.w;
          gTerrainUV = uvA;
          vec3 an = abs(normalize(vWNormal));
          // rock: blend a top-down and a side projection (cheap two-tap triplanar)
          vec2 side = an.x > an.z ? vWPos.zy : vWPos.xy;
          float sideW = smoothstep(0.85, 0.55, an.y);
          vec4 macroT = texture2D(tDirt, vWPos.xz / 173.0);
          float macro = macroT.r * 1.4 + macroT.g * 0.6 - 0.75;
          vec4 g = mix(texture2D(tGrass, uvA), texture2D(tGrass, uvA * 0.27 + 0.13), 0.4);
          g.rgb *= uGrassTint;
          vec4 d = texture2D(tDirt, uvD);
          vec4 r = mix(texture2D(tRock, vWPos.xz * uScale.z), texture2D(tRock, side * uScale.z), sideW);
          vec4 s = texture2D(tSand, uvS);
          vec4 sn = texture2D(tSnow, uvS * 0.8);
          vec4 cb = texture2D(tCobble, vWPos.xz / 2.4);
          // height-aware splat: textures with taller features win at transitions
          vec4 w = vSplat;
          vec4 hgt = vec4(dot(g.rgb, vec3(0.33)), dot(d.rgb, vec3(0.33)), dot(r.rgb, vec3(0.33)), dot(s.rgb, vec3(0.33)));
          w = max(w * (0.6 + hgt * 1.4) - 0.05, 0.0);
          w = pow(w, vec4(1.6));
          w /= max(1e-4, w.x + w.y + w.z + w.w);
          gTerrainW = w;
          vec3 col = g.rgb * w.x + d.rgb * w.y + r.rgb * w.z + s.rgb * w.w;
          col *= 1.0 + macro * 0.22;
          gSnow = smoothstep(0.25, 0.65, vSplat2.x + (sn.r - 0.5) * 0.4 - (1.0 - an.y) * 0.6);
          gCobble = smoothstep(0.2, 0.6, vSplat2.y + (cb.r - 0.45) * 0.6);
          col = mix(col, cb.rgb * 0.8, gCobble);
          col = mix(col, sn.rgb, gSnow);
          // gentle desaturation toward Oblivion's soft palette
          float lum = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(vec3(lum), col, 0.82);
          diffuseColor.rgb *= col * 1.55;
        }`)
      .replace('#include <normal_fragment_maps>', `
        {
          vec3 ng = texture2D(nGrass, gTerrainUV).xyz * 2.0 - 1.0;
          vec3 nd = texture2D(nDirt, vWPos.xz * uScale.y).xyz * 2.0 - 1.0;
          vec3 nr = texture2D(nRock, vWPos.xz * uScale.z).xyz * 2.0 - 1.0;
          vec3 mapN = ng * gTerrainW.x * 0.45 + nd * (gTerrainW.y + gTerrainW.w * 0.4) * 0.8 + nr * gTerrainW.z;
          mapN.z = 1.0;
          if (gCobble > 0.01) { vec3 nc = texture2D(nCobble, vWPos.xz / 2.4).xyz * 2.0 - 1.0; mapN = mix(mapN, nc, gCobble * 0.8); }
          mapN = mix(mapN, vec3(0.0, 0.0, 1.0), gSnow * 0.7);
          mat3 tbn = terrainTBN(-vViewPosition, normal, gTerrainUV);
          normal = normalize(tbn * normalize(mapN));
        }`);
  };
  mat.customProgramCacheKey = () => 'terrain-splat-v3';
  return mat;
}
