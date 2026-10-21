/* VR: play any Vira game in a WebXR headset (Quest, PC VR and others).
   The game keeps its own camera (this.cam) for aiming, using things and logic. In VR that camera follows the gun hand,
   and the headset view is drawn from a rig that stands where the player stands. Room scale steps move the player too,
   so walls still block you. Menus, notes and the HUD become panels in the world that you point at with a controller. */
(function () {
const ENG = window.ENG, G = ENG.Game.prototype, D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _eu = new THREE.Euler(0, 0, 0, 'YXZ'), _rc = new THREE.Raycaster(), _up = new THREE.Vector3(0, 1, 0);

Object.assign(ENG.DEFAULT_SETTINGS, { vr: true, vrTurn: 'snap', vrSnap: 30, vrTurnSpeed: 120, vrHand: 'right', vrSeated: false, vrLaser: true });

const VR = ENG.VR = { ok: false };
VR.check = (navigator.xr && navigator.xr.isSessionSupported) ? navigator.xr.isSessionSupported('immersive-vr').then(v => (VR.ok = !!v)).catch(() => false) : Promise.resolve(false);
/* Controller layout (xr-standard): 0 trigger, 1 grip, 3 stick click, 4 A or X, 5 B or Y. */
VR.HELP = 'Left stick move (click to sprint) · Right stick turn (click to crouch) · Right trigger shoot · Right grip use · A jump · B reload · Left grip grab, pull and throw · Swing a hand to punch · X next weapon · Left trigger bullet time · Y menu';

/* ---------------- canvas panels ---------------- */
function panel(w, h, px, py) {
  const cv = document.createElement('canvas'); cv.width = px; cv.height = py; const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); mesh.renderOrder = 998; mesh.visible = false; mesh.frustumCulled = false;
  return { mesh, cv, ctx: cv.getContext('2d'), tex, key: '', hover: -1, rects: [], items: [] };
}
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function wrap(c, text, maxW) {
  const out = []; String(text || '').split('\n').forEach(par => { let line = ''; par.split(/\s+/).forEach(w => { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }); out.push(line); });
  while (out.length && !out[out.length - 1]) out.pop(); return out;
}
function drawMenu(P, title, text, items) {
  const c = P.ctx, W = P.cv.width, H = P.cv.height; c.clearRect(0, 0, W, H);
  rrect(c, 6, 6, W - 12, H - 12, 34); c.fillStyle = 'rgba(14,17,22,.94)'; c.fill(); c.lineWidth = 4; c.strokeStyle = 'rgba(76,195,184,.55)'; c.stroke();
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#f2f5f7'; c.font = '700 64px "Chakra Petch", sans-serif'; c.fillText(String(title || ''), W / 2, 92, W - 80);
  c.font = '500 32px "Barlow", sans-serif'; c.fillStyle = '#c3ccd4'; const lines = wrap(c, text, W - 120).slice(0, 8); lines.forEach((l, i) => c.fillText(l, W / 2, 168 + i * 42, W - 100));
  const n = items.length, gap = 24, bw = Math.min(300, (W - 80 - gap * (n - 1)) / Math.max(1, n)), bh = 92, y = H - bh - 48, x0 = (W - (bw * n + gap * (n - 1))) / 2; P.rects = [];
  items.forEach(([label], i) => { const x = x0 + i * (bw + gap), on = i === P.hover; rrect(c, x, y, bw, bh, 20); c.fillStyle = on ? '#4cc3b8' : i ? 'rgba(255,255,255,.10)' : 'rgba(76,195,184,.28)'; c.fill(); c.lineWidth = 3; c.strokeStyle = on ? '#bff5ee' : 'rgba(255,255,255,.25)'; c.stroke();
    c.fillStyle = on ? '#0b1214' : '#f2f5f7'; c.font = '600 34px "Chakra Petch", sans-serif'; c.fillText(label, x + bw / 2, y + bh / 2 + 2, bw - 20); P.rects.push({ x, y, w: bw, h: bh }); });
  P.tex.needsUpdate = true;
}
function drawHud(P, rows) {
  const c = P.ctx, W = P.cv.width, H = P.cv.height; c.clearRect(0, 0, W, H); if (!rows.length) { P.tex.needsUpdate = true; return; }
  const lh = 46, h = rows.length * lh + 28; rrect(c, 4, H - h - 4, W - 8, h, 22); c.fillStyle = 'rgba(10,12,16,.62)'; c.fill();
  c.textAlign = 'center'; c.textBaseline = 'middle';
  rows.forEach((r, i) => { c.font = (r.big ? '700 38px "Chakra Petch"' : '500 30px "Barlow"') + ', sans-serif'; c.fillStyle = r.color || '#eef2f5'; c.fillText(r.t, W / 2, H - h + 14 + lh * i + lh / 2, W - 30); });
  P.tex.needsUpdate = true;
}

/* ---------------- start and stop ---------------- */
G.enterVR = function (sim) {
  if (this.vr && this.vr.on) return Promise.resolve();
  if (sim) { this.vrStart(null, 'local-floor'); return Promise.resolve(); }
  if (!navigator.xr) return Promise.resolve();
  return navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] })
    .then(s => this.vrAttach(s), e => { console.warn('VR', e); this.msg('Could not start VR: ' + (e && e.message || e), 4); });
};
G.vrAttach = async function (s) {
  const R = this.renderer; let type = 'local-floor';
  if (this.S.vrSeated) type = 'local'; else { try { await s.requestReferenceSpace('local-floor'); } catch (e) { type = 'local'; } }
  R.xr.setReferenceSpaceType(type); this.vrStart(s, type);
  try { await R.xr.setSession(s); } catch (e) { console.error('VR', e); this.vrStop(true); try { s.end(); } catch (x) { } this.msg('Could not start VR', 3); }
};
G.vrStart = function (session, type) {
  const R = this.renderer, S = this.S, P = this.player, sim = !session;
  const v = this.vr = { on: true, sim, session, type, yaw: P.yaw, dt: 0, prev: {}, hurt: 0, move: { x: 0, y: 0, mag: 0 }, added: [], laserN: 0,
    floorOff: type === 'local' && !sim ? ((this.pc && this.pc.eye) || 1.6) : 0, hl: { position: new THREE.Vector3(0, sim ? 1.6 : 0, 0), quaternion: new THREE.Quaternion() },
    head: new THREE.Object3D(), prevCamera: S.camera, prevNoLock: this.noLock };
  const add = (parent, child) => { parent.add(child); v.added.push([parent, child]); return child; };
  v.rig = new THREE.Group(); v.rig.name = 'vr-rig'; this.scene.add(v.rig);
  v.cam = new THREE.PerspectiveCamera(S.fov || 75, 1, .05, 1500); v.rig.add(v.cam);
  /* a sphere around the eyes for the hurt flash and screen fades */
  v.fx = new THREE.Mesh(new THREE.SphereGeometry(.25, 16, 10), new THREE.MeshBasicMaterial({ color: '#000', side: THREE.BackSide, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
  v.fx.renderOrder = 1000; v.fx.visible = false; v.fx.frustumCulled = false; v.cam.add(v.fx);
  const lineMat = new THREE.LineBasicMaterial({ color: '#7ff0e4', transparent: true, opacity: .8, depthTest: false });
  const handMat = new THREE.MeshStandardMaterial({ color: '#c99a76', roughness: .7 });
  v.ctrls = [0, 1].map(i => {
    const c = R.xr.getController(i); v.rig.add(c);
    if (!c.userData.vrHooked) { c.userData.vrHooked = true; c.addEventListener('connected', e => { c.userData.src = e.data; }); c.addEventListener('disconnected', () => { c.userData.src = null; }); }
    const ray = add(c, new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), lineMat)); ray.scale.z = 3; ray.visible = false; ray.renderOrder = 999; c.userData.ray = ray;
    const hand = add(c, new THREE.Mesh(new THREE.BoxGeometry(.05, .035, .1), handMat)); hand.position.set(0, -.02, .05); c.userData.hand = hand;
    return c;
  });
  /* the aim laser follows the gun (this.cam is the gun hand in VR) */
  v.laser = add(this.cam, new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: '#ff5a4a', transparent: true, opacity: .45 }))); v.laser.visible = false;
  v.pullLine = add(this.scene, new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: '#7ff0e4', transparent: true, opacity: .7, toneMapped: false }))); v.pullLine.visible = false; v.pullLine.frustumCulled = false;
  v.dot = add(this.scene, new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff5a4a', fog: false, toneMapped: false }))); v.dot.visible = false;
  v.menuP = panel(1.3, .8, 1040, 640); this.scene.add(v.menuP.mesh);
  v.hudP = panel(.72, .36, 720, 360); this.scene.add(v.hudP.mesh); v.hudP.mesh.renderOrder = 997;
  if (sim) v.ctrls.forEach((c, i) => { c.matrixAutoUpdate = false; c.userData.src = { handedness: i ? 'left' : 'right', gamepad: { buttons: [0, 1, 2, 3, 4, 5].map(() => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], hapticActuators: [] } }; c.userData.simPos = new THREE.Vector3(i ? -.2 : .2, 1.3, -.35); c.userData.simQuat = new THREE.Quaternion(); });
  S.camera = 'fps'; if (this.playerModel) this.playerModel.visible = false; this.noLock = true; if (document.pointerLockElement) document.exitPointerLock();
  const au = this.audio; v.audioUpdate = au.update; au.update = cam => v.audioUpdate.call(au, this.vr && this.vr.on ? this.vr.head : cam);
  this.keys = {}; this.mouse.l = false;
  if (session) session.addEventListener('end', v.onEnd = () => this.vrStop());
  this.vrPlace(); this.vrPose();
  if (this.logic) this.logic.raise('vrStart');
  if (this.state === 'menu') this.begin();
  this.vrUpdateButton();
};
G.vrStop = function (quiet) {
  const v = this.vr; if (!v || !v.on) return; v.on = false; if (v.held) { v.held.e.held = false; v.held = null; } v.pull = null;
  if (v.session && v.onEnd) v.session.removeEventListener('end', v.onEnd);
  v.added.forEach(([p, c]) => p.remove(c)); this.scene.remove(v.rig); v.ctrls.forEach(c => { if (v.sim) { c.userData.src = null; c.matrixAutoUpdate = true; } });
  [v.menuP, v.hudP].forEach(p => { this.scene.remove(p.mesh); p.tex.dispose(); });
  this.S.camera = v.prevCamera; if (this.playerModel) this.playerModel.visible = this.S.camera === 'tps'; this.noLock = v.prevNoLock;
  if (v.audioUpdate) this.audio.update = v.audioUpdate;
  this.keys = {}; this.mouse.l = false;
  if (this.state === 'gone') return;
  if (this.logic) this.logic.raise('vrEnd');
  if (!quiet && this.state === 'play') this.pause();
  this.resize(); this.vrUpdateButton();
};
G.exitVR = function () { const v = this.vr; if (!v || !v.on) return; if (v.session) { try { v.session.end(); } catch (e) { this.vrStop(); } } else this.vrStop(); };

/* ---------------- poses ---------------- */
/* the head pose inside the rig, from the two eye cameras */
G.vrHeadLocal = function () {
  const v = this.vr; if (v.sim) return v.hl;
  const xc = this.renderer.xr.getCamera(v.cam), cs = xc.cameras;
  if (cs.length >= 2) { _v.setFromMatrixPosition(cs[0].matrix); _v2.setFromMatrixPosition(cs[1].matrix); v.hl.position.addVectors(_v, _v2).multiplyScalar(.5); v.hl.quaternion.setFromRotationMatrix(cs[0].matrix); }
  else if (cs.length) cs[0].matrix.decompose(v.hl.position, v.hl.quaternion, _s);
  return v.hl;
};
/* stand the rig so the head is right above the player's feet */
G.vrPlace = function () {
  const v = this.vr, P = this.player, hl = v.hl, c = Math.cos(v.yaw), s = Math.sin(v.yaw);
  const hx = hl.position.x * c + hl.position.z * s, hz = -hl.position.x * s + hl.position.z * c;
  v.rig.rotation.set(0, v.yaw, 0); v.rig.position.set(P.pos.x - hx, P.pos.y + v.floorOff, P.pos.z - hz); v.rig.updateMatrixWorld(true);
  v.head.position.set(P.pos.x, v.rig.position.y + hl.position.y, P.pos.z); v.head.quaternion.setFromAxisAngle(_up, v.yaw).multiply(hl.quaternion); v.head.updateMatrixWorld(true);
};
/* during a cutscene the rig moves so the head sits where the cutscene camera is */
G.vrCutRig = function () {
  const v = this.vr, hl = v.hl; _eu.setFromQuaternion(this.cam.quaternion, 'YXZ'); const cy = _eu.y; _eu.setFromQuaternion(hl.quaternion, 'YXZ'); v.yaw = cy - _eu.y;
  const c = Math.cos(v.yaw), s = Math.sin(v.yaw), hx = hl.position.x * c + hl.position.z * s, hz = -hl.position.x * s + hl.position.z * c, p = this.cam.position;
  v.rig.rotation.set(0, v.yaw, 0); v.rig.position.set(p.x - hx, p.y - hl.position.y, p.z - hz); v.rig.updateMatrixWorld(true);
  v.head.position.copy(p); v.head.quaternion.setFromAxisAngle(_up, v.yaw).multiply(hl.quaternion); v.head.updateMatrixWorld(true);
};
/* the game camera becomes the gun hand, so shooting, using and the muzzle flash all come from the controller */
G.vrPose = function () {
  const v = this.vr, c = v.gunCtrl; v.rig.updateMatrixWorld(true);
  if (c && c.userData.src) c.matrixWorld.decompose(this.cam.position, this.cam.quaternion, _s); else { this.cam.position.copy(v.head.position); this.cam.quaternion.copy(v.head.quaternion); }
  this.cam.updateMatrixWorld(true);
  if (this.vm) { const k = this.vmKick || 0, r = this.wep.reload > 0 || this.sr ? 1 : 0; this.vm.position.set(0, -.03 - r * .05, .07 + k * .03); this.vm.rotation.set(k * .14 + r * .5, 0, -r * .3); this.vm.scale.setScalar((this.pc && this.pc.vmScale) || 1); }
  if (c && c.userData.hand) c.userData.hand.visible = !(this.vm && this.vm.visible);
};

/* ---------------- input ---------------- */
G.vrPads = function () {
  const v = this.vr, out = {};
  v.ctrls.forEach(c => { const s = c.userData.src; if (s && s.gamepad) out[s.handedness === 'left' ? 'left' : 'right'] = { c, gp: s.gamepad }; });
  const gh = this.S.vrHand === 'left' ? 'left' : 'right'; out.gun = out[gh] || null; out.off = out[gh === 'left' ? 'right' : 'left'] || null;
  v.gunCtrl = out.gun ? out.gun.c : null; v.offCtrl = out.off ? out.off.c : null; return out;
};
const btn = (p, i) => !!(p && p.gp.buttons[i] && p.gp.buttons[i].pressed);
const stick = p => { if (!p) return [0, 0]; const a = p.gp.axes || []; return a.length >= 4 ? [a[2] || 0, a[3] || 0] : [a[0] || 0, a[1] || 0]; };
G.vrMenuOpen = function () { return !!((this.vrMenuData && this.menu.style.display !== 'none') || this.reading); };
G.vrPre = function (dt) {
  const v = this.vr, S = this.S, P = this.player; v.dt = dt;
  const hl = this.vrHeadLocal(), pads = this.vrPads();
  const edge = (name, now) => { const was = !!v.prev[name]; v.prev[name] = now; return now && !was; };
  const gT = btn(pads.gun, 0), oT = btn(pads.off, 0), gG = btn(pads.gun, 1), oG = btn(pads.off, 1), gA = btn(pads.gun, 4), gB = btn(pads.gun, 5), oX = btn(pads.off, 4), oY = btn(pads.off, 5), oS = btn(pads.off, 3), gS = btn(pads.gun, 3);
  const E = { gT: edge('gT', gT), oT: edge('oT', oT), gG: edge('gG', gG), oG: edge('oG', oG), gA: edge('gA', gA), gB: edge('gB', gB), oX: edge('oX', oX), oY: edge('oY', oY), gS: edge('gS', gS) };
  /* turning */
  const [tx] = stick(pads.gun);
  if (!this.cut) {
    if (S.vrTurn === 'smooth') { if (Math.abs(tx) > .15) v.yaw -= Math.sign(tx) * (Math.abs(tx) - .15) / .85 * (S.vrTurnSpeed || 120) * D2R * dt; }
    else if (!v.latch && Math.abs(tx) > .6) { v.yaw -= Math.sign(tx) * (S.vrSnap || 30) * D2R; v.latch = true; } else if (Math.abs(tx) < .3) v.latch = false;
  }
  _eu.setFromQuaternion(hl.quaternion, 'YXZ'); P.yaw = v.yaw + _eu.y; P.pitch = clamp(_eu.x, -1.5, 1.5);
  /* room scale: walking in your room moves the player, and walls push the view back */
  if (!this.cut) {
    if (this.state === 'play' && !this.reading) { const c = Math.cos(v.yaw), s = Math.sin(v.yaw), hx = hl.position.x * c + hl.position.z * s, hz = -hl.position.x * s + hl.position.z * c;
      const dx = v.rig.position.x + hx - P.pos.x, dz = v.rig.position.z + hz - P.pos.z; if (Math.hypot(dx, dz) < 1.5) this.slide(P.pos, dx, dz, .32, P.h, P.onGround, null); }
    this.vrPlace(); this.vrPose();
  }
  /* hand speed, measured in the room so walking does not count as a swing */
  v.ctrls.forEach(c => { const u = c.userData; if (!u.src) { u.wp = null; return; } c.updateMatrixWorld(true); _hl.setFromMatrixPosition(c.matrix);
    if (!u.wp) { u.wp = new THREE.Vector3(); u.lp = _hl.clone(); u.lvel = new THREE.Vector3(); u.vel = new THREE.Vector3(); }
    else { _v.subVectors(_hl, u.lp).divideScalar(Math.max(dt, 1 / 144)); if (_v.length() < 30) u.lvel.lerp(_v, .55); u.lp.copy(_hl); }
    u.wp.setFromMatrixPosition(c.matrixWorld); u.vel.copy(u.lvel).applyAxisAngle(_up, v.yaw).add(P.vel); });
  v.move = { x: 0, y: 0, mag: 0 };
  if (this.vrMenuOpen() || this.state !== 'play') { if (v.held) this.vrThrow(); v.pull = null; if (v.pullLine) v.pullLine.visible = false; }
  if (this.vrMenuOpen()) { this.vrMenuInput(pads, E.gT || E.oT); this.mouse.l = false; return; }
  v.ctrls.forEach(c => { if (c.userData.ray) c.userData.ray.visible = false; });
  if (this.state !== 'play') return;
  if (!this.cut) { this.vrGrabTick(oG, dt); this.vrPunchTick(dt); }
  if (this.cut) { if (E.gB || E.oY) this.endCutscene(); return; }
  const [mx, my] = stick(pads.off), mag = Math.hypot(mx, my); if (mag > .15) v.move = { x: mx, y: my, mag: Math.min(1, (mag - .15) / .85) };
  const k = this.keys, key = c => this.onKey({ code: c, repeat: false, preventDefault() { } });
  k.ShiftLeft = oS; k.Space = gA; if (E.gS) v.crouch = !v.crouch; k.KeyC = !!v.crouch;
  if (E.oY) { this.pause(); return; }
  if (E.gA) key('Space'); if (E.gB) key('KeyR'); if (E.gG) key('KeyE');
  if (E.oX) this.vrNextWeapon();
  if (E.oT && this.setBulletTime && this.S.bulletTime) this.setBulletTime(!this.btOn);
  if (E.gT) { this.mouse.l = true; this.fire(true); } else if (!gT) this.mouse.l = false;
};
/* ---------------- hands: grab, pull, throw and punch ---------------- */
const _hl = new THREE.Vector3(), _hq = new THREE.Quaternion(), _m4 = new THREE.Matrix4(), _m42 = new THREE.Matrix4();
const grabbable = e => e.alive && e.dyn && e.body && !e.hidden && e.root.visible !== false;
function reachOf(e) { if (e.rgR) return e.rgR; const s = new THREE.Box3().setFromObject(e.root).getSize(new THREE.Vector3()); return (e.rgR = Math.max(.15, Math.max(s.x, s.y, s.z) * .5)); }
G.vrGrabTick = function (down, dt) {
  const v = this.vr, c = v.offCtrl, u = c && c.userData; if (!c || !u.wp) return;
  if (!down) { if (v.held) this.vrThrow(); v.pull = null; if (v.pullLine) v.pullLine.visible = false; return; }
  if (v.held) { this.vrHold(c); return; }
  let best = null, bd = .32; for (const e of this.ents) { if (!grabbable(e)) continue; const b = e.body.position, d = u.wp.distanceTo(_v.set(b.x, b.y, b.z)) - reachOf(e); if (d < bd) { bd = d; best = e; } }
  if (best) { v.pull = null; if (v.pullLine) v.pullLine.visible = false; this.vrTake(best, c); return; }
  /* point an open hand at a loose prop and squeeze: it flies to you */
  if (!v.pull) { _v2.set(0, 0, -1).transformDirection(c.matrixWorld); let pb = null, pa = .015; for (const e of this.ents) { if (!grabbable(e) || e.body.mass > 90) continue; const b = e.body.position; _v.set(b.x - u.wp.x, b.y - u.wp.y, b.z - u.wp.z); const L = _v.length(); if (L > 12 || L < .3) continue; const miss = 1 - _v.dot(_v2) / L; if (miss < pa) { pa = miss; pb = e; } } if (pb) { v.pull = { e: pb }; this.vrRumble(.25, 40, 'off'); } }
  if (v.pull) { const e = v.pull.e; if (!grabbable(e)) { v.pull = null; return; } const b = e.body.position, to = _v.set(u.wp.x - b.x, u.wp.y - b.y, u.wp.z - b.z), L = to.length();
    if (v.pullLine) { const a = v.pullLine.geometry.attributes.position; a.setXYZ(0, u.wp.x, u.wp.y, u.wp.z); a.setXYZ(1, b.x, b.y, b.z); a.needsUpdate = true; v.pullLine.visible = true; }
    if (L < reachOf(e) + .35) { v.pull = null; if (v.pullLine) v.pullLine.visible = false; this.vrTake(e, c); return; }
    to.normalize().multiplyScalar(Math.min(13, 4 + L * 2)); e.body.wakeUp(); e.body.velocity.set(to.x, to.y + .9, to.z); e.body.angularVelocity.scale(.9, e.body.angularVelocity); }
};
G.vrTake = function (e, c) {
  const v = this.vr, b = e.body; b.wakeUp(); c.updateMatrixWorld(true); _m4.copy(c.matrixWorld).invert();
  _m42.compose(_v.set(b.position.x, b.position.y, b.position.z), _hq.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w), _s.set(1, 1, 1));
  const off = new THREE.Matrix4().multiplyMatrices(_m4, _m42), p = new THREE.Vector3().setFromMatrixPosition(off), lim = .12 + reachOf(e); if (p.length() > lim) { p.setLength(lim); off.setPosition(p); }
  v.held = { e, off }; e.held = true; this.vrRumble(.5, 50, 'off'); this.audio.play('click', { rate: .7, volume: .5 });
};
G.vrHold = function (c) { const v = this.vr, H = v.held, e = H.e; if (!grabbable(e)) { v.held = null; return; } _m42.multiplyMatrices(c.matrixWorld, H.off); _m42.decompose(_v, _hq, _s); const b = e.body, hv = c.userData.vel; b.position.set(_v.x, _v.y, _v.z); b.quaternion.set(_hq.x, _hq.y, _hq.z, _hq.w); b.velocity.set(hv.x, hv.y, hv.z); b.angularVelocity.set(0, 0, 0); b.wakeUp(); };
G.vrThrow = function () {
  const v = this.vr, H = v.held; v.held = null; if (!H) return; const e = H.e; e.held = false; if (!e.body) return; const c = v.offCtrl, hv = c && c.userData.vel ? c.userData.vel : _v.set(0, 0, 0), k = 1.6;
  e.body.velocity.set(hv.x * k, hv.y * k + .4, hv.z * k); e.body.angularVelocity.set((Math.random() - .5) * 10, (Math.random() - .5) * 10, (Math.random() - .5) * 10);
  if (hv.length() * k > 3) { e.rgThrown = { t: 2.5, hit: new Set() }; (this.vrThrown || (this.vrThrown = [])).push(e); this.vrRumble(.35, 40, 'off'); }
};
G.vrThrownTick = function (dt) {
  const L = this.vrThrown; if (!L || !L.length) return; const mk = this.rgStat ? this.rgStat('melee') : 1;
  for (let i = L.length - 1; i >= 0; i--) { const e = L[i], T = e.rgThrown; T.t -= dt; if (!e.alive || !e.body || T.t <= 0) { L.splice(i, 1); continue; } const b = e.body, sp = b.velocity.length(); if (sp < 2.5) { L.splice(i, 1); continue; } const R = reachOf(e);
    for (const en of this.enemies) { if (en.dead || en.dormant || T.hit.has(en)) continue; const rp = en.root.position, dx = b.position.x - rp.x, dz = b.position.z - rp.z; if (dx * dx + dz * dz > (R + .45) * (R + .45) || b.position.y < rp.y - .2 || b.position.y > rp.y + en.p.height + .2) continue;
      T.hit.add(en); const dmg = clamp(b.mass * sp * .9, 12, 240) * mk; en.damage(dmg, _v.set(b.velocity.x, 0, b.velocity.z).normalize()); this.hitMark(); this.audio.play('punch', { pos: rp, rate: .75 }); this.fxp.spawn(_v2.set(b.position.x, b.position.y, b.position.z), 12, { color: '#ffd27a', speed: 2.5, life: .3 });
      b.velocity.x *= .35; b.velocity.z *= .35; if (e.type === 'barrel') this.explode(e); else if (e.type === 'crate' && e.p.breakable) this.damageEnt(e, 60, null, null); break; } }
};
G.vrPunchTick = function (dt) {
  const v = this.vr, W = ENG.WEAPONS[this.wep.cur] || {}, mk = this.rgStat ? this.rgStat('melee') : 1;
  v.ctrls.forEach(c => { const u = c.userData; if (!u.wp || !u.lvel) return; u.pcd = Math.max(0, (u.pcd || 0) - dt); const isGun = c === v.gunCtrl;
    if (isGun ? !(W.melee || this.wep.cur === 'fists') : !!v.held) return; const sp = u.lvel.length(); if (sp < 2.3 || u.pcd > 0) return;
    for (const en of this.enemies) { if (en.dead || en.dormant) continue; const rp = en.root.position, top = en.p.height; if (u.wp.y < rp.y + .25 || u.wp.y > rp.y + top + .1) continue; const dx = u.wp.x - rp.x, dz = u.wp.z - rp.z, rr = .33 * (top / 1.8) + .12; if (dx * dx + dz * dz > rr * rr) continue;
      u.pcd = .3; const head = u.wp.y > rp.y + top * .82, dmg = (isGun && W.melee ? (W.dmg || 40) : 22) * clamp(sp / 4, .6, 2.2) * mk * (head ? 1.5 : 1), dir = u.vel.clone().setY(0).normalize();
      en.lastHit = { point: u.wp.clone(), zone: head ? 'head' : 'chest', dmg }; en.damage(dmg, dir); this.hitMark(); this.audio.play('punch', { pos: u.wp, rate: .85 + Math.random() * .25 }); this.fxp.spawn(u.wp, 8, { color: '#ffd27a', speed: 2, life: .25 }); this.vrRumble(.8, 60, isGun ? 'gun' : 'off'); this.noise(rp, 6); break; } });
};
G.vrNextWeapon = function () { const list = this.wepOrder ? this.wepOrder() : ['fists', 'pistol', 'shotgun', 'rifle'].filter(k => k === 'fists' || this.wep.owned[k]); if (!list.length) return; const i = list.indexOf(this.wep.cur); this.setWeapon(list[(i + 1) % list.length]); };
G.vrMenuItems = function () {
  const items = this.vrMenuData && this.menu.style.display !== 'none' ? this.vrMenuData.buttons.slice() : this.reading ? [['Close', () => this.closeNote()]] : [];
  if (this.vr && !this.vr.sim && !(this.vrNote && this.reading && !this.vrMenuData)) items.push(['Exit VR', () => this.exitVR()]); return items;
};
G.vrMenuInput = function (pads, click) {
  const v = this.vr, P = v.menuP; if (!P.mesh.visible) return; let hov = -1; P.mesh.updateMatrixWorld(true);
  ['right', 'left'].forEach(h => { const p = pads[h]; if (!p) return; const c = p.c, ray = c.userData.ray; _v.setFromMatrixPosition(c.matrixWorld); _v2.set(0, 0, -1).transformDirection(c.matrixWorld); _rc.set(_v, _v2); _rc.near = 0; _rc.far = 10;
    const hit = _rc.intersectObject(P.mesh, false)[0]; if (ray) { ray.visible = true; ray.scale.z = hit ? hit.distance : 3; }
    if (hit && hit.uv) { const x = hit.uv.x * P.cv.width, y = (1 - hit.uv.y) * P.cv.height, i = P.rects.findIndex(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h); if (i >= 0 && hov < 0) hov = i; } });
  if (hov !== P.hover) { P.hover = hov; P.key = ''; if (hov >= 0) this.vrRumble(.15, 15, 'both'); }
  if (click && hov >= 0 && P.items[hov]) { const fn = P.items[hov][1]; this.vrRumble(.35, 30, 'both'); P.hover = -1; P.key = ''; fn(); }
};
G.vrRumble = function (str, ms, which) {
  const v = this.vr; if (!v || !v.on) return;
  v.ctrls.forEach(c => { const s = c.userData.src; if (!s || !s.gamepad) return; const isGun = c === v.gunCtrl; if ((which === 'gun' && !isGun) || (which === 'off' && isGun)) return;
    const a = s.gamepad.hapticActuators && s.gamepad.hapticActuators[0]; try { if (a && a.pulse) a.pulse(clamp(str, 0, 1), ms); } catch (e) { } });
};

/* ---------------- panels, lasers and screen effects, once per frame before drawing ---------------- */
G.vrUI = function () {
  const v = this.vr, dt = v.dt, head = v.head, menuOpen = this.vrMenuOpen(), MP = v.menuP, HP = v.hudP;
  _v.set(0, 0, -1).applyQuaternion(head.quaternion); _v.y = 0; if (_v.lengthSq() < 1e-6) _v.set(0, 0, -1); _v.normalize();
  if (menuOpen) {
    if (!MP.mesh.visible) { MP.mesh.position.copy(head.position).addScaledVector(_v, 1.35); MP.mesh.position.y -= .12; MP.mesh.lookAt(head.position); MP.mesh.visible = true; MP.hover = -1; MP.key = ''; }
    const items = this.vrMenuItems(), d = this.vrMenuData && this.menu.style.display !== 'none' ? this.vrMenuData : (this.vrNote || {}), key = (d.title || '') + '|' + (d.text || '') + '|' + items.map(b => b[0]).join(',') + '|' + MP.hover;
    if (key !== MP.key) { MP.key = key; MP.items = items; drawMenu(MP, d.title, d.text, items); }
  } else MP.mesh.visible = false;
  /* HUD: a panel low in view that follows the head lazily */
  const playing = this.state === 'play' && !menuOpen; HP.mesh.visible = playing;
  if (playing) {
    const want = _v2.copy(head.position).addScaledVector(_v, 1.15); want.y -= .5; if (!HP.placed || HP.mesh.position.distanceTo(want) > 1.5) { HP.mesh.position.copy(want); HP.placed = true; } else HP.mesh.position.lerp(want, Math.min(1, dt * 3)); HP.mesh.lookAt(head.position);
    const P = this.player, W = this.wep, o = W.owned[W.cur], WD = ENG.WEAPONS[W.cur] || {}, rows = [];
    if (this.cut) { const sub = this.subEl ? this.subEl.textContent : ''; if (sub) rows.push({ t: sub }); rows.push({ t: 'B to skip', color: '#9aa6b1' }); }
    else {
      const use = this.useEl && this.useEl.style.display !== 'none' ? this.useEl.textContent.replace(/^E\s+/, 'Grip: ') : ''; if (use) rows.push({ t: use, color: '#7ff0e4' });
      if (this.message) rows.push({ t: this.message, color: '#ffe2a0' }); if (this.objective) rows.push({ t: this.objective, color: '#c3ccd4' }); if (this.vrHudExtra) this.vrHudExtra(rows);
      rows.push({ big: true, t: Math.max(0, Math.round(P.health)) + ' HP' + (P.armor > 0 ? '   ' + Math.round(P.armor) + ' armor' : '') + '   ' + (WD.name || '') + (o && WD.mag ? '  ' + o.mag + ' / ' + o.res : ''), color: P.health < 30 ? '#ff7a6a' : '#eef2f5' });
    }
    const key = rows.map(r => r.t).join('|'); if (key !== HP.key) { HP.key = key; drawHud(HP, rows); }
  }
  /* aim laser and dot */
  const showLaser = playing && !this.cut && this.S.vrLaser !== false && this.vm && this.vm.visible;
  v.laser.visible = showLaser; v.dot.visible = showLaser && !!v.dotOn;
  if (showLaser && (v.laserN++ % 3 === 0)) { this.cam.updateMatrixWorld(true); _v.setFromMatrixPosition(this.cam.matrixWorld); _v2.set(0, 0, -1).transformDirection(this.cam.matrixWorld); _rc.set(_v, _v2); _rc.near = 0; _rc.far = 80;
    const h = _rc.intersectObjects(this.targets, true).find(x => x.object.visible); v.laser.scale.z = h ? h.distance : 80; v.dotOn = !!h; if (h) v.dot.position.copy(h.point); }
  /* hurt flash and fades */
  v.hurt = Math.max(0, v.hurt - dt * 2.5); const fade = this.post ? (this.post.fade || 0) : (this.fadeEl ? +this.fadeEl.style.opacity || 0 : 0);
  const fm = v.fx.material; if (fade > .01) { fm.color.set('#000'); fm.opacity = clamp(fade, 0, 1); } else { fm.color.set('#a01010'); fm.opacity = v.hurt * .45; } v.fx.visible = fm.opacity > .01;
};
G.vrRender = function () {
  let v = this.vr;
  if (!v || !v.on) { const s = this.opt.vrSession; if (s && this.renderer.xr.isPresenting) { delete this.opt.vrSession; this.vrStart(s, this.opt.vrType || 'local-floor'); v = this.vr; } else return this.renderer.render(this.scene, this.cam); }
  try { this.vrUI(); } catch (e) { console.warn('VR', e); }
  if (v.sim) { const el = this.renderer.domElement; v.cam.aspect = (el.width / el.height) || 1; v.cam.fov = this.S.fov || 75; v.cam.updateProjectionMatrix(); v.cam.position.copy(v.hl.position); v.cam.quaternion.copy(v.hl.quaternion);
    v.ctrls.forEach(c => { if (c.userData.simPos) c.matrix.compose(c.userData.simPos, c.userData.simQuat, _s.set(1, 1, 1)); }); }
  this.renderer.render(this.scene, v.cam);
};

/* ---------------- hooks into the game ---------------- */
const baseLoop = G.loop; G.loop = function (now) {
  const v = this.vr; if (v && v.on) { const dt = Math.min(.05, Math.max(0, (now - this.last) / 1000)); if (v.sim) v.ctrls.forEach(c => { if (c.userData.simPos) { c.matrix.compose(c.userData.simPos, c.userData.simQuat, _s.set(1, 1, 1)); c.matrixWorldNeedsUpdate = true; } }); try { this.vrPre(dt); } catch (e) { console.warn('VR', e); } }
  return baseLoop.apply(this, arguments);
};
const baseStep = G.step; G.step = function (dt) {
  const r = baseStep.apply(this, arguments), v = this.vr;
  if (v && v.on && this.state !== 'gone') { if (this.cut) this.vrCutRig(); else { this.vrPlace(); this.vrPose(); }
    if (v.held && v.held.e.dcols) v.held.e.dcols.forEach(c => c.box.makeEmpty()); /* what you hold never shoves you */ }
  if (this.vrThrown && this.state !== 'gone') this.vrThrownTick(dt * (this.ts || 1));
  return r;
};
const baseCam = G.updateCamera; G.updateCamera = function (dt) {
  const v = this.vr; if (!v || !v.on) return baseCam.apply(this, arguments); if (this.cut) return;
  this.mouse.r = false; baseCam.apply(this, arguments); if (this.rec) this.rec.p = this.rec.y = 0;
  this.vrPlace(); this.vrPose();
};
/* the left stick steers through the normal movement code, so sprint, slide, dash and crafts all still apply */
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
const baseUP = G.updatePlayer; G.updatePlayer = function (dt) {
  const v = this.vr; if (!v || !v.on) return baseUP.apply(this, arguments);
  const k = this.keys, S = this.S, P = this.player, m = v.move, yaw0 = P.yaw, sp0 = S.speed;
  if (m.mag > 0) { MOVE_KEYS.forEach(c => k[c] = false); k.KeyW = true; v.heldW = true; const fx = -m.y, sx = m.x, wx = -Math.sin(yaw0) * fx + Math.cos(yaw0) * sx, wz = -Math.cos(yaw0) * fx - Math.sin(yaw0) * sx; P.yaw = Math.atan2(-wx, -wz); S.speed = sp0 * m.mag; }
  else if (v.heldW) { k.KeyW = false; v.heldW = false; }
  try { return baseUP.apply(this, arguments); } finally { P.yaw = yaw0; S.speed = sp0; }
};
const baseFire = G.fire; G.fire = function () { const t0 = this.lastShot, r = baseFire.apply(this, arguments); if (this.vr && this.vr.on && this.lastShot !== t0) this.vrRumble(.55, 45, 'gun'); return r; };
const baseHurt = G.hurtPlayer; G.hurtPlayer = function (d) { const h0 = this.player.health, r = baseHurt.apply(this, arguments), v = this.vr; if (v && v.on && this.player.health < h0) { v.hurt = Math.min(1, v.hurt + .35 + (h0 - this.player.health) / 40); this.vrRumble(.8, 120, 'both'); } return r; };
const baseShow = G.showMenu; G.showMenu = function (title, text, buttons) { this.vrMenuData = { title, text: String(text || '').trim(), buttons: buttons.slice() }; const r = baseShow.apply(this, arguments); this.vrUpdateButton(); return r; };
const baseHide = G.hideMenu; G.hideMenu = function () { this.vrMenuData = null; const r = baseHide.apply(this, arguments); this.vrUpdateButton(); return r; };
const baseNote = G.showNote; if (baseNote) G.showNote = function (title, text) { this.vrNote = { title, text }; return baseNote.apply(this, arguments); };
const baseClose = G.closeNote; if (baseClose) G.closeNote = function () { this.vrNote = null; return baseClose.apply(this, arguments); };
/* restarting in VR keeps the headset on: the new game borrows this renderer and session */
const baseRestart = G.restart; G.restart = function (cp) {
  const v = this.vr; if (!v || !v.on || v.sim) return baseRestart.apply(this, arguments);
  this.keepRenderer = true; const o = Object.assign({}, this.opt, { checkpoint: cp || null, carry: null, renderer: this.renderer, vrSession: v.session, vrType: v.type });
  const c = this.c, src = this.src; this.dispose(); const g = new ENG.Game(c, src, o); if (this.opt.onRestart) this.opt.onRestart(g); g.ready.then(() => g.begin());
};
const baseDispose = G.dispose; G.dispose = function () {
  const v = this.vr;
  if (v && v.on) { if (!this.keepRenderer && v.session) { try { v.session.end(); } catch (e) { } } this.state = 'gone'; this.vrStop(true); }
  if (this.vrBtn) { this.vrBtn.remove(); this.vrBtn = null; }
  if (this.keepRenderer) this.scene.traverse(m => { if (m.geometry) m.geometry.dispose(); const ms = m.material ? [].concat(m.material) : []; ms.forEach(x => { if (x.map) x.map.dispose(); x.dispose(); }); });
  return baseDispose.apply(this, arguments);
};
/* the Enter VR button, shown on menus when a headset is available */
const baseBind = G.bind; G.bind = function () {
  const r = baseBind.apply(this, arguments);
  VR.check.then(ok => { if (!ok || this.state === 'gone' || this.S.vr === false || this.vrBtn) return;
    const b = this.vrBtn = document.createElement('button'); b.textContent = 'Enter VR'; b.title = VR.HELP;
    b.style.cssText = 'position:absolute;right:16px;bottom:16px;z-index:60;padding:12px 20px;border-radius:10px;border:1px solid rgba(127,240,228,.6);background:rgba(14,17,22,.88);color:#eef2f5;font:600 16px "Chakra Petch",sans-serif;cursor:pointer';
    b.onmousedown = e => e.stopPropagation(); b.onclick = e => { e.stopPropagation(); this.enterVR(); }; this.root.appendChild(b); this.vrUpdateButton(); });
  return r;
};
G.vrUpdateButton = function () { const b = this.vrBtn; if (!b) return; b.style.display = (this.vr && this.vr.on) || this.state === 'play' || this.state === 'loading' ? 'none' : ''; };

/* ---------------- Logic Tiles ---------------- */
if (ENG.Logic) {
  const L = ENG.Logic;
  L.EVENTS.vrStart = { cat: 'Player', label: 'The player starts playing in VR', text: 'the player puts on a VR headset', params: {} };
  L.EVENTS.vrEnd = { cat: 'Player', label: 'The player stops playing in VR', text: 'the player leaves VR', params: {} };
  L.CONDS.inVR = { cat: 'Player', label: 'The player is in VR', text: 'the player is playing in VR', params: {}, test(c) { return !!(c.g.vr && c.g.vr.on); } };
  L.ACTIONS.rumble = { cat: 'Player', label: 'Rumble the VR controllers', text: 'rumble the {hand} at {pct}% for {s} s', params: { hand: { t: 'enum', o: [['both', 'both controllers'], ['gun', 'gun hand'], ['off', 'free hand']], d: 'both' }, pct: { t: 'num', d: 60, min: 0, max: 100, step: 5 }, s: { t: 'num', d: .2, min: .05, max: 5, step: .05 } },
    run(c, p) { if (c.g.vrRumble) c.g.vrRumble(p.pct / 100, p.s * 1000, p.hand); } };
}

/* ---------------- Flow nodes ---------------- */
if (ENG.WKN) {
  const N = ENG.WKN;
  N.invr = { c: 'data', t: 'In VR', d: 'Yes while the player is playing in a VR headset.', i: [], o: [['value', 'bool']], p: [] };
  N.rumble = { c: 'action', t: 'Rumble controllers', d: 'Buzzes the VR controllers. Does nothing without a headset.', i: [['in', 'exec']], o: [['out', 'exec']], p: [{ k: 'strength', ty: 'num', v: .6, l: 'Strength (0 to 1)' }, { k: 'seconds', ty: 'num', v: .2, l: 'Seconds' }] };
  const wo = G.wkOut; G.wkOut = function (e, F, n) { if (n && n.type === 'invr') return !!(this.vr && this.vr.on); return wo.apply(this, arguments); };
  const wr = G.wkRun; G.wkRun = function (e, F, n, inPin, cx) {
    if (!n || n.type !== 'rumble') return wr.apply(this, arguments); if (e._wkDead || (cx.steps = (cx.steps || 0) + 1) > 500) return;
    const g = k => this.wkVal(e, F, n, k, cx); this.vrRumble(clamp(+g('strength') || 0, 0, 1), Math.max(.01, +g('seconds') || .2) * 1000, 'both'); this.wkFire(e, F, n, 'out', cx);
  };
}
})();
