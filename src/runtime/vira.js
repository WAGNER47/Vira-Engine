/* VIRA ENGINE: human characters, shape-built models, gameplay objects. */
(function () {
'use strict';
const ENG = window.ENG, D2R = Math.PI / 180, R2D = 180 / Math.PI, P = ENG.PREFABS, G = ENG.Game.prototype;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
ENG.NAME = 'Vira Engine';
const eo = m => { m.userData.editorOnly = true; m.castShadow = false; m.receiveShadow = false; return m; };
const hmat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o == null ? .35 : o, depthWrite: false });
const shade = (c, k) => '#' + new THREE.Color(c).multiplyScalar(k == null ? .6 : k).getHexString();
function prefab(type, cfg) { cfg.type = type; P[type] = cfg; }
function triUV(g, tile) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2); tile = tile || 1;
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); let u, v; if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); } else if (ax >= az) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); } uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}

/* ======================================================================
   HUMAN CHARACTERS (replaces the block figures)
   ====================================================================== */
ENG.OUTFITS = {
  street: { label: 'Street', skin: '#c99a76', top: '#5b2a24', bottom: '#2f3e5a', shoes: '#d0d0cc', hair: '#2a1d14', head: 'beanie' },
  suit: { label: 'Suit', skin: '#d2a47f', top: '#2b2d33', bottom: '#23252a', shoes: '#111111', hair: '#1c1612', head: 'none', tie: '#7a1f1f' },
  trench: { label: 'Trench coat', skin: '#c08d6a', top: '#3a3128', bottom: '#2a2622', shoes: '#151311', hair: '#191410', head: 'fedora', coat: true },
  soldier: { label: 'Soldier', skin: '#b98a66', top: '#56663a', bottom: '#4a5530', shoes: '#22262b', hair: '#2b2118', head: 'helmet', vest: true },
  guard: { label: 'Guard', skin: '#8d5b3e', top: '#1f2c45', bottom: '#1b2232', shoes: '#111111', hair: '#120d0a', head: 'cap', vest: true, sleeves: 'short' },
  civilian: { label: 'Civilian', skin: '#e0b896', top: '#c8b8a0', bottom: '#5a4a3a', shoes: '#4a3424', hair: '#6b4a2a', head: 'none', sleeves: 'short' }
};
ENG.HEADWEAR = ['none', 'cap', 'beanie', 'helmet', 'fedora'];
ENG.outfitProps = k => { const o = ENG.OUTFITS[k] || ENG.OUTFITS.street; return { outfit: k, skinTone: o.skin, top: o.top, bottom: o.bottom, hair: o.hair, headwear: o.head, outfitSet: true }; };
ENG.applyOutfit = (props, k) => Object.assign(props, ENG.outfitProps(k));
ENG.lookOf = props => { const b = ENG.OUTFITS[props.outfit] || ENG.OUTFITS.street; return Object.assign({}, b, { skin: props.skinTone || b.skin, top: props.top || b.top, bottom: props.bottom || b.bottom, hair: props.hair || b.hair, head: props.headwear || b.head }); };
const lathe = (pts, seg, zs) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg || 22); if (zs) g.scale(1, 1, zs); return g; };
const ell = (x, y, z, w, h) => { const g = new THREE.SphereGeometry(1, w || 20, h || 14); g.scale(x, y, z); return g; };
const dome = (x, y, z, phi) => { const g = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI * (phi || .55)); g.scale(x, y, z); return g; };
let HG = null;
function humanGeo() {
  if (HG) return HG;
  HG = {
    pelvis: lathe([[0, -.1], [.13, -.1], [.155, -.05], [.163, .03], [.155, .1], [0, .1]], 22, .7),
    torso: lathe([[0, 0], [.142, 0], [.148, .07], [.14, .15], [.15, .23], [.172, .32], [.182, .38], [.165, .43], [.09, .46], [0, .46]], 24, .62),
    vest: lathe([[0, .03], [.158, .03], [.163, .11], [.158, .19], [.169, .28], [.188, .35], [.17, .41], [0, .41]], 24, .69),
    coat: lathe([[.205, -.62], [.19, -.35], [.175, -.08], [.168, .1], [0, .1]], 24, .74),
    neck: new THREE.CylinderGeometry(.048, .056, .12, 12), head: ell(.092, .118, .1, 24, 18), jaw: ell(.074, .062, .082, 18, 12),
    nose: new THREE.BoxGeometry(.022, .045, .03), eye: ell(.012, .01, .01, 10, 8), brow: new THREE.BoxGeometry(.03, .007, .012), ear: ell(.012, .028, .02, 10, 8),
    hair: dome(.099, .126, .108, .56), beanie: dome(.103, .132, .112, .5), helmet: dome(.118, .132, .126, .52), capTop: dome(.1, .11, .108, .45),
    brim: new THREE.CylinderGeometry(.11, .11, .012, 20, 1, false, -Math.PI * .45, Math.PI * .9), crown: new THREE.CylinderGeometry(.086, .098, .1, 20), fbrim: new THREE.CylinderGeometry(.17, .17, .012, 24),
    shoulder: ell(.058, .058, .058, 14, 10), uarm: new THREE.CylinderGeometry(.05, .043, .29, 14), elbow: ell(.044, .044, .044, 10, 8), farm: new THREE.CylinderGeometry(.042, .033, .26, 14), hand: new THREE.BoxGeometry(.06, .15, .03),
    thigh: new THREE.CylinderGeometry(.083, .06, .44, 16), knee: ell(.059, .059, .059, 12, 8), shin: new THREE.CylinderGeometry(.058, .042, .42, 14), foot: new THREE.BoxGeometry(.095, .07, .25), tie: new THREE.BoxGeometry(.04, .24, .01)
  };
  return HG;
}
ENG.buildHuman = function (lookIn, opts) {
  opts = opts || {}; const L = Object.assign({}, ENG.OUTFITS.street, lookIn || {}), Gm = humanGeo();
  const root = new THREE.Group(), body = new THREE.Group(); body.scale.setScalar((opts.height || 1.8) / 1.74); root.add(body);
  const mats = [], M = (c, r, m, ds) => { const x = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m || 0 }); if (ds) x.side = THREE.DoubleSide; mats.push(x); return x; };
  const skin = M(L.skin, .62), top = M(L.top, .86), bot = M(L.bottom, .86), shoe = M(L.shoes || '#151515', .45, .05), hair = M(L.hair, .92), dark = M('#0e0e0e', .35), gear = M(shade(L.top, .55), .8, .05);
  const sleeve = L.sleeves === 'short' ? skin : top, parts = {};
  const piv = (par, x, y, z, key) => { const g = new THREE.Group(); g.position.set(x, y, z); par.add(g); if (key) parts[key] = g; return g; };
  const mesh = (par, geo, mat, x, y, z, seg, part) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; m.userData.seg = seg; m.userData.part = part || seg; par.add(m); return m; };
  const hips = piv(body, 0, .93, 0, 'hips'); hips.userData.y0 = .93;
  mesh(hips, Gm.pelvis, bot, 0, 0, 0, 'pelvis'); if (L.coat) mesh(hips, Gm.coat, M(L.top, .88, 0, true), 0, 0, 0, 'pelvis');
  const spine = piv(hips, 0, .08, 0, 'spine');
  mesh(spine, Gm.torso, top, 0, 0, 0, 'chest'); if (L.vest) mesh(spine, Gm.vest, gear, 0, 0, 0, 'chest'); if (L.tie) mesh(spine, Gm.tie, M(L.tie, .6), 0, .3, .1, 'chest');
  const neck = piv(spine, 0, .44, 0, 'neck'); mesh(neck, Gm.neck, skin, 0, .05, 0, 'head', 'head');
  const head = piv(neck, 0, .15, 0, 'head');
  mesh(head, Gm.head, skin, 0, 0, 0, 'head', 'head'); mesh(head, Gm.jaw, skin, 0, -.055, .014, 'head', 'head'); mesh(head, Gm.nose, skin, 0, -.012, .098, 'head', 'head');
  [-1, 1].forEach(s => { mesh(head, Gm.eye, dark, s * .034, .018, .088, 'head', 'head'); mesh(head, Gm.brow, hair, s * .034, .04, .09, 'head', 'head'); mesh(head, Gm.ear, skin, s * .093, 0, -.005, 'head', 'head'); });
  const hw = L.head;
  if (hw === 'helmet') mesh(head, Gm.helmet, gear, 0, .016, -.004, 'head', 'head');
  else if (hw === 'beanie') mesh(head, Gm.beanie, M(shade(L.top, .7), .95), 0, .012, -.006, 'head', 'head');
  else { mesh(head, Gm.hair, hair, 0, .012, -.008, 'head', 'head');
    if (hw === 'cap') { const cm = M(shade(L.top, .9), .8); mesh(head, Gm.capTop, cm, 0, .03, -.004, 'head', 'head'); const b = mesh(head, Gm.brim, cm, 0, .055, .03, 'head', 'head'); b.rotation.y = Math.PI / 2; }
    if (hw === 'cowboy') { const cm = M(L.hat || '#5a3d26', .82); const cr = mesh(head, Gm.crown, cm, 0, .125, -.005, 'head', 'head'); cr.scale.set(1.04, 1.2, 1.18); const br = mesh(head, Gm.fbrim, cm, 0, .072, -.005, 'head', 'head'); br.scale.set(1.28, 1, 1.36); const bd = mesh(head, Gm.crown, M('#1a1410', .6), 0, .088, -.005, 'head', 'head'); bd.scale.set(1.07, .2, 1.24); }
    if (hw === 'fedora') { const fm = M('#1d1b18', .75); mesh(head, Gm.crown, fm, 0, .11, -.005, 'head', 'head'); mesh(head, Gm.fbrim, fm, 0, .07, -.005, 'head', 'head'); } }
  [['L', 1], ['R', -1]].forEach(([k, s]) => {
    const sh = piv(spine, s * .19, .385, 0, 'arm' + k); mesh(sh, Gm.shoulder, top, 0, 0, 0, 'uarm' + k); mesh(sh, Gm.uarm, top, 0, -.145, 0, 'uarm' + k);
    const el = piv(sh, 0, -.29, 0, 'fore' + k); mesh(el, Gm.elbow, sleeve, 0, 0, 0, 'farm' + k); mesh(el, Gm.farm, sleeve, 0, -.13, 0, 'farm' + k); mesh(el, Gm.hand, skin, 0, -.335, .005, 'farm' + k);
    const hp = piv(hips, s * .09, -.06, 0, 'leg' + k); mesh(hp, Gm.thigh, bot, 0, -.22, 0, 'thigh' + k);
    const kn = piv(hp, 0, -.44, 0, 'shin' + k); mesh(kn, Gm.knee, bot, 0, 0, 0, 'shin' + k); mesh(kn, Gm.shin, bot, 0, -.21, 0, 'shin' + k); mesh(kn, Gm.foot, shoe, 0, -.395, .05, 'shin' + k);
  });
  if (opts.gun && ENG.BUILTIN_MODELS['b:pistol']) { const gun = ENG.buildCustom(ENG.BUILTIN_MODELS['b:pistol']); gun.traverse(n => { if (n.isMesh) { n.userData.seg = 'gun'; n.castShadow = true; } }); gun.rotation.x = Math.PI / 2; gun.position.set(0, -.36, .03); parts.foreR.add(gun); parts.gun = gun; }
  root.userData.parts = parts; root.userData.mats = mats; return root;
};
ENG.animateHuman = function (P, ph, a, aim) {
  if (!P || !P.hips) return; const s = Math.sin(ph);
  P.legL.rotation.x = -s * a * .55; P.legR.rotation.x = s * a * .55;
  P.shinL.rotation.x = (Math.max(0, Math.sin(ph + 1.6)) * .95 + .06) * a; P.shinR.rotation.x = (Math.max(0, Math.sin(ph + 1.6 + Math.PI)) * .95 + .06) * a;
  P.hips.position.y = P.hips.userData.y0 + Math.abs(Math.cos(ph)) * a * .022; P.spine.rotation.y = s * a * .08;
  if (aim) { P.armR.rotation.set(-1.45, 0, -.04); P.foreR.rotation.set(-.04, 0, 0); P.armL.rotation.set(-1.22, -.42, .28); P.foreL.rotation.set(-.62, 0, 0); P.spine.rotation.x = .05; }
  else { P.armL.rotation.set(s * a * .45, 0, .07); P.armR.rotation.set(-s * a * .45, 0, -.07); P.foreL.rotation.set(-.14 - Math.max(0, -s) * a * .38, 0, 0); P.foreR.rotation.set(-.14 - Math.max(0, s) * a * .38, 0, 0); P.spine.rotation.x = 0; }
};
/* old projects: enemies painted with a block skin keep their colours */
function colorsFromSkin(p) {
  if (p.outfitSet || !p.skin || p.skin === 'default' || p._fromSkin) return; const s = ENG.skinTex[p.skin]; const c = s && s.base && s.base.image; if (!c || !c.getContext) return;
  const g = c.getContext('2d'), px = (x, y) => { const d = g.getImageData(x, y, 1, 1).data; return d[3] ? '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('') : null; };
  p.skinTone = px(12, 13) || p.skinTone; p.top = px(21, 23) || p.top; p.bottom = px(5, 23) || p.bottom; p.hair = px(12, 2) || p.hair; p._fromSkin = true;
}
{
  const ep = {}, old = P.enemy.props;
  for (const k in old) { if (k === 'skin') { Object.assign(ep, { outfit: { t: 'sel', d: 'street', o: Object.keys(ENG.OUTFITS), l: 'Outfit' }, skinTone: { t: 'color', d: ENG.OUTFITS.street.skin, l: 'Skin tone' }, top: { t: 'color', d: ENG.OUTFITS.street.top, l: 'Top' }, bottom: { t: 'color', d: ENG.OUTFITS.street.bottom, l: 'Pants' }, hair: { t: 'color', d: ENG.OUTFITS.street.hair, l: 'Hair' }, headwear: { t: 'sel', d: 'beanie', o: ENG.HEADWEAR, l: 'Headwear' } }); continue; } ep[k] = old[k]; }
  P.enemy.props = ep; const base = P.enemy.build;
  P.enemy.build = function (o, c) {
    const p = o.props; if (p.model && c.project.assets.models[p.model]) return base(o, c);
    colorsFromSkin(p); const g = new THREE.Group(), hum = ENG.buildHuman(ENG.lookOf(p), { height: p.height, gun: p.attack === 'ranged' });
    g.add(hum); g.userData.parts = hum.userData.parts; g.userData.mats = hum.userData.mats; return g;
  };
}

/* ---------------- human ragdolls (11 bodies, cone-twist joints) ---------------- */
const SEGS = [
  { n: 'pelvis', node: 'hips', mass: 12 }, { n: 'chest', node: 'spine', mass: 22, parent: 'pelvis', joint: 'spine', cone: .35, twist: .25 }, { n: 'head', node: 'neck', mass: 5, parent: 'chest', joint: 'neck', cone: .5, twist: .45 },
  { n: 'uarmL', node: 'armL', mass: 2.5, parent: 'chest', joint: 'armL', cone: 1.3, twist: .8 }, { n: 'farmL', node: 'foreL', mass: 1.8, parent: 'uarmL', joint: 'foreL', cone: .9, twist: .15 },
  { n: 'uarmR', node: 'armR', mass: 2.5, parent: 'chest', joint: 'armR', cone: 1.3, twist: .8 }, { n: 'farmR', node: 'foreR', mass: 1.8, parent: 'uarmR', joint: 'foreR', cone: .9, twist: .15 },
  { n: 'thighL', node: 'legL', mass: 8, parent: 'pelvis', joint: 'legL', cone: .85, twist: .35 }, { n: 'shinL', node: 'shinL', mass: 4.5, parent: 'thighL', joint: 'shinL', cone: .75, twist: .1 },
  { n: 'thighR', node: 'legR', mass: 8, parent: 'pelvis', joint: 'legR', cone: .85, twist: .35 }, { n: 'shinR', node: 'shinR', mass: 4.5, parent: 'thighR', joint: 'shinR', cone: .75, twist: .1 },
  { n: 'gun', node: 'foreR', mass: 1.2 }
];
const CORN = [-1, 1];
G.makeRagdoll = function (enemy, dir, force) {
  if (this.S.ragdolls === false) return false; const root = enemy.root, parts = root.userData.parts; if (!parts || !parts.hips || !root.visible) return false;
  root.updateMatrixWorld(true); const seg = {}; root.traverse(m => { if (m.isMesh && m.userData.seg) (seg[m.userData.seg] = seg[m.userData.seg] || []).push(m); });
  const rd = { parts: [], bodies: {}, joints: [], t: 0, frozen: false }, W = this.world, wp = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), box = new THREE.Box3(), rel = new THREE.Matrix4();
  for (const S of SEGS) {
    const node = parts[S.node], meshes = seg[S.n]; if (!node || !meshes || !meshes.length) continue;
    node.matrixWorld.decompose(wp, q, sc); const frame = new THREE.Matrix4().compose(wp, q, one), inv = frame.clone().invert(); box.makeEmpty();
    meshes.forEach(m => { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox; rel.multiplyMatrices(inv, m.matrixWorld); for (const x of CORN) for (const y of CORN) for (const z of CORN) { v.set(x < 0 ? b.min.x : b.max.x, y < 0 ? b.min.y : b.max.y, z < 0 ? b.min.z : b.max.z).applyMatrix4(rel); box.expandByPoint(v); } });
    const c = box.getCenter(new THREE.Vector3()), hs = box.getSize(new THREE.Vector3()).multiplyScalar(.5), bc = c.clone().applyMatrix4(frame);
    const body = new CANNON.Body({ mass: S.mass, linearDamping: .08, angularDamping: .5 }); body.addShape(new CANNON.Box(new CANNON.Vec3(Math.max(.03, hs.x), Math.max(.03, hs.y), Math.max(.03, hs.z))));
    body.position.set(bc.x, bc.y, bc.z); body.quaternion.set(q.x, q.y, q.z, q.w); body.collisionFilterGroup = 2; body.collisionFilterMask = 1; W.addBody(body);
    const g = new THREE.Group(); g.position.copy(bc); g.quaternion.copy(q); this.scene.add(g); g.updateMatrixWorld(true);
    meshes.forEach(m => { g.attach(m); m.userData.rag = { rd, body }; }); this.targets.push(g); rd.parts.push({ g, body, n: S.n }); rd.bodies[S.n] = body;
  }
  for (const S of SEGS) {
    if (!S.parent || !rd.bodies[S.n] || !rd.bodies[S.parent]) continue; const a = rd.bodies[S.n], b = rd.bodies[S.parent], jp = parts[S.joint].getWorldPosition(new THREE.Vector3()), wv = new CANNON.Vec3(jp.x, jp.y, jp.z);
    const c = new CANNON.ConeTwistConstraint(a, b, { pivotA: a.pointToLocalFrame(wv), pivotB: b.pointToLocalFrame(wv), axisA: new CANNON.Vec3(0, 1, 0), axisB: b.vectorToLocalFrame(a.vectorToWorldFrame(new CANNON.Vec3(0, 1, 0))), angle: S.cone, twistAngle: S.twist, maxForce: 1e6 });
    W.addConstraint(c); rd.joints.push(c);
  }
  rd.bodies.body = rd.bodies.chest || rd.bodies.pelvis; root.visible = false;
  if (dir && rd.bodies.body) { const f = force || 30, T = rd.bodies.body, imp = new CANNON.Vec3(dir.x * f, Math.max(.15, dir.y) * f * .5 + 4, dir.z * f); T.applyImpulse(imp, T.position); if (rd.bodies.head) rd.bodies.head.applyImpulse(new CANNON.Vec3(imp.x * .15, imp.y * .1, imp.z * .15), rd.bodies.head.position); }
  enemy.ragdoll = rd; this.ragdolls.push(rd); const live = this.ragdolls.filter(r => !r.frozen); if (live.length > 6) this.freezeRagdoll(live[0]);
  this.player.bt = Math.min(1, (this.player.bt || 0) + .22); return true;
};

/* ======================================================================
   SHAPE-BUILT MODELS (made in the Model tab, or built in)
   ====================================================================== */
ENG.SHAPES = {
  box: { label: 'Box', d: { w: 1, h: 1, d: 1 } }, cyl: { label: 'Cylinder', d: { r: .5, r2: .5, h: 1, seg: 24 } }, sphere: { label: 'Sphere', d: { w: 1, h: 1, d: 1, seg: 24 } },
  cone: { label: 'Cone', d: { r: .5, h: 1, seg: 24 } }, torus: { label: 'Ring', d: { R: .5, t: .15, seg: 32, arc: 360 } }, capsule: { label: 'Capsule', d: { r: .25, h: 1, seg: 16 } },
  wedge: { label: 'Wedge', d: { w: 1, h: 1, d: 1 } }, tube: { label: 'Pipe', d: { r: .5, t: .08, h: 1, seg: 24 } }, dome: { label: 'Dome', d: { r: .5, seg: 24 } },
  prism: { label: 'Prism', d: { r: .5, h: 1, sides: 6 } }, plane: { label: 'Panel', d: { w: 1, h: 1 } }
};
ENG.shapeGeometry = function (kind, d, tile) {
  d = Object.assign({}, (ENG.SHAPES[kind] || ENG.SHAPES.box).d, d || {}); let g; const seg = Math.max(3, Math.round(d.seg || 24));
  switch (kind) {
    case 'cyl': g = new THREE.CylinderGeometry(Math.max(.001, d.r), Math.max(.001, d.r2), d.h, seg); break;
    case 'sphere': g = new THREE.SphereGeometry(.5, seg, Math.max(6, seg >> 1)); g.scale(d.w, d.h, d.d); break;
    case 'cone': g = new THREE.ConeGeometry(d.r, d.h, seg); break;
    case 'torus': g = new THREE.TorusGeometry(d.R, Math.max(.001, d.t), 12, seg, clamp(d.arc || 360, 1, 360) * D2R); break;
    case 'capsule': { const r = Math.max(.001, d.r), hh = Math.max(0, d.h / 2 - r), pts = []; for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i / 8 * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r), -hh + Math.sin(a) * r)); } for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r), hh + Math.sin(a) * r)); } g = new THREE.LatheGeometry(pts, seg); break; }
    case 'wedge': { const sh = new THREE.Shape(); sh.moveTo(-.5, -.5); sh.lineTo(.5, -.5); sh.lineTo(-.5, .5); sh.closePath(); g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -.5); g.rotateY(Math.PI / 2); g.scale(d.w, d.h, d.d); g.computeVertexNormals(); break; }
    case 'tube': { const r = d.r, t = Math.min(d.t, d.r * .95), h = d.h / 2; g = new THREE.LatheGeometry([new THREE.Vector2(r - t, -h), new THREE.Vector2(r, -h), new THREE.Vector2(r, h), new THREE.Vector2(r - t, h), new THREE.Vector2(r - t, -h)], seg); break; }
    case 'dome': g = new THREE.SphereGeometry(d.r, seg, Math.max(4, seg >> 2), 0, Math.PI * 2, 0, Math.PI / 2); break;
    case 'prism': g = new THREE.CylinderGeometry(d.r, d.r, d.h, Math.max(3, Math.round(d.sides || 6))); break;
    case 'plane': g = new THREE.PlaneGeometry(d.w, d.h); break;
    default: g = new THREE.BoxGeometry(d.w, d.h, d.d);
  }
  return triUV(g, tile);
};
const MAT0 = { color: '#9aa3ab', rough: .55, metal: 0, glow: 0, opacity: 1, tex: 'none', tile: 1 };
ENG.partMaterial = function (m, kind, project) {
  m = Object.assign({}, MAT0, m || {});
  const mat = new THREE.MeshStandardMaterial({ color: m.color, roughness: m.rough, metalness: m.metal, map: ENG.texture(m.tex, project) });
  if (m.glow > 0) { mat.emissive = new THREE.Color(m.color); mat.emissiveIntensity = m.glow; }
  if (m.opacity < 1) { mat.transparent = true; mat.opacity = m.opacity; mat.depthWrite = m.opacity > .7; }
  if (kind === 'plane' || kind === 'tube' || (kind === 'torus' && (m.arc || 360) < 360)) mat.side = THREE.DoubleSide; return mat;
};
ENG.buildCustom = function (model, opts) {
  opts = opts || {}; const root = new THREE.Group(), nodes = {}, cache = {}, parts = (model && model.parts) || [];
  parts.forEach(p => {
    let n; if (p.kind === 'group') n = new THREE.Group();
    else if (p.kind === 'sculpt' && ENG.SCULPT) { /* a sculpted mesh (sculptmesh.js); painted sculpts use their vertex colors */
      const geo = ENG.SCULPT.geometry(opts.project, p.d), vc = !!geo.attributes.color, key = JSON.stringify(p.m || {}) + 'sculpt' + (vc ? 'vc' : '') + (geo.userData.flat ? 'ds' : '');
      const mat = cache[key] || (cache[key] = (() => { const m = ENG.partMaterial(Object.assign({}, p.m, vc ? { color: '#ffffff' } : {}), 'sculpt', opts.project); m.vertexColors = vc; if (geo.userData.flat) m.side = THREE.DoubleSide; return m; })());
      n = new THREE.Mesh(geo, mat); const d = p.d || {}; n.scale.set(d.sx || 1, d.sy || 1, d.sz || 1); n.castShadow = true; n.receiveShadow = true; }
    else { const key = JSON.stringify(p.m || {}) + p.kind; const mat = cache[key] || (cache[key] = ENG.partMaterial(p.m, p.kind, opts.project)); n = new THREE.Mesh(ENG.shapeGeometry(p.kind, p.d, (p.m && p.m.tile) || 1), mat); n.castShadow = !(mat.transparent && mat.opacity < .5); n.receiveShadow = true; }
    const pp = p.p || [0, 0, 0], r = p.r || [0, 0, 0]; n.position.set(pp[0], pp[1], pp[2]); n.rotation.set(r[0] * D2R, r[1] * D2R, r[2] * D2R); n.userData.partId = p.id; if (opts.hidden && opts.hidden.has(p.id)) n.visible = false; nodes[p.id] = n;
  });
  parts.forEach(p => { const par = p.parent && nodes[p.parent] && p.parent !== p.id ? nodes[p.parent] : root; par.add(nodes[p.id]); });
  root.userData.nodes = nodes; return root;
};
ENG.modelDef = (project, id) => (project && project.models && project.models[id]) || ENG.BUILTIN_MODELS[id] || null;

/* ---------------- built-in models ---------------- */
let PID = 0;
const pt = (kind, pos, d, m, rot, name) => ({ id: 'q' + (++PID), name: name || kind, kind, parent: null, p: pos, r: rot || [0, 0, 0], d, m: Object.assign({}, MAT0, m || {}) });
const C = (c, r, m) => ({ color: c, rough: r == null ? .6 : r, metal: m || 0 });
const MT = { wood: { color: '#7a5434', rough: .7, tex: 'wood', tile: .7 }, dwood: { color: '#4a3220', rough: .7, tex: 'wood', tile: .7 }, metal: C('#9aa1a8', .3, .85), dmetal: C('#2c2f34', .4, .7), rubber: C('#141414', .92), fabric: C('#56506a', .95), white: C('#e8e6e0', .8), chrome: C('#d7dde2', .12, 1), glass: { color: '#a9c8d8', rough: .05, metal: .1, opacity: .32 }, concrete: { color: '#9a9a96', rough: .9, tex: 'concrete', tile: 1 }, brick: { color: '#a9705a', rough: .85, tex: 'brick', tile: 1 } };
const glow = (c, g) => ({ color: c, rough: .4, glow: g || 2 });
const legs4 = (x, y, z, d, m, kind) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => pt(kind || 'box', [a * x, y, b * z], d, m, null, 'Leg'));
const BM = ENG.BUILTIN_MODELS = {};
const def = (id, name, sub, parts) => { BM[id] = { id, name, cat: 'Props', sub, parts, collide: 'parts', v: 1, builtin: true }; };
def('b:table', 'Table', 'Furniture', [pt('box', [0, .74, 0], { w: 1.4, h: .06, d: .8 }, MT.wood, null, 'Top'), ...legs4(.62, .355, .32, { w: .07, h: .71, d: .07 }, MT.wood)]);
def('b:chair', 'Chair', 'Furniture', [pt('box', [0, .45, 0], { w: .46, h: .05, d: .46 }, MT.wood, null, 'Seat'), ...legs4(.19, .215, .19, { w: .045, h: .43, d: .045 }, MT.wood), pt('box', [-.19, .7, -.2], { w: .045, h: .5, d: .045 }, MT.wood, null, 'Post'), pt('box', [.19, .7, -.2], { w: .045, h: .5, d: .045 }, MT.wood, null, 'Post'), pt('box', [0, .82, -.2], { w: .42, h: .22, d: .035 }, MT.wood, null, 'Backrest')]);
def('b:couch', 'Couch', 'Furniture', [pt('box', [0, .24, 0], { w: 2, h: .38, d: .9 }, MT.fabric, null, 'Base'), pt('box', [-.48, .5, .05], { w: .94, h: .14, d: .72 }, MT.fabric, null, 'Cushion'), pt('box', [.48, .5, .05], { w: .94, h: .14, d: .72 }, MT.fabric, null, 'Cushion'), pt('box', [0, .66, -.34], { w: 2, h: .48, d: .22 }, MT.fabric, null, 'Back'), pt('box', [-1, .33, 0], { w: .22, h: .55, d: .9 }, MT.fabric, null, 'Arm'), pt('box', [1, .33, 0], { w: .22, h: .55, d: .9 }, MT.fabric, null, 'Arm'), ...legs4(.9, .03, .38, { r: .03, r2: .03, h: .06, seg: 10 }, MT.dwood, 'cyl')]);
{ const s = [pt('box', [-.45, 1, 0], { w: .04, h: 2, d: .36 }, MT.wood, null, 'Side'), pt('box', [.45, 1, 0], { w: .04, h: 2, d: .36 }, MT.wood, null, 'Side'), pt('box', [0, 1, -.17], { w: .94, h: 2, d: .02 }, MT.dwood, null, 'Back')]; [.02, .5, 1, 1.5, 1.98].forEach(y => s.push(pt('box', [0, y, 0], { w: .86, h: .03, d: .34 }, MT.wood, null, 'Shelf')));
  const bc = ['#7a2f2a', '#2f4a6b', '#3e5a35', '#8a6a2a', '#5a3a6a', '#2b2b2b', '#9a8a6a']; [.5, 1, 1.5].forEach((y, row) => { let x = -.38; for (let i = 0; i < 7; i++) { const w = .05 + ((i * 7 + row * 3) % 5) * .012, hh = .26 + ((i * 5 + row) % 4) * .03; s.push(pt('box', [x + w / 2, y + .015 + hh / 2, .02], { w, h: hh, d: .22 }, C(bc[(i + row) % 7], .8), null, 'Book')); x += w + .008; } });
  def('b:shelf', 'Bookshelf', 'Furniture', s); }
def('b:bed', 'Bed', 'Furniture', [pt('box', [0, .2, 0], { w: 1.5, h: .3, d: 2.1 }, MT.dwood, null, 'Frame'), pt('box', [0, .46, 0], { w: 1.4, h: .22, d: 2 }, MT.white, null, 'Mattress'), pt('box', [0, .63, -.75], { w: 1.2, h: .12, d: .4 }, MT.white, null, 'Pillow'), pt('box', [0, .6, .38], { w: 1.42, h: .08, d: 1.2 }, C('#3d4a63', .95), null, 'Blanket'), pt('box', [0, .65, -1.04], { w: 1.5, h: .9, d: .06 }, MT.dwood, null, 'Headboard')]);
def('b:desk', 'Desk', 'Furniture', [pt('box', [0, .75, 0], { w: 1.3, h: .05, d: .65 }, MT.wood, null, 'Top'), pt('box', [-.61, .36, 0], { w: .04, h: .72, d: .62 }, MT.wood, null, 'Side'), pt('box', [.61, .36, 0], { w: .04, h: .72, d: .62 }, MT.wood, null, 'Side'), pt('box', [.36, .55, 0], { w: .46, h: .3, d: .6 }, MT.dwood, null, 'Drawers'), pt('box', [.36, .55, .31], { w: .12, h: .02, d: .02 }, MT.chrome, null, 'Handle')]);
def('b:cabinet', 'Fridge', 'Furniture', [pt('box', [0, .9, 0], { w: .8, h: 1.8, d: .66 }, C('#d9dcd8', .35, .2), null, 'Body'), pt('box', [0, 1.22, .335], { w: .78, h: .01, d: .01 }, MT.dmetal, null, 'Seam'), pt('cyl', [.32, .9, .36], { r: .015, r2: .015, h: .5, seg: 8 }, MT.chrome, null, 'Handle')]);
def('b:plant', 'Potted plant', 'Furniture', [pt('cyl', [0, .17, 0], { r: .2, r2: .15, h: .34, seg: 18 }, C('#a85a3a', .85), null, 'Pot'), pt('sphere', [0, .55, 0], { w: .5, h: .45, d: .5, seg: 14 }, C('#3f6b34', .9), null, 'Leaves'), pt('sphere', [.12, .75, .05], { w: .32, h: .32, d: .32, seg: 12 }, C('#4b7d3c', .9), null, 'Leaves'), pt('sphere', [-.1, .72, -.08], { w: .3, h: .3, d: .3, seg: 12 }, C('#36602d', .9), null, 'Leaves')]);
def('b:lamp_post', 'Street lamp', 'Street', [pt('cyl', [0, .15, 0], { r: .14, r2: .16, h: .3, seg: 14 }, MT.dmetal, null, 'Base'), pt('cyl', [0, 2.05, 0], { r: .055, r2: .065, h: 3.8, seg: 12 }, MT.dmetal, null, 'Pole'), pt('box', [0, 3.92, .42], { w: .06, h: .06, d: .9 }, MT.dmetal, null, 'Arm'), pt('box', [0, 3.86, .86], { w: .32, h: .12, d: .46 }, MT.dmetal, null, 'Head'), pt('box', [0, 3.79, .86], { w: .26, h: .02, d: .38 }, glow('#ffe3b0', 3), null, 'Bulb')]);
def('b:bench', 'Bench', 'Street', [...[-.15, 0, .15].map(z => pt('box', [0, .45, z], { w: 1.6, h: .04, d: .12 }, MT.wood, null, 'Slat')), pt('box', [0, .7, -.24], { w: 1.6, h: .1, d: .03 }, MT.wood, [-12, 0, 0], 'Back slat'), pt('box', [0, .85, -.27], { w: 1.6, h: .1, d: .03 }, MT.wood, [-12, 0, 0], 'Back slat'), pt('box', [-.7, .225, 0], { w: .06, h: .45, d: .5 }, MT.dmetal, null, 'Leg'), pt('box', [.7, .225, 0], { w: .06, h: .45, d: .5 }, MT.dmetal, null, 'Leg'), pt('box', [-.7, .6, -.25], { w: .05, h: .5, d: .05 }, MT.dmetal, [-12, 0, 0], 'Support'), pt('box', [.7, .6, -.25], { w: .05, h: .5, d: .05 }, MT.dmetal, [-12, 0, 0], 'Support')]);
def('b:trash', 'Trash can', 'Containers', [pt('cyl', [0, .4, 0], { r: .26, r2: .23, h: .8, seg: 20 }, C('#4b5a50', .5, .5), null, 'Can'), pt('cyl', [0, .83, 0], { r: .28, r2: .28, h: .05, seg: 20 }, C('#3e4a42', .5, .5), null, 'Lid'), pt('torus', [0, .7, 0], { R: .26, t: .012, seg: 24, arc: 360 }, MT.dmetal, [90, 0, 0], 'Rim')]);
def('b:dumpster', 'Dumpster', 'Containers', [pt('box', [0, .6, 0], { w: 1.9, h: 1.1, d: 1.1 }, C('#2f4a3a', .55, .4), null, 'Body'), pt('box', [0, 1.19, -.05], { w: 1.95, h: .05, d: 1.15 }, C('#26392e', .55, .4), [6, 0, 0], 'Lid'), ...[[-.8, -.45], [.8, -.45], [-.8, .45], [.8, .45]].map(([x, z]) => pt('cyl', [x, .05, z], { r: .06, r2: .06, h: .05, seg: 12 }, MT.rubber, [90, 0, 0], 'Wheel'))]);
def('b:cone', 'Traffic cone', 'Street', [pt('box', [0, .015, 0], { w: .4, h: .03, d: .4 }, C('#e2621b', .6), null, 'Base'), pt('cone', [0, .31, 0], { r: .15, h: .56, seg: 20 }, C('#e2621b', .6), null, 'Cone'), pt('cyl', [0, .36, 0], { r: .092, r2: .108, h: .09, seg: 20 }, C('#f2f2f2', .4), null, 'Stripe')]);
def('b:barrier', 'Concrete barrier', 'Architecture', [pt('box', [0, .15, 0], { w: 1.8, h: .3, d: .6 }, MT.concrete, null, 'Foot'), pt('wedge', [0, .45, .13], { w: 1.8, h: .3, d: .17 }, MT.concrete, [0, 180, 0], 'Slope'), pt('wedge', [0, .45, -.13], { w: 1.8, h: .3, d: .17 }, MT.concrete, null, 'Slope'), pt('box', [0, .7, 0], { w: 1.8, h: .5, d: .2 }, MT.concrete, null, 'Top')]);
def('b:railing', 'Railing', 'Architecture', [...[-1.5, -.5, .5, 1.5].map(x => pt('cyl', [x, .5, 0], { r: .025, r2: .025, h: 1, seg: 10 }, MT.dmetal, null, 'Post')), pt('cyl', [0, 1, 0], { r: .03, r2: .03, h: 3.1, seg: 10 }, MT.dmetal, [0, 0, 90], 'Top rail'), pt('cyl', [0, .5, 0], { r: .018, r2: .018, h: 3, seg: 8 }, MT.dmetal, [0, 0, 90], 'Mid rail')]);
def('b:pipes', 'Pipe run', 'Architecture', [pt('tube', [0, 2.5, 0], { r: .12, t: .02, h: 3, seg: 18 }, MT.metal, [0, 0, 90], 'Pipe'), pt('torus', [1.5, 2.2, 0], { R: .3, t: .12, seg: 18, arc: 90 }, MT.metal, [0, 0, 0], 'Elbow'), pt('tube', [1.8, 1.1, 0], { r: .12, t: .02, h: 2.2, seg: 18 }, MT.metal, null, 'Drop'), pt('torus', [-.6, 2.5, .14], { R: .12, t: .015, seg: 18, arc: 360 }, C('#a42a22', .5, .3), [0, 90, 0], 'Valve')]);
{ const W = [pt('box', [-1.4, 1.5, 0], { w: 1.2, h: 3, d: .2 }, MT.brick, null, 'Wall'), pt('box', [1.4, 1.5, 0], { w: 1.2, h: 3, d: .2 }, MT.brick, null, 'Wall'), pt('box', [0, .5, 0], { w: 1.6, h: 1, d: .2 }, MT.brick, null, 'Below window'), pt('box', [0, 2.6, 0], { w: 1.6, h: .8, d: .2 }, MT.brick, null, 'Above window'), pt('box', [0, 1.6, 0], { w: 1.5, h: 1.1, d: .02 }, MT.glass, null, 'Glass'), pt('box', [0, 1.6, 0], { w: 1.6, h: .05, d: .1 }, MT.dwood, null, 'Bar'), pt('box', [0, 1.6, 0], { w: .05, h: 1.2, d: .1 }, MT.dwood, null, 'Bar')];
  [[0, 2.17, 1.6, .06], [0, 1.03, 1.6, .06]].forEach(([x, y, w, h]) => W.push(pt('box', [x, y, 0], { w, h, d: .24 }, MT.dwood, null, 'Frame'))); [-.78, .78].forEach(x => W.push(pt('box', [x, 1.6, 0], { w: .06, h: 1.2, d: .24 }, MT.dwood, null, 'Frame'))); def('b:wall_window', 'Wall with window', 'Architecture', W); }
def('b:door_frame', 'Door frame', 'Architecture', [pt('box', [-.56, 1.15, 0], { w: .12, h: 2.3, d: .25 }, MT.dwood, null, 'Post'), pt('box', [.56, 1.15, 0], { w: .12, h: 2.3, d: .25 }, MT.dwood, null, 'Post'), pt('box', [0, 2.37, 0], { w: 1.24, h: .15, d: .25 }, MT.dwood, null, 'Lintel')]);
{ const paint = { color: '#8a1f1f', rough: .32, metal: .55 }, car = [pt('box', [0, .62, 0], { w: 4.2, h: .5, d: 1.8 }, paint, null, 'Body'), pt('box', [1.45, .93, 0], { w: 1.25, h: .12, d: 1.74 }, paint, null, 'Hood'), pt('box', [-1.72, .93, 0], { w: .76, h: .12, d: 1.74 }, paint, null, 'Trunk'), pt('box', [-.2, 1.14, 0], { w: 2.1, h: .44, d: 1.6 }, MT.glass, null, 'Windows'), pt('box', [-.25, 1.39, 0], { w: 1.8, h: .07, d: 1.56 }, paint, null, 'Roof'), pt('box', [.86, 1.14, 0], { w: .07, h: .5, d: 1.58 }, paint, [0, 0, 35], 'Front pillar'), pt('box', [-1.26, 1.14, 0], { w: .07, h: .5, d: 1.58 }, paint, [0, 0, -30], 'Rear pillar'), pt('box', [2.13, .5, 0], { w: .1, h: .2, d: 1.84 }, MT.dmetal, null, 'Front bumper'), pt('box', [-2.13, .5, 0], { w: .1, h: .2, d: 1.84 }, MT.dmetal, null, 'Rear bumper'), pt('box', [2.12, .62, 0], { w: .04, h: .18, d: .7 }, MT.dmetal, null, 'Grille')];
  [.62, -.62].forEach(z => { car.push(pt('box', [2.11, .72, z], { w: .05, h: .12, d: .34 }, glow('#fff4d6', 3), null, 'Headlight')); car.push(pt('box', [-2.11, .76, z], { w: .05, h: .1, d: .32 }, glow('#ff2a2a', 2), null, 'Tail light')); });
  [[1.35, .84], [1.35, -.84], [-1.35, .84], [-1.35, -.84]].forEach(([x, z]) => { car.push(pt('torus', [x, .36, z], { R: .27, t: .1, seg: 28, arc: 360 }, MT.rubber, null, 'Tire')); car.push(pt('cyl', [x, .36, z], { r: .2, r2: .2, h: .14, seg: 20 }, MT.chrome, [90, 0, 0], 'Rim')); });
  def('b:car', 'Car', 'Vehicles', car); }
{ const wh = [pt('torus', [0, .42, 0], { R: .3, t: .12, seg: 30, arc: 360 }, MT.rubber, null, 'Tire'), pt('cyl', [0, .42, 0], { r: .24, r2: .24, h: .16, seg: 24 }, MT.chrome, [90, 0, 0], 'Rim'), pt('cyl', [0, .42, 0], { r: .07, r2: .07, h: .22, seg: 14 }, MT.dmetal, [90, 0, 0], 'Hub')];
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; wh.push(pt('box', [Math.sin(a) * .13, .42 + Math.cos(a) * .13, 0], { w: .035, h: .2, d: .03 }, MT.chrome, [0, 0, -a * R2D], 'Spoke')); } def('b:wheel', 'Wheel', 'Vehicles', wh); }
def('b:pistol', 'Pistol', 'Weapon props', [pt('box', [0, .12, 0], { w: .035, h: .04, d: .2 }, MT.dmetal, null, 'Slide'), pt('box', [0, .09, -.005], { w: .03, h: .03, d: .17 }, C('#1d1f22', .5, .4), null, 'Frame'), pt('box', [0, .035, -.07], { w: .032, h: .1, d: .05 }, MT.rubber, [-15, 0, 0], 'Grip'), pt('cyl', [0, .12, .105], { r: .008, r2: .008, h: .02, seg: 10 }, MT.dmetal, [90, 0, 0], 'Muzzle'), pt('torus', [0, .07, .01], { R: .02, t: .004, seg: 16, arc: 360 }, MT.dmetal, [0, 90, 0], 'Trigger guard')]);
def('b:rifle', 'Rifle', 'Weapon props', [pt('box', [0, .1, 0], { w: .05, h: .08, d: .42 }, MT.dmetal, null, 'Receiver'), pt('cyl', [0, .11, .42], { r: .012, r2: .012, h: .42, seg: 10 }, MT.dmetal, [90, 0, 0], 'Barrel'), pt('box', [0, .1, .3], { w: .056, h: .065, d: .28 }, C('#3e4636', .8), null, 'Handguard'), pt('box', [0, .085, -.33], { w: .045, h: .11, d: .26 }, MT.wood, null, 'Stock'), pt('box', [0, 0, .08], { w: .035, h: .16, d: .06 }, MT.dmetal, [14, 0, 0], 'Magazine'), pt('box', [0, .035, -.1], { w: .035, h: .1, d: .04 }, MT.rubber, [-18, 0, 0], 'Grip'), pt('cyl', [0, .17, 0], { r: .02, r2: .02, h: .22, seg: 12 }, MT.dmetal, [90, 0, 0], 'Scope')]);
def('b:terminal', 'Computer terminal', 'Interactive', [pt('box', [0, .75, 0], { w: 1.1, h: .05, d: .6 }, MT.dmetal, null, 'Desk'), pt('box', [-.52, .37, 0], { w: .04, h: .72, d: .56 }, MT.dmetal, null, 'Side'), pt('box', [.52, .37, 0], { w: .04, h: .72, d: .56 }, MT.dmetal, null, 'Side'), pt('box', [0, 1.08, -.14], { w: .58, h: .42, d: .06 }, C('#1c1e22', .4, .3), null, 'Monitor'), pt('plane', [0, 1.08, -.105], { w: .52, h: .36 }, glow('#38f59a', 1.4), null, 'Screen'), pt('box', [0, .785, .1], { w: .46, h: .025, d: .16 }, C('#2a2c30', .5), null, 'Keyboard'), pt('box', [.36, .26, -.02], { w: .2, h: .45, d: .45 }, MT.dmetal, null, 'Tower')]);
def('b:note', 'Clipboard note', 'Interactive', [pt('box', [0, .006, 0], { w: .24, h: .012, d: .32 }, C('#5a4030', .8), null, 'Board'), pt('plane', [0, .013, .01], { w: .21, h: .28 }, C('#efe9da', .9), [-90, 0, 0], 'Paper'), pt('box', [0, .016, -.14], { w: .1, h: .012, d: .03 }, MT.chrome, null, 'Clip')]);

/* ---------------- prefab: custom model ---------------- */
prefab('custom', { label: 'Model', cat: 'My models', size: [1, 1, 1], props: { model: { t: 'cmodel', d: '', l: 'Model' }, collide: { t: 'bool', d: true, l: 'Solid' }, solidMode: { t: 'sel', d: 'solid', o: ['solid', 'walk only'], l: 'Collision' }, physics: { t: 'sel', d: 'static', o: ['static', 'dynamic'], l: 'Physics' }, mass: { t: 'num', d: 20, min: .1, max: 5000, step: 1, l: 'Mass (kg)' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const g = new THREE.Group(), def = ENG.modelDef(c.project, o.props.model);
  if (!def || !def.parts.length) { const ph = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#f0b43c', wireframe: true })); ph.position.y = .5; g.add(ph); return g; }
  const m = ENG.buildCustom(def, { project: c.project }); m.scale.set(o.s[0], o.s[1], o.s[2]); g.add(m);
  if (o.props.collide !== false && def.collide !== 'none') m.traverse(n => { if (n.isMesh && !(n.material.transparent && n.material.opacity < .3)) { n.userData.walk = true; n.userData.solid = o.props.solidMode !== 'walk only'; } });
  return g;
} });

/* ======================================================================
   GAMEPLAY OBJECTS
   ====================================================================== */
prefab('checkpoint', { label: 'Checkpoint', cat: 'Gameplay', size: [1, 1, 1], props: { radius: { t: 'num', d: 1.4, min: .5, max: 10, step: .1, l: 'Radius' }, message: { t: 'text', d: 'Checkpoint', l: 'Message' }, heal: { t: 'bool', d: false, l: 'Refill health' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const g = new THREE.Group(), r = o.props.radius, ring = new THREE.Mesh(new THREE.TorusGeometry(r, .035, 8, 48), new THREE.MeshStandardMaterial({ color: '#4cc3b8', emissive: '#4cc3b8', emissiveIntensity: 1.3 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = .03; g.add(ring); g.userData.ring = ring;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, 1.2, 10), new THREE.MeshStandardMaterial({ color: '#2c2f34', metalness: .6, roughness: .4 })); pole.position.set(r * .9, .6, 0); pole.castShadow = true; g.add(pole);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), new THREE.MeshBasicMaterial({ color: '#4cc3b8', toneMapped: false })); lamp.position.set(r * .9, 1.25, 0); g.add(lamp); g.userData.lamp = lamp; return g;
} });
prefab('spawner', { label: 'Enemy spawn point', cat: 'Gameplay', size: [1, 1, 1], props: { start: { t: 'sel', d: 'player comes near', o: ['level starts', 'player comes near', 'activated by tag'], l: 'Starts when' }, near: { t: 'num', d: 12, min: 1, max: 200, step: .5, l: 'Near distance (m)' }, total: { t: 'num', d: 4, min: 1, max: 200, step: 1, l: 'Enemies in total' }, alive: { t: 'num', d: 2, min: 1, max: 30, step: 1, l: 'At once (most)' }, every: { t: 'num', d: 3, min: .2, max: 120, step: .1, l: 'Seconds between spawns' }, outfit: { t: 'sel', d: 'suit', o: Object.keys(ENG.OUTFITS), l: 'Outfit' }, attack: { t: 'sel', d: 'ranged', o: ['ranged', 'melee'], l: 'Attack' }, health: { t: 'num', d: 60, min: 1, max: 5000, step: 5, l: 'Health' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const g = new THREE.Group(); if (!c.editor) return g;
  const ring = eo(new THREE.Mesh(new THREE.TorusGeometry(.6, .02, 6, 40), hmat('#e5534b', .9))); ring.rotation.x = Math.PI / 2; ring.position.y = .03; g.add(ring);
  const b = eo(new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 1.7, 12), hmat('#e5534b', .22))); b.position.y = .85; g.add(b);
  const a = eo(new THREE.Mesh(new THREE.ConeGeometry(.14, .35, 10), hmat('#e5534b', .85))); a.rotation.x = Math.PI / 2; a.position.set(0, .2, .7); g.add(a); return g;
} });
prefab('mover', { label: 'Moving platform', cat: 'Gameplay', size: [2.4, .3, 2.4], props: { dx: { t: 'num', d: 0, min: -200, max: 200, step: .5, l: 'Travel X (m)' }, dy: { t: 'num', d: 0, min: -200, max: 200, step: .5, l: 'Travel Y (m)' }, dz: { t: 'num', d: 6, min: -200, max: 200, step: .5, l: 'Travel Z (m)' }, speed: { t: 'num', d: 1.6, min: .1, max: 30, step: .1, l: 'Speed (m/s)' }, wait: { t: 'num', d: 1.2, min: 0, max: 60, step: .1, l: 'Wait at ends (s)' }, mode: { t: 'sel', d: 'back and forth', o: ['back and forth', 'one way'], l: 'Moves' }, startOn: { t: 'bool', d: true, l: 'Moving at start' }, color: { t: 'color', d: '#59636e', l: 'Color' }, texture: { t: 'tex', d: 'metal', l: 'Texture' }, tile: { t: 'num', d: 1, min: .25, max: 16, step: .25, l: 'Texture size (m)' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const [sx, sy, sz] = o.s, p = o.props, g = new THREE.Group(), geo = triUV(new THREE.BoxGeometry(sx, sy, sz), p.tile); geo.translate(0, sy / 2, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: p.color, map: ENG.texture(p.texture, c.project), roughness: .45, metalness: .5 })); m.castShadow = m.receiveShadow = true; m.userData.walk = true; m.userData.solid = true; g.add(m);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(sx * 1.002, .04, sz * 1.002), new THREE.MeshStandardMaterial({ color: '#f2c230', map: ENG.texture('hazard', c.project), roughness: .6 })); stripe.position.y = sy - .02; g.add(stripe);
  if (c.editor) { const end = new THREE.Vector3(p.dx, p.dy, p.dz); const ln = eo(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, sy / 2, 0), end.clone().add(new THREE.Vector3(0, sy / 2, 0))]), new THREE.LineDashedMaterial({ color: '#4cc3b8', dashSize: .3, gapSize: .2 }))); ln.computeLineDistances(); g.add(ln); const gh = eo(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), hmat('#4cc3b8', .18))); gh.position.copy(end).add(new THREE.Vector3(0, sy / 2, 0)); g.add(gh); }
  return g;
} });
prefab('trap', { label: 'Trap', cat: 'Gameplay', size: [2, 1, 2], props: { kind: { t: 'sel', d: 'spikes', o: ['spikes', 'fire', 'laser'], l: 'Kind' }, damage: { t: 'num', d: 25, min: 0, max: 1000, step: 1, l: 'Damage' }, every: { t: 'num', d: 2.5, min: .2, max: 60, step: .1, l: 'Cycle (s)' }, active: { t: 'num', d: 1, min: .1, max: 60, step: .1, l: 'Active for (s)' }, alarm: { t: 'text', d: '', l: 'Crossing activates tag' }, startOn: { t: 'bool', d: true, l: 'On at start' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const [sx, sy, sz] = o.s, k = o.props.kind, g = new THREE.Group(), dm = new THREE.MeshStandardMaterial({ color: '#2c2f34', metalness: .7, roughness: .4 });
  if (k === 'laser') { [-1, 1].forEach(s => { const post = new THREE.Mesh(new THREE.BoxGeometry(.08, sy, .08), dm); post.position.set(s * sx / 2, sy / 2, 0); post.castShadow = true; g.add(post); }); const beam = new THREE.Mesh(new THREE.BoxGeometry(sx, .016, .016), new THREE.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false })); beam.position.y = sy * .55; g.add(beam); g.userData.beam = beam; return g; }
  const plate = new THREE.Mesh(new THREE.BoxGeometry(sx, .05, sz), dm); plate.position.y = .025; plate.receiveShadow = true; plate.userData.walk = true; g.add(plate);
  if (k === 'spikes') { const sp = new THREE.Group(), cm = new THREE.MeshStandardMaterial({ color: '#b9bec4', metalness: .85, roughness: .25 }), cg = new THREE.ConeGeometry(.045, .34, 8); for (let x = -sx / 2 + .15; x <= sx / 2 - .1; x += .26) for (let z = -sz / 2 + .15; z <= sz / 2 - .1; z += .26) { const s = new THREE.Mesh(cg, cm); s.position.set(x, .2, z); s.castShadow = true; sp.add(s); } g.add(sp); g.userData.spikes = sp; }
  else { for (let x = -sx / 2 + .1; x < sx / 2; x += .16) { const bar = new THREE.Mesh(new THREE.BoxGeometry(.03, .02, sz * .96), new THREE.MeshStandardMaterial({ color: '#4a2a18', metalness: .5, roughness: .6, emissive: '#ff5a1a', emissiveIntensity: .25 })); bar.position.set(x, .06, 0); g.add(bar); } }
  return g;
} });
prefab('interact', { label: 'Interactable', cat: 'Gameplay', size: [1, 1, 1], props: { model: { t: 'cmodel', d: 'b:terminal', l: 'Looks like' }, prompt: { t: 'text', d: 'Use terminal', l: 'Prompt' }, title: { t: 'text', d: 'Terminal', l: 'Note title' }, text: { t: 'area', d: 'ACCESS LOG\nThe night shift left early. Nobody locked the back door.', l: 'Note text (shown when used)' }, activates: { t: 'text', d: '', l: 'Activates tag' }, sound: { t: 'sound', d: 'preset:click', l: 'Sound' }, once: { t: 'bool', d: false, l: 'Only once' }, collide: { t: 'bool', d: true, l: 'Solid' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const g = new THREE.Group(), def = ENG.modelDef(c.project, o.props.model); if (!def) { const b = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .5), new THREE.MeshStandardMaterial({ color: '#4cc3b8' })); b.position.y = .25; g.add(b); return g; }
  const m = ENG.buildCustom(def, { project: c.project }); m.scale.set(o.s[0], o.s[1], o.s[2]); g.add(m); if (o.props.collide !== false) m.traverse(n => { if (n.isMesh) { n.userData.walk = true; n.userData.solid = true; } }); return g;
} });
/* pickups: keys with colours, collectibles, real weapon models */
{
  const pk = P.pickup; pk.props.kind.o = ['health', 'ammo', 'armor', 'pistol', 'shotgun', 'rifle', 'key', 'collectible'];
  Object.assign(pk.props, { keyColor: { t: 'color', d: '#e5534b', l: 'Key color' }, look: { t: 'sel', d: 'gem', o: ['gem', 'document', 'coin'], l: 'Collectible looks like' } });
  const base = pk.build;
  pk.build = function (o, c) {
    const k = o.props.kind; if (!['key', 'collectible', 'pistol', 'shotgun', 'rifle'].includes(k)) return base(o, c);
    const g = new THREE.Group(), spin = new THREE.Group(); spin.position.y = .5; g.add(spin); g.userData.spin = spin; const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; spin.add(m); return m; };
    if (k === 'key') { const km = new THREE.MeshStandardMaterial({ color: o.props.keyColor, metalness: .75, roughness: .3, emissive: o.props.keyColor, emissiveIntensity: .3 }); add(new THREE.TorusGeometry(.07, .022, 8, 18), km, 0, .1); add(new THREE.BoxGeometry(.03, .2, .02), km, 0, -.06); add(new THREE.BoxGeometry(.06, .025, .02), km, .03, -.13); add(new THREE.BoxGeometry(.045, .025, .02), km, .02, -.08); }
    else if (k === 'collectible') { const lk = o.props.look; if (lk === 'document') { const d = add(new THREE.BoxGeometry(.24, .32, .01), new THREE.MeshStandardMaterial({ color: '#efe9da', roughness: .9, emissive: '#efe9da', emissiveIntensity: .15 })); d.rotation.x = -.25; add(new THREE.BoxGeometry(.14, .02, .012), new THREE.MeshStandardMaterial({ color: '#7a2f2a' }), 0, .08, .008); } else if (lk === 'coin') { const cn = add(new THREE.CylinderGeometry(.14, .14, .03, 28), new THREE.MeshStandardMaterial({ color: '#e8b830', metalness: 1, roughness: .25, emissive: '#e8b830', emissiveIntensity: .25 })); cn.rotation.x = Math.PI / 2; } else add(new THREE.OctahedronGeometry(.17), new THREE.MeshStandardMaterial({ color: '#5ff0ff', metalness: .2, roughness: .1, emissive: '#3fd8ff', emissiveIntensity: .9, transparent: true, opacity: .9 })); }
    else { const def = BM[k === 'pistol' ? 'b:pistol' : 'b:rifle']; const m = ENG.buildCustom(def); if (k === 'shotgun') m.traverse(n => { if (n.isMesh && n.userData.partId) n.material = n.material.clone(); }); m.scale.setScalar(k === 'pistol' ? 2 : 1.4); m.position.y = -.12; spin.add(m); }
    if (c.editor) { const ring = eo(new THREE.Mesh(new THREE.TorusGeometry(.45, .02, 6, 24), hmat('#4cc3b8', .7))); ring.rotation.x = Math.PI / 2; ring.position.y = .05; g.add(ring); }
    return g;
  };
}

/* ---------------- runtime for the gameplay objects ---------------- */
G.spawnExtra = function (e) {
  const T = e.type, o = e.o, ud = (e.root.children[0] && e.root.children[0].userData) || {};
  if (T === 'checkpoint') e.cp = { hit: false, ring: ud.ring, lamp: ud.lamp };
  else if (T === 'mover') {
    const p = o.props, off = new THREE.Vector3(p.dx, p.dy, p.dz).applyEuler(e.root.rotation); e.mv = { start: e.root.position.clone(), off, t: 0, dir: 1, wait: 0, on: !!p.startOn, last: new THREE.Vector3(), delta: new THREE.Vector3() };
    this.cols = this.cols.filter(c => c.e !== e); e.col = { box: new THREE.Box3().setFromObject(e.root), m: e.root, e, dyn: true }; this.cols.push(e.col);
    const [sx, sy, sz] = o.s; e.body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC }); e.body.addShape(new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2))); e.body.collisionFilterMask = -1; this.world.addBody(e.body);
  }
  else if (T === 'spawner') e.sp = { on: o.props.start === 'level starts', spawned: 0, alive: [], t: 0 };
  else if (T === 'trap') { e.tr = { t: 0, on: !!o.props.startOn, hitT: 0, active: false, spikes: ud.spikes, beam: ud.beam, inBeam: false }; if (e.tr.spikes) e.tr.spikes.position.y = -.32; }
  else if (T === 'pickup' && o.props.kind === 'collectible') this.collectTotal = (this.collectTotal || 0) + 1;
};
const _lp = new THREE.Vector3();
G.updateGameplay = function (dt) {
  const P = this.player;
  for (const e of this.ents) {
    if (!e.alive) continue;
    if (e.mv) {
      const m = e.mv, p = e.p; m.last.copy(e.root.position);
      if (m.on) { if (m.wait > 0) m.wait -= dt; else { const L = m.off.length() || 1; m.t += m.dir * (p.speed / L) * dt; if (m.t >= 1) { m.t = 1; if (p.mode === 'one way') m.on = false; else { m.dir = -1; m.wait = p.wait; } } else if (m.t <= 0) { m.t = 0; m.dir = 1; m.wait = p.wait; if (p.mode === 'one way') m.on = false; } } }
      const k = m.t * m.t * (3 - 2 * m.t); e.root.position.copy(m.start).addScaledVector(m.off, k); e.root.updateMatrixWorld(true); e.col.box.setFromObject(e.root); m.delta.subVectors(e.root.position, m.last);
      const c = new THREE.Vector3(0, e.o.s[1] / 2, 0).applyQuaternion(e.root.quaternion).add(e.root.position); e.body.position.set(c.x, c.y, c.z); e.body.quaternion.set(e.root.quaternion.x, e.root.quaternion.y, e.root.quaternion.z, e.root.quaternion.w);
      if (P.onGround && P.groundEnt === e && m.delta.lengthSq() > 0) P.pos.add(m.delta);
    } else if (e.cp) {
      if (e.cp.hit) continue; const rp = e.root.position, r = e.p.radius, dx = P.pos.x - rp.x, dz = P.pos.z - rp.z;
      if (dx * dx + dz * dz < r * r && Math.abs(P.pos.y - rp.y) < 2) { e.cp.hit = true; this.checkpoint = { p: [rp.x, rp.y, rp.z], yaw: P.yaw }; this.msg(e.p.message || 'Checkpoint', 2); if (e.p.heal) P.health = P.maxHealth; this.audio.play('pickup', { rate: 1.3 }); if (e.cp.ring) { e.cp.ring.material.color.set('#57d27a'); e.cp.ring.material.emissive.set('#57d27a'); } if (e.cp.lamp) e.cp.lamp.material.color.set('#57d27a'); if (this.logic) this.logic.raise('enter', e); }
    } else if (e.sp) {
      const s = e.sp, p = e.p; s.alive = s.alive.filter(x => !x.dead);
      if (!s.on && p.start === 'player comes near' && e.root.position.distanceTo(P.pos) < p.near) s.on = true;
      if (s.on && s.spawned < p.total && s.alive.length < p.alive) { s.t -= dt; if (s.t <= 0) {
        s.t = p.every; const o = ENG.newObject('enemy'), a = s.spawned * 2.399, rp = e.root.position; o.p = [rp.x + Math.cos(a) * .7, rp.y, rp.z + Math.sin(a) * .7]; o.r = [0, e.o.r[1], 0]; Object.assign(o.props, ENG.outfitProps(p.outfit), { attack: p.attack, health: p.health, ai: 'hunter' }); o.name = 'Spawned ' + (s.spawned + 1);
        const ne = this.spawn(o); if (ne.enemy) { s.alive.push(ne.enemy); if (ne.enemy.hear) ne.enemy.hear(P.pos.clone()); } s.spawned++; this.fxp.spawn(new THREE.Vector3(o.p[0], rp.y + 1, o.p[2]), 24, { color: '#9fd0ff', speed: 1.6, life: .5 });
      } }
    } else if (e.tr) {
      const t = e.tr, p = e.p, [sx, sy, sz] = e.o.s;
      if (!t.on) t.active = false; else { t.t += dt; t.active = p.kind === 'laser' ? true : (t.t % Math.max(.2, p.every)) < p.active; }
      _lp.set(P.pos.x, P.pos.y, P.pos.z); e.root.worldToLocal(_lp);
      if (p.kind === 'laser') {
        if (t.beam) t.beam.visible = t.on; const by = sy * .55, side = _lp.z >= 0 ? 1 : -1, inSpan = Math.abs(_lp.x) < sx / 2 && _lp.y < by && _lp.y + P.h > by;
        const cross = t.on && inSpan && ((t.side && side !== t.side) || Math.abs(_lp.z) < .22); t.side = side;
        if (cross && !t.inBeam) { if (p.alarm) this.activate(p.alarm); if (p.damage > 0) this.hurtPlayer(p.damage); this.audio.play('click', { rate: .5 }); } t.inBeam = cross;
      } else {
        const inside = Math.abs(_lp.x) < sx / 2 && Math.abs(_lp.z) < sz / 2 && _lp.y > -.6 && _lp.y < (p.kind === 'fire' ? 2.6 : 1);
        if (t.spikes) { const goal = t.active ? 0 : -.32; t.spikes.position.y += (goal - t.spikes.position.y) * Math.min(1, dt * 22); }
        if (p.kind === 'fire' && t.active) { for (let i = 0; i < 3; i++) { const q = new THREE.Vector3((Math.random() - .5) * sx, .1, (Math.random() - .5) * sz); e.root.localToWorld(q); this.fxp.spawn(q, 2, { color: '#ff8a2a', speed: .5, spread: .4, up: 3.2, life: .7, vary: .4 }); } }
        if (t.active && inside && this.time > t.hitT && p.damage > 0) { t.hitT = this.time + .6; this.hurtPlayer(p.damage); }
      }
    }
  }
};
const baseActivate = G.activate;
G.activate = function (tag) {
  this.byTag(tag).forEach(e => { if (e.mv) { e.mv.on = !e.mv.on; if (e.mv.on && e.p.mode === 'one way' && e.mv.t >= 1) e.mv.dir = -1; } if (e.sp) e.sp.on = true; if (e.tr) e.tr.on = !e.tr.on; });
  return baseActivate.call(this, tag);
};
G.interact = function (e) {
  const p = e.p; if (p.once && e.used) return; e.used = true; if (p.sound) this.audio.play(p.sound, { pos: e.root.position, radius: 30 });
  const txt = p.text ? (this.logic ? ENG.Logic.fmtText(p.text, this.logic.byName()) : p.text) : ''; if (txt) this.showNote(p.title, txt); if (p.activates) this.activate(p.activates);
};
G.showNote = function (title, text) { if (!this.noteEl) this.noteEl = this.div('kz-note'); this.noteEl.innerHTML = (title ? '<h3>' + ENG.esc(title) + '</h3>' : '') + '<p>' + ENG.esc(text) + '</p><span>Press E to close</span>'; this.noteEl.style.display = 'block'; this.reading = true; this.keys = {}; this.mouse.l = false; };
G.closeNote = function () { if (this.noteEl) this.noteEl.style.display = 'none'; this.reading = false; };
const baseGive = G.giveItem;
G.giveItem = function (kind, amount, keyName) {
  if (kind === 'collectible') { this.collected = (this.collected || 0) + 1; this.msg('Collected ' + this.collected + ' of ' + (this.collectTotal || this.collected), 2); this.audio.play('pickup', { rate: 1.5 }); return; }
  return baseGive.call(this, kind, amount, keyName);
};
ENG.HUD_KINDS.collectibles = 'Collectibles counter'; ENG.HUD_PROPS.collectibles = { label: ['text', 'Label'] };
ENG.CSS += `.kz-note{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,82vw);max-height:70vh;overflow:auto;background:#e9e2cf;color:#2a241a;padding:26px 30px 20px;box-shadow:0 20px 60px rgba(0,0,0,.6);display:none;pointer-events:auto;border-radius:3px}
.kz-note h3{margin:0 0 10px;font:700 22px "Chakra Petch",sans-serif;letter-spacing:.02em}.kz-note p{margin:0 0 14px;font:500 17px/1.6 Georgia,serif;white-space:pre-line}.kz-note span{font:600 12px "Chakra Petch",sans-serif;opacity:.6}`;

/* ---------------- logic additions ---------------- */
if (ENG.Logic) {
  const L = ENG.Logic;
  L.EVENTS.pickup = { cat: 'Player', label: 'The player picks something up', text: 'the player picks up {item}', subject: 'item', params: { item: { t: 'ref', of: ['pickup'], any: true } } };
  L.EVENTS.enter.params.zone.of = ['trigger', 'checkpoint']; L.EVENTS.leave.params.zone.of = ['trigger', 'checkpoint'];
  L.ACTIONS.platform = { cat: 'Game', label: 'Start or stop a moving platform', text: '{mode} {mover}', params: { mode: { t: 'enum', o: [['start', 'start'], ['stop', 'stop'], ['toggle', 'toggle']], d: 'start' }, mover: { t: 'ref', of: ['mover'] } }, run(c, p) { const e = c.ref(p.mover); if (!e || !e.mv) return c.fail('That platform is missing'); e.mv.on = p.mode === 'start' ? true : p.mode === 'stop' ? false : !e.mv.on; } };
  Object.assign(L.KINDS, { checkpoint: 'checkpoint', mover: 'platform', spawner: 'spawn point', trap: 'trap', interact: 'interactable', pickup: 'pickup', custom: 'model' });
}
})();
