/* SCULPTED MESHES: the shared core for models sculpted in the Model tab.
   A sculpt is stored compactly in project.sculpts[id]: a topology recipe (how to rebuild its triangles, always the same
   way), quantized vertex positions and, if painted, vertex colors. Exported games rebuild the mesh from that, so a
   sculpted model is just another part of a shape-built model (part kind 'sculpt', d: { mesh, sx, sy, sz }). */
(function () {
'use strict';
const ENG = window.ENG;
const SM = ENG.SCULPT = {};

/* ---------------- topology builders (deterministic: same recipe, same triangles) ---------------- */
function weld(geo, eps) {
  /* turn any three.js geometry into an indexed mesh with shared corners, so seams never tear while sculpting */
  const g = geo.index ? geo.toNonIndexed() : geo, P = g.attributes.position.array, n = P.length / 3, q = 1 / (eps || 1e-5), map = new Map(), remap = new Uint32Array(n), out = [];
  for (let i = 0; i < n; i++) { const k = Math.round(P[i * 3] * q) + ',' + Math.round(P[i * 3 + 1] * q) + ',' + Math.round(P[i * 3 + 2] * q); let j = map.get(k); if (j === undefined) { j = out.length / 3; map.set(k, j); out.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); } remap[i] = j; }
  const idx = []; for (let t = 0; t < n; t += 3) { const a = remap[t], b = remap[t + 1], c = remap[t + 2]; if (a !== b && b !== c && a !== c) idx.push(a, b, c); }
  if (g !== geo) g.dispose(); return { pos: new Float32Array(out), idx: new Uint32Array(idx) };
}
SM.weld = weld;
function icosphere(level, r) {
  const t = (1 + Math.sqrt(5)) / 2, v = [-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1];
  let f = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
  let m = { pos: new Float32Array(v), idx: new Uint32Array(f) }; for (let i = 0; i < level; i++) m = subdivide(m);
  const P = m.pos; for (let i = 0; i < P.length; i += 3) { const l = Math.hypot(P[i], P[i + 1], P[i + 2]) || 1; P[i] *= r / l; P[i + 1] *= r / l; P[i + 2] *= r / l; }
  return m;
}
/* midpoint subdivision: every triangle becomes four, new points are shared between neighbours */
function subdivide(m, smooth) {
  const P = m.pos, I = m.idx, nv = P.length / 3, edges = new Map(), out = Array.from(P), tris = new Uint32Array(I.length * 4);
  const mid = (a, b) => { const k = a < b ? a * 4194304 + b : b * 4194304 + a; let j = edges.get(k); if (j === undefined) { j = out.length / 3; edges.set(k, j); out.push((P[a * 3] + P[b * 3]) / 2, (P[a * 3 + 1] + P[b * 3 + 1]) / 2, (P[a * 3 + 2] + P[b * 3 + 2]) / 2); } return j; };
  for (let t = 0, o = 0; t < I.length; t += 3) { const a = I[t], b = I[t + 1], c = I[t + 2], ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); tris.set([a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca], o); o += 12; }
  const r = { pos: new Float32Array(out), idx: tris };
  if (smooth) relax(r, nv, .5); return r;
}
/* soften the new points a little so subdividing rounds things off instead of keeping sharp facets */
function relax(m, from, k) {
  const P = m.pos, I = m.idx, n = P.length / 3, acc = new Float32Array(n * 3), cnt = new Uint16Array(n);
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) { const a = I[t + e], b = I[t + (e + 1) % 3]; acc[a * 3] += P[b * 3]; acc[a * 3 + 1] += P[b * 3 + 1]; acc[a * 3 + 2] += P[b * 3 + 2]; cnt[a]++; acc[b * 3] += P[a * 3]; acc[b * 3 + 1] += P[a * 3 + 1]; acc[b * 3 + 2] += P[a * 3 + 2]; cnt[b]++; }
  for (let i = from; i < n; i++) if (cnt[i]) for (let c = 0; c < 3; c++) P[i * 3 + c] += (acc[i * 3 + c] / cnt[i] - P[i * 3 + c]) * k;
}
SM.subdivide = subdivide;
function partMesh(kind, d) {
  d = d || {}; const seg = 48; let g;
  switch (kind) {
    case 'cube': case 'box': { const w = d.w || 1, h = d.h || 1, dd = d.d || 1, s = Math.max(w, h, dd) / 24; g = new THREE.BoxGeometry(w, h, dd, Math.max(2, Math.round(w / s)), Math.max(2, Math.round(h / s)), Math.max(2, Math.round(dd / s))); break; }
    case 'cylinder': case 'cyl': g = new THREE.CylinderGeometry(d.r == null ? .5 : d.r, d.r2 == null ? (d.r == null ? .5 : d.r) : d.r2, d.h || 1, seg, 24); break;
    case 'cone': g = new THREE.CylinderGeometry(.001, d.r || .5, d.h || 1, seg, 24); break;
    case 'prism': g = new THREE.CylinderGeometry(d.r || .5, d.r || .5, d.h || 1, Math.max(3, d.sides || 6), 16); break;
    case 'torus': g = new THREE.TorusGeometry(d.R || .5, d.t || .15, 32, 96); break;
    case 'capsule': { const r = d.r || .25, hh = Math.max(0, (d.h || 1) / 2 - r), pts = []; for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + i / 16 * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r), -hh + Math.sin(a) * r)); } for (let i = 1; i <= 12; i++) pts.push(new THREE.Vector2(r, -hh + i / 12 * 2 * hh)); for (let i = 1; i <= 16; i++) { const a = i / 16 * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r), hh + Math.sin(a) * r)); } g = new THREE.LatheGeometry(pts, seg); break; }
    case 'dome': g = new THREE.SphereGeometry(d.r || .5, seg, 16, 0, Math.PI * 2, 0, Math.PI / 2); break;
    case 'plane': g = new THREE.PlaneGeometry(d.w || 2, d.h || 2, 64, 64); g.rotateX(-Math.PI / 2); break;
    case 'panel': g = new THREE.PlaneGeometry(d.w || 1, d.h || 1, 64, 64); break; /* a standing panel part turned into clay */
    default: { const m = icosphere(4, .5); if (d.w || d.h || d.d) for (let i = 0; i < m.pos.length; i += 3) { m.pos[i] *= d.w || 1; m.pos[i + 1] *= d.h || 1; m.pos[i + 2] *= d.d || 1; } return m; }
  }
  const m = weld(g); g.dispose(); return m;
}
/* recipe: { base: 'sphere'|'cube'|'cylinder'|'torus'|'plane'|part kind, level (sphere), d (part sizes), subs } */
const TOPO = new Map();
SM.topology = function (recipe) {
  const key = JSON.stringify(recipe); let m = TOPO.get(key); if (m) return m;
  m = recipe.base === 'sphere' ? icosphere(recipe.level == null ? 5 : recipe.level, .5) : partMesh(recipe.base, recipe.d);
  for (let i = 0; i < (recipe.subs | 0); i++) m = subdivide(m, true);
  m.flat = recipe.base === 'plane' || recipe.base === 'panel'; TOPO.set(key, m); if (TOPO.size > 16) TOPO.delete(TOPO.keys().next().value); return m;
};

/* ---------------- compact storage ---------------- */
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
SM.encode = function (pos, col) {
  const n = pos.length / 3, lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let i = 0; i < pos.length; i += 3) for (let c = 0; c < 3; c++) { const v = pos[i + c]; if (v < lo[c]) lo[c] = v; if (v > hi[c]) hi[c] = v; }
  const q = new Int16Array(n * 3); for (let i = 0; i < pos.length; i += 3) for (let c = 0; c < 3; c++) { const span = hi[c] - lo[c] || 1; q[i + c] = Math.round(((pos[i + c] - lo[c]) / span * 2 - 1) * 32767); }
  let cs = ''; if (col) { const u = new Uint8Array(n * 3); let painted = false; for (let i = 0; i < u.length; i++) { u[i] = Math.round(Math.max(0, Math.min(1, col[i])) * 255); if (u[i] !== 255) painted = true; } if (painted) cs = b64(u); }
  return { n, b: lo.concat(hi).map(v => Math.round(v * 1e5) / 1e5), p: b64(new Uint8Array(q.buffer)), c: cs };
};
SM.decode = function (data) {
  const q = new Int16Array(unb64(data.p).buffer), b = data.b, pos = new Float32Array(q.length);
  for (let i = 0; i < q.length; i += 3) for (let c = 0; c < 3; c++) pos[i + c] = b[c] + (q[i + c] / 32767 + 1) / 2 * ((b[c + 3] - b[c]) || 1);
  let col = null; if (data.c) { const u = unb64(data.c); col = new Float32Array(u.length); for (let i = 0; i < u.length; i++) col[i] = u[i] / 255; }
  return { pos, col };
};
/* the geometry a sculpt part uses in the editor and in games (shared and cached per version) */
const GEO = new Map();
SM.geometry = function (project, d) {
  const id = d && d.mesh, data = id && project && project.sculpts && project.sculpts[id];
  if (!data) { const g = new THREE.SphereGeometry(.5, 24, 16); g.userData.sculptMissing = true; return g; }
  const key = id + ':' + (data.v || 0); let g = GEO.get(key); if (g) return g;
  const topo = SM.topology(data.recipe), dec = SM.decode(data);
  if (dec.pos.length !== topo.pos.length) { console.warn('Sculpt ' + id + ' does not match its recipe'); g = new THREE.SphereGeometry(.5, 24, 16); GEO.set(key, g); return g; }
  g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(dec.pos, 3)); g.setIndex(new THREE.BufferAttribute(topo.idx, 1));
  if (dec.col) g.setAttribute('color', new THREE.BufferAttribute(dec.col, 3)); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
  g.userData.flat = topo.flat; GEO.set(key, g); return g;
};
SM.forget = id => { for (const k of [...GEO.keys()]) if (k.startsWith(id + ':')) GEO.delete(k); };
})();
