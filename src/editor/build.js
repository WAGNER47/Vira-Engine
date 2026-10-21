/* BUILD STUDIO: the Build tab (it used to be Rooms). One place to make spaces, in four modes:
   - Rooms: draw rooms, 3D spaces, stairs and floors (the room builder, unchanged underneath).
   - Kit: modular pieces in five styles that snap to a grid. Smart rooms, wall runs, automatic corner posts, doorway
     cutting by placing a doorway on a wall, erasing and restyling.
   - Buildings: whole multi-floor buildings from a footprint or a preset, and reusable sections you save and stamp.
   - Generate: seeded dungeons, facilities, towns, forests and caves with rules for enemies, loot, keys and quests.
     Every generated area is a section that can be rebuilt on its own, locked, kept as hand-made, or rebuilt each play.
   A library dock with live thumbnails floats on the left of the view, the studio panel sits on the right.
   Talks to ed.js only through Ed.bs (the bridge), Ed.api and Ed.ui. Kit pieces: kits.js. Generators: worldgen.js. */
(function () {
'use strict';
const ENG = window.ENG, Ed = window.Ed; if (!Ed || !Ed.bs || !Ed.api || !ENG.KIT_PIECES || !ENG.WORLDGEN) return;
const B = Ed.bs, h = B.h, WG = ENG.WORLDGEN, PC = ENG.KIT_PIECES, STY = ENG.KIT_STYLES;
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const RM = () => document.documentElement.classList.contains('rm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const pref = (() => { try { return JSON.parse(localStorage.getItem('vira.build') || '{}') || {}; } catch (x) { return {}; } })();
const S = Ed.studio = { on: false, mode: pref.mode || 'kit', piece: 'wall', style: STY[pref.style] ? pref.style : 'modern', M: pref.M || 4, tool: 'place', rot: 0, q: '', group: 'All', dock: pref.dock !== false,
  room: { ceil: false, door: true, windows: 1, connect: true }, bld: { w: 3, d: 2, floors: 2, roof: 'gable', windows: .6, shop: false }, bTool: null, stamp: null, gen: { kind: 'dungeon', cfg: {} }, genPlace: false, drag: null, cur: null, hover: null };
const savePref = () => { try { localStorage.setItem('vira.build', JSON.stringify({ mode: S.mode, style: S.style, M: S.M, dock: S.dock })); } catch (x) { } };
const P = () => Ed.project, level = () => +B.RB.level || 0, HH = () => Math.max(2.2, +B.FL.step || 3);
const store = () => { const p = P(); if (!p.build || typeof p.build !== 'object' || Array.isArray(p.build)) p.build = {}; if (!Array.isArray(p.build.sections)) p.build.sections = []; if (!Array.isArray(p.build.library)) p.build.library = []; return p.build; };
const accent = () => (getComputedStyle(document.documentElement).getPropertyValue('--accent') || '').trim() || '#e5383b';
const I = (p, s) => B.TNIC(p, s || 18), uid = () => ENG.uid();
const IC = { rooms: '<path d="M4 4h16v16H4zM4 12h8M12 4v16"/>', kit: '<path d="M3 7.5 12 3l9 4.5-9 4.5zM3 7.5v9L12 21l9-4.5v-9M12 12v9"/>', buildings: '<path d="M3 21h18M5 21V8l6-4 6 4v13M17 21v-9h3v9M9 10h4M9 14h4M9 18h4"/>', generate: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.8 2.8M16.2 16.2 19 19M5 19l2.8-2.8M16.2 7.8 19 5"/>',
  place: '<path d="M12 4v16M4 12h16"/>', room: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 10h16M10 10v10"/>', erase: '<path d="M7 17l-3-3 9-9 6 6-6 6z"/><path d="M10 20h10"/>', paint: '<path d="M4 20c3.5 0 5-2.5 5-4.5L17 7.5l-3-3L6 12.5C4 12.5 4 16 4 20zM13 5.5l5.5 5.5"/>', select: '<path d="M6 3l12 8-5.2 1.4L9.6 18z"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4"/>', dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.1"/><circle cx="15" cy="15" r="1.1"/><circle cx="15" cy="9" r="1.1"/><circle cx="9" cy="15" r="1.1"/><circle cx="12" cy="12" r="1.1"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  live: '<path d="M4 12a8 8 0 0 1 13.7-5.6M20 12a8 8 0 0 1-13.7 5.6M18 3v4h-4M6 21v-4h4"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>', unlink: '<path d="M9 15l6-6M7 11l-2 2a3.5 3.5 0 0 0 5 5l2-2M17 13l2-2a3.5 3.5 0 0 0-5-5l-2 2"/>',
  stamp: '<path d="M8 4h8l-1.5 7h-5zM5 14h14v3H5zM7 20h10"/>', save: '<path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6"/>', chev: '<path d="M15 6l-6 6 6 6"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>', door: '<rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="15" cy="12" r="1"/>' };

/* ---------------- objects in the level ---------------- */
const objsAt = (y, f) => P().objects.filter(o => Math.abs(o.p[1] - y) < .06 && (!f || f(o)));
function addObjs(list, center) { list.forEach(o => { P().objects.push(o); B.addRoot(o); }); try { B.flApply(); } catch (x) { } if (center !== false) rise(list, center); B.renderOutliner(); B.markDirty(); }
function removeIds(ids) {
  const set = new Set(ids); if (!set.size) return; P().objects.forEach(o => { if (o.type === 'door' && o.props.kitLink && set.has(o.props.kitLink)) set.add(o.id); });
  P().objects = P().objects.filter(o => !set.has(o.id)); set.forEach(id => { const it = Ed.objs.get(id); if (it) { B.levelRoot.remove(it.root); B.disposeTree(it.root); Ed.objs.delete(id); } });
  try { if (B.multi().some(id => set.has(id))) B.setMulti([]); } catch (x) { } if (Ed.sel && set.has(Ed.sel)) B.select(null); B.renderOutliner(); B.markDirty();
}
/* new pieces rise out of the ground in a wave */
function rise(list, c) {
  if (RM() || !list.length || list.length > 2500) return; const items = list.map(o => Ed.objs.get(o.id)).filter(Boolean).map(it => ({ r: it.root, y: it.root.position.y }));
  const cx = c ? c.x : items.reduce((a, i) => a + i.r.position.x, 0) / items.length, cz = c ? c.z : items.reduce((a, i) => a + i.r.position.z, 0) / items.length;
  items.forEach(i => { i.d = Math.hypot(i.r.position.x - cx, i.r.position.z - cz); }); const md = Math.max(1, ...items.map(i => i.d)), t0 = performance.now(); let done = false;
  items.forEach(i => { i.delay = i.d / md * (items.length > 40 ? 650 : 160); i.r.position.y = i.y - 2.4; });
  const fin = () => { if (done) return; done = true; items.forEach(i => { i.r.position.y = i.y; }); };
  const step = now => { if (done) return; let all = true; items.forEach(i => { const t = Math.max(0, Math.min(1, (now - t0 - i.delay) / 430)), k = t - 1, e = 1 + 2.70158 * k * k * k + 1.70158 * k * k; if (t < 1) all = false; i.r.position.y = i.y - 2.4 * (1 - e); }); if (all) fin(); else requestAnimationFrame(step); };
  requestAnimationFrame(step); setTimeout(fin, 1900); pulse(cx, items.length ? items[0].y : level(), cz, Math.min(60, md + 6));
}
function pulse(x, y, z, r) {
  if (RM()) return; const g = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 64), new THREE.MeshBasicMaterial({ color: accent(), transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  g.rotation.x = -Math.PI / 2; g.position.set(x, y + .04, z); g.userData.editorOnly = true; g.renderOrder = 50; B.scene.add(g); const t0 = performance.now();
  const end = () => { if (!g.parent) return; B.scene.remove(g); g.geometry.dispose(); g.material.dispose(); };
  const step = now => { const t = (now - t0) / 900; if (t >= 1 || !g.parent) return end(); g.scale.setScalar(1 + t * r); g.material.opacity = .8 * (1 - t); requestAnimationFrame(step); }; requestAnimationFrame(step); setTimeout(end, 1400);
}

/* ---------------- the kit grid ---------------- */
const cls = piece => { const p = PC[piece]; if (!p) return null; if (p.snap === 'edge') return p.at === 'top' ? 'et' : 'ew'; if (p.snap === 'cell') return p.at === 'top' ? 'ct' : 'cf'; if (p.snap === 'vertex') return 'v'; return null; };
const slotKey = (c, x, y, z) => c + ':' + Math.round(x / (S.M / 2)) + ':' + Math.round(z / (S.M / 2)) + ':' + Math.round(y * 4);
const slotOf = o => { if (o.type !== 'kit') return null; const c = cls(o.props.piece); return c ? slotKey(c, o.p[0], o.p[1], o.p[2]) : null; };
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function hitPlane(e, y) { B.setRay(e); plane.constant = -y; return B.ray.ray.intersectPlane(plane, new THREE.Vector3()); }
function pickObj(e, f) { B.setRay(e); const roots = []; Ed.objs.forEach(it => { if (it.root.visible && (!f || f(it.o))) roots.push(it.root); }); const x = B.ray.intersectObjects(roots, true)[0]; if (!x) return null; let n = x.object; while (n && n.parent !== B.levelRoot) n = n.parent; for (const it of Ed.objs.values()) if (it.root === n) return it.o; return null; }
/* where a piece goes under the mouse */
function snapAt(e, piece) {
  const pc = PC[piece] || PC.wall, M = S.M, y0 = level(), pt = hitPlane(e, y0); if (!pt) return null; const fx = pt.x / M, fz = pt.z / M, i = Math.floor(fx), j = Math.floor(fz);
  const yAt = pc.at === 'top' ? y0 + HH() : y0;
  if (pc.snap === 'cell') return { x: (i + .5) * M, y: yAt, z: (j + .5) * M, ry: S.rot, i, j, kind: 'cell' };
  if (pc.snap === 'vertex') { const vi = Math.round(fx), vj = Math.round(fz); return { x: vi * M, y: yAt, z: vj * M, ry: 0, i: vi, j: vj, kind: 'vertex' }; }
  if (pc.snap === 'free') { let y = y0; const hit = (() => { B.setRay(e); const roots = []; Ed.objs.forEach(it => { if (it.root.visible && ['terrain', 'land', 'floor', 'block', 'cubegrid', 'kit'].includes(it.o.type)) roots.push(it.root); }); const x = B.ray.intersectObjects(roots, true).find(x => x.face && x.face.normal.y > .5); return x; })(); let px = pt.x, pz = pt.z; if (hit) { y = hit.point.y; px = hit.point.x; pz = hit.point.z; } return { x: Math.round(px * 4) / 4, y: Math.round(y * 100) / 100, z: Math.round(pz * 4) / 4, ry: S.rot, kind: 'free' }; }
  const ux = fx - i, uz = fz - j, d = [ux, 1 - ux, uz, 1 - uz], k = d.indexOf(Math.min(...d));
  const e2 = k < 2 ? { x: (i + (k === 1 ? 1 : 0)) * M, z: (j + .5) * M, ry: 90, h: false, i: i + (k === 1 ? 1 : 0), j } : { x: (i + .5) * M, z: (j + (k === 3 ? 1 : 0)) * M, ry: 0, h: true, i, j: j + (k === 3 ? 1 : 0) };
  if (pc.snap === 'mount') { const T = STY[S.style].T, side = e2.h ? Math.sign(pt.z - e2.z) || 1 : Math.sign(pt.x - e2.x) || 1; return { x: e2.h ? e2.x : e2.x + side * (T / 2 + .02), y: y0 + (pc.mountY || 1.6), z: e2.h ? e2.z + side * (T / 2 + .02) : e2.z, ry: e2.h ? (side > 0 ? 0 : 180) : (side > 0 ? 90 : 270), kind: 'mount', i: e2.i, j: e2.j }; }
  return { x: e2.x, y: yAt, z: e2.z, ry: e2.ry, h: e2.h, i: e2.i, j: e2.j, kind: 'edge' };
}
/* a drag turns into a run of walls or a rectangle of floor squares */
function dragList(piece, a, b) {
  const pc = PC[piece] || PC.wall, out = [], M = S.M; if (!a || !b) return out;
  if (pc.snap === 'cell') { const i0 = Math.min(a.i, b.i), i1 = Math.max(a.i, b.i), j0 = Math.min(a.j, b.j), j1 = Math.max(a.j, b.j); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { if (out.length >= 900) break; out.push({ piece, x: (i + .5) * M, y: a.y, z: (j + .5) * M, ry: S.rot }); } return out; }
  if (pc.snap === 'edge') { const along = Math.abs(b.x - a.x) >= Math.abs(b.z - a.z); if (a.x === b.x && a.z === b.z) return [{ piece, x: a.x, y: a.y, z: a.z, ry: a.ry }];
    if (along) { const z = a.h ? a.z : Math.round(a.z / M) * M, x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x); for (let x = Math.floor(x0 / M) * M + M / 2; x <= x1 + 1e-6 && out.length < 300; x += M) out.push({ piece, x, y: a.y, z, ry: 0 }); }
    else { const x = !a.h ? a.x : Math.round(a.x / M) * M, z0 = Math.min(a.z, b.z), z1 = Math.max(a.z, b.z); for (let z = Math.floor(z0 / M) * M + M / 2; z <= z1 + 1e-6 && out.length < 300; z += M) out.push({ piece, x, y: a.y, z, ry: 90 }); }
    return out; }
  const ry = pc.snap === 'free' && S.randomTurn !== false && PC[piece].group === 'Nature' ? Math.floor(Math.random() * 24) * 15 : b.ry; return [{ piece, x: b.x, y: b.y, z: b.z, ry, seed: pc.snap === 'free' ? 1 + Math.floor(Math.random() * 8) : null }];
}
/* place pieces: a piece put where a piece of the same kind already is replaces it (a doorway on a wall cuts it) */
function place(list, opts) {
  if (!list.length) return []; B.pushUndo(); const slots = new Map(); P().objects.forEach(o => { const k = slotOf(o); if (k) slots.set(k, o.id); });
  const add = [], del = [], ys = new Set(); let c = { x: 0, z: 0 };
  list.forEach(L => {
    const real = L.piece === 'door' ? 'wall_door' : L.piece, o = ENG.kitObject(real, L.style || S.style, [L.x, L.y, L.z], L.ry, S.M, HH(), L.extra || (L.seed ? { props: { seed: L.seed } } : null)), k = slotOf(o);
    if (k && slots.has(k)) del.push(slots.get(k)); if (k) slots.set(k, o.id); add.push(o); ys.add(o.p[1]); c.x += L.x / list.length; c.z += L.z / list.length;
    if (L.piece === 'door') add.push(doorFor(o));
  });
  removeIds(del); addObjs(add, opts && opts.anim === false ? false : c); joinCorners([...ys]); return add;
}
function doorFor(o) { const hole = ENG.kitDoorHole(o.s[0], o.s[1]), st = o.props.style, d = ENG.newObject('door'); d.p = o.p.slice(); d.r = [0, o.r[1], 0]; d.s = [Math.round((hole.x1 - hole.x0) * 100) / 100, Math.round(hole.y1 * 100) / 100, .12]; Object.assign(d.props, { motion: st === 'scifi' || st === 'industrial' ? 'slide sideways' : 'swing', opens: 'press E', color: STY[st].m.frame.c, texture: st === 'medieval' || st === 'horror' ? 'wood' : 'metal', kitLink: o.id }); d.name = 'Door'; return d; }
/* corner posts appear where walls meet at a corner, a T, a cross, or end in the open, and go away when they are not needed */
function joinCorners(ys) {
  const add = [], del = [];
  [...new Set(ys.map(y => Math.round(y * 100) / 100))].forEach(y => {
    const V = new Map(), vk = (x, z) => Math.round(x * 20) + ':' + Math.round(z * 20);
    objsAt(y, o => o.type === 'kit' && cls(o.props.piece) === 'ew').forEach(o => { const a = (o.r[1] || 0) * Math.PI / 180, ux = Math.cos(a), uz = -Math.sin(a), L = o.s[0] / 2;
      [1, -1].forEach(s => { const x = o.p[0] + s * L * ux, z = o.p[2] + s * L * uz, k = vk(x, z); let v = V.get(k); if (!v) V.set(k, v = { x, z, dirs: [], h: 0, st: o.props.style, T: 0 }); v.dirs.push([-s * ux, -s * uz]); v.h = Math.max(v.h, o.s[1]); v.T = Math.max(v.T, o.s[2]); }); });
    const posts = new Map(); objsAt(y, o => o.type === 'kit' && (o.props.piece === 'post' || o.props.piece === 'column')).forEach(o => posts.set(vk(o.p[0], o.p[2]), o));
    V.forEach((v, k) => { const n = v.dirs.length, straight = n === 2 && Math.abs(v.dirs[0][0] + v.dirs[1][0]) < .02 && Math.abs(v.dirs[0][1] + v.dirs[1][1]) < .02, need = n === 1 || n >= 3 || (n === 2 && !straight), p = posts.get(k), s = [Math.round(v.T * 1.25 * 1000) / 1000, Math.round((v.h + .02) * 1000) / 1000, Math.round(v.T * 1.25 * 1000) / 1000];
      if (need && !p) add.push(ENG.kitObject('post', v.st, [v.x, y, v.z], 0, S.M, v.h, { s, props: { auto: 1 } }));
      else if (!need && p && p.props.auto) del.push(p.id);
      else if (need && p && p.props.auto && (p.props.style !== v.st || Math.abs(p.s[1] - s[1]) > .01 || Math.abs(p.s[0] - s[0]) > .01)) { p.props.style = v.st; p.s = s; B.refreshObj(p.id); }
      posts.delete(k); });
    posts.forEach(p => { if (p.props.auto) del.push(p.id); });
  });
  if (del.length) removeIds(del); if (add.length) addObjs(add, false);
}
/* smart room: floor, walls on the edge, windows, an entrance, a doorway into rooms next door, walls inside removed */
function fillRoom(i0, j0, i1, j1) {
  const M = S.M, y = level(), Hh = HH(), st = S.style, O = S.room; B.pushUndo();
  const slots = new Map(); P().objects.forEach(o => { const k = slotOf(o); if (k) slots.set(k, o); });
  const floorAt = (i, j) => slots.get(slotKey('cf', (i + .5) * M, y, (j + .5) * M)), wallAt = (x, z) => slots.get(slotKey('ew', x, y, z)), del = [], put = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const f = floorAt(i, j); if (!f || f.props.piece !== 'floor') { if (f) del.push(f.id); put.push({ piece: 'floor', x: (i + .5) * M, y, z: (j + .5) * M, ry: 0 }); } if (O.ceil) { const c = slots.get(slotKey('ct', (i + .5) * M, y + Hh, (j + .5) * M)); if (!c) put.push({ piece: 'ceiling', x: (i + .5) * M, y: y + Hh, z: (j + .5) * M, ry: 0 }); } }
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { if (i < i1) { const w = wallAt((i + 1) * M, (j + .5) * M); if (w) del.push(w.id); } if (j < j1) { const w = wallAt((i + .5) * M, (j + 1) * M); if (w) del.push(w.id); } }
  const sides = [[], [], [], []]; for (let i = i0; i <= i1; i++) { sides[0].push({ x: (i + .5) * M, z: j0 * M, ry: 0, out: [i, j0 - 1] }); sides[1].push({ x: (i + .5) * M, z: (j1 + 1) * M, ry: 0, out: [i, j1 + 1] }); } for (let j = j0; j <= j1; j++) { sides[2].push({ x: i0 * M, z: (j + .5) * M, ry: 90, out: [i0 - 1, j] }); sides[3].push({ x: (i1 + 1) * M, z: (j + .5) * M, ry: 90, out: [i1 + 1, j] }); }
  let linked = 0, ext = [];
  sides.forEach(side => { const shared = side.filter(e => floorAt(e.out[0], e.out[1])); if (O.connect && shared.length) { const m = shared[Math.floor((shared.length - 1) / 2)], w = wallAt(m.x, m.z); if (w) del.push(w.id); put.push({ piece: 'wall_door', x: m.x, y, z: m.z, ry: m.ry }); m.done = true; linked++; }
    side.forEach((e, n) => { if (e.done) return; const w = wallAt(e.x, e.z), outside = !floorAt(e.out[0], e.out[1]);
      /* a window that now looks into the room next door becomes a plain wall */
      if (w && !outside && /window|glass/.test(w.props.piece)) { del.push(w.id); put.push({ piece: 'wall', x: e.x, y, z: e.z, ry: e.ry }); return; } if (w) return; const win = outside && O.windows > 0 && (O.windows >= 2 ? n % 2 === 0 : n % 2 === 1); const it = { piece: win ? 'wall_window' : 'wall', x: e.x, y, z: e.z, ry: e.ry }; put.push(it); if (outside) ext.push(it); }); });
  if (O.door && !linked && ext.length) { const cp = B.cam.position, best = ext.reduce((a, b) => Math.hypot(a.x - cp.x, a.z - cp.z) < Math.hypot(b.x - cp.x, b.z - cp.z) ? a : b); best.piece = 'door'; }
  removeIds([...new Set(del)]); const made = place(put.map(L => Object.assign({ style: st }, L)), {});
  B.toast('Room built: ' + (i1 - i0 + 1) + ' by ' + (j1 - j0 + 1) + ' squares' + (linked ? ', joined to the room next door' : '')); return made.length;
}
function eraseObj(o) { if (!o) return; const y = o.p[1]; removeIds([o.id]); if (o.type === 'kit') joinCorners([y]); }
function paintObj(o) { if (!o || o.type !== 'kit' || o.props.style === S.style) return; o.props.style = S.style; B.refreshObj(o.id); B.markDirty(); joinCorners([o.p[1]]); }
function restyle(f, label) {
  const list = P().objects.filter(o => o.type === 'kit' && f(o)), rooms = P().objects.filter(o => o.props && o.props.room && f(o)); if (!list.length && !rooms.length) { B.toast('Nothing to restyle there'); return; } B.pushUndo();
  list.forEach(o => { o.props.style = S.style; B.refreshObj(o.id); });
  const rs = ROOM_LOOK[S.style]; rooms.forEach(o => { o.props.room.mats = ENG.clone(rs); try { B.rb5Regen(o); } catch (x) { } });
  P().objects.filter(o => o.type === 'door' && o.props.kitLink && f(o)).forEach(d => { d.props.color = STY[S.style].m.frame.c; B.refreshObj(d.id); });
  B.markDirty(); B.toast(label + ': ' + (list.length + rooms.length) + ' changed to ' + STY[S.style].label);
}
const ROOM_LOOK = {}; Object.entries(STY).forEach(([k, s]) => { ROOM_LOOK[k] = { wall: { color: s.m.wall.c, tex: s.m.wall.tex, tile: s.m.wall.tile }, floor: { color: s.m.floor.c, tex: s.m.floor.tex, tile: s.m.floor.tile }, ceil: { color: s.m.ceil.c, tex: s.m.ceil.tex, tile: s.m.ceil.tile } }; });

/* ---------------- sections: generated areas and buildings ---------------- */
const KLAB = k => (WG.kinds[k] || {}).label || k;
function secObjs(id) { return P().objects.filter(o => o.sec === id); }
function avoidFor(at, w, d, M, skip) {
  const x0 = at[0], z0 = at[2], x1 = x0 + w * M, z1 = z0 + d * M, out = [], ign = ['floor', 'terrain', 'land', 'light', 'spotlight', 'trigger', 'player_start', 'emitter', 'speaker', 'sign', 'shaft', 'reflect_floor'];
  Ed.objs.forEach(it => { const o = it.o; if (ign.includes(o.type) || (skip && o.sec === skip)) return; const b = new THREE.Box3().setFromObject(it.root); if (b.isEmpty() || b.max.y - b.min.y < .4) return; if (b.min.x > x1 || b.max.x < x0 || b.min.z > z1 || b.max.z < z0) return; if (Math.abs(b.min.y - at[1]) > HH() * .9 && b.max.y < at[1]) return; out.push([b.min.x, b.min.z, b.max.x, b.max.z]); });
  return out;
}
function generate(kind, cfg, opts) {
  opts = opts || {}; const K = WG.kinds[kind]; if (!K) return null; const sec = opts.sec || { id: 's' + uid(), kind, name: K.label + ' ' + (store().sections.filter(s => s.kind === kind).length + 1), locked: false, live: false };
  const c = Object.assign({}, cfg, { sec: sec.id }); if (c.around !== false && !K.solo) c.avoid = avoidFor(c.at, c.w, c.d, c.M || S.M, sec.id); else c.avoid = [];
  if (c.start == null) c.start = !P().objects.some(o => o.type === 'player_start' && o.sec !== sec.id);
  const res = WG.run(kind, c); if (res.info && res.info.error) { B.toast(res.info.error, 'warn'); return null; }
  if (!opts.noUndo) B.pushUndo(); if (opts.sec) removeIds(secObjs(sec.id).map(o => o.id));
  if (c.start && P().objects.some(o => o.type === 'player_start' && o.sec !== sec.id)) res.objs = res.objs.filter(o => o.type !== 'player_start');
  sec.cfg = Object.assign({}, res.cfg); delete sec.cfg.avoid; delete sec.cfg.sec; sec.at = res.cfg.at.slice(); sec.size = [res.cfg.w * res.cfg.M, res.cfg.d * res.cfg.M]; sec.info = res.info;
  if (!opts.sec) { sec.live = !!cfg.live; store().sections.push(sec); } const M = res.cfg.M; addObjs(res.objs, { x: sec.at[0] + sec.size[0] / 2, z: sec.at[2] + sec.size[1] / 2 }); secLines(); B.markDirty(); return { sec, res };
}
function regen(sec, newSeed) {
  if (sec.locked) { B.toast(sec.name + ' is locked. Unlock it to rebuild.', 'warn'); return; } const cfg = Object.assign({}, sec.cfg); if (newSeed) cfg.seed = 1 + Math.floor(Math.random() * 999999);
  const r = generate(sec.kind, cfg, { sec }); if (r) B.toast(sec.name + ' rebuilt' + (newSeed ? ' with seed ' + cfg.seed : '') + '. Everything else stayed as it was.'); renderAll();
}
function detach(sec) { B.pushUndo(); secObjs(sec.id).forEach(o => { delete o.sec; }); store().sections = store().sections.filter(s => s !== sec); B.markDirty(); secLines(); renderAll(); B.toast(sec.name + ' is now hand-made. Its pieces stay and the generator lets go of them.'); }
function dropSec(sec) { B.pushUndo(); removeIds(secObjs(sec.id).map(o => o.id)); store().sections = store().sections.filter(s => s !== sec); secLines(); renderAll(); B.toast(sec.name + ' removed'); }
function frameSec(sec) { const cx = sec.at[0] + sec.size[0] / 2, cz = sec.at[2] + sec.size[1] / 2, r = Math.max(sec.size[0], sec.size[1]); B.lookFrom(new THREE.Vector3(cx + r * .45, sec.at[1] + r * .85 + 6, cz + r * .9), new THREE.Vector3(cx, sec.at[1], cz)); }
/* outlines of sections on the ground while the Generate or Buildings mode is open */
let SL = null;
function secLines() {
  if (SL) { B.scene.remove(SL); SL.traverse(n => { if (n.geometry) n.geometry.dispose(); }); SL = null; } if (!S.on || (S.mode !== 'generate' && S.mode !== 'buildings') || !Ed.project) return;
  SL = new THREE.Group(); SL.userData.editorOnly = true; const col = new THREE.Color(accent());
  store().sections.forEach(s => { if (!s.at || !s.size) return; const [x, y, z] = s.at, [w, d] = s.size, hot = S.hoverSec === s.id, pts = [x, y + .06, z, x + w, y + .06, z, x + w, y + .06, z, x + w, y + .06, z + d, x + w, y + .06, z + d, x, y + .06, z + d, x, y + .06, z + d, x, y + .06, z];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: s.locked ? '#9aa3b2' : col, transparent: true, opacity: hot ? 1 : .45, depthTest: false })); l.renderOrder = 60; SL.add(l);
    if (hot) { const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .08, depthWrite: false, side: THREE.DoubleSide })); f.rotation.x = -Math.PI / 2; f.position.set(x + w / 2, y + .05, z + d / 2); SL.add(f); } });
  B.scene.add(SL);
}

/* ---------------- buildings and saved sections ---------------- */
const BPRE = [['Cottage', 'medieval', 2, 1, 1, 'gable', .5, false], ['Town house', 'modern', 2, 2, 3, 'flat', .7, false], ['Corner shop', 'modern', 3, 2, 2, 'flat', .7, true], ['Warehouse', 'industrial', 4, 3, 1, 'flat', .35, false], ['Watchtower', 'medieval', 1, 1, 4, 'gable', .6, false], ['Lab block', 'scifi', 3, 3, 2, 'flat', .6, false], ['Haunted house', 'horror', 3, 2, 2, 'gable', .6, false], ['Bunker', 'industrial', 3, 2, 1, 'flat', .1, false]];
function makeBuilding(i0, j0, w, d, over) {
  const M = S.M, b = Object.assign({}, S.bld, over || {}), cp = B.cam.position, cx = (i0 + w / 2) * M, cz = (j0 + d / 2) * M, dx = cp.x - cx, dz = cp.z - cz, door = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'e' : 'w') : (dz > 0 ? 's' : 'n');
  const cfg = { at: [i0 * M, level(), j0 * M], w, d, M, H: HH(), style: b.style || S.style, floors: b.floors, roof: b.roof, windows: b.windows, shop: b.shop, door, seed: 1, start: false, around: false };
  const r = generate('building', cfg, {}); if (r) { r.sec.name = (b.name || 'Building') + ' ' + store().sections.filter(s => s.kind === 'building').length; B.toast(r.sec.name + ': ' + b.floors + ' floor' + (b.floors > 1 ? 's' : '') + ', ' + r.res.info.pieces + ' pieces'); renderAll(); } return r;
}
function saveSection() {
  let ids = B.multi(); const sel = Ed.sel && Ed.objs.get(Ed.sel); if (ids.length <= 1 && sel && sel.o.sec) ids = secObjs(sel.o.sec).map(o => o.id);
  const list = ids.map(id => Ed.objs.get(id)).filter(Boolean).map(it => it.o).filter(o => o.type !== 'player_start'); if (!list.length) { B.toast('Select some pieces first (Shift-click or drag a box in Select), or click a building'); return; }
  const M = S.M, x0 = Math.floor(Math.min(...list.map(o => o.p[0])) / M) * M, z0 = Math.floor(Math.min(...list.map(o => o.p[2])) / M) * M, y0 = Math.min(...list.map(o => o.p[1])), x1 = Math.max(...list.map(o => o.p[0])), z1 = Math.max(...list.map(o => o.p[2]));
  const objs = list.map(o => { const c = ENG.clone(o); delete c.sec; c.p = [c.p[0] - x0, c.p[1] - y0, c.p[2] - z0]; return c; });
  const L = store().library, sec = { id: 'l' + uid(), name: 'Section ' + (L.length + 1), w: Math.max(1, Math.ceil((x1 - x0) / M)), d: Math.max(1, Math.ceil((z1 - z0) / M)), M, objs, t: Date.now() };
  B.pushUndo(); L.push(sec); B.markDirty(); THC.delete('lib:' + sec.id); renderAll(); B.toast(sec.name + ' saved with ' + objs.length + ' objects. Pick it in the library to stamp copies.');
}
function stampAt(sec, x0, y0, z0, k) {
  const M = sec.M || S.M, sw = sec.w * M, sd = sec.d * M, c = [sw / 2, sd / 2], rw = k % 2 ? sd : sw, rd = k % 2 ? sw : sd, a = k * Math.PI / 2, ids = new Map(), out = [];
  sec.objs.forEach(src => { const o = ENG.clone(src), nid = uid(); ids.set(src.id, nid); o.id = nid; const px = o.p[0] - c[0], pz = o.p[2] - c[1]; o.p = [Math.round((x0 + rw / 2 + px * Math.cos(a) + pz * Math.sin(a)) * 1000) / 1000, Math.round((y0 + o.p[1]) * 1000) / 1000, Math.round((z0 + rd / 2 - px * Math.sin(a) + pz * Math.cos(a)) * 1000) / 1000]; o.r = [o.r[0] || 0, (((o.r[1] || 0) + k * 90) % 360 + 360) % 360, o.r[2] || 0]; out.push(o); });
  out.forEach(o => { if (o.props && o.props.kitLink && ids.has(o.props.kitLink)) o.props.kitLink = ids.get(o.props.kitLink); });
  B.pushUndo(); addObjs(out, { x: x0 + rw / 2, z: z0 + rd / 2 }); joinCorners([...new Set(out.filter(o => o.type === 'kit').map(o => o.p[1]))]); return out;
}

/* ---------------- thumbnails: a small offscreen renderer, results cached ---------------- */
const TH = { r: null }, THC = new Map(), THQ = [];
function thInit() {
  if (TH.r) return true; try { TH.r = B.thumbRenderer(); } catch (e) { TH.r = null; return false; } if (!TH.r) return false;
  TH.s = new THREE.Scene(); TH.s.add(new THREE.HemisphereLight('#e6edff', '#1b1f28', .9)); const d = new THREE.DirectionalLight('#ffffff', 1.15); d.position.set(5, 8, 6); TH.s.add(d); const d2 = new THREE.DirectionalLight('#9db4ff', .35); d2.position.set(-6, 3, -4); TH.s.add(d2); TH.c = new THREE.PerspectiveCamera(30, 4 / 3, .05, 800); return true;
}
function thRender(objs) {
  const g = new THREE.Group(); objs.forEach(o => { try { g.add(ENG.build(o, { project: P(), editor: false })); } catch (e) { } }); TH.s.add(g); g.updateMatrixWorld(true);
  const b = new THREE.Box3(); g.traverse(m => { if (m.isMesh && !m.userData.kitCol && m.geometry) { m.geometry.computeBoundingBox(); b.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); } }); if (b.isEmpty()) b.setFromObject(g);
  const c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3()), dir = new THREE.Vector3(.62, .5, .78).normalize(); let dist = Math.max(sz.length(), .6) * 1.6;
  /* fit the box to the frame: measure how much of the view it fills, then move the camera to fill about 88 percent */
  for (let it = 0; it < 2; it++) { TH.c.position.copy(c).addScaledVector(dir, dist); TH.c.lookAt(c); TH.c.near = dist / 60; TH.c.far = dist * 8; TH.c.updateProjectionMatrix(); TH.c.updateMatrixWorld(); let e = 0; for (let k = 0; k < 8; k++) { const v = new THREE.Vector3(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).project(TH.c); e = Math.max(e, Math.abs(v.x), Math.abs(v.y)); } dist *= Math.max(.3, e / .88); }
  TH.c.position.copy(c).addScaledVector(dir, dist); TH.c.lookAt(c); TH.c.near = dist / 60; TH.c.far = dist * 8; TH.c.updateProjectionMatrix(); TH.r.setSize(200, 150, false); TH.r.render(TH.s, TH.c); const url = TH.r.domElement.toDataURL('image/png'); TH.r.setSize(160, 160, false);
  TH.s.remove(g); g.traverse(m => { if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => { if (x.visible !== false) x.dispose(); }); }); return url;
}
function thumb(key, make) {
  if (THC.has(key)) return THC.get(key); if (!THQ.some(q => q.key === key)) THQ.push({ key, make }); if (!TH.busy) { TH.busy = true; setTimeout(thPump, 16); } return null;
}
function thPump() {
  const t0 = performance.now(); while (THQ.length && performance.now() - t0 < 24) { const q = THQ.shift(); let url = ''; try { if (thInit()) url = thRender(q.make()); } catch (e) { console.warn('Thumbnail failed', q.key, e); } THC.set(q.key, url); $$('img[data-th="' + CSS.escape(q.key) + '"]').forEach(im => { im.src = url; im.classList.add('bs-ok'); }); }
  if (THQ.length) setTimeout(thPump, 16); else TH.busy = false;
}
const thImg = (key, make) => { const url = thumb(key, make); return h('img', { 'data-th': key, src: url || 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', class: url ? 'bs-ok' : '', alt: '', draggable: 'false' }); };
const pieceObj = (piece, style, M, H) => { const real = piece === 'door' ? 'wall_door' : piece, o = ENG.kitObject(real, style, [0, 0, 0], 0, M || 4, H || 3); const out = [o]; if (piece === 'door') { const d = doorFor(o); out.push(d); } return out; };

/* ---------------- maps: the generator preview, drawn on a canvas ---------------- */
const MAPC = new Map();
function mapRun(kind, cfg) { const key = kind + '|' + JSON.stringify(cfg); if (MAPC.has(key)) return MAPC.get(key); let res; try { res = WG.run(kind, Object.assign({}, cfg, { at: [0, 0, 0], avoid: [], sec: null })); } catch (e) { res = { objs: [], map: null, info: { error: e.message } }; } if (MAPC.size > 60) MAPC.clear(); MAPC.set(key, res); return res; }
function drawMap(cv, res, opt) {
  const g = cv.getContext('2d'), W = cv.width, Hc = cv.height, m = res && res.map, acc = accent(); g.clearRect(0, 0, W, Hc); const bg = g.createRadialGradient(W / 2, Hc * .4, 10, W / 2, Hc / 2, W * .75); bg.addColorStop(0, '#111722'); bg.addColorStop(1, '#06080c'); g.fillStyle = bg; g.fillRect(0, 0, W, Hc); if (!m) return;
  const pad = opt && opt.pad != null ? opt.pad : 10, cs = Math.min((W - pad * 2) / m.w, (Hc - pad * 2) / m.d), ox = (W - cs * m.w) / 2, oz = (Hc - cs * m.d) / 2, X = i => ox + i * cs, Z = j => oz + j * cs;
  g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1; for (let i = 0; i <= m.w; i++) { g.beginPath(); g.moveTo(X(i) + .5, Z(0)); g.lineTo(X(i) + .5, Z(m.d)); g.stroke(); } for (let j = 0; j <= m.d; j++) { g.beginPath(); g.moveTo(X(0), Z(j) + .5); g.lineTo(X(m.w), Z(j) + .5); g.stroke(); }
  const RC = ['', '#3d8bff', '#2ecc71', '#f0b43c', '#c792ff'], rgba = (hex, a) => { const c = new THREE.Color(hex); return `rgba(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0},${a})`; };
  if (m.fine) { const F = m.fine, fs = cs / 2; for (let j = 0; j < F.d; j++) for (let i = 0; i < F.w; i++) if (!F.g[j * F.w + i]) { g.fillStyle = rgba(acc, .16); g.fillRect(ox + i * fs, oz + j * fs, fs + .5, fs + .5); } }
  else for (let j = 0; j < m.d; j++) for (let i = 0; i < m.w; i++) { const v = m.cells[j * m.w + i]; if (!v) continue; const rg = m.region ? m.region[j * m.w + i] : 0, x = X(i), z = Z(j);
    if (v === 1) { const c = rg > 0 && RC[rg] ? RC[rg] : acc; g.fillStyle = m.region ? rgba(c, .3) : 'rgba(80,140,70,.35)'; if (!m.region) { g.fillStyle = 'rgba(70,120,60,.32)'; g.fillRect(x, z, cs, cs); g.fillStyle = 'rgba(120,190,90,.55)'; g.beginPath(); g.arc(x + cs / 2, z + cs / 2, cs * .28, 0, 7); g.fill(); continue; } g.fillRect(x, z, cs + .5, cs + .5); }
    else if (v === 2) { g.fillStyle = m.region ? rgba(rg > 0 && RC[rg] ? RC[rg] : '#ffffff', .14) : 'rgba(190,160,110,.45)'; g.fillRect(x + (m.region ? 0 : cs * .1), z + (m.region ? 0 : cs * .1), cs * (m.region ? 1 : .8) + .5, cs * (m.region ? 1 : .8) + .5); }
    else if (v === 3) { g.fillStyle = '#272b33'; g.fillRect(x, z, cs + .5, cs + .5); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + cs * .45, z + cs * .45, cs * .1, cs * .1); }
    else if (v === 4) { g.fillStyle = '#3b404a'; g.fillRect(x, z, cs + .5, cs + .5); }
    else if (v === 5) { g.fillStyle = 'rgba(70,130,60,.6)'; g.fillRect(x, z, cs + .5, cs + .5); }
    else if (v === 6) { g.fillStyle = rgba(acc, .38); g.fillRect(x + 1, z + 1, cs - 2, cs - 2); } }
  if (m.rooms) { g.strokeStyle = rgba(acc, .85); g.lineWidth = 1.2; m.rooms.forEach(o => g.strokeRect(X(o.x) + .5, Z(o.z) + .5, o.w * cs - 1, o.d * cs - 1)); }
  (m.doors || []).forEach(dr => { const L = cs * .5; g.lineWidth = dr.locked ? 3.2 : 2; g.strokeStyle = dr.locked ? (dr.color || '#fff') : dr.shortcut ? '#5ce1ff' : dr.door ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.4)'; g.beginPath(); if (dr.h) { g.moveTo(X(dr.i) + cs / 2 - L / 2, Z(dr.j)); g.lineTo(X(dr.i) + cs / 2 + L / 2, Z(dr.j)); } else { g.moveTo(X(dr.i), Z(dr.j) + cs / 2 - L / 2); g.lineTo(X(dr.i), Z(dr.j) + cs / 2 + L / 2); } g.stroke(); });
  (m.marks || []).forEach(k => { const x = ox + k.i * cs, z = oz + k.j * cs, r = Math.max(2.2, cs * .22); g.lineWidth = 1.5;
    if (k.kind === 'enemy') { g.fillStyle = '#ff5a5f'; g.beginPath(); g.arc(x, z, Math.max(1.6, cs * .12), 0, 7); g.fill(); }
    else if (k.kind === 'loot') { g.fillStyle = '#f0c45a'; g.fillRect(x - r * .5, z - r * .5, r, r); }
    else if (k.kind === 'key') { g.fillStyle = k.color; g.beginPath(); g.arc(x, z, r * 1.2, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, z, r * .45, 0, 7); g.fill(); }
    else if (k.kind === 'relic') { g.fillStyle = '#c792ff'; g.beginPath(); g.moveTo(x, z - r * 1.5); g.lineTo(x + r, z); g.lineTo(x, z + r * 1.5); g.lineTo(x - r, z); g.closePath(); g.fill(); }
    else if (k.kind === 'start') { g.fillStyle = '#3ddc84'; g.beginPath(); g.moveTo(x, z - r * 1.6); g.lineTo(x + r * 1.4, z + r); g.lineTo(x - r * 1.4, z + r); g.closePath(); g.fill(); }
    else if (k.kind === 'exit') { g.strokeStyle = acc; g.lineWidth = 2; g.beginPath(); g.arc(x, z, r * 1.7, 0, 7); g.stroke(); g.fillStyle = acc; g.beginPath(); g.arc(x, z, r * .8, 0, 7); g.fill(); }
    else if (k.kind === 'shortcut') { g.strokeStyle = '#5ce1ff'; g.beginPath(); g.arc(x, z, r * 1.2, 0, 7); g.stroke(); }
    else if (k.kind === 'camp' || k.kind === 'cabin') { g.fillStyle = k.kind === 'camp' ? '#ff9a4a' : rgba(acc, .9); g.beginPath(); g.arc(x, z, r * 1.1, 0, 7); g.fill(); } });
}

/* ---------------- the viewport: cursor, ghost and labels ---------------- */
const VS = { cur: null, ghost: null, gkey: '', lab: null, hl: null };
function ghostOf(objs) { const g = new THREE.Group(), col = new THREE.Color(accent()), mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: .45, transparent: true, opacity: .42, depthWrite: false, roughness: .5 }); objs.forEach(o => { try { g.add(ENG.build(o, { project: P(), editor: false })); } catch (e) { } }); g.traverse(m => { if (!m.isMesh) return; if (m.userData.kitCol) { m.visible = false; return; } m.material = mat; m.castShadow = false; m.receiveShadow = false; m.raycast = () => { }; }); g.userData.editorOnly = true; return g; }
function clearGhost() { if (VS.ghost) { B.scene.remove(VS.ghost); VS.ghost = null; VS.gkey = ''; } }
function setGhost(key, make) { if (VS.gkey === key && VS.ghost) return VS.ghost; clearGhost(); VS.ghost = make(); VS.gkey = key; B.scene.add(VS.ghost); return VS.ghost; }
function cursorRect(x0, y, z0, w, d, tall) {
  if (!VS.cur) { VS.cur = new THREE.Group(); VS.cur.userData.editorOnly = true; VS.cur.renderOrder = 70; B.scene.add(VS.cur); } VS.cur.visible = true; VS.cur.clear(); const col = new THREE.Color(accent());
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(Math.max(.05, w), Math.max(.02, tall || .02), Math.max(.05, d))), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .95, depthTest: false })); e.position.set(x0 + w / 2, y + (tall || .02) / 2 + .02, z0 + d / 2); e.renderOrder = 70; VS.cur.add(e);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(.05, w), Math.max(.05, d)), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide })); f.rotation.x = -Math.PI / 2; f.position.set(x0 + w / 2, y + .03, z0 + d / 2); VS.cur.add(f);
}
function hideCursor() { if (VS.cur) VS.cur.visible = false; clearGhost(); label(null); highlight(null); }
function label(e, t) { if (!VS.lab) { VS.lab = h('div', { class: 'bs-lab' }); document.body.append(VS.lab); } if (!e || !t) { VS.lab.style.display = 'none'; return; } VS.lab.textContent = t; VS.lab.style.display = 'block'; VS.lab.style.left = (e.clientX + 18) + 'px'; VS.lab.style.top = (e.clientY + 16) + 'px'; }
function highlight(o, col) { if (VS.hl) { B.scene.remove(VS.hl); VS.hl.geometry.dispose(); VS.hl = null; } if (!o) return; const it = Ed.objs.get(o.id); if (!it) return; const b = new THREE.Box3().setFromObject(it.root); if (b.isEmpty()) return; VS.hl = new THREE.Box3Helper(b, new THREE.Color(col || accent())); VS.hl.material.depthTest = false; VS.hl.renderOrder = 80; VS.hl.userData.editorOnly = true; B.scene.add(VS.hl); }

/* ---------------- tools ---------------- */
const KIT_TOOLS = [['place', 'Place', 'P', 'Click to place the piece, drag to place a row of walls or a patch of floor'], ['room', 'Room', 'O', 'Drag a rectangle: floor, walls, windows and a door in one go'], ['erase', 'Erase', 'X', 'Click or drag over pieces to remove them. Hold Shift to remove anything'], ['paint', 'Restyle', 'B', 'Click or drag over pieces to give them the current style'], ['select', 'Select', 'V', 'Pick pieces to move, turn, size or edit them']];
function activeTool() {
  if (!S.on || Ed.placing) return null;
  if (S.mode === 'kit') return S.tool === 'select' ? null : S.tool;
  if (S.mode === 'buildings') return S.stamp ? 'stamp' : S.bTool === 'draw' ? 'bdraw' : null;
  if (S.mode === 'generate') return S.genPlace ? 'gen' : null; return null;
}
function cellAt(e) { const p = hitPlane(e, level()); if (!p) return null; return { i: Math.floor(p.x / S.M), j: Math.floor(p.z / S.M), p }; }
function rectOf(a, b) { return { i0: Math.min(a.i, b.i), j0: Math.min(a.j, b.j), i1: Math.max(a.i, b.i), j1: Math.max(a.j, b.j) }; }
function toolMove(e) {
  const t = activeTool(), M = S.M, y = level(); if (!t) return;
  if (t === 'place') { const sn = snapAt(e, S.piece); if (!sn) return; S.cur = sn; const list = S.drag ? dragList(S.piece, S.drag.a, sn) : dragList(S.piece, sn, sn);
    const key = S.piece + '|' + S.style + '|' + M + '|' + HH() + '|' + (list[0] ? list[0].ry : 0) + '|' + list.length, proto = setGhost(key + '|' + list.map(l => l.x + ',' + l.z).join(';'), () => { const g = new THREE.Group(); g.userData.editorOnly = true; const pk = S.piece + '|' + S.style + '|' + S.M + '|' + HH(); if (!VS.proto || VS.proto.key !== pk) VS.proto = { key: pk, g: ghostOf(pieceObj(S.piece, S.style, S.M, HH())) }; const one = VS.proto.g; list.slice(0, 160).forEach(L => { const c = one.clone(); c.position.set(L.x, L.y, L.z); c.rotation.y = (L.ry || 0) * Math.PI / 180; g.add(c); }); return g; });
    const pc = PC[S.piece === 'door' ? 'wall_door' : S.piece]; if (pc.snap === 'cell' || pc.snap === 'vertex' || pc.snap === 'free') cursorRect(sn.x - (pc.snap === 'cell' ? M / 2 : .3), y, sn.z - (pc.snap === 'cell' ? M / 2 : .3), pc.snap === 'cell' ? M : .6, pc.snap === 'cell' ? M : .6); else cursorRect(sn.x - (sn.ry % 180 ? .15 : M / 2), y, sn.z - (sn.ry % 180 ? M / 2 : .15), sn.ry % 180 ? .3 : M, sn.ry % 180 ? M : .3);
    label(e, S.drag && list.length > 1 ? list.length + ' × ' + (PC[S.piece] ? PC[S.piece].label : 'Door') : null); return; }
  if (t === 'room' || t === 'bdraw') { const c = cellAt(e); if (!c) return; const a = S.drag ? S.drag.a : c, r = rectOf(a, c), w = r.i1 - r.i0 + 1, d = r.j1 - r.j0 + 1; cursorRect(r.i0 * M, y, r.j0 * M, w * M, d * M, t === 'bdraw' ? HH() * S.bld.floors : HH()); clearGhost(); label(e, w + ' × ' + d + ' squares · ' + (w * M) + ' × ' + (d * M) + ' m' + (t === 'bdraw' ? ' · ' + S.bld.floors + ' floor' + (S.bld.floors > 1 ? 's' : '') : '')); return; }
  if (t === 'erase' || t === 'paint') { const o = pickObj(e, o => e.shiftKey && t === 'erase' ? o.type !== 'player_start' : o.type === 'kit'); highlight(o, t === 'erase' ? '#ff5a5f' : accent()); S.hover = o; if (S.drag && o && !S.drag.done.has(o.id)) { S.drag.done.add(o.id); t === 'erase' ? eraseObj(o) : paintObj(o); highlight(null); } if (VS.cur) VS.cur.visible = false; return; }
  if (t === 'stamp') { const sec = S.stamp, c = cellAt(e); if (!c || !sec) return; const k = S.rot / 90 & 3, w = k % 2 ? sec.d : sec.w, d = k % 2 ? sec.w : sec.d, i0 = c.i - Math.floor(w / 2), j0 = c.j - Math.floor(d / 2); S.cur = { i0, j0 }; cursorRect(i0 * M, y, j0 * M, w * M, d * M, .1);
    const g = setGhost('stamp|' + sec.id + '|' + k, () => { const gg = new THREE.Group(); gg.userData.editorOnly = true; const inner = ghostOf(sec.objs.slice(0, 400)); inner.position.set(-sec.w * M / 2, 0, -sec.d * M / 2); const piv = new THREE.Group(); piv.add(inner); piv.rotation.y = k * Math.PI / 2; gg.add(piv); return gg; }); g.position.set(i0 * M + w * M / 2, y, j0 * M + d * M / 2); label(e, sec.name + ' · R turns it'); return; }
  if (t === 'gen') { const c = cellAt(e); if (!c) return; const g = S.gen.cfg, w = g.w, d = g.d, i0 = c.i - Math.floor(w / 2), j0 = c.j - Math.floor(d / 2); S.cur = { i0, j0 }; cursorRect(i0 * M, y, j0 * M, w * M, d * M, 2.5); clearGhost(); label(e, KLAB(S.gen.kind) + ' · ' + w * M + ' × ' + d * M + ' m · click to build'); }
}
function toolDown(e) {
  const t = activeTool(); if (!t) return;
  if (t === 'place') { const sn = snapAt(e, S.piece); if (!sn) return; S.drag = { a: sn }; toolMove(e); return; }
  if (t === 'room' || t === 'bdraw') { const c = cellAt(e); if (!c) return; S.drag = { a: c }; toolMove(e); return; }
  if (t === 'erase' || t === 'paint') { B.pushUndo(); S.drag = { done: new Set() }; toolMove(e); return; }
  if (t === 'stamp') { if (S.cur) { const out = stampAt(S.stamp, S.cur.i0 * S.M, level(), S.cur.j0 * S.M, S.rot / 90 & 3); B.toast(S.stamp.name + ' stamped: ' + out.length + ' objects'); if (!e.shiftKey) { S.stamp = null; hideCursor(); renderAll(); } } return; }
  if (t === 'gen') { if (!S.cur) return; const cfg = Object.assign({}, S.gen.cfg, { at: [S.cur.i0 * S.M, level(), S.cur.j0 * S.M], M: S.M, H: HH() }); S.genPlace = false; hideCursor(); const r = generate(S.gen.kind, cfg); if (r) { B.toast(r.sec.name + ' built: ' + summary(r.res.info)); } renderAll(); }
}
function toolUp(e) {
  const t = activeTool(), D = S.drag; S.drag = null; if (!t || !D) return;
  if (t === 'place') { const sn = snapAt(e, S.piece) || D.a, list = dragList(S.piece, D.a, sn); place(list); clearGhost(); toolMove(e); }
  else if (t === 'room' || t === 'bdraw') { const c = cellAt(e) || D.a, r = rectOf(D.a, c); if (t === 'room') fillRoom(r.i0, r.j0, r.i1, r.j1); else makeBuilding(r.i0, r.j0, r.i1 - r.i0 + 1, r.j1 - r.j0 + 1); toolMove(e); }
  else if (t === 'erase' || t === 'paint') { if (!D.done.size) { /* nothing touched: drop the empty undo step */ } }
}
const summary = i => !i ? '' : [i.rooms ? i.rooms + ' rooms' : null, i.buildings ? i.buildings + ' buildings' : null, i.trees ? i.trees + ' trees' : null, i.locks ? i.locks + ' locked doors' : null, i.enemies ? i.enemies + ' enemies' : null, i.pieces ? i.pieces + ' pieces' : null].filter(Boolean).join(', ');
addEventListener('pointerdown', e => { if (!S.on || e.target !== B.canvas || e.button !== 0 || e.altKey || Ed.playing || !activeTool()) return; e.preventDefault(); e.stopImmediatePropagation(); try { B.canvas.setPointerCapture(e.pointerId); } catch (x) { } toolDown(e); }, true);
addEventListener('pointermove', e => { if (!S.on || Ed.playing) return; if (!activeTool()) { if (VS.cur && VS.cur.visible) hideCursor(); return; } if (e.target !== B.canvas && !S.drag) { return; } if (B.V.rmb || B.V.mmb || B.V.orbit) return; toolMove(e); }, true);
addEventListener('pointerup', e => { if (!S.on || !S.drag) return; toolUp(e); }, true);
B.canvas.addEventListener('pointerleave', () => { if (S.on && !S.drag) { if (VS.cur) VS.cur.visible = false; clearGhost(); label(null); highlight(null); } });
/* drag a card from the library onto the level */
B.canvas.addEventListener('dragover', e => { if (!S.on || !S.dragPiece) return; e.preventDefault(); S.piece = S.dragPiece; S.tool = 'place'; toolMove(e); });
B.canvas.addEventListener('drop', e => { if (!S.on || !S.dragPiece) return; e.preventDefault(); const sn = snapAt(e, S.piece); if (sn) place(dragList(S.piece, sn, sn)); S.dragPiece = null; renderAll(); });
addEventListener('keydown', e => {
  if (!S.on || Ed.playing || Ed.modalOpen || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '') || (e.target && e.target.isContentEditable)) return; if (S.mode === 'rooms') return;
  const k = e.code, stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  if (k === 'Escape') { if (S.drag) { stop(); S.drag = null; hideCursor(); return; } if (S.stamp || S.genPlace || S.bTool === 'draw') { stop(); S.stamp = null; S.genPlace = false; S.bTool = null; hideCursor(); renderAll(); return; } if (S.mode === 'kit' && S.tool !== 'select') { stop(); setTool('select'); return; } return; }
  if (k === 'KeyR' && (activeTool() === 'place' || activeTool() === 'stamp')) { stop(); S.rot = (S.rot + (e.shiftKey ? 270 : 90)) % 360; clearGhost(); renderHud(); return; }
  if (S.mode === 'kit') { const map = { KeyP: 'place', KeyO: 'room', KeyX: 'erase', KeyB: 'paint', KeyV: 'select' }; if (map[k]) { stop(); setTool(map[k]); return; }
    if (k === 'BracketLeft' || k === 'BracketRight') { stop(); const list = libPieces(); const i = list.indexOf(S.piece); S.piece = list[(i + (k === 'BracketRight' ? 1 : -1) + list.length) % list.length]; S.tool = 'place'; clearGhost(); renderAll(); return; }
    if (k === 'KeyR' && Ed.sel) { const o = Ed.objs.get(Ed.sel); if (o && o.o.type === 'kit') { stop(); B.pushUndo(); o.o.r[1] = ((o.o.r[1] || 0) + 90) % 360; B.refreshObj(o.o.id); joinCorners([o.o.p[1]]); B.select(o.o.id); return; } } }
  if (S.mode === 'buildings' && k === 'KeyB') { stop(); S.bTool = S.bTool === 'draw' ? null : 'draw'; S.stamp = null; renderAll(); }
}, true);
function setTool(t) { S.tool = t; S.drag = null; hideCursor(); if (t !== 'select') { B.select(null); try { B.setMulti([]); } catch (x) { } } renderAll(); }

/* ---------------- the studio: modes, panel, dock and HUD ---------------- */
const MODES = [['rooms', 'Rooms', 'Draw rooms and 3D spaces'], ['kit', 'Kit', 'Snap modular pieces'], ['buildings', 'Buildings', 'Whole buildings and sections'], ['generate', 'Generate', 'Seeded worlds with rules']];
function setMode(m) {
  if (!MODES.some(x => x[0] === m)) return; S.mode = m; S.drag = null; S.stamp = null; S.genPlace = false; S.bTool = null; hideCursor(); savePref();
  if (m === 'rooms') { if (['select'].includes(B.RB.mode)) B.rbSetMode('rect'); } else if (B.RB.mode !== 'select') B.rbSetMode('select');
  floorView(); secLines(); S.fresh = true; renderAll(); const d = $('#details'); if (d) d.scrollTop = 0;
}
/* Buildings and Generate show every floor; Kit and Rooms keep the floor view the editor uses (upper floors hidden while you work below) */
function floorView() { if (!S.on) return; const FL = B.FL; if (S.viewWas == null) S.viewWas = FL.view; const want = (S.mode === 'buildings' || S.mode === 'generate' || (S.mode === 'kit' && B.flList().length < 2)) ? 'all' : S.viewWas; if (FL.view !== want) { FL.view = want; try { B.flApply(); } catch (x) { } } }
function renderAll() { if (!S.on) return; if (!activeTool()) hideCursor(); B.renderDetails(); try { renderDock(); } catch (e) { console.error('Build library failed', e); } try { renderHud(); } catch (e) { console.error(e); } B.hintForContext(); }
const seg = (opts, val, on, cls2) => h('div', { class: 'bs-seg' + (cls2 ? ' ' + cls2 : '') }, ...opts.map(([v, l]) => h('button', { class: v === val ? 'on' : '', onclick: () => on(v) }, l)));
const sw = (val, on) => { const b = h('button', { class: 'bs-sw' + (val ? ' on' : ''), role: 'switch', 'aria-checked': String(!!val), onclick: () => { val = !val; b.classList.toggle('on', val); b.setAttribute('aria-checked', String(val)); on(val); } }, h('i')); return b; };
const rowEl = (label, ctl, hint) => h('div', { class: 'bs-row', title: hint || '' }, h('span', null, label), ctl);
const card = (title, ...kids) => h('div', { class: 'bs-c' }, title ? h('div', { class: 'bs-ct' }, ...[].concat(title)) : null, ...kids);
const ib = (icon, title, on, cls2) => h('button', { class: 'bs-ib' + (cls2 ? ' ' + cls2 : ''), title, 'aria-label': title, onclick: on, html: I(IC[icon], 15) });
const dots = (val, n, on, labels) => h('div', { class: 'bs-dots' }, ...Array.from({ length: n }, (_, i) => h('button', { class: i === val ? 'on' : '', title: labels ? labels[i] : String(i), onclick: () => on(i) }, labels ? labels[i] : String(i))));
const range = (val, min, max, step, on, fmt) => { const out = h('b', null, fmt ? fmt(val) : val), r = h('input', { type: 'range', min, max, step, value: val, class: 'bs-range' }); r.oninput = () => { out.textContent = fmt ? fmt(+r.value) : r.value; r.style.setProperty('--p', ((r.value - min) / (max - min) * 100) + '%'); }; r.onchange = () => on(+r.value); r.style.setProperty('--p', ((val - min) / (max - min) * 100) + '%'); return h('div', { class: 'bs-rg' }, r, out); };
function stylePicker(val, on) { return h('div', { class: 'bs-styles' }, ...Object.entries(STY).map(([k, s]) => h('button', { class: 'bs-sty' + (k === val ? ' on' : ''), title: s.label + ': ' + s.tag, onclick: () => on(k) }, h('i', { style: `background:linear-gradient(135deg,${s.swatch[0]} 0 52%,${s.swatch[1]} 52% 78%,${s.swatch[2]} 78%)` }), h('span', null, s.label)))); }
function floorsCard() {
  const L = B.flList(), cur = Math.max(0, L.findIndex(f => Math.abs(f.y - level()) < .05));
  return card(['Level', h('small', null, 'Height ' + level() + ' m')], h('div', { class: 'bs-floors' }, ...L.map((f, i) => h('button', { class: i === cur ? 'on' : '', onclick: () => { B.flSet(i, true); renderAll(); } }, h('b', null, f.name.replace('Floor ', 'F')), h('small', null, f.y + ' m'))), h('button', { class: 'add', title: 'Add a floor above', onclick: () => { B.flAdd(); renderAll(); }, html: I(IC.place, 14) })),
    rowEl('Floor to floor', range(HH(), 2.4, 8, .1, v => { B.FL.step = v; clearGhost(); renderAll(); }, v => v.toFixed(1) + ' m'), 'Wall height for new pieces and the spacing of new floors'));
}
function headEl() {
  const m = MODES.find(x => x[0] === S.mode), objs = P().objects, kits = objs.filter(o => o.type === 'kit').length, secs = store().sections.length, rooms = objs.filter(o => o.props && o.props.room).length;
  return h('div', { class: 'bs-head' }, h('div', { class: 'eye' }, 'Build studio', h('button', { class: 'bs-done', title: 'Leave the Build tab (Esc)', onclick: () => B.rbExit() }, 'Done')), h('h2', null, h('i', { html: I(IC[m[0]], 17) }), m[1]), h('p', null, m[2]),
    h('div', { class: 'stats' }, h('span', null, h('b', null, kits), ' pieces'), h('span', null, h('b', null, rooms), ' rooms'), h('span', null, h('b', null, secs), ' sections'), h('span', null, h('b', null, B.flList().length), ' floors')));
}
function modesEl() {
  const wrap = h('div', { class: 'bs-modes', role: 'tablist' }), ind = h('i', { class: 'ind' }); wrap.append(ind);
  MODES.forEach(([k, l]) => wrap.append(h('button', { class: k === S.mode ? 'on' : '', role: 'tab', 'aria-selected': String(k === S.mode), title: l, onclick: () => setMode(k) }, h('span', { html: I(IC[k], 17) }), l)));
  const idx = MODES.findIndex(x => x[0] === S.mode); ind.style.width = 'calc((100% - 6px - 6px) / 4)'; ind.style.transform = 'translateX(calc(' + idx + ' * (100% + 2px)))'; return wrap;
}
/* the panel, in the right column where the room builder used to draw */
B.panel = function (R, base) {
  try { studioPanel(R, base); } catch (e) {
    console.error('Build studio panel failed', e); R.innerHTML = ''; R.append(h('div', { class: 'bs-p' }, h('div', { class: 'bs-c bs-err' }, h('div', { class: 'bs-ct' }, 'Something went wrong here'), h('p', { class: 'bs-tip', style: 'margin-top:0' }, 'The Build tab hit a problem: ' + String(e && e.message || e) + '. Your level is safe. The room tools are below.'),
      h('div', { class: 'bs-acts' }, h('button', { class: 'btn sm', onclick: () => { S.mode = 'rooms'; savePref(); renderAll(); } }, 'Use Rooms mode'), h('button', { class: 'btn sm', onclick: () => Ed.safety && Ed.safety.report() }, 'Problem report')))));
    try { base(); } catch (x) { console.error(x); } }
};
function studioPanel(R, base) {
  if (!S.on) { S.on = true; try { mountView(); } catch (e) { console.error('Build studio view failed', e); } }
  const root = h('div', { class: 'bs-p' + (S.fresh ? ' fresh' : '') }); S.fresh = false; root.append(headEl(), modesEl());
  if (S.mode === 'rooms') { const box = h('div', { class: 'bs-rooms' }); root.append(box); R.append(root); base.call(null); const kids = [...R.childNodes].filter(n => n !== root); kids.forEach(n => box.append(n)); const dh = box.querySelector('.dhead'); if (dh) dh.remove(); return; }
  if (S.mode === 'kit') kitPanel(root); else if (S.mode === 'buildings') bldPanel(root); else genPanel(root);
  R.append(root);
}
function kitPanel(R) {
  const tools = h('div', { class: 'bs-tools' }, ...KIT_TOOLS.map(([k, l, key, ti]) => h('button', { class: 'bs-tool' + (S.tool === k ? ' on' : ''), title: ti + ' (' + key + ')', onclick: () => setTool(k) }, h('span', { html: I(IC[k], 18) }), l, h('kbd', null, key))));
  R.append(card('Tool', tools, h('p', { class: 'bs-tip' }, KIT_TOOLS.find(t => t[0] === S.tool)[3] + '.')));
  const o = Ed.sel && Ed.objs.get(Ed.sel) ? Ed.objs.get(Ed.sel).o : null;
  if (S.tool === 'select' && o && o.type !== 'kit') R.append(card(['Selected', h('small', null, o.name || o.type)], h('p', { class: 'bs-tip', style: 'margin-top:0' }, (ENG.PREFABS[o.type] || {}).label + ' settings (keys, logic, behaviour) are in the Inspector of the Level tab.'), h('button', { class: 'btn sm bs-wide', onclick: () => { const id = o.id; B.rbExit(); B.select(id); } }, 'Edit it in the Level tab')));
  if (S.tool === 'select' && o && o.type === 'kit') { const set = (fn, k) => { B.pushUndo('bsk' + k); fn(); B.refreshObj(o.id); B.select(o.id); joinCorners([o.p[1]]); B.markDirty(); };
    R.append(card(['Selected piece', h('small', null, o.name)], h('div', { class: 'bs-pick' }, thImg('p|' + o.props.piece + '|' + o.props.style, () => [ENG.kitObject(o.props.piece, o.props.style, [0, 0, 0], 0, 4, 3)]), h('div', null, h('b', null, (PC[o.props.piece] || {}).label || o.props.piece), h('small', null, o.s.map(v => (+v).toFixed(2)).join(' × ') + ' m'))),
      stylePicker(o.props.style, v => set(() => { o.props.style = v; }, 'st')), rowEl('Length', range(+o.s[0], .5, 16, .25, v => set(() => { o.s[0] = v; }, 'w'), v => v.toFixed(2) + ' m')), rowEl('Height', range(+o.s[1], .1, 12, .05, v => set(() => { o.s[1] = v; }, 'h'), v => v.toFixed(2) + ' m')),
      h('div', { class: 'bs-acts' }, h('button', { class: 'btn sm', onclick: () => set(() => { o.r[1] = ((o.r[1] || 0) + 90) % 360; }, 'r') }, 'Turn 90°'), h('button', { class: 'btn sm', onclick: () => set(() => { o.props.seed = 1 + Math.floor(Math.random() * 999); }, 'sd') }, 'New variation'), h('button', { class: 'btn sm danger', onclick: () => { B.pushUndo(); eraseObj(o); renderAll(); } }, 'Remove')))); }
  else { const pc = PC[S.piece === 'door' ? 'wall_door' : S.piece] || PC.wall, sz = ENG.kitSize(S.piece === 'door' ? 'wall_door' : S.piece, S.M, HH(), S.style);
    R.append(card(['Piece', h('small', null, 'Pick in the library on the left')], h('div', { class: 'bs-pick big' }, thImg('p|' + S.piece + '|' + S.style, () => pieceObj(S.piece, S.style)), h('div', null, h('b', null, S.piece === 'door' ? 'Door' : pc.label), h('small', null, pc.group + ' · ' + sz.map(v => (+v).toFixed(1)).join(' × ') + ' m'), h('small', null, { edge: 'Snaps onto grid lines', vertex: 'Snaps onto grid corners', cell: 'Fills a grid square', free: 'Goes anywhere, on any surface', mount: 'Hangs on a wall face' }[pc.snap]),
      h('div', { class: 'bs-acts' }, h('button', { class: 'btn sm', onclick: () => { S.rot = (S.rot + 90) % 360; clearGhost(); renderAll(); } }, h('span', { html: I(IC.rotate, 13) }), ' Turn ' + S.rot + '° (R)')))))); }
  R.append(card(['Style', h('small', null, STY[S.style].tag)], stylePicker(S.style, v => { S.style = v; savePref(); clearGhost(); renderAll(); }),
    h('div', { class: 'bs-acts' }, h('button', { class: 'btn sm', onclick: () => { const ids = new Set(B.multi()); restyle(o => ids.has(o.id), 'Selection'); } }, 'Restyle selection'), h('button', { class: 'btn sm', onclick: () => restyle(o => o.p[1] > level() - .06 && o.p[1] < level() + HH() + .06, 'This floor') }, 'This floor'), h('button', { class: 'btn sm', onclick: () => restyle(() => true, 'Everything') }, 'Everything'))));
  if (S.tool === 'room') R.append(card('Smart room', rowEl('Ceiling', sw(S.room.ceil, v => { S.room.ceil = v; })), rowEl('Entrance door', sw(S.room.door, v => { S.room.door = v; })), rowEl('Join rooms next door', sw(S.room.connect, v => { S.room.connect = v; }), 'A shared wall gets a doorway'), rowEl('Windows', seg([[0, 'None'], [1, 'Some'], [2, 'Many']], S.room.windows, v => { S.room.windows = v; renderAll(); }))));
  R.append(card(['Grid', h('small', null, 'Pieces snap to ' + S.M + ' m squares')], seg([[2, '2 m'], [3, '3 m'], [4, '4 m'], [6, '6 m']], S.M, v => { S.M = v; savePref(); clearGhost(); renderAll(); })), floorsCard());
}
function bldPanel(R) {
  const b = S.bld; R.append(card('Tool', h('div', { class: 'bs-tools three' }, h('button', { class: 'bs-tool' + (S.bTool === 'draw' ? ' on' : ''), title: 'Drag a footprint on the level (B)', onclick: () => { S.bTool = S.bTool === 'draw' ? null : 'draw'; S.stamp = null; hideCursor(); renderAll(); } }, h('span', { html: I(IC.buildings, 18) }), 'Draw', h('kbd', null, 'B')),
    h('button', { class: 'bs-tool' + (S.stamp ? ' on' : ''), title: 'Pick a saved section in the library to stamp it', onclick: () => B.toast('Pick a section in the library on the left') }, h('span', { html: I(IC.stamp, 18) }), 'Stamp', h('kbd', null, 'R turns')), h('button', { class: 'bs-tool' + (!S.bTool && !S.stamp ? ' on' : ''), onclick: () => { S.bTool = null; S.stamp = null; hideCursor(); renderAll(); } }, h('span', { html: I(IC.select, 18) }), 'Select', h('kbd', null, 'Esc'))),
    h('p', { class: 'bs-tip' }, S.bTool === 'draw' ? 'Drag a rectangle on the level. The building rises with the settings below.' : S.stamp ? 'Click to stamp ' + S.stamp.name + '. R turns it, Shift keeps stamping.' : 'Pick Draw or a preset in the library, then drag or click on the level.')));
  const sel = Ed.sel && Ed.objs.get(Ed.sel), bs = sel && sel.o.sec && store().sections.find(s => s.id === sel.o.sec && s.kind === 'building');
  if (bs) { const c = bs.cfg, rb = (k, v) => { c[k] = v; regen(bs, false); };
    R.append(card(['This building', h('small', null, bs.name)], rowEl('Floors', dots(c.floors - 1, 6, i => rb('floors', i + 1), ['1', '2', '3', '4', '5', '6'])), rowEl('Roof', seg([['gable', 'Pitched'], ['flat', 'Flat'], ['none', 'None']], c.roof, v => rb('roof', v))), rowEl('Windows', seg([[.1, 'Few'], [.6, 'Some'], [1, 'All']], c.windows >= 1 ? 1 : c.windows > .3 ? .6 : .1, v => rb('windows', v))), rowEl('Shop front', sw(!!c.shop, v => rb('shop', v))),
      stylePicker(c.style, v => rb('style', v)), h('div', { class: 'bs-acts' }, h('button', { class: 'btn sm', onclick: () => detach(bs) }, 'Keep as hand-made'), h('button', { class: 'btn sm danger', onclick: () => dropSec(bs) }, 'Remove building')))); }
  R.append(card(['New building', h('small', null, b.w + ' × ' + b.d + ' squares')], rowEl('Width', range(b.w, 1, 8, 1, v => { b.w = v; renderAll(); }, v => v + ' sq')), rowEl('Depth', range(b.d, 1, 8, 1, v => { b.d = v; renderAll(); }, v => v + ' sq')), rowEl('Floors', dots(b.floors - 1, 6, i => { b.floors = i + 1; renderAll(); }, ['1', '2', '3', '4', '5', '6'])),
    rowEl('Roof', seg([['gable', 'Pitched'], ['flat', 'Flat'], ['none', 'None']], b.roof, v => { b.roof = v; renderAll(); })), rowEl('Windows', seg([[.1, 'Few'], [.6, 'Some'], [1, 'All']], b.windows >= 1 ? 1 : b.windows > .3 ? .6 : .1, v => { b.windows = v; renderAll(); })), rowEl('Shop front', sw(b.shop, v => { b.shop = v; })),
    h('div', { class: 'bs-ct sub' }, 'Style'), stylePicker(b.style || S.style, v => { b.style = v; renderAll(); }),
    h('button', { class: 'btn primary bs-big', onclick: () => { const t = B.cam.position.clone().add(new THREE.Vector3(0, 0, -1).applyQuaternion(B.cam.quaternion).multiplyScalar(18)); makeBuilding(Math.floor(t.x / S.M) - Math.floor(b.w / 2), Math.floor(t.z / S.M) - Math.floor(b.d / 2), b.w, b.d); } }, 'Build it in front of me')));
  const L = store().library; R.append(card(['Sections', h('small', null, 'Reuse any part of a level')], h('p', { class: 'bs-tip' }, 'Select pieces (or click a building), then save them. Saved sections live in this project and show in the library to stamp anywhere.'), h('button', { class: 'btn sm', onclick: saveSection, html: I(IC.save, 13) + ' Save the selection as a section' }),
    ...L.map(sec => h('div', { class: 'bs-secr' }, h('i', { html: I(IC.stamp, 15) }), h('div', null, h('input', { class: 'bs-name', value: sec.name, onchange: e => { sec.name = e.target.value.trim() || sec.name; B.markDirty(); renderDock(); } }), h('small', null, sec.objs.length + ' objects · ' + sec.w + ' × ' + sec.d)), h('div', null, ib('stamp', 'Stamp copies', () => { S.stamp = sec; S.bTool = null; S.rot = 0; renderAll(); }), ib('trash', 'Delete this section', () => { B.pushUndo(); store().library = store().library.filter(x => x !== sec); B.markDirty(); renderAll(); }, 'danger'))))));
  R.append(floorsCard());
}
function genPanel(R) {
  const K = S.gen.kind, kd = WG.kinds[K], c = S.gen.cfg, sc = (k, v) => { c[k] = v; renderAll(); }, rl = (k, v) => { c.rules[k] = v; renderAll(); };
  R.append(card('Generator', h('div', { class: 'bs-gens' }, ...Object.entries(WG.kinds).filter(([, v]) => !v.solo).map(([k, v]) => h('button', { class: k === K ? 'on' : '', onclick: () => pickGen(k) }, v.label)))));
  const res = mapRun(K, c), cv = h('canvas', { width: 560, height: 400 }); drawMap(cv, res); const info = res.info || {};
  R.append(h('div', { class: 'bs-c bs-mapc' }, h('div', { class: 'bs-map' + (S.scan ? ' scan' : '') }, cv, h('div', { class: 'bs-mapl' }, h('b', null, kd.label), h('span', null, '#' + c.seed))), h('div', { class: 'bs-mapi' }, info.error ? h('span', { class: 'warn' }, info.error) : summary(info) || 'Ready'),
    h('div', { class: 'bs-seed' }, h('span', null, 'Seed'), h('input', { class: 'bs-in', type: 'number', value: c.seed, min: 1, onchange: e => { c.seed = Math.max(1, +e.target.value | 0); S.scan = true; renderAll(); } }), h('button', { class: 'btn sm', title: 'A new random seed', onclick: () => { c.seed = 1 + Math.floor(Math.random() * 999999); S.scan = true; renderAll(); }, html: I(IC.dice, 14) + ' Reroll' })),
    h('div', { class: 'bs-legend' }, ...[['#3ddc84', 'Start'], [accent(), 'Exit'], ['#ff5a5f', 'Enemy'], ['#f0c45a', 'Loot'], ['#e5383b', 'Key and lock']].map(([col, t]) => h('span', null, h('i', { style: 'background:' + col }), t)))));
  S.scan = false;
  R.append(card(['Area and look', h('small', null, c.w * S.M + ' × ' + c.d * S.M + ' m')], rowEl('Width', range(c.w, 6, 40, 1, v => sc('w', v), v => v + ' sq')), rowEl('Depth', range(c.d, 6, 40, 1, v => sc('d', v), v => v + ' sq')), stylePicker(c.style, v => sc('style', v))));
  const lv = ['None', 'Few', 'Some', 'Lots'], rules = card('Rules', rowEl('Enemies', dots(c.rules.enemies, 4, i => rl('enemies', i), lv)), rowEl('Loot', dots(c.rules.loot, 4, i => rl('loot', i), lv)), rowEl('Resources', dots(c.rules.resources, 4, i => rl('resources', i), lv)));
  if (K === 'dungeon' || K === 'facility') rules.append(rowEl('Keys and locks', dots(c.rules.keys, 4, i => rl('keys', i), ['0', '1', '2', '3']), 'Locked doors along the way, each key hidden before its door'), rowEl('Shortcuts', dots(c.rules.shortcuts, 3, i => rl('shortcuts', i), ['0', '1', '2']), 'Loops, and a door from the far end back to the start that opens from the far side'));
  if (K === 'forest') rules.append(rowEl('Trees', dots(c.density, 4, i => sc('density', i), ['Sparse', 'Light', 'Thick', 'Dense'])));
  if (K === 'town') rules.append(rowEl('Tallest buildings', dots((c.floors || 3) - 1, 4, i => sc('floors', i + 1), ['1', '2', '3', '4'])));
  rules.append(h('div', { class: 'bs-row stack' }, h('span', null, 'Goal'), seg([['exit', 'Reach the exit'], ['relic', 'Find the relic'], ['none', 'No goal']].filter(q => q[0] !== 'relic' || K === 'dungeon' || K === 'facility'), c.quest, v => sc('quest', v))));
  R.append(rules);
  R.append(card('Options', ['dungeon', 'facility', 'caves'].includes(K) ? rowEl('Ceiling', sw(c.ceiling, v => sc('ceiling', v))) : null, rowEl('Build around what is there', sw(c.around !== false, v => { c.around = v; }), 'Rooms and paths avoid your own objects in the area'), rowEl('New layout every play', sw(!!c.live, v => { c.live = v; }), 'Rebuilt with a new seed each time the game starts'),
    h('button', { class: 'btn primary bs-big', onclick: () => { S.genPlace = true; renderAll(); B.toast('Move over the level and click where the ' + kd.label.toLowerCase() + ' should go'); } }, S.genPlace ? 'Click on the level…' : 'Place on the level'),
    h('button', { class: 'btn sm bs-wide', onclick: () => { const t = B.cam.position.clone().add(new THREE.Vector3(0, 0, -1).applyQuaternion(B.cam.quaternion).multiplyScalar(c.w * S.M * .6)); const cfg = Object.assign({}, c, { at: [Math.floor(t.x / S.M - c.w / 2) * S.M, level(), Math.floor(t.z / S.M - c.d / 2) * S.M], M: S.M, H: HH() }); const r = generate(K, cfg); if (r) { r.sec.live = !!c.live; frameSec(r.sec); B.toast(r.sec.name + ' built: ' + summary(r.res.info)); } renderAll(); } }, 'Build it in front of me')));
  R.append(sectionsCard());
}
function sectionsCard() {
  const list = store().sections; if (!list.length) return card('Sections in this level', h('p', { class: 'bs-tip' }, 'Generated areas and buildings show here. Each can be rebuilt on its own without touching the rest of the level.'));
  return card(['Sections in this level', h('small', null, list.length)], ...list.map(s => h('div', { class: 'bs-secr' + (s.locked ? ' locked' : ''), onmouseenter: () => { S.hoverSec = s.id; secLines(); }, onmouseleave: () => { S.hoverSec = null; secLines(); } }, h('i', { html: I(IC[s.kind === 'building' ? 'buildings' : 'generate'], 15) }),
    h('div', null, h('input', { class: 'bs-name', value: s.name, onchange: e => { s.name = e.target.value.trim() || s.name; B.markDirty(); } }), h('small', null, KLAB(s.kind) + ' · seed ' + (s.cfg && s.cfg.seed) + ' · ' + secObjs(s.id).length + ' objects' + (s.live ? ' · new every play' : ''))),
    h('div', null, ib('dice', 'Rebuild with a new seed', () => regen(s, true)), ib(s.locked ? 'lock' : 'unlock', s.locked ? 'Locked: rebuilding is off' : 'Lock it so it cannot be rebuilt by accident', () => { s.locked = !s.locked; B.markDirty(); secLines(); renderAll(); }, s.locked ? 'on' : ''), ib('live', 'New layout every time the game starts', () => { s.live = !s.live; B.markDirty(); renderAll(); B.toast(s.live ? s.name + ' gets a new layout every time the game starts' : s.name + ' keeps this layout'); }, s.live ? 'on' : ''),
      ib('target', 'Show it', () => frameSec(s)), ib('unlink', 'Keep as hand-made: the pieces stay, the generator lets go', () => detach(s)), ib('trash', 'Remove it and its pieces', () => dropSec(s), 'danger')))));
}
function pickGen(k) { const cur = S.gen.byKind = S.gen.byKind || {}; if (S.gen.cfg && S.gen.cfg.rules) cur[S.gen.kind] = S.gen.cfg; S.gen.kind = k; S.gen.cfg = (cur[k] && cur[k].rules) ? cur[k] : Object.assign(WG.defaults(k), { seed: 1 + Math.floor(Math.random() * 99999), around: true, start: null, live: false }); S.scan = true; renderAll(); }
pickGen('dungeon');

/* ---------------- the library dock ---------------- */
let DOCK = null, HUD = null;
const libPieces = () => { const all = ['door'].concat(Object.keys(PC)), q = S.q.trim().toLowerCase(); return all.filter(k => { const p = k === 'door' ? { label: 'Door', group: 'Walls' } : PC[k]; return (S.group === 'All' || p.group === S.group) && (!q || p.label.toLowerCase().includes(q) || p.group.toLowerCase().includes(q)); }); };
const badge = k => { if (k === 'door') return 'opens'; const p = PC[k], s = ENG.kitSize(k, S.M, HH(), S.style); return p.snap === 'cell' ? Math.round(s[0] / S.M) + '×' + Math.round(s[2] / S.M) : p.snap === 'edge' ? s[0] + ' m' : p.snap === 'vertex' ? 'corner' : p.snap === 'mount' ? 'wall' : 'free'; };
function dockCard(key, name, sub, img, on, onclick, extra) { const c = h('div', { class: 'bs-card' + (on ? ' on' : ''), role: 'button', tabindex: '0', title: name, onclick, onkeydown: e => { if (e.key === 'Enter') onclick(); } }, h('div', { class: 'th' }, img, sub ? h('span', { class: 'bd' }, sub) : null), h('b', null, name)); if (extra) extra(c); return c; }
function renderDock() {
  if (!DOCK) return; const list = DOCK.querySelector('.bs-list'), st = list ? list.scrollTop : 0; DOCK.innerHTML = ''; DOCK.classList.toggle('min', !S.dock);
  const tog = h('button', { class: 'bs-dmin', title: S.dock ? 'Hide the library' : 'Show the library', onclick: () => { S.dock = !S.dock; savePref(); renderDock(); }, html: I(IC.chev, 16) });
  document.body.classList.toggle('bs-libmin', !S.dock); if (HUD) HUD.style.left = S.dock ? 'calc(50% + 138px)' : '50%'; DOCK.onclick = S.dock ? null : e => { if (e.target.closest('.bs-dmin')) return; S.dock = true; savePref(); renderDock(); }; if (!S.dock) { DOCK.append(tog, h('div', { class: 'bs-dv' }, 'Library')); return; }
  const title = { rooms: 'Room presets', kit: 'Kit pieces', buildings: 'Buildings', generate: 'World generators' }[S.mode];
  DOCK.append(h('div', { class: 'bs-dh' }, h('div', null, h('div', { class: 'eye' }, 'Library'), h('div', { class: 'dt' }, title)), tog));
  const L = h('div', { class: 'bs-list' });
  if (S.mode === 'kit') {
    const search = h('label', { class: 'bs-search' }, h('span', { html: I(IC.search, 14) }), h('input', { placeholder: 'Search pieces', value: S.q, oninput: e => { S.q = e.target.value; const pos = e.target.selectionStart; renderDock(); const ni = DOCK.querySelector('.bs-search input'); if (ni) { ni.focus(); ni.setSelectionRange(pos, pos); } } }));
    DOCK.append(search, h('div', { class: 'bs-chips' }, ...['All'].concat(ENG.KIT_GROUPS).map(g => h('button', { class: 'bs-chip' + (S.group === g ? ' on' : ''), onclick: () => { S.group = g; renderDock(); } }, g))));
    const by = {}; libPieces().forEach(k => { const g = k === 'door' ? 'Walls' : PC[k].group; (by[g] = by[g] || []).push(k); });
    ENG.KIT_GROUPS.forEach(g => { if (!by[g]) return; L.append(h('div', { class: 'bs-gl' }, g)); const grid = h('div', { class: 'bs-grid' }); by[g].forEach(k => grid.append(dockCard(k, k === 'door' ? 'Door' : PC[k].label, badge(k), thImg('p|' + k + '|' + S.style, () => pieceObj(k, S.style)), S.piece === k && S.tool === 'place', () => { S.piece = k; S.tool = 'place'; S.rot = 0; clearGhost(); renderAll(); },
      c => { c.draggable = true; c.addEventListener('dragstart', e => { S.dragPiece = k; e.dataTransfer.effectAllowed = 'copy'; try { e.dataTransfer.setData('text/plain', k); } catch (x) { } }); c.addEventListener('dragend', () => { S.dragPiece = null; hideCursor(); }); }))); L.append(grid); });
    if (!L.children.length) L.append(h('p', { class: 'bs-empty' }, 'No pieces match that.'));
  } else if (S.mode === 'rooms') {
    L.append(h('div', { class: 'bs-gl' }, 'Ready-made rooms')); const grid = h('div', { class: 'bs-grid' });
    Object.entries(ENG.ROOM.presets).forEach(([id, p]) => { let img; try { img = h('img', { class: 'bs-ok', src: planThumb(id), alt: '' }); } catch (e) { img = h('span'); } const rm = ENG.ROOM.preset(id), xs = rm.pts.map(q => q[0]), zs = rm.pts.map(q => q[1]); grid.append(dockCard('r' + id, p[0], Math.round(Math.max(...xs) - Math.min(...xs)) + '×' + Math.round(Math.max(...zs) - Math.min(...zs)), img, false, () => { B.placeFromItem({ type: 'cubegrid', room: id, label: p[0] }); })); });
    L.append(grid, h('div', { class: 'bs-gl' }, '3D spaces')); const g2 = h('div', { class: 'bs-grid' });
    [['box3d', 'Box space'], ['cyl3d', 'Cylinder'], ['dome3d', 'Dome'], ['vault3d', 'Vaulted hall'], ['tower', 'Stair tower'], ['stairs', 'Stairs']].forEach(([k, l]) => { const T = B.RB5.tools.find(t => t[0] === k); g2.append(dockCard('s' + k, l, null, h('span', { class: 'bs-ico', html: T ? B.TNIC(T[3], 34) : '' }), B.RB.mode === k, () => { B.rbSetMode(k); renderAll(); })); }); L.append(g2);
  } else if (S.mode === 'buildings') {
    L.append(h('div', { class: 'bs-gl' }, 'Presets')); const grid = h('div', { class: 'bs-grid' });
    BPRE.forEach(([n, st, w, d, fl, roof, win, shop]) => grid.append(dockCard('b' + n, n, w + '×' + d + ' · ' + fl + 'F', thImg('b|' + n, () => { const r = WG.run('building', { w, d, floors: fl, roof, windows: win, shop, style: st, M: 4, H: 3, seed: 3, at: [0, 0, 0] }); return r.objs.filter(o => o.type === 'kit' || o.type === 'door'); }), S.bTool === 'draw' && S.bld.name === n, () => { Object.assign(S.bld, { w, d, floors: fl, roof, windows: win, shop, style: st, name: n }); S.bTool = 'draw'; S.stamp = null; renderAll(); B.toast(n + ': drag on the level, or click Build it in front of me'); })));
    L.append(grid); const lib = store().library; L.append(h('div', { class: 'bs-gl' }, 'My sections'));
    if (!lib.length) L.append(h('p', { class: 'bs-empty' }, 'Select pieces or a building, then press Save the selection as a section in the panel.'));
    else { const g2 = h('div', { class: 'bs-grid' }); lib.forEach(sec => g2.append(dockCard('l' + sec.id, sec.name, sec.w + '×' + sec.d, thImg('lib:' + sec.id, () => sec.objs.slice(0, 600)), S.stamp === sec, () => { S.stamp = S.stamp === sec ? null : sec; S.bTool = null; S.rot = 0; hideCursor(); renderAll(); }))); L.append(g2); }
  } else {
    L.append(h('div', { class: 'bs-gl' }, 'Pick one, tune it, place it')); const grid = h('div', { class: 'bs-col' });
    Object.entries(WG.kinds).filter(([, v]) => !v.solo).forEach(([k, v]) => { const cv = h('canvas', { width: 240, height: 120 }); try { drawMap(cv, mapRun(k, Object.assign(WG.defaults(k), { seed: 11, w: 20, d: 10 })), { pad: 6 }); } catch (e) { }
      grid.append(h('div', { class: 'bs-gcard' + (S.gen.kind === k ? ' on' : ''), role: 'button', tabindex: '0', onclick: () => pickGen(k) }, cv, h('div', null, h('b', null, v.label), h('small', null, v.desc)))); }); L.append(grid);
  }
  DOCK.append(L); L.scrollTop = st;
}
function planThumb(id) {
  const rm = ENG.ROOM.preset(id), c = document.createElement('canvas'); c.width = 200; c.height = 150; const g = c.getContext('2d'), xs = rm.pts.map(p => p[0]), zs = rm.pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), k = Math.min(150 / (x1 - x0 || 1), 104 / (z1 - z0 || 1)), ox = 100 - (x0 + x1) / 2 * k, oz = 75 - (z0 + z1) / 2 * k, acc = accent();
  g.strokeStyle = 'rgba(255,255,255,.05)'; for (let x = 0; x < 200; x += 12) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, 150); g.stroke(); } for (let y = 0; y < 150; y += 12) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(200, y + .5); g.stroke(); }
  g.beginPath(); rm.pts.forEach((p, i) => { const x = ox + p[0] * k, y = oz + p[1] * k; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); const c2 = new THREE.Color(acc); g.fillStyle = `rgba(${c2.r * 255 | 0},${c2.g * 255 | 0},${c2.b * 255 | 0},.18)`; g.fill(); g.lineWidth = 5; g.strokeStyle = '#d8dde6'; g.stroke(); g.lineWidth = 1.5; g.strokeStyle = acc; g.stroke();
  (rm.openings || []).forEach(() => { }); return c.toDataURL();
}
function renderHud() {
  if (!HUD) return; HUD.innerHTML = ''; const t = activeTool(), m = MODES.find(x => x[0] === S.mode), chip = (txt, cls2) => h('span', { class: cls2 || '' }, txt);
  HUD.append(chip(m[1].toUpperCase(), 'k'));
  if (S.mode === 'kit') HUD.append(chip(KIT_TOOLS.find(x => x[0] === S.tool)[1]), S.tool === 'place' ? chip(S.piece === 'door' ? 'Door' : PC[S.piece].label) : null, chip(STY[S.style].label), chip('Grid ' + S.M + ' m'), chip(B.flList().find(f => Math.abs(f.y - level()) < .05) ? B.flList().find(f => Math.abs(f.y - level()) < .05).name : level() + ' m'), t === 'place' ? h('em', null, 'R turn · drag for rows · Esc select') : t ? h('em', null, 'Esc stops') : h('em', null, 'P place · O room · X erase · B restyle'));
  else if (S.mode === 'buildings') HUD.append(chip(S.stamp ? 'Stamp ' + S.stamp.name : S.bTool === 'draw' ? 'Draw ' + S.bld.w + '×' + S.bld.d + ' · ' + S.bld.floors + 'F' : 'Select'), chip(STY[S.bld.style || S.style].label), h('em', null, S.stamp ? 'click to stamp · R turn · Esc stop' : S.bTool ? 'drag a footprint · Esc stop' : 'B draw · pick a preset'));
  else if (S.mode === 'generate') HUD.append(chip(KLAB(S.gen.kind)), chip('Seed ' + S.gen.cfg.seed), chip(STY[S.gen.cfg.style].label), h('em', null, S.genPlace ? 'click on the level to build · Esc stop' : 'tune it, then place it'));
  else HUD.append(chip('Room tools in the panel'), h('em', null, 'presets on the left'));
}
function mountView() {
  const wrap = $('#vpWrap'); if (!wrap) return; document.body.classList.add('bs-on'); const wel = $('#welcome'); if (wel) wel.style.display = 'none';
  if (!DOCK) { DOCK = h('aside', { class: 'bs-dock', 'aria-label': 'Build library' }); HUD = h('div', { class: 'bs-hud', 'aria-hidden': 'true' }); }
  if (!DOCK.isConnected) wrap.append(DOCK, HUD); const vt = $('#vtools'); DOCK.style.setProperty('--bs-top', ((vt ? vt.offsetTop + vt.offsetHeight : 96) + 10) + 'px');
  DOCK.classList.remove('out'); try { renderDock(); } catch (e) { console.error('Build library failed', e); } try { renderHud(); } catch (e) { console.error(e); } try { secLines(); } catch (e) { console.error(e); }
}
function unmountView() { document.body.classList.remove('bs-on', 'bs-libmin'); hideCursor(); if (SL) { B.scene.remove(SL); SL = null; } if (DOCK && DOCK.isConnected) { DOCK.remove(); HUD.remove(); } }
B.entered = () => { S.on = true; S.fresh = true; if (S.mode !== 'rooms' && B.RB.mode !== 'select') B.rbSetMode('select'); try { B.rightTab('inspector'); } catch (x) { } mountView(); floorView(); renderAll(); };
B.left = () => { if (S.viewWas != null) { B.FL.view = S.viewWas; S.viewWas = null; } S.on = false; S.drag = null; S.stamp = null; S.genPlace = false; S.bTool = null; unmountView(); };
B.hint = () => { if (!S.on || S.mode === 'rooms') return null; const K = s => '<kbd>' + s + '</kbd>'; if (S.mode === 'kit') return 'Build · Kit: ' + K('P') + ' place ' + K('O') + ' room ' + K('X') + ' erase ' + K('B') + ' restyle ' + K('V') + ' select · ' + K('R') + ' turn · ' + K('[') + ' ' + K(']') + ' next piece · ' + K('Esc') + ' stop'; if (S.mode === 'buildings') return 'Build · Buildings: ' + K('B') + ' draw a footprint · pick a preset or a saved section on the left · ' + K('R') + ' turns a stamp'; return 'Build · Generate: tune the generator, then Place on the level · every area is a section you can rebuild on its own'; };
/* stay in step with the editor: leaving the tab any other way hides the studio */
setInterval(() => { const want = !!(B.RB.on && Ed.tab === 'level'); if (S.on && !want) B.left(); }, 400);
/* keep the HUD and dock fresh when floors change */
['click'].forEach(ev => document.addEventListener(ev, e => { if (S.on && e.target.closest && e.target.closest('.flw')) setTimeout(() => { renderHud(); }, 30); }, true));

/* ---------------- the look ---------------- */
document.head.append(h('style', null, `
.bs-dock{position:absolute;left:12px;top:var(--bs-top,120px);bottom:46px;width:264px;z-index:24;display:flex;flex-direction:column;border-radius:16px;overflow:hidden;
  background:linear-gradient(180deg,rgba(19,21,27,.97),rgba(10,11,15,.98));border:1px solid var(--hair2);box-shadow:0 30px 70px -30px rgba(0,0,0,.95),inset 0 1px 0 rgba(255,255,255,.06);animation:bsDock .5s var(--spring) both;transition:width .35s var(--spring)}
.bs-dock:before{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--accent) 50%,transparent);opacity:.8;pointer-events:none}

@keyframes bsDock{from{opacity:0;transform:translateX(-18px) scale(.98)}to{opacity:1;transform:none}}
@keyframes bsScan{to{transform:translateY(260%)}}
.bs-dock.min{width:40px;cursor:pointer}
.bs-dv{writing-mode:vertical-rl;transform:rotate(180deg);margin:14px auto;font:600 10px "Chakra Petch",sans-serif;letter-spacing:.24em;text-transform:uppercase;color:var(--dim)}
.bs-dmin{position:relative;z-index:2;flex:none;width:28px;height:28px;margin-left:auto;border-radius:8px;border:1px solid var(--hair);background:rgba(255,255,255,.03);color:var(--dim);display:grid;place-items:center;cursor:pointer;transition:color .15s,border-color .15s,transform .3s var(--spring)}
.bs-dmin:hover{color:var(--ink);border-color:var(--hair2)}.bs-dock.min .bs-dmin{margin:8px auto 0;transform:rotate(180deg)}
.bs-dh{display:flex;align-items:flex-start;gap:8px;padding:13px 12px 9px 14px}
.bs-dock .eye,.bs-head .eye{font:600 9.5px "Chakra Petch",sans-serif;letter-spacing:.22em;text-transform:uppercase;color:var(--dim)}
.bs-dock .dt{font:600 15px "Chakra Petch",sans-serif;letter-spacing:.02em;color:var(--ink);margin-top:2px}
.bs-search{position:relative;display:block;margin:0 12px 8px}.bs-search span{position:absolute;left:10px;top:8px;color:var(--dim);pointer-events:none}
.bs-search input{width:100%;box-sizing:border-box;height:32px;border-radius:9px;border:1px solid var(--hair2);background:rgba(0,0,0,.28);color:var(--ink);padding:0 10px 0 31px;font:500 12.5px "Barlow",sans-serif;outline:none;transition:border-color .15s,box-shadow .2s}
.bs-search input:focus{border-color:color-mix(in srgb,var(--accent) 60%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}
.bs-chips{display:flex;gap:5px;overflow-x:auto;padding:0 12px 9px;scrollbar-width:none}.bs-chips::-webkit-scrollbar{display:none}
.bs-chip{flex:none;height:24px;padding:0 10px;border-radius:999px;border:1px solid var(--hair);background:transparent;color:var(--dim);font:600 11px "Barlow",sans-serif;cursor:pointer;transition:all .15s}
.bs-chip:hover{color:var(--ink)}.bs-chip.on{color:#fff;background:color-mix(in srgb,var(--accent) 24%,transparent);border-color:color-mix(in srgb,var(--accent) 60%,transparent)}
.bs-list{flex:1;min-height:0;overflow:auto;padding:2px 12px 16px;scrollbar-width:thin}
.bs-gl{display:flex;align-items:center;gap:8px;margin:12px 0 8px;font:600 9.5px "Chakra Petch",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--dim)}.bs-gl:first-child{margin-top:4px}
.bs-gl:after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--hair2),transparent)}
.bs-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.bs-col{display:flex;flex-direction:column;gap:8px}
.bs-card{position:relative;border-radius:12px;border:1px solid var(--hair);background:rgba(255,255,255,.025);cursor:pointer;overflow:hidden;outline:none;transition:transform .25s var(--spring),border-color .15s,box-shadow .3s,background .2s;animation:bsCard .45s var(--spring) both}
.bs-grid .bs-card:nth-child(2n){animation-delay:.03s}.bs-grid .bs-card:nth-child(n+3){animation-delay:.06s}.bs-grid .bs-card:nth-child(n+5){animation-delay:.09s}
@keyframes bsCard{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}
.bs-card .th{position:relative;height:80px;display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 95% at 50% 25%,#1d2330 0%,#0b0d13 72%)}
.bs-card .th:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:14px 14px;-webkit-mask-image:radial-gradient(ellipse at 50% 80%,#000 10%,transparent 72%);mask-image:radial-gradient(ellipse at 50% 80%,#000 10%,transparent 72%)}
.bs-card img{position:relative;max-width:96%;max-height:96%;opacity:0;transform:scale(.92);transition:opacity .35s,transform .45s var(--spring);filter:drop-shadow(0 8px 10px rgba(0,0,0,.55))}.bs-card img.bs-ok{opacity:1;transform:none}
.bs-card .bs-ico{position:relative;color:color-mix(in srgb,var(--accent) 80%,#fff);filter:drop-shadow(0 0 10px var(--glow))}
.bs-card b{display:block;padding:7px 9px 8px;font:600 11.5px "Barlow",sans-serif;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bs-card .bd{position:absolute;right:6px;top:6px;font:600 9.5px "Chakra Petch",sans-serif;letter-spacing:.05em;color:var(--ink);background:rgba(4,6,10,.72);border:1px solid var(--hair2);border-radius:6px;padding:1px 6px}
.bs-card:hover{transform:translateY(-2px);border-color:var(--hair2);background:rgba(255,255,255,.045);box-shadow:0 14px 26px -16px rgba(0,0,0,.95)}
.bs-card:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 70%,transparent)}
.bs-card.on{border-color:color-mix(in srgb,var(--accent) 75%,transparent);background:color-mix(in srgb,var(--accent) 9%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 45%,transparent),0 12px 28px -14px var(--glow)}
.bs-card.on:after{content:"";position:absolute;left:8px;top:8px;width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px var(--accent)}
.bs-gcard{display:flex;gap:10px;align-items:center;padding:7px;border-radius:12px;border:1px solid var(--hair);background:rgba(255,255,255,.025);cursor:pointer;transition:transform .25s var(--spring),border-color .15s,background .2s;animation:bsCard .45s var(--spring) both}
.bs-gcard canvas{width:96px;height:48px;border-radius:8px;flex:none;border:1px solid var(--hair)}.bs-gcard b{display:block;font:600 12.5px "Chakra Petch",sans-serif;color:var(--ink)}.bs-gcard small{display:block;font:500 11px/1.35 "Barlow",sans-serif;color:var(--dim);margin-top:2px}
.bs-gcard:hover{transform:translateX(2px);border-color:var(--hair2)}.bs-gcard.on{border-color:color-mix(in srgb,var(--accent) 70%,transparent);background:color-mix(in srgb,var(--accent) 9%,transparent)}
.bs-err{border-color:rgba(255,93,93,.4)!important;background:rgba(255,93,93,.06)!important}.bs-empty{font:500 12px/1.5 "Barlow",sans-serif;color:var(--dim);margin:4px 2px}
.bs-on .flw{left:292px!important;transition:left .35s var(--spring)}.bs-on.bs-libmin .flw{left:64px!important}
.bs-hud{position:absolute;left:50%;bottom:44px;transform:translateX(-50%);z-index:24;display:flex;align-items:center;gap:5px;padding:5px 7px 5px 5px;border-radius:999px;background:rgba(9,10,13,.94);border:1px solid var(--hair2);box-shadow:0 14px 34px -14px rgba(0,0,0,.9);font:600 11px "Barlow",sans-serif;color:var(--ink);white-space:nowrap;pointer-events:none;max-width:calc(100% - 320px);overflow:hidden;animation:bsHud .45s var(--spring) both}
@keyframes bsHud{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
.bs-hud span{padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.05)}.bs-hud .k{color:#fff;font:700 9.5px "Chakra Petch",sans-serif;letter-spacing:.18em;background:color-mix(in srgb,var(--accent) 28%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 55%,transparent)}
.bs-hud em{font-style:normal;font-weight:500;color:var(--dim);padding:0 6px}
.bs-lab{position:fixed;z-index:210;display:none;pointer-events:none;padding:5px 10px;border-radius:8px;background:rgba(9,10,13,.92);border:1px solid color-mix(in srgb,var(--accent) 55%,transparent);color:#fff;font:600 11.5px "Barlow",sans-serif;box-shadow:0 10px 24px -10px rgba(0,0,0,.9),0 0 18px -8px var(--glow)}
.bs-p{padding:2px 0 22px}.bs-p.fresh{animation:bsIn .45s var(--spring) both}.bs-p.fresh .bs-c{animation:bsIn .5s var(--spring) both}.bs-p.fresh .bs-c:nth-of-type(2){animation-delay:.04s}.bs-p.fresh .bs-c:nth-of-type(3){animation-delay:.08s}.bs-p.fresh .bs-c:nth-of-type(n+4){animation-delay:.12s}
@keyframes bsIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.bs-head{position:relative;margin:6px 12px 10px;padding:13px 14px 12px;border-radius:14px;overflow:hidden;border:1px solid var(--hair2);background:radial-gradient(130% 120% at 100% 0%,color-mix(in srgb,var(--accent) 24%,transparent) 0%,transparent 58%),linear-gradient(180deg,#15171d,#0d0f13)}
.bs-head:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:16px 16px;-webkit-mask-image:linear-gradient(200deg,#000,transparent 65%);mask-image:linear-gradient(200deg,#000,transparent 65%)}
.bs-head:after{content:"";position:absolute;left:-40%;top:0;bottom:0;width:30%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.07),transparent);transform:skewX(-20deg);animation:bsSheen 6s ease-in-out infinite;pointer-events:none}
@keyframes bsSheen{0%,70%{left:-40%}100%{left:130%}}
.bs-head .eye{display:flex;align-items:center;justify-content:space-between}
.bs-done{font:600 10.5px "Barlow",sans-serif;letter-spacing:.02em;text-transform:none;color:var(--ink);border:1px solid var(--hair2);background:rgba(0,0,0,.3);border-radius:7px;padding:3px 9px;cursor:pointer;position:relative;z-index:1}.bs-done:hover{border-color:color-mix(in srgb,var(--accent) 60%,transparent)}
.bs-head h2{position:relative;display:flex;align-items:center;gap:10px;margin:8px 0 2px;font:700 21px "Chakra Petch",sans-serif;letter-spacing:.02em;color:var(--ink)}
.bs-head h2 i{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;color:color-mix(in srgb,var(--accent) 85%,#fff);background:color-mix(in srgb,var(--accent) 18%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 45%,transparent),0 0 22px -6px var(--glow)}
.bs-head p{position:relative;margin:0 0 9px 42px;font:500 12px "Barlow",sans-serif;color:var(--dim)}
.bs-head .stats{position:relative;display:flex;flex-wrap:wrap;gap:4px 12px;padding-top:9px;border-top:1px solid var(--hair);font:500 11px "Barlow",sans-serif;color:var(--dim)}.bs-head .stats b{color:var(--ink);font:600 12px "Chakra Petch",sans-serif;margin-right:2px}
.bs-modes{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:2px;margin:0 12px 12px;padding:3px;border-radius:12px;background:rgba(0,0,0,.32);border:1px solid var(--hair)}
.bs-modes button{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 2px 7px;border:0;background:none;color:var(--dim);font:600 10.5px "Chakra Petch",sans-serif;letter-spacing:.06em;border-radius:9px;cursor:pointer;transition:color .2s}
.bs-modes button:hover{color:var(--ink)}.bs-modes button.on{color:#fff}.bs-modes button span{display:grid;transition:transform .35s var(--spring)}.bs-modes button.on span{transform:translateY(-1px) scale(1.06);color:color-mix(in srgb,var(--accent) 70%,#fff)}
.bs-modes .ind{position:absolute;z-index:0;left:3px;top:3px;bottom:3px;border-radius:9px;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 32%,#1a1c22),color-mix(in srgb,var(--accent) 12%,#111317));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 55%,transparent),0 8px 22px -10px var(--glow);transition:transform .42s var(--spring)}
.bs-c{margin:0 12px 10px;padding:12px;border-radius:13px;border:1px solid var(--hair);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.012))}
.bs-ct{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:0 0 10px;font:600 9.5px "Chakra Petch",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--dim)}.bs-ct small{font:500 11px "Barlow",sans-serif;letter-spacing:0;text-transform:none;color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bs-ct.sub{margin:12px 0 8px}
.bs-tools{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.bs-tools.three{grid-template-columns:repeat(3,1fr)}
.bs-tool{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 2px 6px;border-radius:10px;border:1px solid var(--hair);background:rgba(0,0,0,.2);color:var(--dim);font:600 10.5px "Barlow",sans-serif;cursor:pointer;transition:color .15s,border-color .15s,background .2s,transform .2s var(--spring)}
.bs-tool:hover{color:var(--ink);transform:translateY(-1px)}.bs-tool kbd{font:600 8.5px "Chakra Petch",sans-serif;opacity:.55;letter-spacing:.06em}
.bs-tool.on{color:#fff;border-color:color-mix(in srgb,var(--accent) 65%,transparent);background:color-mix(in srgb,var(--accent) 16%,transparent);box-shadow:inset 0 0 18px -8px var(--glow)}.bs-tool.on span{color:color-mix(in srgb,var(--accent) 70%,#fff)}
.bs-tip{margin:9px 0 0;font:500 11.5px/1.45 "Barlow",sans-serif;color:var(--dim)}
.bs-pick{display:flex;gap:10px;align-items:center}.bs-pick img{width:84px;height:63px;flex:none;border-radius:9px;border:1px solid var(--hair);background:radial-gradient(120% 95% at 50% 25%,#1d2330,#0b0d13 72%);opacity:0;transition:opacity .3s}.bs-pick img.bs-ok{opacity:1}.bs-pick.big img{width:104px;height:78px}
.bs-pick b{display:block;font:600 14px "Chakra Petch",sans-serif;color:var(--ink)}.bs-pick small{display:block;font:500 11px/1.4 "Barlow",sans-serif;color:var(--dim)}.bs-pick .bs-acts{margin-top:6px}
.bs-styles{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
.bs-sty{display:flex;flex-direction:column;gap:5px;padding:0 0 6px;border-radius:10px;border:1px solid var(--hair);background:rgba(0,0,0,.2);color:var(--dim);font:600 9.5px "Barlow",sans-serif;letter-spacing:-.01em;cursor:pointer;overflow:hidden;transition:all .2s var(--spring)}
.bs-sty i{display:block;height:30px;box-shadow:inset 0 -10px 16px -10px rgba(0,0,0,.6)}.bs-sty span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 3px}
.bs-sty:hover{color:var(--ink);transform:translateY(-1px)}.bs-sty.on{color:#fff;border-color:color-mix(in srgb,var(--accent) 70%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 40%,transparent),0 10px 22px -12px var(--glow)}
.bs-acts{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}.bs-acts .btn{flex:1 1 auto}
.bs-seg{display:flex;gap:2px;padding:2px;border-radius:9px;background:rgba(0,0,0,.3);border:1px solid var(--hair);min-width:0}
.bs-seg button{flex:1;min-width:0;height:26px;padding:0 6px;border:0;border-radius:7px;background:none;color:var(--dim);font:600 11.5px "Barlow",sans-serif;cursor:pointer;white-space:nowrap;transition:all .18s}
.bs-seg button:hover{color:var(--ink)}.bs-seg button.on{color:#fff;background:color-mix(in srgb,var(--accent) 24%,#1b1d22);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 50%,transparent)}
.bs-row{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:32px;font:500 12.5px "Barlow",sans-serif;color:var(--ink)}.bs-row.stack{flex-direction:column;align-items:stretch;gap:6px;padding:4px 0}.bs-row.stack>.bs-seg{max-width:none}.bs-row>span{color:var(--dim);flex:none}.bs-row>.bs-seg,.bs-row>.bs-rg{flex:1;max-width:188px}
.bs-sw{position:relative;flex:none;width:36px;height:21px;border-radius:999px;border:1px solid var(--hair2);background:rgba(0,0,0,.35);cursor:pointer;transition:background .2s,border-color .2s}.bs-sw i{position:absolute;left:2px;top:2px;width:15px;height:15px;border-radius:50%;background:#9aa0ab;transition:transform .3s var(--spring),background .2s}
.bs-sw.on{background:color-mix(in srgb,var(--accent) 70%,#000);border-color:transparent;box-shadow:0 0 14px -4px var(--glow)}.bs-sw.on i{transform:translateX(15px);background:#fff}
.bs-dots{display:flex;gap:3px}.bs-dots button{min-width:26px;height:24px;padding:0 6px;border-radius:7px;border:1px solid var(--hair);background:rgba(0,0,0,.25);color:var(--dim);font:600 10.5px "Barlow",sans-serif;cursor:pointer;transition:all .15s}
.bs-dots button:hover{color:var(--ink)}.bs-dots button.on{color:#fff;border-color:color-mix(in srgb,var(--accent) 65%,transparent);background:color-mix(in srgb,var(--accent) 22%,transparent)}
.bs-rg{display:flex;align-items:center;gap:8px}.bs-rg b{min-width:44px;text-align:right;font:600 11.5px "Chakra Petch",sans-serif;color:var(--ink)}
.bs-range{flex:1;min-width:0;-webkit-appearance:none;appearance:none;height:4px;border-radius:4px;background:linear-gradient(90deg,var(--accent) var(--p,50%),rgba(255,255,255,.1) var(--p,50%));outline:none;cursor:pointer}
.bs-range::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#fff;border:0;box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 45%,transparent),0 2px 6px rgba(0,0,0,.5)}.bs-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#fff;border:0}
.bs-floors{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px}.bs-floors button{display:flex;flex-direction:column;align-items:flex-start;padding:5px 9px;border-radius:9px;border:1px solid var(--hair);background:rgba(0,0,0,.2);color:var(--ink);cursor:pointer;min-width:52px}.bs-floors button b{font:600 12px "Chakra Petch",sans-serif}.bs-floors button small{font:500 10px "Barlow",sans-serif;color:var(--dim)}
.bs-floors button.on{border-color:color-mix(in srgb,var(--accent) 65%,transparent);background:color-mix(in srgb,var(--accent) 14%,transparent)}.bs-floors .add{min-width:0;align-items:center;justify-content:center;color:var(--dim)}
.bs-gens{display:flex;flex-wrap:wrap;gap:5px}.bs-gens button{flex:1 1 auto;height:28px;padding:0 10px;border-radius:8px;border:1px solid var(--hair);background:rgba(0,0,0,.22);color:var(--dim);font:600 11.5px "Chakra Petch",sans-serif;letter-spacing:.03em;cursor:pointer;transition:all .15s}
.bs-gens button.on{color:#fff;border-color:color-mix(in srgb,var(--accent) 65%,transparent);background:color-mix(in srgb,var(--accent) 18%,transparent)}
.bs-mapc{padding:8px}.bs-map{position:relative;border-radius:10px;overflow:hidden;border:1px solid var(--hair2);background:#06080b}.bs-map canvas{display:block;width:100%;height:auto}
.bs-map:after{content:"";position:absolute;left:0;right:0;top:0;height:40%;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--accent) 16%,transparent),transparent);transform:translateY(-100%);animation:bsScan 4.5s linear infinite;pointer-events:none}
.bs-map.scan canvas{animation:bsReveal .7s var(--ease) both}@keyframes bsReveal{from{clip-path:inset(0 0 100% 0);filter:brightness(1.6)}to{clip-path:inset(0);filter:none}}
.bs-mapl{position:absolute;left:8px;top:8px;display:flex;gap:6px;align-items:center;font:600 10px "Chakra Petch",sans-serif;letter-spacing:.12em;text-transform:uppercase}.bs-mapl b{color:#fff;background:color-mix(in srgb,var(--accent) 30%,rgba(0,0,0,.6));padding:2px 7px;border-radius:6px}.bs-mapl span{color:var(--dim);background:rgba(0,0,0,.55);padding:2px 7px;border-radius:6px}
.bs-mapi{margin:8px 4px 0;font:500 11.5px/1.4 "Barlow",sans-serif;color:var(--ink)}.bs-mapi .warn{color:#ff9b9b}
.bs-seed{display:flex;align-items:center;gap:6px;margin:8px 2px 0}.bs-seed>span{font:600 9.5px "Chakra Petch",sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--dim)}
.bs-in{flex:1;min-width:0;height:28px;border-radius:8px;border:1px solid var(--hair2);background:rgba(0,0,0,.3);color:var(--ink);padding:0 8px;font:600 12px "Chakra Petch",sans-serif}
.bs-legend{display:flex;flex-wrap:wrap;gap:4px 10px;margin:8px 2px 2px;font:500 10.5px "Barlow",sans-serif;color:var(--dim)}.bs-legend i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;vertical-align:1px}
.bs-big{width:100%;height:38px!important;margin-top:12px;font:600 13px "Chakra Petch",sans-serif!important;letter-spacing:.04em}.bs-wide{width:100%;margin-top:6px}
.bs-secr{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:center;margin-top:7px;padding:7px;border-radius:10px;border:1px solid var(--hair);background:rgba(0,0,0,.2);transition:border-color .15s,background .15s}
.bs-secr:hover{border-color:color-mix(in srgb,var(--accent) 45%,transparent);background:color-mix(in srgb,var(--accent) 6%,transparent)}.bs-secr.locked{opacity:.75}
.bs-secr>i{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:color-mix(in srgb,var(--accent) 80%,#fff);background:color-mix(in srgb,var(--accent) 14%,transparent)}
.bs-secr>div:nth-child(2){min-width:0}.bs-secr small{display:block;font:500 10.5px "Barlow",sans-serif;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bs-secr>div:last-child{grid-column:1/-1;display:flex;flex-wrap:wrap;justify-content:flex-start;gap:4px;padding-left:36px}
.bs-name{width:100%;box-sizing:border-box;border:0;background:transparent;color:var(--ink);font:600 12.5px "Barlow",sans-serif;padding:0;outline:none}.bs-name:focus{color:#fff}
.bs-ib{width:26px;height:26px;border-radius:7px;border:1px solid var(--hair);background:rgba(255,255,255,.03);color:var(--dim);display:grid;place-items:center;cursor:pointer;transition:all .15s}.bs-ib:hover{color:var(--ink);border-color:var(--hair2)}
.bs-ib.on{color:#fff;border-color:color-mix(in srgb,var(--accent) 60%,transparent);background:color-mix(in srgb,var(--accent) 20%,transparent)}.bs-ib.danger:hover{color:#ff7476;border-color:rgba(255,77,79,.45)}
.bs-rooms details.sec{margin:0 12px 10px!important;border-radius:13px!important;border:1px solid var(--hair)!important;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.012))!important;overflow:hidden}
.bs-rooms .tgrid{margin:0 12px 10px!important;padding:10px;border-radius:13px;border:1px solid var(--hair);background:rgba(0,0,0,.18)}.bs-rooms .tlabel{margin:0 14px 6px!important;font:600 9.5px "Chakra Petch",sans-serif!important;letter-spacing:.2em!important;text-transform:uppercase;color:var(--dim)!important}
.bs-rooms .help{margin:0 14px 10px!important;font-size:11.5px!important;color:var(--dim)!important}
:root[data-theme="light"] .bs-dock,:root[data-theme="light"] .bs-hud{background:rgba(250,250,252,.92)}:root[data-theme="light"] .bs-card .th,:root[data-theme="light"] .bs-pick img{background:radial-gradient(120% 95% at 50% 25%,#ffffff,#dfe3ea 72%)}
:root[data-theme="light"] .bs-head{background:radial-gradient(130% 120% at 100% 0%,color-mix(in srgb,var(--accent) 18%,transparent) 0%,transparent 58%),linear-gradient(180deg,#ffffff,#f0f2f5)}:root[data-theme="light"] .bs-modes button.on,:root[data-theme="light"] .bs-tool.on,:root[data-theme="light"] .bs-seg button.on{color:var(--ink)}
html.rm .bs-dock,html.rm .bs-card,html.rm .bs-gcard,html.rm .bs-hud,html.rm .bs-p.fresh,html.rm .bs-p.fresh .bs-c,html.rm .bs-head:after,html.rm .bs-map:after,html.rm .bs-map.scan canvas{animation:none!important}
`));

/* the shared control kit, so other tabs (the UI tab) look the same */
Ed.kit = { seg, sw, rowEl, card, ib, dots, range, stylePicker, h };
/* for the self-test and for scripts */
Object.assign(S, { setMode, setTool, place, fillRoom, joinCorners, restyle, generate, regen, detach, dropSec, makeBuilding, saveSection, stampAt, snapAt, dragList, removeIds, drawMap, mapRun, thumb: k => THC.get(k), render: renderAll, sections: () => store().sections });
})();
