/* VIRA ANIMATION: keyframed animations of any object or the player (position, rotation, scale, visibility),
   with easing, loops, events (explosions, logic tags), live collisions for moving objects, riding platforms,
   Logic control, and cutscene clips. Shared by the editor preview and the game. */
(function () {
'use strict';
const ENG = window.ENG, D2R = Math.PI / 180;
const CB = { smooth: [.42, 0, .58, 1], linear: [0, 0, 1, 1], in: [.42, 0, 1, 1], out: [0, 0, .58, 1] };
const cbz = (x1, y1, x2, y2, u) => { let lo = 0, hi = 1, s = u; for (let i = 0; i < 22; i++) { s = (lo + hi) / 2; const x = 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s; if (x < u) lo = s; else hi = s; } return 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s; };
const bounce = u => { const n = 7.5625, d = 2.75; if (u < 1 / d) return n * u * u; if (u < 2 / d) return n * (u -= 1.5 / d) * u + .75; if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + .9375; return n * (u -= 2.625 / d) * u + .984375; };
const elastic = u => u <= 0 || u >= 1 ? u : Math.pow(2, -10 * u) * Math.sin((u * 10 - .75) * (2 * Math.PI / 3)) + 1, back = u => { const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
ENG.ANIM_EASE = { smooth: 'Smooth', linear: 'Linear', in: 'Ease in', out: 'Ease out', hold: 'Hold', bounce: 'Bounce', elastic: 'Elastic', back: 'Overshoot', custom: 'Custom curve' };
ENG.animEase = (a, b, u) => { const e = a.ease || 'smooth'; if (e === 'hold') return 0; if (e === 'bounce') return bounce(u); if (e === 'elastic') return elastic(u); if (e === 'back') return back(u); if (e === 'custom') return cbz(a.eo == null ? .33 : a.eo, 0, 1 - (b.ei == null ? .33 : b.ei), 1, u); const p = CB[e] || CB.smooth; return cbz(p[0], p[1], p[2], p[3], u); };
ENG.animVal = (tr, t) => { const K = tr.keys; if (!K.length) return null; if (t <= K[0].t) return K[0].v; const L = K[K.length - 1]; if (t >= L.t) return L.v; let i = 0; while (i < K.length - 2 && K[i + 1].t <= t) i++; const a = K[i], b = K[i + 1]; if (!Array.isArray(a.v)) return a.v; const f = ENG.animEase(a, b, (t - a.t) / Math.max(1e-6, b.t - a.t)); return a.v.map((x, j) => x + (b.v[j] - x) * f); };
ENG.animTime = (A, t) => { const d = Math.max(.01, +A.dur || 1); if (A.loop === 'loop') return ((t % d) + d) % d; if (A.loop === 'pingpong') { const m = ((t % (2 * d)) + 2 * d) % (2 * d); return m > d ? 2 * d - m : m; } return Math.max(0, Math.min(d, t)); };
ENG.animApplyRoot = (root, o, prop, v, base) => {
  if (v == null) return; if (prop === 'p') root.position.set(v[0], v[1], v[2]); else if (prop === 'r') root.rotation.set(v[0] * D2R, v[1] * D2R, v[2] * D2R);
  else if (prop === 's') { const bs = o.s || [1, 1, 1], rs = base.s; root.scale.set(rs.x * v[0] / (bs[0] || 1), rs.y * v[1] / (bs[1] || 1), rs.z * v[2] / (bs[2] || 1)); } else if (prop === 'vis') root.visible = !!v;
};
/* ---------- game side ---------- */
const GP = ENG.Game && ENG.Game.prototype; if (!GP) return;
const isPlayer = (g, id) => g.project.objects.some(o => o.id === id && o.type === 'player_start');
GP.anInit = function () {
  const list = this.project.anims || []; this._an = { list, run: {}, ents: new Map(this.ents.map(e => [e.o.id, e])) }; const touched = new Set(); list.forEach(A => A.tracks.forEach(tr => touched.add(tr.obj)));
  touched.forEach(id => { const e = this._an.ents.get(id); if (!e) return; e.root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(e.root.matrixWorld).invert(); e._anB = { s: e.root.scale.clone() };
    e._anCols = (this.cols || []).filter(c => c.e === e).map(c => ({ c, local: c.box.clone().applyMatrix4(inv) }));
    e._anBodies = (e.bodies || []).concat(e.body && e.body.mass === 0 ? [e.body] : []).map(b => ({ b, local: new THREE.Matrix4().multiplyMatrices(inv, new THREE.Matrix4().compose(new THREE.Vector3(b.position.x, b.position.y, b.position.z), new THREE.Quaternion(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w), new THREE.Vector3(1, 1, 1))) })); });
  list.forEach(A => { const vis = A.tracks.filter(tr => tr.prop === 'vis' && !isPlayer(this, tr.obj)); if (vis.length) this.anApply(Object.assign({}, A, { tracks: vis, events: [] }), 0, true); }); list.filter(A => A.auto).forEach(A => this.anPlay(A.id, 'restart'));
};
GP.anFind = function (id) { return (this._an.list || []).find(A => A.id === id || A.name === id); };
GP.anPlay = function (id, how) { if (!this._an) this.anInit(); const A = this.anFind(id); if (!A) return; const R = this._an.run[A.id] || (this._an.run[A.id] = { t: 0, dir: 1, on: false }); if (how === 'restart') R.t = 0; R.dir = how === 'reverse' ? -1 : 1; if (how === 'reverse' && R.t <= 0) R.t = A.dur || 1; R.on = true; };
GP.anStop = function (id, how) { if (!this._an) return; const A = this.anFind(id), R = A && this._an.run[A.id]; if (!R) return; R.on = false; if (how === 'reset') { R.t = 0; this.anApply(A, 0, true); } };
GP.anApply = function (A, lt, quiet, prevLt) {
  const P = this.player, moved = []; A.tracks.forEach(tr => { if (tr.mute || !tr.keys.length) return; const v = ENG.animVal(tr, lt); if (v == null) return;
    if (isPlayer(this, tr.obj)) { if (!P) return; if (tr.prop === 'p') { P.pos.set(v[0], v[1], v[2]); if (P.vel) P.vel.set(0, 0, 0); } else if (tr.prop === 'r') P.yaw = v[1] * D2R; return; }
    const e = this._an.ents.get(tr.obj); if (!e) return; if (!e._anPrev) e._anPrev = new THREE.Matrix4(); if (!moved.includes(e)) { e.root.updateMatrixWorld(true); e._anPrev.copy(e.root.matrixWorld); moved.push(e); }
    ENG.animApplyRoot(e.root, e.o, tr.prop, v, e._anB || { s: e.root.scale.clone() }); });
  moved.forEach(e => this.anSync(e));
  if (!quiet && A.events && prevLt != null) A.events.forEach(ev => { if ((ev.t > prevLt && ev.t <= lt) || (ev.t < prevLt && ev.t >= lt)) this.anEvent(ev); });
};
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _rc = new THREE.Raycaster();
GP.anSync = function (e) {
  const R = e.root; R.updateMatrixWorld(true); const M = R.matrixWorld, hid = R.visible === false;
  if (hid !== !!e._anHid) { e._anHid = hid; R.traverse(n => { n.layers.mask = hid ? 0 : 1; }); }
  (e._anCols || []).forEach(x => { if (hid) x.c.box.makeEmpty(); else x.c.box.copy(x.local).applyMatrix4(M); });
  (e._anBodies || []).forEach(x => { _m.multiplyMatrices(M, x.local).decompose(_p, _q, _s); x.b.position.set(_p.x, _p.y, _p.z); x.b.quaternion.set(_q.x, _q.y, _q.z, _q.w); x.b.collisionResponse = !hid; });
  if (e.body && e.body.mass > 0 && typeof CANNON !== 'undefined') { e.body.type = CANNON.Body.KINEMATIC; const wp = R.getWorldPosition(_p); e.body.velocity.set(0, 0, 0); e.body.position.set(wp.x, wp.y, wp.z); R.getWorldQuaternion(_q); e.body.quaternion.set(_q.x, _q.y, _q.z, _q.w); e.body.collisionResponse = !hid; }
  const P = this.player; if (P && e._anPrev && !hid && P.onGround !== false) { _rc.set(new THREE.Vector3(P.pos.x, P.pos.y + .4, P.pos.z), new THREE.Vector3(0, -1, 0)); _rc.far = .8; e.root.traverse(n => { n.updateMatrixWorld && 0; }); const prevInv = new THREE.Matrix4().copy(e._anPrev).invert(); const hits = _rc.intersectObject(e.root, true);
    if (hits.length) { const d = new THREE.Matrix4().multiplyMatrices(M, prevInv), np = new THREE.Vector3(P.pos.x, P.pos.y, P.pos.z).applyMatrix4(d); P.pos.set(np.x, np.y, np.z); _q.setFromRotationMatrix(d); const y = new THREE.Euler().setFromQuaternion(_q, 'YXZ').y; if (Math.abs(y) > 1e-5) P.yaw += y; } }
};
GP.anEvent = function (ev) {
  if (ev.kind === 'tag' && ev.tag) { try { this.activate(ev.tag); } catch (x) { } return; }
  if (ev.kind === 'boom') { const e = this._an.ents.get(ev.obj), at = e ? e.root.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(...(ev.p || [0, 1, 0])); this.anBlast(at, +ev.power || 1); }
};
GP.anBlast = function (at, pw) {
  const L = new THREE.PointLight('#ffb36b', 9 * pw, 18 * pw, 2); L.position.copy(at); this.scene.add(L); const parts = [], mat = new THREE.MeshStandardMaterial({ color: '#3a3430', roughness: .9 }), geo = new THREE.BoxGeometry(.18, .18, .18);
  for (let i = 0; i < Math.round(26 * pw); i++) { const m = new THREE.Mesh(geo, mat); m.position.copy(at); m.scale.setScalar(.5 + Math.random() * 1.6); const v = new THREE.Vector3(Math.random() - .5, Math.random() * .9 + .2, Math.random() - .5).normalize().multiplyScalar((5 + Math.random() * 7) * pw); m.userData.v = v; m.userData.w = new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9); this.scene.add(m); parts.push(m); }
  const smoke = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: .9, depthWrite: false })); smoke.position.copy(at); this.scene.add(smoke);
  if (this.world) this.world.bodies.forEach(b => { if (b.mass <= 0) return; const d = new THREE.Vector3(b.position.x - at.x, b.position.y - at.y, b.position.z - at.z), l = d.length(); if (l > 7 * pw) return; d.normalize().multiplyScalar(18 * pw * (1 - l / (7 * pw)) * b.mass); try { b.wakeUp && b.wakeUp(); b.applyImpulse(new CANNON.Vec3(d.x, d.y + 4 * pw * b.mass, d.z), b.position); } catch (x) { } });
  if (this.shake != null) this.shake = Math.max(this.shake || 0, .6 * pw); else if (this.addShake) this.addShake(.6 * pw);
  let t = 0; const tick = dt => { t += dt; L.intensity = Math.max(0, 9 * pw * (1 - t / .45)); smoke.scale.setScalar(.6 + t * 6 * pw); smoke.material.opacity = Math.max(0, .9 - t * 1.6); smoke.material.color.lerp(new THREE.Color('#5a5550'), dt * 3);
    parts.forEach(m => { m.userData.v.y -= 18 * dt; m.position.addScaledVector(m.userData.v, dt); if (m.position.y < .05) { m.position.y = .05; m.userData.v.multiplyScalar(.45); m.userData.v.y = Math.abs(m.userData.v.y) * .3; } m.rotation.x += m.userData.w.x * dt; m.rotation.y += m.userData.w.y * dt; });
    if (t > 3.5) { this.scene.remove(L); this.scene.remove(smoke); parts.forEach(m => this.scene.remove(m)); return true; } };
  (this._anFx = this._anFx || []).push(tick);
};
const st = GP.step; GP.step = function (dt) {
  const r = st.apply(this, arguments); try { if (!this._an && this.ents && this.state === 'play') this.anInit(); if (!this._an) return r; const d = dt * (this.ts || 1);
    Object.entries(this._an.run).forEach(([id, R]) => { if (!R.on) return; const A = this.anFind(id); if (!A) return; const T0 = R.t; R.t += d * (+A.speed || 1) * R.dir; const D = +A.dur || 1; let done = false;
      if (A.loop === 'once' && (R.t >= D || R.t <= 0)) { R.t = Math.max(0, Math.min(D, R.t)); R.on = false; done = true; }
      const l0 = ENG.animTime(A, T0), l1 = ENG.animTime(A, R.t); if (A.loop === 'loop' && R.dir > 0 && l1 < l0) { this.anApply(A, D, false, l0); this.anApply(A, l1, false, -1e-6); } else this.anApply(A, l1, false, l0); });
    if (this._anFx) this._anFx = this._anFx.filter(f => !f(d)); } catch (e) { console.warn(e); } return r;
};
const uc = GP.updateCutscene; if (uc) GP.updateCutscene = function (dt) { const c = this.cut, t0 = c ? c.t : 0, r = uc.apply(this, arguments); try { if (!this._an) this.anInit(); const C = c && c.cs && c.cs.anims; if (C && C.length) C.forEach(cl => { const A = this.anFind(cl.id); if (!A) return; const s = +A.speed || 1, rm = c.cs.remap && c.cs.remap.length >= 2 ? x => ENG.remapEval(c.cs.remap, x) : x => x, a = (rm(t0) - cl.at) * s, b = (rm(c.t) - cl.at) * s; if (b < 0) return; this.anApply(A, A.loop === 'once' || !A.loop ? Math.min(+A.dur || 1, b) : ENG.animTime(A, b), false, A.loop === 'once' || !A.loop ? Math.min(+A.dur || 1, Math.max(-1e-6, a)) : ENG.animTime(A, a)); }); } catch (e) { console.warn(e); } return r; };
const ec = GP.endCutscene; if (ec) GP.endCutscene = function () { try { const c = this.cut, C = c && c.cs && c.cs.anims; if (C && this._an) C.forEach(cl => { const A = this.anFind(cl.id); if (A && A.loop !== 'loop' && A.loop !== 'pingpong') this.anApply(A, +A.dur || 1, true); }); } catch (e) { } return ec.apply(this, arguments); };
})();
