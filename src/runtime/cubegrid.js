/* VIRA CUBE GRID: block-built geometry on a grid, in the spirit of classic block-out tools.
   A cube grid object stores non-overlapping boxes in integer units of 1/16 m (a cell can be anything from 6 cm to 16 m),
   plus optional sloped pieces made in corner mode. Shared by the editor and by exported games. */
(function () {
'use strict';
const ENG = window.ENG, PF = ENG.PREFABS, G = ENG.Game.prototype;
const FINE = 1 / 16, MAXP = 8, CG = ENG.CG = { FINE, MAXP };
const clone = o => JSON.parse(JSON.stringify(o));

const MATS0 = [
  { name: 'Concrete', color: '#a3a39e', tex: 'concrete', tile: 2, rough: .9, metal: 0, glow: 0, opacity: 1 },
  { name: 'Brick', color: '#b9795f', tex: 'brick', tile: 2, rough: .85, metal: 0, glow: 0, opacity: 1 },
  { name: 'Plaster', color: '#d9d2c3', tex: 'none', tile: 1, rough: .95, metal: 0, glow: 0, opacity: 1 },
  { name: 'Glass', color: '#9fc4d6', tex: 'none', tile: 1, rough: .05, metal: .1, glow: 0, opacity: .35 },
  { name: 'Dark metal', color: '#3a3f46', tex: 'metal', tile: 2, rough: .4, metal: .7, glow: 0, opacity: 1 },
  { name: 'Wood', color: '#7a5434', tex: 'wood', tile: 1.5, rough: .7, metal: 0, glow: 0, opacity: 1 },
  { name: 'White tile', color: '#e6e8e6', tex: 'tiles', tile: 1, rough: .5, metal: 0, glow: 0, opacity: 1 },
  { name: 'Asphalt', color: '#2b2d30', tex: 'concrete', tile: 3, rough: .95, metal: 0, glow: 0, opacity: 1 }
];
CG.mats = () => clone(MATS0);
CG.fill = d => { if (!d || !Array.isArray(d.boxes)) d = { v: 1, boxes: [], slopes: [], mats: CG.mats() }; if (!Array.isArray(d.slopes)) d.slopes = []; if (!Array.isArray(d.mats) || !d.mats.length) d.mats = CG.mats(); return d; };
CG.isEmpty = d => !d || (!(d.boxes && d.boxes.length) && !(d.slopes && d.slopes.length));

/* ---------------- box algebra (boxes are [x0,y0,z0,x1,y1,z1,mat], half open, integers) ---------------- */
const hit = (a, c) => a[0] < c[3] && c[0] < a[3] && a[1] < c[4] && c[1] < a[4] && a[2] < c[5] && c[2] < a[5];
function minus(a, c) {
  if (!hit(a, c)) return [a];
  const [x0, y0, z0, x1, y1, z1] = a, m = a[6], cx0 = Math.max(x0, c[0]), cx1 = Math.min(x1, c[3]), cy0 = Math.max(y0, c[1]), cy1 = Math.min(y1, c[4]), cz0 = Math.max(z0, c[2]), cz1 = Math.min(z1, c[5]), out = [];
  if (x0 < cx0) out.push([x0, y0, z0, cx0, y1, z1, m]); if (cx1 < x1) out.push([cx1, y0, z0, x1, y1, z1, m]);
  if (y0 < cy0) out.push([cx0, y0, z0, cx1, cy0, z1, m]); if (cy1 < y1) out.push([cx0, cy1, z0, cx1, y1, z1, m]);
  if (z0 < cz0) out.push([cx0, cy0, z0, cx1, cy1, cz0, m]); if (cz1 < z1) out.push([cx0, cy0, cz1, cx1, cy1, z1, m]);
  return out;
}
const vol = b => (b[3] - b[0]) * (b[4] - b[1]) * (b[5] - b[2]);
function coalesce(d) {
  let changed = true, guard = 0;
  while (changed && guard++ < 8) {
    changed = false;
    for (let a = 0; a < 3; a++) {
      const u = (a + 1) % 3, v = (a + 2) % 3, groups = new Map();
      for (const b of d.boxes) { const k = b[u] + ',' + b[u + 3] + ',' + b[v] + ',' + b[v + 3] + ',' + b[6]; let g = groups.get(k); if (!g) groups.set(k, g = []); g.push(b); }
      const out = [];
      for (const g of groups.values()) { if (g.length > 1) g.sort((p, q) => p[a] - q[a]); let cur = null; for (const b of g) { if (cur && cur[a + 3] === b[a]) { cur[a + 3] = b[a + 3]; changed = true; } else { cur = b.slice(); out.push(cur); } } }
      d.boxes = out;
    }
  }
}
CG.coalesce = coalesce;
/* fills only empty space, so extruding never overwrites what is already there; returns the volume added */
CG.add = (d, box, m) => {
  let pieces = [[box[0], box[1], box[2], box[3], box[4], box[5], m | 0]];
  for (const e of d.boxes) { if (!pieces.length) break; const next = []; let ch = false; for (const p of pieces) { if (hit(p, e)) { ch = true; next.push(...minus(p, e)); } else next.push(p); } if (ch) pieces = next; }
  let v = 0; for (const p of pieces) { d.boxes.push(p); v += vol(p); } if (v) coalesce(d); return v;
};
CG.sub = (d, c) => {
  let v = 0; const out = [];
  for (const b of d.boxes) { if (!hit(b, c)) { out.push(b); continue; } v += (Math.min(b[3], c[3]) - Math.max(b[0], c[0])) * (Math.min(b[4], c[4]) - Math.max(b[1], c[1])) * (Math.min(b[5], c[5]) - Math.max(b[2], c[2])); out.push(...minus(b, c)); }
  d.boxes = out; if (v) coalesce(d); return v;
};
CG.paint = (d, c, m) => {
  let v = 0; const out = [];
  for (const b of d.boxes) { if (!hit(b, c) || b[6] === m) { out.push(b); continue; } const ix = [Math.max(b[0], c[0]), Math.max(b[1], c[1]), Math.max(b[2], c[2]), Math.min(b[3], c[3]), Math.min(b[4], c[4]), Math.min(b[5], c[5]), m]; v += vol(ix); out.push(...minus(b, c)); out.push(ix); }
  d.boxes = out; if (v) coalesce(d); return v;
};
CG.volume = d => d.boxes.reduce((a, b) => a + vol(b), 0);

/* ---------------- meshing: exposed faces only, coplanar faces merged ---------------- */
function mergeAlong(list, along) {
  const lo = along === 'v' ? 4 : 3, hi = along === 'v' ? 6 : 5, ko = along === 'v' ? [3, 5] : [4, 6], m = new Map();
  for (const r of list) { const k = r[ko[0]] + ',' + r[ko[1]]; let g = m.get(k); if (!g) m.set(k, g = []); g.push(r); }
  const out = []; let changed = false;
  for (const g of m.values()) { g.sort((p, q) => p[lo] - q[lo]); let cur = null; for (const r of g) { if (cur && cur[hi] === r[lo]) { cur[hi] = r[hi]; changed = true; } else { cur = r.slice(); out.push(cur); } } }
  return [out, changed];
}
function mergeQuads(q) {
  const groups = new Map(); for (const r of q) { const k = r[0] + '|' + r[1] + '|' + r[2] + '|' + r[7]; let g = groups.get(k); if (!g) groups.set(k, g = []); g.push(r); }
  const out = [];
  for (const g of groups.values()) { let list = g, again = true, guard = 0; while (again && guard++ < 6) { const [a, c1] = mergeAlong(list, 'v'), [b, c2] = mergeAlong(a, 'u'); list = b; again = c1 || c2; } out.push(...list); }
  return out;
}
/* quad = [axis, sign, plane, u0, v0, u1, v1, mat] with u = (axis+1)%3, v = (axis+2)%3 */
function faceQuads(boxes, trans) {
  trans = trans || (() => false);
  const mn = [new Map(), new Map(), new Map()], mx = [new Map(), new Map(), new Map()], put = (M, k, b) => { let l = M.get(k); if (!l) M.set(k, l = []); l.push(b); };
  for (const b of boxes) for (let a = 0; a < 3; a++) { put(mn[a], b[a], b); put(mx[a], b[a + 3], b); }
  const out = [];
  for (const b of boxes) for (let a = 0; a < 3; a++) {
    const u = (a + 1) % 3, v = (a + 2) % 3;
    for (const s of [1, -1]) {
      const plane = s > 0 ? b[a + 3] : b[a], nb = (s > 0 ? mn[a] : mx[a]).get(plane); let rects = [[b[u], b[v], b[u + 3], b[v + 3]]];
      if (nb) for (const o of nb) {
        if (o === b || (trans(o[6]) && o[6] !== b[6])) continue;
        const next = [], ou = o[u], ov = o[v], ou1 = o[u + 3], ov1 = o[v + 3];
        for (const r of rects) {
          const iu0 = Math.max(r[0], ou), iv0 = Math.max(r[1], ov), iu1 = Math.min(r[2], ou1), iv1 = Math.min(r[3], ov1);
          if (iu0 >= iu1 || iv0 >= iv1) { next.push(r); continue; }
          if (r[0] < iu0) next.push([r[0], r[1], iu0, r[3]]); if (iu1 < r[2]) next.push([iu1, r[1], r[2], r[3]]);
          if (r[1] < iv0) next.push([iu0, r[1], iu1, iv0]); if (iv1 < r[3]) next.push([iu0, iv1, iu1, r[3]]);
        }
        rects = next; if (!rects.length) break;
      }
      for (const r of rects) out.push([a, s, plane, r[0], r[1], r[2], r[3], b[6]]);
    }
  }
  return mergeQuads(out);
}
CG.faces = faceQuads;
const uvOf = (p, a) => a === 0 ? [p[2], p[1]] : a === 1 ? [p[0], p[2]] : [p[0], p[1]];
function pushTri(acc, A, B, C, tile) {
  const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
  const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], l = Math.hypot(n[0], n[1], n[2]); if (l < 1e-9) return;
  n[0] /= l; n[1] /= l; n[2] /= l; const ax = Math.abs(n[0]) >= Math.abs(n[1]) && Math.abs(n[0]) >= Math.abs(n[2]) ? 0 : Math.abs(n[1]) >= Math.abs(n[2]) ? 1 : 2, k = FINE / (tile || 1);
  for (const p of [A, B, C]) { acc.pos.push(p[0] * FINE, p[1] * FINE, p[2] * FINE); acc.nor.push(n[0], n[1], n[2]); const t = uvOf(p, ax); acc.uv.push(t[0] * k, t[1] * k); }
}
function pushQuad(acc, q, tile) {
  const [a, s, plane, u0, v0, u1, v1] = q, u = (a + 1) % 3, v = (a + 2) % 3, pt = (cu, cv) => { const p = [0, 0, 0]; p[a] = plane; p[u] = cu; p[v] = cv; return p; };
  const A = pt(u0, v0), B = pt(u1, v0), C = pt(u1, v1), D = pt(u0, v1);
  if (s > 0) { pushTri(acc, A, B, C, tile); pushTri(acc, A, C, D, tile); } else { pushTri(acc, A, C, B, tile); pushTri(acc, A, D, C, tile); }
}
/* sloped piece from corner mode: base rectangle on a plane, each corner pushed out by its own depth; 8 vertices, 24 numbers */
CG.makeSlope = (a, s, P, u0, u1, v0, v1, d) => {
  const u = (a + 1) % 3, v = (a + 2) % 3, cor = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], p = [];
  for (let i = 0; i < 4; i++) { const q = [0, 0, 0]; q[a] = P; q[u] = cor[i][0]; q[v] = cor[i][1]; p.push(q[0], q[1], q[2]); }
  for (let i = 0; i < 4; i++) { const q = [0, 0, 0]; q[a] = P + s * d[i]; q[u] = cor[i][0]; q[v] = cor[i][1]; p.push(q[0], q[1], q[2]); }
  return p;
};
CG.slopeTris = p => {
  const V = [], c = [0, 0, 0]; for (let i = 0; i < 8; i++) { const q = [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]]; V.push(q); c[0] += q[0] / 8; c[1] += q[1] / 8; c[2] += q[2] / 8; }
  const out = [];
  for (const q of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) for (const t of [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]) {
    let A = V[t[0]], B = V[t[1]], C = V[t[2]]; const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]], n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const mid = [(A[0] + B[0] + C[0]) / 3 - c[0], (A[1] + B[1] + C[1]) / 3 - c[1], (A[2] + B[2] + C[2]) / 3 - c[2]]; if (n[0] * mid[0] + n[1] * mid[1] + n[2] * mid[2] < 0) { const x = B; B = C; C = x; }
    out.push([A, B, C]);
  }
  return out;
};
const geoOf = acc => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(acc.nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(acc.uv, 2)); return g; };
CG.slopeGeometry = p => { const acc = { pos: [], nor: [], uv: [] }; for (const t of CG.slopeTris(p)) pushTri(acc, t[0], t[1], t[2], 1); return geoOf(acc); };
CG.build = function (data, project, opts) {
  opts = opts || {}; data = CG.fill(data); const g = new THREE.Group(), mats = data.mats, md = i => mats[i] || mats[0], trans = mi => md(mi).opacity < .99, acc = {}, A = mi => acc[mi] || (acc[mi] = { pos: [], nor: [], uv: [] });
  for (const q of faceQuads(data.boxes, trans)) pushQuad(A(q[7]), q, md(q[7]).tile);
  for (const s of data.slopes) { const a = A(s.m); for (const t of CG.slopeTris(s.p)) pushTri(a, t[0], t[1], t[2], md(s.m).tile); }
  for (const k in acc) {
    const a = acc[k]; if (!a.pos.length) continue; const m = md(+k), mat = ENG.partMaterial(m, 'box', project), geo = geoOf(a); geo.computeBoundingSphere(); geo.computeBoundingBox();
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = m.opacity > .5; mesh.receiveShadow = true; mesh.userData.isCG = true; mesh.userData.cgMat = +k;
    if (opts.collide !== false) { mesh.userData.walk = true; if (m.opacity < .7) mesh.userData.glass = true; }
    g.add(mesh);
  }
  return g;
};
CG.stats = d => { d = CG.fill(d); return { boxes: d.boxes.length, slopes: d.slopes.length, quads: faceQuads(d.boxes, mi => (d.mats[mi] || d.mats[0]).opacity < .99).length }; };

/* ---------------- ready-made block sets ---------------- */
CG.preset = function (name) {
  const d = CG.fill(null), U = v => Math.round(v * 16), bx = (x0, y0, z0, x1, y1, z1) => [U(x0), U(y0), U(z0), U(x1), U(y1), U(z1)];
  const B = (x0, y0, z0, x1, y1, z1, m) => CG.add(d, bx(x0, y0, z0, x1, y1, z1), m || 0), S = (x0, y0, z0, x1, y1, z1) => CG.sub(d, bx(x0, y0, z0, x1, y1, z1)), Pn = (x0, y0, z0, x1, y1, z1, m) => CG.paint(d, bx(x0, y0, z0, x1, y1, z1), m);
  if (name === 'room') {
    B(0, 0, 0, 6, 3, 5, 2); S(.25, .25, .25, 5.75, 2.75, 4.75); S(2.5, .25, -.5, 3.5, 2.25, .5);
    S(1, 1.25, 4.5, 2.25, 2.25, 5.5); B(1, 1.25, 4.75, 2.25, 2.25, 5, 3); S(5.5, 1.25, 1.5, 6.5, 2.25, 2.75); B(5.75, 1.25, 1.5, 6, 2.25, 2.75, 3); Pn(.25, 0, .25, 5.75, .25, 4.75, 5);
  } else if (name === 'tower') {
    B(0, 0, 0, 6, 8, 6, 0); B(.5, 8, .5, 5.5, 14, 5.5, 0); B(1.5, 14, 1.5, 4.5, 18, 4.5, 0); B(2.875, 18, 2.875, 3.125, 22, 3.125, 4);
    for (let y = 1.5; y < 7.5; y += 2) Pn(0, y, 0, 6, y + .5, 6, 4); for (let y = 9.5; y < 13.5; y += 2) Pn(.5, y, .5, 5.5, y + .5, 5.5, 4);
  } else if (name === 'skyline') {
    B(-1, -.5, -1, 17, 0, 16, 7);
    for (const [x, z, w, dp, h, m] of [[0, 0, 4, 4, 12, 0], [5, 0, 4, 5, 20, 4], [10, 0, 5, 4, 9, 1], [0, 5, 5, 4, 16, 1], [6, 6, 4, 4, 26, 0], [11, 5, 4, 5, 14, 4], [0, 10, 4, 4, 7, 0], [5, 11, 5, 4, 18, 1]]) {
      B(x, 0, z, x + w, h, z + dp, m); B(x + .5, h, z + .5, x + w - .5, h + 1, z + dp - .5, m); if (h > 15) B(x + w / 2 - .125, h + 1, z + dp / 2 - .125, x + w / 2 + .125, h + 4, z + dp / 2 + .125, 4);
      for (let y = 2; y < h - 1; y += 3) Pn(x, y, z, x + w, y + .5, z + dp, m === 4 ? 0 : 4);
    }
  } else if (name === 'stairs') { for (let i = 0; i < 8; i++) B(0, 0, i * .5, 2, (i + 1) * .25, (i + 1) * .5, 0); }
  else if (name === 'ramp') { d.slopes.push({ p: CG.makeSlope(1, 1, 0, 0, U(4), 0, U(3), [0, U(2), U(2), 0]), m: 0 }); B(0, 0, 4, 3, 2, 6, 0); }
  else { B(0, 0, 0, 2, 2, 2, 0); B(2, 0, 0, 4, 1, 2, 1); B(0, 2, 0, 1, 3, 1, 4); B(0, 0, 2, 3, .5, 4, 7); }
  return d;
};

/* ---------------- the level object ---------------- */
PF.cubegrid = {
  type: 'cubegrid', label: 'Cube grid', cat: 'Build', size: [1, 1, 1],
  props: { data: { t: 'json', d: null, l: 'Blocks' }, collide: { t: 'bool', d: true, l: 'Solid' }, tag: { t: 'text', d: '', l: 'Tag' } },
  build(o, c) {
    c = c || {}; let d = o.props.data; if (c.thumb && CG.isEmpty(d)) d = CG.preset('blocks');
    const g = CG.build(d, c.project, { collide: o.props.collide !== false }); g.userData.cg = true; return g;
  }
};
const baseSpawn = G.spawnExtra;
G.spawnExtra = function (e) { if (baseSpawn) baseSpawn.call(this, e); if (e.type === 'cubegrid') this.cgCollide(e); };
/* every merged block becomes one collider for the player and one box shape on a single static physics body */
G.cgCollide = function (e) {
  if (e.o.props.collide === false) return; const d = CG.fill(e.o.props.data), root = e.root; root.updateMatrixWorld(true);
  let mesh = null; root.traverse(n => { if (!mesh && n.isMesh) mesh = n; }); if (!mesh) return;
  const q = new THREE.Quaternion(), wp = new THREE.Vector3(), sc = new THREE.Vector3(); root.matrixWorld.decompose(wp, q, sc);
  const body = new CANNON.Body({ mass: 0 }); body.collisionFilterMask = -1;
  for (const b of d.boxes) {
    const hs = [(b[3] - b[0]) / 2 * FINE, (b[4] - b[1]) / 2 * FINE, (b[5] - b[2]) / 2 * FINE], c = [(b[0] + b[3]) / 2 * FINE, (b[1] + b[4]) / 2 * FINE, (b[2] + b[5]) / 2 * FINE];
    body.addShape(new CANNON.Box(new CANNON.Vec3(hs[0], hs[1], hs[2])), new CANNON.Vec3(c[0], c[1], c[2]));
    this.cols.push({ box: new THREE.Box3(new THREE.Vector3(b[0] * FINE, b[1] * FINE, b[2] * FINE), new THREE.Vector3(b[3] * FINE, b[4] * FINE, b[5] * FINE)).applyMatrix4(root.matrixWorld), m: mesh, e });
  }
  if (d.boxes.length) { body.position.set(wp.x, wp.y, wp.z); body.quaternion.set(q.x, q.y, q.z, q.w); this.world.addBody(body); body.userData = { e }; e.bodies = (e.bodies || []).concat(body); }
};
})();
