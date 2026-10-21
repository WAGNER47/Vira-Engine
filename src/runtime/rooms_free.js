/* VIRA FREE ROOMS: rooms of any shape (hexagon, circle, triangle, any polygon) and free single walls.
   Angled walls render as true rotated walls, collide as a fine run of boxes, and support doors, windows and openings. */
(function () {
'use strict';
const ENG = window.ENG, R = ENG.ROOM, CG = ENG.CG;
const freeToData = room => {
  const d = CG.fill(null); d.mats = R.mats(room); const P = room.pts, n = P.length, closed = room.closed !== false && n >= 3, m = closed ? n : n - 1, H = Math.max(.25, +room.h || 3), t = Math.max(.06, +room.t || .25), off = room.off || [], walls = [];
  for (let i = 0; i < m; i++) {
    if (off.includes(i)) continue; const a = P[i], b = P[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < .05) continue; const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, at = s => [a[0] + dx * s, a[1] + dz * s];
    const ops = (room.openings || []).filter(o => o.e === i).map(o => { if (o.raw) return { s0: o.at - o.w / 2, s1: o.at + o.w / 2, sill: o.sill || 0, top: Math.min(H, (o.sill || 0) + o.h), kind: 'cut' }; const w = Math.min(L - .1, Math.max(.2, +o.w || 1)), c = Math.max(w / 2, Math.min(L - w / 2, +o.at || L / 2)); return { s0: c - w / 2, s1: c + w / 2, sill: Math.max(0, +o.sill || 0), top: Math.min(H, Math.max(0, +o.sill || 0) + Math.max(.2, +o.h || 2)), kind: o.kind }; }).sort((x, y) => x.s0 - y.s0);
    const piece = (s0, s1, y0, y1, th, mat) => { if (s1 - s0 < .01 || y1 - y0 < .01) return; const p0 = at(s0), p1 = at(s1); walls.push({ x0: p0[0], z0: p0[1], x1: p1[0], z1: p1[1], y0, y1, t: th, m: mat, s0 }); };
    let cur = -t / 2;
    ops.forEach(o => { if (o.s0 > cur) piece(cur, o.s0, 0, H, t, 0); if (o.sill > 0) piece(o.s0, o.s1, 0, o.sill, t, 0); if (o.top < H) piece(o.s0, o.s1, o.top, H, t, 0); if (o.kind === 'window') piece(o.s0, o.s1, o.sill, o.top, .04, 3); cur = Math.max(cur, o.s1); });
    piece(cur, L + t / 2, 0, H, t, 0);
  }
  const poly = closed ? P.map(p => p.slice()) : null;
  d.free = { walls, floor: poly && room.floor !== false ? { pts: poly, y0: -Math.max(.05, +room.ft || .25), y1: 0, m: 1 } : null, ceil: poly && room.ceil ? { pts: poly, y0: H, y1: H + Math.max(.05, +room.ct || .25), m: 2 } : null };
  return d;
};
const baseTD = R.toData; R.toData = room => room && room.free ? R.freeToData(room) : baseTD(room);
R.freeToData = freeToData;
/* ---------- drawing free walls and polygon floors ---------- */
const uvBox = (geo, L, ox, tile) => { const p = geo.attributes.position, nrm = geo.attributes.normal, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)); if (ny > .5) uv.setXY(i, (x + ox) / tile, z / tile); else if (nx > .5) uv.setXY(i, z / tile, y / tile); else uv.setXY(i, (x + ox) / tile, y / tile); } uv.needsUpdate = true; };
const slab = (f, tile) => { const s = new THREE.Shape(f.pts.map(p => new THREE.Vector2(p[0], p[1]))); (f.holes || []).forEach(q => { const hp = new THREE.Path(); hp.moveTo(q[0], q[1]); hp.lineTo(q[2], q[1]); hp.lineTo(q[2], q[3]); hp.lineTo(q[0], q[3]); hp.closePath(); s.holes.push(hp); }); const geo = new THREE.ExtrudeGeometry(s, { depth: f.y1 - f.y0, bevelEnabled: false }); geo.rotateX(Math.PI / 2); geo.translate(0, f.y1, 0); const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile); uv.needsUpdate = true; geo.computeVertexNormals(); return geo; };
ENG.cgShadowFix = g => { g.traverse(m => { if (!m.isMesh || !m.material) return; m.castShadow = m.receiveShadow = true; m.userData.cgMesh = true; (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => { if (!x.transparent) x.shadowSide = THREE.DoubleSide; }); }); return g; };
const baseBuild = CG.build;
CG.build = function (data, project, opts) {
  const g = ENG.cgShadowFix(baseBuild.apply(this, arguments));
  if (data && (data.dome || data.vault)) { const cm = ENG.partMaterial(data.mats[2] || data.mats[0], 'box', project).clone(); cm.side = THREE.DoubleSide; const add = m => { m.castShadow = m.receiveShadow = true; m.userData.isCG = true; g.add(m); };
    if (data.dome) { const D = data.dome, m = new THREE.Mesh(new THREE.SphereGeometry(D.r + .02, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), cm); m.scale.y = D.rise / (D.r + .02); m.position.y = D.h; add(m); }
    if (data.vault) { const V = data.vault, along = (V.z1 - V.z0) >= (V.x1 - V.x0), span = along ? V.x1 - V.x0 : V.z1 - V.z0, len = along ? V.z1 - V.z0 : V.x1 - V.x0, R = span / 2 + .02, cx = (V.x0 + V.x1) / 2, cz = (V.z0 + V.z1) / 2;
      const geo = new THREE.CylinderGeometry(R, R, len, 32, 1, true, 0, Math.PI); geo.rotateZ(Math.PI / 2); if (along) geo.rotateY(Math.PI / 2); const m = new THREE.Mesh(geo, cm); m.scale.y = V.rise / R; m.position.set(cx, V.h, cz); add(m);
      [-1, 1].forEach(s => { const cap = new THREE.CircleGeometry(R, 24, 0, Math.PI); if (along) { cap.translate(0, 0, 0); } else cap.rotateY(Math.PI / 2); const c = new THREE.Mesh(cap, cm); c.scale.y = V.rise / R; if (along) c.position.set(cx, V.h, cz + s * len / 2); else c.position.set(cx + s * len / 2, V.h, cz); add(c); }); } }
  if (!data || !data.free) return g; const F = data.free, mc = {}, mat = i => mc[i] || (mc[i] = ENG.partMaterial(data.mats[i] || data.mats[0], 'box', project)), tile = i => Math.max(.1, +((data.mats[i] || {}).tile) || 1);
  const tag = m => { m.userData.walk = true; m.userData.isCG = true; m.castShadow = m.receiveShadow = true; g.add(m); };
  F.walls.forEach(w => { const L = Math.hypot(w.x1 - w.x0, w.z1 - w.z0), H = w.y1 - w.y0, geo = new THREE.BoxGeometry(L, H, w.t); uvBox(geo, L, (w.s0 || 0) + L / 2, tile(w.m)); geo.translate(0, w.y0 / 1 + H / 2, 0); const m = new THREE.Mesh(geo, mat(w.m)); m.position.set((w.x0 + w.x1) / 2, 0, (w.z0 + w.z1) / 2); m.rotation.y = -Math.atan2(w.z1 - w.z0, w.x1 - w.x0); if (w.m === 3) m.userData.glass = true; tag(m); });
  [F.floor, F.ceil].forEach(f => { if (f && f.pts.length >= 3) tag(new THREE.Mesh(slab(f, tile(f.m)), mat(f.m))); });
  return ENG.cgShadowFix(g);
};
/* ---------- colliding with free walls ---------- */
const GP = ENG.Game && ENG.Game.prototype;
if (GP && GP.cgCollide) {
  const baseC = GP.cgCollide;
  GP.cgCollide = function (e, force) {
    baseC.call(this, e, force); const p = e.o.props, d = p.data; if (!d || !d.free || p.collide === false || (!force && p.visible === false)) return;
    const root = e.root, inner = root.children[0] || root; inner.updateMatrixWorld(true); let mesh = null; inner.traverse(n => { if (!mesh && n.isMesh) mesh = n; }); const M = inner.matrixWorld, wp = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); M.decompose(wp, q, sc);
    const body = typeof CANNON !== 'undefined' && this.world ? new CANNON.Body({ mass: 0 }) : null; if (body) body.collisionFilterMask = -1; let n = 0;
    d.free.walls.forEach(w => { if (w.m === 3 && w.t < .05) return; const L = Math.hypot(w.x1 - w.x0, w.z1 - w.z0), dx = (w.x1 - w.x0) / L, dz = (w.z1 - w.z0) / L, k = Math.max(1, Math.ceil(L / .3)), seg = L / k, ha = seg / 2, ht = w.t / 2, hx = Math.abs(dx) * ha + Math.abs(dz) * ht, hz = Math.abs(dz) * ha + Math.abs(dx) * ht;
      for (let j = 0; j < k; j++) { const cx = w.x0 + dx * (j + .5) * seg, cz = w.z0 + dz * (j + .5) * seg; this.cols.push({ box: new THREE.Box3(new THREE.Vector3(cx - hx, w.y0, cz - hz), new THREE.Vector3(cx + hx, w.y1, cz + hz)).applyMatrix4(M), m: mesh, e }); }
      if (body) { const yaw = -Math.atan2(w.z1 - w.z0, w.x1 - w.x0), cq = new CANNON.Quaternion(); cq.setFromEuler(0, yaw, 0); body.addShape(new CANNON.Box(new CANNON.Vec3(L / 2 * Math.abs(sc.x), (w.y1 - w.y0) / 2 * Math.abs(sc.y), w.t / 2 * Math.abs(sc.z))), new CANNON.Vec3((w.x0 + w.x1) / 2 * sc.x, (w.y0 + w.y1) / 2 * sc.y, (w.z0 + w.z1) / 2 * sc.z), cq); n++; } });
    [d.free.floor, d.free.ceil].forEach(f => { if (!f || !body) return; const xs = f.pts.map(p => p[0]), zs = f.pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs); body.addShape(new CANNON.Box(new CANNON.Vec3((x1 - x0) / 2 * Math.abs(sc.x), (f.y1 - f.y0) / 2 * Math.abs(sc.y), (z1 - z0) / 2 * Math.abs(sc.z))), new CANNON.Vec3((x0 + x1) / 2 * sc.x, (f.y0 + f.y1) / 2 * sc.y, (z0 + z1) / 2 * sc.z)); n++; });
    if (body && n) { body.position.set(wp.x, wp.y, wp.z); body.quaternion.set(q.x, q.y, q.z, q.w); this.world.addBody(body); body.userData = { e }; e.bodies = (e.bodies || []).concat(body); }
  };
}
})();
/* ---------- angled rooms lose walls where they touch or overlap other rooms ---------- */
(function () {
'use strict';
const ENG = window.ENG, R = ENG.ROOM;
const pip = (x, z, G) => { let c = false; for (let i = 0, j = G.length - 1; i < G.length; j = i++) { const a = G[i], b = G[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
R.clipCuts = (room, i) => {
  const P = room.pts, n = P.length, a = P[i], b = P[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!room.clip || !room.clip.length || L < .05) return [];
  let A = 0; for (let k = 0; k < n; k++) { const p = P[k], q = P[(k + 1) % n]; A += p[0] * q[1] - q[0] * p[1]; } const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, ox = A > 0 ? dz : -dz, oz = A > 0 ? -dx : dx, out = [];
  room.clip.map(G => Array.isArray(G) ? { pts: G, y0: -1e9, y1: 1e9 } : G).forEach(C => { const G = C.pts, ts = [0, L];
    for (let k = 0; k < G.length; k++) { const c = G[k], d = G[(k + 1) % G.length], ex = d[0] - c[0], ez = d[1] - c[1], den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) continue; const t = ((c[0] - a[0]) * ez - (c[1] - a[1]) * ex) / den, u = ((c[0] - a[0]) * dz - (c[1] - a[1]) * dx) / den; if (t > 0 && t < L && u >= 0 && u <= 1) ts.push(t); }
    ts.sort((x, y) => x - y); let cur = null;
    for (let k = 0; k + 1 < ts.length; k++) { const t0 = ts[k], t1 = ts[k + 1]; if (t1 - t0 < .02) continue; const m = (t0 + t1) / 2, mx = a[0] + dx * m, mz = a[1] + dz * m; if (pip(mx, mz, G) || pip(mx + ox * .08, mz + oz * .08, G)) { if (cur && Math.abs(cur[1] - t0) < 1e-6) cur[1] = t1; else { cur = [t0, t1, C.y0, C.y1]; out.push(cur); } } } });
  return out;
};
const baseFree = R.freeToData;
R.freeToData = room => {
  if (!room.clip || !room.clip.length) return baseFree(room);
  const extra = []; const n = room.pts.length, m = room.closed !== false && n >= 3 ? n : n - 1, t = Math.max(.06, +room.t || .25), H = Math.max(.25, +room.h || 3);
  for (let i = 0; i < m; i++) R.clipCuts(room, i).forEach(([s0, s1, y0, y1]) => { const L = Math.hypot(room.pts[(i + 1) % n][0] - room.pts[i][0], room.pts[(i + 1) % n][1] - room.pts[i][1]), a0 = s0 < .001 ? -t / 2 - .01 : s0, a1 = s1 > L - .001 ? L + t / 2 + .01 : s1, sl = Math.max(0, y0 == null ? 0 : y0), tp = Math.min(H + 1, y1 == null ? H + 1 : (y1 >= H - .01 ? H + 1 : y1)); if (tp - sl < .05) return; extra.push({ e: i, at: (a0 + a1) / 2, w: a1 - a0, h: tp - sl, sill: sl, kind: 'cut', raw: true }); });
  const d = baseFree(Object.assign({}, room, { openings: (room.openings || []).concat(extra) })); if (d.free && d.free.floor) { d.free.floor.y1 = -.004; d.free.floor.y0 -= .004; } return d;
};
const td = R.toData;
R.toData = room => { const d = td(room); if (room && room.holes && room.holes.length) room.holes.forEach(hh => { const q = hh.r || hh; if (d.free) { if (d.free.floor) (d.free.floor.holes = d.free.floor.holes || []).push(q); } else ENG.CG.sub(d, [Math.round(q[0] * 16), -200, Math.round(q[1] * 16), Math.round(q[2] * 16), 0, Math.round(q[3] * 16)]); }); if (room && room.vsub && room.vsub.length && !d.free) room.vsub.forEach(bx => ENG.CG.sub(d, bx));
  if (room && (room.openings || []).some(op => op.kind === 'door' || op.kind === 'window')) { try { const FW = .08, T = +room.t || .3, DP = T + .07;
    if (d.free) { const P = room.pts, n = P.length; room.openings.forEach(op => { if (op.kind !== 'door' && op.kind !== 'window') return; const a = P[op.e], b = P[(op.e + 1) % n]; if (!a || !b) return; const Lg = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / Lg, dz = (b[1] - a[1]) / Lg, w = Math.min(Lg - .1, +op.w || 1), c = Math.max(w / 2, Math.min(Lg - w / 2, +op.at || Lg / 2)), sl = +op.sill || 0, hh = +op.h || 2, at = s => [a[0] + dx * s, a[1] + dz * s], pc = (s0, s1, y0, y1) => { const p0 = at(s0), p1 = at(s1); d.free.walls.push({ x0: p0[0], z0: p0[1], x1: p1[0], z1: p1[1], y0, y1, t: DP, m: 1, s0 }); };
      pc(c - w / 2 - FW, c - w / 2, sl, sl + hh + FW); pc(c + w / 2, c + w / 2 + FW, sl, sl + hh + FW); pc(c - w / 2 - FW, c + w / 2 + FW, sl + hh, sl + hh + FW); if (op.kind === 'window' || sl > .05) pc(c - w / 2 - FW, c + w / 2 + FW, sl - FW, sl); }); }
    else { const Ly = R.layout(room), U16 = v => Math.round(v * 16); room.openings.forEach(op => { if ((op.kind !== 'door' && op.kind !== 'window') || (room.off || []).includes(op.e)) return; const A = Ly.V[op.e], B = Ly.V[(op.e + 1) % Ly.n]; if (!A || !B) return; const ax = A[0] / 16, az = A[1] / 16, bx = B[0] / 16, bz = B[1] / 16, Lg = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / Lg, uz = (bz - az) / Lg, w = Math.min(Lg - .1, +op.w || 1), c = Math.max(w / 2, Math.min(Lg - w / 2, +op.at || Lg / 2)), sl = +op.sill || 0, hh = +op.h || 2;
      const bx3 = (s0, s1, y0, y1) => { const p0 = [ax + ux * s0, az + uz * s0], p1 = [ax + ux * s1, az + uz * s1], x0 = Math.min(p0[0], p1[0]) - Math.abs(uz) * DP / 2, x1 = Math.max(p0[0], p1[0]) + Math.abs(uz) * DP / 2, z0 = Math.min(p0[1], p1[1]) - Math.abs(ux) * DP / 2, z1 = Math.max(p0[1], p1[1]) + Math.abs(ux) * DP / 2; ENG.CG.add(d, [U16(x0), U16(y0), U16(z0), U16(x1), U16(y1), U16(z1)], 1); };
      bx3(c - w / 2 - FW, c - w / 2, sl, sl + hh + FW); bx3(c + w / 2, c + w / 2 + FW, sl, sl + hh + FW); bx3(c - w / 2 - FW, c + w / 2 + FW, sl + hh, sl + hh + FW); if (op.kind === 'window' || sl > .05) bx3(c - w / 2 - FW, c + w / 2 + FW, sl - FW, sl); }); } } catch (err) { } }
  const H = +(room && room.h) || 3, cc = room ? (room.ccut || []).concat((room.choles || []).map(x => x.r)) : []; if (cc.length && room.ceil) cc.forEach(q => { if (d.free) { if (d.free.ceil) (d.free.ceil.holes = d.free.ceil.holes || []).push(q); } else ENG.CG.sub(d, [Math.round(q[0] * 16), Math.round(H * 16), Math.round(q[1] * 16), Math.round(q[2] * 16), Math.round(H * 16) + 200, Math.round(q[3] * 16)]); });
  if (room && room.pts && room.pts.length >= 3) { if (+room.dome > 0) d.dome = { r: Math.max(...room.pts.map(p => Math.hypot(p[0], p[1]))), h: H, rise: +room.dome }; if (+room.vault > 0) { const xs = room.pts.map(p => p[0]), zs = room.pts.map(p => p[1]); d.vault = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs), h: H, rise: +room.vault }; } }
  if (room && room.reflect && room.closed !== false && room.pts.length >= 3) d.reflect = { pts: room.pts.map(p => p.slice()), k: room.reflectK == null ? .35 : +room.reflectK, tint: room.reflectTint || '#a3adb8' }; return d; };
/* ---------- reflections that keep their sharpness at any size ---------- */
const MP = ENG.PREFABS.mirror;
if (MP) {
  const mb = MP.build; MP.build = function (o, c) { const keep = ENG.mirrorRes, s = o.s || [1, 1]; ENG.mirrorRes = Math.max(keep, Math.min(2048, Math.round(Math.max(s[0], s[1]) * 300))); try { return mb.call(this, o, c || {}); } finally { ENG.mirrorRes = keep; } };
  ENG.mirrorShader = () => { if (ENG._msh) return ENG._msh; let sh = null; try { MP.build({ s: [1, 1, .05], props: { tint: '#ffffff', opacity: .5, frame: false } }, {}).traverse(n => { if (!sh && n.material && n.material.uniforms && n.material.uniforms.opacity) sh = { uniforms: n.material.uniforms, vertexShader: n.material.vertexShader, fragmentShader: n.material.fragmentShader }; }); } catch (e) { } return (ENG._msh = sh); };
  ENG.PREFABS.reflect_floor = { type: 'reflect_floor', label: 'Reflective floor', cat: 'Lights & FX', size: [4, .02, 4], props: { tint: { t: 'color', d: '#a3adb8', l: 'Tint' }, opacity: { t: 'num', d: .35, min: .05, max: 1, step: .05, l: 'Reflection strength' } },
    build(o, c) { const g = new THREE.Group(), w = Math.max(.1, o.s[0]), dz = Math.max(.1, o.s[2]), inner = MP.build({ s: [w, dz, .05], props: { tint: o.props.tint, opacity: o.props.opacity, frame: false, breakable: false } }, c || {}); inner.rotation.x = -Math.PI / 2; inner.position.set(0, -o.s[1] / 2 + .004, dz / 2); g.add(inner); return g; } };
  const cg = ENG.PREFABS.cubegrid, cb = cg.build;
  cg.build = function (o, c) {
    const g = cb.call(this, o, c), d = o.props && o.props.data, r = d && d.reflect; if (!r || (c && c.thumb) || !THREE.Reflector) return g; const sh = ENG.mirrorShader(); if (!sh) return g;
    const shape = new THREE.Shape(r.pts.map(p => new THREE.Vector2(p[0], -p[1]))), xs = r.pts.map(p => p[0]), zs = r.pts.map(p => p[1]), big = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)), res = Math.max(512, Math.min(2048, Math.round(big * 220)));
    const m = new THREE.Reflector(new THREE.ShapeGeometry(shape), { textureWidth: res, textureHeight: res, clipBias: .003, color: r.tint, shader: { uniforms: THREE.UniformsUtils.clone(sh.uniforms), vertexShader: sh.vertexShader, fragmentShader: sh.fragmentShader } });
    m.material.uniforms.opacity.value = r.k; m.material.transparent = true; m.material.depthWrite = false; m.rotation.x = -Math.PI / 2; m.position.y = .006; m.userData.mirror = true; m.raycast = () => { }; g.add(m); return g;
  };
}
})();
