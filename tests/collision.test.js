import { describe, it, expect } from 'vitest';
import { CollisionWorld, STEP_HEIGHT } from '../src/core/collision.js';

const v = (x, y, z) => ({ x, y, z });

describe('CollisionWorld', () => {
  it('pushes a capsule out of an axis-aligned box', () => {
    const w = new CollisionWorld(() => 0);
    w.addBox(0, 0, 1, 1, 0, 0, 3);
    const p = v(1.2, 0, 0);
    expect(w.resolve(p, 0.4, 1.8)).toBe(true);
    expect(p.x).toBeCloseTo(1.4);
  });

  it('handles rotated boxes', () => {
    const w = new CollisionWorld(() => 0);
    w.addBox(0, 0, 2, 0.25, Math.PI / 4, 0, 3);
    // point along the box's rotated long axis is inside
    const d = Math.SQRT1_2;
    expect(w.pointInBox(w.all[0], 1.5 * d, -1.5 * d)).toBe(true);
    expect(w.pointInBox(w.all[0], 1.5 * d, 1.5 * d)).toBe(false);
  });

  it('pushes out of circles', () => {
    const w = new CollisionWorld(() => 0);
    w.addCircle(0, 0, 1, 0, 3);
    const p = v(0.5, 0, 0);
    w.resolve(p, 0.3, 1.8);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(1.3);
  });

  it('ignores colliders the capsule can step over', () => {
    const w = new CollisionWorld(() => 0);
    w.addBox(0, 0, 1, 1, 0, 0, STEP_HEIGHT - 0.1);
    const p = v(0.9, 0, 0);
    expect(w.resolve(p, 0.4, 1.8)).toBe(false);
    expect(w.groundHeight(0.5, 0, 0)).toBeCloseTo(STEP_HEIGHT - 0.1);
  });

  it('reports walkable tops only within step height', () => {
    const w = new CollisionWorld(() => 1);
    w.addBox(0, 0, 2, 2, 0, 0, 3);
    expect(w.groundHeight(0, 0, 0)).toBe(1);
    expect(w.groundHeight(0, 0, 3)).toBe(3);
  });

  it('segment hits boxes, circles and terrain', () => {
    const w = new CollisionWorld((x) => (x > 8 ? 5 : 0));
    w.addBox(3, 0, 0.5, 0.5, 0, 0, 2);
    const hitBox = w.segment(v(0, 1, 0), v(6, 1, 0));
    expect(hitBox.t).toBeCloseTo(2.5 / 6, 3);
    expect(w.segment(v(0, 3, 0), v(6, 3, 0))).toBeNull();
    const hitTerrain = w.segment(v(0, 3, 0), v(10, 3, 0), false);
    expect(hitTerrain.terrain).toBe(true);
    w.addCircle(0, 5, 1, 0, 2);
    expect(w.segment(v(-3, 1, 5), v(3, 1, 5)).t).toBeCloseTo(2 / 6, 3);
  });

  it('disabled colliders are ignored', () => {
    const w = new CollisionWorld(() => 0);
    const c = w.addBox(0, 0, 1, 1, 0, 0, 3);
    w.remove(c);
    const p = v(0.5, 0, 0);
    expect(w.resolve(p, 0.4, 1.8)).toBe(false);
  });
});
