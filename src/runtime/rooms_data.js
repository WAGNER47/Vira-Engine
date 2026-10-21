/* VIRA ROOMS: a room is a small parametric description (footprint, wall height and thickness, floor, ceiling, doors and windows)
   that generates cube grid blocks, so rooms are solid, exportable and can carry behaviors like any block set. */
(function () {
'use strict';
const ENG = window.ENG, CG = ENG.CG, U = v => Math.round(v * 16), R = ENG.ROOM = {};
R.defaults = () => ({ v: 1, pts: [[-3, -2.5], [3, -2.5], [3, 2.5], [-3, 2.5]], closed: true, h: 3, t: .25, align: 'center', floor: true, ft: .25, ceil: false, ct: .25,
  mats: { wall: { color: '#d9d2c3', tex: 'none', tile: 1 }, floor: { color: '#8a8f93', tex: 'tiles', tile: 1 }, ceil: { color: '#e8e4da', tex: 'none', tile: 1 } }, openings: [] });
R.mats = room => {
  const m = room.mats || {}, mk = (x, name, def) => Object.assign({ name, color: '#d9d2c3', tex: 'none', tile: 1, rough: .9, metal: 0, glow: 0, opacity: 1 }, def, x || {});
  return [mk(m.wall, 'Walls'), mk(m.floor, 'Floor', { rough: .6 }), mk(m.ceil, 'Ceiling'), { name: 'Glass', color: '#9fc4d6', tex: 'none', tile: 1, rough: .05, metal: .1, glow: 0, opacity: .35 }];
};
/* scanline split of a rectilinear polygon into rectangles [x0, z0, x1, z1] */
R.rects = pts => {
  const zs = [...new Set(pts.map(p => p[1]))].sort((a, b) => a - b), out = [];
  for (let k = 0; k + 1 < zs.length; k++) {
    const z0 = zs[k], z1 = zs[k + 1], xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if (a[0] === b[0] && Math.min(a[1], b[1]) <= z0 && Math.max(a[1], b[1]) >= z1) xs.push(a[0]); }
    xs.sort((a, b) => a - b); for (let j = 0; j + 1 < xs.length; j += 2) if (xs[j + 1] > xs[j]) out.push([xs[j], z0, xs[j + 1], z1]);
  }
  return out;
};
/* footprint in 1/16 m units, wall centre lines shifted by the alignment, one entry per wall */
R.layout = room => {
  const pts = room.pts.map(p => [U(p[0]), U(p[1])]), n = pts.length, closed = room.closed !== false && n >= 3, t = Math.max(2, Math.round(U(room.t) / 2) * 2), half = t / 2, m = closed ? n : Math.max(0, n - 1);
  let A = 0; if (closed) for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; }
  const s = (closed && room.align === 'inside' ? 1 : closed && room.align === 'outside' ? -1 : 0) * half, ccw = A > 0, E = [];
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n], hor = a[1] === b[1], ver = a[0] === b[0]; if (!hor && !ver) { E.push(null); continue; }
    const dx = Math.sign(b[0] - a[0]), dz = Math.sign(b[1] - a[1]), nx = ccw ? -dz : dz, nz = ccw ? dx : -dx; E.push({ i, hor, dx, dz, nx, nz, off: hor ? nz * s : nx * s });
  }
  const V = pts.map((p, k) => { let x = p[0], z = p[1]; [closed ? (k - 1 + n) % n : k - 1, k].forEach(j => { const e = j >= 0 && j < m ? E[j] : null; if (!e) return; if (e.hor) z = pts[e.i][1] + e.off; else x = pts[e.i][0] + e.off; }); return [x, z]; });
  return { pts, V, E, n, m, closed, t, half, ccw, area: Math.abs(A) / 2 / 256 };
};
R.toData = room => {
  const d = CG.fill(null); d.mats = R.mats(room); const L = R.layout(room), h = Math.max(2, U(room.h)), ft = Math.max(1, U(room.ft == null ? .25 : room.ft)), ct = Math.max(1, U(room.ct == null ? .25 : room.ct)), half = L.half, ends = i => ({ a: L.V[i], b: L.V[(i + 1) % L.n] });
  for (const e of L.E) { if (!e || (room.off || []).includes(e.i)) continue; const { a, b } = ends(e.i); if (e.hor) CG.add(d, [Math.min(a[0], b[0]) - half, 0, a[1] - half, Math.max(a[0], b[0]) + half, h, a[1] + half], 0); else CG.add(d, [a[0] - half, 0, Math.min(a[1], b[1]) - half, a[0] + half, h, Math.max(a[1], b[1]) + half], 0); }
  (room.openings || []).forEach(op => {
    const e = L.E[op.e]; if (!e || (room.off || []).includes(op.e)) return; const { a, b } = ends(e.i), len = e.hor ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1]), w = Math.max(2, U(op.w)); if (len < w) return;
    const at = Math.max(w / 2, Math.min(len - w / 2, U(op.at))), s0 = Math.max(0, U(op.sill || 0)), hh = Math.max(2, U(op.h)), start = e.hor ? a[0] : a[1], dir = e.hor ? e.dx : e.dz, p0 = start + dir * (at - w / 2), p1 = start + dir * (at + w / 2), lo = Math.min(p0, p1), hi = Math.max(p0, p1), line = e.hor ? a[1] : a[0];
    const box = (c0, c1, y0, y1) => e.hor ? [lo, y0, line - c0, hi, y1, line + c1] : [line - c0, y0, lo, line + c1, y1, hi];
    CG.sub(d, box(half + 1, half + 1, s0, s0 + hh)); if (op.kind === 'window') CG.add(d, box(1, 1, s0, s0 + hh), 3);
  });
  (room.cuts || []).forEach((list, i) => {
    const e = L.E[i]; if (!e || !list || !list.length) return; const line = e.hor ? L.V[i][1] : L.V[i][0];
    list.forEach(([c0, c1]) => { const lo = U(Math.min(c0, c1)), hi = U(Math.max(c0, c1)); if (hi <= lo) return; CG.sub(d, e.hor ? [lo, 0, line - half - 1, hi, h, line + half + 1] : [line - half - 1, 0, lo, line + half + 1, h, hi]); });
  });
  if (room.band && room.band.length) { const rm = CG.fill(null); d.boxes.forEach(b => CG.add(rm, [b[0], b[1], b[2], b[3], b[4], b[5]], 0)); room.band.forEach(q => CG.sub(rm, [q[0], -64, q[1], q[2], h + 64, q[3]])); rm.boxes.slice().forEach(b => CG.sub(d, [b[0], b[1], b[2], b[3], b[4], b[5]])); }
  if (room.fsub && room.fsub.length) room.fsub.forEach(q => CG.sub(d, [q[0], 0, q[1], q[2], h, q[3]]));
  if (L.closed) { const rects = R.rects(L.pts); if (room.floor !== false) rects.forEach(r => CG.add(d, [r[0], -ft, r[1], r[2], 0, r[3]], 1)); if (room.ceil) rects.forEach(r => CG.add(d, [r[0], h, r[1], r[2], h + ct, r[3]], 2)); }
  if (room.fcut && room.fcut.length) room.fcut.forEach(q => { CG.sub(d, [q[0], -ft - 2, q[1], q[2], 0, q[3]]); if (room.ceil) CG.sub(d, [q[0], h, q[1], q[2], h + ct + 2, q[3]]); });
  return d;
};
R.edgeLen = (room, i) => { const a = room.pts[i], b = room.pts[(i + 1) % room.pts.length]; return Math.hypot(b[0] - a[0], b[1] - a[1]); };
R.presets = {
  rect4: ['Room 4 x 4 m', [[-2, -2], [2, -2], [2, 2], [-2, 2]]], rect6: ['Room 6 x 5 m', [[-3, -2.5], [3, -2.5], [3, 2.5], [-3, 2.5]]], rect10: ['Large room 10 x 8 m', [[-5, -4], [5, -4], [5, 4], [-5, 4]]],
  corridor: ['Corridor 2 x 8 m', [[-4, -1], [4, -1], [4, 1], [-4, 1]]], L: ['L-shaped room', [[-4, -3], [4, -3], [4, 0], [0, 0], [0, 3], [-4, 3]]],
  U: ['U-shaped room', [[-5, -3], [5, -3], [5, 3], [2, 3], [2, 0], [-2, 0], [-2, 3], [-5, 3]]], T: ['T-shaped room', [[-5, -3], [5, -3], [5, 0], [2, 0], [2, 3], [-2, 3], [-2, 0], [-5, 0]]]
};
R.preset = id => {
  const p = R.presets[id]; if (!p) return null; const room = R.defaults(); room.pts = p[1].map(q => q.slice()); room.openings = [{ e: 0, at: R.edgeLen(room, 0) / 2, w: 1, h: 2.1, sill: 0, kind: 'door' }];
  const n = room.pts.length, w = 1.6; for (let i = 1; i < n; i++) if (R.edgeLen(room, i) >= 3) { room.openings.push({ e: i, at: R.edgeLen(room, i) / 2, w, h: 1.2, sill: 1, kind: 'window' }); break; } return room;
};
if (ENG.PREFABS.cubegrid) ENG.PREFABS.cubegrid.props.room = { t: 'json', d: null, l: 'Room' };
})();
