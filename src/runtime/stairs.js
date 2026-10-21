/* VIRA STAIRS: drawn, adjustable stairs. Concrete, wood, metal grate, open wood or ramp, with railings and a landing.
   Every tread is walkable, so players climb smoothly; step count follows the step height you choose. */
(function () {
'use strict';
const ENG = window.ENG;
const KINDS = { concrete: { c: '#8f9298', tex: 'concrete', tile: 2 }, wood: { c: '#8a5a36', tex: 'wood', tile: 1.2 }, metal: { c: '#6b737d', tex: 'grate', tile: .6 }, openwood: { c: '#9a6a40', tex: 'wood', tile: 1.2 }, ramp: { c: '#8f9298', tex: 'concrete', tile: 2 } };
const box = (w, h, d, tile) => { const g = new THREE.BoxGeometry(w, h, d), p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); uv.setXY(i, (ax > .5 ? p.getZ(i) : p.getX(i)) / tile, (ay > .5 ? p.getZ(i) : p.getY(i)) / tile); } uv.needsUpdate = true; return g; };
ENG.STAIR_KINDS = KINDS;
ENG.PREFABS.stairs_pro = { type: 'stairs_pro', label: 'Stairs (adjustable)', cat: 'Build', size: [1, 1, 1], props: {
  kind: { t: 'sel', d: 'concrete', o: ['concrete', 'wood', 'metal', 'openwood', 'ramp'], l: 'Type' },
  run: { t: 'num', d: 4.6, min: .4, max: 60, step: .05, l: 'Length (m)' }, rise: { t: 'num', d: 3.5, min: .2, max: 40, step: .05, l: 'Height (m)' }, width: { t: 'num', d: 1.4, min: .4, max: 12, step: .05, l: 'Width (m)' },
  stepH: { t: 'num', d: .18, min: .03, max: .8, step: .01, l: 'Step height (m)' }, landing: { t: 'num', d: 0, min: 0, max: 10, step: .05, l: 'Top landing (m)' },
  layout: { t: 'sel', d: 'straight', o: ['straight', 'switchback'], l: 'Layout' }, nosing: { t: 'bool', d: false, l: 'Step edges' }, gap: { t: 'num', d: .2, min: 0, max: 3, step: .05, l: 'Gap between flights (m)' },
  rail: { t: 'sel', d: 'both', o: ['both', 'left', 'right', 'none'], l: 'Railings' }, color: { t: 'color', d: '', l: 'Colour (empty uses the type colour)' }, collide: { t: 'bool', d: true, l: 'Walkable' } },
  build(o, c) {
    if (o.props.layout === 'switchback') { const P = o.props, W = Math.max(.3, +P.width || 1.2), G = Math.max(0, P.gap == null ? .2 : +P.gap), RI = Math.max(.2, +P.rise || 3), RU = Math.max(.6, +P.run || 4), g = new THREE.Group(), mk = (props, x, y, z, ry) => { const f = ENG.PREFABS.stairs_pro.build({ props: Object.assign({}, P, props) }, c); f.position.set(x, y, z); f.rotation.y = ry; g.add(f); };
      const fl = { layout: 'straight', rise: RI / 2, run: RU, landing: 0, width: W }; mk(Object.assign({}, fl, { rail: 'left' }), -(W / 2 + G / 2), 0, 0, 0);
      const K = KINDS[P.kind] || KINDS.concrete, lmat = ENG.partMaterial({ color: P.color || K.c, tex: K.tex, tile: K.tile }, 'box', c && c.project), LW = 2 * W + G, open = P.kind === 'metal' || P.kind === 'openwood', addL = (geo, m, x, y, z, walk) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = me.receiveShadow = true; if (walk && P.collide !== false) me.userData.walk = true; g.add(me); };
      if (open) { addL(box(LW, .1, W, K.tile), lmat, 0, RI / 2 - .05, RU + W / 2, true); const fm = ENG.partMaterial({ color: '#2c3036', tex: 'metal', tile: 1 }, 'box', c && c.project); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => addL(box(.08, RI / 2, .08, 1), fm, sx * (LW / 2 - .05), RI / 4, RU + W / 2 + sz * (W / 2 - .05), false)); }
      else addL(box(LW, RI / 2, W, K.tile), lmat, 0, RI / 4, RU + W / 2, true);
      mk(Object.assign({}, fl, { rail: 'right' }), W / 2 + G / 2, RI / 2, RU, Math.PI); return g; }
    const P = o.props, K = KINDS[P.kind] || KINDS.concrete, g = new THREE.Group(), W = Math.max(.3, +P.width || 1.4), RI = Math.max(.1, +P.rise || 3), LD = Math.min(Math.max(0, +P.landing || 0), Math.max(0, (+P.run || 4) - .3)), RU = Math.max(.3, (+P.run || 4) - LD), N = Math.max(1, Math.round(RI / Math.max(.05, +P.stepH || .18))), sh = RI / N, tr = RU / N;
    const pj = c && c.project, mat = ENG.partMaterial({ color: P.color || K.c, tex: K.tex, tile: K.tile }, 'box', pj), frame = ENG.partMaterial({ color: P.kind === 'openwood' ? '#5e3f24' : '#2c3036', tex: P.kind === 'openwood' ? 'wood' : 'metal', tile: 1 }, 'box', pj), railM = ENG.partMaterial({ color: P.kind === 'wood' || P.kind === 'openwood' ? '#6b4528' : '#3a3f46', tex: 'metal', tile: 1 }, 'box', pj);
    const add = (geo, m, x, y, z, walk, rx) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); if (rx) mesh.rotation.x = rx; mesh.castShadow = mesh.receiveShadow = true; if (walk && P.collide !== false) mesh.userData.walk = true; g.add(mesh); return mesh; };
    const ang = Math.atan2(RI, RU), L = Math.hypot(RI, RU);
    if (P.kind === 'ramp') { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(RU, 0); s.lineTo(RU, RI); s.closePath(); const geo = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: false }); geo.rotateY(-Math.PI / 2); geo.translate(W / 2, 0, 0); const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getZ(i) + p.getX(i)) / K.tile, p.getY(i) / K.tile); uv.needsUpdate = true; geo.computeVertexNormals(); add(geo, mat, 0, 0, 0, true); if (LD > 0) add(box(W, RI, LD, K.tile), mat, 0, RI / 2, RU + LD / 2, true); }
    else if (P.kind === 'metal' || P.kind === 'openwood') { const th = P.kind === 'metal' ? .05 : .08; for (let i = 0; i < N; i++) add(box(W - .1, th, tr * .97, K.tile), mat, 0, sh * (i + 1) - th / 2, tr * (i + .5), true);
      [-1, 1].forEach(s => add(box(.07, .3, L + .2, 1), frame, s * (W / 2 - .035), RI / 2 - .12, RU / 2, false, -ang));
      if (LD > 0) { add(box(W, .1, LD, K.tile), mat, 0, RI - .05, RU + LD / 2, true); [[-1, 1], [1, 1]].forEach(([s]) => add(box(.08, RI, .08, 1), frame, s * (W / 2 - .05), RI / 2, RU + LD - .05)); } }
    else { for (let i = 0; i < N; i++) add(box(W, sh * (i + 1), tr + .002, K.tile), mat, 0, sh * (i + 1) / 2, tr * (i + .5), true); if (LD > 0) add(box(W, RI, LD, K.tile), mat, 0, RI / 2, RU + LD / 2, true); }
    if (P.nosing && P.kind !== 'ramp') for (let i = 0; i < N; i++) add(box(W + .01, .035, .05, 1), railM, 0, sh * (i + 1) - .0175 + .001, tr * i + .025, false);
    const sides = P.rail === 'both' ? [-1, 1] : P.rail === 'left' ? [1] : P.rail === 'right' ? [-1] : [];
    sides.forEach(s => { const x = s * (W / 2 - .03), n = Math.max(2, Math.ceil(RU / 1.1) + 1); add(box(.05, .05, L, 1), railM, x, RI / 2 + .95, RU / 2, false, -ang); for (let j = 0; j < n; j++) { const z = RU * j / (n - 1), y0 = P.kind === 'ramp' ? RI * z / RU : Math.min(RI, Math.ceil((z / RU) * N - 1e-6) * sh); add(box(.04, .95, .04, 1), railM, x, y0 + .475, Math.min(RU - .02, Math.max(.02, z))); }
      if (LD > 0) { add(box(.05, .05, LD, 1), railM, x, RI + .95, RU + LD / 2); add(box(.04, .95, .04, 1), railM, x, RI + .475, RU + LD - .02); } });
    return g;
  } };
})();
