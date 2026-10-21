/* ROGUELITE RUNS: floors that build themselves fresh every run, arena rooms that lock until cleared, credits, perks,
   loot chests, shops, shrines, exit portals, bosses, and slow glowing enemy bolts you can dodge (or punch back in VR).
   It is all driven by World settings (run...) and placeable objects, so a run is designed with the normal editor tools.
   Works on desktop and in VR. Loaded after vr.js. */
(function () {
'use strict';
const ENG = window.ENG, G = ENG.Game.prototype, PF = ENG.PREFABS, D2R = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, rand = (a, b) => a + Math.random() * (b - a);
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _r = new THREE.Raycaster();
function prefab(type, cfg) { cfg.type = type; PF[type] = cfg; }
const eo = m => { m.userData.editorOnly = true; m.castShadow = false; return m; };
const glowMat = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k == null ? 1.4 : k), toneMapped: false, fog: false });
function labelTex(text, color, w, h) {
  const cv = document.createElement('canvas'); cv.width = w || 512; cv.height = h || 128; const c = cv.getContext('2d');
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 ' + Math.round(cv.height * .56) + 'px "Chakra Petch", sans-serif'; c.shadowColor = color; c.shadowBlur = cv.height * .18; c.fillStyle = color; c.fillText(String(text || ''), cv.width / 2, cv.height / 2 + 2, cv.width - 20);
  c.shadowBlur = 0; c.fillStyle = '#ffffff'; c.globalAlpha = .55; c.fillText(String(text || ''), cv.width / 2, cv.height / 2 + 2, cv.width - 20);
  const t = new THREE.CanvasTexture(cv); t.minFilter = THREE.LinearFilter; return t;
}

/* ---------------- data: perks, enemy roster, themes (all overridable per project) ---------------- */
ENG.RG_RARITY = { common: { label: 'Common', color: '#7fd6ff', w: 60, rank: 0 }, rare: { label: 'Rare', color: '#b48cff', w: 30, rank: 1 }, legendary: { label: 'Legendary', color: '#ffc54d', w: 10, rank: 2 } };
ENG.RG_STATS = { dmg: 'Damage %', rate: 'Fire rate %', speed: 'Move speed %', reload: 'Reload speed %', maxhp: 'Max health', crit: 'Critical hit chance %', regen: 'Health per second', lifesteal: 'Health per kill', credits: 'Credits earned %', boltslow: 'Slower enemy bolts %', melee: 'Punch and throw damage %', armor: 'Armor now' };
ENG.RG_PERKS = [
  { id: 'hollow', name: 'Hollow Points', text: '+15% damage', stat: 'dmg', amount: 15, rarity: 'common' },
  { id: 'overclock', name: 'Overclock Coil', text: '+15% fire rate', stat: 'rate', amount: 15, rarity: 'common' },
  { id: 'servo', name: 'Servo Boots', text: '+10% move speed', stat: 'speed', amount: 10, rarity: 'common' },
  { id: 'plating', name: 'Kinetic Plating', text: '+25 max health', stat: 'maxhp', amount: 25, rarity: 'common' },
  { id: 'lens', name: 'Optic Lens', text: '+10% chance of double damage', stat: 'crit', amount: 10, rarity: 'common' },
  { id: 'quick', name: 'Quick Hands', text: '+30% reload speed', stat: 'reload', amount: 30, rarity: 'common' },
  { id: 'bounty', name: 'Bounty Chip', text: '+25% credits', stat: 'credits', amount: 25, rarity: 'common' },
  { id: 'weave', name: 'Aegis Weave', text: '+50 armor right now', stat: 'armor', amount: 50, rarity: 'common' },
  { id: 'nanite', name: 'Nanite Regen', text: 'Heal 1.5 health every second', stat: 'regen', amount: 1.5, rarity: 'rare' },
  { id: 'leech', name: 'Leech Core', text: 'Heal 8 health on every kill', stat: 'lifesteal', amount: 8, rarity: 'rare' },
  { id: 'chrono', name: 'Chrono Field', text: 'Enemy bolts fly 20% slower', stat: 'boltslow', amount: 20, rarity: 'rare' },
  { id: 'knuckle', name: 'Heavy Knuckles', text: '+60% punch and throw damage', stat: 'melee', amount: 60, rarity: 'rare' },
  { id: 'havoc', name: 'Havoc Engine', text: '+40% damage', stat: 'dmg', amount: 40, rarity: 'legendary' },
  { id: 'storm', name: 'Storm Trigger', text: '+40% fire rate', stat: 'rate', amount: 40, rarity: 'legendary' },
  { id: 'titan', name: 'Titan Frame', text: '+75 max health', stat: 'maxhp', amount: 75, rarity: 'legendary' }
];
ENG.RG_ROSTER = [
  { id: 'husk', name: 'Husk', attack: 'melee', health: 45, speed: 4.6, damage: 10, fireRate: 1.3, height: 1.75, glow: '#ff8a3d', credits: 15, from: 1, weight: 4 },
  { id: 'trooper', name: 'Trooper', attack: 'ranged', health: 60, speed: 2.8, damage: 8, fireRate: .7, accuracy: .65, sight: 32, glow: '#2fe0d0', shot: 'single', credits: 20, from: 1, weight: 4 },
  { id: 'breacher', name: 'Breacher', attack: 'ranged', health: 95, speed: 3.1, damage: 6, fireRate: .5, accuracy: .55, sight: 24, glow: '#ffd13a', shot: 'spread', credits: 30, from: 1, weight: 2 },
  { id: 'lancer', name: 'Lancer', attack: 'ranged', health: 45, speed: 2.4, damage: 22, fireRate: .3, accuracy: .85, sight: 48, glow: '#4aa8ff', shot: 'snipe', credits: 35, from: 2, weight: 2 },
  { id: 'arc', name: 'Arc Gunner', attack: 'ranged', health: 80, speed: 2.9, damage: 7, fireRate: .45, accuracy: .6, sight: 30, glow: '#a66bff', shot: 'burst', credits: 35, from: 2, weight: 2 },
  { id: 'juggernaut', name: 'Juggernaut', attack: 'melee', health: 420, speed: 2.4, damage: 26, fireRate: .8, height: 2.5, glow: '#ff4fb8', credits: 120, elite: true, from: 2, weight: 0 },
  { id: 'warden', name: 'Rift Warden', attack: 'ranged', health: 2600, speed: 2.2, damage: 12, fireRate: .8, accuracy: .7, sight: 60, height: 3.6, glow: '#b06bff', shot: 'spread', credits: 800, boss: true, from: 99, weight: 0 }
];
ENG.RG_THEMES = {
  neon: { label: 'Neon city', floorTex: 'tiles', floorColor: '#1b2036', wallTex: 'metal', wallColor: '#262c46', door: '#2a3150', strips: ['#18e8ff', '#ff3ea5', '#9b5cff', '#ffb02e'], light: '#7fd8ff', boss: '#b06bff', pillar: '#2b3150', cover: '#30384f',
    floors: ['THE SPRAWL', 'NEON UNDERGROUND', 'THE RIFT CORE', 'DEEP STATIC', 'NULL SECTOR'], names: ['SKYLINE PLAZA', 'BREACH HALL', 'RIFT ATRIUM', 'KILL LANE', 'DATA VAULT', 'NEON MARKET', 'SERVER FARM', 'HOLO GARDEN', 'POWER CORE', 'SIGNAL YARD', 'CHROME DOCK', 'GLASS ARCADE'] },
  crypt: { label: 'Stone crypt', floorTex: 'rock', floorColor: '#4a4540', wallTex: 'brick', wallColor: '#5a5048', door: '#3a2c22', strips: ['#ff9a3a', '#ffcf6b', '#ff5a2a'], light: '#ffb070', boss: '#ff4a2a', pillar: '#4a423a', cover: '#5a5048',
    floors: ['THE OSSUARY', 'SUNKEN HALLS', 'THE PIT'], names: ['BONE HALL', 'CANDLE ROOM', 'OLD CHAPEL', 'THE WELL', 'TOMB ROW', 'ASH CELLAR', 'IRON GATE', 'GREAT STAIR'] },
  lab: { label: 'White lab', floorTex: 'tiles', floorColor: '#c9d1d9', wallTex: 'concrete', wallColor: '#dfe5ea', door: '#9aa6b2', strips: ['#3fb6ff', '#34d67e', '#ff4058'], light: '#e8f4ff', boss: '#ff4058', pillar: '#b8c2cc', cover: '#a8b4c0',
    floors: ['INTAKE', 'CONTAINMENT', 'THE CORE LAB'], names: ['CLEAN ROOM', 'TEST BAY', 'COLD STORAGE', 'OBSERVATION', 'REACTOR', 'ISOLATION', 'SAMPLE VAULT', 'ATRIUM'] }
};
Object.assign(ENG.DEFAULT_SETTINGS, { runOn: false, runFloors: 3, runRooms: 7, runEnemies: 1, runScale: 30, runBoss: true, runBossHp: 2600, runCredits: 100, runBolts: false, runBoltSpeed: 9, runTheme: 'neon', runShop: true, runSeed: 0, runPerks: null, runRoster: null });
const perksOf = S => (S.runPerks && S.runPerks.length ? S.runPerks : ENG.RG_PERKS);
const rosterOf = S => (S.runRoster && S.runRoster.length ? S.runRoster : ENG.RG_ROSTER);

/* ---------------- prefabs ---------------- */
prefab('neon', { label: 'Neon strip', cat: 'Roguelite', size: [3, .07, .07], props: { color: { t: 'color', d: '#18e8ff', l: 'Color' }, glow: { t: 'num', d: 1.5, min: .2, max: 4, step: .1, l: 'Glow' }, shape: { t: 'sel', d: 'bar', o: ['bar', 'ring', 'frame'], l: 'Shape' }, pulse: { t: 'num', d: 0, min: 0, max: 6, step: .1, l: 'Pulse speed (0 is steady)' }, light: { t: 'bool', d: false, l: 'Casts light (costly)' }, range: { t: 'num', d: 7, min: 1, max: 40, step: .5, l: 'Light range' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const [sx, sy, sz] = o.s, p = o.props, g = new THREE.Group(), m = glowMat(p.color, p.glow); g.userData.glowMat = m;
  if (p.shape === 'ring') { const t = new THREE.Mesh(new THREE.TorusGeometry(Math.max(.05, sx / 2), Math.max(.005, sy / 2), 6, 40), m); t.rotation.x = Math.PI / 2; t.position.y = sy / 2; g.add(t); }
  else if (p.shape === 'frame') { [[0, sz / 2, sx, sy], [0, -sz / 2, sx, sy]].forEach(([x, z, w]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w + sy, sy, sy), m); b.position.set(x, sy / 2, z); g.add(b); }); [[sx / 2], [-sx / 2]].forEach(([x]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sy, sy, sz), m); b.position.set(x, sy / 2, 0); g.add(b); }); }
  else { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.y = sy / 2; g.add(b); }
  if (p.light && !c.editor) { const L = new THREE.PointLight(p.color, 1.3, p.range, 2); L.position.y = sy / 2; g.add(L); }
  return g;
} });
prefab('portal', { label: 'Exit portal', cat: 'Roguelite', size: [2.6, 3.2, .4], props: { action: { t: 'sel', d: 'next floor', o: ['next floor', 'win the run', 'teleport'], l: 'Takes you to' }, target: { t: 'text', d: '', l: 'Teleport to (tag or name)' }, label: { t: 'text', d: 'EXIT', l: 'Label' }, color: { t: 'color', d: '#7dffb0', l: 'Color' }, startOn: { t: 'bool', d: true, l: 'Open at start (or opened by its tag)' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const [sx, sy] = o.s, p = o.props, g = new THREE.Group(), R = Math.min(sx, sy) / 2 * .92;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, .08, 10, 64), glowMat(p.color, 1.6)); ring.position.y = sy / 2; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(R * .82, .025, 6, 48), glowMat(p.color, 1.1)); ring2.position.y = sy / 2; g.add(ring2);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R * .97, 48), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); disc.position.y = sy / 2; g.add(disc);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R * .7, R * .8, .12, 32), new THREE.MeshStandardMaterial({ color: '#1a1f2c', metalness: .7, roughness: .35 })); base.position.y = .06; g.add(base);
  if (p.label) { const lab = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .6), new THREE.MeshBasicMaterial({ map: labelTex(p.label, p.color), transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false })); lab.position.y = sy + .45; g.add(lab); }
  g.userData.ring = ring; g.userData.ring2 = ring2; g.userData.disc = disc; return g;
} });
prefab('chest', { label: 'Loot chest', cat: 'Roguelite', size: [1.2, .8, .8], props: { tier: { t: 'sel', d: 'rare', o: ['common', 'rare', 'legendary'], l: 'Tier' }, contents: { t: 'sel', d: 'random', o: ['random', 'credits', 'weapon', 'perk', 'health'], l: 'Holds' }, credits: { t: 'num', d: 0, min: 0, max: 5000, step: 10, l: 'Credits inside (0 is by tier)' }, cost: { t: 'num', d: 0, min: 0, max: 5000, step: 10, l: 'Credits to open' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const [sx, sy, sz] = o.s, col = (ENG.RG_RARITY[o.props.tier] || ENG.RG_RARITY.rare).color, g = new THREE.Group(), dm = new THREE.MeshStandardMaterial({ color: '#1b2030', metalness: .65, roughness: .35 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(sx, sy * .62, sz), dm); base.position.y = sy * .31; base.castShadow = true; base.userData.walk = true; base.userData.solid = true; g.add(base);
  const lidP = new THREE.Group(); lidP.position.set(0, sy * .62, -sz / 2); g.add(lidP);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(sx, sy * .38, sz), dm); lid.position.set(0, sy * .19, sz / 2); lid.castShadow = true; lidP.add(lid);
  const gm = glowMat(col, 1.5); [[0, sy * .62, sz / 2 + .01, sx * .96, .04, .02], [0, sy * .62, -sz / 2 - .01, sx * .96, .04, .02], [sx / 2 + .01, sy * .62, 0, .02, .04, sz * .96], [-sx / 2 - .01, sy * .62, 0, .02, .04, sz * .96]].forEach(([x, y, z, w, hh, d]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), gm); b.position.set(x, y, z); g.add(b); });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.07), gm); gem.position.set(0, sy * .19, sz + .02); lidP.add(gem);
  g.userData.lid = lidP; g.userData.gem = gem; return g;
} });
prefab('shrine', { label: 'Perk shrine', cat: 'Roguelite', size: [1, 1.6, 1], props: { cost: { t: 'num', d: 0, min: 0, max: 5000, step: 10, l: 'Credits to use' }, uses: { t: 'num', d: 1, min: 1, max: 20, step: 1, l: 'Uses' }, choices: { t: 'num', d: 3, min: 1, max: 5, step: 1, l: 'Upgrades offered' }, color: { t: 'color', d: '#b48cff', l: 'Color' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const [sx, sy, sz] = o.s, p = o.props, g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(sx * .42, sx * .52, sy * .6, 6), new THREE.MeshStandardMaterial({ color: '#1c2030', metalness: .5, roughness: .45 })); b.position.y = sy * .3; b.castShadow = true; b.userData.walk = true; b.userData.solid = true; g.add(b);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(sx * .43, .025, 6, 6), glowMat(p.color, 1.5)); rim.rotation.x = Math.PI / 2; rim.position.y = sy * .6; g.add(rim);
  const cr = new THREE.Mesh(new THREE.OctahedronGeometry(sx * .2), glowMat(p.color, 1.8)); cr.position.y = sy * .86; cr.userData.use = true; g.add(cr);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(sx * .32, .012, 6, 40), glowMat(p.color, 1.2)); halo.position.y = sy * .86; g.add(halo);
  g.userData.crystal = cr; g.userData.halo = halo; return g;
} });
prefab('shop', { label: 'Shop terminal', cat: 'Roguelite', size: [1.6, 2.3, .8], props: { title: { t: 'text', d: 'MARKET', l: 'Sign' }, items: { t: 'num', d: 4, min: 1, max: 5, step: 1, l: 'Items for sale' }, prices: { t: 'num', d: 1, min: .1, max: 10, step: .1, l: 'Price multiplier' }, color: { t: 'color', d: '#ffb02e', l: 'Color' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const [sx, sy, sz] = o.s, p = o.props, g = new THREE.Group(), dm = new THREE.MeshStandardMaterial({ color: '#191d2a', metalness: .55, roughness: .4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), dm); body.position.y = sy / 2; body.castShadow = true; body.userData.walk = true; body.userData.solid = true; g.add(body);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(sx * .82, sy * .32), new THREE.MeshBasicMaterial({ map: labelTex(p.title, p.color, 512, 200), toneMapped: false })); scr.position.set(0, sy * .72, sz / 2 + .01); g.add(scr);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(sx * 1.08, .08, sz * 1.25), glowMat(p.color, 1.3)); counter.position.set(0, sy * .42, .06); g.add(counter);
  const f = glowMat(p.color, 1.1); [[sx / 2, 1], [-sx / 2, 1]].forEach(([x]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.04, sy, .04), f); b.position.set(x, sy / 2, sz / 2); g.add(b); });
  return g;
} });
prefab('barrier', { label: 'Energy gate', cat: 'Roguelite', size: [5, 4.6, .12], props: { color: { t: 'color', d: '#ff3ea5', l: 'Color' }, startOn: { t: 'bool', d: false, l: 'Closed at start' }, tag: { t: 'text', d: '', l: 'Tag (an arena or a switch opens and closes it)' } }, build(o, c) {
  const [sx, sy, sz] = o.s, p = o.props, g = new THREE.Group(), cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 64; i += 8) x.fillRect(0, i, 64, 1.5); x.fillRect(0, 0, 1.5, 64);
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(sx / 1.2, sy / 1.2);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).multiplyScalar(1.3), map: tex, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); wall.position.y = sy / 2; g.add(wall);
  const em = glowMat(p.color, 1.8); [[0, .04, sx], [0, sy - .04, sx]].forEach(([, y, w]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, .07, sz * 1.6), em); b.position.y = y; g.add(b); });
  g.userData.wall = wall; g.userData.tex = tex; if (c.editor) wall.material.opacity = .25; return g;
} });
prefab('arena', { label: 'Arena zone', cat: 'Roguelite', size: [12, 4, 12], props: { doors: { t: 'text', d: '', l: 'Doors to lock (tag)' }, waves: { t: 'num', d: 0, min: 0, max: 5, step: 1, l: 'Extra waves' }, reward: { t: 'sel', d: 'credits', o: ['none', 'credits', 'chest', 'perk'], l: 'Reward when cleared' }, tier: { t: 'sel', d: 'rare', o: ['common', 'rare', 'legendary'], l: 'Chest tier' }, credits: { t: 'num', d: 60, min: 0, max: 5000, step: 10, l: 'Reward credits' }, message: { t: 'text', d: 'Room cleared', l: 'Message' }, activates: { t: 'text', d: '', l: 'When cleared, activates tag' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const g = new THREE.Group(); if (!c.editor) return g; const [sx, sy, sz] = o.s;
  const b = eo(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshBasicMaterial({ color: '#ff3ea5', transparent: true, opacity: .07, depthWrite: false }))); b.position.y = sy / 2; g.add(b);
  const e = eo(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(sx, sy, sz)), new THREE.LineBasicMaterial({ color: '#ff3ea5' }))); e.position.y = sy / 2; g.add(e); return g;
} });
/* enemy additions: glow accents, shot pattern, elite, boss, credits */
Object.assign(PF.enemy.props, { glow: { t: 'color', d: '#000000', l: 'Glow accents (black is none)' }, shot: { t: 'sel', d: 'auto', o: ['auto', 'bullet', 'single', 'spread', 'burst', 'snipe'], l: 'Shots (auto follows the run setting)' }, elite: { t: 'bool', d: false, l: 'Elite (aura)' }, boss: { t: 'bool', d: false, l: 'Boss (health bar, special attacks)' }, credits: { t: 'num', d: 0, min: 0, max: 10000, step: 5, l: 'Credits dropped' } });
/* credits pickups */
{ const pk = PF.pickup; if (!pk.props.kind.o.includes('credits')) pk.props.kind.o.push('credits'); const base = pk.build;
  pk.build = function (o, c) { if (o.props.kind !== 'credits') return base(o, c); const g = new THREE.Group(), spin = new THREE.Group(); spin.position.y = .45; g.add(spin); g.userData.spin = spin; const m = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .035, 6), glowMat('#ffd84a', 1.5)); m.rotation.x = Math.PI / 2; spin.add(m); const m2 = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .04, 6), glowMat('#2fe0d0', 1.6)); m2.rotation.x = Math.PI / 2; spin.add(m2); return g; }; }
if (ENG.Logic && ENG.Logic.KINDS) Object.assign(ENG.Logic.KINDS, { arena: 'arena', chest: 'chest', shrine: 'shrine', shop: 'shop', portal: 'portal', neon: 'neon strip' });

/* ---------------- the floor generator ---------------- */
ENG.generateRun = function (S, run) {
  const T = ENG.RG_THEMES[S.runTheme] || ENG.RG_THEMES.neon, floor = run.floor || 1, floors = Math.max(1, S.runFloors | 0), last = floor >= floors, bossOn = last && S.runBoss !== false;
  const r = ENG.rng(((run.seed || 1) + floor * 7919) | 0), pickR = a => a[Math.floor(r() * a.length)];
  const GS = 26, cell = 5, H = 5.2, OX = 400, off = GS * cell / 2, W = gx => gx * cell - off, grid = new Uint8Array(GS * GS), at = (x, y) => (x < 0 || y < 0 || x >= GS || y >= GS) ? 0 : grid[y * GS + x];
  const rooms = [], fits = (x, y, w, h) => x >= 1 && y >= 1 && x + w <= GS - 1 && y + h <= GS - 1 && !rooms.some(o => x < o.x + o.w + 1 && x + w + 1 > o.x && y < o.y + o.h + 1 && y + h + 1 > o.y);
  const bw = bossOn ? 7 : 5; let big = null; for (let t = 0; t < 300 && !big; t++) { const x = 1 + Math.floor(r() * (GS - bw - 2)), y = 1 + Math.floor(r() * (GS - bw - 2)); if (fits(x, y, bw, bw)) { big = { x, y, w: bw, h: bw }; rooms.push(big); } }
  const want = clamp(Math.round((S.runRooms || 7) + (floor - 1)), 4, 16);
  for (let t = 0; t < 800 && rooms.length < want; t++) { const w = 3 + Math.floor(r() * 3), h = 3 + Math.floor(r() * 3), x = 1 + Math.floor(r() * (GS - w - 2)), y = 1 + Math.floor(r() * (GS - h - 2)); if (fits(x, y, w, h)) rooms.push({ x, y, w, h }); }
  rooms.forEach(o => { o.cx = o.x + o.w / 2; o.cy = o.y + o.h / 2; });
  const dist = (a, b) => Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy), rest = rooms.filter(o => o !== big);
  const start = rest.reduce((a, o) => dist(o, big) > dist(a, big) ? o : a, rest[0]), order = [start], pool = rest.filter(o => o !== start);
  while (pool.length) { const l = order[order.length - 1]; let bi = 0, bd = 1e9; pool.forEach((o, i) => { const d = dist(o, l) + dist(o, big) * .35; if (d < bd) { bd = d; bi = i; } }); order.push(pool.splice(bi, 1)[0]); }
  order.push(big);
  order.forEach(o => { for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) grid[y * GS + x] = 1; });
  const dig = (x, y) => { if (!grid[y * GS + x]) grid[y * GS + x] = 2; };
  for (let i = 1; i < order.length; i++) { const a = order[i - 1], b = order[i], ax = Math.floor(a.cx), ay = Math.floor(a.cy), bx = Math.floor(b.cx), by = Math.floor(b.cy);
    if (r() < .5) { for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) dig(x, ay); for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) dig(bx, y); }
    else { for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) dig(ax, y); for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) dig(x, by); } }
  /* room kinds */
  order.forEach((o, i) => o.kind = i === 0 ? 'start' : o === big ? (bossOn ? 'boss' : 'exit') : 'combat');
  const mids = order.slice(1, -1), specials = ['treasure', S.runShop !== false ? 'shop' : null, 'shrine', floor >= 2 ? 'elite' : null].filter(Boolean).slice(0, Math.max(0, mids.length - 2));
  specials.forEach(k => { const c = mids.filter(o => o.kind === 'combat'); if (c.length) c[Math.floor(r() * c.length)].kind = k; });
  const out = [], mk = (type, x, y, z, s, props, ry, name) => { const o = ENG.newObject(type); o.p = [x + OX, y, z]; if (s) o.s = s; Object.assign(o.props, props || {}); if (ry) o.r[1] = ry; if (name) o.name = name; o.gen = true; out.push(o); return o; };
  const col = T.strips[(floor - 1) % T.strips.length], col2 = T.strips[floor % T.strips.length], fl = { texture: T.floorTex, color: T.floorColor, tile: 2.5 }, wl = { texture: T.wallTex, color: T.wallColor, tile: 2.5 };
  /* floors: rooms, then corridor runs merged so the level stays light */
  order.forEach(o => { mk('floor', W(o.cx), -.2, W(o.cy), [o.w * cell, .2, o.h * cell], fl, 0, 'Room floor'); const ww = o.w * cell - .5, hh = o.h * cell - .5;
    mk('neon', W(o.cx), .01, W(o.cy), [ww, .04, hh], { color: o.kind === 'boss' ? T.boss : o.kind === 'start' ? col2 : col, glow: 1.2, shape: 'frame' }, 0, 'Floor trim'); });
  const used = new Uint8Array(GS * GS);
  for (let y = 0; y < GS; y++) { let x = 0; while (x < GS) { if (at(x, y) === 2 && !used[y * GS + x]) { let e = x; while (e + 1 < GS && at(e + 1, y) === 2 && !used[y * GS + e + 1]) e++; if (e > x) { for (let k = x; k <= e; k++) used[y * GS + k] = 1; const n = e - x + 1; mk('floor', W(x + n / 2), -.2, W(y + .5), [n * cell, .2, cell], fl, 0, 'Corridor floor'); mk('neon', W(x + n / 2), .01, W(y + .5), [n * cell - .4, .03, .07], { color: col2, glow: 1.1 }, 0, 'Corridor line'); } x = e + 1; } else x++; } }
  for (let x = 0; x < GS; x++) { let y = 0; while (y < GS) { if (at(x, y) === 2 && !used[y * GS + x]) { let e = y; while (e + 1 < GS && at(x, e + 1) === 2 && !used[(e + 1) * GS + x]) e++; for (let k = y; k <= e; k++) used[k * GS + x] = 1; const n = e - y + 1; mk('floor', W(x + .5), -.2, W(y + n / 2), [cell, .2, n * cell], fl, 0, 'Corridor floor'); mk('neon', W(x + .5), .01, W(y + n / 2), [.07, .03, n * cell - .4], { color: col2, glow: 1.1 }, 0, 'Corridor line'); y = e + 1; } else y++; } }
  /* walls with neon trim along the top and the foot */
  const wallRun = (cx, cz, len, ry) => { mk('wall', cx, 0, cz, [len + .3, H, .3], wl, ry, 'Wall'); mk('neon', cx, H - .42, cz, [len + .3, .07, .36], { color: col, glow: 1.4 }, ry, 'Wall trim'); mk('neon', cx, .1, cz, [len + .3, .05, .34], { color: col2, glow: .9 }, ry, 'Wall foot'); };
  for (let y = 0; y <= GS; y++) { let run = 0, s0 = 0; for (let x = 0; x <= GS; x++) { const e = x < GS && (!!at(x, y) !== !!at(x, y - 1)); if (e) { if (!run) s0 = x; run++; } else if (run) { wallRun(W(s0 + run / 2), W(y), run * cell, 0); run = 0; } } }
  for (let x = 0; x <= GS; x++) { let run = 0, s0 = 0; for (let y = 0; y <= GS; y++) { const e = y < GS && (!!at(x, y) !== !!at(x - 1, y)); if (e) { if (!run) s0 = y; run++; } else if (run) { wallRun(W(x), W(s0 + run / 2), run * cell, 90); run = 0; } } }
  /* enemies */
  const roster = rosterOf(S), hpK = 1 + (S.runScale == null ? 30 : S.runScale) / 100 * (floor - 1), dK = 1 + (S.runScale == null ? 30 : S.runScale) / 200 * (floor - 1);
  const enemy = (d, x, z, ry, extra) => { const p = Object.assign({ body: 'smooth', outfit: 'soldier', skinTone: d.skinTone || '#3d4556', top: d.top || '#151924', bottom: d.bottom || '#0f121a', hair: '#0b0d12', headwear: d.headwear || 'helmet', ai: 'patrol', radius: 2.5, attack: d.attack || 'ranged', health: Math.round((d.health || 60) * hpK), speed: d.speed || 3, damage: Math.round((d.damage || 8) * dK), fireRate: d.fireRate || .8, accuracy: d.accuracy == null ? .6 : d.accuracy, sight: d.sight || 30, height: d.height || 1.8, glow: d.glow || '#18e8ff', shot: d.shot || 'auto', credits: Math.round((d.credits || 15) * (1 + .2 * (floor - 1))), boss: !!d.boss, elite: !!d.elite, drop: 'none' }, extra || {}); return mk('enemy', x, 0, z, null, p, ry, d.name || 'Enemy'); };
  const weighted = () => { const c = roster.filter(d => !d.boss && !d.elite && (d.from || 1) <= floor && (d.weight == null ? 1 : d.weight) > 0); let t = c.reduce((a, d) => a + (d.weight == null ? 1 : d.weight), 0) * r(); for (const d of c) { t -= d.weight == null ? 1 : d.weight; if (t <= 0) return d; } return c[0] || roster[0]; };
  const spot = (o, m) => [W(o.x + m + r() * (o.w - 2 * m)), W(o.y + m + r() * (o.h - 2 * m))];
  let lights = 0, nameI = Math.floor(r() * T.names.length);
  order.forEach((o, i) => {
    const cx = W(o.cx), cz = W(o.cy), arena = ['combat', 'elite', 'exit', 'boss'].includes(o.kind), tag = 'rgd' + floor + '_' + i;
    const roomCol = o.kind === 'boss' ? T.boss : o.kind === 'treasure' ? '#ffc54d' : o.kind === 'shop' ? '#ffb02e' : o.kind === 'shrine' ? '#b48cff' : o.kind === 'start' ? col2 : col;
    if (lights < 10) { mk('light', cx, H - .6, cz, null, { color: o.kind === 'boss' ? T.boss : o.kind === 'start' ? '#bfefff' : T.light, intensity: o.kind === 'boss' ? 2.6 : 2, range: Math.max(o.w, o.h) * cell * 1.15 }, 0, 'Room light'); lights++; }
    const nm = o.kind === 'start' ? 'FLOOR ' + floor + ' · ' + (T.floors[(floor - 1) % T.floors.length]) : o.kind === 'shop' ? 'MARKET' : o.kind === 'shrine' ? 'SHRINE' : o.kind === 'treasure' ? 'VAULT' : o.kind === 'boss' ? 'APEX' : o.kind === 'exit' ? 'EXIT' : T.names[(nameI++) % T.names.length];
    mk('sign', cx, H - 1.25, cz, [Math.min(9, o.w * cell * .6), 1, .05], { text: nm, color: roomCol, transparent: true, glow: true }, 0, 'Room sign');
    if (arena) {
      const gate = (x, z, ry) => mk('barrier', x, 0, z, [cell, H - .45, .12], { color: roomCol, startOn: false, tag }, ry, 'Energy gate');
      for (let x = o.x; x < o.x + o.w; x++) { if (at(x, o.y - 1) === 2) gate(W(x + .5), W(o.y), 0); if (at(x, o.y + o.h) === 2) gate(W(x + .5), W(o.y + o.h), 0); }
      for (let y = o.y; y < o.y + o.h; y++) { if (at(o.x - 1, y) === 2) gate(W(o.x), W(y + .5), 90); if (at(o.x + o.w, y) === 2) gate(W(o.x + o.w), W(y + .5), 90); }
      const reward = o.kind === 'elite' ? 'chest' : o.kind === 'boss' || o.kind === 'exit' ? 'credits' : (r() < .25 ? 'chest' : 'credits');
      mk('arena', cx, 0, cz, [o.w * cell - 1.8, H, o.h * cell - 1.8], { doors: tag, waves: o.kind === 'combat' && floor >= 2 && r() < .45 ? 1 : 0, reward, tier: o.kind === 'elite' ? 'legendary' : r() < .3 ? 'rare' : 'common', credits: Math.round(40 + 25 * floor), message: o.kind === 'boss' ? 'The Warden falls' : 'Room cleared', activates: o.kind === 'exit' || o.kind === 'boss' ? 'rgexit' : '' }, 0, o.kind === 'boss' ? 'Boss arena' : 'Arena');
    }
    /* pillars and cover in fighting rooms */
    if ((arena) && o.w >= 4 && o.h >= 4) { const ps = o.kind === 'boss' ? [[.25, .25], [.75, .25], [.25, .75], [.75, .75]] : [[.3, .35], [.7, .65]]; ps.forEach(([u, v]) => { const px = W(o.x + o.w * u), pz = W(o.y + o.h * v); mk('pillar', px, 0, pz, [1.1, H, 1.1], { texture: 'metal', color: T.pillar }, 0, 'Pillar'); mk('neon', px, 1.3, pz, [1.2, .06, 1.2], { color: roomCol, glow: 1.5, shape: 'ring' }, 0, 'Pillar ring'); mk('neon', px, H - 1.1, pz, [1.2, .06, 1.2], { color: col2, glow: 1.2, shape: 'ring' }, 0, 'Pillar ring'); }); }
    if (o.kind === 'combat' || o.kind === 'elite' || o.kind === 'exit') {
      const nc = 1 + Math.floor(r() * 3); for (let k = 0; k < nc; k++) { const [x, z] = spot(o, 1.2), ry = r() < .5 ? 0 : 90; mk('block', x, 0, z, [2.4, 1.1, .5], { texture: 'metal', color: T.cover }, ry, 'Cover'); mk('neon', x, 1.1, z, [2.4, .05, .52], { color: roomCol, glow: 1.2 }, ry, 'Cover trim'); }
      const nb = Math.floor(r() * 3); for (let k = 0; k < nb; k++) { const [x, z] = spot(o, 1), s = .55 + r() * .35; mk('crate', x, .02, z, [s, s, s], { texture: 'metal', color: '#3a4258', mass: 6 + s * 10, breakable: true, health: 30, drop: r() < .3 ? 'health' : 'none' }, 0, 'Crate'); }
      if (r() < .5) { const [x, z] = spot(o, 1.2); mk('barrel', x, 0, z, null, { color: '#ff3ea5', radius: 5, damage: 80 }, 0, 'Volt barrel'); }
    }
    /* who is in the room */
    const area = o.w * o.h, nE = o.kind === 'combat' || o.kind === 'exit' ? Math.min(9, Math.round((1.6 + floor * .7 + area / 10) * (S.runEnemies == null ? 1 : S.runEnemies) * (.8 + r() * .4))) : o.kind === 'elite' ? Math.round(1 + floor * .5) : 0;
    for (let k = 0; k < nE; k++) { const [x, z] = spot(o, 1.1); enemy(weighted(), x, z, Math.floor(r() * 4) * 90); }
    if (o.kind === 'elite') { const jd = roster.find(d => d.elite) || weighted(), [x, z] = spot(o, 1.6); enemy(jd, x, z, 0, { ai: 'patrol' }); }
    if (o.kind === 'boss') { const bd = roster.find(d => d.boss) || ENG.RG_ROSTER.find(d => d.boss); enemy(bd, cx, cz + o.h * cell * .25, 180, { health: Math.round((S.runBossHp || bd.health) * (1 + .15 * (floors - 1))), ai: 'guard', sight: 60 }); mk('portal', cx, 0, cz - o.h * cell * .25, null, { action: 'win the run', label: 'ESCAPE', color: '#7dffb0', startOn: false, tag: 'rgexit' }, 0, 'Escape portal'); }
    if (o.kind === 'exit') mk('portal', cx, 0, cz, null, { action: last ? 'win the run' : 'next floor', label: last ? 'ESCAPE' : 'DESCEND', color: '#7dffb0', startOn: false, tag: 'rgexit' }, 0, 'Exit portal');
    if (o.kind === 'start') { const nx = order[1], dx = W(nx.cx) - cx, dz = W(nx.cy) - cz; const ps = mk('player_start', cx, 0, cz, null, { tag: 'run_start' }, Math.atan2(-dx, -dz) / D2R, 'Run start'); ps.props.tag = 'run_start';
      if (floor > 1) { mk('pickup', cx + 1.6, 0, cz + 1.6, null, { kind: 'ammo', amount: 50 }, 0, 'Ammo'); mk('pickup', cx - 1.6, 0, cz + 1.6, null, { kind: 'health', amount: 30 }, 0, 'Health'); } }
    if (o.kind === 'treasure') { mk('chest', cx, 0, cz, null, { tier: floor >= 2 && r() < .45 ? 'legendary' : 'rare' }, 0, 'Vault chest'); for (let k = 0; k < 4; k++) { const [x, z] = spot(o, 1); mk('pickup', x, 0, z, null, { kind: 'credits', amount: 15 }, 0, 'Credits'); } mk('trap', cx, 0, cz + 2.4, [3, 1, 1.4], { kind: 'spikes', damage: 12, every: 2.2, active: .8 }, 0, 'Spikes'); }
    if (o.kind === 'shop') mk('shop', cx, 0, cz - 1, null, { prices: 1 + .2 * (floor - 1) }, 0, 'Market');
    if (o.kind === 'shrine') mk('shrine', cx, 0, cz, null, { cost: floor > 1 ? 80 * floor : 0 }, 0, 'Shrine');
  });
  return out;
};

/* ---------------- run state ---------------- */
G.rgRun = function () { if (!this.rg) this.rg = { run: this.opt.run || (this.opt.run = { floor: 1, credits: this.S.runCredits || 0, perks: [], seed: 0, kills: 0, rooms: 0, time: 0 }), hud: {} }; return this.rg.run; };
G.genLevel = function (pr) {
  const S = this.S; if (!S.runOn) return; const run = this.rgRun(); if (!run.seed) run.seed = (S.runSeed | 0) || Math.floor(Math.random() * 1e9);
  const hubStart = pr.objects.find(o => !o.gen && o.type === 'player_start');
  pr.objects = pr.objects.filter(o => !o.gen).concat(ENG.generateRun(S, run));
  const gs = pr.objects.find(o => o.gen && o.type === 'player_start'); if (gs && hubStart) { const t = gs.props.tag; Object.assign(gs.props, ENG.clone(hubStart.props), { tag: t }); }
  if (gs && (run.floor > 1 || !hubStart) && !this.opt.checkpoint) this.opt.startAt = { p: gs.p.slice(), yaw: gs.r[1] * D2R, snap: true };
  run.inRun = run.floor > 1 || !hubStart;
};
G.rgCredits = function (n, pos) { const run = this.rgRun(), k = this.rgSt ? this.rgSt.credits : 1; n = Math.round(n * k); run.credits += n; if (pos) this.fxp.spawn(pos.clone ? pos.clone().setY(pos.y + .5) : pos, 6, { color: '#ffd84a', speed: 1.5, life: .35 }); return n; };
G.rgSpend = function (n) { const run = this.rgRun(); if (run.credits < n) return false; run.credits -= n; return true; };
G.rgPerks = function () { return perksOf(this.S); };
G.rgStatsCalc = function () {
  const st = { dmg: 1, rate: 1, speed: 1, reload: 1, credits: 1, crit: 0, regen: 0, lifesteal: 0, maxhp: 0, boltslow: 0, melee: 1 }, cat = this.rgPerks();
  (this.rgRun().perks || []).forEach(id => { const p = cat.find(x => x.id === id); if (!p) return; const a = +p.amount || 0;
    if (p.stat === 'dmg' || p.stat === 'rate' || p.stat === 'speed' || p.stat === 'reload' || p.stat === 'credits' || p.stat === 'melee') st[p.stat] += a / 100; else if (p.stat === 'crit' || p.stat === 'boltslow') st[p.stat] += a / 100; else if (p.stat in st) st[p.stat] += a; });
  st.crit = Math.min(.9, st.crit); st.boltslow = Math.min(.7, st.boltslow); return st;
};
G.rgApply = function () { const st = this.rgSt = this.rgStatsCalc(), P = this.player; if (!this.rgBase) this.rgBase = { hp: P.maxHealth, speed: this.S.speed }; P.maxHealth = this.rgBase.hp + st.maxhp; P.health = Math.min(P.health, P.maxHealth); this.S.speed = this.rgBase.speed * st.speed; };
G.rgStat = function (k) { return this.rgSt ? this.rgSt[k] : (k === 'melee' || k === 'dmg' ? 1 : 0); };
G.rgTake = function (p) {
  const run = this.rgRun(), P = this.player; run.perks.push(p.id); this.rgApply();
  if (p.stat === 'maxhp') P.health = Math.min(P.maxHealth, P.health + (+p.amount || 0)); if (p.stat === 'armor') P.armor = Math.min(150, P.armor + (+p.amount || 0));
  this.msg('Upgrade: ' + p.name, 2.5); this.audio.play('win', { rate: 1.5, volume: .6 }); if (this.vrRumble) this.vrRumble(.5, 120, 'both'); if (this.logic) this.logic.raise('perkTaken', null, { perk: p.id });
};
G.rgSummary = function (won) {
  const run = this.rgRun(), s = Math.floor(run.time || 0), names = run.perks.map(id => (this.rgPerks().find(p => p.id === id) || {}).name).filter(Boolean);
  return (won ? 'You escaped the Rift.' : 'You fell on floor ' + run.floor + ' of ' + Math.max(1, this.S.runFloors | 0) + '.') + '\n' + (run.kills || 0) + ' kills · ' + (run.rooms || 0) + ' rooms cleared · ' + run.credits + ' credits · ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + (names.length ? '\nUpgrades: ' + names.join(', ') : '');
};

/* ---------------- menus: upgrades and shops (they show in VR too) ---------------- */
G.rgMenu = function (title, text, btns) { this.state = 'choose'; this.mouse.l = false; this.keys = {}; if (document.pointerLockElement && !(this.vr && this.vr.on)) document.exitPointerLock(); this.showMenu(title, text, btns); };
G.rgClose = function () { this.hideMenu(); if (this.state === 'choose') { this.state = 'play'; if (!(this.vr && this.vr.on)) this.lock(true); } };
G.rgOffer = function (n, minRar) {
  const R = ENG.RG_RARITY, have = this.rgRun().perks, pool = this.rgPerks().filter(p => (!minRar || (R[p.rarity] || R.common).rank >= R[minRar].rank)), picks = [];
  for (let k = 0; k < (n || 3) && pool.length; k++) { const fresh = pool.filter(p => !picks.includes(p)); if (!fresh.length) break; const w = p => (R[p.rarity] || R.common).w * (have.includes(p.id) ? .6 : 1); let t = fresh.reduce((a, p) => a + w(p), 0) * Math.random(), got = fresh[0]; for (const p of fresh) { t -= w(p); if (t <= 0) { got = p; break; } } picks.push(got); }
  if (!picks.length) return;
  this.rgMenu('Choose an upgrade', picks.map(p => p.name + ' (' + ((R[p.rarity] || R.common).label) + '): ' + p.text).join('\n'), picks.map(p => [p.name, () => { this.rgClose(); this.rgTake(p); }]));
};
const GUN_POOL = () => Object.keys(ENG.WEAPONS).filter(k => { const W = ENG.WEAPONS[k]; return k !== 'fists' && !W.melee && W.mag; });
G.rgShopStock = function (e) {
  const p = e.p, k = p.prices || 1, guns = GUN_POOL().sort(() => Math.random() - .5), price = n => Math.round(n * k / 5) * 5;
  const all = [{ kind: 'weapon', id: guns[0] }, { kind: 'weapon', id: guns[1] }, { kind: 'heal', label: 'Med kit', desc: '+60 health', price: price(110) }, { kind: 'armor', label: 'Armor', desc: '+50 armor', price: price(90) }, { kind: 'perk', label: 'Upgrade', desc: 'choose 1 of 3', price: price(320) }, { kind: 'ammo', label: 'Ammo', desc: 'refill all guns', price: price(70) }];
  all.forEach(s => { if (s.kind === 'weapon') { const W = ENG.WEAPONS[s.id] || {}; s.label = W.name || s.id; s.desc = 'new weapon'; s.price = price(240 + Math.min(360, (W.dmg || 20) * (W.pellets || 1) * 3)); } });
  return all.filter(s => s.kind !== 'weapon' || s.id).sort(() => Math.random() - .5).slice(0, clamp(p.items | 0, 1, 5));
};
G.rgShop = function (e) {
  const sh = e.shop || (e.shop = { stock: this.rgShopStock(e) }), items = sh.stock.filter(s => !s.sold), run = this.rgRun();
  const btns = items.map(s => [s.label + ' ' + s.price, () => {
    if (!this.rgSpend(s.price)) { this.audio.play('click'); this.msg('Not enough credits', 1.5); this.rgShop(e); return; }
    s.sold = true; this.audio.play('pickup', { rate: 1.2 }); const P = this.player;
    if (s.kind === 'weapon') this.giveWeapon(s.id); else if (s.kind === 'heal') this.heal(60); else if (s.kind === 'armor') P.armor = Math.min(150, P.armor + 50);
    else if (s.kind === 'ammo') Object.keys(this.wep.owned).forEach(k => { const W = ENG.WEAPONS[k]; if (W && W.mag) this.wep.owned[k].res = Math.max(this.wep.owned[k].res, (W.reserve || W.mag * 4)); });
    if (s.kind === 'perk') { this.hideMenu(); this.rgOffer(3); return; } this.rgShop(e);
  }]);
  btns.push(['Leave', () => this.rgClose()]);
  this.rgMenu(e.p.title || 'Market', 'You have ' + run.credits + ' credits.\n' + (items.length ? items.map(s => s.label + ': ' + s.desc + ' (' + s.price + ')').join('\n') : 'Sold out.'), btns);
};

/* ---------------- using things: chests, shrines, shops ---------------- */
const USE = { chest: 1, shrine: 1, shop: 1 };
function aimEnt(g) { const cam = g.cam, f = _v.set(0, 0, -1).applyQuaternion(cam.quaternion); _r.set(cam.position, f); _r.near = 0; _r.far = g.S.camera === 'tps' ? 6 : 2.8; const h = _r.intersectObjects(g.targets, true).find(x => x.object.visible); return h && h.object.userData.e; }
G.rgPrompt = function (e) {
  if (e.type === 'chest') return e.chest && e.chest.open ? '' : 'Open chest' + (e.p.cost > 0 ? ' (' + e.p.cost + ' credits)' : '');
  if (e.type === 'shrine') return e.used >= e.p.uses ? '' : 'Pray for an upgrade' + (e.p.cost > 0 ? ' (' + e.p.cost + ' credits)' : '');
  if (e.type === 'shop') return 'Shop';
  return '';
};
G.rgUse = function (e) {
  if (e.type === 'shop') return this.rgShop(e);
  if (e.type === 'shrine') { if (e.used >= e.p.uses) return; if (e.p.cost > 0 && !this.rgSpend(e.p.cost)) { this.msg('Needs ' + e.p.cost + ' credits', 1.8); this.audio.play('click'); return; } e.used = (e.used || 0) + 1; this.fxp.spawn(e.root.position.clone().setY(e.root.position.y + 1.4), 40, { color: e.p.color, speed: 2.5, life: .6 }); this.rgOffer(e.p.choices || 3); return; }
  if (e.type === 'chest') { const C = e.chest; if (!C || C.open) return; if (e.p.cost > 0 && !this.rgSpend(e.p.cost)) { this.msg('Needs ' + e.p.cost + ' credits', 1.8); this.audio.play('click'); return; } C.open = true; C.t = 0; this.rgLoot(e); }
};
G.rgCoins = function (pos, total, n) { n = clamp(n || Math.ceil(total / 15), 1, 14); const each = Math.max(1, Math.round(total / n)); for (let i = 0; i < n; i++) { const o = ENG.newObject('pickup'), a = i * 2.399, rr = .5 + Math.random() * 1.1; o.p = [pos.x + Math.cos(a) * rr, Math.max(0, pos.y), pos.z + Math.sin(a) * rr]; o.props.kind = 'credits'; o.props.amount = each; o.name = 'Credits'; this.spawn(o); } };
G.rgLoot = function (e) {
  const tier = e.p.tier || 'rare', floor = this.rgRun().floor, pos = e.root.position.clone(), front = new THREE.Vector3(0, 0, 1.1).applyQuaternion(e.root.quaternion).add(pos);
  this.audio.play('win', { rate: tier === 'legendary' ? .8 : 1.2, volume: .7 }); this.fxp.spawn(pos.clone().setY(pos.y + .9), tier === 'legendary' ? 110 : 60, { color: (ENG.RG_RARITY[tier] || ENG.RG_RARITY.rare).color, speed: 4, life: .7 });
  const cr = e.p.credits > 0 ? e.p.credits : ({ common: 40, rare: 90, legendary: 180 }[tier] || 60) * (1 + .25 * (floor - 1)); let what = e.p.contents;
  if (what === 'random') what = tier === 'common' ? (Math.random() < .5 ? 'health' : 'credits') : tier === 'rare' ? (Math.random() < .6 ? 'weapon' : 'perk') : 'both';
  if (what !== 'perk') this.rgCoins(front, cr);
  const gun = () => { const g = GUN_POOL().filter(k => !this.wep.owned[k]); const id = g[Math.floor(Math.random() * g.length)]; if (!id) return; const o = ENG.newObject('pickup'); o.p = [front.x, front.y, front.z]; o.props.kind = id; o.name = ENG.WEAPONS[id].name; this.spawn(o); this.msg(ENG.WEAPONS[id].name + ' found', 2); };
  if (what === 'health') { const o = ENG.newObject('pickup'); o.p = [front.x, front.y, front.z]; o.props.kind = 'health'; o.props.amount = 40; this.spawn(o); }
  if (what === 'weapon' || what === 'both') gun();
  if (what === 'perk' || what === 'both') this.timers.push({ t: .6, fn: () => this.rgOffer(3, tier === 'legendary' ? 'rare' : null) });
};
const baseUse = G.use; G.use = function () { const e = aimEnt(this); if (e && USE[e.type]) { this.rgUse(e); return; } return baseUse.apply(this, arguments); };
const basePrompt = G.usePrompt; G.usePrompt = function () { const r = basePrompt.apply(this, arguments); if (!this.cut && !this.useEl.textContent) { const e = aimEnt(this); const t = e && USE[e.type] ? this.rgPrompt(e) : ''; if (t) { this.useEl.textContent = 'E  ' + t; this.useEl.style.display = 'block'; } } return r; };

/* ---------------- spawning extras ---------------- */
const baseSE = G.spawnExtra; G.spawnExtra = function (e) {
  if (baseSE) baseSE.call(this, e); const T = e.type, ud = (e.root.children[0] && e.root.children[0].userData) || {};
  if (T === 'portal') e.portal = { on: !!e.p.startOn, t: 0, ring: ud.ring, ring2: ud.ring2, disc: ud.disc };
  else if (T === 'chest') e.chest = { open: false, t: 0, lid: ud.lid, gem: ud.gem };
  else if (T === 'shrine') { e.used = 0; e.shr = { cr: ud.crystal, halo: ud.halo }; }
  else if (T === 'arena') e.arena = { state: 'idle', enemies: [], wave: 0, init: false };
  else if (T === 'barrier') { e.barrier = { on: false, wall: ud.wall, tex: ud.tex, t: 0 }; this.targets = this.targets.filter(r => r !== e.root); e.root.updateMatrixWorld(true); e.col = { box: new THREE.Box3(), m: ud.wall, e, dyn: true }; this.rgGate(e, !!e.p.startOn, true); }
  else if (T === 'neon' && e.p.pulse > 0) e.neon = { m: ud.glowMat, base: ud.glowMat && ud.glowMat.color.clone(), ph: Math.random() * 6 };
  if (e.enemy) dress(this, e);
  if (['portal', 'chest', 'shrine', 'shop', 'arena', 'neon', 'barrier'].includes(T)) this.rgOnAny = true;
};
/* energy gates block the player, enemies and bolts only while they are on */
G.rgGate = function (e, on, quiet) {
  const B = e.barrier; if (!B) return; B.on = on; e.root.visible = on; this.cols = this.cols.filter(c => c !== e.col);
  if (on) { e.root.updateMatrixWorld(true); e.col.box.setFromObject(B.wall); this.cols.push(e.col); if (!quiet) { this.audio.play('door', { pos: e.root.position, rate: 1.8, volume: .5 }); this.fxp.spawn(e.root.position.clone().setY(e.root.position.y + 1.5), 18, { color: e.p.color, speed: 2, life: .35 }); } }
};
const lockDoors = (g, tag, on) => g.byTag(tag).forEach(x => { if (x.barrier) g.rgGate(x, on); else if (x.door) { if (on) { g.setDoor(x, false); x.door.locked = true; } else { x.door.locked = false; g.setDoor(x, true); } } });
function dress(g, e) {
  const p = e.p, en = e.enemy, c = p.glow && p.glow !== '#000000' ? p.glow : null; if (p.boss || p.elite || c || p.credits > 0 || (p.shot && p.shot !== 'auto')) g.rgOnAny = true; if (!c) return;
  const m = glowMat(c, 1.6), parts = en.parts, add = (par, geo, x, y, z) => { const n = new THREE.Mesh(geo, m); n.position.set(x, y, z); n.castShadow = false; par.add(n); return n; }; e.rgGlow = m;
  if (parts && parts.head && parts.spine && !parts.__np) {
    add(parts.head, new THREE.BoxGeometry(.17, .032, .05), 0, .016, .086); add(parts.spine, new THREE.BoxGeometry(.11, .11, .03), 0, .3, .118);
    ['armL', 'armR'].forEach(k => parts[k] && add(parts[k], new THREE.BoxGeometry(.115, .028, .115), 0, -.12, 0)); ['legL', 'legR'].forEach(k => parts[k] && add(parts[k], new THREE.BoxGeometry(.17, .03, .17), 0, -.3, 0));
    if (p.boss) { const halo = add(parts.head, new THREE.TorusGeometry(.17, .014, 6, 32), 0, .2, 0); halo.rotation.x = Math.PI / 2; e.rgHalo = halo; }
  } else { const b = add(e.root, new THREE.TorusGeometry(.32 * (p.height / 1.8), .025, 6, 32), 0, p.height * .55, 0); b.rotation.x = Math.PI / 2; }
  if (p.elite || p.boss) { const a = new THREE.Mesh(new THREE.TorusGeometry(p.boss ? 1.6 : .8, .03, 6, 48), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .7, toneMapped: false, depthWrite: false })); a.rotation.x = Math.PI / 2; a.position.y = .05; e.root.add(a); e.rgAura = a; }
  if (p.boss) { const L = new THREE.PointLight(c, 2.2, 10, 2); L.position.y = p.height * .7; e.root.add(L); e.rgLight = L; g.rgBossE = e; }
}

/* ---------------- enemy bolts: slow, glowing, dodgeable, can be punched back ---------------- */
G.rgFxInit = function () {
  if (this.rgFx) return this.rgFx; const N = 220, geo = new THREE.SphereGeometry(1, 10, 8); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3)); /* r128 tints instances through vertex colors */
  const core = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false }), N), halo = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }), N);
  [core, halo].forEach(m => { m.setColorAt(0, new THREE.Color(1, 1, 1)); m.count = 0; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(m); });
  return (this.rgFx = { core, halo, N, list: [], tele: [], m4: new THREE.Matrix4(), q: new THREE.Quaternion(), c: new THREE.Color() });
};
G.rgBolt = function (from, dir, speed, dmg, color, size, friendly) { const F = this.rgFxInit(); if (F.list.length >= F.N) F.list.shift(); F.list.push({ p: from.clone(), v: dir.clone().normalize().multiplyScalar(speed), dmg, col: new THREE.Color(color || '#ff4060'), r: size || .085, life: 7, friendly: !!friendly }); };
G.rgHead = function () { const v = this.vr, o = this._rgHeadV || (this._rgHeadV = new THREE.Vector3()); if (v && v.on && v.head) return o.copy(v.head.position); const P = this.player; return o.set(P.pos.x, P.pos.y + (P.crouch ? 1.0 : 1.5), P.pos.z); };
G.enemyShoot = function (en, from, to) {
  let shot = en.p.shot || 'auto'; if (shot === 'auto') shot = this.S.runBolts ? 'single' : 'bullet'; if (shot === 'bullet') return false;
  const c = en.p.glow && en.p.glow !== '#000000' ? en.p.glow : '#ff4060', sp = (this.S.runBoltSpeed || 9) * (1 - this.rgStat('boltslow')), head = this.rgHead(), P = this.player;
  const aimAt = (lead, inacc) => { const t = from.distanceTo(head) / sp; const tg = head.clone().addScaledVector(P.vel, t * lead); tg.y -= .25; const k = (1 - clamp(en.p.accuracy == null ? .6 : en.p.accuracy, 0, 1)) * inacc; tg.x += rand(-1, 1) * k; tg.y += rand(-.6, .6) * k; tg.z += rand(-1, 1) * k; return tg.sub(from).normalize(); };
  this.audio.play('enemyShot', { pos: from, rate: rand(1.3, 1.6), volume: .7 }); this.fxp.spawn(from, 6, { color: c, speed: 1.4, life: .14 });
  if (shot === 'single') this.rgBolt(from, aimAt(.5, 1.6), sp, en.p.damage, c);
  else if (shot === 'spread') { const d = aimAt(.3, 1), side = new THREE.Vector3(-d.z, 0, d.x).normalize(); [-1, 0, 1].forEach(s => this.rgBolt(from, d.clone().addScaledVector(side, s * .17).normalize(), sp * .9, en.p.damage, c)); }
  else if (shot === 'burst') { const f = from.clone(); [0, .14, .28].forEach(t => this.timers.push({ t, fn: () => { if (!en.dead) this.rgBolt(f, aimAt(.6, 1.2), sp * 1.1, en.p.damage, c, .07); } })); }
  else if (shot === 'snipe') { const F = this.rgFxInit(), line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, head.clone()]), new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: .6, toneMapped: false })); this.scene.add(line); F.tele.push({ en, line, t: .75, from: from.clone() }); }
  return true;
};
G.rgRing = function (en, n, k) { const from = en.root.position.clone().setY(en.root.position.y + en.p.height * .45), c = en.p.glow || '#b06bff', gap = Math.floor(Math.random() * n), sp = (this.S.runBoltSpeed || 9) * .75 * (k || 1) * (1 - this.rgStat('boltslow')); for (let i = 0; i < n; i++) { if (i === gap || i === (gap + 1) % n) continue; const a = i / n * Math.PI * 2 + (en.rgRot = (en.rgRot || 0) + .17); this.rgBolt(from, new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), sp, en.p.damage, c, .12); } this.audio.play('alarm', { pos: from, rate: 1.8, volume: .5 }); };
G.rgSummon = function (en, n) {
  const roster = rosterOf(this.S), d = roster.find(x => x.id === 'husk') || roster[0], rp = en.root.position;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + Math.random(), o = ENG.newObject('enemy'); o.p = [rp.x + Math.sin(a) * 3.5, rp.y, rp.z + Math.cos(a) * 3.5]; Object.assign(o.props, { body: 'smooth', outfit: 'soldier', skinTone: '#3d4556', top: '#151924', bottom: '#0f121a', headwear: 'helmet', ai: 'hunter', attack: d.attack || 'melee', health: Math.round((d.health || 45) * 1.4), speed: d.speed || 4.6, damage: d.damage || 10, glow: d.glow || '#ff8a3d', credits: 10 }); o.name = 'Summoned ' + (d.name || 'minion');
    const ne = this.spawn(o); if (ne.enemy) { ne.enemy.hear(this.player.pos); if (en.rgArena) en.rgArena.enemies.push(ne.enemy); } this.fxp.spawn(new THREE.Vector3(o.p[0], rp.y + 1, o.p[2]), 30, { color: en.p.glow || '#b06bff', speed: 2.5, life: .5 }); }
  this.msg('The Warden calls for help', 2);
};
G.rgBoltsUpdate = function (dt) {
  const F = this.rgFx; if (!F) return; const head = this.rgHead(), P = this.player, v = this.vr && this.vr.on ? this.vr : null, feetY = P.pos.y + .35;
  for (let i = F.tele.length - 1; i >= 0; i--) { const t = F.tele[i]; t.t -= dt; const pos = t.line.geometry.attributes.position; pos.setXYZ(1, head.x, head.y - .2, head.z); pos.needsUpdate = true; t.line.material.opacity = .25 + .5 * (1 - t.t / .75); if (t.t <= 0 || t.en.dead) { this.scene.remove(t.line); t.line.geometry.dispose(); F.tele.splice(i, 1); if (!t.en.dead) { this.rgBolt(t.from, head.clone().setY(head.y - .2).sub(t.from), (this.S.runBoltSpeed || 9) * 2.6 * (1 - this.rgStat('boltslow')), t.en.p.damage, t.en.p.glow || '#4aa8ff', .06); this.audio.play('rifle', { pos: t.from, rate: 1.6, volume: .6 }); } } }
  const L = F.list, held = v && v.held && v.held.e && v.held.e.body ? v.held : null;
  for (let i = L.length - 1; i >= 0; i--) {
    const b = L[i]; b.p.addScaledVector(b.v, dt); b.life -= dt; let dead = b.life <= 0;
    if (!dead) for (const c of this.cols) { const x = c.box; if (b.p.x > x.min.x && b.p.x < x.max.x && b.p.y > x.min.y && b.p.y < x.max.y && b.p.z > x.min.z && b.p.z < x.max.z && !(held && c.e === held.e)) { dead = true; break; } }
    if (!dead && b.p.y < P.pos.y - 3) dead = true;
    if (!dead && !b.friendly) {
      /* blocked by whatever the off hand is holding */
      if (held) { const hp = held.e.body.position; if (_v.set(hp.x, hp.y, hp.z).distanceTo(b.p) < (held.e.rgR || .4) + b.r) { dead = true; this.fxp.spawn(b.p, 10, { color: '#bfefff', speed: 2.5, life: .25 }); this.audio.play('punch', { pos: b.p, rate: 1.8 }); if (this.vrRumble) this.vrRumble(.6, 60, 'off'); } }
      /* punched back by a fast hand */
      if (!dead && v) for (const c of v.ctrls) { const u = c.userData; if (!u.wp || !u.vel) continue; if (u.wp.distanceTo(b.p) < .2 + b.r && u.vel.length() > 1.6) { b.v.multiplyScalar(-1.25); b.friendly = true; b.life = 4; b.col.set('#7dffb0'); this.audio.play('punch', { pos: b.p, rate: 1.5 }); this.fxp.spawn(b.p, 12, { color: '#7dffb0', speed: 2, life: .3 }); if (this.vrRumble) this.vrRumble(.7, 70, c === v.gunCtrl ? 'gun' : 'off'); break; } }
      if (!dead && !b.friendly) { const top = head, bot = _v2.set(head.x, feetY, head.z), d = segDist(b.p, bot, top); if (d < .22 + b.r) { dead = true; this.hurtPlayer(b.dmg); this.fxp.spawn(b.p, 8, { color: '#ff6060', speed: 2, life: .3 }); } }
    } else if (!dead && b.friendly) { for (const en of this.enemies) { if (en.dead || en.dormant) continue; const rp = en.root.position; if (segDist(b.p, _v.set(rp.x, rp.y + .3, rp.z), _v2.set(rp.x, rp.y + en.p.height, rp.z)) < .4 + b.r) { en.damage(b.dmg * 2.5, b.v.clone().normalize()); this.hitMark && this.hitMark(); dead = true; this.fxp.spawn(b.p, 14, { color: '#7dffb0', speed: 3, life: .3 }); break; } } }
    if (dead) { if (b.life > 0) this.fxp.spawn(b.p, 4, { color: '#' + b.col.getHexString(), speed: 1.2, life: .2 }); L.splice(i, 1); }
  }
  const n = Math.min(L.length, F.N); F.core.count = F.halo.count = n;
  for (let i = 0; i < n; i++) { const b = L[i]; F.m4.compose(b.p, F.q, _v.set(b.r, b.r, b.r)); F.core.setMatrixAt(i, F.m4); F.core.setColorAt(i, F.c.copy(b.col).multiplyScalar(1.6)); F.m4.compose(b.p, F.q, _v.set(b.r * 2.6, b.r * 2.6, b.r * 2.6)); F.halo.setMatrixAt(i, F.m4); F.halo.setColorAt(i, b.col); }
  F.core.instanceMatrix.needsUpdate = F.halo.instanceMatrix.needsUpdate = true; if (F.core.instanceColor) F.core.instanceColor.needsUpdate = true; if (F.halo.instanceColor) F.halo.instanceColor.needsUpdate = true;
};
const _sa = new THREE.Vector3(), _sb = new THREE.Vector3();
function segDist(p, a, b) { _sa.subVectors(b, a); const t = clamp(_sb.subVectors(p, a).dot(_sa) / Math.max(1e-6, _sa.lengthSq()), 0, 1); return p.distanceTo(_sb.copy(a).addScaledVector(_sa, t)); }

/* ---------------- boss abilities ---------------- */
if (ENG.Enemy) {
  const EP = ENG.Enemy.prototype, bu = EP.update;
  EP.update = function (dt) {
    const r = bu.call(this, dt); if (this.dead || this.dormant) return r; const g = this.g, e = this.e;
    if (e.rgAura) { e.rgAura.rotation.z += dt * 1.5; e.rgAura.material.opacity = .45 + .3 * Math.sin(g.time * 4); }
    if (e.rgHalo) e.rgHalo.rotation.z += dt * 2;
    if (!this.p.boss || !this.alert) return r;
    const B = this.rgB || (this.rgB = { ring: 3, summon: [.66, .33], slam: 2, wind: 0 }), hpF = this.hp / this.p.health, P = g.player, d = Math.hypot(P.pos.x - this.root.position.x, P.pos.z - this.root.position.z);
    B.ring -= dt; if (B.ring <= 0) { B.ring = hpF < .5 ? 3.2 : 5; g.rgRing(this, hpF < .5 ? 22 : 16, hpF < .5 ? 1.25 : 1); }
    while (B.summon.length && hpF < B.summon[0]) { B.summon.shift(); g.rgSummon(this, 3); }
    if (B.wind > 0) { B.wind -= dt; if (e.rgLight) e.rgLight.intensity = 2.2 + 6 * (1 - B.wind / .9); if (B.wind <= 0) { if (e.rgLight) e.rgLight.intensity = 2.2; g.shake = Math.min(1.5, g.shake + .8); g.audio.play('explosion', { pos: this.root.position, rate: .7 }); g.fxp.spawn(this.root.position.clone().setY(this.root.position.y + .2), 120, { color: this.p.glow || '#b06bff', speed: 9, life: .5, gravity: 2 }); if (d < 6.5 && P.onGround) g.hurtPlayer(12 + 22 * (1 - d / 6.5)); if (g.vrRumble) g.vrRumble(1, 200, 'both'); } }
    else { B.slam -= dt; if (B.slam <= 0 && d < 5) { B.slam = 5.5; B.wind = .9; g.msg('Get away from the Warden!', 1); } }
    return r;
  };
}

/* ---------------- per frame ---------------- */
G.rgKill = function (en) {
  const e = en.e, p = en.p, run = this.rgRun(), pos = en.root.position.clone(); run.kills = (run.kills || 0) + 1;
  if (p.credits > 0) this.rgCoins(pos, p.credits * (p.boss ? 1 : 1), p.boss ? 14 : 0);
  if (this.rgSt && this.rgSt.lifesteal > 0 && this.player.health > 0) this.heal(this.rgSt.lifesteal);
  if (e.rgGlow) e.rgGlow.color.multiplyScalar(.15); if (e.rgAura) e.rgAura.visible = false; if (e.rgLight) e.rgLight.intensity = 0;
  if (p.boss) { this.boom.position.copy(pos); this.boom.intensity = 8; this.boomT = .6; this.fxp.spawn(pos.clone().setY(pos.y + 1.5), 200, { color: p.glow || '#b06bff', speed: 8, life: .9, drag: 1.5 }); this.audio.play('explosion', { pos, rate: .6 }); this.shake = 1.2; if (this.logic) this.logic.raise('bossDefeated', e); if (this.rgBossE === e) this.rgBossE = null; }
};
function inside(e, pos, m) { _v.copy(pos); e.root.worldToLocal(_v); const [sx, , sz] = e.o.s; return Math.abs(_v.x) <= sx / 2 + m && Math.abs(_v.z) <= sz / 2 + m && _v.y > -2 && _v.y < e.o.s[1] + 2; }
G.rgArenaTick = function (e) {
  const A = e.arena, P = this.player; if (A.state === 'done') return;
  if (!A.init) { A.init = true; e.root.updateMatrixWorld(true); A.enemies = this.enemies.filter(en => !en.dead && inside(e, en.root.position, .9)); A.enemies.forEach(en => en.rgArena = A); A.defs = A.enemies.map(en => ENG.clone(en.e.o)); if (!A.enemies.length) { A.state = 'done'; return; } }
  if (A.state === 'idle' && inside(e, P.pos, -.2)) {
    A.state = 'fight'; lockDoors(this, e.p.doors, true);
    A.enemies.forEach(en => { en.p.ai = 'hunter'; if (en.dormant) en.wake(); else en.hear(P.pos); }); this.audio.play('door', { rate: 1.4 }); this.msg(A.enemies.some(en => en.p.boss) ? 'The Warden wakes' : 'Locked in. Clear the room.', 2); if (this.logic) this.logic.raise('roomStarts', e);
  }
  if (A.state !== 'fight') return;
  A.enemies = A.enemies.filter(en => !en.dead); if (A.enemies.length) return;
  if (A.wave < (e.p.waves | 0)) { A.wave++; this.msg('Wave ' + (A.wave + 1), 2); this.audio.play('alarm', { rate: 1.2, volume: .5 });
    A.defs.forEach((d, i) => this.timers.push({ t: .25 + i * .3, fn: () => { if (this.state === 'gone') return; const o = ENG.clone(d); o.id = ENG.uid(); o.props.ai = 'hunter'; o.name = d.name + ' (wave ' + (A.wave + 1) + ')'; const ne = this.spawn(o); if (ne.enemy) { ne.enemy.rgArena = A; A.enemies.push(ne.enemy); ne.enemy.hear(P.pos); } this.fxp.spawn(new THREE.Vector3(o.p[0], o.p[1] + 1, o.p[2]), 30, { color: o.props.glow || '#18e8ff', speed: 2.2, life: .5 }); } }));
    A.enemies.push({ dead: false, _wait: true }); this.timers.push({ t: .3 + A.defs.length * .3, fn: () => { A.enemies = A.enemies.filter(x => !x._wait); } }); return; }
  A.state = 'done'; const run = this.rgRun(); run.rooms = (run.rooms || 0) + 1;
  lockDoors(this, e.p.doors, false);
  this.msg(e.p.message || 'Room cleared', 2.2); this.audio.play('win', { rate: 1.3, volume: .55 }); if (this.vrRumble) this.vrRumble(.4, 150, 'both');
  const c = e.root.position.clone(); if (e.p.reward === 'credits' && e.p.credits > 0) this.rgCoins(c, e.p.credits);
  else if (e.p.reward === 'chest') { const o = ENG.newObject('chest'); o.p = [c.x, c.y, c.z]; o.props.tier = e.p.tier || 'rare'; o.name = 'Reward chest'; this.spawn(o); this.fxp.spawn(c.clone().setY(c.y + .6), 60, { color: (ENG.RG_RARITY[o.props.tier] || ENG.RG_RARITY.rare).color, speed: 3, life: .6 }); }
  else if (e.p.reward === 'perk') this.timers.push({ t: .8, fn: () => this.rgOffer(3) });
  if (e.p.activates) this.activate(e.p.activates); if (this.logic) this.logic.raise('roomCleared', e);
};
G.rgTeleport = function (pos, yaw) { const P = this.player; P.pos.copy(pos); P.vel.set(0, 0, 0); P.yaw = yaw || 0; const v = this.vr; if (v && v.on) { const e = new THREE.Euler().setFromQuaternion(v.hl.quaternion, 'YXZ'); v.yaw = P.yaw - e.y; this.vrPlace(); } this.fxp.spawn(pos.clone().setY(pos.y + 1), 40, { color: '#7dffb0', speed: 2.5, life: .5 }); };
G.rgPortalTick = function (e, dt) {
  const Pt = e.portal; Pt.t += dt; const k = Pt.on ? 1 : .15; if (Pt.ring) Pt.ring.rotation.z += dt * .6 * k; if (Pt.ring2) Pt.ring2.rotation.z -= dt * 1.3 * k; if (Pt.disc) { Pt.disc.material.opacity = Pt.on ? .3 + .12 * Math.sin(Pt.t * 3) : .04; Pt.disc.rotation.z += dt * k; }
  if (!Pt.on || Pt.used || this.cut) return; const P = this.player; _v.copy(P.pos); e.root.worldToLocal(_v); const [sx] = e.o.s;
  if (Math.abs(_v.x) < sx * .42 && Math.abs(_v.z) < .9 && _v.y > -1 && _v.y < 2) {
    const a = e.p.action; this.audio.play('win', { rate: 1.6, volume: .7 });
    if (a === 'teleport') { const t = this.byTag(e.p.target)[0] || this.ents.find(x => x.o.name === e.p.target); if (!t) { this.msg('This portal goes nowhere yet', 2); Pt.used = true; return; } this.rgTeleport(t.root.position.clone(), (t.o.r[1] || 0) * D2R); const run = this.rgRun(); if (this.S.runOn) { run.inRun = true; const T = ENG.RG_THEMES[this.S.runTheme] || ENG.RG_THEMES.neon; this.msg('FLOOR ' + run.floor + ' · ' + T.floors[(run.floor - 1) % T.floors.length], 3); this.objective = 'Find the exit portal'; if (this.logic) this.logic.raise('floorStarts', null, { floor: run.floor }); } }
    else if (a === 'win the run') { Pt.used = true; this.rgWin(); }
    else { Pt.used = true; this.rgNext(); }
  }
};
G.rgUpdate = function (dt) {
  const P = this.player, run = this.rg ? this.rg.run : null; if (run && run.inRun && this.state === 'play') run.time = (run.time || 0) + dt;
  if (this.rgSt && this.rgSt.regen > 0 && P.health > 0 && P.health < P.maxHealth) P.health = Math.min(P.maxHealth, P.health + this.rgSt.regen * dt);
  for (const en of this.enemies) if (en.dead && !en.rgDone) { en.rgDone = true; this.rgKill(en); }
  const pp = _v2.set(P.pos.x, P.pos.y + .8, P.pos.z);
  for (const e of this.ents) {
    if (!e.alive) continue;
    if (e.arena) this.rgArenaTick(e);
    else if (e.portal) this.rgPortalTick(e, dt);
    else if (e.chest) { const C = e.chest; if (C.gem && !C.open) C.gem.rotation.y += dt * 2; if (C.open && C.t < 1 && C.lid) { C.t = Math.min(1, C.t + dt * 2.5); C.lid.rotation.x = -1.9 * (1 - Math.pow(1 - C.t, 3)); if (C.gem) C.gem.visible = false; } }
    else if (e.shr) { const s = e.shr, on = e.used < e.p.uses; if (s.cr) { s.cr.rotation.y += dt * (on ? 1.5 : .2); s.cr.position.y = e.o.s[1] * .86 + Math.sin(this.time * 2) * .05; s.cr.material.color.set(on ? e.p.color : '#2a2440').multiplyScalar(on ? 1.8 : 1); } if (s.halo) s.halo.rotation.x += dt * (on ? 1.2 : 0); }
    else if (e.barrier) { if (e.barrier.on && e.barrier.tex) { e.barrier.tex.offset.y -= dt * .35; e.barrier.wall.material.opacity = .45 + .12 * Math.sin(this.time * 9 + e.root.position.x); } }
    else if (e.neon) { const k = .55 + .45 * Math.sin(this.time * e.p.pulse * Math.PI + e.neon.ph); e.neon.m.color.copy(e.neon.base).multiplyScalar(k); }
    else if (e.type === 'pickup' && e.p.kind === 'credits' && !e.hidden) { const rp = e.root.position, d = rp.distanceTo(pp); if (d < 5 && d > .05) { rp.addScaledVector(_v.subVectors(pp, rp).normalize(), Math.min(d, dt * (4 + (5 - d) * 3))); rp.y = Math.max(rp.y, P.pos.y); } }
  }
  this.rgBoltsUpdate(dt);
  if (this.rg || this.rgOnAny) { const B = this.rgBossE && this.rgBossE.alive && this.rgBossE.enemy && !this.rgBossE.enemy.dead && this.rgBossE.enemy.alert ? this.rgBossE : null, Th = ENG.RG_THEMES[this.S.runTheme] || ENG.RG_THEMES.neon;
    ENG._rgHud = { credits: run ? run.credits : 0, floor: run ? run.floor : 1, floors: Math.max(1, this.S.runFloors | 0), run: !!this.S.runOn, floorName: run ? Th.floors[(run.floor - 1) % Th.floors.length] : '', inRun: run ? !!run.inRun : false, boss: B ? { name: B.o.name, hp: Math.max(0, B.enemy.hp), max: B.enemy.p.health } : null, perks: run ? run.perks.map(id => (this.rgPerks().find(p => p.id === id) || {}).name).filter(Boolean) : [] }; }
};
G.rgNext = function () {
  if (this.rgLeaving) return; const run = this.rgRun(); if (run.floor >= Math.max(1, this.S.runFloors | 0)) return this.rgWin();
  this.rgLeaving = true; if (this.fadeTo) this.fadeTo(1, .35); this.msg('Going deeper', 1);
  this.timers.push({ t: .45, fn: () => setTimeout(() => { if (this.state === 'gone') return; const P = this.player; run.floor++; run.inRun = true;
    const o = Object.assign({}, this.opt, { checkpoint: null, startAt: null, run, carry: { health: P.health, armor: P.armor, keys: P.keys.slice(), owned: ENG.clone(this.wep.owned), cur: this.wep.cur } }); this.rgRebuild(o); }, 0) });
};
G.rgRebuild = function (o) { const v = this.vr; if (v && v.on && !v.sim) { this.keepRenderer = true; Object.assign(o, { renderer: this.renderer, vrSession: v.session, vrType: v.type }); } const c = this.c, src = this.src; this.dispose(); const g = new ENG.Game(c, src, o); if (this.opt.onRestart) this.opt.onRestart(g); g.ready.then(() => g.begin()); };
G.rgWin = function () {
  if (this.state !== 'play') return; this.state = 'won'; if (document.pointerLockElement && !(this.vr && this.vr.on)) document.exitPointerLock(); this.audio.play('win');
  const b = [['New run', () => this.restart()]]; if (this.opt.onExit) b.push(['Back to editor', () => this.quit()]); this.showMenu('Run complete', this.rgSummary(true), b); if (this.logic) this.logic.raise('runWon');
};

/* ---------------- hooks into the game ---------------- */
const baseStep = G.step; G.step = function (dt) { const r = baseStep.apply(this, arguments); if (this.state !== 'gone' && (this.rg || this.rgOnAny)) { try { this.rgUpdate(dt * (this.ts || 1)); } catch (x) { console.warn('run', x); } } return r; };
const baseBegin = G.begin; G.begin = function () {
  const first = !this.started, r = baseBegin.apply(this, arguments);
  if (first && this.S.runOn) { const run = this.rgRun(); this.rgApply();
    const T = ENG.RG_THEMES[this.S.runTheme] || ENG.RG_THEMES.neon; if (run.inRun) { this.msg('FLOOR ' + run.floor + ' · ' + T.floors[(run.floor - 1) % T.floors.length], 3); this.objective = run.floor >= Math.max(1, this.S.runFloors | 0) && this.S.runBoss !== false ? 'Defeat the Warden' : 'Find the exit portal'; if (this.logic) this.logic.raise('floorStarts', null, { floor: run.floor }); } }
  return r;
};
const baseRestart = G.restart; G.restart = function (cp) { if (this.S.runOn && !cp) this.opt = Object.assign({}, this.opt, { run: null, carry: null, startAt: null }); return baseRestart.apply(this, arguments); };
const baseHurt = G.hurtPlayer; G.hurtPlayer = function () {
  const r = baseHurt.apply(this, arguments);
  if (this.state === 'dead' && this.S.runOn && !this.rgDeadShown) { this.rgDeadShown = true; const b = [['New run', () => this.restart()]]; if (this.opt.onExit) b.push(['Back to editor', () => this.quit()]); this.showMenu('Run over', this.rgSummary(false), b); }
  return r;
};
const baseHit = G.applyHit; G.applyHit = function (h, dir, dmg) {
  if (this.rgSt && h && h.object) { let o = h.object; while (o && !(o.userData && o.userData.e)) o = o.parent; const e = o && o.userData.e; if (e && e.enemy && !e.enemy.dead) { dmg *= this.rgSt.dmg; if (Math.random() < this.rgSt.crit) { dmg *= 2; this.fxp.spawn(h.point, 10, { color: '#ffd84a', speed: 2.5, life: .3 }); } } }
  return baseHit.call(this, h, dir, dmg);
};
const baseFire = G.fire; G.fire = function () { const t0 = this.lastShot, r = baseFire.apply(this, arguments); if (this.rgSt && this.rgSt.rate !== 1 && this.lastShot !== t0) this.wep.next = this.time + (this.wep.next - this.time) / this.rgSt.rate; return r; };
const baseReload = G.reload; G.reload = function () { const a = this.wep.reload, s0 = this.sr, r = baseReload.apply(this, arguments); if (this.rgSt && this.rgSt.reload !== 1) { if (this.wep.reload > 0 && !(a > 0)) this.wep.reload /= this.rgSt.reload; if (this.sr && this.sr !== s0) this.sr.t /= this.rgSt.reload; } return r; };
const baseGive = G.giveItem; G.giveItem = function (kind, amount) { if (kind === 'credits') { this.rgCredits(amount || 10); this.audio.play('pickup', { rate: 1.7, volume: .5 }); return; } return baseGive.apply(this, arguments); };
const baseAct = G.activate; G.activate = function (tag) { const r = baseAct.apply(this, arguments); this.byTag(tag).forEach(e => { if (e.barrier) this.rgGate(e, !e.barrier.on); if (e.portal && !e.portal.on) { e.portal.on = true; this.fxp.spawn(e.root.position.clone().setY(e.root.position.y + 1.6), 80, { color: e.p.color, speed: 3, life: .6 }); this.audio.play('win', { rate: 1.1, volume: .6 }); this.msg(e.p.action === 'win the run' ? 'The escape portal is open' : 'The exit portal is open', 2.5); } }); return r; };
const baseDispose = G.dispose; G.dispose = function () { if (ENG._rgHud) ENG._rgHud = null; return baseDispose.apply(this, arguments); };
/* VR: floor, credits and boss health on the floating HUD */
G.vrHudExtra = function (rows) {
  const H = ENG._rgHud; if (!H) return; if (H.boss) rows.push({ t: H.boss.name + '  ' + Math.ceil(H.boss.hp / H.boss.max * 100) + '%', color: '#ff7ab8' });
  rows.push({ t: (H.run ? 'FLOOR ' + H.floor + '/' + H.floors + '   ' : '') + H.credits + ' credits', color: '#7ff0e4' });
};

/* ---------------- HUD elements: credits, floor, boss bar, upgrades ---------------- */
Object.assign(ENG.HUD_KINDS, { credits: 'Run credits', floor: 'Run floor', bossbar: 'Boss health bar', perks: 'Run upgrades' });
Object.assign(ENG.HUD_PROPS, { credits: { label: ['text', 'Label'] }, floor: { label: ['text', 'Label'] }, bossbar: { width: ['num', 120, 900, 5, 'Bar width'] }, perks: { label: ['text', 'Label'] } });
const baseHUD = ENG.buildHUD; ENG.buildHUD = function (root, hud) {
  const upd = baseHUD(root, hud), mine = [];
  (hud || []).forEach(w => { if (!['credits', 'floor', 'bossbar', 'perks'].includes(w.kind)) return; const d = root.querySelector('[data-id="' + w.id + '"]'); if (!d) return;
    if (w.kind === 'bossbar') d.innerHTML = '<div class="kz-bn"></div><div class="kz-bar" style="width:' + (w.width || 520) + 'px"><i style="background:' + w.color + '"></i></div>';
    else if (w.kind === 'credits') d.innerHTML = '<span>' + ENG.esc(w.label || '') + '</span><b></b>';
    else if (w.kind === 'floor') d.innerHTML = '<span>' + ENG.esc(w.label || '') + '</span><b></b><small></small>';
    else d.innerHTML = '<span>' + ENG.esc(w.label || '') + '</span><div class="kz-pl"></div>';
    mine.push({ w, d, b: d.querySelector('b'), s: d.querySelector('small'), i: d.querySelector('i'), n: d.querySelector('.kz-bn'), l: d.querySelector('.kz-pl') }); });
  return function (st) {
    upd(st); const H = ENG._rgHud;
    mine.forEach(m => { const k = m.w.kind; if (!H || (k === 'floor' && !H.run)) { m.d.style.visibility = st && st.design ? 'visible' : 'hidden'; return; }
      if (k === 'credits') { m.d.style.visibility = 'visible'; const t = String(H.credits); if (m.b.textContent !== t) m.b.textContent = t; }
      else if (k === 'floor') { m.d.style.visibility = 'visible'; m.b.textContent = H.inRun ? H.floor + ' / ' + H.floors : 'HUB'; m.s.textContent = H.inRun ? H.floorName : 'Step into the portal'; }
      else if (k === 'bossbar') { m.d.style.visibility = H.boss ? 'visible' : 'hidden'; if (H.boss) { m.n.textContent = H.boss.name; m.i.style.width = clamp(H.boss.hp / H.boss.max, 0, 1) * 100 + '%'; } }
      else { m.d.style.visibility = H.perks.length ? 'visible' : 'hidden'; const t = H.perks.slice(-8).join(' · '); if (m.l.textContent !== t) m.l.textContent = t; } });
  };
};
ENG.CSS += `.kz-credits span{display:block;font-size:12px;opacity:.75;letter-spacing:.06em}.kz-credits b{font-size:30px;font-weight:700;text-shadow:0 0 12px currentColor}
.kz-floor span{display:block;font-size:12px;opacity:.75;letter-spacing:.06em}.kz-floor b{font-size:24px;font-weight:700}.kz-floor small{display:block;font-size:12px;opacity:.8;letter-spacing:.08em;margin-top:2px}
.kz-bossbar{text-align:center}.kz-bn{font-size:16px;font-weight:700;letter-spacing:.12em;margin-bottom:5px;text-shadow:0 0 10px currentColor}.kz-bossbar .kz-bar{height:12px;margin:0 auto}
.kz-perks span{display:block;font-size:11px;opacity:.7;letter-spacing:.06em}.kz-pl{font-size:13px;white-space:normal;max-width:38vw;opacity:.9}`;

/* ---------------- Logic Tiles ---------------- */
if (ENG.Logic) {
  const L = ENG.Logic, R = (of, x) => Object.assign({ t: 'ref', of }, x || {});
  Object.assign(L.EVENTS, {
    floorStarts: { cat: 'Run', label: 'A new floor of the run starts', text: 'a new floor starts', params: {} },
    roomStarts: { cat: 'Run', label: 'An arena room locks', text: '{room} locks its doors', subject: 'room', params: { room: R(['arena'], { any: true }) } },
    roomCleared: { cat: 'Run', label: 'An arena room is cleared', text: '{room} is cleared', subject: 'room', params: { room: R(['arena'], { any: true }) } },
    bossDefeated: { cat: 'Run', label: 'A boss is defeated', text: '{boss} is defeated', subject: 'boss', params: { boss: R(['enemy'], { any: true }) } },
    perkTaken: { cat: 'Run', label: 'The player takes an upgrade', text: 'the player takes an upgrade', params: {} },
    runWon: { cat: 'Run', label: 'The run is won', text: 'the run is won', params: {} }
  });
  Object.assign(L.CONDS, {
    credits: { cat: 'Run', label: 'Check the run credits', text: 'the credits {cmp} {value}', params: { cmp: { t: 'cmp', type: 'num', d: 'ge' }, value: { t: 'val', type: 'num', d: 100 } }, test(c, p) { return L.compare('num', c.g.rgRun().credits, p.cmp, c.value(p.value, 'num')); } },
    floor: { cat: 'Run', label: 'Check which floor the run is on', text: 'the run is on floor {cmp} {value}', params: { cmp: { t: 'cmp', type: 'num', d: 'eq' }, value: { t: 'val', type: 'num', d: 1 } }, test(c, p) { return L.compare('num', c.g.rgRun().floor, p.cmp, c.value(p.value, 'num')); } }
  });
  Object.assign(L.ACTIONS, {
    giveCredits: { cat: 'Run', label: 'Give the player credits', text: 'give {n} credits', params: { n: { t: 'num', d: 50, min: -100000, max: 100000, step: 5 } }, run(c, p) { if (p.n >= 0) c.g.rgCredits(p.n); else c.g.rgRun().credits = Math.max(0, c.g.rgRun().credits + p.n); } },
    offerPerk: { cat: 'Run', label: 'Offer the player an upgrade', text: 'offer a choice of {n} upgrades', params: { n: { t: 'num', d: 3, min: 1, max: 5, step: 1 } }, run(c, p) { c.g.rgOffer(p.n); } },
    nextFloor: { cat: 'Run', label: 'Send the player to the next floor', text: 'go to the next floor', params: {}, run(c) { c.g.rgNext(); } },
    winRun: { cat: 'Run', label: 'Win the run', text: 'win the run', params: {}, run(c) { c.g.rgWin(); } }
  });
}
/* ---------------- Flow nodes ---------------- */
if (ENG.WKN) {
  const N = ENG.WKN;
  N.credits = { c: 'data', t: 'Credits', d: 'How many credits the player has.', i: [], o: [['value', 'num']], p: [] };
  N.runfloor = { c: 'data', t: 'Run floor', d: 'Which floor of the run the player is on.', i: [], o: [['value', 'num']], p: [] };
  N.givecredits = { c: 'action', t: 'Give credits', d: 'Adds credits to the run (use a minus number to take them).', i: [['in', 'exec']], o: [['out', 'exec']], p: [{ k: 'amount', ty: 'num', v: 25, l: 'Amount' }] };
  N.offerperk = { c: 'action', t: 'Offer an upgrade', d: 'Pauses and lets the player pick one of several upgrades.', i: [['in', 'exec']], o: [['out', 'exec']], p: [{ k: 'choices', ty: 'num', v: 3, l: 'Choices' }] };
  const wo = G.wkOut; G.wkOut = function (e, F, n) { if (n && n.type === 'credits') return this.rgRun().credits; if (n && n.type === 'runfloor') return this.rgRun().floor; return wo.apply(this, arguments); };
  const wr = G.wkRun; G.wkRun = function (e, F, n, inPin, cx) {
    if (!n || (n.type !== 'givecredits' && n.type !== 'offerperk')) return wr.apply(this, arguments); if (e._wkDead || (cx.steps = (cx.steps || 0) + 1) > 500) return;
    const g = k => this.wkVal(e, F, n, k, cx); if (n.type === 'givecredits') { const a = +g('amount') || 0; if (a >= 0) this.rgCredits(a, e.root.getWorldPosition(new THREE.Vector3())); else this.rgRun().credits = Math.max(0, this.rgRun().credits + a); } else this.rgOffer(clamp(+g('choices') || 3, 1, 5));
    this.wkFire(e, F, n, 'out', cx);
  };
}
})();
