// Lightweight collision world: a ground height function plus oriented boxes
// and vertical cylinders, bucketed in a spatial hash. Actors are vertical
// capsules approximated as circles in XZ with a vertical extent.

export const STEP_HEIGHT = 0.55;

let stampCounter = 1;

export class CollisionWorld {
  constructor(groundFn, cellSize = 16) {
    this.ground = groundFn || (() => 0);
    this.cellSize = cellSize;
    this.buckets = new Map();
    this.all = [];
    this.ceiling = Infinity;
    this._stamp = 0;
  }

  _key(ix, iz) {
    return ix * 73856093 ^ iz * 19349663;
  }

  _insert(c, bound) {
    const cs = this.cellSize;
    const x0 = Math.floor((c.x - bound) / cs), x1 = Math.floor((c.x + bound) / cs);
    const z0 = Math.floor((c.z - bound) / cs), z1 = Math.floor((c.z + bound) / cs);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const k = this._key(ix, iz);
        let b = this.buckets.get(k);
        if (!b) { b = []; this.buckets.set(k, b); }
        b.push(c);
      }
    }
    this.all.push(c);
  }

  /** Oriented box. rot is rotation about Y (radians, same convention as Object3D.rotation.y). */
  addBox(x, z, hx, hz, rot = 0, y0 = -1000, y1 = 1000, opts = {}) {
    const c = {
      type: 'box', x, z, hx, hz, rot, y0, y1,
      cos: Math.cos(rot), sin: Math.sin(rot),
      walkable: opts.walkable !== false, tag: opts.tag || null, _s: 0,
    };
    this._insert(c, Math.hypot(hx, hz));
    return c;
  }

  addCircle(x, z, r, y0 = -1000, y1 = 1000, opts = {}) {
    const c = { type: 'circle', x, z, r, y0, y1, walkable: opts.walkable !== false, tag: opts.tag || null, _s: 0 };
    this._insert(c, r);
    return c;
  }

  remove(c) {
    c.disabled = true;
  }

  query(x, z, r) {
    const cs = this.cellSize;
    const out = [];
    const stamp = ++stampCounter;
    const x0 = Math.floor((x - r) / cs), x1 = Math.floor((x + r) / cs);
    const z0 = Math.floor((z - r) / cs), z1 = Math.floor((z + r) / cs);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const b = this.buckets.get(this._key(ix, iz));
        if (!b) continue;
        for (let i = 0; i < b.length; i++) {
          const c = b[i];
          if (c._s === stamp || c.disabled) continue;
          c._s = stamp;
          out.push(c);
        }
      }
    }
    return out;
  }

  // world -> box local
  _toLocal(c, x, z) {
    const dx = x - c.x, dz = z - c.z;
    // inverse rotation about Y. Object3D rotation.y = r maps local (lx,lz) to
    // world (lx*cos + lz*sin, -lx*sin + lz*cos).
    return [dx * c.cos - dz * c.sin, dx * c.sin + dz * c.cos];
  }

  _toWorldDir(c, lx, lz) {
    return [lx * c.cos + lz * c.sin, -lx * c.sin + lz * c.cos];
  }

  pointInBox(c, x, z, margin = 0) {
    const [lx, lz] = this._toLocal(c, x, z);
    return Math.abs(lx) <= c.hx + margin && Math.abs(lz) <= c.hz + margin;
  }

  /** Highest walkable surface at or below feetY + STEP_HEIGHT. */
  groundHeight(x, z, feetY = Infinity, radius = 0.3) {
    let h = this.ground(x, z);
    const list = this.query(x, z, radius + 0.1);
    const limit = feetY + STEP_HEIGHT;
    for (const c of list) {
      if (!c.walkable || c.y1 > limit || c.y1 <= h) continue;
      if (c.type === 'box') {
        if (this.pointInBox(c, x, z, -0.05 + radius * 0.5)) h = c.y1;
      } else if (Math.hypot(x - c.x, z - c.z) < c.r + radius * 0.5) {
        h = c.y1;
      }
    }
    return h;
  }

  /** Push a vertical capsule (feet at pos.y) out of colliders. Mutates pos. Returns true if collided. */
  resolve(pos, radius, height) {
    let hit = false;
    for (let pass = 0; pass < 3; pass++) {
      const list = this.query(pos.x, pos.z, radius + 1);
      let moved = false;
      for (const c of list) {
        if (c.y1 <= pos.y + STEP_HEIGHT || c.y0 >= pos.y + height) continue;
        if (c.type === 'circle') {
          const dx = pos.x - c.x, dz = pos.z - c.z;
          const d = Math.hypot(dx, dz);
          const min = c.r + radius;
          if (d < min) {
            const nx = d > 1e-5 ? dx / d : 1, nz = d > 1e-5 ? dz / d : 0;
            pos.x = c.x + nx * min;
            pos.z = c.z + nz * min;
            moved = hit = true;
          }
        } else {
          const [lx, lz] = this._toLocal(c, pos.x, pos.z);
          const cx = Math.max(-c.hx, Math.min(c.hx, lx));
          const cz = Math.max(-c.hz, Math.min(c.hz, lz));
          let dx = lx - cx, dz = lz - cz;
          const d = Math.hypot(dx, dz);
          if (d >= radius) continue;
          let px, pz;
          if (d > 1e-5) {
            px = (dx / d) * (radius - d);
            pz = (dz / d) * (radius - d);
          } else {
            // centre inside the box: push out along the axis of least penetration
            const ox = c.hx - Math.abs(lx) + radius;
            const oz = c.hz - Math.abs(lz) + radius;
            if (ox < oz) { px = Math.sign(lx || 1) * ox; pz = 0; } else { px = 0; pz = Math.sign(lz || 1) * oz; }
          }
          const [wx, wz] = this._toWorldDir(c, px, pz);
          pos.x += wx;
          pos.z += wz;
          moved = hit = true;
        }
      }
      if (!moved) break;
    }
    return hit;
  }

  /**
   * Segment test from a to b (objects with x,y,z). Returns {t, point, normal?, collider} or null.
   * Terrain is tested by sampling along the segment.
   */
  segment(a, b, ignoreTerrain = false) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz);
    let best = null;
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    const list = this.query(mx, mz, len / 2 + 1);
    for (const c of list) {
      let t = null;
      if (c.type === 'box') {
        const [ax, az] = this._toLocal(c, a.x, a.z);
        const [bx, bz] = this._toLocal(c, b.x, b.z);
        t = slab3(ax, a.y, az, bx - ax, dy, bz - az, -c.hx, c.y0, -c.hz, c.hx, c.y1, c.hz);
      } else {
        t = segCircle(a.x - c.x, a.z - c.z, dx, dz, c.r);
        if (t !== null) {
          const y = a.y + dy * t;
          if (y < c.y0 || y > c.y1) t = null;
        }
      }
      if (t !== null && (!best || t < best.t)) best = { t, collider: c };
    }
    if (!ignoreTerrain) {
      const steps = Math.max(2, Math.ceil(len / 0.5));
      const limit = best ? best.t : 1;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        if (t > limit) break;
        const x = a.x + dx * t, y = a.y + dy * t, z = a.z + dz * t;
        if (y < this.ground(x, z)) {
          best = { t: Math.max(0, t - 0.5 / steps), collider: null, terrain: true };
          break;
        }
      }
      if (this.ceiling < Infinity) {
        const y = a.y + dy * (best ? best.t : 1);
        if (y > this.ceiling && dy > 0) {
          const t = (this.ceiling - a.y) / dy;
          if (t >= 0 && (!best || t < best.t)) best = { t, collider: null };
        }
      }
    }
    if (best) {
      best.point = { x: a.x + dx * best.t, y: a.y + dy * best.t, z: a.z + dz * best.t };
    }
    return best;
  }

  /** Line of sight between two points (ignores walkable boxes below eye height? no: tests everything). */
  lineOfSight(a, b) {
    return this.segment(a, b) === null;
  }
}

function slab3(ox, oy, oz, dx, dy, dz, minx, miny, minz, maxx, maxy, maxz) {
  let tmin = 0, tmax = 1;
  const o = [ox, oy, oz], d = [dx, dy, dz], mn = [minx, miny, minz], mx = [maxx, maxy, maxz];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < mn[i] || o[i] > mx[i]) return null;
    } else {
      let t1 = (mn[i] - o[i]) / d[i];
      let t2 = (mx[i] - o[i]) / d[i];
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

function segCircle(ox, oz, dx, dz, r) {
  const a = dx * dx + dz * dz;
  const b = 2 * (ox * dx + oz * dz);
  const c = ox * ox + oz * oz - r * r;
  if (c <= 0) return 0;
  if (a < 1e-12) return null;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
