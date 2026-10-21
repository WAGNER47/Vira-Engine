/* VIRA CUBE GRID 2: resizing, collision settings, per-material collision, show/hide and solid actions, and the building kit. */
(function () {
'use strict';
const ENG = window.ENG, PF = ENG.PREFABS, G = ENG.Game.prototype, CG = ENG.CG, FINE = CG.FINE, P = PF.cubegrid;
Object.assign(P.props, {
  bullets: { t: 'bool', d: true, l: 'Bullets hit it' },
  shadows: { t: 'bool', d: true, l: 'Casts shadows' },
  visible: { t: 'bool', d: true, l: 'Visible at start' }
});
const matSolid = (d, i) => { const m = d.mats[i] || d.mats[0]; return !!m && m.solid !== false; };
CG.matSolid = matSolid;
/* the whole block set scales with the object's size, so it can be moved, rotated and resized like anything else */
P.build = function (o, c) {
  c = c || {}; let d = o.props.data; if (c.thumb && CG.isEmpty(d)) d = CG.preset('blocks'); d = CG.fill(d);
  const inner = CG.build(d, c.project, { collide: o.props.collide !== false });
  inner.scale.set(o.s[0] || 1, o.s[1] || 1, o.s[2] || 1); inner.userData.cg = true;
  inner.children.forEach(m => { if (m.userData.walk && !matSolid(d, m.userData.cgMat)) m.userData.walk = false; if (o.props.shadows === false) m.castShadow = false; });
  if (!c.editor && o.props.visible === false) inner.visible = false;
  return inner;
};
G.cgCollide = function (e, force) {
  const p = e.o.props; if (p.collide === false) return; if (!force && p.visible === false) return;
  const d = CG.fill(p.data), root = e.root, inner = root.children[0] || root; root.updateMatrixWorld(true); inner.updateMatrixWorld(true);
  let mesh = null; inner.traverse(n => { if (!mesh && n.isMesh) mesh = n; }); if (!mesh) return;
  const q = new THREE.Quaternion(), wp = new THREE.Vector3(), sc = new THREE.Vector3(); inner.matrixWorld.decompose(wp, q, sc);
  const body = new CANNON.Body({ mass: 0 }); body.collisionFilterMask = -1; let n = 0;
  for (const b of d.boxes) {
    if (!matSolid(d, b[6])) continue;
    body.addShape(new CANNON.Box(new CANNON.Vec3(Math.max(.01, (b[3] - b[0]) / 2 * FINE * Math.abs(sc.x)), Math.max(.01, (b[4] - b[1]) / 2 * FINE * Math.abs(sc.y)), Math.max(.01, (b[5] - b[2]) / 2 * FINE * Math.abs(sc.z)))), new CANNON.Vec3((b[0] + b[3]) / 2 * FINE * sc.x, (b[1] + b[4]) / 2 * FINE * sc.y, (b[2] + b[5]) / 2 * FINE * sc.z)); n++;
    this.cols.push({ box: new THREE.Box3(new THREE.Vector3(b[0] * FINE, b[1] * FINE, b[2] * FINE), new THREE.Vector3(b[3] * FINE, b[4] * FINE, b[5] * FINE)).applyMatrix4(inner.matrixWorld), m: mesh, e });
  }
  if (n) { body.position.set(wp.x, wp.y, wp.z); body.quaternion.set(q.x, q.y, q.z, q.w); this.world.addBody(body); body.userData = { e }; e.bodies = (e.bodies || []).concat(body); }
  e.cgSolid = true;
  if (force) inner.traverse(m => { if (m.isMesh && m.userData.walk && !this.walk.includes(m)) { this.walk.push(m); if (!m.userData.glass) this.sightBlock.push(m); } });
};
G.cgRemoveCollide = function (e) {
  this.cols = this.cols.filter(c => c.e !== e); (e.bodies || []).forEach(b => this.world.removeBody(b)); e.bodies = [];
  this.walk = this.walk.filter(m => m.userData.e !== e); this.sightBlock = this.sightBlock.filter(m => m.userData.e !== e); e.cgSolid = false;
};
G.cgSetVisible = function (e, on) { const inner = e.root.children[0] || e.root; inner.visible = on; if (on) { if (!e.cgSolid) this.cgCollide(e, true); } else this.cgRemoveCollide(e); };
G.cgSetSolid = function (e, on) { if (on) { if (!e.cgSolid) this.cgCollide(e, true); } else this.cgRemoveCollide(e); };
const baseSpawn = G.spawnExtra;
G.spawnExtra = function (e) {
  if (baseSpawn) baseSpawn.call(this, e);
  if (e.type === 'cubegrid') { if (e.o.props.visible === false) this.cgSetVisible(e, false); if (e.o.props.bullets === false) this.targets = this.targets.filter(t => t !== e.root); }
};
if (ENG.Logic) {
  const L = ENG.Logic; L.KINDS.cubegrid = 'block set';
  L.ACTIONS.visible = { cat: 'Objects', label: 'Show or hide an object', text: '{mode} {target}', params: { mode: { t: 'enum', o: [['show', 'show'], ['hide', 'hide'], ['toggle', 'toggle']], d: 'show' }, target: { t: 'ref', of: null } },
    run(c, p) { const e = c.ref(p.target); if (!e) return c.fail('That object is missing'); const inner = e.root.children[0] || e.root, on = p.mode === 'show' ? true : p.mode === 'hide' ? false : !inner.visible; if (e.type === 'cubegrid') c.g.cgSetVisible(e, on); else e.root.visible = on; } };
  L.ACTIONS.solid = { cat: 'Objects', label: 'Make a block set solid or not', text: 'make {target} {mode}', params: { target: { t: 'ref', of: ['cubegrid'] }, mode: { t: 'enum', o: [['solid', 'solid'], ['walkable', 'something you can walk through']], d: 'solid' } },
    run(c, p) { const e = c.ref(p.target); if (!e || e.type !== 'cubegrid') return c.fail('That block set is missing'); c.g.cgSetSolid(e, p.mode === 'solid'); } };
}

/* ---------------- building kit: modular pieces in several materials ---------------- */
CG.KIT = [];
CG.KIT_MATS = [[0, 'Concrete'], [1, 'Brick'], [2, 'Plaster'], [4, 'Metal'], [5, 'Wood'], [6, 'White tile']];
const K = (id, sub, label, f) => CG.KIT.push({ id, sub, label, f });
[2, 4, 6, 8].forEach(n => K('wall' + n, 'Walls', n + ' m wall', B => B(0, 0, 0, n, 3, .25)));
K('wall_low', 'Walls', 'Low wall 4 m', B => B(0, 0, 0, 4, .6, .25)); K('wall_half', 'Walls', 'Half wall 4 m', B => B(0, 0, 0, 4, 1.2, .25)); K('wall_tall', 'Walls', 'Tall wall 4 m', B => B(0, 0, 0, 4, 5, .25)); K('wall_thick', 'Walls', 'Thick wall 4 m', B => B(0, 0, 0, 4, 3, .6));
K('corner', 'Walls', 'Corner wall', B => { B(0, 0, 0, 4, 3, .25); B(0, 0, .25, .25, 3, 4); }); K('wall_t', 'Walls', 'T wall', B => { B(0, 0, 0, 4, 3, .25); B(1.875, 0, .25, 2.125, 3, 4); });
K('wall_pillars', 'Walls', 'Wall with pillars', B => { B(0, 0, 0, 4, 3, .25); B(0, 0, 0, .4, 3, .4); B(3.6, 0, 0, 4, 3, .4); });
K('doorway', 'Doors and windows', 'Doorway wall 4 m', (B, S) => { B(0, 0, 0, 4, 3, .25); S(1.5, 0, -.1, 2.5, 2.2, .4); });
K('doorway_wide', 'Doors and windows', 'Wide doorway wall 6 m', (B, S) => { B(0, 0, 0, 6, 3, .25); S(2, 0, -.1, 4, 2.4, .4); });
K('doorway_arch', 'Doors and windows', 'Arched doorway wall', (B, S) => { B(0, 0, 0, 4, 3, .25); S(1.5, 0, -.1, 2.5, 2, .4); S(1.75, 2, -.1, 2.25, 2.3, .4); });
K('door_frame', 'Doors and windows', 'Door frame', B => { B(0, 0, 0, .15, 2.3, .25); B(.95, 0, 0, 1.1, 2.3, .25); B(.15, 2.15, 0, .95, 2.3, .25); });
K('window', 'Doors and windows', 'Window wall 4 m', (B, S) => { B(0, 0, 0, 4, 3, .25); S(1.25, 1, -.1, 2.75, 2.2, .4); B(1.25, 1, .08, 2.75, 2.2, .17, 3); });
K('window_wide', 'Doors and windows', 'Two window wall 6 m', (B, S) => { B(0, 0, 0, 6, 3, .25); [[.75, 2.25], [3.75, 5.25]].forEach(([a, b]) => { S(a, 1, -.1, b, 2.2, .4); B(a, 1, .08, b, 2.2, .17, 3); }); });
K('window_slit', 'Doors and windows', 'Slit window wall 4 m', (B, S) => { B(0, 0, 0, 4, 3, .25); S(1.85, 1, -.1, 2.15, 2.6, .4); B(1.85, 1, .08, 2.15, 2.6, .17, 3); });
K('window_strip', 'Doors and windows', 'Strip window wall 6 m', (B, S) => { B(0, 0, 0, 6, 3, .25); S(.5, 1.5, -.1, 5.5, 2.3, .4); B(.5, 1.5, .08, 5.5, 2.3, .17, 3); });
[2, 4, 8, 16].forEach(n => K('floor' + n, 'Floors and ceilings', 'Floor ' + n + ' m', B => B(0, 0, 0, n, .2, n)));
K('ceiling4', 'Floors and ceilings', 'Ceiling 4 m', B => B(0, 0, 0, 4, .15, 4)); K('ceiling8', 'Floors and ceilings', 'Ceiling 8 m', B => B(0, 0, 0, 8, .15, 8));
K('platform2', 'Floors and ceilings', 'Platform 2 m', B => B(0, 0, 0, 2, .4, 2)); K('platform4', 'Floors and ceilings', 'Platform 4 m', B => B(0, 0, 0, 4, .4, 4));
K('floor_curb', 'Floors and ceilings', 'Floor with curb 4 m', B => { B(0, 0, 0, 4, .2, 4); B(0, .2, 0, 4, .35, .15); B(0, .2, 3.85, 4, .35, 4); B(0, .2, .15, .15, .35, 3.85); B(3.85, .2, .15, 4, .35, 3.85); });
K('pillar_s', 'Columns and beams', 'Square pillar 3 m', B => B(0, 0, 0, .4, 3, .4)); K('pillar_l', 'Columns and beams', 'Large pillar 3 m', B => B(0, 0, 0, .8, 3, .8)); K('pillar_tall', 'Columns and beams', 'Tall pillar 5 m', B => B(0, 0, 0, .5, 5, .5));
K('pillar_base', 'Columns and beams', 'Pillar with base', B => { B(0, 0, 0, .8, .3, .8); B(.15, .3, .15, .65, 2.8, .65); B(0, 2.8, 0, .8, 3, .8); });
[2, 4, 8].forEach(n => K('beam' + n, 'Columns and beams', 'Beam ' + n + ' m', B => B(0, 0, 0, n, .3, .3)));
const stairs = (n, w, rise, run) => B => { for (let i = 0; i < n; i++) B(0, 0, i * run, w, (i + 1) * rise, (i + 1) * run); };
K('stairs4', 'Stairs and ramps', 'Stairs 4 steps', stairs(4, 2, .2, .3)); K('stairs8', 'Stairs and ramps', 'Stairs 8 steps', stairs(8, 2, .2, .3)); K('stairs12', 'Stairs and ramps', 'Stairs 12 steps', stairs(12, 2, .18, .28)); K('stairs_wide', 'Stairs and ramps', 'Wide stairs 8 steps', stairs(8, 4, .2, .3));
const ramp = (len, h, w) => (B, S, SL) => SL(1, 1, 0, 0, len, 0, w, [0, h, h, 0]);
K('ramp2', 'Stairs and ramps', 'Ramp 2 m', ramp(2, .6, 2)); K('ramp4', 'Stairs and ramps', 'Ramp 4 m', ramp(4, 1.2, 2.5)); K('ramp6', 'Stairs and ramps', 'Ramp 6 m', ramp(6, 1.8, 3));
[2, 4].forEach(n => K('fence' + n, 'Fences and rails', 'Fence ' + n + ' m', B => { B(0, 0, 0, .1, 1.2, .1); B(n - .1, 0, 0, n, 1.2, .1); B(0, .4, .02, n, .5, .08); B(0, .9, .02, n, 1, .08); }));
[2, 4].forEach(n => K('rail' + n, 'Fences and rails', 'Railing ' + n + ' m', B => { B(0, 0, 0, .06, 1, .06); B(n - .06, 0, 0, n, 1, .06); B(0, .95, 0, n, 1.02, .06); B(0, .45, .01, n, .5, .05); }));
K('roof_flat4', 'Roofs', 'Flat roof 4 m', B => { B(0, 0, 0, 4, .2, 4); B(0, .2, 0, 4, .6, .2); B(0, .2, 3.8, 4, .6, 4); B(0, .2, .2, .2, .6, 3.8); B(3.8, .2, .2, 4, .6, 3.8); });
K('roof_flat8', 'Roofs', 'Flat roof 8 m', B => { B(0, 0, 0, 8, .2, 8); B(0, .2, 0, 8, .6, .2); B(0, .2, 7.8, 8, .6, 8); B(0, .2, .2, .2, .6, 7.8); B(7.8, .2, .2, 8, .6, 7.8); });
K('roof_gable', 'Roofs', 'Gable roof 6 x 4 m', (B, S, SL) => { SL(1, 1, 0, 0, 4, 0, 3, [0, 0, 1.6, 1.6]); SL(1, 1, 0, 0, 4, 3, 6, [1.6, 1.6, 0, 0]); });
K('roof_shed', 'Roofs', 'Shed roof 4 m', (B, S, SL) => SL(1, 1, 0, 0, 4, 0, 4, [0, 0, 1.2, 1.2]));
[1, 2, 4].forEach(n => K('cube' + n, 'Cubes', 'Cube ' + n + ' m', B => B(0, 0, 0, n, n, n)));
CG.kit = function (id, m) {
  const k = CG.KIT.find(x => x.id === id), d = CG.fill(null), U = v => Math.round(v * 16), bx = (a, b, c, e, f, g) => [U(a), U(b), U(c), U(e), U(f), U(g)];
  const B = (a, b, c, e, f, g, mm) => CG.add(d, bx(a, b, c, e, f, g), mm == null ? m : mm), S = (a, b, c, e, f, g) => CG.sub(d, bx(a, b, c, e, f, g));
  const SL = (ax, s, Pl, u0, u1, v0, v1, dep, mm) => d.slopes.push({ p: CG.makeSlope(ax, s, U(Pl), U(u0), U(u1), U(v0), U(v1), dep.map(U)), m: mm == null ? m : mm });
  if (k) k.f(B, S, SL); return d;
};
CG.kitItems = () => { const out = []; CG.KIT.forEach(k => CG.KIT_MATS.forEach(([mi, mn]) => out.push({ kit: k.id, mat: mi, sub: k.sub, label: mn + ' ' + k.label.charAt(0).toLowerCase() + k.label.slice(1) }))); return out; };
})();
