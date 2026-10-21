/* VIRA STARTERS: weapons, gun models and hands imported from "No perks. Only wounds." and "Flying Lead",
   plus three player starters (first person shooter, third person shooter, first person camera only). */
(function () {
'use strict';
const ENG = window.ENG, G = ENG.Game.prototype, PF = ENG.PREFABS, NP = ENG.NP, FL = ENG.FL, D2R = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, rand = (a, b) => a + Math.random() * (b - a);
const V = () => new THREE.Vector3();

/* ---------------- weapon table: both games feed the same format ---------------- */
const SND = { revolver: 'pistol', dragoon: 'pistol', shotgun: 'shotgun', sawedoff: 'shotgun', puntgun: 'shotgun', pump: 'shotgun' };
const NP_RENAME = { shotgun: 'coachgun' };
const classify = w => w.melee ? 'Melee' : (w.pellets || 1) > 1 ? 'Shotguns' : w.auto ? 'Automatic' : w.slot === 'sidearm' ? 'Revolvers and pistols' : 'Rifles';
ENG.WEAPON_SRC = {};
for (const nid in NP.WEAPONS) {
  if (nid === 'beer' || nid === 'dual') continue; const w = NP.WEAPONS[nid], id = NP_RENAME[nid] || nid;
  if (w.melee) { ENG.WEAPONS[id] = { name: w.name, dmg: w.dmg, rate: w.swing || .45, melee: true, range: w.range || 1.8, sound: 'punch', slot: 'melee', model: { src: 'np', id: nid }, game: 'No perks' }; continue; }
  const cad = w.cadence || {}, rl = w.reload || {}, hip = w.hip || { still: 1, move: 3, air: 8, bloom: 2, recover: 5, crouch: .8 };
  ENG.WEAPONS[id] = { name: w.name, dmg: w.dmg, rate: cad.time || .3, mag: w.mag, reserve: w.mag * (w.mag <= 2 ? 10 : 5), pellets: w.pellets || 1, pelletSpread: w.pelletSpread || 0, auto: cad.type === 'auto',
    sound: SND[w.sound] || (w.slot === 'sidearm' ? 'pistol' : 'rifle'), slot: w.slot, twoHanded: !!w.twoHanded, scope: !!w.scope, noADS: !!w.noADS, cadence: cad.type,
    ads: { fov: w.adsFov || 60, time: w.adsTime || .22, sway: w.adsSway || .005, spread: w.adsSpread == null ? .2 : w.adsSpread }, hip, recoil: w.recoil || { pitch: .05, yaw: .015, recover: 7, kick: 1 },
    rtype: rl.type === 'single' ? 'single' : 'all', rstart: rl.start || .35, reach: rl.each || .5, rtime: rl.time || ((rl.start || .3) + (rl.each || .5) * Math.min(3, w.mag) + (rl.end || .2)), head: 2, model: { src: 'np', id: nid }, game: 'No perks' };
}
const FL_IDS = { pistol: 'pistol9', heavy: 'auto45', mpistol: 'machinepistol', smg: 'smg', shotgun: 'pumpshotgun', rifle: 'battlerifle', ar: 'assaultrifle' };
for (const fid in FL.WDEF) {
  const w = FL.WDEF[fid], id = FL_IDS[fid] || fid, sp = w.spread || 1;
  ENG.WEAPONS[id] = { name: w.name, dmg: w.dmg, rate: 60 / (w.rpm || 300), mag: w.mag, reserve: w.res || w.mag * 4, pellets: w.pellets || 1, pelletSpread: (w.pellets || 1) > 1 ? sp : 0, auto: !!w.auto,
    sound: w.snd === 'shotgun' ? 'shotgun' : w.kind === 'pistol' && !w.auto ? 'pistol' : 'rifle', slot: w.kind === 'pistol' ? 'sidearm' : 'primary', twoHanded: w.kind === 'long', scope: !!w.zoom, akimbo: !!w.akimbo,
    ads: { fov: w.zoom ? 34 : 56, time: .2, sway: .004, spread: (w.pellets || 1) > 1 ? sp * .8 : sp * .25 }, hip: { still: (w.pellets || 1) > 1 ? 1 : sp, move: sp * 2 + .8, air: sp * 3 + 2, bloom: (w.recoil || 1) * .45, recover: 5, crouch: .8 },
    recoil: { pitch: (w.recoil || 1) * .55 * D2R * 2.2, yaw: (w.recoil || 1) * .25 * D2R * 1.5, recover: 8, kick: Math.min(2, (w.recoil || 1) * .6) },
    rtype: w.shell ? 'single' : 'all', rstart: .3, reach: w.reload || .5, rtime: w.reload || 1.6, head: w.head || 2, model: { src: 'fl', id: w.model || fid }, game: 'Flying Lead' };
}
/* the original Vira guns get proper models and feel too */
Object.assign(ENG.WEAPONS.pistol, { model: { src: 'fl', id: 'heavy' }, slot: 'sidearm', ads: { fov: 58, time: .18, sway: .004, spread: .25 }, hip: { still: .8, move: 2.6, air: 6, bloom: 1.2, recover: 6, crouch: .8 }, recoil: { pitch: .03, yaw: .01, recover: 8, kick: 1 } });
Object.assign(ENG.WEAPONS.shotgun, { model: { src: 'fl', id: 'shotgun' }, slot: 'primary', twoHanded: true, pelletSpread: 4.5, ads: { fov: 62, time: .25, sway: .005, spread: 3.6 }, hip: { still: 1, move: 2.5, air: 6, bloom: 1, recover: 4, crouch: .8 }, recoil: { pitch: .1, yaw: .03, recover: 5, kick: 2 } });
Object.assign(ENG.WEAPONS.rifle, { model: { src: 'fl', id: 'ar' }, slot: 'primary', twoHanded: true, ads: { fov: 55, time: .22, sway: .004, spread: .2 }, hip: { still: 1.2, move: 3, air: 7, bloom: .6, recover: 6, crouch: .8 }, recoil: { pitch: .022, yaw: .012, recover: 9, kick: .8 } });
Object.assign(ENG.WEAPONS.fists, { slot: 'melee' });
Object.values(ENG.WEAPONS).forEach(w => { delete w.key; w.group = classify(w); });
ENG.weaponIds = () => Object.keys(ENG.WEAPONS);

/* ---------------- gun models: No perks builder, Flying Lead box guns ---------------- */
const FCOL = ['#2b2c31', '#141418', '#c9ccd2', '#6b4226', '#4a5a2a'];
ENG.gunModel = function (id, simple) {
  const W = ENG.WEAPONS[id], m = W && W.model;
  if (m && m.src === 'np') { try { const r = NP.buildGunModel(m.id, simple); return { group: r.group, muzzle: r.muzzle ? r.muzzle.clone() : new THREE.Vector3(0, .03, -.4), sightY: r.sightY || .05 }; } catch (e) { console.warn('gun', id, e); } }
  const g = new THREE.Group(); let muzzle = new THREE.Vector3(0, .03, -.3), top = .05;
  const boxes = (m && m.src === 'fl' && FL.GUNS[m.id]) || FL.GUNS.pistol;
  boxes.forEach(([x, y, z, w, h, d, c]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshPhongMaterial({ color: FCOL[c] || FCOL[0], shininess: c === 3 ? 18 : 70, specular: c === 3 ? 0x221a10 : 0x5a6068 })); b.position.set(x, y, z); b.castShadow = !simple; g.add(b); if (z - d / 2 < muzzle.z) muzzle.set(x, y, z - d / 2); top = Math.max(top, y + h / 2); });
  return { group: g, muzzle, sightY: top };
};

/* ---------------- first person view model: gun plus No perks gloved hands ---------------- */
const lam = c => new THREE.MeshLambertMaterial({ color: c });
ENG.makeViewModel = function (game, k) {
  const W = ENG.WEAPONS[k] || ENG.WEAPONS.fists, pc = game.pc || STARTERS.fps, root = new THREE.Group(), pivot = new THREE.Group(); root.add(pivot);
  const skin = lam(pc.skin || '#c99a76'), glove = lam(pc.glove || '#3a2a1e'), sleeve = lam(pc.sleeve || '#3a3128'), cuff = lam('#d8d0c0');
  let muzzle = new THREE.Vector3(0, 0, -.3), sightY = .05;
  if (k === 'fists' || (W.melee && !W.model)) {
    [-1, 1].forEach(s => { const f = NP.vmFist(skin, glove); f.position.set(s * .13, -.04, -.06); f.scale.setScalar(1.6); pivot.add(f); if (pc.hands !== false) { const sl = NP.vmSleeve(sleeve, cuff, .4); sl.position.set(s * .13, -.045, .02); sl.scale.setScalar(1.6); pivot.add(sl); } });
  } else {
    const gm = ENG.gunModel(k, false), gun = gm.group; pivot.add(gun); muzzle = gm.muzzle; sightY = gm.sightY;
    if (pc.hands !== false) {
      const hand = W.melee ? NP.vmFist(skin, glove) : NP.vmHandGrip(skin, glove); gun.add(hand); const sl = NP.vmSleeve(sleeve, cuff, .42); sl.position.set(.012, -.034, .1); sl.rotation.x = -.18; gun.add(sl);
      if (W.twoHanded) { const fz = Math.max(-.42, muzzle.z * .55), fore = NP.vmHandFore(skin, glove); fore.position.set(0, -.012, fz); gun.add(fore); }
    }
  }
  root.userData = { muzzle, sightY, pivot };
  root.traverse(n => { if (n.isMesh) { n.castShadow = false; n.receiveShadow = false; n.frustumCulled = false; } });
  return root;
};

/* western and action outfits from the two games */
Object.assign(ENG.OUTFITS, {
  gunslinger: { label: 'Gunslinger', skin: '#c99a76', top: '#5a4632', bottom: '#3b3026', shoes: '#2a1d14', hair: '#2a1d14', head: 'cowboy', coat: true },
  outlaw: { label: 'Outlaw', skin: '#b98a66', top: '#8c2f23', bottom: '#4a3a2a', shoes: '#2a1d14', hair: '#1a1410', head: 'cowboy', vest: true, sleeves: 'long' },
  sheriff: { label: 'Sheriff', skin: '#d2a47f', top: '#c8b48a', bottom: '#3e3a34', shoes: '#3a2416', hair: '#3a2416', head: 'cowboy', vest: true },
  action: { label: 'Action hero', skin: '#c68a5c', top: '#1b1b1f', bottom: '#2b2b33', shoes: '#111111', hair: '#1a1410', head: 'none' }
});
if (!ENG.HEADWEAR.includes('cowboy')) ENG.HEADWEAR.push('cowboy');
PF.enemy.props.outfit.o = Object.keys(ENG.OUTFITS); if (PF.spawner) PF.spawner.props.outfit.o = Object.keys(ENG.OUTFITS); if (PF.enemy.props.headwear) PF.enemy.props.headwear.o = ENG.HEADWEAR;

/* ---------------- the three starters ---------------- */
const STARTERS = ENG.STARTERS = {
  fps: { label: 'First person shooter', camera: 'fps', aimKey: true, hands: true, sprint: true, slide: true, dive: false, fov: 75, eye: 1.6, bob: 1, vmX: .2, vmY: -.2, vmZ: -.42, vmScale: 1, sway: 1, skin: '#c99a76', glove: '#3a2a1e', sleeve: '#3a3128', walk: 4.6, sprintMult: 1.6, jump: 6.5, health: 100, primary: 'lever', sidearm: 'revolver', melee: 'knife', outfit: 'gunslinger', shoulder: .58, camDist: 2.75, aimDist: 1.35, camUp: .2 },
  tps: { label: 'Third person shooter', camera: 'tps', aimKey: true, hands: false, sprint: false, slide: true, dive: true, fov: 80, eye: 1.6, bob: 0, vmX: .2, vmY: -.2, vmZ: -.42, vmScale: 1, sway: 1, skin: '#c99a76', glove: '#1b1b1f', sleeve: '#1b1b1f', walk: 6.6, sprintMult: 1, jump: 6, health: 100, primary: 'pumpshotgun', sidearm: 'pistol9', melee: 'fists', outfit: 'action', shoulder: .58, camDist: 2.75, aimDist: 1.35, camUp: .2 },
  camera: { label: 'First person camera only', camera: 'fps', aimKey: false, hands: false, noWeapons: true, sprint: true, slide: false, dive: false, fov: 75, eye: 1.6, bob: .6, vmX: .2, vmY: -.2, vmZ: -.42, vmScale: 1, sway: 1, skin: '#c99a76', glove: '#3a2a1e', sleeve: '#3a3128', walk: 4.2, sprintMult: 1.5, jump: 6, health: 100, primary: 'none', sidearm: 'none', melee: 'none', outfit: 'civilian', shoulder: .58, camDist: 2.75, aimDist: 1.35, camUp: .2 }
};
const SP_KEYS = ['fov', 'eye', 'bob', 'shoulder', 'camDist', 'aimDist', 'camUp', 'hands', 'skin', 'glove', 'sleeve', 'vmX', 'vmY', 'vmZ', 'vmScale', 'sway', 'outfit', 'walk', 'sprint', 'sprintMult', 'jump', 'slide', 'dive', 'primary', 'sidearm', 'melee', 'health'];
ENG.starterProps = k => { const s = STARTERS[k] || STARTERS.fps, o = { preset: k }; SP_KEYS.forEach(x => { if (s[x] !== undefined) o[x] = s[x]; }); return o; };
PF.player_start.props = Object.assign({ preset: { t: 'sel', d: 'auto', o: ['auto', 'fps', 'tps', 'camera'], l: 'Starter' } },
  { fov: { t: 'num', d: 75, min: 40, max: 120, step: 1, l: 'Field of view' }, eye: { t: 'num', d: 1.6, min: .5, max: 3, step: .05, l: 'Eye height (m)' }, bob: { t: 'num', d: 1, min: 0, max: 3, step: .1, l: 'Head bob' },
    shoulder: { t: 'num', d: .58, min: -2, max: 2, step: .02, l: 'Shoulder offset (m)' }, camDist: { t: 'num', d: 2.75, min: .5, max: 12, step: .05, l: 'Camera distance (m)' }, aimDist: { t: 'num', d: 1.35, min: .3, max: 8, step: .05, l: 'Aiming distance (m)' }, camUp: { t: 'num', d: .2, min: -1, max: 2, step: .02, l: 'Camera height (m)' },
    hands: { t: 'bool', d: true, l: 'Show hands' }, skin: { t: 'color', d: '#c99a76', l: 'Skin' }, glove: { t: 'color', d: '#3a2a1e', l: 'Glove' }, sleeve: { t: 'color', d: '#3a3128', l: 'Sleeve' },
    vmX: { t: 'num', d: .2, min: -1, max: 1, step: .01, l: 'View model right (m)' }, vmY: { t: 'num', d: -.2, min: -1, max: 1, step: .01, l: 'View model up (m)' }, vmZ: { t: 'num', d: -.42, min: -2, max: .2, step: .01, l: 'View model forward (m)' }, vmScale: { t: 'num', d: 1, min: .2, max: 4, step: .05, l: 'View model size' }, sway: { t: 'num', d: 1, min: 0, max: 4, step: .1, l: 'Weapon sway' },
    outfit: { t: 'sel', d: 'gunslinger', o: Object.keys(ENG.OUTFITS), l: 'Body outfit' }, walk: { t: 'num', d: 4.6, min: .5, max: 20, step: .1, l: 'Walk speed (m/s)' }, sprint: { t: 'bool', d: true, l: 'Shift sprints' }, sprintMult: { t: 'num', d: 1.6, min: 1, max: 4, step: .05, l: 'Sprint multiplier' }, jump: { t: 'num', d: 6.5, min: 0, max: 30, step: .1, l: 'Jump strength' },
    slide: { t: 'bool', d: true, l: 'Slides' }, dive: { t: 'bool', d: false, l: 'Shift dives (slow-mo)' }, primary: { t: 'weapon', d: 'lever', l: 'Primary' }, sidearm: { t: 'weapon', d: 'revolver', l: 'Sidearm' }, melee: { t: 'weapon', d: 'knife', l: 'Melee' }, health: { t: 'num', d: 100, min: 1, max: 10000, step: 5, l: 'Health' } });



G.applyStarter = function (ps) {
  const S = this.S, raw = ps && ps.props ? ps.props : {}; let key = raw.preset && raw.preset !== 'auto' ? raw.preset : (S.camera === 'tps' ? 'tps' : 'fps');
  const base = STARTERS[key] || STARTERS.fps, legacy = !raw.preset || raw.preset === 'auto', pc = Object.assign({ preset: key }, base); if (!legacy) SP_KEYS.forEach(x => { if (raw[x] !== undefined) pc[x] = raw[x]; });
  pc.legacy = legacy; if (legacy) Object.assign(pc, { dive: false, slide: false, sprint: true, aimKey: false, noWeapons: false, fov: this.cam ? this.cam.fov : 75 }); this.pc = pc; this.rec = { p: 0, y: 0 }; this.aimT = 0; this.vmKick = 0; this.bloom = 0; this.camSide = 1; this.pressed = {};
  if (legacy) return;
  S.camera = pc.camera; S.speed = pc.walk; S.sprint = pc.sprint ? pc.sprintMult : 1; S.jump = pc.jump; S.playerOutfit = pc.outfit;
  { const P = this.player; P.health = P.maxHealth = pc.health; const list = pc.noWeapons ? [] : [pc.primary, pc.sidearm, pc.melee].filter(w => w && w !== 'none' && ENG.WEAPONS[w]); S.startWeapon = list.find(w => w !== 'fists') || (list[0] || 'none'); this.loadout = list; }
  this.queue.push(() => { (this.loadout || []).forEach(w => { if (w !== 'fists' && !this.wep.owned[w]) this.giveWeapon(w, true); }); if (this.loadout && this.loadout.length) { const first = this.loadout.find(w => w !== 'fists'); if (first) this.setWeapon(first); } if (this.playerModel) { this.scene.remove(this.playerModel); this.playerModel = (ENG.buildBody || ((p, o) => ENG.buildHuman(ENG.lookOf(p), o)))(Object.assign(ENG.outfitProps(pc.outfit), { body: pc.body || 'western', lookSeed: pc.lookSeed || 7 }), { id: 'player', gun: false }); this.playerModel.rotation.order = 'YXZ'; this.playerModel.visible = S.camera === 'tps'; this.scene.add(this.playerModel); this.armBody(this.wep.cur); } });
};
G.wepOrder = function () { const rank = { primary: 0, sidearm: 1, melee: 2 }; return Object.keys(this.wep.owned).concat(this.wep.owned.fists ? [] : ['fists']).filter((k, i, a) => a.indexOf(k) === i && ENG.WEAPONS[k]).sort((a, b) => (rank[ENG.WEAPONS[a].slot] ?? 3) - (rank[ENG.WEAPONS[b].slot] ?? 3)); };
G.armBody = function (k) {
  const pm = this.playerModel, parts = pm && pm.userData.parts; if (!parts || !parts.foreR) return; if (parts.gun) { parts.foreR.remove(parts.gun); parts.gun = null; }
  if (!k || k === 'fists' || !ENG.WEAPONS[k]) return; const gm = ENG.gunModel(k, true), g = gm.group; g.rotation.x = -Math.PI / 2; g.position.set(0, -.355, .02); g.userData.muzzle = gm.muzzle; parts.foreR.add(g); parts.gun = g;
};
const baseSetWeapon = G.setWeapon;
G.setWeapon = function (k) {
  if (this.pc && this.pc.noWeapons && k !== 'fists') return; baseSetWeapon.call(this, k); if (this.wep.cur !== k) return;
  if (this.vm) this.cam.remove(this.vm); this.vm = ENG.makeViewModel(this, k); this.vm.visible = this.S.camera === 'fps' && !(this.pc && this.pc.noWeapons); this.cam.add(this.vm); this.sr = null; this.armBody(k);
};
G.reload = function () {
  const k = this.wep.cur, W = ENG.WEAPONS[k], o = this.wep.owned[k]; if (!o || W.melee || o.mag >= W.mag || o.res <= 0 || this.wep.reload > 0 || this.sr) return;
  if (W.rtype === 'single') { this.sr = { t: W.rstart || .35 }; this.audio.play('reload', { rate: 1.15 }); return; }
  this.wep.reload = W.rtime || (k === 'shotgun' ? 1.1 : .9); this.audio.play('reload');
};
G.quickMelee = function () {
  if (this.time < (this.qmNext || 0) || (this.pc && this.pc.noWeapons)) return; this.qmNext = this.time + .65; this.vmKick = 1.2; this.audio.play('punch');
  const cam = this.cam, fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion); this.shoot(this.S.camera === 'tps' ? this.player.pos.clone().add(V().set(0, 1.4, 0)) : cam.position, fwd, 32, 2.1);
};
const spreadDir = (dir, deg) => { if (deg <= 0) return dir.clone(); const up = Math.abs(dir.y) > .95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), u = V().crossVectors(dir, up).normalize(), v = V().crossVectors(u, dir).normalize(), a = Math.random() * Math.PI * 2, r = Math.tan(deg * D2R) * Math.sqrt(Math.random()); return dir.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r).normalize(); };
G.spreadDeg = function () {
  const W = ENG.WEAPONS[this.wep.cur] || {}, P = this.player, hip = W.hip || { still: .8, move: 2.5, air: 6, crouch: .8 };
  if (this.aimT > .6 && W.ads && !W.noADS) return W.ads.spread + this.bloom * .25; const hs = Math.hypot(P.vel.x, P.vel.z);
  let s = !P.onGround ? hip.air : hs > .6 ? lerp(hip.still, hip.move, clamp(hs / 6, 0, 1)) : hip.still; if (P.crouch) s *= hip.crouch || .8; if (W.noADS && this.aimT > .6) s *= .45; return s + this.bloom;
};
G.fire = function (click) {
  if (this.state !== 'play' || this.cut) return; const pc = this.pc || {}; if (pc.noWeapons) return; const k = this.wep.cur, W = ENG.WEAPONS[k], o = this.wep.owned[k];
  if (this.time < this.wep.next || this.wep.reload > 0 || this.wep.swap > 0) return; if (!click && !W.auto) return;
  if (!W.melee) { if (!o || o.mag <= 0) { if (click) this.audio.play('click'); if (o && o.res > 0) this.reload(); return; } o.mag--; this.sr = null; }
  this.wep.next = this.time + W.rate; this.lastShot = this.time; this.audio.play(W.sound); this.noise(this.player.pos, W.melee ? 4 : 30);
  const cam = this.cam; cam.updateMatrixWorld(true); const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), tps = this.S.camera === 'tps';
  if (!W.melee && this.ejectShell && !tps) this.ejectShell();
  const rc = W.recoil || { pitch: W.kick || .02, yaw: (W.kick || .02) * .3, kick: 1 }, ak = this.aimT > .6 ? .65 : 1; this.rec.p += rc.pitch * ak; this.rec.y += rand(-1, 1) * rc.yaw * ak; this.vmKick = Math.min(2.5, this.vmKick + (rc.kick || 1)); if (W.hip) this.bloom = Math.min(8, this.bloom + W.hip.bloom * (this.aimT > .6 ? .4 : 1));
  if (W.melee) { this.vmKick = 1.4; this.shoot(tps ? this.player.pos.clone().add(V().set(0, 1.4, 0)) : cam.position, fwd, W.dmg, W.range); return; }
  let from = cam.position.clone(), aim = fwd;
  if (tps) { const st = (this.camDistNow || 2) + .35, s = cam.position.clone().addScaledVector(fwd, st); _r.set(s, fwd); _r.near = 0; _r.far = 250; const hit = _r.intersectObjects(this.sightBlock.concat(this.targets), true).find(h => h.object.visible); const pt = hit ? hit.point : s.clone().addScaledVector(fwd, 250);
    from = this.player.pos.clone().add(V().set(0, (this.player.crouch ? 1.0 : 1.42), 0)); aim = pt.clone().sub(from).normalize(); this.aimPoint = pt; }
  const sd = this.spreadDeg(), pel = W.pellets || 1;
  for (let i = 0; i < pel; i++) this.shoot(from, spreadDir(aim, pel > 1 ? (W.pelletSpread || 3) * (this.aimT > .6 ? .8 : 1) + sd * .3 : sd), W.dmg, 220, true);
  if (!tps && this.vm) { this.flash.intensity = 3; const mz = this.vm.userData.muzzle.clone(); this.vm.localToWorld(mz); this.cam.worldToLocal(mz); this.flashSpr.position.copy(mz); this.flashSpr.material.opacity = 1; this.flashSpr.rotation.z = Math.random() * 3; this.flash.position.copy(mz); }
  else { this.flash.intensity = 3; this.flash.position.set(0, -.3, -1); }
};
const _r = new THREE.Raycaster();
const baseShoot = G.shoot;
G.shoot = function (from, dir, dmg, range, tracer) {
  if (this.S.camera === 'tps' && tracer && this.playerModel && this.playerModel.userData.parts && this.playerModel.userData.parts.gun) { const g = this.playerModel.userData.parts.gun, m = (g.userData.muzzle || V()).clone(); g.localToWorld(m); this._tpsMuzzle = m; }
  return baseShoot.call(this, from, dir, dmg, range, tracer);
};

/* ---------------- movement: sprint, slide (No perks), dive and slide (Flying Lead) ---------------- */
G.updatePlayer = function (dt) {
  const P = this.player, S = this.S, k = this.keys, pc = this.pc || {}, pr = this.pressed || (this.pressed = {}); const lock = this.cut || this.state !== 'play' || this.reading;
  const shiftP = pr.ShiftLeft || pr.ShiftRight, cP = pr.KeyC; this.pressed = {};
  if (!lock && P.onGround && !(P.proneT > 0)) {
    let fx0 = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0), sx0 = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0); const sn = Math.sin(P.yaw), cs = Math.cos(P.yaw); let dx = -sn * fx0 + cs * sx0, dz = -cs * fx0 - sn * sx0; const dl = Math.hypot(dx, dz); if (dl > 0) { dx /= dl; dz /= dl; } else { dx = -sn; dz = -cs; }
    if (pc.dive && shiftP && !(P.slideT > 0)) { if (k.KeyC && pc.slide) { P.slideT = .75; P.sv = { x: dx * 8.8, z: dz * 8.8 }; } else { P.diveT = 1; P.vel.x = dx * 9.2; P.vel.y = 3.4; P.vel.z = dz * 9.2; P.onGround = false; P.diveDir = Math.atan2(-dx, -dz); if (S.bulletTime && this.setBulletTime && !this.btOn && P.bt > .08) { this.setBulletTime(true); P.diveBT = true; } this.audio.play('jump', { volume: .7, rate: .8 }); } }
    else if (pc.slide && !pc.dive && cP && (k.ShiftLeft || k.ShiftRight) && fx0 > 0 && !(P.slideT > 0)) { const v = Math.max(Math.hypot(P.vel.x, P.vel.z), S.speed * S.sprint) * 1.3; P.slideT = .8; P.sv = { x: dx * v, z: dz * v }; this.audio.play('step', { volume: .9, rate: .6 }); }
  }
  const sliding = P.slideT > 0, diving = P.diveT > 0, prone = P.proneT > 0;
  const want = !!k.KeyC || sliding || prone; if (want !== P.crouch) { if (want || !this.overlap(P.pos.x, P.pos.y, P.pos.z, .32, 1.75, null)) P.crouch = want; } P.h = P.crouch ? 1.1 : 1.75;
  let fx = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), sx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0); if (lock || prone) fx = sx = 0;
  const sprinting = !!(pc.sprint !== false && (k.ShiftLeft || k.ShiftRight) && !P.crouch && fx > 0 && !pc.dive); P.sprinting = sprinting && Math.hypot(P.vel.x, P.vel.z) > 2;
  const sp = S.speed * (sprinting ? S.sprint : 1) * (P.crouch && !sliding ? .5 : 1) * (this.aimT > .5 ? .7 : 1);
  const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw); let wx = -sin * fx + cos * sx, wz = -cos * fx - sin * sx; const l = Math.hypot(wx, wz); if (l > 1) { wx /= l; wz /= l; }
  if (sliding) { const d = Math.exp(-1.8 * dt); P.sv.x *= d; P.sv.z *= d; P.vel.x = P.sv.x; P.vel.z = P.sv.z; P.slideT -= dt; if (Math.hypot(P.sv.x, P.sv.z) < 2.2) P.slideT = 0; }
  else if (diving) { /* keep the launch velocity, air control is off */ }
  else { ENG.moveSim(P, wx, wz, sp, dt, this); }
  if (prone) { P.vel.x *= Math.exp(-10 * dt); P.vel.z *= Math.exp(-10 * dt); P.proneT -= dt; }
  P.vel.y = Math.max(-40, P.vel.y - S.gravity * dt);
  const y0 = P.pos.y; this.slide(P.pos, P.vel.x * dt, P.vel.z * dt, .32, P.h, P.onGround, null); if (P.onGround && P.pos.y > y0 + .01) P.stepHold = .22; /* just stepped up a ledge: do not snap back down while the centre is still over the lower ground */
  const dy = P.vel.y * dt; P.pos.y += dy;
  if (P.vel.y > 0 && this.overlap(P.pos.x, P.pos.y, P.pos.z, .32, P.h, null)) { P.pos.y -= dy; P.vel.y = 0; }
  this.depenetrate(P.pos, .32, P.h, null, .25);
  const probe = P.onGround ? .45 : .05, fall = Math.max(0, -dy); const g = this.groundFoot(P.pos.x, P.pos.y, P.pos.z, .32, probe + fall);
  const holding = P.stepHold > 0; if (holding) P.stepHold -= dt;
  if (g !== null && P.vel.y <= 0 && P.pos.y - g <= probe + fall + .001) { if (holding && g < P.pos.y - .004) { P.vel.y = 0; P.onGround = true; } else { if (!P.onGround && P.vel.y < -12 && !diving) this.hurtPlayer((-P.vel.y - 12) * 4, true); P.pos.y = g; P.vel.y = 0; P.onGround = true; } } else P.onGround = false; P.groundEnt = P.onGround && this.footObj ? this.footObj.userData.e : null;
  if (diving && P.onGround) { P.diveT = 0; P.proneT = .55; this.shake = Math.min(1, this.shake + .35); this.audio.play('land', { volume: .8 }); if (P.diveBT && this.setBulletTime) { this.setBulletTime(false); P.diveBT = false; } }
  const hs = Math.hypot(P.vel.x, P.vel.z); if (P.onGround && hs > .5 && !sliding) { P.stepAcc += hs * dt; P.bob += hs * dt * 1.6; if (P.stepAcc > 2.1) { P.stepAcc = 0; this.audio.play('step', { volume: .7, rate: rand(.85, 1.15) }); } }
  if (P.pos.y < -80) this.hurtPlayer(9999, true);
  this.ents.forEach(e => { if (e.dyn && e.body && e.alive) { const b = e.body.position; const dx = b.x - P.pos.x, dz = b.z - P.pos.z, d = Math.hypot(dx, dz); const reach = .5 + Math.max(e.o.s[0], e.o.s[2]) * .6; if (d < reach && b.y > P.pos.y - .3 && b.y < P.pos.y + P.h && hs > .5) { const f = Math.min(e.body.mass, 40) * 3 * dt; e.body.wakeUp(); e.body.applyImpulse(new CANNON.Vec3(dx / d * f, 0, dz / d * f), e.body.position); } } });
};

/* ---------------- camera: first person with ADS, sway and recoil; Flying Lead shoulder camera ---------------- */
let scopeEl = null;
G.updateCamera = function (dt) {
  const P = this.player, cam = this.cam, pc = this.pc || STARTERS.fps; if (this.cut) return; if (!this.rec) this.rec = { p: 0, y: 0 };
  const W = ENG.WEAPONS[this.wep.cur] || {}, rc = W.recoil || { recover: 7 }, rk = Math.min(1, (rc.recover || 7) * dt); this.rec.p -= this.rec.p * rk; this.rec.y -= this.rec.y * rk; this.wep.kick = 0;
  if (W.hip) this.bloom = Math.max(0, this.bloom - (W.hip.recover || 5) * dt);
  if (this.sr) { const o = this.wep.owned[this.wep.cur]; this.sr.t -= dt; if (this.sr.t <= 0) { if (o && o.mag < W.mag && o.res > 0) { o.mag++; o.res--; this.audio.play('click', { rate: 1.7, volume: .6 }); this.sr.t = W.reach || .5; } else this.sr = null; } }
  const aiming = !!(this.mouse.r && pc.aimKey && !pc.legacy && !pc.noWeapons && !W.melee && this.state === 'play' && !(P.slideT > 0) && !this.reading); this.aimT = clamp((this.aimT || 0) + (aiming ? 1 : -1) * dt / Math.max(.05, (W.ads && W.ads.time) || .2), 0, 1);
  const tps = this.S.camera === 'tps', low = P.crouch || P.slideT > 0 || P.proneT > 0, eyeB = pc.eye || 1.6, eye = P.proneT > 0 && tps ? .55 : low ? eyeB * .64 : eyeB; this.eyeY = lerp(this.eyeY || eye, eye, Math.min(1, dt * 12));
  const bob = !tps ? Math.sin(P.bob * 3.2) * .04 * (pc.bob == null ? 1 : pc.bob) * (P.onGround ? 1 : 0) * (1 - this.aimT * .8) : 0;
  const sh = this.shake > 0 ? this.shake : 0; this.shake = Math.max(0, this.shake - dt * 2);
  const head = new THREE.Vector3(P.pos.x, P.pos.y + this.eyeY + bob, P.pos.z), roll = P.slideT > 0 && !tps ? -.06 : 0;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(P.pitch + this.rec.p + rand(-1, 1) * sh * .05, P.yaw + this.rec.y + rand(-1, 1) * sh * .05, roll, 'YXZ'));
  const baseF = pc.fov || 75; let fov = baseF;
  if (tps) {
    const z = this.aimT, side = ((pc.shoulder == null ? .58 : pc.shoulder) - .12 * z) * (this.camSide || 1), back = lerp(pc.camDist || 2.75, pc.aimDist || 1.35, z), up = (pc.camUp == null ? .2 : pc.camUp) - .05 * z;
    const piv = head.clone(); piv.y += .08; const right = new THREE.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)), fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const cs = piv.clone().addScaledVector(right, side); cs.y += up; const cd = cs.clone().sub(piv), L = cd.length();
    if (L > 1e-4) { cd.multiplyScalar(1 / L); _r.set(piv, cd); _r.near = 0; _r.far = L + .2; const h = _r.intersectObjects(this.sightBlock, false); if (h.length) cs.copy(piv).addScaledVector(cd, Math.max(0, h[0].distance - .2)); }
    let bd = back; _r.set(cs, fwd.clone().negate()); _r.near = 0; _r.far = back + .2; const hb = _r.intersectObjects(this.sightBlock, false); if (hb.length) bd = Math.max(.12, hb[0].distance - .2);
    this.camDistNow = bd; cam.position.copy(cs).addScaledVector(fwd, -bd); cam.quaternion.copy(q); fov = baseF - z * (baseF - (W.scope ? 34 : 56));
    const pm = this.playerModel; if (pm) { pm.rotation.order = 'YXZ'; pm.position.copy(P.pos); const dv = P.diveT > 0 ? 1 : 0, pr = P.proneT > 0 ? 1 : 0; this.lie = lerp(this.lie || 0, Math.max(dv, pr), Math.min(1, dt * 10));
      pm.rotation.y = (dv || pr) && P.diveDir != null ? P.diveDir + Math.PI : P.yaw + Math.PI; pm.rotation.x = this.lie * 1.42; pm.position.y += this.lie * .28;
      const hs = Math.hypot(P.vel.x, P.vel.z); ENG.animateHuman(pm.userData.parts, P.bob * 3.2, this.lie > .3 ? 0 : Math.min(.8, hs * .15), aiming || this.time - (this.lastShot || -9) < 1.2 || this.lie > .3); }
  } else { cam.position.copy(head); cam.quaternion.copy(q); if (W.ads) fov = lerp(baseF, W.noADS ? baseF * .9 : W.ads.fov, this.aimT); }
  if (Math.abs(cam.fov - fov) > .01) { cam.fov = fov; cam.updateProjectionMatrix(); }
  const scoped = !tps && W.scope && this.aimT > .85; if (scoped && !scopeEl) { scopeEl = document.createElement('div'); scopeEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 50%,transparent 0 31vh,#000 31.4vh);z-index:3'; scopeEl.innerHTML = '<div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:#000"></div><div style="position:absolute;top:50%;left:0;right:0;height:1px;background:#000"></div>'; }
  if (scopeEl) { if (scoped && scopeEl.parentNode !== this.c) this.c.appendChild(scopeEl); scopeEl.style.display = scoped ? 'block' : 'none'; }
  if (this.vm) {
    this.vm.visible = !tps && !pc.noWeapons && !scoped; this.vmKick = Math.max(0, (this.vmKick || 0) - dt * 9);
    if (this.vm.visible) { const s = pc.vmScale || 1, sightY = this.vm.userData.sightY || .05, adsK = W.noADS ? .4 : 1, a = this.aimT * adsK;
      const dyaw = P.yaw - (this.lyaw == null ? P.yaw : this.lyaw), dpit = P.pitch - (this.lpit == null ? P.pitch : this.lpit), sw = (pc.sway == null ? 1 : pc.sway) * (1 - this.aimT * .85);
      this.swx = lerp(this.swx || 0, clamp(dyaw * 1.4, -.06, .06) * sw, Math.min(1, dt * 9)); this.swy = lerp(this.swy || 0, clamp(-dpit * 1.4, -.05, .05) * sw, Math.min(1, dt * 9));
      const hs = Math.hypot(P.vel.x, P.vel.z), bb = P.onGround ? Math.min(1, hs / 5) * (1 - this.aimT * .85) * (pc.bob == null ? 1 : pc.bob) : 0, run = P.sprinting && !aiming ? 1 : 0; this.runT = lerp(this.runT || 0, run, Math.min(1, dt * 8));
      const rl = this.wep.reload > 0 || this.sr ? 1 : 0; this.rlT = lerp(this.rlT || 0, rl, Math.min(1, dt * 10));
      const hx = pc.vmX == null ? .2 : pc.vmX, hy = pc.vmY == null ? -.2 : pc.vmY, hz = pc.vmZ == null ? -.42 : pc.vmZ;
      this.vm.position.set(lerp(hx, 0, a) + this.swx + Math.cos(P.bob * 1.6) * .012 * bb, lerp(hy, -sightY * s, a) + this.swy - Math.abs(Math.sin(P.bob * 1.6)) * .01 * bb - this.rlT * .08 - this.runT * .04, lerp(hz, -.3 * s, a) + this.vmKick * .035);
      this.vm.rotation.set(this.vmKick * .1 + this.rlT * .55 - this.runT * .25, this.swx * 2 + this.runT * .7, this.swx * 1.5 - this.rlT * .3 + this.runT * .2); this.vm.scale.setScalar(s); }
  }
  this.lyaw = P.yaw; this.lpit = P.pitch;
};

/* ---------------- keys: the same scheme for all starters, classic projects keep their old keys ---------------- */
G.onKey = function (e) {
  const c = e.code, pc = this.pc || { legacy: true };
  if (this.reading) { if (c === 'KeyE' || c === 'Escape' || c === 'Space' || c === 'Enter') this.closeNote(); return; }
  if (this.cut) { if (c === 'Enter') this.endCutscene(); return; }
  if (c === 'Escape' && this.noLock) this.pause(); if (!e.repeat) (this.pressed || (this.pressed = {}))[c] = true;
  if (c === 'KeyE') this.use(); if (c === 'KeyR') this.reload();
  if (c === 'Space' && this.player.onGround && !(this.player.proneT > 0)) { this.player.vel.y = this.S.jump; this.player.onGround = false; this.player.slideT = 0; this.audio.play('jump', { volume: .6 }); }
  if (pc.legacy && c === 'Digit1') this.setWeapon('fists');
  else if (pc.legacy && ['Digit2', 'Digit3', 'Digit4'].includes(c)) { const w = ['pistol', 'shotgun', 'rifle'][+c.slice(5) - 2]; if (this.wep.owned[w]) this.setWeapon(w); }
  else if (/^Digit[1-9]$/.test(c) && !pc.noWeapons) { const list = this.wepOrder(), w = list[+c.slice(5) - 1]; if (w) this.setWeapon(w); }
  if (c === 'KeyQ') { if (pc.legacy) { if (this.setBulletTime) this.setBulletTime(!this.btOn); } else if (!pc.noWeapons) { const list = this.wepOrder(), i = list.indexOf(this.wep.cur); if (list.length) this.setWeapon(list[(i + 1) % list.length]); } }
  if (c === 'KeyV') { if (pc.legacy) { this.S.camera = this.S.camera === 'fps' ? 'tps' : 'fps'; this.playerModel.visible = this.S.camera === 'tps'; if (this.vm) this.vm.visible = this.S.camera === 'fps'; } else if (this.setBulletTime && !pc.noWeapons) this.setBulletTime(!this.btOn); }
  if (c === 'KeyX' && this.S.camera === 'tps') this.camSide = -(this.camSide || 1);
  if ((c === 'KeyF' || c === 'KeyG') && !pc.legacy) this.quickMelee();
  if (c === 'F2') { e.preventDefault && e.preventDefault(); this.dbgOn = !this.dbgOn; this.updateDebug(true); }
};

/* ---------------- weapon pickups for every imported gun ---------------- */
{
  const pk = PF.pickup, ids = Object.keys(ENG.WEAPONS).filter(k => k !== 'fists'); pk.props.kind.o = ['health', 'ammo', 'armor', 'key', 'collectible'].concat(ids);
  const base = pk.build;
  pk.build = function (o, c) {
    const k = o.props.kind, W = ENG.WEAPONS[k]; if (!W || k === 'fists') return base(o, c);
    const g = new THREE.Group(), spin = new THREE.Group(); spin.position.y = .55; g.add(spin); g.userData.spin = spin; const gm = ENG.gunModel(k, true), m = gm.group;
    const b = new THREE.Box3().setFromObject(m), len = Math.max(.05, b.max.z - b.min.z), sc = clamp(.75 / len, 1.2, 3.2); m.scale.setScalar(sc); m.position.set(0, -(b.min.y + b.max.y) / 2 * sc, -(b.min.z + b.max.z) / 2 * sc); m.traverse(n => { if (n.isMesh) n.castShadow = true; }); const holder = new THREE.Group(); holder.rotation.y = Math.PI / 2; holder.add(m); spin.add(holder);
    if (c.editor) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.45, .02, 6, 24), new THREE.MeshBasicMaterial({ color: '#4cc3b8', transparent: true, opacity: .7, depthWrite: false })); ring.userData.editorOnly = true; ring.rotation.x = Math.PI / 2; ring.position.y = .05; g.add(ring); }
    return g;
  };
}
})();
