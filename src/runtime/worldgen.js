/* VIRA WORLD GENERATOR: seeded layouts built from kit pieces, for the Generate mode of the Build tab.
   Dungeons (rooms, corridors, keys, locked doors, shortcuts), abandoned facilities, towns (roads, pavements and
   buildings), forests (paths, clearings, cabins) and caves, plus multi-floor buildings on their own.
   ENG.WORLDGEN.run(kind, cfg) returns { objs, map, info }. The same seed always gives the same layout.
   A generated area is a "section" (project.build.sections). Its objects carry o.sec, so one section can be rebuilt
   without touching anything else. Sections marked live are rebuilt with a new seed every time the game starts. */
(function () {
'use strict';
const ENG = window.ENG, G = ENG.Game.prototype, rng = ENG.rng;
const WG = ENG.WORLDGEN = { kinds: {} };
const KEYS = [['Red', '#e5383b'], ['Blue', '#3d8bff'], ['Green', '#2ecc71'], ['Gold', '#f0b43c']];
const DOOR = { scifi: 'slide sideways', industrial: 'slide sideways', medieval: 'swing', modern: 'swing', horror: 'swing' };
const LFX = { scifi: 'steady', medieval: 'fire', modern: 'steady', industrial: 'fluorescent', horror: 'dying bulb' };

/* ---------------- emitting objects ---------------- */
class Emit {
  constructor(c) { this.c = c; this.M = c.M; this.H = c.H; this.st = c.style; this.x0 = c.at[0]; this.y0 = c.at[1]; this.z0 = c.at[2]; this.out = []; this.marks = []; this.lights = 0; this.r = rng(((c.seed >>> 0) || 1) * 2654435761 % 4294967291 >>> 0); }
  cx(i) { return this.x0 + (i + .5) * this.M; } cz(j) { return this.z0 + (j + .5) * this.M; } ex(i) { return this.x0 + i * this.M; } ez(j) { return this.z0 + j * this.M; }
  push(o) { this.out.push(o); return o; }
  kit(piece, x, y, z, ry, extra) { return this.push(ENG.kitObject(piece, (extra && extra.style) || this.st, [x, y, z], ry || 0, this.M, this.H, extra)); }
  obj(type, x, y, z, props, s, ry, name) { const o = ENG.newObject(type); o.p = [x, y, z].map(v => Math.round(v * 1000) / 1000); if (s) o.s = s.slice(); if (props) Object.assign(o.props, props); if (ry) o.r[1] = ry; if (name) o.name = name; return this.push(o); }
  light(x, y, z, col, range, fx) { if (this.lights >= (this.c.maxLights || 18)) return null; this.lights++; return this.obj('light', x, y, z, { color: col || ENG.KIT_STYLES[this.st].light, intensity: 1.7, range: range || this.M * 2.6, fx: fx || LFX[this.st] || 'steady' }, null, 0, 'Light'); }
  mark(kind, i, j, extra) { this.marks.push(Object.assign({ kind, i, j }, extra || {})); }
}
WG.Emit = Emit;

/* ---------------- spaces: floors, walls, doorways, windows and corner posts from a grid of cells ---------------- */
/* grid[j*w+i] = space id (0 outside). doors: Map of edge key to door spec. Edge keys: 'h:i:j' is the line z=j between
   cells (i,j-1) and (i,j); 'v:i:j' is the line x=i between (i-1,j) and (i,j). */
WG.spaces = function (E, grid, w, d, y, opt) {
  opt = opt || {}; const M = E.M, H = opt.H || E.H, cell = (i, j) => (i < 0 || j < 0 || i >= w || j >= d) ? 0 : grid[j * w + i], walls = new Set(), skipFloor = opt.skipFloor || new Set();
  for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) { const c = cell(i, j); if (!c) continue; if (opt.floor !== false && !skipFloor.has(i + ',' + j)) E.kit('floor', E.cx(i), y, E.cz(j), 0); if (opt.ceiling) E.kit('ceiling', E.cx(i), y + H, E.cz(j), 0); }
  const edge = (key, a, b, x, z, ry) => {
    if (a === b) return; walls.add(key); const dr = opt.doors && opt.doors.get(key), outside = !a || !b;
    if (dr) { E.kit(dr.arch ? 'wall_arch' : 'wall_door', x, y, z, ry); if (dr.door) { const hole = ENG.kitDoorHole(M, H), D = E.obj('door', x, y, z, Object.assign({ motion: DOOR[E.st] || 'swing', opens: 'walk near', color: ENG.KIT_STYLES[E.st].m.frame.c, texture: E.st === 'medieval' || E.st === 'horror' ? 'wood' : 'metal' }, dr.props || {}), [hole.x1 - hole.x0, hole.y1, .12], ry, dr.name || 'Door'); if (dr.color) D.props.color = dr.color; } return; }
    E.kit(outside && opt.windows && opt.windows(key, E.r) ? (opt.glass && opt.glass(key) ? 'wall_glass' : 'wall_window') : 'wall', x, y, z, ry);
  };
  for (let j = 0; j <= d; j++) for (let i = 0; i < w; i++) edge('h:' + i + ':' + j, cell(i, j - 1), cell(i, j), E.cx(i), E.ez(j), 0);
  for (let i = 0; i <= w; i++) for (let j = 0; j < d; j++) edge('v:' + i + ':' + j, cell(i - 1, j), cell(i, j), E.ex(i), E.cz(j), 90);
  if (opt.posts !== false) for (let j = 0; j <= d; j++) for (let i = 0; i <= w; i++) { const l = walls.has('h:' + (i - 1) + ':' + j), r = walls.has('h:' + i + ':' + j), u = walls.has('v:' + i + ':' + (j - 1)), dn = walls.has('v:' + i + ':' + j), n = l + r + u + dn; if (n === 0 || (n === 2 && ((l && r) || (u && dn)))) continue; E.kit('post', E.ex(i), y, E.ez(j), 0, { s: [ENG.KIT_STYLES[E.st].T * 1.25, H + .02, ENG.KIT_STYLES[E.st].T * 1.25] }); }
  return walls;
};

/* ---------------- a multi-floor building ---------------- */
/* b: { i, j, w, d (cells), floors, roof: 'flat'|'gable'|'none', door: 'n'|'s'|'e'|'w', windows: 0..1, stairs } */
WG.building = function (E, b) {
  const M = E.M, H = E.H, n = Math.max(1, b.floors || 1), grid = new Array(b.w * b.d).fill(1), sub = Object.assign(Object.create(Object.getPrototypeOf(E)), E, { x0: E.x0 + b.i * M, z0: E.z0 + b.j * M });
  sub.out = E.out; sub.marks = E.marks; const stairCell = n > 1 && b.stairs !== false && b.w * b.d >= 2 ? [b.w - 1, b.d - 1] : null, wnd = b.windows == null ? .6 : b.windows;
  const doorKey = (() => { const s = b.door || 's', mi = Math.floor((b.w - 1) / 2), mj = Math.floor((b.d - 1) / 2); return s === 'n' ? 'h:' + mi + ':0' : s === 's' ? 'h:' + mi + ':' + b.d : s === 'w' ? 'v:0:' + mj : 'v:' + b.w + ':' + mj; })();
  for (let f = 0; f < n; f++) {
    const y = E.y0 + (b.y || 0) + f * H, doors = new Map(); if (f === 0) doors.set(doorKey, { door: b.doorObj !== false, name: 'Front door', props: { opens: 'walk near' } });
    const skip = new Set(); if (f > 0 && stairCell) skip.add(stairCell[0] + ',' + stairCell[1]);
    WG.spaces(sub, grid, b.w, b.d, y, { doors, skipFloor: skip, windows: (key, r) => r() < wnd, glass: () => f === 0 && b.shop });
    if (stairCell && f < n - 1) { const [si, sj] = stairCell; if (M >= 3) sub.kit('stairs_u', sub.cx(si), y, sub.cz(sj), 180); else sub.kit('stairs', sub.cx(si), y, sub.cz(sj), 180); }
    if (b.light !== false && (f === 0 || E.r() < .5)) E.light(sub.cx(Math.floor(b.w / 2)), y + H - .45, sub.cz(Math.floor(b.d / 2)), null, Math.max(b.w, b.d) * M * 1.2);
  }
  const top = E.y0 + (b.y || 0) + n * H;
  if (b.roof === 'gable') {
    const alongX = b.w >= b.d, D = alongX ? b.d : b.w, L = alongX ? b.w : b.d, p = .5, R = p * D * M / 2;
    for (let k = 0; k < L; k++) for (let i = 0; i < D; i++) { const cxw = alongX ? sub.cx(k) : sub.cx(i), czw = alongX ? sub.cz(i) : sub.cz(k), up = (i + 1) * 2 <= D, down = i * 2 >= D;
      if (up) sub.kit('roof_slope', cxw, top + i * p * M, czw, alongX ? 0 : 90, { s: [M, p * M, M] }); else if (down) sub.kit('roof_slope', cxw, top + (D - 1 - i) * p * M, czw, alongX ? 180 : 270, { s: [M, p * M, M] }); else sub.kit('roof_peak', cxw, top + i * p * M, czw, alongX ? 0 : 90, { s: [M, p * M / 2, M] }); }
    const T = ENG.KIT_STYLES[E.st].T; if (alongX) { sub.kit('roof_gable', sub.ex(0), top, sub.z0 + b.d * M / 2, 90, { s: [D * M, R, T] }); sub.kit('roof_gable', sub.ex(b.w), top, sub.z0 + b.d * M / 2, 90, { s: [D * M, R, T] }); }
    else { sub.kit('roof_gable', sub.x0 + b.w * M / 2, top, sub.ez(0), 0, { s: [D * M, R, T] }); sub.kit('roof_gable', sub.x0 + b.w * M / 2, top, sub.ez(b.d), 0, { s: [D * M, R, T] }); }
  } else if (b.roof !== 'none') {
    for (let j = 0; j < b.d; j++) for (let i = 0; i < b.w; i++) sub.kit('ceiling', sub.cx(i), top, sub.cz(j), 0);
    for (let i = 0; i < b.w; i++) { sub.kit('wall_low', sub.cx(i), top, sub.ez(0), 0, { s: [M, .8, .25] }); sub.kit('wall_low', sub.cx(i), top, sub.ez(b.d), 0, { s: [M, .8, .25] }); }
    for (let j = 0; j < b.d; j++) { sub.kit('wall_low', sub.ex(0), top, sub.cz(j), 90, { s: [M, .8, .25] }); sub.kit('wall_low', sub.ex(b.w), top, sub.cz(j), 90, { s: [M, .8, .25] }); }
  }
  return { top, doorKey };
};

/* ---------------- helpers ---------------- */
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
function astar(w, d, from, to, cost) {
  const N = w * d, g = new Float32Array(N).fill(1e9), prev = new Int32Array(N).fill(-1), open = [from], closed = new Uint8Array(N), h = k => Math.abs(k % w - to % w) + Math.abs((k / w | 0) - (to / w | 0));
  g[from] = 0; const f = new Float32Array(N).fill(1e9); f[from] = h(from);
  while (open.length) { let bi = 0; for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i; const k = open.splice(bi, 1)[0]; if (k === to) break; if (closed[k]) continue; closed[k] = 1; const x = k % w, y = k / w | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= d) continue; const n = ny * w + nx, c = n === to ? 1 : cost(n); if (c >= 1e8 || closed[n]) continue; const ng = g[k] + c + (prev[k] >= 0 && (prev[k] - k) !== (k - n) ? .35 : 0); if (ng < g[n]) { g[n] = ng; prev[n] = k; f[n] = ng + h(n); open.push(n); } } }
  if (prev[to] < 0 && from !== to) return null; const path = []; for (let k = to; k >= 0; k = prev[k]) { path.push(k); if (k === from) break; } return path.reverse();
}
function blockedCells(c, w, d) { const b = new Uint8Array(w * d); (c.avoid || []).forEach(([ax, az, bx, bz]) => { for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) { const x0 = c.at[0] + i * c.M, z0 = c.at[2] + j * c.M; if (x0 < bx - .05 && x0 + c.M > ax + .05 && z0 < bz - .05 && z0 + c.M > az + .05) b[j * w + i] = 1; } }); return b; }
function objective(E, i, j, text) { E.obj('trigger', E.cx(i), E.y0, E.cz(j), { when: 'level starts', action: 'set objective', text }, [2, 3, 2], 0, 'Objective'); }

/* ---------------- dungeons and facilities ---------------- */
function dungeon(c, facility) {
  const E = new Emit(c), r = E.r, w = c.w, d = c.d, R = c.rules, blocked = blockedCells(c, w, d), M = E.M, H = E.H, y = E.y0;
  const rooms = [], target = Math.max(4, Math.min(facility ? 16 : 13, Math.round(w * d / (facility ? 17 : 21))));
  for (let t = 0; t < 600 && rooms.length < target; t++) {
    const rw = 2 + Math.floor(r() * (facility ? 2 : 3)), rd = 2 + Math.floor(r() * (facility ? 2 : 3)), x = 1 + Math.floor(r() * Math.max(1, w - rw - 1)), z = 1 + Math.floor(r() * Math.max(1, d - rd - 1));
    if (x + rw > w - 1 || z + rd > d - 1) continue; if (rooms.some(o => x < o.x + o.w + 1 && x + rw + 1 > o.x && z < o.z + o.d + 1 && z + rd + 1 > o.z)) continue;
    let bad = false; for (let jj = z; jj < z + rd && !bad; jj++) for (let ii = x; ii < x + rw; ii++) if (blocked[jj * w + ii]) { bad = true; break; } if (bad) continue;
    rooms.push({ x, z, w: rw, d: rd, id: rooms.length + 1, cx: x + rw / 2, cz: z + rd / 2 });
  }
  if (rooms.length < 2) return { objs: [], map: { w, d, cells: new Uint8Array(w * d), marks: [] }, info: { error: 'There was not enough free space here. Make the area bigger or move it.' } };
  /* connect: a minimum spanning tree, then the critical path from start to exit */
  const dist = (a, b) => Math.abs(a.cx - b.cx) + Math.abs(a.cz - b.cz), inT = new Set([0]), edges = [];
  while (inT.size < rooms.length) { let best = null; inT.forEach(a => rooms.forEach((b, bi) => { if (inT.has(bi)) return; const dd = dist(rooms[a], b); if (!best || dd < best.d) best = { a, b: bi, d: dd }; })); inT.add(best.b); edges.push({ a: best.a, b: best.b }); }
  const adj = () => { const A = rooms.map(() => []); edges.forEach((e, k) => { A[e.a].push([e.b, k]); A[e.b].push([e.a, k]); }); return A; };
  const bfs = (s, A) => { const D = rooms.map(() => -1), P = rooms.map(() => -1), PE = rooms.map(() => -1); D[s] = 0; const q = [s]; while (q.length) { const u = q.shift(); A[u].forEach(([v, k]) => { if (D[v] < 0) { D[v] = D[u] + 1; P[v] = u; PE[v] = k; q.push(v); } }); } return { D, P, PE }; };
  let A = adj(), t0 = bfs(0, A), s = t0.D.indexOf(Math.max(...t0.D)), t1 = bfs(s, A), ex = t1.D.indexOf(Math.max(...t1.D));
  const path = [], pathE = []; for (let v = ex; v !== s; v = t1.P[v]) { path.unshift(v); pathE.unshift(t1.PE[v]); } path.unshift(s);
  /* locks along the critical path; each room's region is how many locks stand between it and the start */
  const nl = Math.max(0, Math.min(R.keys | 0, KEYS.length, path.length - 2)), locks = []; for (let k = 0; k < nl; k++) { const at = Math.max(1, Math.min(pathE.length - 1, Math.round((k + 1) * pathE.length / (nl + 1)))); if (!locks.includes(pathE[at])) locks.push(pathE[at]); }
  locks.forEach(k => { edges[k].lock = true; });
  const region = rooms.map(() => 0); { const q = [s], seen = new Set([s]); while (q.length) { const u = q.shift(); A[u].forEach(([v, k]) => { if (seen.has(v)) return; seen.add(v); region[v] = region[u] + (edges[k].lock ? 1 : 0); q.push(v); }); } }
  const lockOrder = locks.slice().sort((a, b) => Math.min(region[edges[a].a], region[edges[a].b]) - Math.min(region[edges[b].a], region[edges[b].b]));
  /* loops inside a region, and one real shortcut from the far end back towards the start (opened from the far side) */
  let shortcut = null; const sc = R.shortcuts | 0;
  if (sc > 0) { const cand = []; rooms.forEach((a, ai) => rooms.forEach((b, bi) => { if (bi <= ai || edges.some(e => (e.a === ai && e.b === bi) || (e.a === bi && e.b === ai))) return; cand.push({ a: ai, b: bi, d: dist(a, b) }); })); cand.sort((p, q) => p.d - q.d);
    let loops = nl > 0 ? sc - 1 : sc; for (const cd of cand) { if (loops <= 0) break; if (region[cd.a] !== region[cd.b] || cd.d > 9) continue; edges.push({ a: cd.a, b: cd.b, loop: true }); loops--; }
    if (nl > 0) { const far = rooms.map((_, i) => i).filter(i => region[i] === nl && i !== ex), near = rooms.map((_, i) => i).filter(i => region[i] === 0); let best = null; far.forEach(a => near.forEach(b => { const dd = dist(rooms[a], rooms[b]); if (!best || dd < best.d) best = { a, b, d: dd }; })); if (best && best.d < 14) { shortcut = { a: best.a, b: best.b, short: true }; edges.push(shortcut); } } }
  /* corridors: paths that never mix regions, so a locked door cannot be walked around */
  const grid = new Array(w * d).fill(0), creg = new Int16Array(w * d).fill(-1), doors = new Map(), rc = (ri, i, j) => grid[j * w + i] === rooms[ri].id;
  rooms.forEach(o => { for (let j = o.z; j < o.z + o.d; j++) for (let i = o.x; i < o.x + o.w; i++) grid[j * w + i] = o.id; });
  /* corridor cells carry their region in their space id, so corridors of different regions get a wall between them */
  const CORR = 100, cid = rg => CORR + rg + 3, ekey = (a, b) => { const ai = a % w, aj = a / w | 0, bi = b % w, bj = b / w | 0; return ai === bi ? 'h:' + ai + ':' + Math.max(aj, bj) : 'v:' + Math.max(ai, bi) + ':' + aj; };
  const entries = (ri, rg) => { const o = rooms[ri], out = []; for (let i = o.x; i < o.x + o.w; i++) { out.push([i, o.z - 1, i, o.z]); out.push([i, o.z + o.d, i, o.z + o.d - 1]); } for (let j = o.z; j < o.z + o.d; j++) { out.push([o.x - 1, j, o.x, j]); out.push([o.x + o.w, j, o.x + o.w - 1, j]); } return out.filter(([i, j]) => i >= 0 && j >= 0 && i < w && j < d && !blocked[j * w + i] && (!grid[j * w + i] || grid[j * w + i] === cid(rg))); };
  const routes = [];
  edges.forEach((e, k) => {
    const regC = e.short ? -2 : e.lock ? Math.min(region[e.a], region[e.b]) : region[e.a], ea = entries(e.a, regC), eb = entries(e.b, regC); if (!ea.length || !eb.length) return; let best = null;
    ea.forEach(p => eb.forEach(q => { const dd = Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]); if (!best || dd < best.d) best = { p, q, d: dd }; })); if (!best) return;
    const from = best.p[1] * w + best.p[0], to = best.q[1] * w + best.q[0];
    const pth = astar(w, d, from, to, n => blocked[n] ? 1e9 : !grid[n] ? 1 : grid[n] === cid(regC) ? .6 : 1e9); if (!pth) return;
    pth.forEach(n => { grid[n] = cid(regC); creg[n] = regC; }); const da = ekey(best.p[1] * w + best.p[0], best.p[3] * w + best.p[2]), db = ekey(best.q[1] * w + best.q[0], best.q[3] * w + best.q[2]);
    routes.push({ e, k, path: pth, da, db });
  });
  /* doors: locked doors at the entrance of the room beyond the lock, the shortcut door, plain doors elsewhere */
  const keyOf = {}; lockOrder.forEach((k, n) => { keyOf[k] = KEYS[n]; });
  routes.forEach(R2 => { const e = R2.e;
    if (e.lock) { const [nm, col] = keyOf[R2.k], hi = region[e.a] > region[e.b] ? e.a : e.b, dk = hi === e.a ? R2.da : R2.db, lo = hi === e.a ? R2.db : R2.da; doors.set(dk, { door: true, color: col, name: nm + ' door', props: { locked: true, key: nm + (facility ? ' keycard' : ' key'), opens: 'press E' } }); if (!doors.has(lo)) doors.set(lo, { door: false }); }
    else if (e.short) { const tag = 'shortcut' + (c.sec || '') ; doors.set(R2.db, { door: true, name: 'Shortcut door', props: { opens: 'remote only', tag } }); if (!doors.has(R2.da)) doors.set(R2.da, { door: false }); e.tag = tag; e.dk = R2.da; }
    else [R2.da, R2.db].forEach(dk => { if (!doors.has(dk)) doors.set(dk, { door: R.doors !== false && r() < (facility ? .7 : .45), arch: !facility && E.st === 'medieval' && r() < .35 }); }); });
  /* the relic seals the exit: every way into the exit room needs it */
  if (c.quest === 'relic' && ex !== s) routes.forEach(R2 => { const e = R2.e; if ((e.a === ex || e.b === ex) && !e.lock) doors.set(e.a === ex ? R2.da : R2.db, { door: true, color: '#c792ff', name: 'Sealed door', props: { locked: true, key: 'Ancient relic', opens: 'press E' } }); });
  WG.spaces(E, grid, w, d, y, { doors, ceiling: c.ceiling, windows: null });
  /* contents */
  const cellsOf = ri => { const o = rooms[ri], out = []; for (let j = o.z; j < o.z + o.d; j++) for (let i = o.x; i < o.x + o.w; i++) out.push([i, j]); return out; };
  const spot = (ri, pad) => { const o = rooms[ri], p = pad == null ? .7 : pad; return [E.ex(o.x) + p + r() * (o.w * M - 2 * p), E.ez(o.z) + p + r() * (o.d * M - 2 * p)]; };
  const S0 = rooms[s], EX = rooms[ex], deep = rooms.map((_, i) => t1.D[i]), maxD = Math.max(1, ...deep);
  if (c.start) { E.obj('player_start', E.ex(S0.x) + S0.w * M / 2, y, E.ez(S0.z) + S0.d * M / 2, null, null, 0, 'Player start'); }
  E.mark('start', S0.cx, S0.cz); E.mark('exit', EX.cx, EX.cz);
  /* the goal */
  let relicRoom = -1; if (c.quest === 'relic') { const cand = rooms.map((_, i) => i).filter(i => i !== ex && i !== s && region[i] === Math.max(...region)); relicRoom = cand.length ? cand.reduce((a, b) => deep[a] > deep[b] ? a : b) : (ex === s ? -1 : ex); }
  if (c.quest !== 'none') {
    const [x, z] = [E.ex(EX.x) + EX.w * M / 2, E.ez(EX.z) + EX.d * M / 2]; E.obj('trigger', x, y, z, { action: 'end level (win)', text: c.quest === 'relic' ? 'You escaped with the relic.' : 'You found the way out.' }, [M * .9, 3, M * .9], 0, 'Exit');
    E.obj('sign', x, y + Math.min(H - .6, 2.4), z, { text: 'EXIT', bg: '#164a2c' }, [2, .7, .05], 0, 'Exit sign'); E.light(x, y + H - .5, z, '#7dffb0', M * 2.2, 'steady');
    objective(E, Math.floor(S0.cx), Math.floor(S0.cz), c.quest === 'relic' ? 'Find the ancient relic, then reach the exit.' + (nl ? ' Locked doors need keys.' : '') : 'Find the way out.' + (nl ? ' Locked doors need keys.' : ''));
  }
  if (relicRoom >= 0) { const [x, z] = spot(relicRoom); E.obj('pickup', x, y, z, { kind: 'key', key: 'Ancient relic', keyColor: '#c792ff' }, null, 0, 'Ancient relic'); E.mark('relic', rooms[relicRoom].cx, rooms[relicRoom].cz); }
  /* keys: in a side room of the region before their lock when there is one */
  lockOrder.forEach((k, n) => { const [nm, col] = KEYS[n], e = edges[k], lo = Math.min(region[e.a], region[e.b]); let cand = rooms.map((_, i) => i).filter(i => region[i] === lo && !path.includes(i)); if (!cand.length) cand = rooms.map((_, i) => i).filter(i => region[i] === lo && i !== e.a && i !== e.b); if (!cand.length) cand = rooms.map((_, i) => i).filter(i => region[i] === lo);
    const ri = cand.reduce((a, b) => deep[a] > deep[b] ? a : b), [x, z] = spot(ri); E.obj('pickup', x, y, z, { kind: 'key', key: nm + (facility ? ' keycard' : ' key'), keyColor: col }, null, 0, nm + (facility ? ' keycard' : ' key')); E.mark('key', rooms[ri].cx, rooms[ri].cz, { color: col }); });
  if (shortcut && shortcut.dk) { const ri = shortcut.a, o = rooms[ri], [x, z] = spot(ri, 1); E.obj('switch', x, y, z, { activates: shortcut.tag, prompt: 'Open the shortcut' }, null, 0, 'Shortcut switch'); E.mark('shortcut', o.cx, o.cz); }
  /* enemies, loot, resources, lights and details */
  const en = R.enemies | 0, lt = R.loot | 0, rs = R.resources | 0; let nE = 0, nL = 0, nR = 0;
  rooms.forEach((o, i) => {
    const area = o.w * o.d, depth = deep[i] / maxD, cx = E.ex(o.x) + o.w * M / 2, cz = E.ez(o.z) + o.d * M / 2;
    E.light(cx, y + H - .45, cz, null, Math.max(o.w, o.d) * M * 1.3, E.st === 'horror' && r() < .5 ? 'dying bulb' : null);
    if (i !== s && en) { const n = Math.max(0, Math.round(en * (.35 + r() * .5) * area / 4)); for (let k = 0; k < n; k++) { const [x, z] = spot(i); E.obj('enemy', x, y, z, { ai: pick(r, ['patrol', 'guard', 'wander']), attack: r() < .55 ? 'ranged' : 'melee', health: Math.round(80 + depth * 90), radius: Math.max(o.w, o.d) * M / 2 }, null, Math.floor(r() * 4) * 90, 'Enemy'); E.mark('enemy', (x - E.x0) / M, (z - E.z0) / M); nE++; } }
    if (i === ex && en >= 2) { const [x, z] = spot(i); E.obj('enemy', x, y, z, { ai: 'guard', attack: 'ranged', health: 380, damage: 18, radius: M * 2 }, null, 0, 'Elite guard'); nE++; }
    if (lt && i !== s && r() < .25 + lt * .22) { const [x, z] = spot(i); const big = lt >= 2 && r() < .35; E.obj(big && ENG.PREFABS.chest ? 'chest' : 'pickup', x, y, z, big && ENG.PREFABS.chest ? { tier: lt >= 3 ? 'legendary' : 'rare', contents: pick(r, ['health', 'weapon', 'random']) } : { kind: pick(r, ['health', 'ammo', 'armor', 'ammo']) }, null, Math.floor(r() * 4) * 90, big ? 'Loot chest' : 'Supplies'); E.mark('loot', (x - E.x0) / M, (z - E.z0) / M); nL++; }
    if (rs) { const n = Math.floor(r() * (1 + rs * 1.5)); for (let k = 0; k < n; k++) { const [x, z] = spot(i, .9); E.obj(r() < .25 ? 'barrel' : 'crate', x, y, z, null, null, Math.floor(r() * 4) * 90); nR++; } if (r() < rs * .18) { const [x, z] = spot(i); E.obj('pickup', x, y, z, { kind: 'collectible' }, null, 0, 'Gem'); nR++; } }
    const det = { medieval: 'torch', horror: 'torch', scifi: 'screen', industrial: 'pipe', modern: null }[E.st]; if (det && r() < .7) { const along = o.w >= o.d, i2 = along ? o.x + Math.floor(o.w / 2) : o.x, j2 = along ? o.z : o.z + Math.floor(o.d / 2), T = ENG.KIT_STYLES[E.st].T;
      if (along) E.kit(det, E.cx(i2), y + ENG.KIT_PIECES[det].mountY, E.ez(j2) + T / 2 + .02, 0); else E.kit(det, E.ex(i2) + T / 2 + .02, y + ENG.KIT_PIECES[det].mountY, E.cz(j2), 90); }
  });
  { let cl = 0; for (let n = 0; n < w * d; n++) if (grid[n] >= CORR && ((n % w) + (n / w | 0)) % 5 === 0 && cl < 6) { E.light(E.cx(n % w), y + H - .45, E.cz(n / w | 0), null, M * 2, E.st === 'industrial' ? 'fluorescent' : null); cl++; } }
  /* the map */
  const cells = new Uint8Array(w * d); for (let n = 0; n < w * d; n++) cells[n] = grid[n] >= CORR ? 2 : grid[n] ? 1 : 0;
  const dl = []; doors.forEach((v, k) => { const [t, i, j] = k.split(':'); dl.push({ h: t === 'h', i: +i, j: +j, locked: !!(v.props && v.props.locked), color: v.color || null, shortcut: !!(v.props && v.props.opens === 'remote only'), door: !!v.door }); });
  return { objs: E.out, map: { w, d, cells, region: Int16Array.from(cells.map((v, n) => v === 1 ? region[rooms.findIndex(o => o.id === grid[n])] : v === 2 ? Math.max(0, creg[n]) : -1)), doors: dl, marks: E.marks, rooms: rooms.map(o => ({ x: o.x, z: o.z, w: o.w, d: o.d })) },
    info: { rooms: rooms.length, locks: nl, shortcut: !!shortcut, enemies: nE, loot: nL, resources: nR, pieces: E.out.filter(o => o.type === 'kit').length } };
}
WG.kinds.dungeon = { label: 'Dungeon', desc: 'Rooms and corridors with keys, locked doors and shortcuts', style: 'medieval', w: 16, d: 16, ceiling: true, run: c => dungeon(c, false) };
WG.kinds.facility = { label: 'Facility', desc: 'An abandoned base: tight rooms, keycards, sliding doors and broken lights', style: 'industrial', w: 16, d: 14, ceiling: true, run: c => dungeon(c, true) };

/* ---------------- towns ---------------- */
WG.kinds.town = { label: 'Town', desc: 'Streets, pavements, houses and shops on blocks, with lamps and a park', style: 'modern', w: 18, d: 18, ceiling: false, run(c) {
  const E = new Emit(c), r = E.r, w = c.w, d = c.d, M = E.M, H = E.H, y = E.y0, R = c.rules, road = new Uint8Array(w * d), cells = new Uint8Array(w * d), blocked = blockedCells(c, w, d);
  const lines = (n) => { const out = [0]; let p = 0; while (p < n - 1) { p += 4 + Math.floor(r() * 2); if (p < n) out.push(p); } return out; }, rx = lines(w), rz = lines(d);
  rx.forEach(i => { for (let j = 0; j < d; j++) road[j * w + i] = 1; }); rz.forEach(j => { for (let i = 0; i < w; i++) road[j * w + i] = road[j * w + i] ? 2 : 1; });
  for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) { const n = j * w + i; if (blocked[n]) continue; if (road[n]) { const cross = road[n] === 2 || (rx.includes(i) && rz.includes(j)); E.kit(cross ? 'road_cross' : 'road', E.cx(i), y, E.cz(j), cross ? 0 : rx.includes(i) ? 90 : 0); cells[n] = 3; } }
  /* blocks between the roads */
  const blocks = []; const xs = rx.concat([w]), zs = rz.concat([d]); for (let a = 0; a < xs.length - 1; a++) for (let b = 0; b < zs.length - 1; b++) { const i0 = xs[a] + 1, i1 = xs[a + 1], j0 = zs[b] + 1, j1 = zs[b + 1]; if (i1 - i0 >= 1 && j1 - j0 >= 1) blocks.push({ i0, i1, j0, j1 }); }
  let nE = 0, nL = 0, nB = 0, lamps = 0; const park = blocks.length > 2 ? Math.floor(r() * blocks.length) : -1;
  blocks.forEach((B, bi) => {
    const bw = B.i1 - B.i0, bd = B.j1 - B.j0, free = (i, j) => !blocked[j * w + i];
    const inner = bw >= 3 && bd >= 3 ? { i: B.i0 + 1, j: B.j0 + 1, w: bw - 2, d: bd - 2 } : null;
    for (let j = B.j0; j < B.j1; j++) for (let i = B.i0; i < B.i1; i++) { if (!free(i, j)) continue; const ring = !inner || i < inner.i || j < inner.j || i >= inner.i + inner.w || j >= inner.j + inner.d; if (ring) { E.kit('sidewalk', E.cx(i), y, E.cz(j), 0); cells[j * w + i] = 4; } else if (bi === park) { E.obj('floor', E.cx(i), y - .1, E.cz(j), { texture: 'grass', color: '#7c9a5a', tile: 3 }, [M, .2, M], 0, 'Lawn'); cells[j * w + i] = 5; } }
    [[B.i0, B.j0], [B.i1 - 1, B.j1 - 1]].forEach(([i, j]) => { if (lamps < 14 && free(i, j)) { E.kit('streetlamp', E.ex(i) + .6, y + .1, E.ez(j) + .6, 45); if (lamps % 2 === 0) E.light(E.ex(i) + .6, y + 4.3, E.ez(j) + .6, ENG.KIT_STYLES[E.st].light, M * 3, 'steady'); lamps++; } });
    if (!inner) return; let ok = true; for (let j = inner.j; j < inner.j + inner.d; j++) for (let i = inner.i; i < inner.i + inner.w; i++) if (!free(i, j)) ok = false; if (!ok) return;
    if (bi === park) { for (let k = 0; k < inner.w * inner.d * 2; k++) { const x = E.ex(inner.i) + .8 + r() * (inner.w * M - 1.6), z = E.ez(inner.j) + .8 + r() * (inner.d * M - 1.6); E.kit(r() < .7 ? 'tree_oak' : 'bush', x, y + .1, z, Math.floor(r() * 360), { props: { seed: 1 + Math.floor(r() * 8) } }); } E.kit('bench', E.cx(inner.i), y + .1, E.ez(inner.j) + .5, 0); E.mark('park', inner.i + inner.w / 2, inner.j + inner.d / 2); return; }
    /* one or two buildings */
    const split = inner.w >= 4 ? 'x' : inner.d >= 4 ? 'z' : null, lots = split === 'x' ? [{ i: inner.i, j: inner.j, w: Math.floor(inner.w / 2), d: inner.d }, { i: inner.i + Math.floor(inner.w / 2), j: inner.j, w: inner.w - Math.floor(inner.w / 2), d: inner.d }] : split === 'z' ? [{ i: inner.i, j: inner.j, w: inner.w, d: Math.floor(inner.d / 2) }, { i: inner.i, j: inner.j + Math.floor(inner.d / 2), w: inner.w, d: inner.d - Math.floor(inner.d / 2) }] : [inner];
    lots.forEach((L, li) => { const floors = 1 + Math.floor(r() * (c.floors || 3)), door = split === 'x' ? (li ? 'e' : 'w') : split === 'z' ? (li ? 's' : 'n') : pick(r, ['n', 's', 'e', 'w']);
      WG.building(E, { i: L.i, j: L.j, w: L.w, d: L.d, y: .1, floors, roof: E.st === 'medieval' || E.st === 'horror' || (floors === 1 && r() < .6) ? 'gable' : 'flat', door, windows: .65, shop: E.st === 'modern' && floors > 1 && r() < .5 }); nB++;
      for (let k = 0; k < L.w * L.d; k++) cells[(L.j + Math.floor(k / L.w)) * w + L.i + (k % L.w)] = 6;
      if ((R.loot | 0) && r() < .3 + R.loot * .2) { E.obj('pickup', E.cx(L.i), y + .1, E.cz(L.j), { kind: pick(r, ['health', 'ammo', 'armor']) }, null, 0, 'Supplies'); nL++; E.mark('loot', L.i + .5, L.j + .5); } });
  });
  /* people in the streets, crates and barrels in the gaps, a start on a crossing */
  const roadCells = []; for (let n = 0; n < w * d; n++) if (cells[n] === 3) roadCells.push(n);
  const en = R.enemies | 0; for (let k = 0; k < en * 3 && roadCells.length; k++) { const n = pick(r, roadCells), x = E.cx(n % w) + (r() - .5) * 2, z = E.cz(n / w | 0) + (r() - .5) * 2; E.obj('enemy', x, y, z, { ai: pick(r, ['patrol', 'wander', 'guard']), attack: r() < .6 ? 'ranged' : 'melee', radius: M * 3 }, null, Math.floor(r() * 4) * 90, 'Enemy'); E.mark('enemy', (x - E.x0) / M, (z - E.z0) / M); nE++; }
  for (let k = 0; k < (R.resources | 0) * 5 && roadCells.length; k++) { const n = pick(r, roadCells); E.obj(r() < .3 ? 'barrel' : 'crate', E.cx(n % w) + (r() < .5 ? -1 : 1) * M * .38, y, E.cz(n / w | 0) + (r() - .5) * M * .6); }
  const sc = roadCells.find(n => road[n] === 2) || roadCells[0]; if (sc != null) { if (c.start) E.obj('player_start', E.cx(sc % w), y, E.cz(sc / w | 0), null, null, 0, 'Player start'); E.mark('start', (sc % w) + .5, (sc / w | 0) + .5); }
  return { objs: E.out, map: { w, d, cells, marks: E.marks }, info: { buildings: nB, enemies: nE, loot: nL, pieces: E.out.filter(o => o.type === 'kit').length } };
} };

/* ---------------- forests ---------------- */
WG.kinds.forest = { label: 'Forest', desc: 'Trees, rocks and bushes around a winding path, with clearings and a cabin', style: 'medieval', w: 18, d: 18, ceiling: false, run(c) {
  const E = new Emit(c), r = E.r, w = c.w, d = c.d, M = E.M, y = E.y0, R = c.rules, cells = new Uint8Array(w * d), blocked = blockedCells(c, w, d), sty = E.st;
  const ground = E.obj('floor', E.x0 + w * M / 2, y - .2, E.z0 + d * M / 2, { texture: 'grass', color: sty === 'horror' ? '#5b5e46' : sty === 'scifi' ? '#6f9c8e' : '#7c9a5a', tile: 4 }, [w * M, .2, d * M], 0, 'Forest ground');
  /* a path that wanders from the south edge to the north edge */
  let i = Math.floor(w / 2 + (r() - .5) * w * .4); const path = []; for (let j = 0; j < d; j++) { path.push([i, j]); cells[j * w + i] = 2; if (j < d - 1 && r() < .5) { const ni = Math.max(1, Math.min(w - 2, i + (r() < .5 ? -1 : 1))); path.push([ni, j]); cells[j * w + ni] = 2; i = ni; } }
  path.forEach(([pi, pj]) => { if (!blocked[pj * w + pi]) E.obj('floor', E.cx(pi), y - .19, E.cz(pj), { texture: 'dirt', color: '#a48a68', tile: 3, collide: false }, [M, .2, M], 0, 'Path'); });
  /* clearings, one with a cabin */
  const clear = []; for (let k = 0; k < 2 + Math.floor(r() * 2); k++) { const ci = 2 + Math.floor(r() * (w - 4)), cj = 2 + Math.floor(r() * (d - 4)); clear.push([ci, cj, 1.6 + r()]); }
  const inClear = (x, z) => clear.some(([ci, cj, rad]) => Math.hypot(x - ci - .5, z - cj - .5) < rad);
  if (clear.length) { const [ci, cj] = clear[0]; let ok = true; for (let jj = cj; jj < cj + 2; jj++) for (let ii = ci; ii < ci + 2; ii++) if (ii >= w || jj >= d || blocked[jj * w + ii]) ok = false; if (ok) { WG.building(E, { i: ci, j: cj, w: 2, d: 1, floors: 1, roof: 'gable', door: 's', windows: .5 }); cells[cj * w + ci] = cells[cj * w + ci + 1] = 6; E.mark('cabin', ci + 1, cj + .5); } }
  clear.slice(1).forEach(([ci, cj]) => { const x = E.cx(ci), z = E.cz(cj); for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; E.kit('rock', x + Math.cos(a) * .9, y, z + Math.sin(a) * .9, k * 50, { s: [.45, .3, .4], props: { seed: k + 1 } }); } E.obj('emitter', x, y + .1, z, {}, null, 0, 'Campfire'); E.light(x, y + .8, z, '#ff9a4a', 9, 'fire'); E.mark('camp', ci + .5, cj + .5); });
  /* trees: a jittered grid, thinner near the path */
  const dens = [.12, .3, .45, .62][Math.max(0, Math.min(3, c.density == null ? 2 : c.density))]; let trees = 0;
  for (let z = 1; z < d * 2; z++) for (let x = 1; x < w * 2; x++) { const fx = (x + (r() - .5) * .9) / 2, fz = (z + (r() - .5) * .9) / 2, ci = Math.floor(fx), cj = Math.floor(fz); if (ci < 0 || cj < 0 || ci >= w || cj >= d) continue; const n = cj * w + ci; if (blocked[n] || cells[n] || inClear(fx, fz)) continue;
    const pr = r(); if (pr > dens) { if (pr > .985) { const k = 1 + Math.floor(r() * 4) * .35; E.kit('rock', E.x0 + fx * M, y, E.z0 + fz * M, Math.floor(r() * 360), { s: [1.4 * k, .9 * k, 1.2 * k], props: { seed: 1 + Math.floor(r() * 8) } }); } else if (pr > .955) E.kit('bush', E.x0 + fx * M, y, E.z0 + fz * M, Math.floor(r() * 360), { props: { seed: 1 + Math.floor(r() * 8) } }); continue; }
    const kind = sty === 'horror' ? (r() < .6 ? 'tree_dead' : 'tree_pine') : r() < .55 ? 'tree_pine' : 'tree_oak', k = .75 + Math.floor(r() * 5) * .15, base = ENG.kitSize(kind, M, E.H, sty); E.kit(kind, E.x0 + fx * M, y, E.z0 + fz * M, Math.floor(r() * 360), { s: base.map(v => v * k), props: { seed: 1 + Math.floor(r() * 8) } }); trees++; cells[n] = cells[n] || 1; }
  const en = R.enemies | 0; let nE = 0, nL = 0; for (let k = 0; k < en * 3; k++) { const [pi, pj] = pick(r, path.slice(2)); const x = E.cx(pi) + (r() - .5) * 3, z = E.cz(pj) + (r() - .5) * 3; E.obj('enemy', x, y, z, { ai: pick(r, ['wander', 'patrol', 'hunter']), attack: r() < .5 ? 'ranged' : 'melee', radius: M * 4 }, null, 0, 'Enemy'); E.mark('enemy', (x - E.x0) / M, (z - E.z0) / M); nE++; }
  for (let k = 0; k < (R.loot | 0) * 2; k++) { const [ci, cj] = clear.length ? pick(r, clear) : pick(r, path); const x = E.cx(ci) + (r() - .5) * 3, z = E.cz(cj) + (r() - .5) * 3; E.obj(R.loot >= 2 && ENG.PREFABS.chest && r() < .4 ? 'chest' : 'pickup', x, y, z, R.loot >= 2 && ENG.PREFABS.chest ? { tier: 'rare', contents: 'random' } : { kind: pick(r, ['health', 'ammo', 'armor']) }, null, 0, 'Supplies'); E.mark('loot', (x - E.x0) / M, (z - E.z0) / M); nL++; }
  for (let k = 0; k < (R.resources | 0) * 4; k++) { const x = E.x0 + r() * w * M, z = E.z0 + r() * d * M; E.obj('pickup', x, y, z, { kind: 'collectible' }, null, 0, 'Mushroom'); }
  const st = path[0], en2 = path[path.length - 1]; if (c.start) E.obj('player_start', E.cx(st[0]), y, E.cz(st[1]), null, null, 0, 'Player start'); E.mark('start', st[0] + .5, st[1] + .5);
  if (c.quest !== 'none') { E.obj('trigger', E.cx(en2[0]), y, E.cz(en2[1]), { action: 'end level (win)', text: 'You made it through the forest.' }, [M, 3, M], 0, 'Exit'); E.mark('exit', en2[0] + .5, en2[1] + .5); objective(E, st[0], st[1], 'Follow the path through the forest.'); }
  return { objs: E.out, map: { w, d, cells, marks: E.marks }, info: { trees, enemies: nE, loot: nL, pieces: E.out.filter(o => o.type === 'kit').length } };
} };

/* ---------------- caves ---------------- */
WG.kinds.caves = { label: 'Caves', desc: 'Winding caverns with stalagmites and glowing crystals', style: 'medieval', w: 16, d: 16, ceiling: true, run(c) {
  const E = new Emit(c), r = E.r, M = E.M, cs = M / 2, w = c.w * 2, d = c.d * 2, y = E.y0, H = E.H + .5, R = c.rules, blocked = blockedCells(Object.assign({}, c, { M: cs }), w, d);
  let g = new Uint8Array(w * d); for (let n = 0; n < w * d; n++) { const i = n % w, j = n / w | 0; g[n] = i === 0 || j === 0 || i === w - 1 || j === d - 1 || blocked[n] ? 1 : r() < .52 ? 1 : 0; }
  for (let it = 0; it < 4; it++) { const ng = new Uint8Array(w * d); for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) { let k = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const x = i + di, z = j + dj; k += x < 0 || z < 0 || x >= w || z >= d ? 1 : g[z * w + x]; } const n = j * w + i; ng[n] = i === 0 || j === 0 || i === w - 1 || j === d - 1 || blocked[n] ? 1 : k >= 5 ? 1 : 0; } g = ng; }
  /* keep the biggest open area */
  const lab = new Int32Array(w * d).fill(-1); let best = -1, bestN = 0, cur = 0; for (let n = 0; n < w * d; n++) { if (g[n] || lab[n] >= 0) continue; const q = [n]; lab[n] = cur; let cnt = 0; while (q.length) { const k = q.pop(); cnt++; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => { const x = k % w + dx, z = (k / w | 0) + dz; if (x < 0 || z < 0 || x >= w || z >= d) return; const m = z * w + x; if (!g[m] && lab[m] < 0) { lab[m] = cur; q.push(m); } }); } if (cnt > bestN) { bestN = cnt; best = cur; } cur++; }
  for (let n = 0; n < w * d; n++) if (!g[n] && lab[n] !== best) g[n] = 1;
  const X = i => E.x0 + (i + .5) * cs, Z = j => E.z0 + (j + .5) * cs, open = []; for (let n = 0; n < w * d; n++) if (!g[n]) open.push(n);
  if (!open.length) return { objs: [], map: { w: c.w, d: c.d, cells: new Uint8Array(c.w * c.d), marks: [] }, info: { error: 'No cave fitted here. Try another seed.' } };
  E.obj('floor', E.x0 + w * cs / 2, y - .3, E.z0 + d * cs / 2, { texture: 'rock', color: '#6f6a62', tile: 3 }, [w * cs, .3, d * cs], 0, 'Cave floor');
  if (c.ceiling) E.obj('block', E.x0 + w * cs / 2, y + H, E.z0 + d * cs / 2, { texture: 'rock', color: '#4e4a44', tile: 3 }, [w * cs, .6, d * cs], 0, 'Cave ceiling');
  for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) { const n = j * w + i; if (!g[n] || blocked[n]) continue; let edge = false; for (let dj = -1; dj <= 1 && !edge; dj++) for (let di = -1; di <= 1; di++) { const x = i + di, z = j + dj; if (x >= 0 && z >= 0 && x < w && z < d && !g[z * w + x]) { edge = true; break; } } if (edge) E.kit('cave_rock', X(i), y, Z(j), Math.floor(r() * 4) * 90, { s: [cs * 1.3, H + .3, cs * 1.3], props: { seed: 1 + Math.floor(r() * 10) } }); }
  /* start and exit at the two far ends */
  const far = s0 => { const D = new Int32Array(w * d).fill(-1), q = [s0]; D[s0] = 0; let last = s0; while (q.length) { const k = q.shift(); last = k; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => { const x = k % w + dx, z = (k / w | 0) + dz; if (x < 0 || z < 0 || x >= w || z >= d) return; const m = z * w + x; if (!g[m] && D[m] < 0) { D[m] = D[k] + 1; q.push(m); } }); } return { last, D }; };
  const a = far(open[0]).last, fb = far(a), b = fb.last, maxD = Math.max(1, fb.D[b]);
  if (c.start) E.obj('player_start', X(a % w), y, Z(a / w | 0), null, null, 0, 'Player start'); E.mark('start', (a % w) / 2 + .25, (a / w | 0) / 2 + .25);
  if (c.quest !== 'none') { E.obj('trigger', X(b % w), y, Z(b / w | 0), { action: 'end level (win)', text: 'Daylight at last.' }, [cs * 2, 3, cs * 2], 0, 'Exit'); E.light(X(b % w), y + 2.5, Z(b / w | 0), '#cfe8ff', 10, 'steady'); E.mark('exit', (b % w) / 2 + .25, (b / w | 0) / 2 + .25); objective(E, Math.floor((a % w) / 2), Math.floor((a / w | 0) / 2), 'Find the way out of the caves.'); }
  const crys = ENG.KIT_STYLES[E.st].m.crystal.c; let nE = 0, nL = 0;
  open.forEach(n => { const i = n % w, j = n / w | 0, p = r(); if (n === a || n === b) return; if (p < .035) { const k = .7 + Math.floor(r() * 4) * .3; E.kit('stalagmite', X(i) + (r() - .5), y, Z(j) + (r() - .5), Math.floor(r() * 360), { s: [.8 * k, 1.6 * k, .8 * k], props: { seed: 1 + Math.floor(r() * 6) } }); } else if (p < .06) { E.kit('crystal', X(i), y, Z(j), Math.floor(r() * 360), { props: { seed: 1 + Math.floor(r() * 8) } }); if (r() < .45) E.light(X(i), y + 1.2, Z(j), crys, 7, 'pulse'); } });
  const en = R.enemies | 0; for (let k = 0; k < en * 4; k++) { const n = pick(r, open); if (fb.D[n] < maxD * .2) continue; E.obj('enemy', X(n % w), y, Z(n / w | 0), { ai: pick(r, ['wander', 'guard', 'hunter']), attack: r() < .4 ? 'ranged' : 'melee', radius: 10 }, null, 0, 'Enemy'); E.mark('enemy', (n % w) / 2, (n / w | 0) / 2); nE++; }
  for (let k = 0; k < (R.loot | 0) * 3; k++) { const n = pick(r, open); E.obj('pickup', X(n % w), y, Z(n / w | 0), { kind: pick(r, ['health', 'ammo', 'armor']) }, null, 0, 'Supplies'); E.mark('loot', (n % w) / 2, (n / w | 0) / 2); nL++; }
  for (let k = 0; k < (R.resources | 0) * 5; k++) { const n = pick(r, open); E.obj('pickup', X(n % w), y, Z(n / w | 0), { kind: 'collectible' }, null, 0, 'Crystal shard'); }
  const cells = new Uint8Array(c.w * c.d); for (let j = 0; j < c.d; j++) for (let i = 0; i < c.w; i++) { let o = 0; for (let k = 0; k < 4; k++) o += g[(j * 2 + (k >> 1)) * w + i * 2 + (k & 1)] ? 0 : 1; cells[j * c.w + i] = o >= 2 ? 1 : 0; }
  return { objs: E.out, map: { w: c.w, d: c.d, cells, marks: E.marks, fine: { w, d, g } }, info: { enemies: nE, loot: nL, pieces: E.out.filter(o => o.type === 'kit').length } };
} };

/* ---------------- a building on its own ---------------- */
WG.kinds.building = { label: 'Building', desc: 'One building: floors with stairs, windows, a door and a roof', style: 'modern', w: 3, d: 2, ceiling: false, solo: true, run(c) {
  const E = new Emit(c), b = Object.assign({ i: 0, j: 0, w: c.w, d: c.d, floors: c.floors || 2, roof: c.roof || 'gable', door: c.door || 's', windows: c.windows == null ? .7 : c.windows, shop: !!c.shop }, c.b || {});
  WG.building(E, b); if (c.start) E.obj('player_start', E.cx(Math.floor(b.w / 2)), E.y0, E.cz(b.d) + E.M * .6, null, null, 180, 'Player start');
  const cells = new Uint8Array(c.w * c.d).fill(6); return { objs: E.out, map: { w: c.w, d: c.d, cells, marks: [] }, info: { floors: b.floors, pieces: E.out.filter(o => o.type === 'kit').length } };
} };

/* ---------------- running ---------------- */
WG.defaults = kind => { const K = WG.kinds[kind] || WG.kinds.dungeon; return { kind, seed: 1 + Math.floor(Math.random() * 99999), w: K.w, d: K.d, M: ENG.KIT.M, H: ENG.KIT.H, style: K.style, ceiling: K.ceiling, start: false, quest: 'exit', density: 2, floors: 3, rules: { enemies: 1, loot: 1, resources: 1, keys: kind === 'dungeon' || kind === 'facility' ? 2 : 0, shortcuts: 1 }, at: [0, 0, 0], avoid: [] }; };
WG.run = function (kind, cfg) {
  const K = WG.kinds[kind]; if (!K) throw new Error('Unknown generator: ' + kind); const c = Object.assign(WG.defaults(kind), cfg || {}); c.rules = Object.assign(WG.defaults(kind).rules, (cfg && cfg.rules) || {});
  const lo = K.solo ? 1 : 3; c.w = Math.max(lo, Math.min(48, c.w | 0)); c.d = Math.max(lo, Math.min(48, c.d | 0)); c.M = Math.max(2, +c.M || 4); c.H = Math.max(2.2, +c.H || 3); if (!ENG.KIT_STYLES[c.style]) c.style = K.style; c.seed = (c.seed >>> 0) || 1;
  const res = K.run(c); res.objs.forEach(o => { if (c.sec) o.sec = c.sec; }); res.cfg = c; return res;
};

/* ---------------- live sections: a new layout every time the game starts ---------------- */
{ const f = G.genLevel; G.genLevel = function (pr) {
  if (f) f.call(this, pr); const B = pr.build; if (!B || !Array.isArray(B.sections)) return;
  B.sections.forEach(s => { if (!s || !s.live || !WG.kinds[s.kind]) return; try { const res = WG.run(s.kind, Object.assign({}, s.cfg, { seed: Math.floor(Math.random() * 1e9), sec: s.id })); pr.objects = pr.objects.filter(o => o.sec !== s.id).concat(res.objs); } catch (e) { console.warn('Live section skipped', s.name, e); } });
}; }
})();
