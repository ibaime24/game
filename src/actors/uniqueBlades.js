// Five legendary swords, each with its own silhouette and materials (their living effects are in fx/bladefx.js):
//  Sunfall        — a broad golden blade with a white-hot core and a sunburst guard.
//  Starfang       — a slender midnight sabre with a glowing edge, a crescent-moon guard and a star pommel.
//  Winter's Edge  — a jagged blade of clear blue ice, crystals bursting from the guard.
//  Verdant Thorn  — a green-gold blade wound with a living vine, leaves and two glowing blossoms.
//  Voidreaver     — a black Daedric cleaver, serrated and hooked, split by veins of red light.
// Every blade points up +Y from a guard at y≈0.1, the grip running down to the pommel (as buildWeaponMesh).
import * as THREE from 'three';

const TAU = Math.PI * 2;
const cache = new Map();
const std = (key, o) => { if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial(o)); return cache.get(key); };
const M = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; };

/** Extrude a blade outline (points up the +Y axis) into a bevelled, double-edged blade. */
function bladeFrom(points, depth = 0.005, bevel = 0.008) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel * 0.6, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}
/** A flat strip following the blade's centre (glowing cores, fullers, veins). */
function strip(points, w, mat, z = 0.0075) {
  z = Math.max(z, 0.0125);
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x - w / 2, y) : s.moveTo(x - w / 2, y)));
  for (let i = points.length - 1; i >= 0; i--) s.lineTo(points[i][0] + w / 2, points[i][1]);
  s.closePath();
  const g = new THREE.ShapeGeometry(s);
  const a = M(g, mat, 0, 0, z), b = M(g, mat, 0, 0, -z);
  b.rotation.y = Math.PI;
  b.position.x = 0;
  const grp = new THREE.Group();
  grp.add(a, b);
  // the back strip must mirror in x since it's rotated: flip it back
  b.scale.x = -1;
  return grp;
}
function grip(g, len, color, wrapColor) {
  g.add(M(new THREE.CylinderGeometry(0.018, 0.021, len, 10), std('grip' + color, { color, roughness: 0.85 }), 0, 0.1 - len / 2 - 0.01, 0));
  const wrap = std('wrap' + wrapColor, { color: wrapColor, roughness: 0.6, metalness: 0.5 });
  for (let k = 0; k < 6; k++) { const t = M(new THREE.TorusGeometry(0.02, 0.0035, 4, 10), wrap, 0, 0.08 - k * (len / 6), 0); t.rotation.x = Math.PI / 2; g.add(t); }
}

export function buildUniqueBlade(look) {
  const g = new THREE.Group();
  const L = look.len || 1;
  switch (look.design) {
    case 'sunfall': {
      const gold = std('sun_gold', { color: 0xf0c050, metalness: 1, roughness: 0.18, emissive: 0x6a3a00, emissiveIntensity: 0.35 });
      const white = std('sun_white', { color: 0xffffff, emissive: 0xffd890, emissiveIntensity: 2.6 });
      // broad, slightly flared blade with a long clipped point
      const w = 0.034;
      g.add(M(bladeFrom([[-w, 0.1], [-w * 1.15, 0.1 + L * 0.55], [-w * 0.95, 0.1 + L * 0.84], [0, 0.1 + L + 0.06], [w * 0.95, 0.1 + L * 0.84], [w * 1.15, 0.1 + L * 0.55], [w, 0.1]], 0.006, 0.01), gold));
      g.add(strip([[0, 0.12], [0, 0.1 + L * 0.85], [0, 0.1 + L * 0.98]], 0.012, white));
      // sunburst guard: a disc and twelve rays
      const disc = M(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 20), gold, 0, 0.1, 0);
      disc.rotation.x = Math.PI / 2;
      g.add(disc);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU, len = i % 2 ? 0.05 : 0.085;
        const ray = M(new THREE.ConeGeometry(0.012, len, 4), gold, Math.cos(a) * (0.045 + len / 2), 0.1 + Math.sin(a) * (0.045 + len / 2), 0);
        ray.rotation.z = a - Math.PI / 2;
        g.add(ray);
      }
      g.add(M(new THREE.SphereGeometry(0.022, 12, 10), white, 0, 0.1, 0.012));
      grip(g, 0.2, 0xf6efe0, 0xd8b050);
      g.add(M(new THREE.SphereGeometry(0.03, 14, 10), white, 0, -0.12, 0));
      break;
    }
    case 'starfang': {
      const night = std('star_night', { color: 0x141c3a, metalness: 0.9, roughness: 0.22 });
      const edge = std('star_edge', { color: 0xd8e8ff, emissive: 0x7ab0ff, emissiveIntensity: 2.4 });
      const silver = std('star_silver', { color: 0xdfe6f0, metalness: 1, roughness: 0.2 });
      // a slender sabre with a gentle curve
      const pts = [];
      const n = 10;
      for (let i = 0; i <= n; i++) { const t = i / n; pts.push([-0.022 * (1 - t * 0.6) + Math.pow(t, 2) * 0.07, 0.1 + t * L]); }
      const tip = [0.07 + 0.012, 0.1 + L + 0.07];
      const right = [];
      for (let i = n; i >= 0; i--) { const t = i / n; right.push([0.022 * (1 - t * 0.6) + Math.pow(t, 2) * 0.07, 0.1 + t * L]); }
      g.add(M(bladeFrom([...pts, tip, ...right], 0.004, 0.006), night));
      // the cutting edge glows: a thin bright strip along the outside of the curve
      g.add(strip(right.slice().reverse().map(([x, y]) => [x - 0.004, y]), 0.006, edge, 0.0062));
      // crescent-moon guard
      const moon = M(new THREE.TorusGeometry(0.07, 0.012, 6, 20, Math.PI * 1.25), silver, 0, 0.11, 0);
      moon.rotation.z = Math.PI * 1.13;
      g.add(moon);
      grip(g, 0.19, 0x1a1a3a, 0xc8d4e8);
      const pom = M(new THREE.OctahedronGeometry(0.035, 0), edge, 0, -0.125, 0);
      pom.scale.set(1, 1.3, 0.35);
      g.add(pom);
      break;
    }
    case 'winters_edge': {
      const ice = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.82, emissive: 0x4a9ae8, emissiveIntensity: 0.7, clearcoat: 1, forceSinglePass: true });
      const core = std('ice_core', { color: 0xe8f8ff, emissive: 0x9ad8ff, emissiveIntensity: 2.0 });
      const frost = std('ice_silver', { color: 0xd8e8f4, metalness: 0.8, roughness: 0.3 });
      // a jagged crystal blade: notched edges like ice that grew in layers
      const w = 0.03, pts = [[-w, 0.1]];
      for (let i = 1; i < 8; i++) { const y = 0.1 + (i / 8) * L * 0.9; pts.push([-w * (1.15 - i * 0.06), y - 0.03], [-w * (1.45 - i * 0.07), y]); }
      pts.push([0, 0.1 + L + 0.08]);
      for (let i = 7; i >= 1; i--) { const y = 0.1 + (i / 8) * L * 0.9; pts.push([w * (1.45 - i * 0.07), y], [w * (1.15 - i * 0.06), y - 0.03]); }
      pts.push([w, 0.1]);
      g.add(M(bladeFrom(pts, 0.012, 0.006), ice));
      g.add(strip([[0, 0.12], [0, 0.1 + L * 0.9]], 0.01, core, 0.0095));
      // crystals bursting from the guard
      for (let i = 0; i < 7; i++) {
        const a = -1.1 + i * (2.2 / 6);
        const len = 0.06 + (i % 2 ? 0.05 : 0.09);
        const c = M(new THREE.ConeGeometry(0.014, len, 6), ice, Math.sin(a) * (0.03 + len / 2), 0.1 + Math.cos(a) * 0.01 - Math.abs(Math.sin(a)) * 0.01, 0);
        c.rotation.z = -a + (a > 0 ? -Math.PI / 2 : Math.PI / 2) * 0.9;
        g.add(c);
      }
      g.add(M(new THREE.BoxGeometry(0.1, 0.024, 0.03), frost, 0, 0.1, 0));
      grip(g, 0.2, 0x2a3a5a, 0xd8e8f4);
      g.add(M(new THREE.OctahedronGeometry(0.03, 0), ice, 0, -0.125, 0));
      break;
    }
    case 'verdant_thorn': {
      const blade = std('thorn_blade', { color: 0x9ac87a, metalness: 0.75, roughness: 0.3, emissive: 0x1a4a10, emissiveIntensity: 0.4 });
      const vine = std('thorn_vine', { color: 0x3a6a2a, roughness: 0.8 });
      const leaf = new THREE.MeshStandardMaterial({ color: 0x5aa83a, roughness: 0.7, side: THREE.DoubleSide });
      const bloom = std('thorn_bloom', { color: 0xffd0f0, emissive: 0xff70c0, emissiveIntensity: 1.8 });
      const wood = std('thorn_wood', { color: 0x5a3a20, roughness: 0.9 });
      const w = 0.026;
      g.add(M(bladeFrom([[-w, 0.1], [-w * 1.05, 0.1 + L * 0.7], [0, 0.1 + L + 0.05], [w * 1.05, 0.1 + L * 0.7], [w, 0.1]], 0.005, 0.008), blade));
      // a vine spiralling up the blade, with leaves and thorns along it
      const pts = [];
      for (let i = 0; i <= 40; i++) { const t = i / 40; const a = t * TAU * 3.2; pts.push(new THREE.Vector3(Math.cos(a) * 0.034 * (1 - t * 0.5), 0.1 + t * L * 0.78, Math.sin(a) * 0.016)); }
      const curve = new THREE.CatmullRomCurve3(pts);
      g.add(M(new THREE.TubeGeometry(curve, 80, 0.0055, 5), vine));
      for (let i = 0; i < 9; i++) {
        const t = 0.06 + i * 0.1, p = curve.getPoint(t);
        const lf = M(new THREE.CircleGeometry(0.02, 6), leaf, p.x, p.y, p.z);
        lf.scale.set(0.55, 1.2, 1);
        lf.rotation.set(0.3, i * 1.7, (i % 2 ? 1 : -1) * 0.9);
        g.add(lf);
        if (i % 2) { const th = M(new THREE.ConeGeometry(0.004, 0.02, 4), vine, p.x * 1.15, p.y, p.z * 1.15); th.rotation.z = p.x > 0 ? -1.2 : 1.2; g.add(th); }
      }
      for (const t of [0.3, 0.7]) { const p = curve.getPoint(t); g.add(M(new THREE.SphereGeometry(0.013, 8, 6), bloom, p.x * 1.2, p.y, p.z * 1.4)); }
      // a guard of curling roots
      for (const s of [-1, 1]) { const root = M(new THREE.TorusGeometry(0.04, 0.009, 6, 12, Math.PI * 1.2), wood, s * 0.05, 0.1, 0); root.rotation.z = s > 0 ? -0.3 : Math.PI + 0.3; g.add(root); }
      grip(g, 0.19, 0x4a3018, 0x3a6a2a);
      g.add(M(new THREE.SphereGeometry(0.024, 10, 8), bloom, 0, -0.12, 0));
      break;
    }
    case 'voidreaver': {
      const black = std('void_black', { color: 0x1a1214, metalness: 0.85, roughness: 0.3 });
      const vein = std('void_vein', { color: 0xff6040, emissive: 0xff2010, emissiveIntensity: 3.2 });
      const horn = std('void_horn', { color: 0x2a1010, metalness: 0.6, roughness: 0.4 });
      // a wide cleaver with serrated teeth on one edge and a hook near the tip
      const w = 0.04, pts = [[-w, 0.1]];
      for (let i = 1; i <= 9; i++) { const y = 0.1 + (i / 10) * L; pts.push([-w * 1.05 - 0.018, y - 0.04], [-w * 1.05, y]); }
      pts.push([-w * 1.6, 0.1 + L * 0.93], [-w * 0.6, 0.1 + L * 0.95], [0.012, 0.1 + L + 0.08], [w * 1.2, 0.1 + L * 0.8], [w * 1.1, 0.1 + L * 0.4], [w * 1.25, 0.1 + L * 0.2], [w, 0.1]);
      g.add(M(bladeFrom(pts, 0.007, 0.008), black));
      // branching veins of red light
      g.add(strip([[0.004, 0.12], [-0.006, 0.1 + L * 0.35], [0.006, 0.1 + L * 0.65], [-0.002, 0.1 + L * 0.92]], 0.008, vein, 0.0082));
      g.add(strip([[-0.006, 0.1 + L * 0.35], [-0.028, 0.1 + L * 0.48]], 0.005, vein, 0.0082));
      g.add(strip([[0.006, 0.1 + L * 0.65], [0.03, 0.1 + L * 0.74]], 0.005, vein, 0.0082));
      // a guard of swept-back horns, and a burning gem at its heart
      for (const s of [-1, 1]) {
        for (let k = 0; k < 4; k++) {
          const c = M(new THREE.CylinderGeometry(0.004 + (3 - k) * 0.004, 0.006 + (3 - k) * 0.004, 0.04, 6), horn, s * (0.03 + k * 0.03), 0.1 - k * k * 0.006, 0);
          c.rotation.z = s * (1.3 + k * 0.25);
          g.add(c);
        }
      }
      g.add(M(new THREE.OctahedronGeometry(0.025, 0), vein, 0, 0.1, 0.01));
      grip(g, 0.21, 0x1a0a0a, 0x6a1010);
      const pom = M(new THREE.ConeGeometry(0.025, 0.06, 5), horn, 0, -0.14, 0);
      pom.rotation.x = Math.PI;
      g.add(pom);
      break;
    }
  }
  return g;
}
