/* Gun models, hands and weapon data from "No perks. Only wounds." (prototype 4), imported as-is. */
(function () {
const ENG = window.ENG;
const V3 = THREE.Vector3; const clamp=(v,a,b)=>v<a?a:v>b?b:v; const rand=(a,b)=>a+Math.random()*(b-a);
const MATS = {};
function M(hex, opts = {}) {
  const key = hex + JSON.stringify(opts);
  if (!MATS[key]) MATS[key] = opts.basic ? new THREE.MeshBasicMaterial({ color: hex, ...opts.p })
    : new THREE.MeshLambertMaterial({ color: hex, ...(opts.p || {}) });
  return MATS[key];
}
const GEO = { box: new THREE.BoxGeometry(1, 1, 1), sphere: new THREE.SphereGeometry(1, 14, 10), cyl: new THREE.CylinderGeometry(1, 1, 1, 12), cyl6: new THREE.CylinderGeometry(1, 1, 1, 7) };
function mbox(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(GEO.box, mat); m.scale.set(w, h, d); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m;
}
function mcyl(r, h, mat, x = 0, y = 0, z = 0, parent, seg) {
  const m = new THREE.Mesh(seg === 7 ? GEO.cyl6 : GEO.cyl, mat); m.scale.set(r, h, r); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m;
}
const PHONG = {};
function phong(hex, shin = 24, extra) {
  const k = hex + '|' + shin + (extra ? JSON.stringify(extra) : '');
  return PHONG[k] || (PHONG[k] = new THREE.MeshPhongMaterial(Object.assign({ color: hex, shininess: shin, specular: 0x222222 }, extra || {})));
}
const WEAPONS = {
  revolver: { id: 'revolver', name: 'Trail revolver', slot: 'sidearm', focus: true, noADS: true, acc: { min: 0.22, max: 7, bloom: 0.3, focusBloom: 0.17 }, dmg: 34, pellets: 1, range: 90, mag: 6,
    reload: { type: 'single', start: 0.35, each: 0.55, end: 0.25 }, cadence: { type: 'cock', time: 0.42 },
    adsFov: 62, adsTime: 0.2, adsSway: 0.0045, adsSpread: 0.12,
    hip: { still: 0.9, move: 3.5, air: 9, bloom: 2.4, recover: 5.5, crouch: 0.75 },
    recoil: { pitch: 0.05, yaw: 0.014, recover: 7, kick: 1 }, falloff: { start: 25, end: 60, min: 0.6 }, sound: 'revolver', switchTime: 0.22 },
  // Double Slinger: one weapon, two guns. Left click fires the right gun, right click fires the left. No sights.
  dual: { id: 'dual', name: 'Twin trail revolvers', slot: 'sidearm', dual: true, noADS: true, acc: { min: 0.45, max: 8, bloom: 0.22, focusBloom: 0.22, cap: 0.62 }, dmg: 30, pellets: 1, range: 85, mag: 6,
    reload: { type: 'single', start: 0.35, each: 0.42, end: 0.25 }, cadence: { type: 'cock', time: 0.42 },
    adsFov: 75, adsTime: 0.2, adsSway: 0.0055, adsSpread: 0.4,
    hip: { still: 1.25, move: 4.2, air: 9.5, bloom: 2.8, recover: 5, crouch: 0.75 },
    recoil: { pitch: 0.045, yaw: 0.02, recover: 7, kick: 1 }, falloff: { start: 22, end: 55, min: 0.55 }, sound: 'revolver', switchTime: 0.35 },
  // High impact revolver: slow, brutal, staggers and shoves what it hits.
  dragoon: { id: 'dragoon', name: 'Dragoon hand cannon', slot: 'sidearm', caliber: 'high', focus: true, noADS: true, acc: { min: 0.28, max: 8, bloom: 0.42, focusBloom: 0.27 }, dmg: 56, pellets: 1, range: 95, mag: 5, impact: true,
    reload: { type: 'single', start: 0.4, each: 0.7, end: 0.3 }, cadence: { type: 'cock', time: 0.72 },
    adsFov: 58, adsTime: 0.26, adsSway: 0.0055, adsSpread: 0.1,
    hip: { still: 1.2, move: 4.6, air: 10, bloom: 4.2, recover: 4.2, crouch: 0.75 },
    recoil: { pitch: 0.105, yaw: 0.03, recover: 5, kick: 1.9 }, falloff: { start: 22, end: 60, min: 0.6 }, sound: 'dragoon', switchTime: 0.32 },
  shotgun: { id: 'shotgun', name: 'Coach gun', slot: 'primary', caliberClose: 8, twoHanded: true, dmg: 12, pellets: 9, pelletSpread: 3.4, range: 45, mag: 2,
    reload: { type: 'all', time: 2.2 }, cadence: { type: 'semi', time: 0.24 },
    adsFov: 64, adsTime: 0.28, adsSway: 0.0055, adsSpread: 0.5,
    hip: { still: 1.4, move: 4.5, air: 8, bloom: 3, recover: 4, crouch: 0.8 },
    recoil: { pitch: 0.11, yaw: 0.03, recover: 5, kick: 2 }, falloff: { start: 8, end: 25, min: 0.25 }, sound: 'shotgun', switchTime: 0.5 },
  lever: { id: 'lever', name: 'Lever rifle', slot: 'primary', twoHanded: true, dmg: 42, pellets: 1, range: 160, mag: 8,
    reload: { type: 'single', start: 0.4, each: 0.5, end: 0.35 }, cadence: { type: 'lever', time: 0.58 },
    adsFov: 50, adsTime: 0.3, adsSway: 0.004, adsSpread: 0.05,
    hip: { still: 1.6, move: 5.5, air: 10, bloom: 3, recover: 4, crouch: 0.75 },
    recoil: { pitch: 0.065, yaw: 0.016, recover: 6, kick: 1.3 }, sound: 'lever', switchTime: 0.5 },
  buffalo: { id: 'buffalo', name: 'Buffalo rifle', slot: 'primary', caliber: 'high', twoHanded: true, dmg: 80, pellets: 1, range: 260, mag: 1,
    reload: { type: 'all', time: 2.3 }, cadence: { type: 'semi', time: 0.3 },
    adsFov: 36, adsTime: 0.42, adsSway: 0.0065, adsSpread: 0.02,
    hip: { still: 2.4, move: 7, air: 12, bloom: 4, recover: 3, crouch: 0.7 },
    recoil: { pitch: 0.14, yaw: 0.03, recover: 4, kick: 2.2 }, sound: 'buffalo', switchTime: 0.6 },
  // Sniper: Creedmoor rifle with a Malcolm scope. The scope magnifies every bit of sway.
  scoped: { id: 'scoped', name: 'Scoped rifle', slot: 'primary', caliber: 'high', twoHanded: true, scope: true, sniper: true, dmg: 92, pellets: 1, range: 320, mag: 4,
    reload: { type: 'single', start: 0.5, each: 0.6, end: 0.4 }, cadence: { type: 'lever', time: 1.15 },
    adsFov: 13, adsTime: 0.45, adsSway: 0.0042, adsSpread: 0.01,
    hip: { still: 3.4, move: 9, air: 14, bloom: 5, recover: 2.5, crouch: 0.7 },
    recoil: { pitch: 0.15, yaw: 0.03, recover: 4, kick: 2.2 }, sound: 'scoped', switchTime: 0.7 },
  // Beer Drinker's bottle: smash it (blunt, stagger), then cut with what is left (bleed). RMB throws, R drinks.
  beer: { id: 'beer', name: 'Beer bottle', slot: 'melee', melee: true, beer: true, dmg: 28, range: 1.75, swing: 0.45, hitAt: 0.16, switchTime: 0.25 },
  knife: { id: 'knife', name: 'Bowie knife', slot: 'melee', melee: true, dmg: 38, range: 1.7, swing: 0.42, hitAt: 0.14,
    woundMap: { leg: 'thigh' }, switchTime: 0.25 },   // knife to any leg zone = limp
  hatchet: { id: 'hatchet', name: 'Hatchet', slot: 'melee', melee: true, dmg: 50, range: 1.85, swing: 0.7, hitAt: 0.27,
    woundMap: { arm: 'gunHandChop' }, switchTime: 0.3 },  // hatchet to any arm zone = gun drops
};
// ---- crate-only weapons ----
// knock: shove (m/s) on a living target and on a ragdoll. throw: how much of that carries the whole body when it dies.
// weight: move speed while held. selfKnock: pushes the shooter back. auto: hold to fire. spin: seconds to spin up.
Object.assign(WEAPONS, {
  buntline: { id: 'buntline', name: 'Long-barrel revolver', slot: 'sidearm', focus: true, noADS: true, rarity: 'common', acc: { min: 0.14, max: 6.5, bloom: 0.34, focusBloom: 0.2 }, dmg: 44, pellets: 1, range: 110, mag: 6,
    reload: { type: 'single', start: 0.35, each: 0.55, end: 0.25 }, cadence: { type: 'cock', time: 0.5 }, adsFov: 60, adsTime: 0.22, adsSway: 0.004, adsSpread: 0.08,
    hip: { still: 0.8, move: 3.4, air: 9, bloom: 2.4, recover: 5.5, crouch: 0.75 }, recoil: { pitch: 0.06, yaw: 0.014, recover: 7, kick: 1.2 }, falloff: { start: 35, end: 80, min: 0.65 }, knock: 1.2, sound: 'revolver', switchTime: 0.3,
    model: { kind: 'revolver', barrel: 0.3, finish: 0x8a8f96, grip: 0x5a3a20 } },
  widowmaker: { id: 'widowmaker', name: '.50 Hand cannon', slot: 'sidearm', focus: true, noADS: true, caliber: 'high', impact: true, rarity: 'rare', acc: { min: 0.3, max: 9, bloom: 0.55, focusBloom: 0.35 }, dmg: 72, pellets: 1, range: 100, mag: 4,
    reload: { type: 'single', start: 0.45, each: 0.8, end: 0.35 }, cadence: { type: 'cock', time: 0.85 }, adsFov: 58, adsTime: 0.28, adsSway: 0.006, adsSpread: 0.1,
    hip: { still: 1.3, move: 4.8, air: 10, bloom: 4.5, recover: 4, crouch: 0.75 }, recoil: { pitch: 0.14, yaw: 0.04, recover: 4.5, kick: 2.4 }, falloff: { start: 25, end: 65, min: 0.6 }, knock: 4.5, throw: 1.6, sound: 'dragoon', switchTime: 0.4,
    model: { kind: 'revolver', barrel: 0.22, bore: 0.03, cylR: 0.032, chambers: 4, finish: 0x2a2624, grip: 0x7a1a14, ports: true } },
  schofield: { id: 'schofield', name: 'Break-top .45', slot: 'sidearm', focus: true, noADS: true, rarity: 'common', acc: { min: 0.25, max: 7, bloom: 0.3, focusBloom: 0.18 }, dmg: 38, pellets: 1, range: 90, mag: 6,
    reload: { type: 'all', time: 1.35 }, cadence: { type: 'cock', time: 0.36 }, adsFov: 62, adsTime: 0.2, adsSway: 0.0045, adsSpread: 0.12,
    hip: { still: 0.9, move: 3.5, air: 9, bloom: 2.4, recover: 5.5, crouch: 0.75 }, recoil: { pitch: 0.05, yaw: 0.014, recover: 7, kick: 1.1 }, falloff: { start: 25, end: 60, min: 0.6 }, knock: 1.1, sound: 'revolver', switchTime: 0.22,
    model: { kind: 'revolver', barrel: 0.17, finish: 0xc8ccd2, grip: 0x2a1a10 } },
  lemat: { id: 'lemat', name: 'Twin-barrel Nine', slot: 'sidearm', focus: true, noADS: true, rarity: 'common', acc: { min: 0.3, max: 7.5, bloom: 0.28, focusBloom: 0.18 }, dmg: 31, pellets: 1, range: 85, mag: 9,
    reload: { type: 'single', start: 0.4, each: 0.5, end: 0.3 }, cadence: { type: 'cock', time: 0.4 }, adsFov: 64, adsTime: 0.2, adsSway: 0.0045, adsSpread: 0.14,
    hip: { still: 1, move: 3.6, air: 9, bloom: 2.4, recover: 5.5, crouch: 0.75 }, recoil: { pitch: 0.05, yaw: 0.016, recover: 7, kick: 1 }, falloff: { start: 22, end: 55, min: 0.6 }, knock: 1, sound: 'revolver', switchTime: 0.28,
    model: { kind: 'revolver', barrel: 0.19, cylR: 0.03, chambers: 9, finish: 0x4a4540, grip: 0x6a4428, under: true } },
  snub: { id: 'snub', name: 'Bulldog snub', slot: 'sidearm', focus: true, noADS: true, rarity: 'common', acc: { min: 0.55, max: 6, bloom: 0.22, focusBloom: 0.16 }, dmg: 30, pellets: 1, range: 60, mag: 5,
    reload: { type: 'single', start: 0.3, each: 0.42, end: 0.2 }, cadence: { type: 'cock', time: 0.24 }, adsFov: 68, adsTime: 0.15, adsSway: 0.005, adsSpread: 0.3,
    hip: { still: 1, move: 3, air: 8, bloom: 2, recover: 7, crouch: 0.75 }, recoil: { pitch: 0.045, yaw: 0.02, recover: 9, kick: 0.9 }, falloff: { start: 8, end: 28, min: 0.5 }, knock: 0.8, sound: 'revolver', switchTime: 0.15,
    model: { kind: 'revolver', barrel: 0.06, finish: 0x3a3d42, grip: 0x1a1a1a } },
  sawedoff: { id: 'sawedoff', name: 'Sawed-off', slot: 'sidearm', noADS: true, caliberClose: 6, rarity: 'common', dmg: 11, pellets: 10, pelletSpread: 6.5, range: 30, mag: 2,
    reload: { type: 'all', time: 1.5 }, cadence: { type: 'semi', time: 0.22 }, adsFov: 70, adsTime: 0.2, adsSway: 0.006, adsSpread: 1,
    hip: { still: 2.4, move: 5, air: 9, bloom: 3, recover: 5, crouch: 0.85 }, recoil: { pitch: 0.16, yaw: 0.04, recover: 5, kick: 2.4 }, falloff: { start: 5, end: 18, min: 0.25 }, knock: 5, throw: 1.5, sound: 'shotgun', switchTime: 0.3,
    model: { kind: 'shotgun', barrel: 0.2, stock: 'grip', twin: true } },
  maresleg: { id: 'maresleg', name: "Mare's Leg", slot: 'primary', twoHanded: true, rarity: 'common', dmg: 40, pellets: 1, range: 120, mag: 6,
    reload: { type: 'single', start: 0.35, each: 0.45, end: 0.3 }, cadence: { type: 'lever', time: 0.45 }, adsFov: 60, adsTime: 0.22, adsSway: 0.0045, adsSpread: 0.12,
    hip: { still: 1.3, move: 4.2, air: 9, bloom: 2.4, recover: 5, crouch: 0.75 }, recoil: { pitch: 0.07, yaw: 0.02, recover: 6.5, kick: 1.3 }, falloff: { start: 20, end: 50, min: 0.6 }, knock: 1.4, sound: 'lever', switchTime: 0.35,
    model: { kind: 'lever', barrel: 0.3, stock: 'grip' } },
  buzzer: { id: 'buzzer', name: 'Tin Star Buzzer', slot: 'primary', twoHanded: true, auto: true, rarity: 'common', dmg: 17, pellets: 1, range: 70, mag: 32,
    reload: { type: 'all', time: 1.9 }, cadence: { type: 'auto', time: 0.075 }, adsFov: 62, adsTime: 0.2, adsSway: 0.004, adsSpread: 0.45,
    hip: { still: 1.8, move: 3.6, air: 8, bloom: 0.55, recover: 7, crouch: 0.8 }, recoil: { pitch: 0.022, yaw: 0.013, recover: 9, kick: 0.5 }, falloff: { start: 12, end: 35, min: 0.5 }, knock: 0.5, sound: 'smg', switchTime: 0.35,
    model: { kind: 'smg', barrel: 0.2, coil: 0x46f0ff } },
  drum: { id: 'drum', name: 'Chicago Drum', slot: 'primary', twoHanded: true, auto: true, rarity: 'rare', weight: 0.92, dmg: 20, pellets: 1, range: 80, mag: 50,
    reload: { type: 'all', time: 2.8 }, cadence: { type: 'auto', time: 0.09 }, adsFov: 60, adsTime: 0.25, adsSway: 0.0045, adsSpread: 0.55,
    hip: { still: 2.1, move: 4.2, air: 9, bloom: 0.6, recover: 6, crouch: 0.8 }, recoil: { pitch: 0.03, yaw: 0.017, recover: 8, kick: 0.7 }, falloff: { start: 15, end: 40, min: 0.5 }, knock: 0.7, sound: 'smg', switchTime: 0.45,
    model: { kind: 'smg', barrel: 0.28, drum: true, stock: true } },
  elephant: { id: 'elephant', name: 'Elephant Gun .577', slot: 'primary', twoHanded: true, caliber: 'high', impact: true, rarity: 'legendary', weight: 0.85, dmg: 110, pellets: 1, range: 220, mag: 2,
    reload: { type: 'all', time: 2.8 }, cadence: { type: 'semi', time: 0.3 }, adsFov: 45, adsTime: 0.4, adsSway: 0.006, adsSpread: 0.03,
    hip: { still: 3, move: 7, air: 12, bloom: 5, recover: 3, crouch: 0.7 }, recoil: { pitch: 0.22, yaw: 0.05, recover: 3.5, kick: 3 }, knock: 7.5, throw: 2.6, selfKnock: 2, sound: 'heavyGun', switchTime: 0.7,
    model: { kind: 'rifle', barrel: 0.7, twin: true, bore: 0.03 } },
  puntgun: { id: 'puntgun', name: 'Punt Gun', slot: 'primary', twoHanded: true, noADS: true, caliberClose: 12, rarity: 'legendary', weight: 0.72, dmg: 13, pellets: 18, pelletSpread: 5, range: 45, mag: 1,
    reload: { type: 'all', time: 3.4 }, cadence: { type: 'semi', time: 0.4 }, adsFov: 70, adsTime: 0.3, adsSway: 0.007, adsSpread: 1,
    hip: { still: 3.2, move: 7, air: 12, bloom: 5, recover: 2.5, crouch: 0.75 }, recoil: { pitch: 0.3, yaw: 0.06, recover: 3, kick: 3.5 }, falloff: { start: 8, end: 28, min: 0.3 }, knock: 9, throw: 3.2, selfKnock: 4.5, sound: 'heavyGun', switchTime: 0.9,
    model: { kind: 'shotgun', barrel: 1.0, stock: true, bore: 0.05 } },
  gatling: { id: 'gatling', name: 'Hand crank gun', slot: 'primary', twoHanded: true, noADS: true, auto: true, spin: 0.55, rarity: 'legendary', weight: 0.7, dmg: 15, pellets: 1, range: 80, mag: 80,
    reload: { type: 'all', time: 4 }, cadence: { type: 'auto', time: 0.06 }, adsFov: 70, adsTime: 0.3, adsSway: 0.006, adsSpread: 1.5,
    hip: { still: 2.6, move: 5, air: 10, bloom: 0.3, recover: 8, crouch: 0.8 }, recoil: { pitch: 0.018, yaw: 0.02, recover: 10, kick: 0.45 }, falloff: { start: 20, end: 50, min: 0.6 }, knock: 0.9, sound: 'smg', switchTime: 0.9,
    model: { kind: 'gatling' } },
  machete: { id: 'machete', name: 'Machete', slot: 'melee', melee: true, enchant: true, rarity: 'common', dmg: 44, range: 1.8, swing: 0.5, hitAt: 0.18, switchTime: 0.3, knock: 1.5, model: { kind: 'melee', head: 'machete' } },
  tomahawk: { id: 'tomahawk', name: 'Tomahawk', slot: 'melee', melee: true, enchant: true, rarity: 'common', dmg: 40, range: 1.75, swing: 0.42, hitAt: 0.15, switchTime: 0.25, knock: 1.5, model: { kind: 'melee', head: 'axe' } },
  sabre: { id: 'sabre', name: 'Cavalry sabre', slot: 'melee', melee: true, enchant: true, rarity: 'common', dmg: 38, range: 2.1, swing: 0.4, hitAt: 0.13, switchTime: 0.3, knock: 1.2, model: { kind: 'melee', head: 'sabre' } },
  sledge: { id: 'sledge', name: 'Sledgehammer', slot: 'melee', melee: true, enchant: true, rarity: 'rare', weight: 0.88, dmg: 62, range: 1.9, swing: 0.95, hitAt: 0.4, switchTime: 0.5, knock: 7, throw: 2, model: { kind: 'melee', head: 'hammer' } },
});
WEAPONS.dragoon.knock = 2.6; WEAPONS.dragoon.throw = 1.3; WEAPONS.buffalo.knock = 3.5; WEAPONS.buffalo.throw = 1.8; WEAPONS.scoped.knock = 2.5; WEAPONS.scoped.throw = 1.5;
WEAPONS.shotgun.knock = 3.2; WEAPONS.shotgun.throw = 1.4; WEAPONS.revolver.knock = 1; WEAPONS.lever.knock = 1.4; WEAPONS.dual.knock = 0.9; WEAPONS.hatchet.knock = 2; WEAPONS.knife.knock = 1;
WEAPONS.dragoon.rarity = WEAPONS.scoped.rarity = WEAPONS.buffalo.rarity = 'rare';
for (const k in WEAPONS) WEAPONS[k].rarity = WEAPONS[k].rarity || 'common';
const RARITY = { common: { name: 'Common', col: '#e8d8b0', hex: 0xffd27a }, rare: { name: 'Rare', col: '#7ac8ff', hex: 0x5ab8ff }, legendary: { name: 'Legendary', col: '#ff8af0', hex: 0xff5ae0 } };
// Crate melee weapons roll one of these. Named like "Galvanic machete".
const MELEE_FX = {
  serrated: { name: 'Serrated', col: 0xff5040, desc: 'every cut bleeds' },
  galvanic: { name: 'Galvanic', col: 0x60e8ff, desc: 'shocks and stuns' },
  burning: { name: 'Burning', col: 0xff9a30, desc: 'sets them on fire' },
  heavy: { name: 'Heavy', col: 0xc0c0c0, desc: 'knocks them off their feet' },
  thirsty: { name: 'Thirsty', col: 0xb0203a, desc: 'heals you on every hit' },
  rattler: { name: 'Rattler', col: 0x8adf40, desc: 'poisons, slows and blurs' },
};

// ---- base guns added for the loadout ----
Object.assign(WEAPONS, {
  navy: { id: 'navy', name: 'Navy revolver', slot: 'sidearm', focus: true, noADS: true, acc: { min: 0.22, max: 7, bloom: 0.26, focusBloom: 0.16 }, dmg: 30, pellets: 1, range: 90, mag: 6,
    reload: { type: 'single', start: 0.3, each: 0.45, end: 0.25 }, cadence: { type: 'cock', time: 0.3 }, adsFov: 62, adsTime: 0.2, adsSway: 0.0045, adsSpread: 0.12,
    hip: { still: 0.9, move: 3.4, air: 9, bloom: 2.2, recover: 6, crouch: 0.75 }, recoil: { pitch: 0.045, yaw: 0.014, recover: 7.5, kick: 0.95 }, falloff: { start: 22, end: 55, min: 0.6 }, knock: 0.9, sound: 'revolver', switchTime: 0.25,
    model: { kind: 'revolver', barrel: 0.2, finish: 0x9a8a6a, grip: 0x6a4428 } },
  volcanic: { id: 'volcanic', name: 'Lever pistol', slot: 'sidearm', focus: true, noADS: true, acc: { min: 0.3, max: 7, bloom: 0.24, focusBloom: 0.15 }, dmg: 26, pellets: 1, range: 80, mag: 10,
    reload: { type: 'single', start: 0.4, each: 0.32, end: 0.3 }, cadence: { type: 'lever', time: 0.3 }, adsFov: 64, adsTime: 0.2, adsSway: 0.0045, adsSpread: 0.14,
    hip: { still: 1, move: 3.5, air: 9, bloom: 2, recover: 6, crouch: 0.75 }, recoil: { pitch: 0.04, yaw: 0.014, recover: 8, kick: 0.85 }, falloff: { start: 15, end: 45, min: 0.55 }, knock: 0.8, sound: 'lever', switchTime: 0.25,
    model: { kind: 'lever', barrel: 0.16, stock: 'grip' } },
  derringer: { id: 'derringer', name: 'Pocket pistol', slot: 'sidearm', focus: true, noADS: true, acc: { min: 0.5, max: 7, bloom: 0.4, focusBloom: 0.3 }, dmg: 48, pellets: 1, range: 30, mag: 2,
    reload: { type: 'all', time: 1.1 }, cadence: { type: 'cock', time: 0.25 }, adsFov: 68, adsTime: 0.15, adsSway: 0.005, adsSpread: 0.4,
    hip: { still: 1, move: 3, air: 8, bloom: 2.6, recover: 7, crouch: 0.75 }, recoil: { pitch: 0.07, yaw: 0.02, recover: 8, kick: 1.2 }, falloff: { start: 4, end: 15, min: 0.35 }, knock: 1.4, sound: 'revolver', switchTime: 0.12,
    model: { kind: 'revolver', barrel: 0.05, chambers: 2, cylR: 0.016, finish: 0xc8a050, grip: 0x3a2014 } },
  henry: { id: 'henry', name: 'Brass-frame repeater', slot: 'primary', twoHanded: true, dmg: 34, pellets: 1, range: 140, mag: 15,
    reload: { type: 'single', start: 0.45, each: 0.32, end: 0.35 }, cadence: { type: 'lever', time: 0.38 }, adsFov: 58, adsTime: 0.25, adsSway: 0.004, adsSpread: 0.1,
    hip: { still: 1.4, move: 4.4, air: 9, bloom: 2.2, recover: 5.5, crouch: 0.75 }, recoil: { pitch: 0.06, yaw: 0.018, recover: 6.5, kick: 1.1 }, falloff: { start: 30, end: 70, min: 0.6 }, knock: 1.2, sound: 'lever', switchTime: 0.4,
    model: { kind: 'lever', barrel: 0.5, stock: true } },
  spencer: { id: 'spencer', name: 'Tube-fed carbine', slot: 'primary', twoHanded: true, caliber: 'high', dmg: 46, pellets: 1, range: 150, mag: 7,
    reload: { type: 'all', time: 2.2 }, cadence: { type: 'lever', time: 0.55 }, adsFov: 56, adsTime: 0.27, adsSway: 0.0042, adsSpread: 0.08,
    hip: { still: 1.4, move: 4.4, air: 9, bloom: 2.6, recover: 5, crouch: 0.75 }, recoil: { pitch: 0.08, yaw: 0.02, recover: 6, kick: 1.4 }, falloff: { start: 30, end: 80, min: 0.65 }, knock: 1.8, sound: 'buffalo', switchTime: 0.45,
    model: { kind: 'lever', barrel: 0.4, stock: true } },
  pump: { id: 'pump', name: 'Trench pump', slot: 'primary', twoHanded: true, caliberClose: 6, dmg: 11, pellets: 8, pelletSpread: 4.5, range: 40, mag: 5,
    reload: { type: 'single', start: 0.4, each: 0.45, end: 0.35 }, cadence: { type: 'lever', time: 0.6 }, adsFov: 62, adsTime: 0.25, adsSway: 0.005, adsSpread: 0.8,
    hip: { still: 2.2, move: 4.8, air: 9, bloom: 3, recover: 4.5, crouch: 0.85 }, recoil: { pitch: 0.13, yaw: 0.035, recover: 5, kick: 2.1 }, falloff: { start: 8, end: 26, min: 0.3 }, knock: 3, throw: 1.3, sound: 'shotgun', switchTime: 0.45,
    model: { kind: 'shotgun', barrel: 0.5, stock: true } },
});
for (const k in WEAPONS) WEAPONS[k].rarity = WEAPONS[k].rarity || 'common';

// guns get real material response: steel and brass catch highlights, wood stays satin
const STEEL = () => phong(0x3e4248, 80, { specular: 0x77808a }), DARKSTEEL = () => phong(0x23252a, 70, { specular: 0x5a6068 }), WOOD = () => phong(0x6e4424, 22, { specular: 0x2a1c10 }), BRASS = () => phong(0x9d7f3e, 90, { specular: 0xb08a40 });
// barrels, tubes and handles modelled as long thin boxes become rounded cylinders
function roundBarrels(g) {
  if (!GEO.cylZ) { GEO.cylZ = new THREE.CylinderGeometry(0.5, 0.5, 1, 12); GEO.cylZ.rotateX(Math.PI / 2); }
  g.traverse(m => { if (!m.isMesh || m.geometry !== GEO.box) return; const s = m.scale, thin = Math.max(s.x, s.y); if (s.z > thin * 4 && Math.abs(s.x - s.y) < thin * 0.35 && thin < 0.06) m.geometry = GEO.cylZ; });
  return g;
}

// Gun models: meters, barrel along -z, origin at the grip. sightY = height of the sight line.
function buildGunModel(id, simple) {
  const g = new THREE.Group(), parts = {}; let sightY = 0.05, muzzle = new V3(0, 0.03, -0.5);
  const b = (w, h, d, m, x, y, z, parent = g) => { const k = mbox(w, h, d, m, x, y, z, parent); k.castShadow = !simple; k.receiveShadow = !simple; return k; };
  const dt = (...a) => simple ? null : b(...a); // small detail parts, skipped on third-person and dropped guns
  if (id === 'revolver') {
    b(0.032, 0.05, 0.11, STEEL(), 0, 0.018, -0.015);
    parts.cyl = new THREE.Group(); parts.cyl.position.set(0, 0.022, -0.035); g.add(parts.cyl);
    const c = mcyl(0.023, 0.045, DARKSTEEL(), 0, 0, 0, parts.cyl); c.rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; dt(0.006, 0.006, 0.047, M(0x121314), Math.cos(a) * 0.014, Math.sin(a) * 0.014, 0, parts.cyl); }
    b(0.02, 0.02, 0.16, STEEL(), 0, 0.034, -0.14);
    dt(0.008, 0.008, 0.12, STEEL(), 0, 0.018, -0.12);
    dt(0.004, 0.012, 0.008, M(0x101010), 0, 0.05, -0.215);
    b(0.03, 0.008, 0.05, STEEL(), 0, 0.046, 0.0);
    dt(0.01, 0.008, 0.012, M(0x101010), 0.009, 0.052, 0.02); dt(0.01, 0.008, 0.012, M(0x101010), -0.009, 0.052, 0.02);
    parts.hammer = new THREE.Group(); parts.hammer.position.set(0, 0.035, 0.035); g.add(parts.hammer);
    b(0.01, 0.032, 0.012, DARKSTEEL(), 0, 0.016, 0, parts.hammer);
    const grip = b(0.028, 0.085, 0.036, WOOD(), 0, -0.035, 0.045); grip.rotation.x = 0.3;
    dt(0.006, 0.025, 0.03, STEEL(), 0, -0.012, 0.004);
    sightY = 0.056; muzzle = new V3(0, 0.034, -0.225);
  } else if (id === 'lever') {
    b(0.036, 0.065, 0.15, BRASS(), 0, 0.012, -0.02);
    b(0.022, 0.022, 0.6, STEEL(), 0, 0.03, -0.39); b(0.018, 0.018, 0.5, STEEL(), 0, 0.008, -0.34);
    b(0.04, 0.042, 0.24, WOOD(), 0, 0.012, -0.21);
    const st = b(0.036, 0.07, 0.3, WOOD(), 0, -0.022, 0.2); st.rotation.x = -0.14;
    parts.lever = new THREE.Group(); parts.lever.position.set(0, -0.02, 0.0); g.add(parts.lever);
    b(0.008, 0.012, 0.12, STEEL(), 0, -0.012, 0.03, parts.lever); b(0.008, 0.045, 0.012, STEEL(), 0, -0.035, 0.085, parts.lever);
    dt(0.004, 0.014, 0.008, M(0x101010), 0, 0.048, -0.68);
    dt(0.006, 0.012, 0.006, M(0x101010), 0.007, 0.049, -0.2); dt(0.006, 0.012, 0.006, M(0x101010), -0.007, 0.049, -0.2);
    sightY = 0.055; muzzle = new V3(0, 0.03, -0.69);
  } else if (id === 'shotgun') {
    b(0.022, 0.022, 0.5, STEEL(), 0.012, 0.03, -0.33); b(0.022, 0.022, 0.5, STEEL(), -0.012, 0.03, -0.33);
    dt(0.008, 0.006, 0.5, DARKSTEEL(), 0, 0.044, -0.33);
    b(0.045, 0.055, 0.1, STEEL(), 0, 0.018, -0.03);
    b(0.04, 0.03, 0.18, WOOD(), 0, 0.012, -0.17);
    const st = b(0.04, 0.075, 0.3, WOOD(), 0, -0.022, 0.18); st.rotation.x = -0.15;
    parts.hammer = new THREE.Group(); parts.hammer.position.set(0, 0.045, 0.0); g.add(parts.hammer);
    b(0.008, 0.02, 0.01, DARKSTEEL(), 0.014, 0.008, 0, parts.hammer); b(0.008, 0.02, 0.01, DARKSTEEL(), -0.014, 0.008, 0, parts.hammer);
    dt(0.007, 0.007, 0.007, M(0xd8d0b0), 0, 0.05, -0.575);
    sightY = 0.052; muzzle = new V3(0, 0.03, -0.58);
  } else if (id === 'buffalo') {
    b(0.028, 0.028, 0.76, DARKSTEEL(), 0, 0.032, -0.47);
    b(0.04, 0.07, 0.14, M(0x5d5048), 0, 0.012, -0.03);
    b(0.04, 0.04, 0.22, WOOD(), 0, 0.012, -0.2);
    const st = b(0.04, 0.08, 0.34, WOOD(), 0, -0.026, 0.21); st.rotation.x = -0.12;
    parts.lever = new THREE.Group(); parts.lever.position.set(0, -0.02, 0.0); g.add(parts.lever);
    b(0.008, 0.045, 0.012, STEEL(), 0, -0.03, 0.05, parts.lever);
    dt(0.006, 0.02, 0.006, M(0x101010), 0.007, 0.056, -0.1); dt(0.006, 0.02, 0.006, M(0x101010), -0.007, 0.056, -0.1);
    dt(0.004, 0.02, 0.008, M(0x101010), 0, 0.056, -0.84);
    sightY = 0.066; muzzle = new V3(0, 0.032, -0.85);
  } else if (id === 'dragoon') {
    // bigger frame, long octagonal barrel, dark case-hardened steel
    b(0.038, 0.06, 0.13, M(0x3b3530), 0, 0.02, -0.02);
    parts.cyl = new THREE.Group(); parts.cyl.position.set(0, 0.024, -0.04); g.add(parts.cyl);
    const c = mcyl(0.027, 0.055, DARKSTEEL(), 0, 0, 0, parts.cyl); c.rotation.x = Math.PI / 2;
    if (!simple) for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; b(0.007, 0.007, 0.057, M(0x121314), Math.cos(a) * 0.016, Math.sin(a) * 0.016, 0, parts.cyl); }
    b(0.024, 0.024, 0.24, DARKSTEEL(), 0, 0.037, -0.2);
    b(0.012, 0.012, 0.16, STEEL(), 0, 0.017, -0.16);
    dt(0.005, 0.014, 0.01, M(0x101010), 0, 0.055, -0.315);
    b(0.034, 0.009, 0.06, M(0x3b3530), 0, 0.053, 0.0);
    dt(0.011, 0.008, 0.012, M(0x101010), 0.01, 0.058, 0.024); dt(0.011, 0.008, 0.012, M(0x101010), -0.01, 0.058, 0.024);
    parts.hammer = new THREE.Group(); parts.hammer.position.set(0, 0.04, 0.04); g.add(parts.hammer);
    b(0.012, 0.036, 0.014, DARKSTEEL(), 0, 0.018, 0, parts.hammer);
    const grip = b(0.032, 0.1, 0.04, M(0x4a2c16), 0, -0.04, 0.05); grip.rotation.x = 0.28;
    sightY = 0.062; muzzle = new V3(0, 0.037, -0.32);
  } else if (id === 'scoped') {
    b(0.022, 0.022, 0.7, DARKSTEEL(), 0, 0.03, -0.43);
    b(0.04, 0.06, 0.16, M(0x3b3530), 0, 0.012, -0.03);
    b(0.04, 0.04, 0.26, WOOD(), 0, 0.01, -0.22);
    const st = b(0.04, 0.08, 0.34, WOOD(), 0, -0.026, 0.21); st.rotation.x = -0.12;
    parts.lever = new THREE.Group(); parts.lever.position.set(0.02, 0.03, 0.02); g.add(parts.lever);
    b(0.04, 0.008, 0.008, STEEL(), 0.02, 0, 0, parts.lever); b(0.012, 0.012, 0.012, STEEL(), 0.042, 0, 0, parts.lever);
    // Malcolm scope: long thin tube with mounts
    const tube = mcyl(0.012, 0.52, M(0x1a1a1c), 0, 0.075, -0.22, g); tube.rotation.x = Math.PI / 2; tube.castShadow = !simple;
    const eye = mcyl(0.017, 0.06, M(0x1a1a1c), 0, 0.075, 0.03, g); eye.rotation.x = Math.PI / 2;
    const obj = mcyl(0.019, 0.06, M(0x1a1a1c), 0, 0.075, -0.47, g); obj.rotation.x = Math.PI / 2;
    b(0.01, 0.03, 0.012, STEEL(), 0, 0.055, -0.08); b(0.01, 0.03, 0.012, STEEL(), 0, 0.055, -0.4);
    sightY = 0.075; muzzle = new V3(0, 0.03, -0.79);
  } else if (id === 'beer' || id === 'beerBroken') {
    // held by the neck, body pointing forward
    const glass = glassMat(0x3f5f22);
    const neck = mcyl(0.013, 0.1, glass, 0, 0, -0.02, g); neck.rotation.x = Math.PI / 2;
    if (id === 'beer') {
      const body = mcyl(0.033, 0.17, glass, 0, 0, -0.155, g); body.rotation.x = Math.PI / 2;
      b(0.068, 0.05, 0.07, M(0xe8d8b0), 0, 0, -0.16);
      muzzle = new V3(0, 0, -0.24);
    } else {
      const stub = mcyl(0.033, 0.035, glass, 0, 0, -0.085, g); stub.rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const s = b(0.012, 0.006, 0.05 + (i % 2) * 0.035, glass, Math.cos(a) * 0.024, Math.sin(a) * 0.024, -0.12 - (i % 2) * 0.015); s.rotation.set(Math.sin(a) * 0.25, -Math.cos(a) * 0.25, 0); }
      muzzle = new V3(0, 0, -0.16);
    }
  } else if (id === 'knife') {
    b(0.026, 0.032, 0.11, WOOD(), 0, 0, 0.02); b(0.05, 0.012, 0.012, BRASS(), 0, 0, -0.04);
    b(0.006, 0.036, 0.22, M(0xc9ccd2), 0, 0.004, -0.155); b(0.006, 0.018, 0.04, M(0xc9ccd2), 0, 0.012, -0.275);
    muzzle = new V3(0, 0, -0.28);
  } else if (WEAPONS[id] && WEAPONS[id].model) return buildSpecGun(id, WEAPONS[id].model, simple);
  else if (id === 'hatchet') {
    b(0.026, 0.032, 0.42, WOOD(), 0, 0, -0.1);
    b(0.016, 0.1, 0.07, DARKSTEEL(), 0, 0.035, -0.28); b(0.006, 0.12, 0.02, M(0xc9ccd2), 0, 0.04, -0.325);
    muzzle = new V3(0, 0.04, -0.33);
  }
  roundBarrels(g);
  return { group: g, sightY, muzzle, parts, id };
}

// Crate weapons are built from a small spec so there can be many of them.
function buildSpecGun(id, S, simple) {
  const g = new THREE.Group(), parts = {}; let sightY = 0.05, muzzle = new V3(0, 0.03, -0.5);
  const b = (w, h, d, m, x, y, z, parent = g) => { const k = mbox(w, h, d, m, x, y, z, parent); k.castShadow = !simple; return k; };
  const dt = (...a) => simple ? null : b(...a);
  const cyl = (r, len, m, x, y, z, parent = g) => { const c = mcyl(r, len, m, x, y, z, parent); c.rotation.x = Math.PI / 2; c.castShadow = !simple; return c; };
  if (S.kind === 'revolver') {
    const fin = M(S.finish || 0x6a6e74), bl = S.barrel, bore = S.bore || 0.02, cr = S.cylR || 0.024, n = S.chambers || 6;
    b(0.034, 0.055, 0.12, fin, 0, 0.018, -0.015);
    parts.cyl = new THREE.Group(); parts.cyl.position.set(0, 0.023, -0.035); g.add(parts.cyl);
    cyl(cr, 0.05, DARKSTEEL(), 0, 0, 0, parts.cyl);
    if (!simple) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; b(0.006, 0.006, 0.052, M(0x121314), Math.cos(a) * cr * 0.6, Math.sin(a) * cr * 0.6, 0, parts.cyl); }
    b(bore, bore, bl, fin, 0, 0.036, -0.06 - bl / 2);
    if (S.ports) for (let i = 0; i < 3; i++) dt(bore + 0.004, 0.006, 0.012, M(0x101010), 0, 0.036 + bore / 2, -0.08 - bl + 0.03 + i * 0.02);
    if (S.under) cyl(0.012, bl * 0.7, DARKSTEEL(), 0, 0.012, -0.06 - bl * 0.35);
    dt(0.004, 0.012, 0.008, M(0x101010), 0, 0.05 + bore / 2 - 0.01, -0.06 - bl + 0.01);
    b(0.032, 0.008, 0.05, fin, 0, 0.048, 0.0);
    parts.hammer = new THREE.Group(); parts.hammer.position.set(0, 0.037, 0.035); g.add(parts.hammer); b(0.01, 0.032, 0.012, DARKSTEEL(), 0, 0.016, 0, parts.hammer);
    const grip = b(0.029, 0.088, 0.038, M(S.grip || 0x5a3a20), 0, -0.036, 0.047); grip.rotation.x = 0.3;
    sightY = 0.056; muzzle = new V3(0, 0.036, -0.07 - bl);
  } else if (S.kind === 'shotgun') {
    const bl = S.barrel, bore = S.bore || 0.022;
    if (S.twin) { b(bore, bore, bl, STEEL(), 0.012, 0.03, -0.1 - bl / 2); b(bore, bore, bl, STEEL(), -0.012, 0.03, -0.1 - bl / 2); }
    else { cyl(bore, bl, DARKSTEEL(), 0, 0.03, -0.1 - bl / 2); dt(bore * 1.6, 0.012, 0.03, BRASS(), 0, 0.03, -0.12 - bl + 0.03); }
    b(0.045, 0.055, 0.1, STEEL(), 0, 0.018, -0.03);
    if (S.stock === 'grip') { const gp = b(0.034, 0.1, 0.04, WOOD(), 0, -0.04, 0.05); gp.rotation.x = 0.35; }
    else { b(0.04, 0.03, Math.min(0.3, bl * 0.4), WOOD(), 0, 0.012, -0.16); const st = b(0.045, 0.08, 0.34, WOOD(), 0, -0.024, 0.2); st.rotation.x = -0.14; }
    parts.hammer = new THREE.Group(); parts.hammer.position.set(0, 0.045, 0.0); g.add(parts.hammer); b(0.008, 0.02, 0.01, DARKSTEEL(), 0, 0.008, 0, parts.hammer);
    sightY = 0.052; muzzle = new V3(0, 0.03, -0.12 - bl);
  } else if (S.kind === 'lever') {
    const bl = S.barrel;
    b(0.036, 0.065, 0.15, BRASS(), 0, 0.012, -0.02); b(0.022, 0.022, bl, STEEL(), 0, 0.03, -0.09 - bl / 2); b(0.04, 0.042, bl * 0.6, WOOD(), 0, 0.012, -0.08 - bl * 0.3);
    if (S.stock === true) { const st = b(0.045, 0.08, 0.32, WOOD(), 0, -0.022, 0.2); st.rotation.x = -0.14; } else { const gp = b(0.034, 0.09, 0.045, WOOD(), 0, -0.035, 0.06); gp.rotation.x = 0.4; }
    parts.lever = new THREE.Group(); parts.lever.position.set(0, -0.02, 0.0); g.add(parts.lever);
    b(0.008, 0.012, 0.12, STEEL(), 0, -0.012, 0.03, parts.lever); b(0.008, 0.045, 0.012, STEEL(), 0, -0.035, 0.085, parts.lever);
    sightY = 0.055; muzzle = new V3(0, 0.03, -0.1 - bl);
  } else if (S.kind === 'smg') {
    const bl = S.barrel;
    b(0.042, 0.07, 0.24, M(0x2e3036), 0, 0.012, -0.08); cyl(0.013, bl, DARKSTEEL(), 0, 0.03, -0.2 - bl / 2);
    if (S.drum) { const d = mcyl(0.07, 0.045, M(0x24262a), 0, -0.06, -0.12, g); d.rotation.z = Math.PI / 2; d.castShadow = !simple; }
    else b(0.024, 0.13, 0.04, M(0x24262a), 0, -0.07, -0.1);
    const gp = b(0.03, 0.09, 0.04, WOOD(), 0, -0.05, 0.03); gp.rotation.x = 0.3;
    if (S.stock) { const st = b(0.036, 0.06, 0.26, WOOD(), 0, -0.01, 0.17); st.rotation.x = -0.1; } else b(0.012, 0.05, 0.18, STEEL(), 0, 0.0, 0.14);
    if (S.coil) { for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 5, 12), new THREE.MeshBasicMaterial({ color: S.coil })); r.position.set(0, 0.03, -0.24 - i * 0.035); g.add(r); } }
    sightY = 0.062; muzzle = new V3(0, 0.03, -0.2 - bl);
  } else if (S.kind === 'rifle') {
    const bl = S.barrel, bore = S.bore || 0.026;
    if (S.twin) { b(bore, bore, bl, DARKSTEEL(), 0.015, 0.032, -0.1 - bl / 2); b(bore, bore, bl, DARKSTEEL(), -0.015, 0.032, -0.1 - bl / 2); } else b(bore, bore, bl, DARKSTEEL(), 0, 0.032, -0.1 - bl / 2);
    b(0.06, 0.07, 0.16, M(0x5d5048), 0, 0.012, -0.03); b(0.05, 0.045, 0.28, WOOD(), 0, 0.01, -0.22);
    const st = b(0.05, 0.09, 0.36, WOOD(), 0, -0.028, 0.22); st.rotation.x = -0.12;
    dt(0.03, 0.01, 0.1, BRASS(), 0, 0.05, -0.02);
    parts.hammer = new THREE.Group(); parts.hammer.position.set(0, 0.05, 0.02); g.add(parts.hammer); b(0.01, 0.024, 0.012, DARKSTEEL(), 0.02, 0.01, 0, parts.hammer); b(0.01, 0.024, 0.012, DARKSTEEL(), -0.02, 0.01, 0, parts.hammer);
    sightY = 0.07; muzzle = new V3(0, 0.032, -0.12 - bl);
  } else if (S.kind === 'gatling') {
    parts.spin = new THREE.Group(); parts.spin.position.set(0, 0.02, -0.35); g.add(parts.spin);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; cyl(0.009, 0.5, DARKSTEEL(), Math.cos(a) * 0.028, Math.sin(a) * 0.028, 0, parts.spin); }
    cyl(0.045, 0.03, BRASS(), 0, 0, 0.2, parts.spin); cyl(0.045, 0.02, BRASS(), 0, 0, -0.22, parts.spin);
    b(0.09, 0.1, 0.22, M(0x3b3530), 0, 0.02, 0.0); b(0.05, 0.14, 0.12, BRASS(), 0.06, 0.03, -0.02);
    const gp = b(0.03, 0.1, 0.04, WOOD(), 0, -0.07, 0.08); gp.rotation.x = 0.3; b(0.02, 0.02, 0.18, STEEL(), 0, 0.1, -0.05);
    sightY = 0.1; muzzle = new V3(0, 0.02, -0.62);
  } else if (S.kind === 'melee') {
    const h = S.head;
    const handle = h === 'hammer' ? 0.62 : h === 'sabre' ? 0.14 : h === 'axe' ? 0.42 : 0.14;
    b(0.028, 0.032, handle, WOOD(), 0, 0, 0.04 - handle / 2);
    let edge;
    if (h === 'machete') { b(0.006, 0.05, 0.42, M(0xb8bcc2), 0, 0.01, -0.3); edge = b(0.004, 0.012, 0.4, M(0xd8dce2), 0, -0.018, -0.3); b(0.04, 0.012, 0.014, BRASS(), 0, 0, -0.07); }
    else if (h === 'sabre') { const bl = b(0.005, 0.03, 0.7, M(0xc9ccd2), 0, 0.02, -0.45); bl.rotation.x = -0.08; edge = b(0.003, 0.008, 0.66, M(0xe0e4ea), 0, 0.005, -0.45); edge.rotation.x = -0.08; b(0.06, 0.05, 0.012, BRASS(), 0, 0.01, -0.08); }
    else if (h === 'axe') { b(0.016, 0.09, 0.06, DARKSTEEL(), 0, 0.035, -0.4); edge = b(0.006, 0.11, 0.018, M(0xd0d4da), 0, 0.04, -0.44); for (let i = 0; i < 3; i++) dt(0.03, 0.006, 0.01, M(0x9a3a20), 0, -0.01, -0.3 + i * 0.03); }
    else { b(0.09, 0.08, 0.13, DARKSTEEL(), 0, 0.01, -0.62); edge = b(0.095, 0.085, 0.01, M(0x9aa0a8), 0, 0.01, -0.69); }
    parts.edge = edge;
    muzzle = new V3(0, 0.02, h === 'sabre' ? -0.8 : -0.5);
  }
  roundBarrels(g);
  return { group: g, sightY, muzzle, parts, id };
}
function tintEdge(model, w) { if (w && w.fx && model && model.parts.edge) model.parts.edge.material = new THREE.MeshBasicMaterial({ color: MELEE_FX[w.fx].col }); }

// ---------------- first-person hands ----------------
// Gripping hand. Local frame: the grip runs along y, the muzzle is toward -z, the back of the hand faces +x.
function vmHandGrip(skin, glove) {
  const g = new THREE.Group();
  mbox(0.026, 0.078, 0.064, glove, 0.03, -0.004, 0.006, g);                       // back of the hand, gloved
  mbox(0.012, 0.07, 0.05, skin, 0.016, -0.006, 0.01, g);                          // palm edge
  for (let i = 0; i < 3; i++) { const y = -0.014 - i * 0.021;                    // middle, ring and little finger wrap round the grip
    mbox(0.05, 0.018, 0.019, skin, 0.004, y, -0.036, g); mbox(0.017, 0.017, 0.027, skin, -0.025, y, -0.02, g);
    mbox(0.008, 0.019, 0.02, glove, 0.03, y, -0.034, g); }                        // glove knuckles
  const ix = mbox(0.016, 0.016, 0.036, skin, 0.014, 0.016, -0.05, g); ix.rotation.x = -0.15; // index finger on the trigger
  const th = mbox(0.018, 0.018, 0.056, skin, -0.022, 0.026, -0.008, g); th.rotation.y = 0.25; // thumb over the top
  mbox(0.056, 0.05, 0.05, skin, 0.012, -0.032, 0.056, g);                         // wrist
  mbox(0.068, 0.062, 0.05, glove, 0.012, -0.034, 0.086, g);                       // leather cuff
  return g;
}
// Support hand cupping a barrel or forend from below, fingers up the left side, thumb along the right.
function vmHandFore(skin, glove) {
  const g = new THREE.Group();
  mbox(0.062, 0.024, 0.08, glove, 0, -0.032, 0, g);
  for (let i = 0; i < 4; i++) { const z = -0.032 + i * 0.021; mbox(0.017, 0.042, 0.018, skin, -0.034, -0.01, z, g); mbox(0.016, 0.016, 0.018, skin, -0.024, 0.016, z, g); }
  const th = mbox(0.018, 0.018, 0.056, skin, 0.034, -0.008, -0.008, g); th.rotation.x = 0.1;
  mbox(0.05, 0.05, 0.05, skin, 0.008, -0.052, 0.05, g); mbox(0.062, 0.06, 0.05, glove, 0.008, -0.056, 0.084, g);
  return g;
}
// Closed fist (punching, holding a blade or a bottle): knuckles forward.
function vmFist(skin, glove) {
  const g = new THREE.Group();
  mbox(0.06, 0.05, 0.045, glove, 0, 0, 0.012, g);
  for (let i = 0; i < 4; i++) { const x = -0.022 + i * 0.015; mbox(0.014, 0.02, 0.022, skin, x, 0.008, -0.018, g); mbox(0.014, 0.018, 0.018, skin, x, -0.012, -0.02, g); }
  const th = mbox(0.018, 0.016, 0.04, skin, -0.032, -0.006, -0.008, g); th.rotation.y = -0.4;
  mbox(0.05, 0.048, 0.05, skin, 0, -0.004, 0.05, g); mbox(0.062, 0.058, 0.05, glove, 0, -0.004, 0.08, g);
  return g;
}
// Coat sleeve with the shirt cuff showing at the wrist. Starts at the wrist and runs back toward the elbow (+z).
function vmSleeve(coat, cuff, len = 0.36) {
  const g = new THREE.Group(); mbox(0.082, 0.082, len, coat, 0, 0, len / 2 + 0.02, g); mbox(0.072, 0.072, 0.03, cuff, 0, 0, 0.012, g);
  mbox(0.086, 0.03, 0.05, coat, 0, 0.03, len * 0.7, g); // a fold in the cloth
  return g;
}
ENG.NP = { WEAPONS, buildGunModel, vmHandGrip, vmHandFore, vmFist, vmSleeve };
})();
