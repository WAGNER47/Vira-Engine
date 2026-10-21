/* VIRA ENGINE runtime. Shared by the editor's play mode and every exported game. */
(function () {
'use strict';
const ENG = window.ENG = {};
const D2R = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
ENG.D2R = D2R; ENG.clamp = clamp;
ENG.uid = () => Math.random().toString(36).slice(2, 10);
ENG.rng = function (seed) { let s = (seed >>> 0) || 0x9e3779b9; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
ENG.clone = o => JSON.parse(JSON.stringify(o));

/* ---------------- procedural textures ---------------- */
ENG.TEXTURES = { none: 'None', concrete: 'Concrete', brick: 'Brick', metal: 'Metal panel', wood: 'Wood planks', tiles: 'Tiles', grass: 'Grass', rock: 'Rock', hazard: 'Hazard stripes', grate: 'Grate' };
function makeTex(kind) {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const r = ENG.rng(kind.split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7));
  const fill = col => { g.fillStyle = col; g.fillRect(0, 0, S, S); };
  const noise = amt => { const id = g.getImageData(0, 0, S, S), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (r() - .5) * amt; d[i] = clamp(d[i] + n, 0, 255); d[i + 1] = clamp(d[i + 1] + n, 0, 255); d[i + 2] = clamp(d[i + 2] + n, 0, 255); } g.putImageData(id, 0, 0); };
  if (kind === 'concrete') { fill('#c4c4c4'); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${r() * .07})`; g.beginPath(); g.arc(r() * S, r() * S, r() * 14, 0, 7); g.fill(); } noise(36); }
  else if (kind === 'brick') { fill('#d8d2c8'); for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) { const o = (y % 2) * 16; g.fillStyle = `hsl(${8 + r() * 8},${30 + r() * 12}%,${62 + r() * 14}%)`; g.fillRect(x * 32 + o + 2, y * 16 + 2, 28, 12); } noise(22); }
  else if (kind === 'metal') { fill('#c9ced3'); for (let y = 0; y < S; y += 2) { g.fillStyle = `rgba(255,255,255,${r() * .07})`; g.fillRect(0, y, S, 1); } g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2; g.strokeRect(1, 1, S - 2, S - 2); g.fillStyle = 'rgba(0,0,0,.35)'; [[8, 8], [S - 8, 8], [8, S - 8], [S - 8, S - 8]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }); noise(14); }
  else if (kind === 'wood') { for (let x = 0; x < 4; x++) { g.fillStyle = `hsl(30,35%,${58 + r() * 12}%)`; g.fillRect(x * 32, 0, 32, S); for (let k = 0; k < 10; k++) { g.strokeStyle = `rgba(60,35,15,${.08 + r() * .1})`; g.beginPath(); const xx = x * 32 + r() * 32; g.moveTo(xx, 0); g.bezierCurveTo(xx + r() * 6 - 3, S * .3, xx + r() * 6 - 3, S * .7, xx, S); g.stroke(); } g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x * 32, 0, 1.5, S); } noise(16); }
  else if (kind === 'tiles') { fill('#bbb'); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#ececec' : '#d2d2d2'; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); } noise(10); }
  else if (kind === 'grass') { fill('#9fbf72'); for (let i = 0; i < 900; i++) { g.fillStyle = `hsl(${80 + r() * 30},${35 + r() * 20}%,${45 + r() * 25}%)`; g.fillRect(r() * S, r() * S, 1.5, 3 + r() * 3); } noise(14); }
  else if (kind === 'rock') { fill('#a8a49c'); for (let i = 0; i < 70; i++) { g.fillStyle = `hsl(35,8%,${50 + r() * 30}%)`; g.beginPath(); g.ellipse(r() * S, r() * S, 4 + r() * 16, 3 + r() * 10, r() * 3, 0, 7); g.fill(); } noise(30); }
  else if (kind === 'hazard') { fill('#f2c230'); g.fillStyle = '#222'; for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 16, 0); g.lineTo(i * 32 + 16 + S, S); g.lineTo(i * 32 + S, S); g.fill(); } noise(18); }
  else if (kind === 'grate') { fill('#8a8a8a'); g.fillStyle = '#2a2a2a'; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) g.fillRect(x * 16 + 3, y * 16 + 3, 10, 10); noise(14); }
  else fill('#fff');
  return c;
}
const texCache = {};
ENG.texture = function (kind, project) {
  if (!kind || kind === 'none') return null;
  if (texCache[kind]) return texCache[kind];
  let t;
  if (kind.indexOf('img:') === 0) { const a = project && project.assets.images[kind.slice(4)]; if (!a) return null; t = new THREE.TextureLoader().load(a.data); }
  else t = new THREE.CanvasTexture(makeTex(kind));
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  texCache[kind] = t; return t;
};
ENG.textureThumb = kind => makeTex(kind).toDataURL();
const texCanvases = {}; ENG.texCanvas = kind => texCanvases[kind] || (texCanvases[kind] = makeTex(kind));

/* ---------------- geometry helpers ---------------- */
function boxGeo(sx, sy, sz, tile) {
  const g = new THREE.BoxGeometry(sx, sy, sz), uv = g.attributes.uv; tile = tile || 2;
  const dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / tile, uv.getY(k) * dims[f][1] / tile); }
  g.translate(0, sy / 2, 0); return g;
}
function planarUV(g, tile) {
  g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals(); tile = tile || 2;
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v; if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); } else if (ax >= az) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
ENG.mat = function (o, project, extra) {
  const p = o.props;
  return new THREE.MeshStandardMaterial(Object.assign({ color: p.color || '#cccccc', map: ENG.texture(p.texture, project), roughness: p.rough != null ? p.rough : .85, metalness: p.metal || 0 }, extra || {}));
};
function solid(m, p, walkOnly) { m.castShadow = m.receiveShadow = true; if (!p || p.collide !== false) { m.userData.walk = true; if (!walkOnly) m.userData.solid = true; } return m; }
function helperMat(col, op) { return new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op == null ? .35 : op, depthWrite: false }); }
function editorOnly(m) { m.userData.editorOnly = true; m.castShadow = false; m.receiveShadow = false; return m; }
function makeNoise(seed) {
  const r = ENG.rng(seed), perm = new Uint8Array(512), val = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; val[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const sm = t => t * t * (3 - 2 * t);
  const n2 = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255; const a = val[perm[X + perm[Y]]], b = val[perm[X + 1 + perm[Y]]], c = val[perm[X + perm[Y + 1]]], d = val[perm[X + 1 + perm[Y + 1]]]; const u = sm(xf), v = sm(yf); return lerp(lerp(a, b, u), lerp(c, d, u), v); };
  return (x, y, oct) => { let s = 0, amp = 1, f = 1, tot = 0; for (let i = 0; i < oct; i++) { s += n2(x * f, y * f) * amp; tot += amp; amp *= .5; f *= 2; } return s / tot; };
}
function textSprite(text, col, bg, w, h) {
  const c = document.createElement('canvas'); const ar = w / h; c.height = 128; c.width = Math.min(2048, Math.round(128 * ar)); const g = c.getContext('2d');
  if (bg && bg !== 'transparent') { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
  const lines = String(text || '').split('\n'); let fs = Math.floor(100 / lines.length); g.font = `700 ${fs}px "Chakra Petch", sans-serif`;
  const widest = Math.max(...lines.map(l => g.measureText(l).width), 1); if (widest > c.width * .92) { fs = Math.floor(fs * c.width * .92 / widest); g.font = `700 ${fs}px "Chakra Petch", sans-serif`; }
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, c.width / 2, c.height * (i + .5) / lines.length));
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}

/* ---------------- character skins (Minecraft-style box UV, 64x64) ---------------- */
const PARTS = [
  { n: 'head', sz: [8, 8, 8], uv: [0, 0], ov: [32, 0], pv: [0, 24, 0], off: [0, 4, 0] },
  { n: 'body', sz: [8, 12, 4], uv: [16, 16], ov: [16, 32], pv: [0, 12, 0], off: [0, 6, 0] },
  { n: 'armR', sz: [4, 12, 4], uv: [40, 16], ov: [40, 32], pv: [-6, 22, 0], off: [0, -4, 0] },
  { n: 'armL', sz: [4, 12, 4], uv: [32, 48], ov: [48, 48], pv: [6, 22, 0], off: [0, -4, 0] },
  { n: 'legR', sz: [4, 12, 4], uv: [0, 16], ov: [0, 32], pv: [-2, 12, 0], off: [0, -6, 0] },
  { n: 'legL', sz: [4, 12, 4], uv: [16, 48], ov: [0, 48], pv: [2, 12, 0], off: [0, -6, 0] }
];
ENG.SKIN_PARTS = PARTS;
function boxUVmc(g, u, v, w, h, d) {
  const uv = g.attributes.uv;
  const R = [[u + d + w, v + d, d, h], [u, v + d, d, h], [u + d, v, w, d], [u + d + w, v, w, d], [u + d, v + d, w, h], [u + 2 * d + w, v + d, w, h]];
  for (let f = 0; f < 6; f++) { const [x, y, rw, rh] = R[f]; const u0 = x / 64, u1 = (x + rw) / 64, vt = 1 - y / 64, vb = 1 - (y + rh) / 64; uv.setXY(f * 4, u0, vt); uv.setXY(f * 4 + 1, u1, vt); uv.setXY(f * 4 + 2, u0, vb); uv.setXY(f * 4 + 3, u1, vb); }
  uv.needsUpdate = true;
}
function fillPart(g, u, v, w, h, d, col) { g.fillStyle = col; g.fillRect(u + d, v, w * 2, d); g.fillRect(u, v + d, 2 * d + 2 * w, h); }
ENG.fillPart = fillPart;
ENG.defaultSkinLayers = function () {
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = 64; return c; };
  const base = mk(), g = base.getContext('2d');
  fillPart(g, 0, 0, 8, 8, 8, '#c99a76'); g.fillStyle = '#3a2a1e'; g.fillRect(8, 0, 8, 8); g.fillRect(0, 8, 32, 2);
  g.fillStyle = '#f2f2f2'; g.fillRect(9, 12, 2, 1); g.fillRect(13, 12, 2, 1); g.fillStyle = '#1d2a33'; g.fillRect(10, 12, 1, 1); g.fillRect(13, 12, 1, 1);
  g.fillStyle = '#8a5a44'; g.fillRect(11, 14, 2, 1); g.fillRect(10, 15, 4, 1);
  fillPart(g, 16, 16, 8, 12, 4, '#56663a'); g.fillStyle = '#3a2f22'; g.fillRect(16, 29, 24, 2); g.fillStyle = '#6b7a48'; g.fillRect(21, 21, 2, 3); g.fillRect(25, 21, 2, 3);
  [[40, 16], [32, 48]].forEach(([u, v]) => { fillPart(g, u, v, 4, 12, 4, '#56663a'); g.fillStyle = '#c99a76'; g.fillRect(u, v + 13, 16, 3); g.fillRect(u + 8, v, 4, 4); });
  [[0, 16], [16, 48]].forEach(([u, v]) => { fillPart(g, u, v, 4, 12, 4, '#3b4048'); g.fillStyle = '#22262b'; g.fillRect(u, v + 13, 16, 3); g.fillRect(u + 8, v, 4, 4); });
  const id = g.getImageData(0, 0, 64, 64), d = id.data, r = ENG.rng(99);
  for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { const n = (r() - .5) * 18; d[i] = clamp(d[i] + n, 0, 255); d[i + 1] = clamp(d[i + 1] + n, 0, 255); d[i + 2] = clamp(d[i + 2] + n, 0, 255); }
  g.putImageData(id, 0, 0);
  const outer = mk(), o = outer.getContext('2d');
  o.fillStyle = '#4a5530'; o.fillRect(40, 0, 8, 8); o.fillRect(32, 8, 32, 3); o.fillStyle = '#3c4626'; o.fillRect(32, 11, 8, 1); o.fillRect(48, 11, 16, 1);
  o.fillStyle = '#2f3524'; o.fillRect(20, 36, 8, 7); o.fillRect(32, 36, 8, 7);
  return [{ name: 'Base', target: 'base', visible: true, opacity: 1, canvas: base }, { name: 'Gear', target: 'outer', visible: true, opacity: 1, canvas: outer }];
};
ENG.compositeLayers = function (layers) {
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = 64; return c; };
  const base = mk(), outer = mk(), gb = base.getContext('2d'), go = outer.getContext('2d');
  layers.forEach(l => { if (!l.visible || !l.canvas) return; const g = l.target === 'outer' ? go : gb; g.globalAlpha = l.opacity == null ? 1 : l.opacity; g.drawImage(l.canvas, 0, 0); });
  gb.globalAlpha = go.globalAlpha = 1; return { base, outer };
};
ENG.skinTex = {};
ENG.setSkin = function (id, base, outer) {
  let s = ENG.skinTex[id];
  if (!s) { const mk = c => { const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; }; s = ENG.skinTex[id] = { base: mk(base), outer: mk(outer) }; }
  else { s.base.image = base; s.outer.image = outer; s.base.needsUpdate = s.outer.needsUpdate = true; }
  return s;
};
ENG.getSkin = function (id) {
  if (id && ENG.skinTex[id]) return ENG.skinTex[id];
  if (!ENG.skinTex.default) { const c = ENG.compositeLayers(ENG.defaultSkinLayers()); ENG.setSkin('default', c.base, c.outer); }
  return ENG.skinTex.default;
};
function loadImg(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
ENG.layersFromData = async function (skin) {
  const out = [];
  for (const l of skin.layers) { const c = document.createElement('canvas'); c.width = c.height = 64; const img = l.data ? await loadImg(l.data) : null; if (img) c.getContext('2d').drawImage(img, 0, 0); out.push({ name: l.name, target: l.target, visible: l.visible !== false, opacity: l.opacity == null ? 1 : l.opacity, canvas: c }); }
  return out;
};
ENG.preloadSkins = async function (project) {
  ENG.getSkin('default');
  for (const id in project.skins) { const layers = await ENG.layersFromData(project.skins[id]); const c = ENG.compositeLayers(layers); ENG.setSkin(id, c.base, c.outer); }
};
ENG.buildHumanoid = function (skinId, opts) {
  opts = opts || {};
  const sk = ENG.getSkin(skinId), k = (opts.height || 1.8) / 32, root = new THREE.Group(), parts = {};
  const mb = new THREE.MeshStandardMaterial({ map: sk.base, roughness: .9, transparent: false, alphaTest: .5 });
  const mo = new THREE.MeshStandardMaterial({ map: sk.outer, roughness: .9, alphaTest: .5, side: THREE.DoubleSide });
  const holder = new THREE.Group(); holder.scale.setScalar(k); root.add(holder);
  PARTS.forEach(P => {
    const piv = new THREE.Group(); piv.position.fromArray(P.pv); holder.add(piv);
    const [w, h, d] = P.sz;
    const g = new THREE.BoxGeometry(w, h, d); boxUVmc(g, P.uv[0], P.uv[1], w, h, d);
    const m = new THREE.Mesh(g, mb); m.position.fromArray(P.off); m.castShadow = true; m.userData.part = P.n; m.userData.layer = 'base'; piv.add(m);
    const g2 = new THREE.BoxGeometry(w + 1, h + 1, d + 1); boxUVmc(g2, P.ov[0], P.ov[1], w, h, d);
    const m2 = new THREE.Mesh(g2, mo); m2.position.fromArray(P.off); m2.userData.part = P.n; m2.userData.layer = 'outer'; m2.castShadow = true; piv.add(m2);
    parts[P.n] = piv;
  });
  if (opts.gun) { const gun = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 7), new THREE.MeshStandardMaterial({ color: '#222', roughness: .5, metalness: .6 })); gun.position.set(0, -9, 3); parts.armR.add(gun); }
  root.userData.parts = parts; root.userData.mats = [mb, mo];
  return root;
};
ENG.animateHumanoid = function (parts, phase, amt, aim) {
  if (!parts) return;
  const s = Math.sin(phase) * amt;
  parts.legR.rotation.x = s; parts.legL.rotation.x = -s;
  if (aim) { parts.armR.rotation.x = -Math.PI / 2; parts.armL.rotation.x = -Math.PI / 2.4; parts.armL.rotation.y = .4; }
  else { parts.armR.rotation.x = -s; parts.armL.rotation.x = s; parts.armL.rotation.y = 0; }
};

/* ---------------- imported models ---------------- */
const modelCache = {}; ENG.modelScenes = {};
ENG.loadModel = function (asset) {
  if (modelCache[asset.id]) return modelCache[asset.id];
  let pr;
  if (asset.kind === 'obj') pr = Promise.resolve({ scene: new THREE.OBJLoader().parse(asset.data), animations: [] });
  else pr = new Promise((res, rej) => new THREE.GLTFLoader().load(asset.data, g => res({ scene: g.scene, animations: g.animations || [] }), undefined, rej));
  modelCache[asset.id] = pr.then(m => { ENG.modelScenes[asset.id] = m; return m; }).catch(e => { console.warn('Model failed', asset.name, e); return null; });
  return modelCache[asset.id];
};
ENG.forgetModel = id => { delete modelCache[id]; delete ENG.modelScenes[id]; };
ENG.preloadModels = async function (project) { const list = Object.values(project.assets.models || {}); await Promise.all(list.map(a => ENG.loadModel(a))); };
function placeModel(holder, asset, o, ctx) {
  const m = ENG.modelScenes[asset.id]; if (!m) return false;
  const inst = (THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(m.scene) : m.scene.clone(true));
  const sc = o.props.scale || 1; inst.scale.set(o.s[0] * sc, o.s[1] * sc, o.s[2] * sc);
  if (o.props.ground !== false) { inst.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(inst); const c = b.getCenter(new THREE.Vector3()); inst.position.set(-c.x, -b.min.y, -c.z); }
  const tint = o.props.tint && o.props.tint !== '#ffffff' ? new THREE.Color(o.props.tint) : null;
  inst.traverse(n => { if (n.isMesh) { n.castShadow = n.receiveShadow = true; if (tint) { n.material = n.material.clone(); if (n.material.color) n.material.color.multiply(tint); } if (o.props.collide !== false) { n.userData.walk = true; n.userData.solid = o.props.solidMode !== 'walk only'; } } });
  holder.add(inst); holder.userData.model = inst; holder.userData.clips = m.animations;
  return true;
}

/* ---------------- prefab registry ---------------- */
const P = ENG.PREFABS = {};
const GEO = () => ({
  color: { t: 'color', d: '#b8bcc0', l: 'Color' }, texture: { t: 'tex', d: 'concrete', l: 'Texture' },
  tile: { t: 'num', d: 2, min: .25, max: 32, step: .25, l: 'Texture size (m)' },
  rough: { t: 'num', d: .85, min: 0, max: 1, step: .05, l: 'Roughness' }, metal: { t: 'num', d: 0, min: 0, max: 1, step: .05, l: 'Metalness' },
  emissive: { t: 'num', d: 0, min: 0, max: 3, step: .1, l: 'Glow' },
  collide: { t: 'bool', d: true, l: 'Solid' }, physics: { t: 'sel', d: 'static', o: ['static', 'dynamic'], l: 'Physics' },
  mass: { t: 'num', d: 20, min: .1, max: 2000, step: 1, l: 'Mass (kg)' }, tag: { t: 'text', d: '', l: 'Tag' }
});
function def(type, cfg) { cfg.type = type; P[type] = cfg; }
function geoMat(o, c) { const m = ENG.mat(o, c.project); if (o.props.emissive > 0) { m.emissive = new THREE.Color(o.props.color); m.emissiveIntensity = o.props.emissive; } return m; }
function blockBuild(o, c) { const [sx, sy, sz] = o.s; return solid(new THREE.Mesh(boxGeo(sx, sy, sz, o.props.tile), geoMat(o, c)), o.props); }
def('block', { label: 'Block', cat: 'Build', size: [2, 2, 2], props: GEO(), build: blockBuild });
def('floor', { label: 'Floor', cat: 'Build', size: [8, .2, 8], props: Object.assign(GEO(), { texture: { t: 'tex', d: 'tiles', l: 'Texture' }, color: { t: 'color', d: '#9aa3a8', l: 'Color' } }), build: blockBuild });
def('wall', { label: 'Wall', cat: 'Build', size: [6, 3, .3], props: Object.assign(GEO(), { texture: { t: 'tex', d: 'brick', l: 'Texture' }, color: { t: 'color', d: '#c9b8a6', l: 'Color' } }), build: blockBuild });
def('pillar', { label: 'Pillar', cat: 'Build', size: [.6, 3, .6], props: GEO(), build(o, c) { const [sx, sy] = o.s; let g = new THREE.CylinderGeometry(sx / 2, sx / 2, sy, 20); g.translate(0, sy / 2, 0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * sx / o.props.tile, uv.getY(i) * sy / o.props.tile); return solid(new THREE.Mesh(g, geoMat(o, c)), o.props); } });
def('sphere', { label: 'Sphere', cat: 'Build', size: [1, 1, 1], props: Object.assign(GEO(), { texture: { t: 'tex', d: 'none', l: 'Texture' } }), build(o, c) { const [sx, sy, sz] = o.s; const g = new THREE.SphereGeometry(.5, 24, 16); g.scale(sx, sy, sz); g.translate(0, sy / 2, 0); return solid(new THREE.Mesh(g, geoMat(o, c)), o.props); } });
def('ramp', { label: 'Ramp', cat: 'Build', size: [3, 1.5, 4], props: GEO(), build(o, c) { const [sx, sy, sz] = o.s; const sh = new THREE.Shape(); sh.moveTo(-.5, 0); sh.lineTo(.5, 0); sh.lineTo(-.5, 1); sh.closePath(); let g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -.5); g.rotateY(Math.PI / 2); g.scale(sx, sy, sz); g = planarUV(g, o.props.tile); const m = solid(new THREE.Mesh(g, geoMat(o, c)), o.props, true); m.userData.ramp = true; return m; } });
def('stairs', { label: 'Stairs', cat: 'Build', size: [2, 2, 4], props: Object.assign(GEO(), { steps: { t: 'num', d: 8, min: 2, max: 40, step: 1, l: 'Steps' } }), build(o, c) { const [sx, sy, sz] = o.s, n = Math.round(o.props.steps), grp = new THREE.Group(), mat = geoMat(o, c); for (let k = 0; k < n; k++) { const h = sy * (k + 1) / n, d = sz / n; const m = solid(new THREE.Mesh(boxGeo(sx, h, d, o.props.tile), mat), o.props); m.position.z = -sz / 2 + d * (k + .5); grp.add(m); } return grp; } });
def('terrain', { label: 'Terrain', cat: 'Build', size: [80, 6, 80], props: Object.assign(GEO(), { texture: { t: 'tex', d: 'grass', l: 'Texture' }, color: { t: 'color', d: '#9cb07a', l: 'Color' }, tile: { t: 'num', d: 4, min: .5, max: 32, step: .5, l: 'Texture size (m)' }, seed: { t: 'num', d: 7, min: 1, max: 99999, step: 1, l: 'Seed' }, detail: { t: 'num', d: 4, min: 1, max: 7, step: 1, l: 'Detail' }, bumpiness: { t: 'num', d: .04, min: .005, max: .2, step: .005, l: 'Feature size' }, flat: { t: 'num', d: 8, min: 0, max: 100, step: 1, l: 'Flat centre radius' } }), build(o, c) {
  const [sx, sy, sz] = o.s, p = o.props, es = Math.max(sx, sz) / 96, nx = Math.max(2, Math.round(sx / es)), nz = Math.max(2, Math.round(sz / es));
  const N = makeNoise(p.seed), H = (x, z) => { const fr = p.flat > 0 ? clamp((Math.hypot(x, z) - p.flat) / (p.flat + 4), 0, 1) : 1; return N(x * p.bumpiness + 50, z * p.bumpiness + 50, p.detail) * sy * fr * fr; };
  let g = new THREE.PlaneGeometry(nx * es, nz * es, nx, nz); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, H(pos.getX(i), pos.getZ(i)));
  g.computeVertexNormals(); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / p.tile, pos.getZ(i) / p.tile);
  const m = solid(new THREE.Mesh(g, geoMat(o, c)), p, true); m.castShadow = false; m.userData.terrain = { H, es, nx, nz }; return m;
} });

def('player_start', { label: 'Player start', cat: 'Gameplay', size: [1, 1, 1], props: {}, build(o, c) {
  const g = new THREE.Group(); if (!c.editor) return g;
  const body = editorOnly(new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 1.8, 16), helperMat('#4cc3b8', .55))); body.position.y = .9; g.add(body);
  const arrow = editorOnly(new THREE.Mesh(new THREE.ConeGeometry(.25, .6, 12), helperMat('#4cc3b8', .9))); arrow.rotation.x = -Math.PI / 2; arrow.position.set(0, 1.5, -.6); g.add(arrow); return g;
} });
def('door', { label: 'Door', cat: 'Gameplay', size: [2, 3, .2], props: { color: { t: 'color', d: '#6f7a84', l: 'Color' }, texture: { t: 'tex', d: 'metal', l: 'Texture' }, tile: { t: 'num', d: 2, min: .25, max: 16, step: .25, l: 'Texture size (m)' }, motion: { t: 'sel', d: 'slide up', o: ['slide up', 'slide sideways', 'swing'], l: 'Motion' }, opens: { t: 'sel', d: 'press E', o: ['press E', 'walk near', 'remote only'], l: 'Opens by' }, speed: { t: 'num', d: 1.5, min: .1, max: 10, step: .1, l: 'Speed' }, autoClose: { t: 'num', d: 0, min: 0, max: 60, step: .5, l: 'Auto close after (s)' }, locked: { t: 'bool', d: false, l: 'Locked' }, key: { t: 'text', d: '', l: 'Key needed' }, startOpen: { t: 'bool', d: false, l: 'Starts open' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const [sx, sy, sz] = o.s, g = new THREE.Group(), hinge = new THREE.Group(); g.add(hinge);
  const m = solid(new THREE.Mesh(boxGeo(sx, sy, sz, o.props.tile), ENG.mat(o, c.project, { metalness: .15, roughness: .6 })), {});
  if (o.props.motion === 'swing') { hinge.position.x = -sx / 2; m.position.x = sx / 2; }
  m.userData.door = true; hinge.add(m); g.userData.hinge = hinge; g.userData.leaf = m;
  if (c.editor && o.props.locked) { const l = editorOnly(new THREE.Mesh(new THREE.BoxGeometry(.25, .25, sz + .1), helperMat('#e5534b', .9))); l.position.set(0, sy * .55, 0); g.add(l); }
  return g;
} });
def('glass', { label: 'Glass window', cat: 'Gameplay', size: [3, 2, .08], props: { tint: { t: 'color', d: '#a8d8ea', l: 'Tint' }, opacity: { t: 'num', d: .3, min: .05, max: 1, step: .05, l: 'Opacity' }, strength: { t: 'num', d: 20, min: 1, max: 500, step: 1, l: 'Strength' }, shards: { t: 'num', d: 18, min: 4, max: 60, step: 1, l: 'Shards' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const [sx, sy, sz] = o.s; const m = solid(new THREE.Mesh(boxGeo(sx, sy, sz, 2), new THREE.MeshStandardMaterial({ color: o.props.tint, transparent: true, opacity: o.props.opacity, roughness: .05, metalness: .2, depthWrite: false })), {});
  m.castShadow = false; m.userData.glass = true; return m;
} });
const ACTIONS = ['none', 'open door', 'close door', 'toggle door', 'play cutscene', 'show message', 'set objective', 'play sound', 'spawn enemies', 'damage player', 'heal player', 'give item', 'teleport player', 'save checkpoint', 'end level (win)', 'end level (lose)'];
ENG.ACTIONS = ACTIONS;
def('trigger', { label: 'Trigger zone', cat: 'Gameplay', size: [3, 3, 3], props: { when: { t: 'sel', d: 'player enters', o: ['player enters', 'player leaves', 'level starts'], l: 'When' }, action: { t: 'sel', d: 'show message', o: ACTIONS, l: 'Do' }, target: { t: 'text', d: '', l: 'Target (tag / name)' }, cutscene: { t: 'cutscene', d: '', l: 'Cutscene' }, sound: { t: 'sound', d: 'preset:pickup', l: 'Sound' }, text: { t: 'area', d: 'Something moved in the dark.', l: 'Text' }, amount: { t: 'num', d: 25, min: 0, max: 1000, step: 1, l: 'Amount' }, item: { t: 'sel', d: 'shotgun', o: ['pistol', 'shotgun', 'rifle', 'ammo', 'armor', 'key'], l: 'Item' }, activates: { t: 'text', d: '', l: 'Also activates tag' }, delay: { t: 'num', d: 0, min: 0, max: 120, step: .1, l: 'Delay (s)' }, once: { t: 'bool', d: true, l: 'Only once' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const g = new THREE.Group(); if (!c.editor) return g; const [sx, sy, sz] = o.s;
  const b = editorOnly(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), helperMat('#f0b43c', .12))); b.position.y = sy / 2; g.add(b);
  const e = editorOnly(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(sx, sy, sz)), new THREE.LineBasicMaterial({ color: '#f0b43c' }))); e.position.y = sy / 2; g.add(e); return g;
} });
def('switch', { label: 'Switch / remote', cat: 'Gameplay', size: [.4, .6, .12], props: { activates: { t: 'text', d: '', l: 'Activates tag' }, prompt: { t: 'text', d: 'Use switch', l: 'Prompt' }, once: { t: 'bool', d: false, l: 'Only once' }, color: { t: 'color', d: '#e5534b', l: 'Button color' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const [sx, sy, sz] = o.s, g = new THREE.Group();
  const plate = solid(new THREE.Mesh(boxGeo(sx, sy, sz, 1), new THREE.MeshStandardMaterial({ color: '#3a4048', metalness: .6, roughness: .4 })), {}); plate.position.y = 1.1; g.add(plate);
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(sx * .22, sx * .22, sz * .8, 16), new THREE.MeshStandardMaterial({ color: o.props.color, emissive: o.props.color, emissiveIntensity: .6 })); btn.rotation.x = Math.PI / 2; btn.position.set(0, 1.1 + sy / 2, sz * .6); g.add(btn); g.userData.btn = btn; plate.userData.use = true; btn.userData.use = true; return g;
} });
def('enemy', { label: 'Enemy', cat: 'Characters', size: [1, 1, 1], props: { ai: { t: 'sel', d: 'patrol', o: ['patrol', 'guard', 'wander', 'hunter'], l: 'Behaviour' }, attack: { t: 'sel', d: 'ranged', o: ['ranged', 'melee'], l: 'Attack' }, health: { t: 'num', d: 100, min: 1, max: 5000, step: 5, l: 'Health' }, speed: { t: 'num', d: 3, min: .5, max: 12, step: .1, l: 'Speed' }, damage: { t: 'num', d: 8, min: 0, max: 200, step: 1, l: 'Damage' }, fireRate: { t: 'num', d: 1.2, min: .1, max: 10, step: .1, l: 'Attacks per second' }, accuracy: { t: 'num', d: .55, min: 0, max: 1, step: .05, l: 'Accuracy' }, sight: { t: 'num', d: 20, min: 2, max: 120, step: 1, l: 'Sight range' }, radius: { t: 'num', d: 8, min: 1, max: 80, step: 1, l: 'Patrol radius' }, height: { t: 'num', d: 1.8, min: .5, max: 6, step: .05, l: 'Height' }, skin: { t: 'skin', d: 'default', l: 'Skin' }, model: { t: 'asset', d: '', l: 'Custom model (optional)' }, dormant: { t: 'bool', d: false, l: 'Hidden until activated' }, drop: { t: 'sel', d: 'none', o: ['none', 'health', 'ammo', 'armor', 'shotgun', 'rifle', 'key'], l: 'Drops' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const p = o.props, g = new THREE.Group();
  const asset = p.model && c.project.assets.models[p.model];
  if (asset && ENG.modelScenes[asset.id]) { const h = new THREE.Group(); const oo = { s: [1, 1, 1], props: { ground: true, collide: false, scale: 1 } }; placeModel(h, asset, oo, c); const b = new THREE.Box3().setFromObject(h); const k = p.height / Math.max(.01, b.max.y - b.min.y); h.scale.setScalar(k); g.add(h); g.userData.model = h.userData.model; g.userData.clips = h.userData.clips; g.userData.custom = true; }
  else { const hum = ENG.buildHumanoid(p.skin, { height: p.height, gun: p.attack === 'ranged' }); g.add(hum); g.userData.parts = hum.userData.parts; g.userData.mats = hum.userData.mats; }
  return g;
} });
def('crate', { label: 'Crate', cat: 'Props', size: [1, 1, 1], props: { color: { t: 'color', d: '#c8a46a', l: 'Color' }, texture: { t: 'tex', d: 'wood', l: 'Texture' }, tile: { t: 'num', d: 1, min: .25, max: 8, step: .25, l: 'Texture size (m)' }, mass: { t: 'num', d: 15, min: .1, max: 500, step: 1, l: 'Mass (kg)' }, breakable: { t: 'bool', d: true, l: 'Breakable' }, health: { t: 'num', d: 40, min: 1, max: 1000, step: 1, l: 'Health' }, drop: { t: 'sel', d: 'none', o: ['none', 'health', 'ammo', 'armor'], l: 'Drops' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) { const [sx, sy, sz] = o.s; const m = solid(new THREE.Mesh(boxGeo(sx, sy, sz, o.props.tile), ENG.mat(o, c.project)), {}); return m; } });
def('barrel', { label: 'Explosive barrel', cat: 'Props', size: [.7, 1.1, .7], props: { color: { t: 'color', d: '#b8352b', l: 'Color' }, radius: { t: 'num', d: 5, min: 1, max: 30, step: .5, l: 'Blast radius' }, damage: { t: 'num', d: 90, min: 0, max: 1000, step: 5, l: 'Blast damage' }, health: { t: 'num', d: 20, min: 1, max: 500, step: 1, l: 'Health' }, mass: { t: 'num', d: 30, min: 1, max: 500, step: 1, l: 'Mass (kg)' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const [sx, sy] = o.s, g = new THREE.CylinderGeometry(sx / 2, sx / 2, sy, 18); g.translate(0, sy / 2, 0);
  const m = solid(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: o.props.color, roughness: .5, metalness: .35 })), {});
  const band = new THREE.Mesh(new THREE.CylinderGeometry(sx / 2 + .01, sx / 2 + .01, sy * .14, 18), new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: .5 })); band.position.y = sy * .62; m.add(band); return m;
} });
const PICKS = { health: '#e8e8e8', ammo: '#6b7340', armor: '#3d7fd6', pistol: '#30343a', shotgun: '#5a3d26', rifle: '#2d3a2a', key: '#f0b43c' };
def('pickup', { label: 'Pickup', cat: 'Props', size: [1, 1, 1], props: { kind: { t: 'sel', d: 'health', o: Object.keys(PICKS), l: 'Item' }, amount: { t: 'num', d: 25, min: 1, max: 500, step: 1, l: 'Amount' }, key: { t: 'text', d: 'red key', l: 'Key name' }, respawn: { t: 'num', d: 0, min: 0, max: 300, step: 1, l: 'Respawn after (s), 0 = never' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const k = o.props.kind, g = new THREE.Group(), spin = new THREE.Group(); spin.position.y = .5; g.add(spin); g.userData.spin = spin;
  const M = col => new THREE.MeshStandardMaterial({ color: col, roughness: .5, metalness: .2, emissive: col, emissiveIntensity: .15 });
  const add = (geo, col, x, y, z) => { const m = new THREE.Mesh(geo, M(col)); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; spin.add(m); return m; };
  if (k === 'health') { add(new THREE.BoxGeometry(.5, .35, .35), '#e8e8e8'); add(new THREE.BoxGeometry(.3, .1, .37), '#d33'); add(new THREE.BoxGeometry(.1, .3, .37), '#d33'); }
  else if (k === 'ammo') { add(new THREE.BoxGeometry(.45, .3, .3), '#6b7340'); add(new THREE.BoxGeometry(.3, .06, .31), '#f0b43c', 0, .1); }
  else if (k === 'armor') { add(new THREE.BoxGeometry(.45, .5, .2), '#3d7fd6'); add(new THREE.BoxGeometry(.2, .2, .22), '#9fc3f0', 0, .08); }
  else if (k === 'key') { const t = add(new THREE.TorusGeometry(.12, .04, 8, 16), '#f0b43c', 0, .1); add(new THREE.BoxGeometry(.05, .3, .05), '#f0b43c', 0, -.13); }
  else { const len = k === 'pistol' ? .35 : .8; add(new THREE.BoxGeometry(.08, .12, len), PICKS[k]); add(new THREE.BoxGeometry(.07, .18, .08), '#222', 0, -.1, len * .2); }
  if (c.editor) { const ring = editorOnly(new THREE.Mesh(new THREE.TorusGeometry(.45, .02, 6, 24), helperMat('#4cc3b8', .7))); ring.rotation.x = Math.PI / 2; ring.position.y = .05; g.add(ring); }
  return g;
} });
def('light', { label: 'Light', cat: 'Lights & FX', size: [1, 1, 1], props: { color: { t: 'color', d: '#ffd7a0', l: 'Color' }, intensity: { t: 'num', d: 1.6, min: 0, max: 20, step: .1, l: 'Brightness' }, range: { t: 'num', d: 12, min: 1, max: 100, step: .5, l: 'Range' }, flicker: { t: 'bool', d: false, l: 'Flicker' }, shadows: { t: 'bool', d: false, l: 'Cast shadows (costly)' }, startOn: { t: 'bool', d: true, l: 'Starts on' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const g = new THREE.Group(), L = new THREE.PointLight(o.props.color, o.props.startOn || c.editor ? o.props.intensity : 0, o.props.range, 1.6);
  if (o.props.shadows && !c.editor) { L.castShadow = true; L.shadow.mapSize.set(512, 512); L.shadow.bias = -.004; }
  g.add(L); g.userData.light = L;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8), new THREE.MeshBasicMaterial({ color: o.props.color })); if (c.editor || o.props.fixture) g.add(bulb); g.userData.bulb = bulb;
  if (c.editor) { const r = editorOnly(new THREE.Mesh(new THREE.OctahedronGeometry(.3), new THREE.MeshBasicMaterial({ color: o.props.color, wireframe: true }))); g.add(r); }
  return g;
} });
def('spotlight', { label: 'Spotlight', cat: 'Lights & FX', size: [1, 1, 1], props: { color: { t: 'color', d: '#e8f1ff', l: 'Color' }, intensity: { t: 'num', d: 3, min: 0, max: 30, step: .1, l: 'Brightness' }, range: { t: 'num', d: 20, min: 1, max: 100, step: .5, l: 'Range' }, angle: { t: 'num', d: 30, min: 5, max: 80, step: 1, l: 'Cone angle' }, flicker: { t: 'bool', d: false, l: 'Flicker' }, shadows: { t: 'bool', d: true, l: 'Cast shadows' }, startOn: { t: 'bool', d: true, l: 'Starts on' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const g = new THREE.Group(), L = new THREE.SpotLight(o.props.color, o.props.startOn || c.editor ? o.props.intensity : 0, o.props.range, o.props.angle * D2R, .4, 1.4);
  L.position.set(0, 0, 0); L.target.position.set(0, -1, -.0001); g.add(L); g.add(L.target);
  if (o.props.shadows && !c.editor) { L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -.002; }
  g.userData.light = L; const lamp = new THREE.Mesh(new THREE.ConeGeometry(.18, .3, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#333', side: THREE.DoubleSide })); lamp.position.y = .1; if (c.editor || o.props.fixture) g.add(lamp);
  if (c.editor) { const cone = editorOnly(new THREE.Mesh(new THREE.ConeGeometry(Math.tan(o.props.angle * D2R) * 2, 2, 16, 1, true), new THREE.MeshBasicMaterial({ color: o.props.color, wireframe: true, transparent: true, opacity: .3 }))); cone.position.y = -1; g.add(cone); }
  return g;
} });
def('emitter', { label: 'Particles', cat: 'Lights & FX', size: [1, 1, 1], props: { kind: { t: 'sel', d: 'fire', o: ['fire', 'smoke', 'sparks', 'steam', 'dust'], l: 'Effect' }, rate: { t: 'num', d: 40, min: 1, max: 400, step: 1, l: 'Particles per second' }, spread: { t: 'num', d: .3, min: 0, max: 5, step: .05, l: 'Spread' }, startOn: { t: 'bool', d: true, l: 'Starts on' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) { const g = new THREE.Group(); if (c.editor) { const m = editorOnly(new THREE.Mesh(new THREE.TetrahedronGeometry(.3), new THREE.MeshBasicMaterial({ color: '#f0b43c', wireframe: true }))); m.position.y = .3; g.add(m); } return g; } });
def('speaker', { label: 'Sound emitter', cat: 'Lights & FX', size: [1, 1, 1], props: { sound: { t: 'sound', d: 'preset:ambience', l: 'Sound' }, volume: { t: 'num', d: .8, min: 0, max: 2, step: .05, l: 'Volume' }, radius: { t: 'num', d: 18, min: 0, max: 200, step: 1, l: 'Hearing radius (0 = everywhere)' }, loop: { t: 'bool', d: true, l: 'Loop' }, autoplay: { t: 'bool', d: true, l: 'Plays on start' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) { const g = new THREE.Group(); if (c.editor) { const m = editorOnly(new THREE.Mesh(new THREE.ConeGeometry(.25, .4, 10), helperMat('#4cc3b8', .8))); m.rotation.z = Math.PI / 2; m.position.y = .3; g.add(m); } return g; } });
def('sign', { label: 'Text sign', cat: 'Lights & FX', size: [3, 1, .05], props: { text: { t: 'area', d: 'EXIT', l: 'Text' }, color: { t: 'color', d: '#f0f4f6', l: 'Text color' }, bg: { t: 'color', d: '#1c3a2c', l: 'Background' }, transparent: { t: 'bool', d: false, l: 'No background' }, glow: { t: 'bool', d: true, l: 'Glows' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) { const [sx, sy] = o.s, p = o.props; const t = textSprite(p.text, p.color, p.transparent ? 'transparent' : p.bg, sx, sy); const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sy), p.glow ? new THREE.MeshBasicMaterial({ map: t, transparent: p.transparent, side: THREE.DoubleSide, toneMapped: false, color: new THREE.Color(2, 2, 2) }) : new THREE.MeshStandardMaterial({ map: t, transparent: p.transparent, side: THREE.DoubleSide })); m.position.y = sy / 2; return m; } });
def('model', { label: 'Imported model', cat: 'Imported', size: [1, 1, 1], props: { asset: { t: 'asset', d: '', l: 'Model file' }, scale: { t: 'num', d: 1, min: .001, max: 1000, step: .01, l: 'Import scale' }, tint: { t: 'color', d: '#ffffff', l: 'Tint' }, ground: { t: 'bool', d: true, l: 'Sit on ground' }, collide: { t: 'bool', d: true, l: 'Solid' }, solidMode: { t: 'sel', d: 'solid', o: ['solid', 'walk only'], l: 'Collision' }, physics: { t: 'sel', d: 'static', o: ['static', 'dynamic'], l: 'Physics' }, mass: { t: 'num', d: 20, min: .1, max: 2000, step: 1, l: 'Mass (kg)' }, anim: { t: 'text', d: '', l: 'Animation to loop (name, blank = first)' }, playAnim: { t: 'bool', d: true, l: 'Play animation' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const g = new THREE.Group(), a = o.props.asset && c.project.assets.models[o.props.asset];
  if (a && placeModel(g, a, o, c)) return g;
  const ph = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#f0b43c', wireframe: true })); ph.position.y = .5; g.add(ph);
  if (a) ENG.loadModel(a).then(() => { if (c.onAsync) c.onAsync(o); });
  return g;
} });
ENG.CATS = ['Build', 'Gameplay', 'Characters', 'Props', 'Lights & FX', 'Imported'];

ENG.fillProps = function (o) { const pf = P[o.type]; if (!pf) return o; o.props = o.props || {}; for (const k in pf.props) if (o.props[k] === undefined) o.props[k] = pf.props[k].d; if (!o.s) o.s = (pf.size || [1, 1, 1]).slice(); if (!o.r) o.r = [0, 0, 0]; return o; };
ENG.newObject = function (type, pos) { const pf = P[type]; const o = { id: ENG.uid(), type, name: pf.label, p: pos ? [pos.x, pos.y, pos.z] : [0, 0, 0], r: [0, 0, 0], s: (pf.size || [1, 1, 1]).slice(), props: {} }; return ENG.fillProps(o); };
ENG.build = function (o, ctx) {
  const root = new THREE.Group(); root.userData.ent = o; const pf = P[o.type]; if (!pf) return root; ENG.fillProps(o);
  const inner = pf.build(o, ctx); if (inner) { root.add(inner); ['hinge', 'leaf', 'btn', 'spin', 'light', 'bulb', 'parts', 'mats', 'model', 'clips', 'custom'].forEach(k => { if (inner.userData[k] !== undefined) root.userData[k] = inner.userData[k]; }); }
  root.position.fromArray(o.p); root.rotation.set(o.r[0] * D2R, o.r[1] * D2R, o.r[2] * D2R); return root;
};

/* ---------------- sound synthesis ---------------- */
ENG.SOUND_PRESETS = {
  pistol: { wave: 'noise', freq: 900, slide: -3, attack: 0, sustain: .03, decay: .2, lowpass: .55, volume: .6 },
  shotgun: { wave: 'noise', freq: 420, slide: -2, attack: 0, sustain: .06, decay: .42, lowpass: .45, volume: .8 },
  rifle: { wave: 'noise', freq: 1300, slide: -4, attack: 0, sustain: .02, decay: .13, lowpass: .6, volume: .5 },
  punch: { wave: 'noise', freq: 260, slide: -2, attack: 0, sustain: .01, decay: .1, lowpass: .4, volume: .5 },
  enemyShot: { wave: 'noise', freq: 700, slide: -3, attack: 0, sustain: .03, decay: .16, lowpass: .45, volume: .45 },
  explosion: { wave: 'noise', freq: 160, slide: -1.4, attack: 0, sustain: .15, decay: 1.1, lowpass: .32, volume: .95 },
  glass: { wave: 'noise', freq: 4800, slide: -.6, attack: 0, sustain: .04, decay: .5, lowpass: .95, volume: .45, vib: .5, vibSpeed: 37 },
  door: { wave: 'saw', freq: 62, slide: .25, attack: .05, sustain: .45, decay: .3, lowpass: .22, volume: .4, vib: .06, vibSpeed: 11 },
  pickup: { wave: 'square', freq: 660, slide: 2.2, attack: 0, sustain: .05, decay: .14, lowpass: 1, volume: .3 },
  hurt: { wave: 'saw', freq: 280, slide: -2.5, attack: 0, sustain: .05, decay: .2, lowpass: .55, volume: .5 },
  enemyHurt: { wave: 'square', freq: 210, slide: -2, attack: 0, sustain: .04, decay: .16, lowpass: .5, volume: .4 },
  enemyDie: { wave: 'saw', freq: 180, slide: -1.5, attack: 0, sustain: .1, decay: .5, lowpass: .4, volume: .45, vib: .1, vibSpeed: 14 },
  step: { wave: 'noise', freq: 160, slide: -1, attack: 0, sustain: 0, decay: .07, lowpass: .2, volume: .22 },
  jump: { wave: 'square', freq: 240, slide: 1.6, attack: 0, sustain: .03, decay: .1, lowpass: .7, volume: .22 },
  reload: { wave: 'square', freq: 380, slide: -1, attack: 0, sustain: .02, decay: .07, lowpass: .8, volume: .3, crush: .5 },
  click: { wave: 'square', freq: 1000, slide: 0, attack: 0, sustain: .01, decay: .03, lowpass: 1, volume: .2 },
  win: { wave: 'triangle', freq: 440, slide: 1, attack: .01, sustain: .3, decay: .6, lowpass: 1, volume: .4, vib: .03, vibSpeed: 6 },
  alarm: { wave: 'square', freq: 520, slide: 0, attack: .01, sustain: .5, decay: .1, lowpass: .6, volume: .3, vib: .25, vibSpeed: 3 },
  ambience: { wave: 'noise', freq: 50, slide: 0, attack: 1, sustain: 4, decay: 1, lowpass: .06, volume: .5 },
  drone: { wave: 'saw', freq: 55, slide: 0, attack: 1.5, sustain: 4, decay: 1.5, lowpass: .12, volume: .35, vib: .01, vibSpeed: .3 }
};
ENG.SLOTS = { pistol: 'Pistol shot', shotgun: 'Shotgun shot', rifle: 'Rifle shot', punch: 'Punch', enemyShot: 'Enemy shot', explosion: 'Explosion', glass: 'Glass break', door: 'Door move', pickup: 'Pickup', hurt: 'Player hurt', enemyHurt: 'Enemy hurt', enemyDie: 'Enemy death', step: 'Footstep', jump: 'Jump', reload: 'Reload', win: 'Level complete' };
ENG.synth = function (p, sr) {
  sr = sr || 44100; const A = p.attack || 0, Su = p.sustain || 0, De = p.decay || 0.001;
  const n = Math.max(1, Math.ceil((A + Su + De) * sr)), out = new Float32Array(n);
  let ph = 0, lp = 0, nz = 0; const cut = Math.pow(clamp(p.lowpass == null ? 1 : p.lowpass, .01, 1), 2), vol = p.volume == null ? .5 : p.volume;
  for (let i = 0; i < n; i++) {
    const t = i / sr; let f = p.freq * Math.pow(2, (p.slide || 0) * t); if (p.vib) f *= 1 + p.vib * Math.sin(2 * Math.PI * (p.vibSpeed || 0) * t); f = clamp(f, 10, 20000);
    ph += (p.wave === 'noise' ? f * 8 : f) / sr; if (ph >= 1) { ph -= Math.floor(ph); nz = Math.random() * 2 - 1; }
    let s; switch (p.wave) { case 'sine': s = Math.sin(2 * Math.PI * ph); break; case 'saw': s = 2 * ph - 1; break; case 'triangle': s = 1 - 4 * Math.abs(ph - .5); break; case 'noise': s = nz; break; default: s = ph < (p.duty || .5) ? 1 : -1; }
    let e; if (t < A) e = t / A; else if (t < A + Su) e = 1; else e = Math.max(0, 1 - (t - A - Su) / De);
    lp += (s - lp) * cut; s = lp; if (p.crush > 0) { const q = Math.pow(2, Math.round(8 - p.crush * 6)); s = Math.round(s * q) / q; }
    out[i] = s * e * vol;
  }
  return out;
};
ENG.dataToBuffer = function (url) { const b64 = url.slice(url.indexOf(',') + 1), bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
ENG.soundOptions = function (project) {
  const o = [['', 'None']]; Object.keys(ENG.SOUND_PRESETS).forEach(k => o.push(['preset:' + k, 'Built-in: ' + k]));
  Object.entries(project.sounds || {}).forEach(([id, s]) => o.push([id, 'Made: ' + s.name]));
  Object.entries(project.assets.audio || {}).forEach(([id, s]) => o.push(['file:' + id, 'File: ' + s.name]));
  return o;
};
ENG.AudioEngine = class {
  constructor(project) { this.project = project; this.ctx = null; this.buf = {}; this.loops = []; this.cam = null; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx; this.master = c.createGain(); this.master.connect(c.destination); this.bus = {};
    ['sfx', 'music', 'ambient', 'ui'].forEach(b => { const g = c.createGain(); g.connect(this.master); this.bus[b] = g; }); this.applyMix();
  }
  applyMix() { if (!this.ctx) return; const m = this.project.mixer || {}, mu = m.mute || {}; this.master.gain.value = mu.master ? 0 : (m.master == null ? 1 : m.master); for (const b in this.bus) this.bus[b].gain.value = mu[b] ? 0 : (m[b] == null ? 1 : m[b]); }
  resolve(ref) {
    if (!ref) return null; const pr = this.project;
    if (pr.slots && pr.slots[ref]) ref = pr.slots[ref];
    else if (ENG.SOUND_PRESETS[ref]) ref = 'preset:' + ref;
    if (ref.indexOf('preset:') === 0) { const k = ref.slice(7); const p = ENG.SOUND_PRESETS[k]; return p ? { key: ref, params: p, bus: k === 'ambience' || k === 'drone' ? 'ambient' : 'sfx' } : null; }
    if (ref.indexOf('file:') === 0) { const a = pr.assets.audio[ref.slice(5)]; return a ? { key: ref, file: a.data, bus: a.bus || 'sfx' } : null; }
    const s = pr.sounds && pr.sounds[ref]; return s ? { key: ref + ':' + (s.v || 0), params: s.params, bus: s.bus || 'sfx' } : null;
  }
  buffer(r) {
    if (this.buf[r.key]) return this.buf[r.key];
    if (r.params) { const d = ENG.synth(r.params, this.ctx.sampleRate); const b = this.ctx.createBuffer(1, d.length, this.ctx.sampleRate); b.getChannelData(0).set(d); this.buf[r.key] = b; return b; }
    const pr = new Promise((res, rej) => { try { this.ctx.decodeAudioData(ENG.dataToBuffer(r.file), res, rej); } catch (e) { rej(e); } }).then(b => { this.buf[r.key] = b; return b; }).catch(() => null);
    this.buf[r.key] = pr; return pr;
  }
  play(ref, o) {
    o = o || {}; this.init(); if (!this.ctx) return null; const r = this.resolve(ref); if (!r) return null;
    const b = this.buffer(r); const h = { stopped: false, pos: o.pos ? o.pos.clone() : null, radius: o.radius == null ? 30 : o.radius, vol: o.volume == null ? 1 : o.volume };
    const start = buf => { if (!buf || h.stopped) return; const c = this.ctx, src = c.createBufferSource(); src.buffer = buf; src.loop = !!o.loop; const bus = o.bus || r.bus; src.playbackRate.value = (o.rate || 1) * (bus === 'music' || bus === 'ui' || o.loop ? 1 : (this.timeRate || 1)); const g = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null; src.connect(g); if (pan) { g.connect(pan); pan.connect(this.bus[o.bus || r.bus] || this.bus.sfx); } else g.connect(this.bus[o.bus || r.bus] || this.bus.sfx); h.src = src; h.g = g; h.pan = pan; this.spatial(h); src.start(); if (o.loop) this.loops.push(h); src.onended = () => { h.ended = true; }; };
    if (b && b.then) b.then(start); else start(b); return h;
  }
  spatial(h) {
    if (!h.g) return; let v = h.vol, pn = 0;
    if (h.pos && this.cam && h.radius > 0) { const d = h.pos.distanceTo(this.cam.position); v *= Math.pow(clamp(1 - d / h.radius, 0, 1), 1.6); const dir = h.pos.clone().sub(this.cam.position).normalize(); const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.cam.quaternion); pn = clamp(dir.dot(right), -1, 1) * .8; }
    h.g.gain.value = v; if (h.pan) h.pan.pan.value = pn;
  }
  stop(h) { if (!h) return; h.stopped = true; try { h.src && h.src.stop(); } catch (e) { } this.loops = this.loops.filter(x => x !== h); }
  update(cam) { this.cam = cam; this.loops.forEach(h => this.spatial(h)); }
  dispose() { this.loops.forEach(h => this.stop(h)); if (this.ctx) this.ctx.close(); this.ctx = null; }
};

/* ---------------- particles ---------------- */
function dotTex() { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); }
ENG.Particles = class {
  constructor(scene, max, size, additive) {
    max = max || 3000; this.max = max; this.n = 0; const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.base = new Float32Array(max * 3); this.life = new Float32Array(max); this.ml = new Float32Array(max); this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: size || .2, vertexColors: true, transparent: true, depthWrite: false, blending: additive === false ? THREE.NormalBlending : THREE.AdditiveBlending, map: dotTex() }));
    this.points.frustumCulled = false; scene.add(this.points); this.geo = g;
  }
  spawn(p, count, o) {
    const c = new THREE.Color(o.color || '#ffaa44');
    for (let k = 0; k < count && this.n < this.max; k++) {
      const i = this.n++, s = o.speed || 2, sp = o.spread == null ? 1 : o.spread;
      this.pos[i * 3] = p.x + rand(-1, 1) * (o.jitter || 0); this.pos[i * 3 + 1] = p.y + rand(-1, 1) * (o.jitter || 0); this.pos[i * 3 + 2] = p.z + rand(-1, 1) * (o.jitter || 0);
      let vx = rand(-1, 1) * sp, vy = rand(-1, 1) * sp, vz = rand(-1, 1) * sp; if (o.dir) { vx += o.dir.x; vy += o.dir.y; vz += o.dir.z; }
      this.vel[i * 3] = vx * s; this.vel[i * 3 + 1] = vy * s + (o.up || 0); this.vel[i * 3 + 2] = vz * s;
      const v = o.vary || 0; this.base[i * 3] = c.r * (1 - Math.random() * v); this.base[i * 3 + 1] = c.g * (1 - Math.random() * v); this.base[i * 3 + 2] = c.b * (1 - Math.random() * v);
      this.ml[i] = this.life[i] = (o.life || .6) * rand(.6, 1.2); this.grav[i] = o.gravity || 0; this.drag[i] = o.drag || 0;
    }
  }
  update(dt) {
    for (let i = 0; i < this.n;) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { const j = --this.n; if (i !== j) { for (let a = 0; a < 3; a++) { this.pos[i * 3 + a] = this.pos[j * 3 + a]; this.vel[i * 3 + a] = this.vel[j * 3 + a]; this.base[i * 3 + a] = this.base[j * 3 + a]; } this.life[i] = this.life[j]; this.ml[i] = this.ml[j]; this.grav[i] = this.grav[j]; this.drag[i] = this.drag[j]; } continue; }
      const k = 1 - this.drag[i] * dt; this.vel[i * 3] *= k; this.vel[i * 3 + 2] *= k; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k - this.grav[i] * dt;
      for (let a = 0; a < 3; a++) this.pos[i * 3 + a] += this.vel[i * 3 + a] * dt;
      const f = this.life[i] / this.ml[i]; for (let a = 0; a < 3; a++) this.col[i * 3 + a] = this.base[i * 3 + a] * f;
      i++;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true; this.geo.setDrawRange(0, this.n);
  }
};
const FX = {
  fire: { color: '#ff8a2a', speed: .4, spread: .6, up: 1.6, life: .9, vary: .4 },
  smoke: { color: '#55524e', speed: .3, spread: .5, up: 1, life: 2.4, drag: .3 },
  sparks: { color: '#ffd27a', speed: 3, spread: 1, up: 2, life: .6, gravity: 9 },
  steam: { color: '#9aa6ad', speed: .5, spread: .3, up: 2.5, life: 1.4, drag: .5 },
  dust: { color: '#4a4339', speed: .12, spread: 1, up: .04, life: 4, jitter: 1.2 }
};

/* ---------------- HUD ---------------- */
ENG.HUD_KINDS = { health: 'Health bar', armor: 'Armor bar', ammo: 'Ammo counter', crosshair: 'Crosshair', objective: 'Objective', messages: 'Messages and subtitles', text: 'Custom text', weapon: 'Weapon name', enemies: 'Enemies left', keys: 'Keys held', timer: 'Timer', compass: 'Compass' };
ENG.HUD_PROPS = {
  common: { x: ['num', 0, 100, .5, 'X (%)'], y: ['num', 0, 100, .5, 'Y (%)'], scale: ['num', .3, 4, .05, 'Size'], color: ['color', 'Color'], opacity: ['num', 0, 1, .05, 'Opacity'], font: ['sel', ['Chakra Petch', 'Barlow', 'monospace', 'Georgia'], 'Font'] },
  health: { label: ['text', 'Label'], width: ['num', 60, 600, 5, 'Bar width'] }, armor: { label: ['text', 'Label'], width: ['num', 60, 600, 5, 'Bar width'] },
  crosshair: { style: ['sel', ['cross', 'dot', 'circle', 'brackets'], 'Style'] }, text: { text: ['area', 'Text'] }, objective: { label: ['text', 'Label'] }, enemies: { label: ['text', 'Label'] }, timer: { label: ['text', 'Label'] }
};
ENG.defaultHUD = () => [
  { id: ENG.uid(), kind: 'health', x: 14, y: 92, scale: 1, color: '#e8574e', opacity: 1, font: 'Chakra Petch', label: 'Health', width: 220 },
  { id: ENG.uid(), kind: 'bullettime', x: 14, y: 80, scale: .8, color: '#f0b43c', opacity: 1, font: 'Chakra Petch', label: 'Bullet time', width: 220 },
  { id: ENG.uid(), kind: 'armor', x: 14, y: 86, scale: .8, color: '#4f9be8', opacity: 1, font: 'Chakra Petch', label: 'Armor', width: 220 },
  { id: ENG.uid(), kind: 'ammo', x: 90, y: 91, scale: 1, color: '#f2efe6', opacity: 1, font: 'Chakra Petch' },
  { id: ENG.uid(), kind: 'weapon', x: 90, y: 84, scale: .8, color: '#c7d0d6', opacity: 1, font: 'Chakra Petch' },
  { id: ENG.uid(), kind: 'crosshair', x: 50, y: 50, scale: 1, color: '#ffffff', opacity: .85, font: 'Chakra Petch', style: 'cross' },
  { id: ENG.uid(), kind: 'objective', x: 16, y: 6, scale: .9, color: '#f0d27a', opacity: 1, font: 'Chakra Petch', label: 'Objective' },
  { id: ENG.uid(), kind: 'messages', x: 50, y: 72, scale: 1, color: '#ffffff', opacity: 1, font: 'Barlow' },
  { id: ENG.uid(), kind: 'compass', x: 50, y: 5, scale: .9, color: '#e8eef0', opacity: .9, font: 'Chakra Petch' }
];
ENG.buildHUD = function (root, hud) {
  root.innerHTML = ''; const els = [];
  (hud || []).forEach(w => {
    const d = document.createElement('div'); d.className = 'kz-w kz-' + w.kind; d.dataset.id = w.id;
    d.style.left = w.x + '%'; d.style.top = w.y + '%'; d.style.transform = `translate(-50%,-50%) scale(${w.scale})`; d.style.color = w.color; d.style.opacity = w.opacity == null ? 1 : w.opacity; d.style.fontFamily = `"${w.font || 'Chakra Petch'}", sans-serif`;
    let ref = {};
    if (w.kind === 'health' || w.kind === 'armor' || w.kind === 'bullettime') { d.innerHTML = `<div class="kz-bl"><span>${esc(w.label || '')}</span><b></b></div><div class="kz-bar" style="width:${w.width || 220}px"><i style="background:${w.color}"></i></div>`; ref.num = d.querySelector('b'); ref.fill = d.querySelector('i'); }
    else if (w.kind === 'ammo') { d.innerHTML = '<b></b><span></span>'; ref.mag = d.querySelector('b'); ref.res = d.querySelector('span'); }
    else if (w.kind === 'crosshair') { d.innerHTML = `<div class="kz-x kz-x-${w.style || 'cross'}" style="--c:${w.color}"><i></i><i></i><i></i><i></i></div>`; }
    else if (w.kind === 'objective') { d.innerHTML = `<span>${esc(w.label || '')}</span><b></b>`; ref.t = d.querySelector('b'); }
    else if (w.kind === 'messages') { ref.t = d; }
    else if (w.kind === 'text') { d.textContent = w.text || ''; d.style.whiteSpace = 'pre-line'; if (/\{[^{}]+\}/.test(w.text || '')) ref.tpl = w.text; }
    else if (w.kind === 'compass') { d.innerHTML = '<div class="kz-cmp"><div class="kz-cmps"></div><i></i></div>'; const s = d.querySelector('.kz-cmps'); let h = ''; for (let k = 0; k < 3; k++)['N', '·', 'NE', '·', 'E', '·', 'SE', '·', 'S', '·', 'SW', '·', 'W', '·', 'NW', '·'].forEach(t => h += `<span>${t}</span>`); s.innerHTML = h; ref.s = s; }
    else { d.innerHTML = `<span>${esc(w.label || '')}</span> <b></b>`; ref.t = d.querySelector('b'); }
    root.appendChild(d); els.push({ w, d, ref });
  });
  return function update(st) {
    els.forEach(({ w, d, ref }) => {
      if (w.kind === 'health') { ref.num.textContent = Math.max(0, Math.ceil(st.health)); ref.fill.style.width = clamp(st.health / st.maxHealth, 0, 1) * 100 + '%'; }
      else if (w.kind === 'bullettime') { const v = st.bt; d.style.visibility = v == null ? 'hidden' : 'visible'; if (v != null) { ref.num.textContent = st.btOn ? 'ACTIVE' : Math.round(v * 100) + '%'; ref.fill.style.width = clamp(v, 0, 1) * 100 + '%'; ref.fill.style.opacity = st.btOn ? (.65 + .35 * Math.sin(Date.now() / 90)) : 1; } }
      else if (w.kind === 'armor') { ref.num.textContent = Math.ceil(st.armor); ref.fill.style.width = clamp(st.armor / 100, 0, 1) * 100 + '%'; d.style.visibility = st.armor > 0 || st.design ? 'visible' : 'hidden'; }
      else if (w.kind === 'ammo') { ref.mag.textContent = st.mag == null ? '' : st.mag; ref.res.textContent = st.res == null ? '' : '/ ' + st.res; }
      else if (w.kind === 'objective') { ref.t.textContent = st.objective || ''; d.style.visibility = st.objective ? 'visible' : 'hidden'; }
      else if (w.kind === 'messages') { const t = st.message || ''; if (ref.t.textContent !== t) ref.t.textContent = t; d.style.visibility = t ? 'visible' : 'hidden'; }
      else if (w.kind === 'text') { if (ref.tpl && st.vars && ENG.Logic) { const t = ENG.Logic.fmtText(ref.tpl, st.vars); if (d.textContent !== t) d.textContent = t; } }
      else if (w.kind === 'weapon') ref.t.textContent = st.weapon || '';
      else if (w.kind === 'enemies') ref.t.textContent = st.enemies;
      else if (w.kind === 'keys') ref.t.textContent = st.keys && st.keys.length ? st.keys.join(', ') : 'none';
      else if (w.kind === 'collectibles') { ref.t.textContent = (st.collected || 0) + ' / ' + (st.collectTotal || 0); }
      else if (w.kind === 'timer') { const s = Math.floor(st.time || 0); ref.t.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
      else if (w.kind === 'compass') { const deg = ((-(st.yaw || 0) / D2R) % 360 + 360) % 360; ref.s.style.transform = `translateX(${-(360 + deg) / 22.5 * 26 + 100 - 13}px)`; }
    });
  };
};
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
ENG.esc = esc;
ENG.CSS = `
.kz-root{position:absolute;inset:0;overflow:hidden;background:#000;user-select:none;-webkit-user-select:none;font-family:"Barlow",system-ui,sans-serif;color:#fff}
.kz-root canvas{display:block;width:100%;height:100%}
.kz-hud,.kz-fx{position:absolute;inset:0;pointer-events:none}
.kz-w{position:absolute;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,.8);line-height:1.1}
.kz-bl{display:flex;justify-content:space-between;font-size:13px;letter-spacing:.04em;margin-bottom:4px}.kz-bl b{font-size:20px}
.kz-bar{height:10px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.25);clip-path:polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)}.kz-bar i{display:block;height:100%;transition:width .15s}
.kz-ammo b{font-size:44px;font-weight:700}.kz-ammo span{font-size:20px;opacity:.75;margin-left:6px}
.kz-weapon,.kz-enemies,.kz-keys,.kz-timer{font-size:18px}
.kz-objective span{display:block;font-size:12px;opacity:.75;letter-spacing:.05em}.kz-objective b{font-size:19px;font-weight:600}
.kz-messages{font-size:22px;font-weight:500;text-align:center;white-space:pre-line;max-width:70vw;background:rgba(0,0,0,.45);padding:8px 16px}
.kz-text{font-size:24px;font-weight:600;text-align:center}
.kz-x{position:relative;width:28px;height:28px}.kz-x i{position:absolute;background:var(--c)}
.kz-x-cross i:nth-child(1){left:13px;top:0;width:2px;height:9px}.kz-x-cross i:nth-child(2){left:13px;bottom:0;width:2px;height:9px}.kz-x-cross i:nth-child(3){top:13px;left:0;height:2px;width:9px}.kz-x-cross i:nth-child(4){top:13px;right:0;height:2px;width:9px}
.kz-x-dot i:nth-child(1){left:11px;top:11px;width:6px;height:6px;border-radius:50%}.kz-x-dot i:nth-child(n+2){display:none}
.kz-x-circle i:nth-child(1){inset:2px;background:none;border:2px solid var(--c);border-radius:50%}.kz-x-circle i:nth-child(2){left:13px;top:13px;width:2px;height:2px}.kz-x-circle i:nth-child(n+3){display:none}
.kz-x-brackets i{width:8px;height:8px;background:none;border:2px solid var(--c)}.kz-x-brackets i:nth-child(1){left:0;top:0;border-right:0;border-bottom:0}.kz-x-brackets i:nth-child(2){right:0;top:0;border-left:0;border-bottom:0}.kz-x-brackets i:nth-child(3){left:0;bottom:0;border-right:0;border-top:0}.kz-x-brackets i:nth-child(4){right:0;bottom:0;border-left:0;border-top:0}
.kz-cmp{position:relative;width:200px;height:26px;overflow:hidden;border-bottom:1px solid currentColor;mask-image:linear-gradient(90deg,transparent,#000 25%,#000 75%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 25%,#000 75%,transparent)}.kz-cmps{position:absolute;left:0;top:2px;display:flex}.kz-cmps span{width:26px;text-align:center;font-size:14px;font-weight:600}.kz-cmp i{position:absolute;left:99px;bottom:0;width:2px;height:6px;background:currentColor}
.kz-vig{position:absolute;inset:0;box-shadow:inset 0 0 160px rgba(200,0,0,.9);opacity:0;transition:opacity .25s}
.kz-hit{position:absolute;left:50%;top:50%;width:22px;height:22px;transform:translate(-50%,-50%) rotate(45deg);opacity:0}.kz-hit:before,.kz-hit:after{content:"";position:absolute;background:#fff;left:10px;top:0;width:2px;height:22px}.kz-hit:after{transform:rotate(90deg)}
.kz-use{position:absolute;left:50%;top:60%;transform:translateX(-50%);font:600 17px "Chakra Petch",sans-serif;background:rgba(10,14,18,.7);padding:6px 14px;border-left:3px solid #f0b43c;display:none}
.kz-lb{position:absolute;left:0;right:0;height:0;background:#000;transition:height .5s}.kz-lb.t{top:0}.kz-lb.b{bottom:0}
.kz-sub{position:absolute;left:50%;bottom:6%;transform:translateX(-50%);max-width:70%;text-align:center;font:500 22px "Barlow",sans-serif;text-shadow:0 2px 4px #000;white-space:pre-line}
.kz-skip{position:absolute;right:20px;bottom:14px;font:500 13px "Chakra Petch",sans-serif;opacity:.6;display:none}
.kz-fade{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .6s}
.kz-menu{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px;background:rgba(8,11,14,.72);pointer-events:auto;text-align:center;padding:24px}
.kz-menu h1{font:700 clamp(28px,5vw,56px) "Chakra Petch",sans-serif;margin:0;letter-spacing:.02em}.kz-menu p{margin:0;max-width:520px;opacity:.8;font-size:16px;line-height:1.5;white-space:pre-line}
.kz-menu button{font:600 16px "Chakra Petch",sans-serif;color:#1b1f24;background:#f0b43c;border:0;padding:11px 26px;cursor:pointer;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}.kz-menu button.alt{background:#d7dde2}
.kz-menu button:focus-visible{outline:2px solid #fff;outline-offset:3px}
.kz-dbg{position:absolute;right:12px;top:12px;width:min(360px,46vw);background:rgba(12,16,20,.82);border-left:3px solid #4cc3b8;padding:8px 10px;font:500 12px/1.45 "Barlow",sans-serif;color:#dfe7ec;display:none;pointer-events:none;border-radius:6px}
.kz-dbg h6{margin:0 0 4px;font:600 12px "Chakra Petch",sans-serif;color:#4cc3b8;display:flex;justify-content:space-between}.kz-dbg h6 span{color:#8e9ba7;font-weight:500}
.kz-dbg div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kz-dbg b{color:#f0b43c;font-weight:600;margin-right:4px}.kz-dbg p{margin:6px 0 0;border-top:1px solid rgba(255,255,255,.12);padding-top:5px;white-space:normal}
.kz-dbg .k-error{color:#ff8a80}.kz-dbg .k-fail{color:#ffb38a}.kz-dbg .k-pass{color:#9be3a9}.kz-dbg .k-skip,.kz-dbg .k-stop{color:#a9b4bd}
.kz-keys-help{font:500 13px "Barlow",sans-serif;opacity:.7;line-height:1.7}
`;
ENG.injectCSS = function () { if (document.getElementById('kz-css')) return; const s = document.createElement('style'); s.id = 'kz-css'; s.textContent = ENG.CSS; document.head.appendChild(s); };

/* ---------------- cutscenes ---------------- */
ENG.sampleCutscene = function (cs, t, cam) {
  const k = cs.keys; if (!k.length) return null; let i = 0; while (i < k.length - 1 && k[i + 1].t <= t) i++;
  const a = k[i], b = k[Math.min(i + 1, k.length - 1)]; let f = b.t > a.t ? clamp((t - a.t) / (b.t - a.t), 0, 1) : 0; if (cs.ease !== false) f = f * f * (3 - 2 * f);
  cam.position.set(lerp(a.p[0], b.p[0], f), lerp(a.p[1], b.p[1], f), lerp(a.p[2], b.p[2], f));
  const qa = new THREE.Quaternion().fromArray(a.q), qb = new THREE.Quaternion().fromArray(b.q); cam.quaternion.copy(qa).slerp(qb, f);
  let text = ''; for (let j = 0; j < k.length; j++) if (k[j].t <= t && k[j].text) text = k[j].text;
  return { text, i, end: k[k.length - 1].t + (cs.hold == null ? 1 : cs.hold) };
};

/* ---------------- procedural dungeon ---------------- */
ENG.generateDungeon = function (cfg) {
  const r = ENG.rng(cfg.seed || 1), G = 30, cell = Math.max(3, cfg.cell || 4), H = cfg.wallH || 3.2, off = G * cell / 2;
  const grid = new Uint8Array(G * G), at = (x, y) => (x < 0 || y < 0 || x >= G || y >= G) ? 0 : grid[y * G + x];
  const rooms = [];
  for (let t = 0; t < 400 && rooms.length < (cfg.rooms || 8); t++) {
    const w = 3 + Math.floor(r() * 4), h = 3 + Math.floor(r() * 4), x = 1 + Math.floor(r() * (G - w - 2)), y = 1 + Math.floor(r() * (G - h - 2));
    if (rooms.some(o => x < o.x + o.w + 1 && x + w + 1 > o.x && y < o.y + o.h + 1 && y + h + 1 > o.y)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
  }
  const order = [rooms.shift()]; while (rooms.length) { const l = order[order.length - 1]; let bi = 0, bd = 1e9; rooms.forEach((o, i) => { const d = Math.abs(o.cx - l.cx) + Math.abs(o.cy - l.cy); if (d < bd) { bd = d; bi = i; } }); order.push(rooms.splice(bi, 1)[0]); }
  order.forEach(o => { for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) grid[y * G + x] = 1; });
  const dig = (x, y) => { if (!grid[y * G + x]) grid[y * G + x] = 2; };
  for (let i = 1; i < order.length; i++) {
    const a = order[i - 1], b = order[i]; const hf = r() < .5;
    if (hf) { for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) dig(x, a.cy); for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) dig(b.cx, y); }
    else { for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) dig(a.cx, y); for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) dig(x, b.cy); }
  }
  const out = [], W = (gx) => gx * cell - off;
  const mk = (type, x, y, z, s, props, ry) => { const o = ENG.newObject(type); o.p = [x, y, z]; if (s) o.s = s; Object.assign(o.props, props || {}); if (ry) o.r[1] = ry; o.gen = true; out.push(o); return o; };
  const fl = { texture: cfg.floorTex || 'tiles', color: cfg.floorColor || '#9aa3a8', tile: 2 }, wl = { texture: cfg.wallTex || 'brick', color: cfg.wallColor || '#c9b8a6', tile: 2 };
  order.forEach(o => { mk('floor', W(o.x + o.w / 2), -.2, W(o.y + o.h / 2), [o.w * cell, .2, o.h * cell], fl).name = 'Room floor'; if (cfg.ceiling) mk('block', W(o.x + o.w / 2), H, W(o.y + o.h / 2), [o.w * cell, .2, o.h * cell], { texture: 'concrete', color: '#7d8085' }).name = 'Ceiling'; });
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) if (grid[y * G + x] === 2) { mk('floor', W(x + .5), -.2, W(y + .5), [cell, .2, cell], fl).name = 'Corridor floor'; if (cfg.ceiling) mk('block', W(x + .5), H, W(y + .5), [cell, .2, cell], { texture: 'concrete', color: '#7d8085' }).name = 'Ceiling'; }
  for (let y = 0; y <= G; y++) { let run = 0, start = 0; for (let x = 0; x <= G; x++) { const e = x < G && (!!at(x, y) !== !!at(x, y - 1)); if (e) { if (!run) start = x; run++; } else if (run) { mk('wall', W(start + run / 2), 0, W(y), [run * cell + .3, H, .3], wl).name = 'Wall'; run = 0; } } }
  for (let x = 0; x <= G; x++) { let run = 0, start = 0; for (let y = 0; y <= G; y++) { const e = y < G && (!!at(x, y) !== !!at(x - 1, y)); if (e) { if (!run) start = y; run++; } else if (run) { mk('wall', W(x), 0, W(start + run / 2), [run * cell + .3, H, .3], wl, 90).name = 'Wall'; run = 0; } } }
  const spot = o => [W(o.x + .7 + r() * (o.w - 1.4)), 0, W(o.y + .7 + r() * (o.h - 1.4))];
  const s0 = order[0]; mk('player_start', W(s0.cx + .5), 0, W(s0.cy + .5));
  const last = order[order.length - 1];
  mk('trigger', W(last.cx + .5), 0, W(last.cy + .5), [cell * 1.2, 3, cell * 1.2], { action: 'end level (win)', text: 'You found the exit.' }).name = 'Exit';
  mk('sign', W(last.cx + .5), 2.2, W(last.cy + .5), [2, .7, .05], { text: 'EXIT', bg: '#164a2c' });
  let lights = 0;
  order.forEach((o, i) => {
    if (cfg.lights !== false && lights < 12) { mk('light', W(o.x + o.w / 2), H - .4, W(o.y + o.h / 2), null, { color: i === order.length - 1 ? '#7dffb0' : (r() < .25 ? '#ff9d6b' : '#ffe0b0'), intensity: 1.8, range: Math.max(o.w, o.h) * cell * 1.1, flicker: r() < .2 }); lights++; }
    if (i === 0) return;
    const n = Math.round((cfg.enemies == null ? 1 : cfg.enemies) * (.4 + r() * 1.2));
    for (let k = 0; k < n; k++) { const sp = spot(o); mk('enemy', sp[0], 0, sp[2], null, { ai: r() < .5 ? 'patrol' : 'guard', attack: r() < .6 ? 'ranged' : 'melee', radius: Math.max(o.w, o.h) * cell / 2, drop: r() < .3 ? 'ammo' : 'none' }, Math.floor(r() * 4) * 90); }
    if (r() < .7) { const sp = spot(o); mk('pickup', sp[0], 0, sp[2], null, { kind: ['health', 'ammo', 'armor'][Math.floor(r() * 3)] }); }
    if (i === 1) { const sp = spot(o); mk('pickup', sp[0], 0, sp[2], null, { kind: 'shotgun' }); }
    if (i === Math.floor(order.length / 2)) { const sp = spot(o); mk('pickup', sp[0], 0, sp[2], null, { kind: 'rifle' }); }
    const nc = Math.floor(r() * 3); for (let k = 0; k < nc; k++) { const sp = spot(o); mk(r() < .25 ? 'barrel' : 'crate', sp[0], 0, sp[2]); }
  });
  let res = cfg.noStart ? out.filter(o => o.type !== 'player_start') : out;
  if (cfg.offset) res.forEach(o => { o.p[0] += cfg.offset[0] || 0; o.p[2] += cfg.offset[2] || 0; });
  return res;
};

/* ---------------- settings & project ---------------- */
ENG.DEFAULT_SETTINGS = { look: 'natural', grade: null, quality: 'high', adapt: true, playerOutfit: 'trench', skyLight: '#dfe8f0', groundLight: '#3a3530', sunColor: '#fff4e0', weather: 'none', rain: .6, bulletTime: true, btLength: 6, btScale: .3, blood: true, shells: true, ragdolls: true, camera: 'fps', fov: 75, sky: '#7f97aa', fogColor: '#7f97aa', fog: .012, ambient: .55, sun: 1.1, sunAngle: 50, sunYaw: 30, shadows: true, gravity: 20, speed: 5.2, sprint: 1.6, jump: 7, health: 100, startWeapon: 'pistol', win: 'trigger', intro: '', playerSkin: 'default', sens: 1, title: '', subtitle: 'Click to play', proc: { seed: 1234, rooms: 8, cell: 4, wallH: 3.2, enemies: 1, ceiling: false, regen: false, floorTex: 'tiles', wallTex: 'brick', floorColor: '#9aa3a8', wallColor: '#c9b8a6' } };
ENG.newProject = function () {
  return { name: 'Untitled game', v: 1, models: {}, logic: { v: 1, seed: 1337, vars: [], behaviors: [] }, settings: ENG.clone(ENG.DEFAULT_SETTINGS), objects: [], assets: { models: {}, images: {}, audio: {} }, skins: {}, sounds: {}, slots: {}, hud: ENG.defaultHUD(), cutscenes: [], mixer: { master: 1, sfx: .9, music: .7, ambient: .8, ui: 1, mute: {} } };
};
ENG.migrate = function (p) {
  const hadLook = !!(p.settings && p.settings.look !== undefined); const d = ENG.newProject(); for (const k in d) if (p[k] === undefined) p[k] = d[k];
  p.settings = Object.assign(ENG.clone(ENG.DEFAULT_SETTINGS), p.settings); p.settings.proc = Object.assign(ENG.clone(ENG.DEFAULT_SETTINGS.proc), p.settings.proc || {}); if (!hadLook) p.settings.look = 'classic';
  p.assets = Object.assign({ models: {}, images: {}, audio: {} }, p.assets); p.objects.forEach(ENG.fillProps);
  if (ENG.Logic) { p.logic = ENG.Logic.migrate(p.logic); p.objects.forEach(o => { if (o.logic && !Array.isArray(o.logic)) delete o.logic; if (o.logic) o.logic.forEach(ENG.Logic.fixBehavior); }); }
  return p;
};

/* ---------------- weapons ---------------- */
ENG.WEAPONS = {
  fists: { name: 'Fists', dmg: 18, rate: .45, mag: null, melee: true, range: 1.9, sound: 'punch' },
  pistol: { name: 'Pistol', dmg: 26, rate: .26, mag: 12, reserve: 48, spread: .012, pellets: 1, auto: false, sound: 'pistol', kick: .025, key: 'Digit2' },
  shotgun: { name: 'Shotgun', dmg: 13, rate: .85, mag: 6, reserve: 18, spread: .07, pellets: 9, auto: false, sound: 'shotgun', kick: .07, key: 'Digit3' },
  rifle: { name: 'Rifle', dmg: 17, rate: .095, mag: 30, reserve: 90, spread: .02, pellets: 1, auto: true, sound: 'rifle', kick: .015, key: 'Digit4' }
};
function viewModel(kind) {
  const g = new THREE.Group(), M = c => new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: .55 });
  const b = (x, y, z, w, h, d, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); g.add(m); return m; };
  if (kind === 'fists') { b(-.18, -.05, 0, .12, .12, .3, '#c99a76'); b(.18, -.05, 0, .12, .12, .3, '#c99a76'); }
  else if (kind === 'pistol') { b(0, 0, -.1, .06, .08, .28, '#2b2e33'); b(0, -.09, -.02, .05, .14, .07, '#1d1f22'); b(-.02, -.12, .1, .1, .1, .22, '#c99a76'); }
  else if (kind === 'shotgun') { b(0, 0, -.25, .07, .08, .7, '#2b2e33'); b(0, -.05, -.25, .06, .05, .3, '#5a3d26'); b(0, -.06, .12, .07, .12, .22, '#5a3d26'); }
  else { b(0, 0, -.2, .07, .1, .6, '#2d3a2a'); b(0, -.1, -.15, .05, .16, .07, '#1d1f22'); b(0, .08, -.1, .04, .05, .2, '#111'); b(0, -.04, .15, .07, .1, .22, '#2d3a2a'); }
  g.userData.muzzle = new THREE.Vector3(0, 0, kind === 'shotgun' ? -.62 : kind === 'rifle' ? -.52 : -.26);
  return g;
}

/* ======================================================================
   GAME
   ====================================================================== */
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _box = new THREE.Box3(), _ray = new THREE.Raycaster();
ENG.Game = class {
  constructor(container, project, opt) {
    ENG.injectCSS();
    this.src = project; this.project = ENG.migrate(ENG.clone(project)); this.opt = opt || {}; this.c = container;
    const S = this.S = this.project.settings;
    this.root = document.createElement('div'); this.root.className = 'kz-root'; container.appendChild(this.root);
    const R = this.renderer = this.opt.renderer || new THREE.WebGLRenderer({ antialias: true }); delete this.opt.renderer; R.xr.enabled = true; if (!R.xr.isPresenting) R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R.shadowMap.enabled = !!S.shadows; R.shadowMap.type = THREE.PCFSoftShadowMap;
    this.root.appendChild(R.domElement);
    this.hudEl = this.div('kz-hud'); this.fx = this.div('kz-fx');
    this.fx.innerHTML = '<div class="kz-vig"></div><div class="kz-hit"></div><div class="kz-use"></div><div class="kz-lb t"></div><div class="kz-lb b"></div><div class="kz-sub"></div><div class="kz-skip">Enter to skip</div><div class="kz-fade"></div>';
    this.dbgEl = this.div('kz-dbg'); this.dbgOn = !!this.opt.debugLogic;
    this.menu = this.div('kz-menu');
    const q = s => this.fx.querySelector(s); this.vig = q('.kz-vig'); this.hitEl = q('.kz-hit'); this.useEl = q('.kz-use'); this.lbs = this.fx.querySelectorAll('.kz-lb'); this.subEl = q('.kz-sub'); this.skipEl = q('.kz-skip'); this.fadeEl = q('.kz-fade');
    const scene = this.scene = new THREE.Scene(); scene.background = new THREE.Color(S.sky); if (S.fog > 0) scene.fog = new THREE.FogExp2(S.fogColor || S.sky, S.fog);
    this.cam = new THREE.PerspectiveCamera(S.fov, 1, .05, 1500); scene.add(this.cam);
    scene.add(new THREE.HemisphereLight(S.skyLight || '#dfe8f0', S.groundLight || '#3a3530', S.ambient));
    const sun = this.sun = new THREE.DirectionalLight(S.sunColor || '#fff4e0', S.sun); const el = S.sunAngle * D2R, az = S.sunYaw * D2R; sun.position.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(60);
    sun.castShadow = !!S.shadows; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = sc.bottom = -45; sc.right = sc.top = 45; sc.far = 200; sun.shadow.bias = -.0006; scene.add(sun); scene.add(sun.target);
    this.audio = new ENG.AudioEngine(this.project);
    this.boom = new THREE.PointLight('#ffa040', 0, 30, 2); scene.add(this.boom); this.boomT = 0;
    this.fxp = new ENG.Particles(scene, 4000, .22, true); this.smoke = new ENG.Particles(scene, 1500, .7, false);
    const W = this.world = new CANNON.World(); W.gravity.set(0, -S.gravity, 0); W.broadphase = new CANNON.NaiveBroadphase(); W.solver.iterations = 8; W.defaultContactMaterial.friction = .3; W.defaultContactMaterial.restitution = .15;
    this.ents = []; this.cols = []; this.walk = []; this.sightBlock = []; this.targets = []; this.enemies = []; this.timers = []; this.decals = []; this.tracers = []; this.debris = []; this.mixers = []; this.queue = [];
    this.keys = {}; this.mouse = { l: false }; this.state = 'loading'; this.time = 0; this.msgT = 0; this.message = ''; this.objective = ''; this.shake = 0;
    this.player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: false, h: 1.75, health: S.health, maxHealth: S.health, armor: 0, keys: [], crouch: false, stepAcc: 0, bob: 0 };
    this.wep = { owned: {}, cur: 'fists', next: 0, reload: 0, kick: 0, swap: 0 };
    this.resize = this.resize.bind(this); window.addEventListener('resize', this.resize); this.ro = new ResizeObserver(this.resize); this.ro.observe(container);
    this.bind(); this.resize();
    this.ready = this.load().catch(e => { console.error(e); this.showMenu('Could not start', String(e && e.message || e), [['Back', () => this.quit()]]); });
  }
  div(cls) { const d = document.createElement('div'); d.className = cls; this.root.appendChild(d); return d; }
  resize() { if (this.renderer.xr.isPresenting) return; const w =this.c.clientWidth || innerWidth, h = this.c.clientHeight || innerHeight; this.renderer.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); if (this.post) this.post.setSize(w, h); }

  async load() {
    const pr = this.project, S = this.S;
    try { if (document.fonts && document.fonts.load) await Promise.all(['700 40px "Chakra Petch"', '600 20px "Barlow"'].map(f => document.fonts.load(f))); } catch (e) { }
    await ENG.preloadSkins(pr); await ENG.preloadModels(pr);
    if (S.proc.regen) { pr.objects = pr.objects.filter(o => !o.gen).concat(ENG.generateDungeon(Object.assign({}, S.proc, { seed: Math.floor(Math.random() * 1e9) }))); }
    if (this.genLevel) this.genLevel(pr);
    if (ENG.QUALITY) ENG.mirrorRes = (ENG.QUALITY[S.quality] || ENG.QUALITY.high).mirror;
    pr.objects.forEach(o => this.spawn(o));
    if (ENG.Logic) { try { this.logic = new ENG.Logic.Runtime(this); } catch (err) { console.error('Logic failed to start', err); this.logic = null; } }
    if (this.setupCinematic) { try { this.setupCinematic(); } catch (err) { console.error('Cinematic layer failed to start', err); this.post = null; } }
    const ps = pr.objects.find(o => o.type === 'player_start'); if (this.applyStarter) this.applyStarter(ps);
    const P = this.player;
    if (this.opt.checkpoint) { P.pos.fromArray(this.opt.checkpoint.p); P.yaw = this.opt.checkpoint.yaw; }
    else if (this.opt.startAt) { P.pos.fromArray(this.opt.startAt.p); P.yaw = this.opt.startAt.yaw; const g = this.groundAt(P.pos.x, P.pos.y + 1.6, P.pos.z, 300); if (g !== null && this.opt.startAt.snap) P.pos.y = g; }
    else if (ps) { P.pos.fromArray(ps.p); P.yaw = ps.r[1] * D2R; }
    this.checkpoint = this.opt.checkpoint || null;
    const sw = S.startWeapon; if (sw && sw !== 'none' && ENG.WEAPONS[sw]) this.giveWeapon(sw, true); else this.setWeapon('fists');
    if (this.opt.carry) { Object.assign(P, { health: this.opt.carry.health, armor: this.opt.carry.armor, keys: this.opt.carry.keys.slice() }); this.wep.owned = ENG.clone(this.opt.carry.owned); this.setWeapon(this.opt.carry.cur); }
    this.playerModel = ENG.buildHuman(ENG.lookOf({ outfit: S.playerOutfit || 'trench' }), { gun: true }); this.playerModel.visible = S.camera === 'tps'; this.scene.add(this.playerModel);
    this.hudUpdate = ENG.buildHUD(this.hudEl, pr.hud, { project: pr, game: this });
    this.ents.forEach(e => { if (e.type === 'trigger' && e.p.when === 'level starts') this.queue.push(() => this.fireTrigger(e)); });
    this.loopFn = this.loop.bind(this); this.last = performance.now(); this.renderer.setAnimationLoop(this.loopFn);
    this.state = 'menu';
    const title = S.title || pr.name;
    this.showMenu(title, (S.subtitle || '') + '\n', [['Play', () => this.begin()]], true);
  }
  begin() {
    this.audio.init(); this.hideMenu(); this.state = 'play'; this.lock(false);
    if (!this.started) { this.started = true; if (this.logic) this.logic.raise('start'); this.ents.forEach(e => { if (e.type === 'speaker' && e.p.autoplay) this.speakerOn(e, true); }); if (this.S.intro && !this.opt.checkpoint && !this.opt.startAt) this.playCutscene(this.S.intro); this.queue.forEach(f => f()); this.queue = []; }
  }
  lock(fromClick) { this.lockClick = !!fromClick; try { const r = this.renderer.domElement.requestPointerLock(); if (r && r.catch) r.catch(() => { if (this.lockClick) this.noLock = true; }); } catch (e) { if (fromClick) this.noLock = true; } }
  showMenu(title, text, buttons, help) {
    const m = this.menu; m.innerHTML = `<h1>${esc(title)}</h1>${text ? `<p>${esc(text)}</p>` : ''}<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"></div>${help ? `<div class="kz-keys-help">WASD move · Mouse look · Click shoot · Right click or Q bullet time · E use · R reload · Space jump · Shift sprint · C crouch · 1 to 4 weapons</div>` : ''}`;
    const row = m.querySelector('div'); buttons.forEach(([label, fn], i) => { const b = document.createElement('button'); b.textContent = label; if (i) b.className = 'alt'; b.onclick = e => { e.stopPropagation(); fn(); }; row.appendChild(b); });
    m.style.display = 'flex'; setTimeout(() => { const b = row.querySelector('button'); b && b.focus(); }, 30);
  }
  hideMenu() { this.menu.style.display = 'none'; }

  /* ---------- world building ---------- */
  spawn(o) {
    const root = ENG.build(o, { project: this.project, editor: false }); this.scene.add(root); root.updateMatrixWorld(true);
    const e = { o, root, type: o.type, p: o.props, tags: (o.props.tag || '').split(',').map(s => s.trim()).filter(Boolean), alive: true };
    this.ents.push(e); const dynamic = (o.props.physics === 'dynamic') || o.type === 'crate' || o.type === 'barrel';
    root.traverse(m => { if (!m.isMesh) return; m.userData.e = e; if (m.userData.walk) { this.walk.push(m); if (!m.userData.glass) this.sightBlock.push(m); } if (m.userData.solid && !dynamic && !m.userData.door) this.cols.push({ box: new THREE.Box3().setFromObject(m), m, e }); });
    if (!['trigger', 'player_start', 'light', 'spotlight', 'emitter', 'speaker', 'pickup', 'shaft', 'checkpoint', 'spawner'].includes(o.type)) this.targets.push(root);
    const T = o.type;
    if (dynamic) this.makeDynamic(e);
    else if (['block', 'floor', 'wall', 'pillar', 'sphere', 'ramp', 'stairs', 'terrain', 'model', 'glass', 'switch', 'mirror', 'custom', 'interact'].includes(T)) this.makeStatic(e);
    if (T === 'door') { e.door = { open: o.props.startOpen ? 1 : 0, target: o.props.startOpen ? 1 : 0, locked: o.props.locked, closeT: 0 }; const leaf = root.userData.leaf; e.col = { box: new THREE.Box3(), m: leaf, e, dyn: true }; this.cols.push(e.col); e.body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC }); e.body.collisionFilterMask = -1; const [sx, sy, sz] = o.s; e.body.addShape(new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2))); this.world.addBody(e.body); this.applyDoor(e); }
    if (T === 'glass' || T === 'mirror') e.hp = o.props.strength;
    if (T === 'light' || T === 'spotlight') { e.light = root.userData.light; e.on = o.props.startOn; e.base = o.props.intensity; if (!e.on && root.userData.bulb) root.userData.bulb.visible = false; }
    if (T === 'emitter') { e.on = o.props.startOn; e.acc = 0; }
    if (T === 'pickup') e.spin = root.userData.spin;
    { const inner = root.children[0]; const mdl = inner && inner.userData.model; const clips = inner && inner.userData.clips; if ((T === 'model' || T === 'enemy') && mdl && clips && clips.length) { const mx = new THREE.AnimationMixer(mdl); e.mixer = mx; e.clips = clips; this.mixers.push(mx); if (T === 'model' && o.props.playAnim) { const c = clips.find(c => c.name === o.props.anim) || clips[0]; mx.clipAction(c).play(); } } }
    if (T === 'enemy') { e.enemy = new Enemy(this, e); this.enemies.push(e.enemy); }
    if (this.spawnExtra) this.spawnExtra(e);
    return e;
  }
  makeStatic(e) {
    e.root.traverse(m => {
      if (!m.isMesh || !m.userData.walk) return;
      const body = new CANNON.Body({ mass: 0 }); m.updateMatrixWorld(true);
      if (m.userData.terrain) {
        const T = m.userData.terrain, data = []; const wp = new THREE.Vector3(); m.getWorldPosition(wp);
        const x0 = -T.nx * T.es / 2, z1 = T.nz * T.es / 2;
        for (let i = 0; i <= T.nx; i++) { const col = []; for (let j = 0; j <= T.nz; j++) col.push(T.H(x0 + i * T.es, z1 - j * T.es)); data.push(col); }
        body.addShape(new CANNON.Heightfield(data, { elementSize: T.es })); body.collisionFilterMask = -1;
        const q = new THREE.Quaternion(); m.getWorldQuaternion(q); const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2); q.multiply(qx);
        const lp = new THREE.Vector3(x0, 0, z1).applyQuaternion(new THREE.Quaternion().setFromEuler(e.root.rotation)).add(wp);
        body.position.set(lp.x, lp.y, lp.z); body.quaternion.set(q.x, q.y, q.z, q.w); this.world.addBody(body); e.bodies = (e.bodies || []).concat(body); return;
      }
      m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox, c = bb.getCenter(new THREE.Vector3()), hs = bb.getSize(new THREE.Vector3()).multiplyScalar(.5);
      const q = new THREE.Quaternion(), s = new THREE.Vector3(), wp = new THREE.Vector3(); m.matrixWorld.decompose(wp, q, s);
      if (m.userData.ramp) { const [sx, sy, sz] = e.o.s, L = Math.hypot(sy, sz), ang = Math.atan2(sy, sz); body.addShape(new CANNON.Box(new CANNON.Vec3(sx / 2, .05, L / 2))); const lq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -ang); const fq = q.clone().multiply(lq); const center = new THREE.Vector3(0, sy / 2, 0).applyQuaternion(q).add(wp); body.position.set(center.x, center.y, center.z); body.quaternion.set(fq.x, fq.y, fq.z, fq.w); }
      else { hs.multiply(s); body.addShape(new CANNON.Box(new CANNON.Vec3(Math.max(hs.x, .01), Math.max(hs.y, .01), Math.max(hs.z, .01)))); const wc = c.clone().applyMatrix4(m.matrixWorld); body.position.set(wc.x, wc.y, wc.z); body.quaternion.set(q.x, q.y, q.z, q.w); }
      body.collisionFilterMask = -1; this.world.addBody(body); body.userData = { e }; e.bodies = (e.bodies || []).concat(body);
      if (e.type === 'glass') body.addEventListener('collide', ev => { const v = Math.abs(ev.contact.getImpactVelocityAlongNormal()); if (v > 4) this.queue.push(() => this.shatter(e, null, null)); });
    });
  }
  makeDynamic(e) {
    const root = e.root; root.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(root);
    if (bb.isEmpty()) return; const size = bb.getSize(new THREE.Vector3()), center = bb.getCenter(new THREE.Vector3());
    const body = new CANNON.Body({ mass: Math.max(.1, e.p.mass || 10), linearDamping: .05, angularDamping: .1 });
    if (e.type === 'sphere' || (e.o.props && e.o.props.bpdef && ((e.o.props.bpdef.parts && e.o.props.bpdef.parts.length === 1 && e.o.props.bpdef.parts[0].shape === 'sphere') || (!e.o.props.bpdef.parts && e.o.props.bpdef.body && e.o.props.bpdef.body.shape === 'sphere')))) body.addShape(new CANNON.Sphere(Math.max(size.x, size.y, size.z) / 2)); else { const [sx, sy, sz] = (e.o.type === 'model' || e.o.type === 'custom' || e.o.type === 'blueprint') ? [size.x, size.y, size.z] : e.o.s; body.addShape(new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2))); }
    body.position.set(center.x, center.y, center.z); body.quaternion.set(root.quaternion.x, root.quaternion.y, root.quaternion.z, root.quaternion.w);
    e.off = root.position.clone().sub(center).applyQuaternion(root.quaternion.clone().invert());
    body.collisionFilterMask = -1; this.world.addBody(body); e.body = body; body.userData = { e }; e.dyn = true; e.hp = e.p.health || 50;
    root.traverse(m => { if (m.isMesh && m.userData.solid) { const c = { box: new THREE.Box3(), m, e, dyn: true }; this.cols.push(c); (e.dcols = e.dcols || []).push(c); } });
    if (e.type === 'barrel') body.addEventListener('collide', ev => { const v = Math.abs(ev.contact.getImpactVelocityAlongNormal()); if (v > 9) this.queue.push(() => this.damageEnt(e, 100, null, null)); });
  }
  removeEnt(e) {
    e.alive = false; this.scene.remove(e.root); if (this.logic) this.logic.cancelOwner(e);
    if (e.bodies) e.bodies.forEach(b => this.world.removeBody(b)); if (e.body) this.world.removeBody(e.body);
    this.cols = this.cols.filter(c => c.e !== e); this.walk = this.walk.filter(m => m.userData.e !== e); this.sightBlock = this.sightBlock.filter(m => m.userData.e !== e); this.targets = this.targets.filter(r => r !== e.root);
  }

  /* ---------- input ---------- */
  bind() {
    const kd = e => { if (this.state === 'menu' && (e.code === 'Enter' || e.code === 'Space')) return; this.keys[e.code] = true; if (this.state !== 'play') return; if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); this.onKey(e); };
    const ku = e => { this.keys[e.code] = false; };
    const mm = e => { if (this.state !== 'play' || this.cut || this.reading) return; if (document.pointerLockElement !== this.renderer.domElement && !(this.noLock && e.buttons)) return; const k = .0022 * (this.S.sens || 1); this.player.yaw -= e.movementX * k; this.player.pitch = clamp(this.player.pitch - e.movementY * k, -1.5, 1.5); };
    const md = e => { if (this.state !== 'play') return; if (this.reading) { this.closeNote(); return; } if (document.pointerLockElement !== this.renderer.domElement && !this.noLock) { this.lock(true); return; } if (e.button === 0) { this.mouse.l = true; this.fire(true); } if (e.button === 2) { if (this.pc && this.pc.aimKey && !this.pc.legacy) this.mouse.r = true; else if (this.setBulletTime) this.setBulletTime(!this.btOn); } };
    const mu = e => { if (e.button === 0) this.mouse.l = false; if (e.button === 2) this.mouse.r = false; };
    const wh = e => { if (this.state !== 'play') return; const order = ['fists', 'pistol', 'shotgun', 'rifle'].filter(k => k === 'fists' || this.wep.owned[k]); let i = order.indexOf(this.wep.cur); i = (i + (e.deltaY > 0 ? 1 : -1) + order.length) % order.length; this.setWeapon(order[i]); };
    const plc = () => { const locked = document.pointerLockElement === this.renderer.domElement; if (!locked && this.state === 'play' && !this.noLock) this.pause(); };
    const ple = () => { if (this.lockClick) this.noLock = true; };
    this.handlers = [[document, 'keydown', kd], [document, 'keyup', ku], [document, 'mousemove', mm], [this.root, 'mousedown', md], [document, 'mouseup', mu], [this.root, 'wheel', wh], [document, 'pointerlockchange', plc], [document, 'pointerlockerror', ple]];
    this.handlers.forEach(([t, n, f]) => t.addEventListener(n, f, { passive: n !== 'keydown' }));
    this.root.addEventListener('contextmenu', e => e.preventDefault());
  }
  onKey(e) {
    const c = e.code;
    if (this.reading) { if (c === 'KeyE' || c === 'Escape' || c === 'Space' || c === 'Enter') this.closeNote(); return; }
    if (this.cut) { if (c === 'Enter') this.endCutscene(); return; }
    if (c === 'Escape' && this.noLock) this.pause();
    if (c === 'KeyE') this.use();
    if (c === 'KeyR') this.reload();
    if (c === 'Space' && this.player.onGround) { this.player.vel.y = this.S.jump; this.player.onGround = false; this.audio.play('jump', { volume: .6 }); }
    if (c === 'Digit1') this.setWeapon('fists');
    ['pistol', 'shotgun', 'rifle'].forEach(k => { if (c === ENG.WEAPONS[k].key && this.wep.owned[k]) this.setWeapon(k); });
    if (c === 'KeyQ' && this.setBulletTime) this.setBulletTime(!this.btOn);
    if (c === 'F2') { e.preventDefault && e.preventDefault(); this.dbgOn = !this.dbgOn; this.updateDebug(true); }
    if (c === 'KeyV') { this.S.camera = this.S.camera === 'fps' ? 'tps' : 'fps'; this.playerModel.visible = this.S.camera === 'tps'; if (this.vm) this.vm.visible = this.S.camera === 'fps'; }
  }
  pause() { if (this.state !== 'play') return; this.state = 'pause'; this.mouse.l = false; this.keys = {}; const b = [['Resume', () => { this.hideMenu(); this.state = 'play'; this.lock(true); }], ['Restart', () => this.restart()]]; if (this.checkpoint) b.push(['Last checkpoint', () => this.restart(this.checkpoint)]); if (this.opt.onExit) b.push(['Back to editor', () => this.quit()]); this.showMenu('Paused', '', b, true); }
  quit() { const f = this.opt.onExit; const snap = this.logic ? this.logic.snapshot() : null; this.dispose(); f && f(snap); }
  updateDebug(force) {
    if (!this.dbgEl) return; this.dbgEl.style.display = this.dbgOn && this.logic ? 'block' : 'none'; if (!this.dbgOn || !this.logic) return;
    const L = this.logic; if (!force && L.hist.length === this.dbgN && this.time - (this.dbgT || 0) < .25) return; this.dbgN = L.hist.length; this.dbgT = this.time;
    const rows = L.hist.slice(-9).map(x => `<div class="k-${x.k}"><b>${x.t.toFixed(1)}</b> ${esc(x.name ? x.name + ': ' : '')}${esc(x.m)}</div>`).join('');
    const vars = L.lg.vars.map(v => `${esc(v.name)} <b>${esc(ENG.Logic.fmtVal(v.type, L.vars[v.id]))}</b>`).join(' · ');
    this.dbgEl.innerHTML = `<h6>Logic debugger <span>F2 hides</span></h6>${rows || '<div>No logic events yet.</div>'}${vars ? `<p>${vars}</p>` : ''}`;
  }
  restart(cp) { const o = Object.assign({}, this.opt, { checkpoint: cp || null, carry: null }); const c = this.c, src = this.src; this.dispose(); const g = new ENG.Game(c, src, o); if (this.opt.onRestart) this.opt.onRestart(g); g.ready.then(() => g.begin()); }

  /* ---------- player ---------- */
  overlap(x, y, z, r, h, skip, ignore) {
    const minY = y + .06, maxY = y + h;
    for (const c of this.cols) { const b = c.box; if (c.e === skip || (ignore && ignore.has(c))) continue; if (x + r > b.min.x && x - r < b.max.x && z + r > b.min.z && z - r < b.max.z && maxY > b.min.y && minY < b.max.y) return c; }
    return null;
  }
  overlapAll(x, y, z, r, h, skip) { const out = new Set(), minY = y + .06, maxY = y + h; for (const c of this.cols) { const b = c.box; if (c.e === skip) continue; if (x + r > b.min.x && x - r < b.max.x && z + r > b.min.z && z - r < b.max.z && maxY > b.min.y && minY < b.max.y) out.add(c); } return out; }
  /* Moves along x then z. Boxes we already overlap never block (so you can always walk out of them),
     and a blocked move stops flush against the face instead of snapping back. */
  slide(pos, dx, dz, r, h, canStep, skip) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / (r * .7))); let blocked = false;
    for (let s = 0; s < n; s++) for (const ax of ['x', 'z']) {
      const d = (ax === 'x' ? dx : dz) / n; if (!d) continue; const inside = this.overlapAll(pos.x, pos.y, pos.z, r, h, skip); const old = pos[ax];
      pos[ax] += d; const hit = this.overlap(pos.x, pos.y, pos.z, r, h, skip, inside);
      if (hit) { const top = hit.box.max.y; if (canStep && top - pos.y <= .5 && top - pos.y > 0 && !this.overlap(pos.x, top + .01, pos.z, r, h, skip)) pos.y = top + .001; else { pos[ax] = d > 0 ? Math.max(old, hit.box.min[ax] - r - .001) : Math.min(old, hit.box.max[ax] + r + .001); if (this.overlap(pos.x, pos.y, pos.z, r, h, skip, inside)) pos[ax] = old; blocked = true; } }
    }
    return blocked;
  }
  /* Pushes a body out of anything it ended up inside (a ledge it slipped past, a crate that landed on it,
     a bad spawn point). Small sideways pushes win; stepping up only for deep sideways overlaps. */
  depenetrate(pos, r, h, skip, maxStep) {
    let moved = false;
    for (let it = 0; it < 4; it++) {
      const c = this.overlap(pos.x, pos.y, pos.z, r, h, skip); if (!c) break; const b = c.box; moved = true;
      const px = b.max.x - (pos.x - r), nx = (pos.x + r) - b.min.x, pz = b.max.z - (pos.z - r), nz = (pos.z + r) - b.min.z, up = b.max.y - pos.y;
      const best = Math.min(px, nx, pz, nz);
      if (best > .3 && up > 0 && up <= .5 && !this.overlap(pos.x, b.max.y + .002, pos.z, r, h, skip)) { pos.y = b.max.y + .002; continue; }
      const push = Math.min(best + .002, maxStep || .25);
      if (best === px) pos.x += push; else if (best === nx) pos.x -= push; else if (best === pz) pos.z += push; else pos.z -= push;
    }
    return moved;
  }
  groundAt(x, y, z, down) { _ray.set(_v.set(x, y + .6, z), _v2.set(0, -1, 0)); _ray.near = 0; _ray.far = .6 + down; const h = _ray.intersectObjects(this.walk, false); if (h.length) this.lastGround = h[0].object; return h.length ? h[0].point.y : null; }
  /* Ground under the whole footprint: the centre first, then the four corners, so a body standing
     half over a ledge stays on it instead of sinking into its side. */
  groundFoot(x, y, z, r, down) {
    const c = this.groundAt(x, y, z, down); if (c !== null) { this.footObj = this.lastGround; return c; } let best = null, obj = null; const k = r * .98;
    for (const [ox, oz] of [[k, k], [-k, k], [k, -k], [-k, -k]]) { const g = this.groundAt(x + ox, y, z + oz, down); if (g !== null && (best === null || g > best)) { best = g; obj = this.lastGround; } }
    this.footObj = obj; return best;
  }
  updatePlayer(dt) {
    const P = this.player, S = this.S, k = this.keys;
    const want = !!k.KeyC; if (want !== P.crouch) { if (want || !this.overlap(P.pos.x, P.pos.y, P.pos.z, .32, 1.75, null)) P.crouch = want; } P.h = P.crouch ? 1.1 : 1.75;
    let fx = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), sx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    if (this.cut || this.state !== 'play' || this.reading) fx = sx = 0;
    const sp = S.speed * (k.ShiftLeft && !P.crouch && fx > 0 ? S.sprint : 1) * (P.crouch ? .5 : 1);
    const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw); let wx = -sin * fx + cos * sx, wz = -cos * fx - sin * sx; const l = Math.hypot(wx, wz); if (l > 1) { wx /= l; wz /= l; }
    ENG.moveSim(P, wx, wz, sp, dt, this);
    P.vel.y = Math.max(-40, P.vel.y - S.gravity * dt);
    this.slide(P.pos, P.vel.x * dt, P.vel.z * dt, .32, P.h, P.onGround, null);
    const dy = P.vel.y * dt; P.pos.y += dy;
    if (P.vel.y > 0 && this.overlap(P.pos.x, P.pos.y, P.pos.z, .32, P.h, null)) { P.pos.y -= dy; P.vel.y = 0; }
    this.depenetrate(P.pos, .32, P.h, null, .25);
    const probe = P.onGround ? .45 : .05, fall = Math.max(0, -dy); const g = this.groundFoot(P.pos.x, P.pos.y, P.pos.z, .32, probe + fall);
    if (g !== null && P.vel.y <= 0 && P.pos.y - g <= probe + fall + .001) { if (!P.onGround && P.vel.y < -12) this.hurtPlayer((-P.vel.y - 12) * 4, true); P.pos.y = g; P.vel.y = 0; P.onGround = true; } else P.onGround = false; P.groundEnt = P.onGround && this.footObj ? this.footObj.userData.e : null;
    const hs = Math.hypot(P.vel.x, P.vel.z); if (P.onGround && hs > .5) { P.stepAcc += hs * dt; P.bob += hs * dt * 1.6; if (P.stepAcc > 2.1) { P.stepAcc = 0; this.audio.play('step', { volume: .7, rate: rand(.85, 1.15) }); } }
    if (P.pos.y < -80) this.hurtPlayer(9999, true);
    this.ents.forEach(e => { if (e.dyn && e.body && e.alive) { const b = e.body.position; const dx = b.x - P.pos.x, dz = b.z - P.pos.z, d = Math.hypot(dx, dz); const reach = .5 + Math.max(e.o.s[0], e.o.s[2]) * .6; if (d < reach && b.y > P.pos.y - .3 && b.y < P.pos.y + P.h && hs > .5) { const f = Math.min(e.body.mass, 40) * 3 * dt; e.body.wakeUp(); e.body.applyImpulse(new CANNON.Vec3(dx / d * f, 0, dz / d * f), e.body.position); } } });
  }
  updateCamera(dt) {
    const P = this.player, cam = this.cam;
    if (this.cut) return;
    const eye = P.crouch ? 1.0 : 1.6; this.eyeY = lerp(this.eyeY || eye, eye, Math.min(1, dt * 12));
    const bob = this.S.camera === 'fps' ? Math.sin(P.bob * 3.2) * .04 * (P.onGround ? 1 : 0) : 0;
    const sh = this.shake > 0 ? this.shake : 0; this.shake = Math.max(0, this.shake - dt * 2);
    const head = _v.set(P.pos.x, P.pos.y + this.eyeY + bob, P.pos.z);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(P.pitch + this.wep.kick + rand(-1, 1) * sh * .05, P.yaw + rand(-1, 1) * sh * .05, 0, 'YXZ'));
    if (this.S.camera === 'tps') {
      const back = new THREE.Vector3(.55, .25, 3.4).applyQuaternion(q); const want = head.clone().add(back); const dir = want.clone().sub(head); const L = dir.length(); dir.normalize();
      _ray.set(head, dir); _ray.near = 0; _ray.far = L; const h = _ray.intersectObjects(this.sightBlock, false); cam.position.copy(h.length ? head.clone().addScaledVector(dir, Math.max(.3, h[0].distance - .25)) : want);
      cam.quaternion.copy(q); const pm = this.playerModel; pm.position.copy(P.pos); pm.rotation.y = P.yaw + Math.PI; const hs = Math.hypot(P.vel.x, P.vel.z); ENG.animateHuman(pm.userData.parts, P.bob * 3.2, Math.min(.8, hs * .15), this.mouse.l || this.wep.cur !== 'fists');
    } else { cam.position.copy(head); cam.quaternion.copy(q); }
    this.wep.kick = Math.max(0, this.wep.kick - dt * .35);
  }
  hurtPlayer(d, raw) {
    const P = this.player; if (this.state !== 'play' || P.health <= 0) return;
    if (!raw && P.armor > 0) { const a = Math.min(P.armor, d * .66); P.armor -= a; d -= a; }
    P.health -= d; this.vig.style.opacity = clamp(d / 30, .35, 1); clearTimeout(this.vigT); this.vigT = setTimeout(() => this.vig.style.opacity = 0, 180); this.shake = Math.min(1, this.shake + d / 40);
    this.audio.play('hurt', { volume: .8 });
    if (P.health <= 0) { P.health = 0; this.state = 'dead'; document.exitPointerLock && document.exitPointerLock(); const b = [['Restart', () => this.restart()]]; if (this.checkpoint) b.unshift(['Last checkpoint', () => this.restart(this.checkpoint)]); if (this.opt.onExit) b.push(['Back to editor', () => this.quit()]); this.showMenu('You died', '', b); }
  }
  heal(n) { const P = this.player; P.health = Math.min(P.maxHealth, P.health + n); }

  /* ---------- weapons ---------- */
  giveWeapon(k, silent) { const W = ENG.WEAPONS[k]; if (!W) return; const o = this.wep.owned[k]; if (o) o.res += W.mag * 2; else this.wep.owned[k] = { mag: W.mag, res: W.reserve }; if (!silent) this.msg(W.name + ' picked up', 2); if (!o) this.setWeapon(k); }
  setWeapon(k) {
    if (k !== 'fists' && !this.wep.owned[k]) return; this.wep.cur = k; this.wep.reload = 0; this.wep.swap = .25;
    if (this.vm) this.cam.remove(this.vm); this.vm = viewModel(k); this.vm.position.set(.26, -.26, -.5); this.vm.visible = this.S.camera === 'fps'; this.cam.add(this.vm);
    if (!this.flash) { this.flash = new THREE.PointLight('#ffcc77', 0, 6, 2); this.cam.add(this.flash); this.flashSpr = new THREE.Mesh(new THREE.PlaneGeometry(.22, .22), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: dotTex() })); this.cam.add(this.flashSpr); }
  }
  reload() { const k = this.wep.cur, W = ENG.WEAPONS[k], o = this.wep.owned[k]; if (!o || W.melee || o.mag >= W.mag || o.res <= 0 || this.wep.reload > 0) return; this.wep.reload = k === 'shotgun' ? 1.1 : .9; this.audio.play('reload'); }
  fire(click) {
    if (this.state !== 'play' || this.cut) return; const k = this.wep.cur, W = ENG.WEAPONS[k], o = this.wep.owned[k];
    if (this.time < this.wep.next || this.wep.reload > 0 || this.wep.swap > 0) return; if (!click && !W.auto) return;
    if (!W.melee) { if (o.mag <= 0) { if (click) this.audio.play('click'); if (o.res > 0) this.reload(); return; } o.mag--; }
    this.wep.next = this.time + W.rate; this.wep.kick += W.kick || .02;
    this.audio.play(W.sound); this.noise(this.player.pos, W.melee ? 4 : 30);
    const cam = this.cam, fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion); cam.updateMatrixWorld(true); if (!W.melee && this.ejectShell) this.ejectShell();
    if (W.melee) { this.vm.position.z = -.75; this.shoot(cam.position, fwd, W.dmg, W.range); return; }
    for (let i = 0; i < W.pellets; i++) { const d = fwd.clone().add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(W.spread)).normalize(); this.shoot(cam.position, d, W.dmg, 200, true); }
    if (this.S.camera === 'fps') { this.vm.position.z = -.42; this.flash.intensity = 3; const mz = this.vm.userData.muzzle.clone().add(this.vm.position); this.flashSpr.position.copy(mz); this.flashSpr.material.opacity = 1; this.flashSpr.rotation.z = Math.random() * 3; this.flash.position.copy(mz); }
    else { this.flash.intensity = 3; this.flash.position.set(0, -.3, -1); }
  }
  shoot(from, dir, dmg, range, tracer) {
    _ray.set(from, dir); _ray.near = 0; _ray.far = range; const hits = _ray.intersectObjects(this.targets, true);
    const h = hits.find(x => x.object.visible && !(x.object.userData.e && x.object.userData.e.enemy && (x.object.userData.e.enemy.dead || x.object.userData.e.enemy.dormant)));
    const end = h ? h.point : from.clone().addScaledVector(dir, range);
    if (tracer && this.fireBullet) { const start = this.S.camera === 'fps' && this.vm ? this.vm.localToWorld(this.vm.userData.muzzle.clone()) : from.clone().addScaledVector(dir, 1); this.fireBullet(start, end, () => { if (h) this.applyHit(h, dir, dmg); }); return; }
    if (tracer) { const start = this.S.camera === 'fps' && this.vm ? this.vm.localToWorld(this.vm.userData.muzzle.clone()) : from.clone().addScaledVector(dir, 1); this.tracer(start, end, '#ffe2a0'); }
    if (h) this.applyHit(h, dir, dmg);
  }
  applyHit(h, dir, dmg) {
    const rag = h.object.userData.rag;
    if (rag) { if (!rag.rd.frozen) { rag.body.wakeUp(); rag.body.applyImpulse(new CANNON.Vec3(dir.x * dmg * .5, dir.y * dmg * .5, dir.z * dmg * .5), new CANNON.Vec3(h.point.x, h.point.y, h.point.z)); } this.fxp.spawn(h.point, 6, { color: '#8a1414', speed: 1.5, life: .4, gravity: 9 }); return; }
    const e = h.object.userData.e;
    if (e && e.enemy && e.enemy.dead) { const rd = e.enemy.ragdoll; if (rd && !rd.frozen) rd.bodies.body.applyImpulse(new CANNON.Vec3(dir.x * dmg * .4, 0, dir.z * dmg * .4), rd.bodies.body.position); return; }
    if (e && e.enemy) { e.enemy.damage(dmg * (h.object.userData.part === 'head' ? 2.2 : 1), dir); this.hitMark(); if (this.bloodDecal) this.bloodDecal(h.point, dir); this.fxp.spawn(h.point, 8, { color: '#a01818', speed: 2, life: .4, gravity: 9, dir: dir.clone().multiplyScalar(.5) }); return; }
    const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : dir.clone().negate();
    this.fxp.spawn(h.point, 6, { color: '#ffd27a', speed: 2.5, life: .3, gravity: 9, dir: n });
    this.smoke.spawn(h.point, 2, { color: '#4a4744', speed: .3, life: .8, up: .4 });
    if (e) this.damageEnt(e, dmg, h.point, dir);
    if (e && !e.dyn && e.type !== 'glass') this.decal(h.point, n);
  }
  damageEnt(e, dmg, point, dir) {
    if (!e.alive) return;
    if (e.body && e.dyn) { e.body.wakeUp(); const imp = (dir || new THREE.Vector3(0, 1, 0)).clone().multiplyScalar(Math.min(dmg * 1.1, e.body.mass * 6)); const pt = point || e.body.position; e.body.applyImpulse(new CANNON.Vec3(imp.x, imp.y, imp.z), new CANNON.Vec3(pt.x, pt.y, pt.z)); }
    if (e.type === 'glass' || (e.type === 'mirror' && e.p.breakable)) { e.hp -= dmg; if (e.hp <= 0) this.shatter(e, point, dir); }
    else if (e.type === 'barrel') { e.hp -= dmg; if (e.hp <= 0) this.explode(e); }
    else if (e.type === 'crate' && e.p.breakable) { e.hp -= dmg; if (e.hp <= 0) this.breakCrate(e); }
  }
  hitMark() { this.hitEl.style.opacity = 1; clearTimeout(this.hmT); this.hmT = setTimeout(() => this.hitEl.style.opacity = 0, 90); }
  tracer(a, b, col) { const g = new THREE.BufferGeometry().setFromPoints([a, b]); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .8 })); this.scene.add(l); this.tracers.push({ l, t: .06 }); }
  decal(p, n) { const m = new THREE.Mesh(new THREE.CircleGeometry(.05, 8), new THREE.MeshBasicMaterial({ color: '#15130f', transparent: true, opacity: .85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })); m.position.copy(p).addScaledVector(n, .005); m.lookAt(p.clone().add(n)); this.scene.add(m); this.decals.push(m); if (this.decals.length > 80) this.scene.remove(this.decals.shift()); }
  use() {
    const cam = this.cam, fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion); _ray.set(cam.position, fwd); _ray.near = 0; _ray.far = this.S.camera === 'tps' ? 6 : 2.6;
    const h = _ray.intersectObjects(this.targets, true)[0]; if (!h) return; const e = h.object.userData.e; if (!e) return;
    if (this.logic && this.logic.listens('use', e)) this.logic.raise('use', e);
    if (e.type === 'door' && e.p.opens === 'press E') this.tryDoor(e);
    if (e.type === 'interact' && this.interact) this.interact(e);
    if (e.type === 'switch') { if (e.p.once && e.used) return; e.used = true; const b = e.root.userData.btn; if (b) { b.position.z -= .03; setTimeout(() => b.position.z += .03, 200); } this.audio.play('click', { pos: e.root.position }); this.activate(e.p.activates); }
  }
  usePrompt() {
    if (this.cut) { this.useEl.style.display = 'none'; return; }
    const cam = this.cam, fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion); _ray.set(cam.position, fwd); _ray.near = 0; _ray.far = this.S.camera === 'tps' ? 6 : 2.6;
    const h = _ray.intersectObjects(this.targets, true)[0]; let t = ''; const e = h && h.object.userData.e;
    if (e && e.type === 'door' && e.p.opens === 'press E') t = e.door.locked ? (e.p.key ? `Locked. Needs ${e.p.key}` : 'Locked') : (e.door.target > .5 ? 'E  Close' : 'E  Open');
    if (e && e.type === 'switch' && !(e.p.once && e.used)) t = 'E  ' + (e.p.prompt || 'Use');
    if (e && e.type === 'interact' && !(e.p.once && e.used)) t = 'E  ' + (e.p.prompt || 'Use');
    if (!t && e && this.logic && this.logic.usable.has(e)) t = 'E  Use';
    this.useEl.textContent = t; this.useEl.style.display = t ? 'block' : 'none';
  }

  /* ---------- doors, physics fx ---------- */
  tryDoor(e) { const d = e.door; if (d.locked) { if (e.p.key && this.player.keys.includes(e.p.key)) { d.locked = false; this.msg('Unlocked with ' + e.p.key, 2); } else { this.msg(e.p.key ? 'Locked. Needs ' + e.p.key : 'Locked', 1.5); this.audio.play('click'); return; } } this.setDoor(e, d.target < .5); }
  setDoor(e, open) { const d = e.door; if (!d) return; if ((d.target > .5) === open) return; d.target = open ? 1 : 0; d.closeT = open ? e.p.autoClose : 0; this.audio.play('door', { pos: e.root.position, radius: 30 }); if (this.logic) this.logic.raise(open ? 'doorOpens' : 'doorCloses', e); }
  applyDoor(e) {
    const d = e.door, [sx, sy] = e.o.s, h = e.root.userData.hinge, leaf = e.root.userData.leaf, m = e.p.motion;
    if (m === 'swing') h.rotation.y = -d.open * Math.PI / 2; else if (m === 'slide up') leaf.position.y = d.open * (sy - .15); else leaf.position.x = d.open * sx * .95;
    h.updateMatrixWorld(true); e.col.box.setFromObject(leaf);
    if (e.body) { const wp = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); leaf.matrixWorld.decompose(wp, q, s); const c = new THREE.Vector3(0, sy / 2, 0).applyMatrix4(leaf.matrixWorld); e.body.position.set(c.x, c.y, c.z); e.body.quaternion.set(q.x, q.y, q.z, q.w); }
  }
  updateDoors(dt) {
    const P = this.player;
    this.ents.forEach(e => {
      if (!e.door || !e.alive) return; const d = e.door;
      if (e.p.opens === 'walk near' && !d.locked) { const near = e.root.position.distanceTo(P.pos) < Math.max(3, e.o.s[0] * 1.2) || this.enemies.some(en => !en.dead && !en.dormant && en.e.root.position.distanceTo(e.root.position) < 2.5); if (near && d.target < .5) this.setDoor(e, true); else if (!near && d.target > .5 && !e.p.autoClose) this.setDoor(e, false); }
      if (d.target > .5 && d.closeT > 0) { d.closeT -= dt; if (d.closeT <= 0) this.setDoor(e, false); }
      if (d.open !== d.target) { const prev = d.open; d.open += Math.sign(d.target - d.open) * Math.min(Math.abs(d.target - d.open), e.p.speed * dt * .6); this.applyDoor(e); if (d.target < d.open && (this.overlap(P.pos.x, P.pos.y, P.pos.z, .32, P.h, null) === e.col)) { d.open = prev; this.applyDoor(e); } }
    });
  }
  shatter(e, point, dir) {
    if (!e.alive) return; const [sx, sy, sz] = e.o.s; e.root.updateMatrixWorld(true); const M = e.root.matrixWorld.clone(); const q = new THREE.Quaternion(); e.root.getWorldQuaternion(q);
    this.removeEnt(e); this.audio.play('glass', { pos: e.root.position, radius: 40 }); this.noise(e.root.position, 15);
    const n = Math.max(4, e.p.shards | 0), cols = Math.max(2, Math.round(Math.sqrt(n * sx / sy) / 1.4)), rows = Math.max(2, Math.round(n / cols / 2));
    const pts = []; for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const ji = (i > 0 && i < cols) ? rand(-.3, .3) : 0, jj = (j > 0 && j < rows) ? rand(-.3, .3) : 0; pts.push([(i + ji) / cols * sx - sx / 2, (j + jj) / rows * sy]); }
    const mat = new THREE.MeshStandardMaterial({ color: e.p.tint, transparent: true, opacity: Math.min(.8, e.p.opacity + .2), roughness: .05, metalness: .2, side: THREE.DoubleSide, depthWrite: false });
    const P = (i, j) => pts[j * (cols + 1) + i];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) [[P(i, j), P(i + 1, j), P(i + 1, j + 1)], [P(i, j), P(i + 1, j + 1), P(i, j + 1)]].forEach(tri => {
      const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(tri.flatMap(p => [p[0] - cx, p[1] - cy, 0]), 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); const wc = new THREE.Vector3(cx, cy, 0).applyMatrix4(M); m.position.copy(wc); m.quaternion.copy(q); this.scene.add(m);
      const w = Math.max(...tri.map(p => p[0])) - Math.min(...tri.map(p => p[0])), h = Math.max(...tri.map(p => p[1])) - Math.min(...tri.map(p => p[1]));
      const b = new CANNON.Body({ mass: .4, linearDamping: .1, angularDamping: .2 }); b.addShape(new CANNON.Box(new CANNON.Vec3(Math.max(.04, w / 3), Math.max(.04, h / 3), .035))); b.position.set(wc.x, wc.y, wc.z); b.quaternion.set(q.x, q.y, q.z, q.w);
      const push = dir ? dir.clone().multiplyScalar(rand(2, 5)) : new THREE.Vector3(); if (point) { const away = wc.clone().sub(point); const d = away.length(); push.addScaledVector(away.normalize(), Math.max(0, 2 - d) * 2); }
      b.velocity.set(push.x + rand(-.5, .5), push.y + rand(-.5, 1), push.z + rand(-.5, .5)); b.angularVelocity.set(rand(-6, 6), rand(-6, 6), rand(-6, 6)); this.world.addBody(b); this.debris.push({ m, b, t: rand(6, 9) });
    });
  }
  breakCrate(e) {
    if (!e.alive) return; const pos = e.body ? new THREE.Vector3(e.body.position.x, e.body.position.y, e.body.position.z) : e.root.position.clone(); const mat = e.root.children[0].material, s = e.o.s;
    this.removeEnt(e); this.audio.play('punch', { pos, rate: .6 });
    for (let i = 0; i < 8; i++) { const w = s[0] * rand(.2, .5), h = s[1] * rand(.08, .2), d = s[2] * rand(.2, .5); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; m.position.copy(pos).add(new THREE.Vector3(rand(-.3, .3), rand(-.3, .3), rand(-.3, .3))); this.scene.add(m); const b = new CANNON.Body({ mass: 1 }); b.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2))); b.position.set(m.position.x, m.position.y, m.position.z); b.velocity.set(rand(-3, 3), rand(1, 4), rand(-3, 3)); b.angularVelocity.set(rand(-5, 5), rand(-5, 5), rand(-5, 5)); this.world.addBody(b); this.debris.push({ m, b, t: rand(5, 8) }); }
    this.dropItem(e.p.drop, pos);
  }
  dropItem(kind, pos) { if (!kind || kind === 'none') return; const o = ENG.newObject('pickup'); o.p = [pos.x, Math.max(0, pos.y - .4), pos.z]; o.props.kind = kind; o.props.amount = kind === 'health' ? 20 : kind === 'armor' ? 25 : 1; o.props.key = 'dropped key'; this.spawn(o); }
  explode(e) {
    if (!e.alive) return; const pos = e.body ? new THREE.Vector3(e.body.position.x, e.body.position.y, e.body.position.z) : e.root.position.clone(); const R = e.p.radius, D = e.p.damage;
    this.removeEnt(e); this.audio.play('explosion', { pos, radius: 80 }); this.noise(pos, 50); this.shake = Math.min(1.5, this.shake + Math.max(0, 1 - pos.distanceTo(this.player.pos) / (R * 3)));
    this.fxp.spawn(pos, 140, { color: '#ff9a3a', speed: 7, life: .55, drag: 2, vary: .5 }); this.fxp.spawn(pos, 60, { color: '#ffe7a0', speed: 12, life: .4, gravity: 12 }); this.smoke.spawn(pos, 50, { color: '#3a3836', speed: 1.5, up: 1.5, life: 3, drag: 1, jitter: .5 });
    this.boom.position.copy(pos); this.boom.distance = R * 4; this.boom.intensity = 8; this.boomT = .3;
    const P = this.player, pd = pos.distanceTo(_v.set(P.pos.x, P.pos.y + 1, P.pos.z)); if (pd < R) this.hurtPlayer(D * (1 - pd / R));
    this.enemies.forEach(en => { const d = pos.distanceTo(en.e.root.position); if (d < R) en.damage(D * (1 - d / R) * 1.5, en.e.root.position.clone().sub(pos).normalize()); });
    if (this.ragdollImpulse) this.ragdollImpulse(pos, R, D);
    this.ents.forEach(o => { if (!o.alive) return; const op = o.body ? o.body.position : o.root.position; const d = pos.distanceTo(_v2.set(op.x, op.y, op.z)); if (d > R) return; if (o.body && o.dyn) { const dir = _v2.clone().sub(pos).normalize().add(new THREE.Vector3(0, .6, 0)); const f = Math.min((1 - d / R) * D * 1.2, o.body.mass * 14); o.body.wakeUp(); o.body.applyImpulse(new CANNON.Vec3(dir.x * f, dir.y * f, dir.z * f), o.body.position); } if (o.type === 'barrel') this.timers.push({ t: .12 + d * .02, fn: () => this.explode(o) }); if (o.type === 'glass') this.shatter(o, pos, _v2.clone().sub(pos).normalize()); if (o.type === 'crate' && o.p.breakable && d < R * .6) this.breakCrate(o); });
    this.debris.forEach(db => { const d = pos.distanceTo(db.m.position); if (d < R) { const dir = db.m.position.clone().sub(pos).normalize(); db.b.velocity.x += dir.x * 8; db.b.velocity.y += dir.y * 8 + 3; db.b.velocity.z += dir.z * 8; } });
  }
  glassBetween(a, b) { const d = b.clone().sub(a), L = d.length(); d.normalize(); _ray.set(a, d); _ray.near = 0; _ray.far = L; const h = _ray.intersectObjects(this.walk, false).find(x => x.object.userData.glass); return h ? { e: h.object.userData.e, point: h.point } : null; }
  noise(pos, r) { this.enemies.forEach(en => { if (!en.dead && !en.dormant && en.e.root.position.distanceTo(pos) < r) en.hear(this.player.pos); }); }

  /* ---------- triggers & logic ---------- */
  byTag(tag) { const t = String(tag || '').split(',').map(s => s.trim()).filter(Boolean); if (!t.length) return []; return this.ents.filter(e => e.alive && e.tags.some(x => t.includes(x))); }
  activate(tag) {
    this.byTag(tag).forEach(e => {
      if (this.logic) this.logic.raise('activated', e);
      if (e.door) { e.door.locked = false; this.setDoor(e, e.door.target < .5); }
      else if (e.type === 'trigger') this.fireTrigger(e, true);
      else if (e.enemy) e.enemy.wake();
      else if (e.light) { e.on = !e.on; e.light.intensity = e.on ? e.base : 0; if (e.root.userData.bulb) e.root.userData.bulb.visible = e.on; }
      else if (e.type === 'emitter') e.on = !e.on;
      else if (e.type === 'speaker') this.speakerOn(e, !e.snd);
      else if (e.type === 'glass') this.shatter(e, null, null);
      else if (e.type === 'barrel') this.explode(e);
      else if (e.type === 'crate') this.breakCrate(e);
    });
  }
  speakerOn(e, on) { if (on) { if (e.snd) return; e.snd = this.audio.play(e.p.sound, { loop: e.p.loop, pos: e.p.radius > 0 ? e.root.position : null, radius: e.p.radius, volume: e.p.volume }); if (!e.p.loop) setTimeout(() => e.snd = null, 50); } else { this.audio.stop(e.snd); e.snd = null; } }
  fireTrigger(e, remote) {
    const p = e.p; if (p.once && e.fired) return; e.fired = true;
    const go = () => {
      const tg = p.target;
      switch (p.action) {
        case 'open door': this.byTag(tg).forEach(x => { if (x.door) { x.door.locked = false; this.setDoor(x, true); } }); break;
        case 'close door': this.byTag(tg).forEach(x => x.door && this.setDoor(x, false)); break;
        case 'toggle door': this.byTag(tg).forEach(x => x.door && this.setDoor(x, x.door.target < .5)); break;
        case 'play cutscene': this.playCutscene(p.cutscene || tg); break;
        case 'show message': this.msg(p.text, Math.max(2.5, p.text.length * .06)); break;
        case 'set objective': this.objective = p.text; this.msg('New objective: ' + p.text, 3); break;
        case 'play sound': this.audio.play(p.sound, { pos: e.root.position, radius: 60 }); break;
        case 'spawn enemies': this.byTag(tg).forEach(x => x.enemy && x.enemy.wake()); break;
        case 'damage player': this.hurtPlayer(p.amount); break;
        case 'heal player': this.heal(p.amount); this.audio.play('pickup'); break;
        case 'give item': this.giveItem(p.item, p.amount, p.text); break;
        case 'teleport player': { const t = this.byTag(tg)[0]; if (t) { this.player.pos.copy(t.root.position); this.player.vel.set(0, 0, 0); this.player.yaw = t.root.rotation.y; } break; }
        case 'save checkpoint': this.checkpoint = { p: this.player.pos.toArray(), yaw: this.player.yaw }; this.msg('Checkpoint saved', 2); break;
        case 'end level (win)': this.endLevel(true, p.text); break;
        case 'end level (lose)': this.endLevel(false, p.text); break;
      }
      if (p.activates) this.activate(p.activates);
    };
    if (p.delay > 0) this.timers.push({ t: p.delay, fn: go }); else go();
  }
  giveItem(kind, amount, keyName) {
    const P = this.player;
    if (kind === 'health') this.heal(amount); else if (kind === 'armor') P.armor = Math.min(100, P.armor + amount);
    else if (kind === 'ammo') { const k = this.wep.cur !== 'fists' ? this.wep.cur : Object.keys(this.wep.owned)[0]; if (k) this.wep.owned[k].res += ENG.WEAPONS[k].mag * Math.max(1, Math.round(amount / 25)); }
    else if (kind === 'key') { if (!P.keys.includes(keyName)) P.keys.push(keyName); this.msg('Picked up ' + keyName, 2); }
    else this.giveWeapon(kind);
    this.audio.play('pickup');
  }
  updateTriggers() {
    const P = this.player, pt = new THREE.Vector3();
    this.ents.forEach(e => {
      if (e.type !== 'trigger' || !e.alive || e.p.when === 'level starts' || this.cut) return; pt.set(P.pos.x, P.pos.y + .9, P.pos.z); e.root.worldToLocal(pt); const [sx, sy, sz] = e.o.s, mg = e.inside ? .3 : 0;
      const inside = Math.abs(pt.x) <= sx / 2 + mg && Math.abs(pt.z) <= sz / 2 + mg && pt.y >= -mg && pt.y <= sy + mg;
      if (this.logic && inside !== !!e.inside && !(e.p.once && (inside ? e.lgIn : e.lgOut))) { this.logic.raise(inside ? 'enter' : 'leave', e); if (inside) e.lgIn = true; else e.lgOut = true; }
      if (inside && !e.inside && e.p.when === 'player enters') this.fireTrigger(e); if (!inside && e.inside && e.p.when === 'player leaves') this.fireTrigger(e); e.inside = inside;
    });
    this.ents.forEach(e => {
      if (e.type !== 'pickup' || !e.alive || e.hidden) return; const rp = e.root.position; if (Math.abs(rp.x - P.pos.x) > 1.1 || Math.abs(rp.z - P.pos.z) > 1.1 || Math.abs(rp.y - P.pos.y) > 1.6) return;
      const k = e.p.kind; if (k === 'health' && P.health >= P.maxHealth) return; if (k === 'armor' && P.armor >= 100) return; if (k === 'ammo' && this.wep.cur === 'fists' && !Object.keys(this.wep.owned).length) return;
      this.giveItem(k, e.p.amount, e.p.key); if (this.logic) this.logic.raise('pickup', e); if (k === 'health') this.msg('+' + e.p.amount + ' health', 1.2); if (k === 'armor') this.msg('+' + e.p.amount + ' armor', 1.2); if (k === 'ammo') this.msg('Ammo', 1);
      if (e.p.respawn > 0) { e.hidden = true; e.root.visible = false; this.timers.push({ t: e.p.respawn, fn: () => { e.hidden = false; e.root.visible = true; } }); } else this.removeEnt(e);
    });
  }
  msg(t, dur) { this.message = t; this.msgT = dur || 3; }
  endLevel(win, text) { if (this.state !== 'play') return; this.state = win ? 'won' : 'lost'; document.exitPointerLock && document.exitPointerLock(); if (win) this.audio.play('win'); const b = [['Play again', () => this.restart()]]; if (this.opt.onExit) b.push(['Back to editor', () => this.quit()]); this.showMenu(win ? 'Level complete' : 'Game over', text || '', b); }

  /* ---------- cutscenes ---------- */
  playCutscene(name) { const cs = (this.project.cutscenes || []).find(c => c.name === name || c.id === name); if (!cs || !cs.keys.length) return; this.cut = { cs, t: 0, keys: cs.keys.slice().sort((a, b) => a.t - b.t), fired: {} }; this.cut.cs = Object.assign({}, cs, { keys: this.cut.keys }); const lb = cs.letterbox !== false ? '11vh' : '0'; this.lbs.forEach(l => l.style.height = lb); this.skipEl.style.display = 'block'; this.mouse.l = false; if (this.vm) this.vm.visible = false; this.hudEl.style.opacity = 0; }
  updateCutscene(dt) {
    const c = this.cut; c.t += dt; const r = ENG.sampleCutscene(c.cs, c.t, this.cam); this.subEl.textContent = r ? r.text : '';
    c.keys.forEach((k, i) => { if (k.activates && c.t >= k.t && !c.fired[i]) { c.fired[i] = true; this.activate(k.activates); } });
    if (!r || c.t >= r.end) this.endCutscene();
  }
  endCutscene() { const c = this.cut; if (!c) return; c.keys.forEach((k, i) => { if (k.activates && !c.fired[i]) { c.fired[i] = true; this.activate(k.activates); } }); this.cut = null; this.lbs.forEach(l => l.style.height = '0'); this.subEl.textContent = ''; this.skipEl.style.display = 'none'; if (this.vm) this.vm.visible = this.S.camera === 'fps'; this.hudEl.style.opacity = 1; if (c.cs.after) this.activate(c.cs.after); }

  /* ---------- main loop ---------- */
  loop(now) {
    const dt = Math.min(.05, Math.max(0, (now - this.last) / 1000)); this.last = now;
    if (this.state === 'play') this.step(dt);
    else if (this.state === 'menu') { this.player.yaw += dt * .05; this.updateCamera(0); }
    if (this.state === 'gone') return;
    if (this.vrRender && ((this.vr && this.vr.on) || this.renderer.xr.isPresenting)) this.vrRender(); else if (this.post) this.post.render(dt); else this.renderer.render(this.scene, this.cam);
  }
  step(dt) {
    const rdt = dt; if (this.updateTime) this.updateTime(rdt); dt = rdt * (this.ts || 1);
    this.time += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
    if (this.queue.length) { const q = this.queue; this.queue = []; q.forEach(f => f()); }
    if (this.updateGameplay) this.updateGameplay(dt);
    this.updatePlayer(Math.min(rdt, dt * 1.8)); if (this.state !== 'play') return;
    if (this.cut) this.updateCutscene(rdt); else this.updateCamera(rdt);
    const W = this.wep; if (W.swap > 0) W.swap -= dt;
    if (W.reload > 0) { W.reload -= dt; if (W.reload <= 0) { const o = W.owned[W.cur], WD = ENG.WEAPONS[W.cur]; const n = Math.min(WD.mag - o.mag, o.res); o.mag += n; o.res -= n; } }
    if (this.mouse.l && !this.cut) this.fire(false);
    if (this.vm) { const P = this.player, hs = Math.hypot(P.vel.x, P.vel.z); const tz = -.5, ty = -.26 + (W.reload > 0 ? -.25 : 0) + (W.swap > 0 ? -.2 : 0) + Math.abs(Math.sin(P.bob * 1.6)) * .012 * Math.min(1, hs / 4); this.vm.position.x = .26 + Math.sin(P.bob * 1.6) * .012 * Math.min(1, hs / 4); this.vm.position.y = lerp(this.vm.position.y, ty, Math.min(1, dt * 14)); this.vm.position.z = lerp(this.vm.position.z, tz, Math.min(1, dt * 10)); this.vm.rotation.x = W.kick * 2; }
    if (this.boomT > 0) { this.boomT -= dt; this.boom.intensity = Math.max(0, this.boomT / .3 * 8); }
    if (this.flash && this.flash.intensity > 0) { this.flash.intensity = Math.max(0, this.flash.intensity - dt * 40); this.flashSpr.material.opacity = Math.max(0, this.flashSpr.material.opacity - dt * 25); }
    this.updateDoors(dt); this.updateTriggers();
    if (!this.cut) this.enemies.forEach(en => en.update(dt));
    this.world.step(1 / 60, dt, 3);
    if (this.bullets) this.updateBullets(dt); if (this.ragdolls) this.updateRagdolls(dt); if (this.updateShells) this.updateShells(dt); if (this.rain) this.rain.update(dt);
    this.ents.forEach(e => {
      if (e.dyn && e.body && e.alive) { const b = e.body, q = new THREE.Quaternion(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w); e.root.quaternion.copy(q); e.root.position.set(b.position.x, b.position.y, b.position.z).add(e.off.clone().applyQuaternion(q)); e.root.updateMatrixWorld(true); (e.dcols || []).forEach(c => c.box.setFromObject(c.m)); if (b.position.y < -100) this.removeEnt(e); }
      if (e.spin && !e.hidden) { e.spin.rotation.y += dt * 1.8; e.spin.position.y = .5 + Math.sin(this.time * 2.4 + e.root.position.x) * .08; }
      if (e.light && e.on && e.p.flicker) e.light.intensity = e.base * (Math.random() < .08 ? rand(0, .4) : rand(.85, 1.05));
      if (e.type === 'emitter' && e.on) { const F = FX[e.p.kind] || FX.fire; e.acc += dt * e.p.rate; const n = Math.floor(e.acc); e.acc -= n; if (n) { const o = Object.assign({}, F, { jitter: e.p.spread * .5 }); (e.p.kind === 'smoke' || e.p.kind === 'steam' ? this.smoke : this.fxp).spawn(e.root.position, n, o); } }
    });
    for (let i = this.debris.length - 1; i >= 0; i--) { const d = this.debris[i]; d.t -= dt; d.m.position.set(d.b.position.x, d.b.position.y, d.b.position.z); d.m.quaternion.set(d.b.quaternion.x, d.b.quaternion.y, d.b.quaternion.z, d.b.quaternion.w); if (d.t <= 0 || d.b.position.y < -50) { this.scene.remove(d.m); this.world.removeBody(d.b); this.debris.splice(i, 1); } }
    for (let i = this.tracers.length - 1; i >= 0; i--) { const t = this.tracers[i]; t.t -= dt; if (t.t <= 0) { this.scene.remove(t.l); this.tracers.splice(i, 1); } }
    this.mixers.forEach(m => m.update(dt)); this.fxp.update(dt); this.smoke.update(dt); this.audio.update(this.cam);
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) this.message = ''; }
    if (this.logic) this.logic.tick();
    this.usePrompt(); this.updateDebug();
    const alive = this.enemies.filter(en => !en.dead).length;
    if (this.S.win === 'kill all enemies' && this.enemies.length && alive === 0 && this.state === 'play') this.endLevel(true, 'All enemies down.');
    const o = W.owned[W.cur];
    this.hudUpdate({ health: this.player.health, maxHealth: this.player.maxHealth, armor: this.player.armor, mag: o ? o.mag : null, res: o ? o.res : null, weapon: ENG.WEAPONS[W.cur].name, objective: this.objective, collected: this.collected || 0, collectTotal: this.collectTotal || 0, bt: this.S.bulletTime ? this.player.bt : null, btOn: !!this.btOn, vars: this.logic && this.logic.lg.vars.length ? this.logic.byName() : null, message: this.cut ? '' : this.message, enemies: alive, keys: this.player.keys, time: this.time, yaw: this.player.yaw, game: this, magMax: o && ENG.WEAPONS[W.cur] ? ENG.WEAPONS[W.cur].mag : null, loadProgress: this.loadProgress });
  }
  dispose() {
    this.renderer.setAnimationLoop(null); this.handlers.forEach(([t, n, f]) => t.removeEventListener(n, f)); window.removeEventListener('resize', this.resize); this.ro.disconnect();
    if (document.pointerLockElement) document.exitPointerLock(); this.audio.dispose(); if (this.post) this.post.dispose();
    if (!this.keepRenderer) { this.renderer.dispose(); this.renderer.forceContextLoss && this.renderer.forceContextLoss(); } this.root.remove(); this.state = 'gone';
  }
};

/* ---------------- enemy AI ---------------- */
class Enemy {
  constructor(g, e) {
    this.g = g; this.e = e; const p = e.p; this.p = p; this.hp = p.health; this.root = e.root; const inner = e.root.children[0] || e.root;
    this.parts = inner.userData.parts; this.mats = (inner.userData.mats || []).map(m => m); this.home = e.root.position.clone(); this.yaw = e.root.rotation.y;
    this.state = p.ai === 'guard' ? 'idle' : 'patrol'; this.target = null; this.cool = rand(.3, 1); this.phase = rand(0, 6); this.alert = false; this.last = null; this.dead = false; this.dt = 0; this.dormant = p.dormant; this.flash = 0; this.stuck = 0; this.losT = 0; this.see = false; this.search = 0; this.aim = 0;
    if (inner.userData.mats) { const ms = inner.userData.mats.map(m => m.clone()); inner.traverse(n => { if (n.isMesh) { const i = inner.userData.mats.indexOf(n.material); if (i >= 0) n.material = ms[i]; } }); this.mats = ms; }
    if (this.dormant) this.root.visible = false;
    this.mixer = null; if (e.mixer) this.mixer = e.mixer;
  }
  clip(names) { const e = this.e; if (!e.clips) return; const c = e.clips.find(c => names.some(n => c.name.toLowerCase().includes(n))); if (!c || c === this.curClip) return; const a = e.mixer.clipAction(c); if (this.curAct) this.curAct.fadeOut(.2); a.reset().fadeIn(.2).play(); if (names[0] === 'death' || names[0] === 'die') { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; } this.curAct = a; this.curClip = c; }
  wake() { if (!this.dormant) { this.hear(this.g.player.pos); return; } this.dormant = false; this.root.visible = true; this.hear(this.g.player.pos); this.g.fxp.spawn(this.root.position.clone().setY(this.root.position.y + 1), 30, { color: '#9fd0ff', speed: 2, life: .5 }); }
  hear(p) { if (this.dead || this.dormant) return; this.alert = true; this.last = p.clone(); if (this.state !== 'attack') this.state = 'chase'; }
  damage(d, dir) {
    if (this.dead || this.dormant) return; this.hp -= d; this.flash = .12; this.hear(this.g.player.pos); if (this.g.logic) this.g.logic.raise(this.hp <= 0 ? 'dies' : 'hurt', this.e, { amount: d });
    this.g.audio.play('enemyHurt', { pos: this.root.position, rate: rand(.9, 1.1) });
    if (dir && this.p.attack === 'melee') this.g.slide(this.root.position, dir.x * .15, dir.z * .15, .35, this.p.height, false, this.e);
    if (this.hp <= 0) { this.dead = true; this.dt = 0; this.fallDir = dir ? Math.sign(dir.dot(new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)))) || -1 : -1; this.g.audio.play('enemyDie', { pos: this.root.position }); this.g.dropItem(this.p.drop, this.root.position); if (this.g.makeRagdoll && !this.e.clips) this.g.makeRagdoll(this, dir); this.clip(['death', 'die']); this.mats.forEach(m => m.emissive && m.emissive.setRGB(0, 0, 0)); }
  }
  update(dt) {
    if (this.dormant) return; const g = this.g, P = g.player, pos = this.root.position, p = this.p;
    if (this.dead) { this.dt += dt; if (this.ragdoll) return; if (!this.e.clips) { const f = Math.min(1, this.dt * 3); this.root.rotation.x = this.fallDir * f * Math.PI / 2 * .98; } return; }
    if (this.flash > 0) { this.flash -= dt; this.mats.forEach(m => m.emissive && m.emissive.setRGB(this.flash > 0 ? .8 : 0, 0, 0)); }
    const dx = P.pos.x - pos.x, dz = P.pos.z - pos.z, dist = Math.hypot(dx, dz) + Math.abs(P.pos.y - pos.y) * .5;
    this.losT -= dt;
    if (this.losT <= 0) {
      this.losT = .2; this.see = false;
      if (P.health > 0 && dist < p.sight) {
        const facing = Math.cos(Math.atan2(dx, dz) - this.yaw); if (this.alert || facing > .2 || dist < 3) {
          const eye = _v.set(pos.x, pos.y + p.height * .9, pos.z), tgt = _v2.set(P.pos.x, P.pos.y + 1.4, P.pos.z), dir = tgt.clone().sub(eye); const L = dir.length(); dir.normalize();
          _ray.set(eye, dir); _ray.near = 0; _ray.far = L; const h = _ray.intersectObjects(g.sightBlock, false); this.see = !h.length;
        }
      }
    }
    if (p.ai === 'hunter' && P.health > 0) { this.alert = true; this.last = P.pos.clone(); if (this.state !== 'attack') this.state = 'chase'; }
    if (this.see) { if (g.logic && g.time - (this.lastSee == null ? -99 : this.lastSee) > 3) g.logic.raise('sees', this.e); this.lastSee = g.time; this.alert = true; this.last = P.pos.clone(); this.search = 3; if (this.state !== 'attack') this.state = 'chase'; }
    let move = null, speed = 0; this.cool -= dt;
    if (this.state === 'idle') { this.yaw = lerpAng(this.yaw, this.e.o.r[1] * D2R, dt * 2); }
    else if (this.state === 'patrol') { if (!this.target || Math.hypot(this.target.x - pos.x, this.target.z - pos.z) < .6 || this.stuck > 1.2) { const r = (p.ai === 'wander' ? 2 : 1) * p.radius; this.target = this.home.clone().add(new THREE.Vector3(rand(-r, r), 0, rand(-r, r))); this.stuck = 0; this.wait = rand(.5, 2.5); } if (this.wait > 0) this.wait -= dt; else { move = this.target; speed = p.speed * .45; } }
    else if (this.state === 'chase' || this.state === 'attack') {
      const ranged = p.attack === 'ranged';
      if (ranged && this.see && dist < p.sight * .85) { this.state = 'attack'; if (dist > p.sight * .5) { move = P.pos; speed = p.speed * .5; } }
      else if (!ranged && dist < 1.6) { this.state = 'attack'; }
      else { this.state = 'chase'; if (this.last) { move = this.last; speed = p.speed; if (Math.hypot(this.last.x - pos.x, this.last.z - pos.z) < .8 && !this.see) { this.search -= dt; if (this.search <= 0) { this.state = p.ai === 'guard' ? 'idle' : 'patrol'; this.alert = false; this.home.copy(pos); } } } }
      if (this.state === 'attack') {
        this.yaw = lerpAng(this.yaw, Math.atan2(dx, dz), dt * 8); this.aim = 1;
        if (this.cool <= 0) {
          this.cool = 1 / p.fireRate * rand(.8, 1.2);
          if (ranged && this.see) {
            const hit = Math.random() < p.accuracy * (1 - dist / p.sight * .5) * (Math.hypot(P.vel.x, P.vel.z) > 6 ? .7 : 1);
            const from = pos.clone().add(new THREE.Vector3(Math.sin(this.yaw) * .4 - Math.cos(this.yaw) * .2, p.height * .7, Math.cos(this.yaw) * .4 + Math.sin(this.yaw) * .2));
            const to = new THREE.Vector3(P.pos.x + (hit ? 0 : rand(-1.5, 1.5)), P.pos.y + 1.3 + (hit ? 0 : rand(-.8, .8)), P.pos.z + (hit ? 0 : rand(-1.5, 1.5)));
            if (g.enemyShoot && g.enemyShoot(this, from, to)) { /* a runtime module fired its own projectile (rogue.js bolts) */ } else {
            const gl = g.glassBetween(from, to), aim = to.clone(), sdir = to.clone().sub(from).normalize(); g.fxp.spawn(from, 5, { color: '#ffcc66', speed: 1.5, life: .12 }); g.audio.play('enemyShot', { pos: from, rate: rand(.9, 1.1) });
            const land = () => { if (gl) g.damageEnt(gl.e, p.damage * 2, gl.point, sdir); else if (hit && aim.distanceTo(new THREE.Vector3(g.player.pos.x, g.player.pos.y + 1.3, g.player.pos.z)) < .9) g.hurtPlayer(p.damage); };
            if (g.fireBullet) g.fireBullet(from, gl ? gl.point : to, land, true); else { g.tracer(from, gl ? gl.point : to, '#ff9a6a'); land(); } }
          } else if (!ranged && dist < 1.8) { g.hurtPlayer(p.damage); g.audio.play('punch', { pos }); if (this.parts) this.parts.armR.rotation.x = -2; }
          else if (!ranged) this.state = 'chase';
        }
        if (!this.see && ranged) this.state = 'chase';
      } else this.aim = 0;
    }
    if (move) {
      const mx = move.x - pos.x, mz = move.z - pos.z, ml = Math.hypot(mx, mz);
      if (ml > .3) {
        const want = Math.atan2(mx, mz); this.yaw = lerpAng(this.yaw, want, dt * 6);
        const sx = Math.sin(this.yaw) * speed * dt, sz = Math.cos(this.yaw) * speed * dt; const before = pos.clone();
        const blocked = g.slide(pos, sx, sz, .35, p.height, true, this.e);
        const gy = g.groundFoot(pos.x, pos.y, pos.z, .3, .6); if (gy !== null) pos.y = gy; else pos.y -= 4 * dt; g.depenetrate(pos, .35, p.height, this.e, .2);
        const moved = pos.distanceTo(before); if (blocked && moved < speed * dt * .3) { this.stuck += dt; if (this.stuck > .6 && this.state === 'chase') { this.yaw += rand(-1.5, 1.5); this.stuck = 0; } } else this.stuck = Math.max(0, this.stuck - dt);
        this.phase += dt * speed * 2.4;
      }
    }
    this.root.rotation.y = this.yaw;
    const walking = !!move && speed > 0;
    if (this.e.clips) this.clip(this.state === 'attack' ? ['attack', 'shoot', 'fire', 'idle'] : walking ? (speed > p.speed * .7 ? ['run', 'walk'] : ['walk', 'run']) : ['idle']);
    else ENG.animateHuman(this.parts, this.phase, walking ? .7 : 0, this.aim && p.attack === 'ranged');
  }
}
ENG.Enemy = Enemy;
function lerpAng(a, b, t) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * Math.min(1, t); }

/* ---------------- standalone boot (exported games) ---------------- */
ENG.boot = function (project) {
  const c = document.getElementById('game'); const start = () => { window.GAME = new ENG.Game(c, project, { onRestart: g => window.GAME = g }); };
  start();
};
})();
