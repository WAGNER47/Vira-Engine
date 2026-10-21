/* VIRA KITS: modular building pieces for the Build tab. Walls, doorways, windows, arches, posts, floors, ceilings,
   roofs, stairs, railings, details, nature, street and cave pieces, each drawn in one of five styles (sci-fi,
   medieval, modern, industrial, horror) with their own textures.
   A piece is one 'kit' object: props.piece picks the shape, props.style the look, o.s is its size in metres.
   Collision is automatic: every piece carries invisible boxes that match its solid parts (walls keep their doorways
   open, roofs and ramps are walkable slopes), and the visible parts are merged per material to keep draw calls low.
   In a running game, static pieces are batched again across the whole level (G.load below). */
(function () {
'use strict';
const ENG = window.ENG, G = ENG.Game.prototype, rng = ENG.rng;

/* ---------------- textures (tileable, light so the style colour tints them) ---------------- */
const TEX = { panel: 'Sci-fi panels', techfloor: 'Tech floor', stone: 'Stone blocks', plaster: 'Plaster', corrugated: 'Corrugated metal', wallpaper: 'Old wallpaper', planks: 'Floor planks', shingles: 'Roof shingles', asphalt: 'Asphalt', paving: 'Paving', dirt: 'Dirt' };
Object.assign(ENG.TEXTURES, TEX);
const cl = v => v < 0 ? 0 : v > 255 ? 255 : v;
function drawTex(kind) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), r = rng(kind.split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 11));
  const fill = col => { g.fillStyle = col; g.fillRect(0, 0, S, S); }, noise = amt => { const id = g.getImageData(0, 0, S, S), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (r() - .5) * amt; d[i] = cl(d[i] + n); d[i + 1] = cl(d[i + 1] + n); d[i + 2] = cl(d[i + 2] + n); } g.putImageData(id, 0, 0); };
  const wrap = (x, y, m, fn) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) if (x + dx > -m && x + dx < S + m && y + dy > -m && y + dy < S + m) fn(x + dx, y + dy); };
  const blob = (x, y, rx, ry, col) => wrap(x, y, Math.max(rx, ry), (X, Y) => { g.fillStyle = col; g.beginPath(); g.ellipse(X, Y, rx, ry, 0, 0, 7); g.fill(); });
  if (kind === 'panel') {
    fill('#7d848d'); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const X = x * 128, Y = y * 128; g.fillStyle = `hsl(210,7%,${78 + r() * 7}%)`; g.fillRect(X + 3, Y + 3, 122, 122);
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(X + 3, Y + 3, 122, 2); g.fillRect(X + 3, Y + 3, 2, 122); g.fillStyle = 'rgba(0,0,0,.26)'; g.fillRect(X + 3, Y + 123, 122, 2); g.fillRect(X + 123, Y + 3, 2, 122);
      if (r() < .7) { const a = 18 + Math.floor(r() * 14), b = 30 + Math.floor(r() * 40); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 2; g.strokeRect(X + a, Y + a, 128 - 2 * a, b); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.strokeRect(X + a + 1.5, Y + a + 1.5, 128 - 2 * a, b); }
      [[11, 11], [117, 11], [11, 117], [117, 117]].forEach(([a, b]) => { g.fillStyle = 'rgba(0,0,0,.38)'; g.beginPath(); g.arc(X + a, Y + b, 2.4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(X + a - .7, Y + b - .7, 1, 0, 7); g.fill(); }); }
    noise(9);
  } else if (kind === 'techfloor') {
    fill('#6e757d'); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const X = x * 64, Y = y * 64, k = 9; g.fillStyle = `hsl(210,6%,${70 + r() * 8}%)`; g.beginPath(); g.moveTo(X + k, Y + 2); g.lineTo(X + 62 - k, Y + 2); g.lineTo(X + 62, Y + k); g.lineTo(X + 62, Y + 62 - k); g.lineTo(X + 62 - k, Y + 62); g.lineTo(X + k, Y + 62); g.lineTo(X + 2, Y + 62 - k); g.lineTo(X + 2, Y + k); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1; g.stroke(); g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 5; i++) g.fillRect(X + 18, Y + 18 + i * 6, 28, 2); }
    noise(8);
  } else if (kind === 'stone') {
    fill('#8b857b'); let y = 0; [48, 40, 56, 48, 64].forEach(hh => { let x = -Math.floor(r() * 60); while (x < S) { const w = 46 + Math.floor(r() * 54), l = 62 + r() * 13; wrap(x, y, 128, (X, Y) => { g.fillStyle = `hsl(${32 + r() * 10},${6 + r() * 6}%,${l}%)`; g.fillRect(X + 3, Y + 3, w - 5, hh - 5); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(X + 3, Y + 3, w - 5, 3); g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(X + 3, Y + hh - 6, w - 5, 3); }); x += w; } y += hh; });
    for (let i = 0; i < 260; i++) blob(r() * S, r() * S, 1 + r() * 2.5, 1 + r() * 2.5, `rgba(0,0,0,${.05 + r() * .08})`); noise(20);
  } else if (kind === 'plaster') {
    fill('#e6e3dc'); for (let i = 0; i < 260; i++) blob(r() * S, r() * S, 2 + r() * 9, 2 + r() * 9, `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},.025)`); noise(9);
  } else if (kind === 'corrugated') {
    for (let x = 0; x < S; x++) { const v = .5 + .5 * Math.sin(x / S * Math.PI * 2 * 16); g.fillStyle = `hsl(210,4%,${58 + v * 26}%)`; g.fillRect(x, 0, 1, S); }
    for (let i = 0; i < 14; i++) { const x = r() * S; g.fillStyle = `rgba(110,70,40,${.04 + r() * .06})`; g.fillRect(x, r() * S, 2 + r() * 6, 40 + r() * 120); } noise(8);
  } else if (kind === 'wallpaper') {
    fill('#d8d0b8'); for (let x = 0; x < S; x += 32) { g.fillStyle = 'rgba(80,60,30,.09)'; g.fillRect(x, 0, 9, S); }
    for (let y = 0; y < S; y += 32) for (let x = 0; x < S; x += 32) { const X = x + 20, Y = y + ((x / 32) % 2) * 16; g.fillStyle = 'rgba(90,65,35,.16)'; g.beginPath(); g.moveTo(X, Y - 6); g.lineTo(X + 4, Y); g.lineTo(X, Y + 6); g.lineTo(X - 4, Y); g.closePath(); g.fill(); }
    for (let i = 0; i < 7; i++) { const x = r() * S, y = r() * S; blob(x, y, 14 + r() * 30, 20 + r() * 50, `rgba(70,52,26,${.07 + r() * .1})`); blob(x, y + 30, 3 + r() * 4, 30 + r() * 40, `rgba(60,44,20,${.06 + r() * .06})`); } noise(13);
  } else if (kind === 'planks') {
    fill('#3b2a1d'); for (let y = 0; y < S; y += 32) { const l = 52 + r() * 12; g.fillStyle = `hsl(${26 + r() * 6},${30 + r() * 10}%,${l}%)`; g.fillRect(0, y + 2, S, 30); for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(60,38,20,${.08 + r() * .1})`; g.fillRect(0, y + 4 + r() * 26, S, 1); }
      const j = r() * S; wrap(j, y, 4, (X) => { g.fillStyle = '#3b2a1d'; g.fillRect(X, y + 2, 2, 30); }); }
    noise(12);
  } else if (kind === 'shingles') {
    fill('#4b3c35'); for (let row = 0; row < 8; row++) { const y = row * 32, off = (row % 2) * 16; for (let x = -32; x < S + 32; x += 32) { g.fillStyle = `hsl(${12 + r() * 10},${22 + r() * 14}%,${44 + r() * 14}%)`; g.beginPath(); g.moveTo(x + off + 1, y); g.lineTo(x + off + 31, y); g.lineTo(x + off + 31, y + 22); g.quadraticCurveTo(x + off + 16, y + 34, x + off + 1, y + 22); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y, S, 3); }
    noise(14);
  } else if (kind === 'asphalt') {
    fill('#727373'); for (let i = 0; i < 2600; i++) { const v = 70 + r() * 80; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); } noise(26);
  } else if (kind === 'paving') {
    fill('#8d8984'); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = `hsl(32,${3 + r() * 4}%,${68 + r() * 9}%)`; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 2); } noise(14);
  } else if (kind === 'dirt') {
    fill('#a68c6a'); for (let i = 0; i < 160; i++) blob(r() * S, r() * S, 4 + r() * 16, 3 + r() * 12, `hsla(${30 + r() * 10},${25 + r() * 12}%,${42 + r() * 22}%,.6)`); noise(26);
  } else fill('#fff');
  return c;
}
const texCache = {}, baseTex = ENG.texture, baseThumb = ENG.textureThumb, baseCanvas = ENG.texCanvas, canv = {};
const kitCanvas = k => canv[k] || (canv[k] = drawTex(k));
ENG.texture = function (kind, project) { if (!TEX[kind]) return baseTex(kind, project); if (!texCache[kind]) { const t = new THREE.CanvasTexture(kitCanvas(kind)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; texCache[kind] = t; } return texCache[kind]; };
ENG.textureThumb = k => TEX[k] ? kitCanvas(k).toDataURL() : baseThumb(k);
if (baseCanvas) ENG.texCanvas = k => TEX[k] ? kitCanvas(k) : baseCanvas(k);

/* ---------------- styles ---------------- */
/* m: materials by role (c colour, tex, tile in metres, rough, metal, glow, op opacity). wall: decoration of wall pieces. */
const COMMON = { bark: { c: '#5b4130', tex: 'wood', tile: 1, rough: .95 }, rock: { c: '#8f8c86', tex: 'rock', tile: 2, rough: .95 }, asphalt: { c: '#5f6164', tex: 'asphalt', tile: 4, rough: .95 }, paint: { c: '#ece8dc', rough: .7 },
  paving: { c: '#b8b2a8', tex: 'paving', tile: 2, rough: .9 }, dirt: { c: '#9a8064', tex: 'dirt', tile: 3, rough: 1 }, flame: { c: '#ffb057', glow: 2.6 }, cloth: { c: '#8e1f24', rough: .95 }, hazard: { c: '#f2c230', tex: 'hazard', tile: 1, rough: .6 }, stain: { c: '#2a2016', op: .3, rough: 1 } };
const STY = ENG.KIT_STYLES = {
  scifi: { label: 'Sci-fi', tag: 'Clean panels, light strips', T: .3, win: [2, 1], stairs: 'metal', rail: 'glass', column: 'hex', lamp: 'slim', light: '#bfeaff', swatch: ['#d9e1ea', '#3fd0ff', '#2a3038'],
    wall: { base: .16, cap: .1, strip: [1.1, .045], glowFrame: true },
    m: { wall: { c: '#d9e1ea', tex: 'panel', tile: 2, rough: .42, metal: .25 }, base: { c: '#2a3038', tex: 'metal', tile: 1, rough: .32, metal: .75 }, trim: { c: '#3b434d', tex: 'metal', tile: 1, rough: .3, metal: .75 }, glow: { c: '#3fd0ff', glow: 1.1 },
      floor: { c: '#8a939e', tex: 'techfloor', tile: 2, rough: .35, metal: .5 }, ceil: { c: '#e1e7ee', tex: 'panel', tile: 2, rough: .5, metal: .15 }, roof: { c: '#59616b', tex: 'metal', tile: 2, rough: .45, metal: .55 }, frame: { c: '#232830', tex: 'metal', tile: 1, rough: .28, metal: .8 },
      glass: { c: '#9fe6ff', op: .26, rough: .05, metal: .3 }, post: { c: '#2f363f', tex: 'metal', tile: 1, rough: .3, metal: .8 }, leaf: { c: '#3fae94', rough: .8 }, crystal: { c: '#3fd0ff', glow: 1.8, op: .9 }, screen: { c: '#3fd0ff', glow: 1.4 } } },
  medieval: { label: 'Medieval', tag: 'Stone, timber and slate', T: .45, win: [3, 3], stairs: 'wood', rail: 'wood', column: 'round', lamp: 'lantern', light: '#ffb76b', swatch: ['#cfc4b0', '#6a4529', '#8a4532'],
    wall: { base: .4, cap: .22, beams: true, quoins: true },
    m: { wall: { c: '#cfc4b0', tex: 'stone', tile: 2.5, rough: .95 }, base: { c: '#9a907e', tex: 'stone', tile: 2, rough: .95 }, trim: { c: '#6a4529', tex: 'wood', tile: 1, rough: .8 }, glow: { c: '#ffb057', glow: 1 },
      floor: { c: '#9a6f48', tex: 'planks', tile: 2, rough: .85 }, ceil: { c: '#7a5233', tex: 'wood', tile: 1.2, rough: .85 }, roof: { c: '#8a4532', tex: 'shingles', tile: 1.5, rough: .9 }, frame: { c: '#5a3a22', tex: 'wood', tile: 1, rough: .8 },
      glass: { c: '#d8e8ff', op: .42, rough: .2 }, post: { c: '#b8ad98', tex: 'stone', tile: 1.5, rough: .95 }, leaf: { c: '#4f7a3a', rough: .9 }, crystal: { c: '#ffcf6b', glow: 1.4, op: .9 }, screen: { c: '#ffb057', glow: 1 } } },
  modern: { label: 'Modern', tag: 'Plaster, oak and glass', T: .25, win: [1, 1], stairs: 'concrete', rail: 'glass', column: 'square', lamp: 'standard', light: '#fff4e6', swatch: ['#eeece8', '#c8a27a', '#26292e'],
    wall: { base: .1, cap: 0 },
    m: { wall: { c: '#eeece8', tex: 'plaster', tile: 3, rough: .9 }, base: { c: '#2a2d31', rough: .5 }, trim: { c: '#d9d6d0', tex: 'plaster', tile: 2, rough: .85 }, glow: { c: '#ffffff', glow: .9 },
      floor: { c: '#c8a27a', tex: 'planks', tile: 2, rough: .6 }, ceil: { c: '#f6f6f4', tex: 'plaster', tile: 3, rough: .95 }, roof: { c: '#3d424a', tex: 'concrete', tile: 3, rough: .8 }, frame: { c: '#26292e', tex: 'metal', tile: 1, rough: .35, metal: .7 },
      glass: { c: '#bfe7ff', op: .2, rough: .02, metal: .3 }, post: { c: '#e4e2dd', tex: 'plaster', tile: 2, rough: .9 }, leaf: { c: '#5b8f45', rough: .85 }, crystal: { c: '#bfe7ff', glow: 1.2, op: .9 }, screen: { c: '#e8f4ff', glow: 1.1 } } },
  industrial: { label: 'Industrial', tag: 'Concrete, steel, hazard paint', T: .35, win: [3, 2], stairs: 'metal', rail: 'pipe', column: 'ibeam', lamp: 'standard', light: '#ffd9a0', swatch: ['#a3acb4', '#f2c230', '#565c63'],
    wall: { base: 1, cap: .14, ribs: 2, hazard: .14 },
    m: { wall: { c: '#a3acb4', tex: 'corrugated', tile: 1.5, rough: .55, metal: .45 }, base: { c: '#9b9a94', tex: 'concrete', tile: 3, rough: .95 }, trim: { c: '#4a4f56', tex: 'metal', tile: 1, rough: .4, metal: .7 }, glow: { c: '#ffb000', glow: 1 },
      floor: { c: '#8a8c8d', tex: 'concrete', tile: 3, rough: .9 }, ceil: { c: '#6d7278', tex: 'grate', tile: 1, rough: .6, metal: .5 }, roof: { c: '#7b838b', tex: 'corrugated', tile: 1.5, rough: .6, metal: .4 }, frame: { c: '#3c4046', tex: 'metal', tile: 1, rough: .4, metal: .7 },
      glass: { c: '#cfdde2', op: .38, rough: .15 }, post: { c: '#565c63', tex: 'metal', tile: 1, rough: .4, metal: .7 }, leaf: { c: '#6b7d48', rough: .9 }, crystal: { c: '#ffb000', glow: 1.4, op: .9 }, screen: { c: '#9dffb0', glow: 1.1 } } },
  horror: { label: 'Horror', tag: 'Rot, stains and boarded windows', T: .3, win: [2, 2], stairs: 'wood', rail: 'broken', column: 'round', lamp: 'lantern', light: '#ffcf8a', flicker: true, swatch: ['#9a9474', '#4a3428', '#c42323'],
    wall: { base: .95, cap: .1, stains: true, boarded: true },
    m: { wall: { c: '#9a9474', tex: 'wallpaper', tile: 2, rough: .97 }, base: { c: '#4a3428', tex: 'wood', tile: 1, rough: .9 }, trim: { c: '#33251c', tex: 'wood', tile: 1, rough: .9 }, glow: { c: '#c42323', glow: 1 },
      floor: { c: '#6a523e', tex: 'planks', tile: 2, rough: .95 }, ceil: { c: '#8a846f', tex: 'plaster', tile: 3, rough: .97 }, roof: { c: '#47423c', tex: 'shingles', tile: 1.5, rough: .95 }, frame: { c: '#2c211a', tex: 'wood', tile: 1, rough: .9 },
      glass: { c: '#9fb0a4', op: .5, rough: .4 }, post: { c: '#3b2b21', tex: 'wood', tile: 1, rough: .9 }, leaf: { c: '#4a4a36', rough: .95 }, crystal: { c: '#c42323', glow: 1.4, op: .9 }, screen: { c: '#7dff9a', glow: .9 } } } };
Object.values(STY).forEach(S => { S.m = Object.assign({}, COMMON, S.m); });
ENG.KIT = { M: 4, H: 3, styles: Object.keys(STY) };

/* ---------------- the piece builder ---------------- */
const INV = new THREE.MeshBasicMaterial({ visible: false }), FLAT = { leaf: 1, rock: 1, crystal: 1, flame: 1 };
function uvs(g, tile) { g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv || new THREE.BufferAttribute(new Float32Array(p.count * 2), 2); for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); uv.setXY(i, (ax > .5 ? p.getZ(i) : p.getX(i)) / tile, (ay > .5 ? p.getZ(i) : p.getY(i)) / tile); } g.setAttribute('uv', uv); uv.needsUpdate = true; return g; }
function merge(list) {
  const L = list.map(g => g.index ? g.toNonIndexed() : g); let n = 0; L.forEach(g => { if (!g.attributes.normal) g.computeVertexNormals(); n += g.attributes.position.count; });
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0; L.forEach(g => { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; });
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.BufferAttribute(U, 2)); out.computeBoundingSphere(); out.computeBoundingBox(); return out;
}
class Kit {
  constructor(o, c) { this.o = o; this.P = o.props || {}; this.S = STY[this.P.style] || STY.modern; this.pj = c && c.project; this.g = {}; this.cols = []; this.extra = []; this.r = rng(((+this.P.seed || 1) * 7919 + 13) >>> 0); }
  m(k) { return this.S.m[k] || this.S.m.wall; }
  add(k, geo) { (this.g[k] = this.g[k] || []).push(geo); return geo; }
  /* a box: by default its texture lines up with its neighbours; rotated boxes are textured in their own frame */
  box(k, w, h, d, x, y, z, rot) {
    if (!(w > 1e-4 && h > 1e-4 && d > 1e-4)) return null; const g = new THREE.BoxGeometry(w, h, d), t = this.m(k).tile || 2;
    if (rot) { uvs(g, t); if (rot.x) g.rotateX(rot.x); if (rot.y) g.rotateY(rot.y); if (rot.z) g.rotateZ(rot.z); g.translate(x, y, z); } else { g.translate(x, y, z); uvs(g, t); }
    return this.add(k, g);
  }
  geo(k, g, planar) { if (planar) uvs(g, this.m(k).tile || 2); return this.add(k, g); }
  col(w, h, d, x, y, z, f) { this.cols.push({ w, h, d, x, y, z, f: f || {} }); }
  mat(k) { const d = this.m(k), mt = ENG.partMaterial({ color: (k === 'wall' && this.P.color) ? this.P.color : d.c, tex: d.tex || 'none', tile: d.tile || 2, rough: d.rough == null ? .8 : d.rough, metal: d.metal || 0, glow: d.glow || 0, opacity: d.op == null ? 1 : d.op }, 'box', this.pj); if (d.op < 1) mt.depthWrite = false; if (FLAT[k]) mt.flatShading = true; return mt; }
  done(cached) {
    const G = new THREE.Group(), parts = cached || {}; if (!cached) for (const k in this.g) parts[k] = merge(this.g[k]);
    for (const k in parts) { const m = new THREE.Mesh(parts[k], this.mat(k)); m.castShadow = !(k === 'glass' || k === 'glow' || k === 'stain' || k === 'paint'); m.receiveShadow = true; m.userData.kitMat = (this.P.style || 'modern') + ':' + k; if (k === 'glass' || k === 'stain') m.renderOrder = 2; G.add(m); }
    this.extra.forEach(x => G.add(x));
    if (this.P.collide !== false) this.cols.forEach(c => { const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(c.w, .02), Math.max(c.h, .02), Math.max(c.d, .02)), INV); m.position.set(c.x, c.y, c.z); if (c.f.rx) m.rotation.x = c.f.rx; m.userData.kitCol = true; m.userData.walk = c.f.walk !== false; if (c.f.solid !== false) m.userData.solid = true; if (c.f.glass) m.userData.glass = true; m.castShadow = false; G.add(m); });
    return { G, parts };
  }
}

/* ---------------- walls ---------------- */
function wallBody(K, L, H, T, hole) {
  const W = K.S.wall, X0 = -L / 2, X1 = L / 2, segs = [];
  if (!hole) segs.push([X0, X1, 0, H]); else { if (hole.x0 > X0 + 1e-3) segs.push([X0, hole.x0, 0, H]); if (hole.x1 < X1 - 1e-3) segs.push([hole.x1, X1, 0, H]); if (hole.y0 > 1e-3) segs.push([hole.x0, hole.x1, 0, hole.y0]); if (hole.y1 < H - 1e-3) segs.push([hole.x0, hole.x1, hole.y1, H]); }
  segs.forEach(([a, b, c, d]) => { if (!(hole && hole.kind === 'arch' && c >= hole.y1 - 1e-3)) K.box('wall', b - a, d - c, T, (a + b) / 2, (c + d) / 2, 0); K.col(b - a, d - c, T, (a + b) / 2, (c + d) / 2, 0); });
  const bottom = segs.filter(s => s[2] < 1e-3), top = segs.filter(s => s[3] > H - 1e-3), full = segs.filter(s => s[2] < 1e-3 && s[3] > H - 1e-3);
  if (W.base) bottom.forEach(([a, b, , d]) => { const bh = Math.min(W.base, d); K.box('base', b - a, bh, T + (W.base > .5 ? .05 : .035), (a + b) / 2, bh / 2, 0); });
  if (W.hazard) bottom.forEach(([a, b, , d]) => { const hh = Math.min(W.hazard, d); K.box('hazard', b - a, hh, T + .075, (a + b) / 2, hh / 2, 0); });
  if (W.cap) top.forEach(([a, b, c]) => { const ch = Math.min(W.cap, H - c); K.box('trim', b - a, ch, T + .06, (a + b) / 2, H - ch / 2, 0); });
  if (W.strip) segs.forEach(([a, b, c, d]) => { const [y, sh] = W.strip; if (c <= y && d >= y + sh && b - a > .2) K.box('glow', b - a - .04, sh, T + .03, (a + b) / 2, y + sh / 2, 0); });
  if (W.ribs) for (let x = X0 + W.ribs; x < X1 - .3; x += W.ribs) { if (hole && x > hole.x0 - .25 && x < hole.x1 + .25) continue; K.box('trim', .14, H, T + .1, x, H / 2, 0); }
  if (W.beams) full.forEach(([a, b]) => { const y = H * .58, w = b - a; if (w < .5) return; K.box('trim', w, .16, T + .06, (a + b) / 2, y, 0); if (w > 1.1) { const y0 = y + .08, y1 = H - (W.cap || 0), dx = w - .3, dy = y1 - y0, len = Math.hypot(dx, dy), s = K.r() < .5 ? 1 : -1; K.box('trim', len, .13, T + .05, (a + b) / 2, (y0 + y1) / 2, 0, { z: s * Math.atan2(dy, dx) }); } });
  if (W.stains) [1, -1].forEach(side => { const n = 2 + Math.floor(K.r() * 3); for (let i = 0; i < n; i++) { const w = .3 + K.r() * 1.2, hh = .25 + K.r() * 1.1, x = X0 + w / 2 + K.r() * Math.max(0, L - w), y = Math.max((W.base || 0) + hh / 2 + .02, Math.min(H - hh / 2 - .15, (W.base || 0) + .2 + K.r() * (H - (W.base || 0)))); if (hole && x + w / 2 > hole.x0 && x - w / 2 < hole.x1 && y + hh / 2 > hole.y0 && y - hh / 2 < hole.y1) continue; K.box('stain', w, hh, .004, x, y, side * (T / 2 + .004)); } });
  return segs;
}
function frameOf(K, hole, T, H, opts) {
  const fw = K.S.label === 'Medieval' ? .15 : .09, fd = T + .07, { x0, x1, y0, y1 } = hole, mid = (x0 + x1) / 2;
  K.box('frame', fw, y1 - y0, fd, x0 - fw / 2, (y0 + y1) / 2, 0); K.box('frame', fw, y1 - y0, fd, x1 + fw / 2, (y0 + y1) / 2, 0);
  if (y1 + fw <= H + 1e-3) K.box('frame', x1 - x0 + 2 * fw, fw, fd, mid, y1 + fw / 2, 0);
  if (y0 > 0) K.box('frame', x1 - x0 + 2 * fw + .06, fw * .9, fd + .08, mid, y0 - fw * .45, 0);
  if (K.S.wall.glowFrame) K.box('glow', x1 - x0, .03, fd + .012, mid, y1 - .015, 0);
  if (opts && opts.glass) { const gw = x1 - x0, gh = y1 - y0; K.box('glass', gw, gh, .03, mid, (y0 + y1) / 2, 0); K.col(gw, gh, Math.max(.06, T * .5), mid, (y0 + y1) / 2, 0, { glass: true });
    const [nc, nr] = opts.grid || K.S.win; for (let i = 1; i < nc; i++) K.box('frame', .045, gh, .07, x0 + gw * i / nc, (y0 + y1) / 2, 0); for (let j = 1; j < nr; j++) K.box('frame', gw, .045, .07, mid, y0 + gh * j / nr, 0);
    if (K.S.wall.boarded) { const n = 2 + Math.floor(K.r() * 2); for (let i = 0; i < n; i++) K.box('trim', gw + .35, .17, .04, mid, y0 + gh * (i + .6) / (n + .2), T / 2 + .06, { z: (K.r() - .5) * .5 }); } }
}
const dims = o => { const s = o.s || [4, 3, .3]; return [Math.max(.05, +s[0] || 1), Math.max(.05, +s[1] || 1), Math.max(.02, +s[2] || .1)]; };
const doorHole = (L, H) => { const w = Math.max(1.05, Math.min(1.8, L * .4)), h = Math.min(2.4, H - .3); return { x0: -w / 2, x1: w / 2, y0: 0, y1: h, kind: 'door' }; };
ENG.kitDoorHole = doorHole;
function archPiece(K, L, H, T) {
  const w = Math.max(1.1, Math.min(2.6, L * .55)), r = w / 2, x0 = -r, x1 = r, top = Math.min(H - .25, Math.max(2.4, H * .82)), sp = top - r, X0 = -L / 2, X1 = L / 2;
  const sh = new THREE.Shape(); sh.moveTo(X0, 0); sh.lineTo(x0, 0); sh.lineTo(x0, sp); sh.absarc(0, sp, r, Math.PI, 0, true); sh.lineTo(x1, 0); sh.lineTo(X1, 0); sh.lineTo(X1, H); sh.lineTo(X0, H); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false, curveSegments: 20 }); g.translate(0, 0, -T / 2); K.geo('wall', g, true);
  const fw = K.S.label === 'Medieval' ? .22 : .11, ring = new THREE.Shape(); ring.moveTo(x0 - fw, 0); ring.lineTo(x0 - fw, sp); ring.absarc(0, sp, r + fw, Math.PI, 0, true); ring.lineTo(x1 + fw, 0); ring.lineTo(x1, 0); ring.lineTo(x1, sp); ring.absarc(0, sp, r, 0, Math.PI, false); ring.lineTo(x0, 0); ring.closePath();
  const rg = new THREE.ExtrudeGeometry(ring, { depth: T + .08, bevelEnabled: false, curveSegments: 20 }); rg.translate(0, 0, -(T + .08) / 2); K.geo(K.S.label === 'Medieval' ? 'base' : 'frame', rg, true);
  K.col(x0 - X0, H, T, (X0 + x0) / 2, H / 2, 0); K.col(X1 - x1, H, T, (x1 + X1) / 2, H / 2, 0); K.col(w, H - top, T, 0, (top + H) / 2, 0);
  const W = K.S.wall; [[X0, x0 - fw], [x1 + fw, X1]].forEach(([a, b]) => { if (b - a < .02) return; if (W.base) K.box('base', b - a, Math.min(W.base, H), T + .035, (a + b) / 2, Math.min(W.base, H) / 2, 0); if (W.hazard) K.box('hazard', b - a, W.hazard, T + .075, (a + b) / 2, W.hazard / 2, 0); });
  if (W.cap) K.box('trim', L, W.cap, T + .06, 0, H - W.cap / 2, 0);
}

/* ---------------- the catalogue ---------------- */
/* snap: edge (on a grid line), vertex (on a grid corner), cell (in a grid square), free (anywhere, 25 cm steps), mount (on a wall face).
   at: where it sits in height: floor (on the level), top (at wall height: ceilings, roofs, beams), mount (height on the wall). */
const st = o => STY[o.props.style] || STY.modern, Tof = (S, s) => s ? +s : S.T;
const PIECES = ENG.KIT_PIECES = {
  wall: { label: 'Wall', group: 'Walls', snap: 'edge', size: (M, H, S) => [M, H, S.T], build(K, o) { const [L, H, T] = dims(o); wallBody(K, L, H, T, null); } },
  wall_door: { label: 'Doorway', group: 'Walls', snap: 'edge', size: (M, H, S) => [M, H, S.T], build(K, o) { const [L, H, T] = dims(o), hole = doorHole(L, H); wallBody(K, L, H, T, hole); frameOf(K, hole, T, H); } },
  wall_window: { label: 'Window', group: 'Walls', snap: 'edge', size: (M, H, S) => [M, H, S.T], build(K, o) { const [L, H, T] = dims(o), w = Math.max(.7, Math.min(2.4, L * .45)), y0 = Math.min(1, H * .33), y1 = Math.max(y0 + .6, Math.min(H - .45, 2.3)), hole = { x0: -w / 2, x1: w / 2, y0, y1, kind: 'window' }; wallBody(K, L, H, T, hole); frameOf(K, hole, T, H, { glass: true }); } },
  wall_glass: { label: 'Glass wall', group: 'Walls', snap: 'edge', size: (M, H, S) => [M, H, S.T], build(K, o) { const [L, H, T] = dims(o), hole = { x0: -L / 2 + .2, x1: L / 2 - .2, y0: .2, y1: H - .3, kind: 'window' }; wallBody(K, L, H, T, hole); frameOf(K, hole, T, H, { glass: true, grid: [Math.max(1, Math.round(L / 1.4)), 1] }); } },
  wall_arch: { label: 'Arch', group: 'Walls', snap: 'edge', size: (M, H, S) => [M, H, S.T], build(K, o) { const [L, H, T] = dims(o); archPiece(K, L, H, T); } },
  wall_low: { label: 'Low wall', group: 'Walls', snap: 'edge', size: (M, H, S) => [M, 1.1, S.T], build(K, o) { const [L, H, T] = dims(o), W = K.S.wall; K.box('wall', L, H, T, 0, H / 2, 0); K.col(L, H, T, 0, H / 2, 0); if (W.base && W.base < H - .2) K.box('base', L, Math.min(W.base, H * .4), T + .035, 0, Math.min(W.base, H * .4) / 2, 0); K.box('trim', L + .02, .1, T + .1, 0, H - .05, 0); } },
  post: { label: 'Corner post', group: 'Structure', snap: 'vertex', size: (M, H, S) => [S.T * 1.25, H, S.T * 1.25], build(K, o) { const [w, h, d] = dims(o), W = K.S.wall; K.box('post', w, h, d, 0, h / 2, 0); K.col(w, h, d, 0, h / 2, 0);
      if (W.quoins) for (let y = 0, i = 0; y < h - .1; y += .36, i++) K.box('base', i % 2 ? w + .1 : w + .04, .3, i % 2 ? d + .04 : d + .1, 0, y + .17, 0); else if (W.base) K.box('base', w + .06, Math.min(W.base, h), d + .06, 0, Math.min(W.base, h) / 2, 0);
      if (W.hazard) K.box('hazard', w + .08, W.hazard, d + .08, 0, W.hazard / 2, 0); if (W.cap) K.box('trim', w + .06, W.cap, d + .06, 0, h - W.cap / 2, 0); if (W.strip) { K.box('glow', w + .016, h * .6, .035, 0, h * .5, 0); K.box('glow', .035, h * .6, d + .016, 0, h * .5, 0); } } },
  column: { label: 'Column', group: 'Structure', snap: 'vertex', size: (M, H) => [.6, H, .6], build(K, o) { const [w, h, d] = dims(o), S = K.S, r = Math.min(w, d) / 2; K.col(w * .8, h, d * .8, 0, h / 2, 0);
      if (S.column === 'ibeam') { K.box('post', w, h, .06, 0, h / 2, -d / 2 + .03); K.box('post', w, h, .06, 0, h / 2, d / 2 - .03); K.box('post', .06, h, d, 0, h / 2, 0); K.box('hazard', w + .02, .5, d + .02, 0, .25, 0); K.box('trim', w + .1, .06, d + .1, 0, .03, 0); return; }
      if (S.column === 'square') { K.box('post', w * .7, h, d * .7, 0, h / 2, 0); K.box('base', w * .7 + .02, .08, d * .7 + .02, 0, .04, 0); return; }
      const seg = S.column === 'hex' ? 6 : 18, c = new THREE.CylinderGeometry(r * .78, r * .82, h - .5, seg); c.translate(0, h / 2, 0); K.geo('post', c, true); K.box(S.column === 'hex' ? 'trim' : 'base', w, .25, d, 0, .125, 0); K.box(S.column === 'hex' ? 'trim' : 'base', w, .25, d, 0, h - .125, 0);
      if (S.column === 'hex') [.3, .5, .7].forEach(f => { const ring = new THREE.CylinderGeometry(r * .8, r * .8, .04, 6); ring.translate(0, h * f, 0); K.geo('glow', ring, true); }); } },
  /* hangs down from its origin, so it sits under the ceiling */
  beam: { label: 'Beam', group: 'Structure', snap: 'edge', at: 'top', size: M => [M, .32, .3], build(K, o) { const [L, h, d] = dims(o); if (K.S.column === 'ibeam') { K.box('post', L, .05, d, 0, -.025, 0); K.box('post', L, .05, d, 0, -h + .025, 0); K.box('post', L, h, .05, 0, -h / 2, 0); } else K.box(K.S.label === 'Modern' ? 'post' : 'trim', L, h, d, 0, -h / 2, 0); K.col(L, h, d, 0, -h / 2, 0); } },
  railing: { label: 'Railing', group: 'Structure', snap: 'edge', size: M => [M, 1.05, .12], build(K, o) { const [L, h] = dims(o), kind = K.S.rail; K.col(L, h, .15, 0, h / 2, 0);
      if (kind === 'glass') { K.box('glass', L - .1, h - .16, .025, 0, (h - .16) / 2 + .06, 0); K.box('frame', L, .06, .08, 0, h - .03, 0); K.box('frame', .06, h, .06, -L / 2 + .03, h / 2, 0); K.box('frame', .06, h, .06, L / 2 - .03, h / 2, 0); if (K.S.wall.strip) K.box('glow', L, .015, .085, 0, h - .065, 0); return; }
      if (kind === 'pipe') { const n = Math.max(2, Math.round(L / 1.2) + 1); for (let i = 0; i < n; i++) { const c = new THREE.CylinderGeometry(.03, .03, h, 8); c.translate(-L / 2 + .05 + (L - .1) * i / (n - 1), h / 2, 0); K.geo('trim', c, true); } [h - .03, h * .5].forEach(y => { const c = new THREE.CylinderGeometry(.03, .03, L, 8); c.rotateZ(Math.PI / 2); c.translate(0, y, 0); K.geo('trim', c, true); }); K.box('hazard', L, .1, .02, 0, .05, 0); return; }
      const n = Math.max(2, Math.round(L) + 1); for (let i = 0; i < n; i++) { if (kind === 'broken' && i > 0 && i < n - 1 && K.r() < .3) continue; K.box('trim', .1, h * (kind === 'broken' ? .75 + K.r() * .25 : 1), .1, -L / 2 + .05 + (L - .1) * i / (n - 1), h / 2, 0); }
      [h - .05, h * .45].forEach((y, j) => { if (kind === 'broken' && j === 0 && K.r() < .5) K.box('trim', L * .6, .08, .06, -L * .2, y - .1, 0, { z: .18 }); else K.box('trim', L, .08, .06, 0, y, 0); }); } },
  floor: { label: 'Floor', group: 'Floors', snap: 'cell', size: M => [M, .2, M], build(K, o) { const [w, t, d] = dims(o); K.box('floor', w, .05, d, 0, -.025, 0); K.box('ceil', w - .004, Math.max(.02, t - .05), d - .004, 0, -.05 - Math.max(.02, t - .05) / 2, 0); K.col(w, t, d, 0, -t / 2, 0); } },
  ceiling: { label: 'Ceiling or flat roof', group: 'Floors', snap: 'cell', at: 'top', size: M => [M, .2, M], build(K, o) { const [w, t, d] = dims(o), S = K.S, y = -t; K.box('roof', w, .05, d, 0, -.025, 0); K.box('ceil', w - .004, Math.max(.02, t - .05), d - .004, 0, -.05 - Math.max(.02, t - .05) / 2, 0); K.col(w, t, d, 0, -t / 2, 0);
      if (S.label === 'Sci-fi') { K.box('glow', w * .62, .02, .16, 0, y - .01, -d * .18); K.box('glow', w * .62, .02, .16, 0, y - .01, d * .18); }
      else if (S.label === 'Modern') K.box('glow', .55, .02, .55, 0, y - .008, 0);
      else if (S.label === 'Medieval') { K.box('trim', w, .22, .2, 0, y - .11, -d / 4); K.box('trim', w, .22, .2, 0, y - .11, d / 4); }
      else if (S.label === 'Industrial') { K.box('trim', .3, .08, 1.3, 0, y - .1, 0); K.box('glow', .2, .02, 1.2, 0, y - .145, 0); K.box('trim', .02, .1, .02, 0, y - .05, -.5); K.box('trim', .02, .1, .02, 0, y - .05, .5); }
      else { K.box('trim', .015, .5, .015, 0, y - .25, 0); const b = new THREE.SphereGeometry(.06, 10, 8); b.translate(0, y - .53, 0); K.geo('glow', b, true); } } },
  roof_slope: { label: 'Sloped roof', group: 'Roofs', snap: 'cell', at: 'top', size: M => [M, M * .5, M], build(K, o) { const [w, r, d] = dims(o), a = Math.atan2(r, d), ov = .35, t = .16, len = Math.hypot(r, d) + ov, cz = -ov / 2 * Math.cos(a) - t / 2 * Math.sin(a), cy = r / 2 - ov / 2 * Math.sin(a) + t / 2 * Math.cos(a);
      K.box('roof', w + .1, t, len, 0, cy, cz, { x: -a }); K.box('trim', w + .1, .22, .06, 0, -ov * Math.sin(a) + .02, -d / 2 - ov * Math.cos(a)); K.col(w, .1, Math.hypot(r, d), 0, r / 2, 0, { solid: false, rx: -a }); } },
  /* two slopes meeting along the middle of the square */
  roof_peak: { label: 'Roof ridge', group: 'Roofs', snap: 'cell', at: 'top', size: M => [M, M * .4, M], build(K, o) { const [w, r, d] = dims(o), hd = d / 2, a = Math.atan2(r, hd), t = .16, ov = .35, len = Math.hypot(r, hd) + ov;
      [-1, 1].forEach(s => { const cz = s * (hd / 2 + ov / 2 * Math.cos(a) + t / 2 * Math.sin(a)), cy = r / 2 - ov / 2 * Math.sin(a) + t / 2 * Math.cos(a); K.box('roof', w + .1, t, len, 0, cy, cz, { x: s * a }); K.col(w, .1, Math.hypot(r, hd), 0, r / 2, s * hd / 2, { solid: false, rx: s * a }); });
      K.box('trim', w + .12, .14, .26, 0, r + .07, 0); } },
  roof_gable: { label: 'Gable end', group: 'Roofs', snap: 'edge', at: 'top', size: (M, H, S) => [M * 2, M * .5, S.T], build(K, o) { const [w, r, T] = dims(o), sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, r); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }); g.translate(0, 0, -T / 2); K.geo('wall', g, true); if (K.S.wall.beams) { const a = Math.atan2(r, w / 2), len = Math.hypot(r, w / 2); K.box('trim', len, .14, T + .05, -w / 4, r / 2, 0, { z: a }); K.box('trim', len, .14, T + .05, w / 4, r / 2, 0, { z: -a }); } } },
  stairs: { label: 'Stairs', group: 'Stairs', snap: 'cell', size: (M, H) => [M, H, M * Math.max(1, Math.round(H * 1.35 / M))], build(K, o, c) { const [w, h, d] = dims(o), S = K.S, sg = ENG.PREFABS.stairs_pro.build({ props: { kind: S.stairs, width: w * .92, rise: h, run: d, stepH: .18, rail: 'both', landing: 0, layout: 'straight', nosing: S.label !== 'Horror', color: S.stairs === 'concrete' ? K.m('floor').c : '' } }, c); sg.position.z = -d / 2; K.extra.push(sg); } },
  stairs_u: { label: 'Stairs (two flights)', group: 'Stairs', snap: 'cell', size: (M, H) => [M, H, M], build(K, o, c) { const [w, h, d] = dims(o), S = K.S, gap = .2, fw = Math.max(.6, (w - gap) / 2 - .06), run = Math.max(.8, d - fw - .05), sg = ENG.PREFABS.stairs_pro.build({ props: { kind: S.stairs, width: fw, rise: h, run, gap, stepH: .18, rail: 'both', landing: 0, layout: 'switchback', color: S.stairs === 'concrete' ? K.m('floor').c : '' } }, c); sg.position.z = -d / 2 + .02; K.extra.push(sg); } },
  ramp: { label: 'Ramp', group: 'Stairs', snap: 'cell', size: (M, H) => [M, H / 2, M * 2], build(K, o) { const [w, r, d] = dims(o), sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(d / 2, r); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(w / 2, 0, 0); K.geo('floor', g, true); const a = Math.atan2(r, d); K.col(w, .1, Math.hypot(r, d), 0, r / 2, 0, { solid: false, rx: -a }); } },
  torch: { label: 'Wall light', group: 'Details', snap: 'mount', mountY: 1.9, size: () => [.3, .6, .3], build(K, o) { const S = K.S; if (S.label === 'Medieval' || S.label === 'Horror') { K.box('frame', .05, .32, .05, 0, -.05, .1, { x: -.5 }); const cup = new THREE.CylinderGeometry(.08, .04, .1, 8); cup.translate(0, .14, .2); K.geo('frame', cup, true); const f = new THREE.ConeGeometry(.06, .2, 7); f.translate(0, .29, .2); K.geo('flame', f, true); } else { K.box('frame', .26, .34, .06, 0, 0, .03); K.box('glow', .2, .26, .02, 0, 0, .07); } } },
  pipe: { label: 'Pipes', group: 'Details', snap: 'mount', mountY: 2.4, size: M => [M, .24, .24], build(K, o) { const [L] = dims(o); [0, .26].forEach((dz, i) => { const c = new THREE.CylinderGeometry(i ? .07 : .11, i ? .07 : .11, L, 12); c.rotateZ(Math.PI / 2); c.translate(0, i ? -.06 : 0, .14 + dz); K.geo(i ? 'frame' : 'trim', c, true); }); for (let x = -L / 2 + .4; x < L / 2; x += 1.6) K.box('frame', .08, .32, .5, x, -.02, .25); } },
  screen: { label: 'Screen or sign', group: 'Details', snap: 'mount', mountY: 1.5, size: () => [1.6, .9, .06], build(K, o) { const [w, h] = dims(o); K.box('frame', w, h, .06, 0, 0, .03); K.box('screen', w - .1, h - .1, .01, 0, 0, .065); } },
  banner: { label: 'Banner', group: 'Details', snap: 'mount', mountY: 2.6, size: () => [1, 2, .05], build(K, o) { const [w, h] = dims(o); const c = new THREE.CylinderGeometry(.03, .03, w + .3, 8); c.rotateZ(Math.PI / 2); c.translate(0, 0, .08); K.geo('frame', c, true); K.box('cloth', w, h, .02, 0, -h / 2, .08); K.box('trim', w, .1, .03, 0, -h + .05, .08); } },
  tree_pine: { label: 'Pine', group: 'Nature', snap: 'free', size: () => [2.6, 6.5, 2.6], build(K, o) { const [w, h] = dims(o), k = .8 + K.r() * .4, tr = new THREE.CylinderGeometry(.1 * k, .2 * k, h * .4, 7); tr.translate(0, h * .2, 0); K.geo('bark', tr, true); for (let i = 0; i < 4; i++) { const c = new THREE.ConeGeometry(w / 2 * (1 - i * .2), h * .36, 8); c.rotateY(K.r() * 3); c.translate((K.r() - .5) * .1, h * .3 + i * h * .17, (K.r() - .5) * .1); K.geo('leaf', c, true); } K.col(.4, h * .9, .4, 0, h * .45, 0); } },
  tree_oak: { label: 'Leafy tree', group: 'Nature', snap: 'free', size: () => [4.2, 6, 4.2], build(K, o) { const [w, h] = dims(o), tr = new THREE.CylinderGeometry(.17, .3, h * .55, 8); tr.translate(0, h * .275, 0); K.geo('bark', tr, true); const n = 4 + Math.floor(K.r() * 3); for (let i = 0; i < n; i++) { const r = w * (.2 + K.r() * .14), b = new THREE.IcosahedronGeometry(r, 1), a = i / n * Math.PI * 2; b.translate(Math.cos(a) * w * .2 * K.r(), h * (.6 + K.r() * .25), Math.sin(a) * w * .2 * K.r()); K.geo('leaf', b, true); } K.col(.6, h * .6, .6, 0, h * .3, 0); } },
  tree_dead: { label: 'Dead tree', group: 'Nature', snap: 'free', size: () => [3, 5.5, 3], build(K, o) { const [w, h] = dims(o), tr = new THREE.CylinderGeometry(.09, .22, h * .9, 6); tr.translate(0, h * .45, 0); K.geo('bark', tr, true); for (let i = 0; i < 5; i++) { const L = w * (.25 + K.r() * .25), b = new THREE.CylinderGeometry(.025, .07, L, 5), a = K.r() * Math.PI * 2, tilt = .6 + K.r() * .6; b.translate(0, L / 2, 0); b.rotateZ(tilt); b.rotateY(a); b.translate(0, h * (.4 + K.r() * .45), 0); K.geo('bark', b, true); } K.col(.4, h * .9, .4, 0, h * .45, 0); } },
  bush: { label: 'Bush', group: 'Nature', snap: 'free', size: () => [1.8, 1.1, 1.8], build(K, o) { const [w, h] = dims(o); for (let i = 0; i < 4; i++) { const b = new THREE.IcosahedronGeometry(w * (.22 + K.r() * .1), 1); b.scale(1, h / w * 1.4, 1); b.translate((K.r() - .5) * w * .5, h * .4, (K.r() - .5) * w * .5); K.geo('leaf', b, true); } } },
  rock: { label: 'Rock', group: 'Nature', snap: 'free', size: () => [2, 1.4, 1.8], build(K, o) { const [w, h, d] = dims(o), b = new THREE.IcosahedronGeometry(1, 1), p = b.attributes.position, seen = new Map(); for (let i = 0; i < p.count; i++) { const key = [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v * 100)).join(); if (!seen.has(key)) seen.set(key, .78 + K.r() * .4); const f = seen.get(key); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f); } b.scale(w / 2, h / 2, d / 2); b.translate(0, h * .42, 0); K.geo('rock', b, true); K.col(w * .8, h * .85, d * .8, 0, h * .42, 0); } },
  road: { label: 'Road', group: 'Street', snap: 'cell', size: M => [M, .1, M], build(K, o) { const [w, t, d] = dims(o); K.box('asphalt', w, t, d, 0, -t / 2, 0); for (let x = -w / 2 + .5; x < w / 2 - .4; x += 2) K.box('paint', .9, .012, .12, x + .45, .004, 0); [-1, 1].forEach(s => K.box('paint', w, .012, .1, 0, .004, s * (d / 2 - .35))); K.col(w, t, d, 0, -t / 2, 0); } },
  road_cross: { label: 'Crossing', group: 'Street', snap: 'cell', size: M => [M, .1, M], build(K, o) { const [w, t, d] = dims(o); K.box('asphalt', w, t, d, 0, -t / 2, 0); [-1, 1].forEach(s => { for (let z = -d / 2 + .6; z < d / 2 - .5; z += .7) K.box('paint', .5, .012, .35, s * (w / 2 - .45), .004, z + .17); }); K.col(w, t, d, 0, -t / 2, 0); } },
  sidewalk: { label: 'Pavement', group: 'Street', snap: 'cell', size: M => [M, .2, M], build(K, o) { const [w, t, d] = dims(o); K.box('paving', w, t, d, 0, -t / 2 + .1, 0); K.col(w, t, d, 0, -t / 2 + .1, 0); } },
  streetlamp: { label: 'Street lamp', group: 'Street', snap: 'free', size: () => [.6, 4.6, .6], build(K, o) { const [, h] = dims(o), S = K.S; K.box('frame', .3, .4, .3, 0, .2, 0); const p = new THREE.CylinderGeometry(.06, .08, h - .4, 8); p.translate(0, (h - .4) / 2 + .4, 0); K.geo('frame', p, true);
      if (S.lamp === 'lantern') { K.box('frame', .34, .5, .34, 0, h + .05, 0); K.box('flame', .24, .36, .24, 0, h + .05, 0); } else if (S.lamp === 'slim') { const ring = new THREE.TorusGeometry(.28, .035, 8, 24); ring.rotateX(Math.PI / 2); ring.translate(0, h - .1, 0); K.geo('glow', ring, true); } else { K.box('frame', .08, .08, 1, 0, h - .1, .45); K.box('frame', .5, .12, .3, 0, h - .14, .9); K.box('glow', .42, .02, .22, 0, h - .21, .9); }
      K.col(.3, h, .3, 0, h / 2, 0); } },
  bench: { label: 'Bench', group: 'Street', snap: 'free', size: () => [1.8, .9, .6], build(K, o) { const [w, h, d] = dims(o); for (let i = 0; i < 3; i++) K.box('trim', w, .05, .14, 0, .46, -d / 2 + .1 + i * .18); for (let i = 0; i < 2; i++) K.box('trim', w, .12, .04, 0, .62 + i * .16, d / 2 - .04, { x: -.2 }); [-1, 1].forEach(s => { K.box('frame', .06, .46, d * .9, s * (w / 2 - .15), .23, 0); }); K.col(w, .5, d, 0, .25, 0); } },
  cave_rock: { label: 'Cave wall', group: 'Caves', snap: 'cell', size: (M, H) => [M, H + .5, M], build(K, o) { const [w, h, d] = dims(o), n = 4 + Math.floor(K.r() * 2); for (let i = 0; i < n; i++) { const b = new THREE.IcosahedronGeometry(1, 1), p = b.attributes.position, seen = new Map(); for (let j = 0; j < p.count; j++) { const key = [p.getX(j), p.getY(j), p.getZ(j)].map(v => Math.round(v * 100)).join(); if (!seen.has(key)) seen.set(key, .75 + K.r() * .45); const f = seen.get(key); p.setXYZ(j, p.getX(j) * f, p.getY(j) * f, p.getZ(j) * f); } b.scale(w * (.38 + K.r() * .12), h * (.32 + K.r() * .2), d * (.38 + K.r() * .12)); b.translate((K.r() - .5) * w * .35, h * (.25 + i / n * .55), (K.r() - .5) * d * .35); K.geo('rock', b, true); } K.col(w, h, d, 0, h / 2, 0); } },
  stalagmite: { label: 'Stalagmite', group: 'Caves', snap: 'free', size: () => [.9, 1.8, .9], build(K, o) { const [w, h] = dims(o), c = new THREE.ConeGeometry(w / 2, h, 7, 3); c.translate(0, h / 2, 0); const p = c.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < h * .9) p.setX(i, p.getX(i) * (.85 + K.r() * .3)); K.geo('rock', c, true); K.col(w * .5, h * .8, w * .5, 0, h * .4, 0); } },
  crystal: { label: 'Crystals', group: 'Caves', snap: 'free', size: () => [1, 1.3, 1], build(K, o) { const [w, h] = dims(o), n = 3 + Math.floor(K.r() * 4); for (let i = 0; i < n; i++) { const c = new THREE.OctahedronGeometry(1, 0), s = .5 + K.r() * .6; c.scale(w * .12 * s, h * .45 * s, w * .12 * s); c.rotateZ((K.r() - .5) * .9); c.rotateX((K.r() - .5) * .9); c.translate((K.r() - .5) * w * .5, h * .3 * s, (K.r() - .5) * w * .5); K.geo('crystal', c, true); } } }
};
ENG.KIT_GROUPS = ['Walls', 'Structure', 'Floors', 'Roofs', 'Stairs', 'Details', 'Nature', 'Street', 'Caves'];

/* sizes, objects and the prefab */
ENG.kitSize = (piece, M, H, style) => { const pc = PIECES[piece] || PIECES.wall; return pc.size(M || ENG.KIT.M, H || ENG.KIT.H, STY[style] || STY.modern).map(v => Math.round(v * 1000) / 1000); };
ENG.kitObject = function (piece, style, p, ry, M, H, extra) {
  const o = ENG.newObject('kit'); o.props.piece = piece; o.props.style = style || 'modern'; o.s = ENG.kitSize(piece, M, H, style); o.p = p.map(v => Math.round(v * 1000) / 1000); o.r = [0, ((Math.round(ry || 0) % 360) + 360) % 360, 0]; o.name = (PIECES[piece] || PIECES.wall).label;
  if (extra) { if (extra.s) o.s = extra.s.map(v => Math.round(v * 1000) / 1000); if (extra.props) Object.assign(o.props, extra.props); if (extra.name) o.name = extra.name; } return o;
};
const GEOC = new Map(), NOCACHE = { stairs: 1, stairs_u: 1 };
ENG.PREFABS.kit = { type: 'kit', label: 'Kit piece', cat: 'Build', size: [4, 3, .3], props: {
  piece: { t: 'sel', d: 'wall', o: Object.keys(PIECES), l: 'Piece' }, style: { t: 'sel', d: 'modern', o: Object.keys(STY), l: 'Style' }, color: { t: 'color', d: '', l: 'Wall colour (empty uses the style)' },
  seed: { t: 'num', d: 1, min: 1, max: 9999, step: 1, l: 'Variation' }, collide: { t: 'bool', d: true, l: 'Solid' }, tag: { t: 'text', d: '', l: 'Tag' } },
  build(o, c) {
    const pc = PIECES[o.props.piece] || PIECES.wall, K = new Kit(o, c), key = NOCACHE[o.props.piece] ? null : [o.props.piece, o.props.style, o.props.color || '', o.props.seed || 1, o.props.collide !== false].concat(dims(o).map(v => v.toFixed(3))).join('|');
    const hit = key && GEOC.get(key); if (hit) { K.cols = hit.cols; const { G } = K.done(hit.parts); return G; }
    try { pc.build(K, o, c); } catch (e) { console.warn('Kit piece failed', o.props.piece, e); }
    const { G, parts } = K.done(); if (key) { if (GEOC.size > 700) GEOC.clear(); GEOC.set(key, { parts, cols: K.cols }); } return G;
  } };

/* ---------------- in a game: walls are static, and static pieces are drawn in a few big batches ---------------- */
{ const f = G.spawnExtra; G.spawnExtra = function (e) { if (f) f.call(this, e); if (e.type === 'kit') this.makeStatic(e); }; }
function kitBatch(g) {
  const busy = JSON.stringify([g.project.animations || null, g.project.cutscenes || null, g.project.logic || null]), buckets = new Map();
  g.ents.forEach(e => { if (e.type !== 'kit' || !e.alive || (e.tags && e.tags.length) || (e.o.logic && e.o.logic.length) || busy.indexOf(e.o.id) >= 0) return; e.root.updateMatrixWorld(true);
    e.root.traverse(m => { if (!m.isMesh || m.userData.kitCol || !m.userData.kitMat || !m.visible) return; const k = m.userData.kitMat; let b = buckets.get(k); if (!b) buckets.set(k, b = { mat: m.material, list: [], n: 0 }); b.list.push(m); b.n += m.geometry.attributes.position.count; }); });
  const nm = new THREE.Matrix3(), v = new THREE.Vector3(); let made = 0;
  buckets.forEach(b => { if (b.list.length < 3) return; const P = new Float32Array(b.n * 3), N = new Float32Array(b.n * 3), U = new Float32Array(b.n * 2); let o = 0;
    b.list.forEach(m => { const ga = m.geometry.attributes, c = ga.position.count; nm.getNormalMatrix(m.matrixWorld); for (let i = 0; i < c; i++) { v.fromBufferAttribute(ga.position, i).applyMatrix4(m.matrixWorld); P[(o + i) * 3] = v.x; P[(o + i) * 3 + 1] = v.y; P[(o + i) * 3 + 2] = v.z; v.fromBufferAttribute(ga.normal, i).applyMatrix3(nm).normalize(); N[(o + i) * 3] = v.x; N[(o + i) * 3 + 1] = v.y; N[(o + i) * 3 + 2] = v.z; if (ga.uv) { U[(o + i) * 2] = ga.uv.getX(i); U[(o + i) * 2 + 1] = ga.uv.getY(i); } } o += c; m.visible = false; });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(U, 2)); geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, b.mat); mesh.castShadow = b.list[0].castShadow; mesh.receiveShadow = true; mesh.renderOrder = b.list[0].renderOrder; mesh.userData.kitBatch = true; g.scene.add(mesh); made++; });
  g.kitBatches = made;
}
{ const f = G.load; G.load = async function () { const r = await f.apply(this, arguments); try { if (this.ents && this.state !== 'gone') kitBatch(this); } catch (e) { console.warn('Kit batching skipped', e); } return r; }; }
ENG.kitBatch = kitBatch;
})();
