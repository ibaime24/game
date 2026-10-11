// Heightfield terrain mesh with an exact triangle-interpolated height query.
import * as THREE from 'three';
import { groundDetail } from './textures.js';

export class Terrain {
  /**
   * @param {object} o
   * @param {number} o.size world size (square, centred on origin unless cx/cz)
   * @param {number} o.seg segments per side
   * @param {(x:number,z:number)=>number} o.heightFn
   * @param {(x,z,h,ny,out:number[])=>void} o.colorFn writes sRGB 0..1 into out
   */
  constructor({ size, seg, heightFn, colorFn, cx = 0, cz = 0, material = null, detailRepeat = 6, splat = false }) {
    this.size = size;
    this.seg = seg;
    this.step = size / seg;
    this.minX = cx - size / 2;
    this.minZ = cz - size / 2;
    const n = seg + 1;
    this.n = n;
    const heights = (this.heights = new Float32Array(n * n));
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        heights[j * n + i] = heightFn(this.minX + i * this.step, this.minZ + j * this.step);
      }
    }

    const pos = new Float32Array(n * n * 3);
    const uv = new Float32Array(n * n * 2);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const x = this.minX + i * this.step, z = this.minZ + j * this.step;
        pos[k * 3] = x; pos[k * 3 + 1] = heights[k]; pos[k * 3 + 2] = z;
        uv[k * 2] = x / detailRepeat; uv[k * 2 + 1] = z / detailRepeat;
      }
    }
    const idx = new Uint32Array(seg * seg * 6);
    let p = 0;
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const v00 = j * n + i, v10 = v00 + 1, v01 = v00 + n, v11 = v01 + 1;
        idx[p++] = v00; idx[p++] = v01; idx[p++] = v10;
        idx[p++] = v10; idx[p++] = v01; idx[p++] = v11;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();

    const normals = geo.attributes.normal.array;
    const col = new Float32Array(n * n * 3);
    const spl = splat ? new Float32Array(n * n * 4) : null;
    const spl2 = splat ? new Float32Array(n * n * 2) : null;
    const out = [0, 0, 0, 1, 0, 0, 0, 0, 0];
    const c = new THREE.Color();
    for (let k = 0; k < n * n; k++) {
      colorFn(pos[k * 3], pos[k * 3 + 2], pos[k * 3 + 1], normals[k * 3 + 1], out);
      if (splat) {
        // tint is linear and near 1; splat weights normalised
        col[k * 3] = out[0]; col[k * 3 + 1] = out[1]; col[k * 3 + 2] = out[2];
        const sum = out[3] + out[4] + out[5] + out[6] || 1;
        spl[k * 4] = out[3] / sum; spl[k * 4 + 1] = out[4] / sum; spl[k * 4 + 2] = out[5] / sum; spl[k * 4 + 3] = out[6] / sum;
        spl2[k * 2] = out[7]; spl2[k * 2 + 1] = out[8];
      } else {
        c.setRGB(out[0], out[1], out[2], THREE.SRGBColorSpace);
        col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (splat) {
      geo.setAttribute('splat', new THREE.BufferAttribute(spl, 4));
      geo.setAttribute('splat2', new THREE.BufferAttribute(spl2, 2));
    }
    geo.computeBoundingSphere();

    const mat = material || new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: groundDetail(),
      roughness: 0.95,
      metalness: 0,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    this.mesh.name = 'terrain';
  }

  heightAt(x, z) {
    const fx = (x - this.minX) / this.step;
    const fz = (z - this.minZ) / this.step;
    const n = this.n;
    let i = Math.floor(fx), j = Math.floor(fz);
    if (i < 0) i = 0; else if (i > n - 2) i = n - 2;
    if (j < 0) j = 0; else if (j > n - 2) j = n - 2;
    let tx = fx - i, tz = fz - j;
    tx = Math.min(1, Math.max(0, tx));
    tz = Math.min(1, Math.max(0, tz));
    const h = this.heights;
    const h00 = h[j * n + i], h10 = h[j * n + i + 1], h01 = h[(j + 1) * n + i], h11 = h[(j + 1) * n + i + 1];
    if (tx + tz <= 1) return h00 + (h10 - h00) * tx + (h01 - h00) * tz;
    return h11 + (h01 - h11) * (1 - tx) + (h10 - h11) * (1 - tz);
  }

  normalAt(x, z) {
    const e = this.step * 0.5;
    const hl = this.heightAt(x - e, z), hr = this.heightAt(x + e, z);
    const hd = this.heightAt(x, z - e), hu = this.heightAt(x, z + e);
    return new THREE.Vector3(hl - hr, 2 * e, hd - hu).normalize();
  }
}
