// Final colour grade (applied after tone mapping, in display space) and a procedural sun flare.
import * as THREE from 'three';

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSaturation: { value: 1.1 },
    uContrast: { value: 1.06 },
    uWarmth: { value: 0.02 },
    uVignette: { value: 0.32 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uTexel: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
    uSharpen: { value: 0.35 },
    uNight: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uSaturation, uContrast, uWarmth, uVignette;
    uniform vec3 uTint;
    uniform vec2 uTexel;
    uniform float uSharpen;
    uniform float uNight;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // contrast-adaptive sharpening (after AMD's CAS): sharpen flat areas, leave strong edges alone
      vec3 n = texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb;
      vec3 s = texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb;
      vec3 e = texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb;
      vec3 w = texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb;
      vec3 mn = min(c.rgb, min(min(n, s), min(e, w)));
      vec3 mx = max(c.rgb, max(max(n, s), max(e, w)));
      vec3 amp = sqrt(clamp(min(mn, 1.0 - mx) / max(mx, 1e-4), 0.0, 1.0));
      vec3 wgt = -amp * mix(0.125, 0.2, uSharpen);
      vec3 col = clamp((c.rgb + (n + s + e + w) * wgt) / (1.0 + 4.0 * wgt), 0.0, 1.0);
      col = mix(c.rgb, col, clamp(uSharpen * 2.0, 0.0, 1.0));
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;
      // warm highlights, cool shadows (the classic Cyrodiil afternoon)
      col += vec3(uWarmth, uWarmth * 0.4, -uWarmth) * smoothstep(0.35, 1.0, l);
      col += vec3(-0.006, 0.0, 0.012) * (1.0 - smoothstep(0.0, 0.4, l));
      // night grade: shadows and midtones slide toward deep indigo; firelight stays warm and bright
      if (uNight > 0.0) {
        float ln = dot(col, vec3(0.299, 0.587, 0.114));
        float shadow = 1.0 - smoothstep(0.02, 0.55, ln);
        vec3 indigo = col * vec3(0.78, 0.82, 1.08) + vec3(0.003, 0.003, 0.016);
        col = mix(col, indigo, shadow * uNight * 0.55);
        float warmth = smoothstep(0.03, 0.2, col.r - col.b);
        col += vec3(0.05, 0.02, -0.01) * warmth * smoothstep(0.25, 0.9, ln) * uNight;
        col = mix(col, (col - 0.5) * 1.08 + 0.5, uNight * 0.6);
      }
      col *= uTint;
      vec2 v = vUv - 0.5;
      col *= 1.0 - dot(v, v) * uVignette * 1.6;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
    }`,
};

function flareTex(draw, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createSunFlare() {
  const glow = flareTex((ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,250,235,1)');
    g.addColorStop(0.12, 'rgba(255,240,200,0.8)');
    g.addColorStop(0.4, 'rgba(255,210,150,0.15)');
    g.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    // star streaks
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate((i / 6) * Math.PI);
      const sg = ctx.createLinearGradient(-S / 2, 0, S / 2, 0);
      sg.addColorStop(0, 'rgba(255,240,210,0)'); sg.addColorStop(0.5, 'rgba(255,240,210,0.35)'); sg.addColorStop(1, 'rgba(255,240,210,0)');
      ctx.fillStyle = sg; ctx.fillRect(-S / 2, -1.5, S, 3); ctx.restore();
    }
  }, 512);
  const ring = flareTex((ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(180,220,255,0.08)'); g.addColorStop(0.85, 'rgba(255,200,160,0.05)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  });
  const hex = flareTex((ctx, S) => {
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.lineTo(S / 2 + Math.cos(a) * S * 0.45, S / 2 + Math.sin(a) * S * 0.45); }
    ctx.closePath(); ctx.fill();
  }, 128);
  // sprite flare: the sun glow sits at the sun and is hidden by terrain via the depth test; the
  // ghosts are screen-space sprites mirrored through the centre (no framebuffer copies, MSAA-safe)
  const group = new THREE.Group();
  const sprite = (tex, color, depthTest) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, blending: THREE.AdditiveBlending, depthWrite: false, depthTest, transparent: true, fog: false }));
    s.renderOrder = 6;
    s.frustumCulled = false;
    return s;
  };
  const core = sprite(glow, new THREE.Color(1, 0.95, 0.85), true);
  const halo = sprite(ring, new THREE.Color(1, 1, 1), true);
  group.add(core, halo);
  const ghosts = new THREE.Group();
  const G = [[hex, 60, 0.45, [0.7, 0.9, 1]], [hex, 70, 0.62, [1, 0.8, 0.6]], [hex, 45, 0.8, [0.6, 1, 0.7]], [ring, 140, 1.0, [0.8, 0.85, 1]]]
    .map(([t, px, d, c]) => { const s = sprite(t, new THREE.Color(...c), false); s.userData = { px, d }; ghosts.add(s); return s; });
  const ndc = new THREE.Vector3(), tmp = new THREE.Vector3();
  let fade = 0;
  group.userData.ghosts = ghosts;
  /** Size the glow for the screen and place the ghosts along the flare axis. */
  group.userData.update = (camera, dt, occluded) => {
    const H = window.innerHeight;
    const worldPerPx = (dist) => (2 * dist * Math.tan((camera.fov * Math.PI) / 360)) / H;
    group.getWorldPosition(tmp);
    const dist = tmp.distanceTo(camera.position);
    core.scale.setScalar(420 * worldPerPx(dist));
    halo.scale.setScalar(260 * worldPerPx(dist));
    ndc.copy(tmp).project(camera);
    const onScreen = ndc.z < 1 && Math.abs(ndc.x) < 1.2 && Math.abs(ndc.y) < 1.2;
    fade += ((group.visible && onScreen && !occluded ? 1 : 0) - fade) * Math.min(1, dt * 6);
    ghosts.visible = fade > 0.02;
    for (const s of G) {
      const k = 1 - 2 * s.userData.d;
      tmp.set(ndc.x * k, ndc.y * k, 0.5).unproject(camera).sub(camera.position).normalize().multiplyScalar(6).add(camera.position);
      s.position.copy(tmp);
      s.scale.setScalar(s.userData.px * worldPerPx(6));
      s.material.opacity = fade;
    }
  };
  return group;
}
