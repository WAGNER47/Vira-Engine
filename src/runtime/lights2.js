/* VIRA LIGHTS 2: colour temperature (1000 K to 12000 K), professional light animations, light shafts and glow you
   control per light, dust drifting inside the beam, falloff and edge softness. Runs in the editor and in the game. */
(function () {
'use strict';
const ENG = window.ENG;
ENG.kelvin = K => { const t = Math.max(10, Math.min(120, K / 100)); let r, g, b; if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307; } else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); b = 255; } const c = v => Math.max(0, Math.min(255, v)) / 255; return new THREE.Color(c(r), c(g), c(b)); };
const hsh = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }, vn = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hsh(i) + (hsh(i + 1) - hsh(i)) * u; };
ENG.LIGHT_FX = ['steady', 'candle', 'fire', 'fluorescent', 'broken neon', 'strobe', 'pulse', 'lightning', 'tv screen', 'alarm beacon', 'sputter', 'dying bulb'];
ENG.lightFx = (mode, t, a, seed) => { t += seed || 0; switch (mode) {
  case 'candle': return 1 - a * (.28 * vn(t * 7) + .14 * vn(t * 17 + 3) + (hsh(Math.floor(t * 9)) < .04 ? .3 : 0));
  case 'fire': return 1 + a * ((vn(t * 5) - .5) * .7 + (vn(t * 13 + 7) - .5) * .36 + (vn(t * 31) - .5) * .16);
  case 'fluorescent': { const w = Math.floor(t * 14); if (hsh(w + 5) < .075 * a) return .15 + .3 * hsh(w); return 1 - a * .04 * (hsh(Math.floor(t * 120)) - .5); }
  case 'broken neon': { const w = Math.floor(t * 9); if (vn(t * .6) > .6 && hsh(w * 3.1) < .55 * a) return hsh(w) * .3; return 1 - a * .08 * hsh(Math.floor(t * 60)); }
  case 'strobe': return ((t * 6) % 1) < .18 ? 1 : 1 - a;
  case 'pulse': return 1 - a * (.5 - .5 * Math.sin(t * Math.PI));
  case 'lightning': { const c = Math.floor(t / 7), st = c * 7 + 2 + hsh(c) * 4, d = t - st; let f = 0; if (d > 0 && d < 1.4) f = Math.max(Math.exp(-d * 18), d > .18 ? Math.exp(-(d - .18) * 14) * .8 : 0, d > .45 ? Math.exp(-(d - .45) * 9) * .55 : 0); return (1 - a) + a * f * 2.2; }
  case 'tv screen': { const w = Math.floor(t * 5 + vn(t) * 2); return 1 - a * .55 * hsh(w) + a * .06 * (vn(t * 30) - .5); }
  case 'alarm beacon': return (1 - a) + a * Math.pow(Math.max(0, Math.cos(t * Math.PI * 1.2)), 6) * 1.4;
  case 'sputter': { const w = Math.floor(t * 18); return hsh(w) < .3 * a ? .1 + .2 * hsh(w + 9) : 1 - a * .1 * vn(t * 40); }
  case 'dying bulb': return Math.max(0, 1 - a * (.6 * Math.pow(vn(t * .8), 3) + (hsh(Math.floor(t * 25)) < .06 * a ? .7 : 0) + .05 * vn(t * 50)));
  default: return 1; } };
let _dt = null; const dustTex = () => _dt || (_dt = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })());
const COMMON = {
  temp: { t: 'bool', d: false, l: 'Use colour temperature' }, kelvin: { t: 'num', d: 3200, min: 1000, max: 12000, step: 100, l: 'Temperature (K): 1000 candle, 3200 tungsten, 5600 daylight, 9000 sky' },
  fx: { t: 'sel', d: 'steady', o: ENG.LIGHT_FX, l: 'Animation' }, fxSpeed: { t: 'num', d: 1, min: .1, max: 5, step: .05, l: 'Animation speed' }, fxAmount: { t: 'num', d: .6, min: 0, max: 1, step: .05, l: 'Animation amount' },
  dust: { t: 'num', d: 0, min: 0, max: 1, step: .05, l: 'Dust in the light' }, glow: { t: 'num', d: 0, min: 0, max: 2, step: .05, l: 'Visible glow (flare)' }, decay: { t: 'num', d: 2, min: 0, max: 3, step: .1, l: 'Falloff' }, fixture: { t: 'bool', d: false, l: 'Show bulb or lamp in game' }
};
const ID = o => { const s = String(o.id || ''); let n = 0; for (let i = 0; i < s.length; i++) n = n * 31 + s.charCodeAt(i) | 0; return Math.abs(n % 1000) / 10; };
function rig(g, o, type) {
  let L = null; g.traverse(n => { if (!L && (n.isPointLight || n.isSpotLight)) L = n; }); if (!L) return; const p = o.props;
  if (p.temp) L.color.copy(ENG.kelvin(+p.kelvin || 3200)); if (p.decay != null) L.decay = +p.decay; if (L.isSpotLight && p.softness != null) L.penumbra = +p.softness;
  L.userData.shaft = type === 'spotlight' ? (p.shaft == null ? 1 : +p.shaft) : 0; L.userData.glow = +p.glow || 0;
  const fx = p.fx || 'steady', dustA = +p.dust || 0; if (fx === 'steady' && !dustA) return;
  const N = dustA > 0 ? Math.round(40 + dustA * 300) : 1, pos = new Float32Array(N * 3), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: .075, map: dustTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: L.color.clone(), opacity: 0, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.raycast = () => { }; pts.userData.lightDust = true; pts.renderOrder = 6; g.add(pts);
  const D = []; for (let i = 0; i < N; i++) D.push({ h: Math.random(), r: Math.sqrt(Math.random()), th: Math.random() * 6.283, vh: (Math.random() - .5) * .03, vr: (Math.random() - .5) * .03, vt: (Math.random() - .5) * .25, ph: Math.random() * 6.28 });
  const seed = ID(o), a0 = new THREE.Vector3(), b0 = new THREE.Vector3(), ax = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3(); let last = null, raw = L.intensity, lastT = performance.now();
  pts.onBeforeRender = () => {
    const now = performance.now(), t = now / 1000, dt = Math.min(.05, (now - lastT) / 1000); lastT = now; if (last !== null && Math.abs(L.intensity - last) > 1e-6) raw = L.intensity;
    const m = fx === 'steady' ? 1 : Math.max(0, ENG.lightFx(fx, t * (+p.fxSpeed || 1), p.fxAmount == null ? .6 : +p.fxAmount, seed)); if (fx !== 'steady') { L.intensity = raw * m; last = L.intensity; }
    if (!dustA) return; mat.color.copy(L.color); mat.opacity = raw > 0 ? Math.min(1, (.35 + .75 * dustA) * Math.min(1.5, m)) : 0;
    g.updateMatrixWorld(); L.getWorldPosition(a0); g.worldToLocal(a0); let len = 0, rad;
    if (L.isSpotLight) { L.target.getWorldPosition(b0); g.worldToLocal(b0); ax.copy(b0).sub(a0); ax.normalize(); len = Math.min(L.distance || 12, 9); rad = Math.tan(L.angle) * len; u.set(1, 0, 0); if (Math.abs(ax.x) > .9) u.set(0, 0, 1); u.cross(ax).normalize(); v.copy(ax).cross(u).normalize(); } else rad = Math.min((L.distance || 10) * .3, 3);
    for (let i = 0; i < N; i++) { const d = D[i]; d.h += d.vh * dt; d.r += d.vr * dt; d.th += d.vt * dt; if (d.h < .03 || d.h > 1) d.h = .05 + Math.random() * .95; if (d.r < 0 || d.r > 1) d.r = Math.random(); const wob = Math.sin(t * .7 + d.ph) * .05; let x, y, z;
      if (L.isSpotLight) { const R = rad * d.h * d.r, cx = Math.cos(d.th) * R, cy = Math.sin(d.th) * R, k = d.h * len; x = a0.x + ax.x * k + u.x * cx + v.x * cy; y = a0.y + ax.y * k + u.y * cx + v.y * cy + wob; z = a0.z + ax.z * k + u.z * cx + v.z * cy; }
      else { const R = rad * d.r, q = d.h * Math.PI; x = a0.x + Math.sin(q) * Math.cos(d.th) * R; y = a0.y + Math.cos(q) * R + wob; z = a0.z + Math.sin(q) * Math.sin(d.th) * R; }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; }
    geo.attributes.position.needsUpdate = true;
  };
}
[['light', {}], ['spotlight', { shaft: { t: 'num', d: 1, min: 0, max: 3, step: .05, l: 'Light shaft' }, softness: { t: 'num', d: .35, min: 0, max: 1, step: .05, l: 'Edge softness' } }]].forEach(([type, extra]) => {
  const P = ENG.PREFABS[type]; if (!P) return; Object.assign(P.props, COMMON, extra); const base = P.build; P.build = function (o, c) { const g = base.call(this, o, c); try { rig(g, o, type); } catch (e) { console.warn(e); } return g; };
});
})();
