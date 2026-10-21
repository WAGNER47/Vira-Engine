/* VIRA SCULPT: digital clay inside the Model tab. Start from a sphere, cube, cylinder, ring or plane (or turn any part
   into clay), then shape it with brushes: Draw, Clay, Smooth, Flatten, Inflate, Pinch, Crease, Grab and Paint.
   Radius is in screen pixels, so zooming in gives finer detail. Mirror on X, pen pressure, subdivide for detail,
   studio clay materials, undo and redo. The result is a 'sculpt' part (see runtime/sculptmesh.js), so it places in
   levels and ships inside exported games like any other model. Loaded after ed.js; it uses Ed.mw and Ed.ui. */
(function () {
'use strict';
const ENG = window.ENG, Ed = window.Ed, SM = ENG && ENG.SCULPT; if (!Ed || !Ed.mw || !Ed.ui || !SM) return;
const U = Ed.ui, h = U.h, MWB = Ed.mw, $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* ---------------- brushes ---------------- */
const BR = {
  draw: { n: 'Draw', k: '1', d: 'Builds up the surface. Hold Ctrl to dig in.', ic: '<path d="M4 18c3-6 6-9 9-9s4 3 7 3"/><circle cx="13" cy="9" r="2"/>' },
  clay: { n: 'Clay', k: '2', d: 'Adds flat layers, like pressing on clay strips.', ic: '<path d="M4 16h16M6 12h12M8 8h8"/>' },
  smooth: { n: 'Smooth', k: '3', d: 'Evens out bumps. Hold Shift with any brush to smooth.', ic: '<path d="M3 14c3-4 6-4 9 0s6 4 9 0"/>' },
  flatten: { n: 'Flatten', k: '4', d: 'Planes the surface down to a flat face.', ic: '<path d="M4 15h16M7 11l5-4 5 4"/>' },
  inflate: { n: 'Inflate', k: '5', d: 'Swells the surface outward like a balloon.', ic: '<circle cx="12" cy="12" r="7"/><path d="M12 8v8M8 12h8"/>' },
  pinch: { n: 'Pinch', k: '6', d: 'Pulls the surface together to sharpen edges.', ic: '<path d="M5 6l6 6-6 6M19 6l-6 6 6 6"/>' },
  crease: { n: 'Crease', k: '7', d: 'Cuts a sharp groove. Hold Ctrl for a ridge.', ic: '<path d="M3 9l9 7 9-7"/>' },
  grab: { n: 'Grab', k: '8', d: 'Pulls a whole area around. Great for big shapes.', ic: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8c0 3-2 6-6 6s-6-3-7-6l-1-3a1.5 1.5 0 0 1 2.6-1.4L8 13"/>' },
  paint: { n: 'Paint', k: '9', d: 'Paints color onto the surface. Hold Ctrl to erase to white.', ic: '<path d="M14 4l6 6-8 8H6v-6z"/><path d="M4 21h8"/>' }
};
const MATCAPS = { clay: ['Clay', '#bca995', .3], studio: ['Studio', '#8f969f', .45], wax: ['Red wax', '#b13a3a', .55], jade: ['Jade', '#3f8f78', .5], pearl: ['Pearl', '#e3dfeb', .6], graphite: ['Graphite', '#4f5560', .7], chrome: ['Chrome', null, 0] };
const S = { on: false, brush: 'draw', radius: 70, str: { draw: .5, clay: .5, smooth: .6, flatten: .5, inflate: .4, pinch: .5, crease: .5, grab: 1, paint: .9 }, sym: true, pressure: true, invert: false, color: '#d24b4b', mat: 'clay', wire: false, flat: false, undo: [], redo: [] };
try { const p = JSON.parse(localStorage.getItem('vira.sculpt') || '{}'); ['brush', 'radius', 'sym', 'pressure', 'color', 'mat'].forEach(k => { if (p[k] !== undefined) S[k] = p[k]; }); if (p.str) Object.assign(S.str, p.str); } catch (x) { }
const prefSave = () => { try { localStorage.setItem('vira.sculpt', JSON.stringify({ brush: S.brush, radius: S.radius, sym: S.sym, pressure: S.pressure, color: S.color, mat: S.mat, str: S.str })); } catch (x) { } };

/* ---------------- studio materials (matcaps drawn once on a canvas) ---------------- */
const MC = {};
function matcap(key) {
  if (MC[key]) return MC[key]; const [, base, sp] = MATCAPS[key] || MATCAPS.clay, N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'), im = g.createImageData(N, N), D = im.data;
  const bc = base ? [parseInt(base.slice(1, 3), 16) / 255, parseInt(base.slice(3, 5), 16) / 255, parseInt(base.slice(5, 7), 16) / 255] : [.6, .62, .66];
  const L1 = [-.45, .6, .66], L2 = [.65, -.15, .5], nl = v => { const l = Math.hypot(...v); return v.map(x => x / l); }, l1 = nl(L1), l2 = nl(L2), hv = nl([l1[0], l1[1], l1[2] + 1]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let nx = (x + .5) / N * 2 - 1, ny = 1 - (y + .5) / N * 2; const r2 = nx * nx + ny * ny; if (r2 > 1) { const r = Math.sqrt(r2); nx /= r; ny /= r; } const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    let c;
    if (!base) { const ry = ny * .9 - nz * .2, sky = ry > -.05 ? .55 + .45 * Math.min(1, ry * 1.6) : .12 + .1 * (1 + ry), band = Math.exp(-Math.pow((ry + .05) * 9, 2)) * .5, s = Math.pow(Math.max(0, nx * hv[0] + ny * hv[1] + nz * hv[2]), 60); const v = Math.min(1, sky + band + s); c = [v * .92, v * .95, v]; }
    else { const df = Math.max(0, nx * l1[0] + ny * l1[1] + nz * l1[2]), fl = Math.max(0, nx * l2[0] + ny * l2[1] + nz * l2[2]) * .22, amb = .2 + .1 * (ny * .5 + .5), rim = Math.pow(1 - nz, 2.6) * .32, s = Math.pow(Math.max(0, nx * hv[0] + ny * hv[1] + nz * hv[2]), 22 + sp * 40) * sp;
      c = bc.map((b, i) => b * (amb + df * .9 + fl) + s + rim * [.55, .65, .85][i]); }
    const o = (y * N + x) * 4; D[o] = Math.min(255, Math.pow(c[0], .95) * 255); D[o + 1] = Math.min(255, Math.pow(c[1], .95) * 255); D[o + 2] = Math.min(255, Math.pow(c[2], .95) * 255); D[o + 3] = 255;
  }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; MC[key] = { tex: t, url: cv.toDataURL() }; return MC[key];
}

/* ---------------- the mesh being sculpted ---------------- */
let M = null; /* { recipe, pos, nrm, col, idx, nv, nt, fn, vfo, vf, vvo, vv, geo, mesh, wire } */
function csr(n, count, fill) { const off = new Uint32Array(n + 1); count((i) => off[i + 1]++); for (let i = 0; i < n; i++) off[i + 1] += off[i]; const list = new Uint32Array(off[n]), cur = off.slice(0, n); fill((i, v) => { list[cur[i]++] = v; }); return { off, list }; }
function adopt(recipe, pos, col) {
  const topo = SM.topology(recipe), idx = topo.idx, nv = pos.length / 3, nt = idx.length / 3;
  const vf = csr(nv, inc => { for (let t = 0; t < idx.length; t++) inc(idx[t]); }, put => { for (let t = 0; t < idx.length; t++) put(idx[t], (t / 3) | 0); });
  const es = new Set(), ea = []; for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) { const a = idx[t + e], b = idx[t + (e + 1) % 3], k = a < b ? a * 4194304 + b : b * 4194304 + a; if (!es.has(k)) { es.add(k); ea.push(a, b); } }
  const vv = csr(nv, inc => { for (let i = 0; i < ea.length; i++) inc(ea[i]); }, put => { for (let i = 0; i < ea.length; i += 2) { put(ea[i], ea[i + 1]); put(ea[i + 1], ea[i]); } });
  const m = { recipe, pos, nrm: new Float32Array(pos.length), col: col || new Float32Array(pos.length).fill(1), idx, nv, nt, fn: new Float32Array(nt * 3), vfo: vf.off, vf: vf.list, vvo: vv.off, vv: vv.list, flat: topo.flat };
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('normal', new THREE.BufferAttribute(m.nrm, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(m.col, 3).setUsage(THREE.DynamicDrawUsage)); g.setIndex(new THREE.BufferAttribute(idx, 1)); m.geo = g;
  M = m; allNormals(); grids(); return m;
}
function faceNormal(t) { const I = M.idx, P = M.pos, a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3, ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2]; M.fn[t * 3] = uy * vz - uz * vy; M.fn[t * 3 + 1] = uz * vx - ux * vz; M.fn[t * 3 + 2] = ux * vy - uy * vx; }
function vertNormal(i) { let x = 0, y = 0, z = 0; for (let k = M.vfo[i]; k < M.vfo[i + 1]; k++) { const f = M.vf[k] * 3; x += M.fn[f]; y += M.fn[f + 1]; z += M.fn[f + 2]; } const l = Math.hypot(x, y, z) || 1; M.nrm[i * 3] = x / l; M.nrm[i * 3 + 1] = y / l; M.nrm[i * 3 + 2] = z / l; }
function allNormals() { for (let t = 0; t < M.nt; t++) faceNormal(t); for (let i = 0; i < M.nv; i++) vertNormal(i); M.geo.attributes.normal.needsUpdate = true; }
let stampF = null, stampV = null, stamp = 1;
function updateNormals(list) {
  if (!stampF || stampF.length < M.nt) stampF = new Uint32Array(M.nt); if (!stampV || stampV.length < M.nv) stampV = new Uint32Array(M.nv); stamp++; const faces = [], verts = [];
  for (const i of list) for (let k = M.vfo[i]; k < M.vfo[i + 1]; k++) { const f = M.vf[k]; if (stampF[f] !== stamp) { stampF[f] = stamp; faces.push(f); faceNormal(f); } }
  for (const f of faces) for (let e = 0; e < 3; e++) { const v = M.idx[f * 3 + e]; if (stampV[v] !== stamp) { stampV[v] = stamp; verts.push(v); vertNormal(v); } }
  let lo = 1e9, hi = -1; for (const v of verts) { if (v < lo) lo = v; if (v > hi) hi = v; } if (hi < 0) return;
  for (const a of [M.geo.attributes.position, M.geo.attributes.normal]) { a.updateRange.offset = lo * 3; a.updateRange.count = (hi - lo + 1) * 3; a.needsUpdate = true; }
  if (M.wire) M.wire.geometry.attributes.position.needsUpdate = true;
}

/* ---------------- spatial grids: fast "what is under the brush" and "what does this ray hit" ---------------- */
let VG = null, TG = null;
function bbox(pad) { const P = M.pos, lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < P.length; i += 3) for (let c = 0; c < 3; c++) { const v = P[i + c]; if (v < lo[c]) lo[c] = v; if (v > hi[c]) hi[c] = v; } for (let c = 0; c < 3; c++) { lo[c] -= pad; hi[c] += pad; } return { lo, hi }; }
function makeGrid(items, res, eachBox) {
  const b = bbox(.02), span = Math.max(b.hi[0] - b.lo[0], b.hi[1] - b.lo[1], b.hi[2] - b.lo[2]), cs = span / res, dim = [0, 1, 2].map(c => Math.max(1, Math.ceil((b.hi[c] - b.lo[c]) / cs))), cell = (c, v) => clamp(Math.floor((v - b.lo[c]) / cs), 0, dim[c] - 1);
  const G = { lo: b.lo, cs, dim, cell }, n = dim[0] * dim[1] * dim[2], off = new Uint32Array(n + 1), visit = (i, f) => eachBox(i, (x0, y0, z0, x1, y1, z1) => { for (let z = cell(2, z0); z <= cell(2, z1); z++) for (let y = cell(1, y0); y <= cell(1, y1); y++) for (let x = cell(0, x0); x <= cell(0, x1); x++) f((z * dim[1] + y) * dim[0] + x); });
  for (let i = 0; i < items; i++) visit(i, c => off[c + 1]++); for (let c = 0; c < n; c++) off[c + 1] += off[c]; const list = new Uint32Array(off[n]), cur = off.slice(0, n); for (let i = 0; i < items; i++) visit(i, c => { list[cur[c]++] = i; }); G.off = off; G.list = list; return G;
}
function grids() {
  const P = M.pos, I = M.idx;
  VG = makeGrid(M.nv, clamp(Math.round(Math.cbrt(M.nv / 6)), 8, 96), (i, f) => { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; f(x, y, z, x, y, z); });
  TG = makeGrid(M.nt, clamp(Math.round(Math.cbrt(M.nt / 4)), 8, 96), (t, f) => { const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3; f(Math.min(P[a], P[b], P[c]), Math.min(P[a + 1], P[b + 1], P[c + 1]), Math.min(P[a + 2], P[b + 2], P[c + 2]), Math.max(P[a], P[b], P[c]), Math.max(P[a + 1], P[b + 1], P[c + 1]), Math.max(P[a + 2], P[b + 2], P[c + 2])); });
}
function query(px, py, pz, r, out) {
  out.length = 0; const G = VG, P = M.pos, r2 = r * r, x0 = G.cell(0, px - r), x1 = G.cell(0, px + r), y0 = G.cell(1, py - r), y1 = G.cell(1, py + r), z0 = G.cell(2, pz - r), z1 = G.cell(2, pz + r);
  for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = (z * G.dim[1] + y) * G.dim[0] + x; for (let k = G.off[c]; k < G.off[c + 1]; k++) { const i = G.list[k], dx = P[i * 3] - px, dy = P[i * 3 + 1] - py, dz = P[i * 3 + 2] - pz, d2 = dx * dx + dy * dy + dz * dz; if (d2 <= r2) out.push(i, d2); } }
  return out;
}
let rayStamp = null, rs = 1;
function raycast(o, d) {
  const G = TG, P = M.pos, I = M.idx; let t0 = 0, t1 = 1e9; const hi = [0, 1, 2].map(c => G.lo[c] + G.dim[c] * G.cs);
  for (let c = 0; c < 3; c++) { const oc = o.getComponent(c), dc = d.getComponent(c); if (Math.abs(dc) < 1e-12) { if (oc < G.lo[c] || oc > hi[c]) return null; continue; } let a = (G.lo[c] - oc) / dc, b = (hi[c] - oc) / dc; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null; }
  if (!rayStamp || rayStamp.length < M.nt) rayStamp = new Uint32Array(M.nt); rs++;
  const pos = [o.x + d.x * (t0 + 1e-6), o.y + d.y * (t0 + 1e-6), o.z + d.z * (t0 + 1e-6)], cell = [0, 1, 2].map(c => G.cell(c, pos[c])), dir = [d.x, d.y, d.z], step = dir.map(v => v > 0 ? 1 : -1), tMax = [], tDel = [];
  for (let c = 0; c < 3; c++) { if (Math.abs(dir[c]) < 1e-12) { tMax[c] = 1e9; tDel[c] = 1e9; continue; } const edge = G.lo[c] + (cell[c] + (step[c] > 0 ? 1 : 0)) * G.cs; tMax[c] = (edge - o.getComponent(c)) / dir[c]; tDel[c] = G.cs / Math.abs(dir[c]); }
  let best = 1e9, bt = -1, bu = 0, bv = 0;
  for (let guard = 0; guard < 600; guard++) {
    const ci = (cell[2] * G.dim[1] + cell[1]) * G.dim[0] + cell[0];
    for (let k = G.off[ci]; k < G.off[ci + 1]; k++) { const t = G.list[k]; if (rayStamp[t] === rs) continue; rayStamp[t] = rs; const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
      const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2], e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2], px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x, det = e1x * px + e1y * py + e1z * pz; if (Math.abs(det) < 1e-12) continue;
      const inv = 1 / det, tx = o.x - P[a], ty = o.y - P[a + 1], tz = o.z - P[a + 2], u = (tx * px + ty * py + tz * pz) * inv; if (u < 0 || u > 1) continue; const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, v = (d.x * qx + d.y * qy + d.z * qz) * inv; if (v < 0 || u + v > 1) continue;
      const tt = (e2x * qx + e2y * qy + e2z * qz) * inv; if (tt > 1e-6 && tt < best) { best = tt; bt = t; bu = u; bv = v; } }
    const ax = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2); if (best <= tMax[ax]) break; if (tMax[ax] > t1) break;
    cell[ax] += step[ax]; if (cell[ax] < 0 || cell[ax] >= G.dim[ax]) break; tMax[ax] += tDel[ax];
  }
  if (bt < 0) return null; const a = M.idx[bt * 3] * 3, b = M.idx[bt * 3 + 1] * 3, c = M.idx[bt * 3 + 2] * 3, w = 1 - bu - bv, N = M.nrm;
  const n = new THREE.Vector3(N[a] * w + N[b] * bu + N[c] * bv, N[a + 1] * w + N[b + 1] * bu + N[c + 1] * bv, N[a + 2] * w + N[b + 2] * bu + N[c + 2] * bv).normalize();
  return { t: best, point: o.clone().addScaledVector(d, best), normal: n, tri: bt };
}

/* ---------------- one touch of the brush ---------------- */
const Q = [], TMP = [];
let undoRec = null, touched = null, tstamp = 1;
function remember(i) { if (touched[i] === tstamp) return; touched[i] = tstamp; const P = M.pos, C = M.col; undoRec.i.push(i); undoRec.p.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); undoRec.c.push(C[i * 3], C[i * 3 + 1], C[i * 3 + 2]); }
const fall = t => { const k = 1 - t * t; return k * k; }, sharp = t => { const k = 1 - t; return k * k * k; };
function dab(px, py, pz, r, s, sign, brush, changed) {
  const P = M.pos, N = M.nrm, C = M.col, L = query(px, py, pz, r, Q); if (!L.length) return;
  let nx = 0, ny = 0, nz = 0, cx = 0, cy = 0, cz = 0, ws = 0;
  for (let k = 0; k < L.length; k += 2) { const i = L[k], w = fall(Math.sqrt(L[k + 1]) / r); nx += N[i * 3] * w; ny += N[i * 3 + 1] * w; nz += N[i * 3 + 2] * w; cx += P[i * 3] * w; cy += P[i * 3 + 1] * w; cz += P[i * 3 + 2] * w; ws += w; }
  const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl; cx /= ws; cy /= ws; cz /= ws;
  if (brush === 'smooth') { TMP.length = 0; for (let k = 0; k < L.length; k += 2) { const i = L[k]; let ax = 0, ay = 0, az = 0, n = 0; for (let j = M.vvo[i]; j < M.vvo[i + 1]; j++) { const v = M.vv[j] * 3; ax += P[v]; ay += P[v + 1]; az += P[v + 2]; n++; } TMP.push(n ? ax / n : P[i * 3], n ? ay / n : P[i * 3 + 1], n ? az / n : P[i * 3 + 2]); } }
  const pc = new THREE.Color(S.color);
  for (let k = 0, m = 0; k < L.length; k += 2, m += 3) {
    const i = L[k], o = i * 3, t = Math.sqrt(L[k + 1]) / r, w = fall(t); remember(i); changed.push(i);
    switch (brush) {
      case 'draw': { const a = r * .045 * s * sign * w; P[o] += nx * a; P[o + 1] += ny * a; P[o + 2] += nz * a; break; }
      case 'inflate': { const a = r * .04 * s * sign * w; P[o] += N[o] * a; P[o + 1] += N[o + 1] * a; P[o + 2] += N[o + 2] * a; break; }
      case 'clay': { const h = r * .12 * sign, dx = cx + nx * h - P[o], dy = cy + ny * h - P[o + 1], dz = cz + nz * h - P[o + 2], dd = dx * nx + dy * ny + dz * nz; if (dd * sign > 0) { const a = dd * w * s * .35; P[o] += nx * a; P[o + 1] += ny * a; P[o + 2] += nz * a; } break; }
      case 'flatten': { const dd = (cx - P[o]) * nx + (cy - P[o + 1]) * ny + (cz - P[o + 2]) * nz, a = dd * w * s * .4; P[o] += nx * a; P[o + 1] += ny * a; P[o + 2] += nz * a; break; }
      case 'smooth': { const a = w * s * .7; P[o] += (TMP[m] - P[o]) * a; P[o + 1] += (TMP[m + 1] - P[o + 1]) * a; P[o + 2] += (TMP[m + 2] - P[o + 2]) * a; break; }
      case 'pinch': { let dx = px - P[o], dy = py - P[o + 1], dz = pz - P[o + 2]; const dn = dx * nx + dy * ny + dz * nz; dx -= nx * dn; dy -= ny * dn; dz -= nz * dn; const a = w * s * .12 * sign; P[o] += dx * a; P[o + 1] += dy * a; P[o + 2] += dz * a; break; }
      case 'crease': { const ws2 = sharp(t), a = -r * .035 * s * sign * ws2; let dx = px - P[o], dy = py - P[o + 1], dz = pz - P[o + 2]; const dn = dx * nx + dy * ny + dz * nz; dx -= nx * dn; dy -= ny * dn; dz -= nz * dn; const pa = w * s * .08; P[o] += nx * a + dx * pa; P[o + 1] += ny * a + dy * pa; P[o + 2] += nz * a + dz * pa; break; }
      case 'paint': { const a = w * s, tr = sign > 0 ? pc.r : 1, tg = sign > 0 ? pc.g : 1, tb = sign > 0 ? pc.b : 1; C[o] += (tr - C[o]) * a; C[o + 1] += (tg - C[o + 1]) * a; C[o + 2] += (tb - C[o + 2]) * a; break; }
    }
  }
}

/* ---------------- viewport ---------------- */
const V = { R: null, sc: null, cam: null, host: null, orb: { yaw: .6, pitch: .25, dist: 2.4, t: new THREE.Vector3(0, 0, 0) }, mat: null, ring: null, ring2: null, raf: 0, dirty: true, hover: null };
function vpInit() {
  if (V.R) return; const host = h('div', { class: 'sc-vp' }); V.host = host; const R = new THREE.WebGLRenderer({ antialias: true, alpha: true }); R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R.outputEncoding = THREE.sRGBEncoding; host.append(R.domElement); V.R = R;
  const sc = new THREE.Scene(); V.sc = sc; V.cam = new THREE.PerspectiveCamera(32, 1, .005, 200);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })(), transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; sc.add(shadow); V.shadow = shadow;
  const ringM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .9, depthTest: false, side: THREE.DoubleSide }); V.ring = new THREE.Mesh(new THREE.RingGeometry(.965, 1, 64), ringM); V.ring.renderOrder = 10; V.ring.visible = false; sc.add(V.ring);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(.05, 16), ringM); V.ring.add(dot); V.ring2 = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .35, depthTest: false, side: THREE.DoubleSide })); V.ring2.renderOrder = 10; V.ring2.visible = false; sc.add(V.ring2);
  new ResizeObserver(() => { const w = host.clientWidth, hh = host.clientHeight; if (!w || !hh) return; R.setSize(w, hh, false); V.cam.aspect = w / hh; V.cam.updateProjectionMatrix(); V.dirty = true; }).observe(host);
  input(R.domElement);
}
function setMaterial() {
  if (!M || !M.mesh) return; const mc = matcap(S.mat); if (!V.mat) V.mat = new THREE.MeshMatcapMaterial({ vertexColors: true }); V.mat.matcap = mc.tex; V.mat.flatShading = S.flat; V.mat.side = M.flat ? THREE.DoubleSide : THREE.FrontSide; V.mat.needsUpdate = true; M.mesh.material = V.mat;
  if (S.wire && !M.wire) { M.wire = new THREE.Mesh(M.geo, new THREE.MeshBasicMaterial({ color: '#000000', wireframe: true, transparent: true, opacity: .14, depthWrite: false })); M.mesh.add(M.wire); } else if (!S.wire && M.wire) { M.mesh.remove(M.wire); M.wire.material.dispose(); M.wire = null; } V.dirty = true;
}
function camPlace() { const o = V.orb, c = V.cam; c.position.set(o.t.x + Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist, o.t.y + Math.sin(o.pitch) * o.dist, o.t.z + Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist); c.lookAt(o.t); c.updateMatrixWorld(); }
function frame() { if (!M) return; M.geo.computeBoundingSphere(); const bs = M.geo.boundingSphere; V.orb.t.copy(bs.center); V.orb.dist = Math.max(.3, bs.radius / Math.sin(V.cam.fov * Math.PI / 360) * 1.25); V.dirty = true; }
function loop() {
  V.raf = requestAnimationFrame(loop); if (!S.on) return;
  const ws = $('#wsModel'); if (!window.Ed.project || Ed.project !== S.project) { exit(false); return; } if (!ws || !ws.classList.contains('on')) { exit(true); return; }
  if (!V.dirty) return; V.dirty = false; camPlace(); if (M) { M.geo.computeBoundingBox(); const b = M.geo.boundingBox; V.shadow.position.set((b.min.x + b.max.x) / 2, b.min.y - .002, (b.min.z + b.max.z) / 2); V.shadow.scale.setScalar(Math.max(b.max.x - b.min.x, b.max.z - b.min.z) * .75 + .05); }
  V.R.render(V.sc, V.cam);
}
const pxToWorld = dist => 2 * dist * Math.tan(V.cam.fov * Math.PI / 360) / Math.max(1, V.R.domElement.clientHeight);
function rayAt(e) { const r = V.R.domElement.getBoundingClientRect(), rc = new THREE.Raycaster(); camPlace(); rc.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), V.cam); return rc.ray; }
function showRing(hit) {
  if (!hit) { V.ring.visible = V.ring2.visible = false; V.dirty = true; return; } const rw = S.radius * pxToWorld(V.cam.position.distanceTo(hit.point)), col = brushNow() === 'smooth' ? '#7ff0e4' : signNow() < 0 ? '#ff7a7c' : '#ffffff';
  V.ring.material.color.set(col); V.ring.position.copy(hit.point).addScaledVector(hit.normal, .002); V.ring.lookAt(hit.point.clone().add(hit.normal)); V.ring.scale.setScalar(rw); V.ring.visible = true;
  V.ring2.visible = S.sym && Math.abs(hit.point.x) > rw * .2; if (V.ring2.visible) { V.ring2.position.set(-hit.point.x, hit.point.y, hit.point.z); const n2 = hit.normal.clone(); n2.x = -n2.x; V.ring2.lookAt(V.ring2.position.clone().add(n2)); V.ring2.scale.setScalar(rw); } V.dirty = true;
}
const keysDown = new Set();
const brushNow = () => keysDown.has('Shift') ? 'smooth' : S.brush, signNow = () => (S.invert !== (keysDown.has('Control') || keysDown.has('Meta') || keysDown.has('Alt'))) ? -1 : 1;

/* ---------------- pointer: sculpt on the clay, orbit elsewhere, two fingers pan and zoom ---------------- */
const ST = { stroke: null, orbit: null, pts: new Map(), pinch: null };
function input(el) {
  el.tabIndex = 0; el.style.touchAction = 'none'; el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('pointerdown', e => {
    el.focus({ preventScroll: true }); try { el.setPointerCapture(e.pointerId); } catch (x) { } ST.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ST.pts.size === 2) { if (ST.stroke) endStroke(); ST.orbit = null; const [a, b] = [...ST.pts.values()]; ST.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; return; }
    if (!M) return; const ray = e.button === 0 ? rayAt(e) : null, hit = ray ? raycast(ray.origin, ray.direction) : null;
    if (hit) beginStroke(e, hit); else ST.orbit = { x: e.clientX, y: e.clientY, pan: e.button === 1 || e.shiftKey || e.button === 2 && e.shiftKey };
  });
  el.addEventListener('pointermove', e => {
    if (ST.pts.has(e.pointerId)) ST.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ST.pinch && ST.pts.size === 2) { const [a, b] = [...ST.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; V.orb.dist = clamp(V.orb.dist * ST.pinch.d / Math.max(1, d), .05, 60); pan(mx - ST.pinch.mx, my - ST.pinch.my); ST.pinch = { d, mx, my }; V.dirty = true; return; }
    if (ST.stroke) { moveStroke(e); return; }
    if (ST.orbit) { const dx = e.clientX - ST.orbit.x, dy = e.clientY - ST.orbit.y; ST.orbit.x = e.clientX; ST.orbit.y = e.clientY; if (ST.orbit.pan) pan(dx, dy); else { V.orb.yaw -= dx * .008; V.orb.pitch = clamp(V.orb.pitch + dy * .008, -1.5, 1.5); } showRing(null); V.dirty = true; return; }
    if (M && e.pointerType !== 'touch') { const r = rayAt(e); V.hover = raycast(r.origin, r.direction); showRing(V.hover); }
  });
  const up = e => { ST.pts.delete(e.pointerId); if (ST.pts.size < 2) ST.pinch = null; if (ST.stroke) endStroke(); ST.orbit = null; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', () => { if (!ST.stroke) showRing(null); });
  el.addEventListener('wheel', e => { e.preventDefault(); V.orb.dist = clamp(V.orb.dist * (e.deltaY > 0 ? 1.1 : 1 / 1.1), .05, 60); V.dirty = true; if (V.hover) showRing(V.hover); }, { passive: false });
}
function pan(dx, dy) { const k = pxToWorld(V.orb.dist), c = V.cam, rt = new THREE.Vector3(1, 0, 0).applyQuaternion(c.quaternion), upv = new THREE.Vector3(0, 1, 0).applyQuaternion(c.quaternion); V.orb.t.addScaledVector(rt, -dx * k).addScaledVector(upv, dy * k); }
function beginStroke(e, hit) {
  touched = touched && touched.length >= M.nv ? touched : new Uint32Array(M.nv); tstamp++; undoRec = { i: [], p: [], c: [] }; S.redo.length = 0;
  const b = brushNow(), st = { b, sign: signNow(), last: { x: e.clientX, y: e.clientY }, dist: V.cam.position.distanceTo(hit.point), dabs: 0, changed: [] }; ST.stroke = st;
  if (b === 'grab') { const rw = S.radius * pxToWorld(st.dist); st.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(V.cam.getWorldDirection(new THREE.Vector3()).negate(), hit.point); st.p0 = hit.point.clone(); const L = query(hit.point.x, hit.point.y, hit.point.z, rw, []); st.set = []; for (let k = 0; k < L.length; k += 2) { const i = L[k]; remember(i); st.set.push(i, fall(Math.sqrt(L[k + 1]) / rw), M.pos[i * 3], M.pos[i * 3 + 1], M.pos[i * 3 + 2]); }
    if (S.sym) { const L2 = query(-hit.point.x, hit.point.y, hit.point.z, rw, []); st.set2 = []; for (let k = 0; k < L2.length; k += 2) { const i = L2[k]; if (M.pos[i * 3] * hit.point.x > 0 && Math.abs(hit.point.x) > rw * .1) continue; remember(i); st.set2.push(i, fall(Math.sqrt(L2[k + 1]) / rw), M.pos[i * 3], M.pos[i * 3 + 1], M.pos[i * 3 + 2]); } } return; }
  applyDab(hit, e);
}
function applyDab(hit, e) {
  const st = ST.stroke, rw = S.radius * pxToWorld(V.cam.position.distanceTo(hit.point)), pr = S.pressure && e.pointerType === 'pen' && e.pressure > 0 ? Math.max(.08, e.pressure) : 1, s = (S.str[st.b] == null ? .5 : S.str[st.b]) * pr, p = hit.point;
  dab(p.x, p.y, p.z, rw, s, st.sign, st.b, st.changed); if (S.sym && Math.abs(p.x) > rw * .02) dab(-p.x, p.y, p.z, rw, s, st.sign, st.b, st.changed);
  if (++st.dabs % 6 === 0) VG = makeGrid(M.nv, VG.dim[0], (i, f) => { const x = M.pos[i * 3], y = M.pos[i * 3 + 1], z = M.pos[i * 3 + 2]; f(x, y, z, x, y, z); });
}
function moveStroke(e) {
  const st = ST.stroke; if (st.b === 'grab') { const r = rayAt(e), pt = r.intersectPlane(st.plane, new THREE.Vector3()); if (!pt) return; const d = pt.sub(st.p0), P = M.pos, ch = [];
    const go = (set, mx) => { for (let k = 0; k < set.length; k += 5) { const i = set[k], w = set[k + 1]; P[i * 3] = set[k + 2] + d.x * mx * w; P[i * 3 + 1] = set[k + 3] + d.y * w; P[i * 3 + 2] = set[k + 4] + d.z * w; ch.push(i); } };
    go(st.set, 1); if (st.set2) go(st.set2, -1); updateNormals(ch); V.dirty = true; return; }
  const dx = e.clientX - st.last.x, dy = e.clientY - st.last.y, L = Math.hypot(dx, dy), spacing = Math.max(2, S.radius * .2); if (L < spacing) return;
  const n = Math.floor(L / spacing); for (let k = 1; k <= n; k++) { const x = st.last.x + dx * k / n, y = st.last.y + dy * k / n, r = rayAt({ clientX: x, clientY: y }), hit = raycast(r.origin, r.direction); if (hit) applyDab(hit, e); }
  st.last = { x: e.clientX, y: e.clientY }; const ch = st.changed; st.changed = []; updateNormals(ch); if (st.b === 'paint') { const a = M.geo.attributes.color; a.needsUpdate = true; } const r = rayAt(e); showRing(raycast(r.origin, r.direction)); V.dirty = true;
}
function endStroke() {
  const st = ST.stroke; ST.stroke = null; if (st.changed.length) updateNormals(st.changed); M.geo.attributes.color.needsUpdate = true; grids();
  if (undoRec && undoRec.i.length) { S.undo.push({ i: Uint32Array.from(undoRec.i), p: Float32Array.from(undoRec.p), c: Float32Array.from(undoRec.c) }); if (S.undo.length > 60) S.undo.shift(); S.dirty = true; } undoRec = null; info(); V.dirty = true;
}
function swapRec(rec) { const P = M.pos, C = M.col, ch = []; for (let k = 0; k < rec.i.length; k++) { const i = rec.i[k]; for (let c = 0; c < 3; c++) { const a = P[i * 3 + c], b = C[i * 3 + c]; P[i * 3 + c] = rec.p[k * 3 + c]; C[i * 3 + c] = rec.c[k * 3 + c]; rec.p[k * 3 + c] = a; rec.c[k * 3 + c] = b; } ch.push(i); } updateNormals(ch); M.geo.attributes.color.needsUpdate = true; grids(); }
function history(redo) {
  const from = redo ? S.redo : S.undo, to = redo ? S.undo : S.redo; if (!from.length) { U.toast(redo ? 'Nothing to redo' : 'Nothing to undo'); return; } const rec = from.pop();
  if (rec.topo) { const cur = { topo: true, recipe: M.recipe, pos: M.pos.slice(), col: M.col.slice() }; load(rec.recipe, rec.pos, rec.col); to.push(cur); } else { swapRec(rec); to.push(rec); } S.dirty = true; info(); V.dirty = true;
}

/* ---------------- whole-mesh tools ---------------- */
function subdivideAttr(idx, A, nv) {
  const out = Array.from(A), edges = new Map(); for (let t = 0; t < idx.length; t += 3) { const tri = [idx[t], idx[t + 1], idx[t + 2]]; for (const [a, b] of [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]]) { const k = a < b ? a * 4194304 + b : b * 4194304 + a; if (!edges.has(k)) { edges.set(k, 1); out.push((A[a * 3] + A[b * 3]) / 2, (A[a * 3 + 1] + A[b * 3 + 1]) / 2, (A[a * 3 + 2] + A[b * 3 + 2]) / 2); } } } return new Float32Array(out);
}
function subdivide() {
  if (!M) return; if (M.nt * 4 > 1400000) { U.toast('That is as detailed as it gets here'); return; }
  S.undo.push({ topo: true, recipe: M.recipe, pos: M.pos.slice(), col: M.col.slice() }); S.redo.length = 0;
  const recipe = Object.assign({}, M.recipe, { subs: (M.recipe.subs | 0) + 1 }), np = SM.subdivide({ pos: M.pos, idx: M.idx }, true).pos, nc = subdivideAttr(M.idx, M.col, M.nv);
  load(recipe, np, nc); S.dirty = true; U.toast('More detail: ' + M.nt.toLocaleString() + ' triangles');
}
function smoothAll() { if (!M) return; touched = new Uint32Array(M.nv); tstamp++; undoRec = { i: [], p: [], c: [] }; const P = M.pos, nxt = new Float32Array(P.length); for (let i = 0; i < M.nv; i++) { remember(i); let ax = 0, ay = 0, az = 0, n = 0; for (let j = M.vvo[i]; j < M.vvo[i + 1]; j++) { const v = M.vv[j] * 3; ax += P[v]; ay += P[v + 1]; az += P[v + 2]; n++; } if (!n) { nxt[i * 3] = P[i * 3]; nxt[i * 3 + 1] = P[i * 3 + 1]; nxt[i * 3 + 2] = P[i * 3 + 2]; continue; } nxt[i * 3] = P[i * 3] + (ax / n - P[i * 3]) * .5; nxt[i * 3 + 1] = P[i * 3 + 1] + (ay / n - P[i * 3 + 1]) * .5; nxt[i * 3 + 2] = P[i * 3 + 2] + (az / n - P[i * 3 + 2]) * .5; } P.set(nxt); allNormals(); M.geo.attributes.position.needsUpdate = true; grids(); S.undo.push({ i: Uint32Array.from(undoRec.i), p: Float32Array.from(undoRec.p), c: Float32Array.from(undoRec.c) }); undoRec = null; S.dirty = true; V.dirty = true; }
function load(recipe, pos, col) {
  if (M && M.mesh) { V.sc.remove(M.mesh); M.geo.dispose(); } adopt(recipe, pos, col); M.mesh = new THREE.Mesh(M.geo, V.mat || new THREE.MeshMatcapMaterial({ vertexColors: true })); V.sc.add(M.mesh); setMaterial(); info(); V.dirty = true;
}

/* ---------------- start, save, exit ---------------- */
const BASES = { sphere: ['Sphere', { base: 'sphere', level: 5 }, { base: 'sphere', level: 6 }], cube: ['Cube', { base: 'cube', subs: 1 }, { base: 'cube', subs: 2 }], cylinder: ['Cylinder', { base: 'cylinder', subs: 2 }, { base: 'cylinder', subs: 3 }], torus: ['Ring', { base: 'torus', subs: 1 }, { base: 'torus', subs: 2 }], plane: ['Plane', { base: 'plane', subs: 1 }, { base: 'plane', subs: 2 }] };
const CONVERT = { box: 'cube', cyl: 'cylinder', sphere: 'sphere-part', cone: 'cone', torus: 'torus', capsule: 'capsule', dome: 'dome', prism: 'prism', plane: 'panel' };
function newMeshId() { return 's' + ENG.uid(); }
function startFrom(key, hiDetail) {
  const def = BASES[key], recipe = ENG.clone(hiDetail ? def[2] : def[1]), topo = SM.topology(recipe), pos = topo.pos.slice(); let m = MWB.model(); if (!m) { MWB.newModel(null); m = MWB.model(); m.name = 'Sculpt ' + Object.keys(Ed.project.models).length; }
  MWB.push(); const id = newMeshId(), lift = key === 'plane' ? .01 : key === 'torus' ? .65 : .5, part = { id: 'p' + ENG.uid(), name: def[0] + ' sculpt', kind: 'sculpt', parent: null, p: [0, lift, 0], r: [0, 0, 0], d: { mesh: id, sx: 1, sy: 1, sz: 1 }, m: { color: '#bca995', rough: .6, metal: 0, glow: 0, opacity: 1, tex: 'none', tile: 1 } };
  m.parts.push(part); writeData(id, recipe, pos, null); MWB.dirty(); MWB.rebuild(); MWB.select([part.id]); open(m.id, part.id);
}
function convertPart(part) {
  const base = CONVERT[part.kind]; if (!base) { U.toast('This shape cannot be sculpted yet'); return; } MWB.push();
  let recipe = { base: base === 'sphere-part' ? 'sphere-part' : base, d: ENG.clone(part.d || {}), subs: 0 }; if (base === 'sphere-part') recipe = { base: 'ellipsoid', d: ENG.clone(part.d || {}), subs: 1 };
  let topo = SM.topology(recipe); while (topo.idx.length / 3 < 30000 && recipe.subs < 4) { recipe.subs++; topo = SM.topology(recipe); }
  const id = newMeshId(); writeData(id, recipe, topo.pos.slice(), null); part.kind = 'sculpt'; part.d = { mesh: id, sx: 1, sy: 1, sz: 1 }; MWB.dirty(); MWB.rebuild(); open(MWB.model().id, part.id);
}
function writeData(id, recipe, pos, col) { Ed.project.sculpts = Ed.project.sculpts || {}; const old = Ed.project.sculpts[id]; Ed.project.sculpts[id] = Object.assign({ recipe, v: ((old && old.v) || 0) + 1 }, SM.encode(pos, col)); SM.forget(id); }
function save(quiet) {
  if (!S.target || !M) return; const part = MWB.part(S.target.part); if (!part) return; writeData(part.d.mesh, M.recipe, M.pos, M.col); S.dirty = false; MWB.dirty(); U.markDirty();
  const size = (Ed.project.sculpts[part.d.mesh].p.length + Ed.project.sculpts[part.d.mesh].c.length) / 1024; if (!quiet) U.toast('Sculpt saved (' + (size > 1024 ? (size / 1024).toFixed(1) + ' MB' : Math.round(size) + ' KB') + ')'); info();
}
function open(modelId, partId) {
  const part = MWB.part(partId); if (!part || part.kind !== 'sculpt') return; const data = Ed.project.sculpts && Ed.project.sculpts[part.d.mesh]; if (!data) { U.toast('That sculpt is missing its data'); return; }
  enterUI(); S.target = { model: modelId, part: partId }; S.undo = []; S.redo = []; S.dirty = false; S.project = Ed.project; const dec = SM.decode(data); load(data.recipe, dec.pos, dec.col || new Float32Array(dec.pos.length).fill(1)); frame(); panels();
}
function enterUI() {
  vpInit(); S.project = Ed.project; S.on = true; const wrap = $('#mvpWrap'); if (!V.host.isConnected) wrap.append(V.host); $('#wsModel').classList.add('sculpting'); const start = $('.sc-start'); if (start) start.remove();
  if (!V.raf) loop(); V.dirty = true; requestAnimationFrame(() => { const w = V.host.clientWidth, hh = V.host.clientHeight; if (w && hh) { V.R.setSize(w, hh, false); V.cam.aspect = w / hh; V.cam.updateProjectionMatrix(); V.dirty = true; } });
}
function startScreen() {
  enterUI(); S.target = null; S.project = Ed.project; if (M && M.mesh) { V.sc.remove(M.mesh); M = null; } panels(); let hi = false;
  const box = h('div', { class: 'sc-start' }, h('b', null, 'Start a sculpt'), h('p', null, 'Pick a lump of clay to begin. It is added to the open model, or a new one if none is open.'));
  const grid = h('div', { class: 'sc-bases' }); Object.entries(BASES).forEach(([k, d]) => grid.append(h('button', { class: 'sc-base', onclick: () => startFrom(k, hi) }, h('i', { class: 'sc-bi sc-' + k }), h('span', null, d[0]))));
  const det = h('div', { class: 'seg' }, h('button', { class: 'on', onclick: e => { hi = false; [...det.children].forEach(b => b.classList.toggle('on', b === e.currentTarget)); } }, 'Medium detail'), h('button', { onclick: e => { hi = true; [...det.children].forEach(b => b.classList.toggle('on', b === e.currentTarget)); } }, 'High detail'));
  box.append(grid, det, h('button', { class: 'btn sm ghost', onclick: () => exit(false) }, 'Back to building')); V.host.append(box);
}
function exit(saveIt) {
  if (!S.on) return; if (saveIt && S.dirty) save(true); S.on = false; ST.stroke = null; $('#wsModel') && $('#wsModel').classList.remove('sculpting'); if (V.host && V.host.isConnected) V.host.remove(); const st = $('.sc-start'); if (st) st.remove();
  if (M && M.mesh) { V.sc.remove(M.mesh); M.geo.dispose(); } M = null; S.target = null; MWB.rebuild(); MWB.renderAll();
}

/* ---------------- panels ---------------- */
const svg = (p, s) => '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
function slider(label, val, min, max, step, on, fmt) { const out = h('b', null, fmt ? fmt(val) : val), r = h('input', { type: 'range', min, max, step, value: val, oninput: e => { const v = +e.target.value; out.textContent = fmt ? fmt(v) : v; on(v); } }); return h('div', { class: 'sc-sl' }, h('div', { class: 'sc-slh' }, h('span', null, label), out), r); }
function toggle(label, val, on, tip) { const b = h('button', { class: 'sc-tg' + (val ? ' on' : ''), title: tip || '', onclick: () => { val = !val; b.classList.toggle('on', val); on(val); } }, h('i'), label); return b; }
function panels() {
  const L = $('#mLeft'), R = $('#mRight'); if (!L || !R) return; L.innerHTML = ''; R.innerHTML = '';
  L.append(h('div', { class: 'ph' }, 'Sculpt', h('button', { class: 'btn sm', title: 'Save and go back to building with shapes', onclick: () => exit(true) }, 'Done')));
  const tiles = h('div', { class: 'sc-brushes' }); Object.entries(BR).forEach(([k, b]) => tiles.append(h('button', { class: 'sc-br' + (S.brush === k ? ' on' : ''), title: b.d + ' (' + b.k + ')', onclick: () => { S.brush = k; prefSave(); panels(); } }, h('span', { html: svg(b.ic, 20) }), h('small', null, b.n), h('kbd', null, b.k))));
  L.append(tiles);
  const set = h('div', { class: 'sc-set' }); const b = BR[S.brush];
  set.append(h('p', { class: 'sc-desc' }, b.d));
  set.append(slider('Radius', S.radius, 6, 320, 1, v => { S.radius = v; prefSave(); }, v => v + ' px'));
  set.append(slider('Strength', Math.round((S.str[S.brush] == null ? .5 : S.str[S.brush]) * 100), 1, 100, 1, v => { S.str[S.brush] = v / 100; prefSave(); }, v => v + '%'));
  if (S.brush === 'paint') { const c = h('input', { type: 'color', value: S.color, oninput: e => { S.color = e.target.value; prefSave(); } }); const sw = h('div', { class: 'sc-sw' }); ['#d24b4b', '#e08a3c', '#e6cf5a', '#5fbf6a', '#3fa3d8', '#7a5cd6', '#f2f2f2', '#2a2a2e', '#8a5a3c', '#c9a78a'].forEach(cc => sw.append(h('button', { style: 'background:' + cc, title: cc, onclick: () => { S.color = cc; c.value = cc; prefSave(); } }))); set.append(h('div', { class: 'sc-row' }, h('span', null, 'Color'), c), sw); }
  set.append(h('div', { class: 'sc-tgs' }, toggle('Subtract', S.invert, v => { S.invert = v; }, 'Dig in instead of building up (or hold Ctrl)'), toggle('Mirror X', S.sym, v => { S.sym = v; prefSave(); V.dirty = true; }, 'Sculpt both sides at once (X)'), toggle('Pen pressure', S.pressure, v => { S.pressure = v; prefSave(); }, 'A pen or Apple Pencil presses harder for stronger strokes')));
  L.append(set);
  L.append(h('div', { class: 'sc-keys' }, h('div', null, h('kbd', null, 'Shift'), ' smooth while held'), h('div', null, h('kbd', null, 'Ctrl'), ' subtract while held'), h('div', null, h('kbd', null, '['), h('kbd', null, ']'), ' brush size'), h('div', null, h('kbd', null, 'F'), ' frame, right drag orbits, wheel zooms')));
  /* right: mesh, look, history, save */
  const nm = MWB.part(S.target && S.target.part); R.append(h('div', { class: 'ph' }, 'Clay', h('span', { class: 'sc-info', id: 'scInfo' })));
  if (!M) { R.append(h('p', { class: 'help', style: 'padding:0 14px' }, 'Choose a starting shape in the middle.')); return; }
  const mesh = h('div', { class: 'sc-card' }, h('b', null, 'Detail'), h('p', { class: 'sc-desc' }, 'Subdividing splits every triangle in four, so small details hold. Sculpt the big shapes first.'),
    h('div', { class: 'sc-btns' }, h('button', { class: 'btn sm', onclick: subdivide }, 'Subdivide'), h('button', { class: 'btn sm', onclick: smoothAll }, 'Relax all')));
  const mats = h('div', { class: 'sc-mats' }); Object.entries(MATCAPS).forEach(([k, d]) => mats.append(h('button', { class: 'sc-mat' + (S.mat === k ? ' on' : ''), title: d[0], onclick: () => { S.mat = k; prefSave(); setMaterial(); panels(); } }, h('img', { src: matcap(k).url, alt: '' }), h('small', null, d[0]))));
  const look = h('div', { class: 'sc-card' }, h('b', null, 'Look while sculpting'), mats, h('div', { class: 'sc-tgs' }, toggle('Wireframe', S.wire, v => { S.wire = v; setMaterial(); }), toggle('Facets', S.flat, v => { S.flat = v; setMaterial(); })), h('p', { class: 'sc-desc' }, 'In the level and in games the sculpt uses the part\'s Surface settings and any paint.'));
  const hist = h('div', { class: 'sc-card' }, h('b', null, 'History'), h('div', { class: 'sc-btns' }, h('button', { class: 'btn sm', title: 'Undo (Ctrl+Z)', onclick: () => history(false) }, 'Undo'), h('button', { class: 'btn sm', title: 'Redo (Ctrl+Y)', onclick: () => history(true) }, 'Redo'), h('button', { class: 'btn sm', title: 'Frame the sculpt (F)', onclick: frame }, 'Frame')));
  const sv = h('div', { class: 'sc-card' }, h('b', null, nm ? nm.name : 'Sculpt'), h('div', { class: 'sc-btns' }, h('button', { class: 'btn sm primary', onclick: () => save(false) }, 'Save'), h('button', { class: 'btn sm', onclick: () => { save(true); exit(false); MWB.place(); } }, 'Save and place in level')));
  R.append(mesh, look, hist, sv); info();
}
function info() { const el = document.getElementById('scInfo'); if (el && M) el.textContent = M.nt.toLocaleString() + ' tris' + (S.dirty ? ' · unsaved' : ''); }

/* ---------------- keys ---------------- */
addEventListener('keydown', e => {
  keysDown.add(e.key); if (!S.on || Ed.tab !== 'model' || (e.target.closest && e.target.closest('input,textarea,select'))) return; const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey; let used = true;
  if (ctrl && k === 'z') history(e.shiftKey); else if (ctrl && k === 'y') history(true); else if (ctrl && k === 's') { save(false); }
  else if (!ctrl && /^[1-9]$/.test(e.key)) { const b = Object.keys(BR).find(x => BR[x].k === e.key); if (b) { S.brush = b; prefSave(); panels(); } }
  else if (k === '[' || k === ']') { S.radius = clamp(Math.round(S.radius * (k === ']' ? 1.15 : 1 / 1.15)), 6, 320); prefSave(); panels(); if (V.hover) showRing(V.hover); }
  else if (k === 'x' && !ctrl) { S.sym = !S.sym; prefSave(); panels(); U.toast('Mirror ' + (S.sym ? 'on' : 'off')); }
  else if (k === 'f' && !ctrl) frame(); else if (['w', 'e', 'r', 'g', 'm', 'd', 'delete', 'backspace'].includes(k)) { /* building shortcuts do nothing while sculpting */ } else used = false;
  if (k === 'shift' || k === 'control' || k === 'alt' || k === 'meta') { if (V.hover) showRing(V.hover); used = false; }
  if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
addEventListener('keyup', e => { keysDown.delete(e.key); if (S.on && V.hover) showRing(V.hover); }, true);
addEventListener('blur', () => keysDown.clear());

/* ---------------- hooks into the Model tab ---------------- */
MWB.afterTools = T => {
  const sw = h('div', { class: 'grp sc-mode', role: 'toolbar', 'aria-label': 'Mode' }, h('button', { class: 'tb on', title: 'Build with shapes' }, 'Build'), h('button', { class: 'tb', title: 'Sculpt digital clay', html: svg('<path d="M7 20c-2-2-2-6 1-9 2-2 5-2 6-5 2 2 3 6 0 9-2 2-5 2-7 5z"/>', 14) + 'Sculpt', onclick: () => { const m = MWB.model(), st = MWB.state, sel = st.sel.length ? MWB.part(st.sel[st.sel.length - 1]) : null; if (sel && sel.kind === 'sculpt') open(m.id, sel.id); else startScreen(); } }));
  T.prepend(sw);
};
MWB.afterRight = (R, prim, m) => {
  if (!prim) { const n = m.parts.filter(p => p.kind === 'sculpt').length; R.append(h('div', { class: 'acts' }, h('button', { class: 'btn sm', onclick: startScreen, html: svg('<path d="M7 20c-2-2-2-6 1-9 2-2 5-2 6-5 2 2 3 6 0 9-2 2-5 2-7 5z"/>', 14) + ' New sculpt' }), n ? h('span', { class: 'hint2', style: 'align-self:center' }, n + ' sculpted part' + (n > 1 ? 's' : '')) : null)); return; }
  if (prim.kind === 'sculpt') R.append(h('div', { class: 'acts' }, h('button', { class: 'btn sm primary', onclick: () => open(m.id, prim.id) }, 'Sculpt this part')));
  else if (CONVERT[prim.kind]) R.append(h('div', { class: 'acts' }, h('button', { class: 'btn sm', title: 'Turns this shape into clay you can sculpt. Its size, place and surface stay the same.', onclick: () => convertPart(prim) }, 'Turn into clay and sculpt')));
};

/* ---------------- look ---------------- */
document.head.append(h('style', null, `
#wsModel.sculpting #mvp canvas,#wsModel.sculpting #mTools,#wsModel.sculpting .vhint{display:none!important}
.sc-vp{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 38%,#2a2d34 0%,#17191e 48%,#0b0c0f 100%);overflow:hidden}
.sc-vp canvas{display:block;width:100%;height:100%;outline:none;cursor:crosshair}
.sc-start{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,90%);padding:22px 24px;border-radius:18px;background:rgba(14,15,19,.86);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.08);box-shadow:0 30px 80px -30px rgba(0,0,0,.9);display:flex;flex-direction:column;gap:12px;animation:vtCard .4s cubic-bezier(.22,1,.36,1)}
.sc-start>b{font:700 18px "Chakra Petch",sans-serif}.sc-start>p{margin:0;color:var(--dim);font-size:13px}
.sc-bases{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.sc-base{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:var(--ink);cursor:pointer;font:600 12px "Barlow",sans-serif;transition:transform .25s cubic-bezier(.22,1,.36,1),border-color .15s,background .15s}
.sc-base:hover{transform:translateY(-3px);border-color:var(--accent);background:rgba(255,255,255,.06)}
.sc-bi{width:46px;height:46px;display:block;background:radial-gradient(circle at 35% 30%,#efe3d6,#b9a692 45%,#5e5246 100%);box-shadow:0 8px 16px -8px rgba(0,0,0,.8)}
.sc-sphere{border-radius:50%}.sc-cube{border-radius:7px}.sc-cylinder{border-radius:46% 46% 46% 46%/20% 20% 20% 20%;width:38px}.sc-torus{border-radius:50%;background:radial-gradient(circle at 50% 50%,transparent 33%,#b9a692 35%,#efe3d6 52%,#5e5246 70%,transparent 72%)!important;box-shadow:none}.sc-plane{height:16px;margin:15px 0;border-radius:4px;transform:perspective(60px) rotateX(45deg)}
.sc-brushes{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:4px 12px 10px}
.sc-br{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px 8px;border-radius:11px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01));color:var(--dim);cursor:pointer;transition:transform .2s cubic-bezier(.22,1,.36,1),border-color .15s,color .15s,background .15s}
.sc-br:hover{color:var(--ink);transform:translateY(-1px);border-color:rgba(255,255,255,.16)}
.sc-br.on{color:#fff;border-color:var(--accent);background:linear-gradient(180deg,rgba(229,56,59,.22),rgba(229,56,59,.06));box-shadow:0 8px 20px -12px var(--glow)}
.sc-br small{font:600 11.5px "Barlow",sans-serif}.sc-br kbd{position:absolute;top:4px;right:5px;font-size:9px;padding:0 3px;opacity:.55}
.sc-set{margin:0 12px 10px;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);display:flex;flex-direction:column;gap:12px}
.sc-desc{margin:0;color:var(--dim);font-size:12px;line-height:1.45}
.sc-sl{display:flex;flex-direction:column;gap:2px}.sc-slh{display:flex;justify-content:space-between;font-size:12px;color:var(--dim)}.sc-slh b{color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums}
.sc-tgs{display:flex;flex-wrap:wrap;gap:6px}
.sc-tg{display:inline-flex;align-items:center;gap:7px;padding:6px 10px 6px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:var(--dim);font:600 11.5px "Barlow",sans-serif;cursor:pointer;transition:all .18s}
.sc-tg i{width:22px;height:13px;border-radius:9px;background:rgba(255,255,255,.16);position:relative;transition:background .2s}.sc-tg i:after{content:"";position:absolute;left:2px;top:2px;width:9px;height:9px;border-radius:50%;background:#fff;transition:transform .3s cubic-bezier(.22,1,.36,1)}
.sc-tg.on{color:var(--ink);border-color:rgba(229,56,59,.45)}.sc-tg.on i{background:var(--accent)}.sc-tg.on i:after{transform:translateX(9px)}
.sc-row{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--dim)}.sc-row input{width:44px;height:26px;padding:1px;border-radius:7px}
.sc-sw{display:flex;flex-wrap:wrap;gap:6px}.sc-sw button{width:20px;height:20px;border-radius:50%;border:1px solid rgba(255,255,255,.2);cursor:pointer;transition:transform .2s cubic-bezier(.22,1,.36,1)}.sc-sw button:hover{transform:scale(1.18)}
.sc-keys{margin:0 12px 14px;display:flex;flex-direction:column;gap:5px;color:var(--dim);font-size:11.5px}.sc-keys kbd{margin-right:3px}
.sc-card{margin:0 12px 10px;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);display:flex;flex-direction:column;gap:9px}
.sc-card>b{font:700 11px "Chakra Petch",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}
.sc-btns{display:flex;flex-wrap:wrap;gap:6px}
.sc-mats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sc-mat{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 2px;border-radius:10px;border:1px solid transparent;background:none;color:var(--dim);cursor:pointer;transition:all .18s}
.sc-mat img{width:36px;height:36px;border-radius:50%;box-shadow:0 6px 14px -8px rgba(0,0,0,.9);transition:transform .25s cubic-bezier(.22,1,.36,1)}.sc-mat:hover img{transform:scale(1.08)}
.sc-mat small{font-size:10.5px}.sc-mat.on{border-color:var(--accent);color:var(--ink);background:rgba(229,56,59,.08)}
.sc-info{font:600 11px "Barlow",sans-serif;letter-spacing:0;text-transform:none;color:var(--dim)}
.sc-mode .tb{min-width:58px}
`));
Ed.sculpt = { open, startScreen, exit, save, state: S, get mesh() { return M; }, dab: (p, r, s, sign, b) => { const ch = []; touched = touched && touched.length >= M.nv ? touched : new Uint32Array(M.nv); tstamp++; undoRec = { i: [], p: [], c: [] }; dab(p.x, p.y, p.z, r, s, sign, b, ch); updateNormals(ch); grids(); V.dirty = true; return ch.length; }, raycast: (o, d) => raycast(o, d), subdivide, frame, render: () => { if (!V.R) return; camPlace(); V.R.render(V.sc, V.cam); }, view: V };
})();
