/* SELF-TEST: opens every example project, visits every tab, plays each game for a moment, exports it and runs the
   exported file, opens old, damaged and newer-version project files, sculpts, enters VR (simulated), imports an HTML
   game and checks the safety net. Any thrown error, console error or wrong result fails the check that caused it.
   - File › Run self-test runs it here and puts your project back afterwards.
   - Index.html?selftest=1 runs it on load and writes the result into <pre id="vira-selftest"> and the page title.
   - python tools/smoke.py runs that in a headless browser (and CI runs smoke.py on every push). */
(function () {
'use strict';
const ENG = window.ENG, Ed = window.Ed; if (!Ed || !Ed.api) return;
const A = Ed.api, AUTO = /[?&]selftest\b/.test(location.search), REPORT = /[?&]report\b/.test(location.search) && /^https?:$/.test(location.protocol);
const T = Ed.selftest = { running: false, last: null };
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms, what) { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > ms) throw new Error('Timed out waiting for ' + what); await wait(30); } }
function ok(c, msg) { if (!c) throw new Error(msg); }
const fin = v => typeof v === 'number' && isFinite(v);
const tpl = name => { const t = A.templates.find(x => x[0].startsWith(name)); if (!t) throw new Error('Example project ' + name + ' is missing'); return t[2]; };

/* ---------------- error capture for the check that is running ---------------- */
let cur = null, muted = false; const IGNORE = /ResizeObserver loop|^Script error\.?$|AudioContext was not allowed|play\(\) request was interrupted|NotAllowedError/i;
const onErr = e => { if (cur && e.message && !IGNORE.test(e.message)) cur.push(e.message + (e.filename ? ' (line ' + e.lineno + ')' : '')); };
const onRej = e => { const r = e.reason, m = String(r && r.message || r); if (cur && !IGNORE.test(m)) cur.push('Unhandled: ' + m); };
let ce0 = null; const ceHook = function (...a) { try { const m = a.map(x => x && x.message ? x.message : String(x)).join(' '); if (cur && !muted && !IGNORE.test(m)) cur.push('console.error: ' + m.slice(0, 300)); } catch (x) { } return muted ? undefined : ce0.apply(console, a); };

/* ---------------- driving a game without waiting for the screen ---------------- */
/* headless browsers and hidden tabs may not draw frames, so the test steps the game loop itself */
function drive(g, frames) { for (let i = 0; i < frames && g.state !== 'gone'; i++) g.loopFn(g.last + 1000 / 60); }
async function startGame() {
  ok(!Ed.playing, 'A game was already running'); A.play(); ok(Ed.playing && Ed.game, 'Play did not start a game');
  const g = Ed.game; await Promise.race([g.ready, wait(30000)]); await until(() => Ed.game && Ed.game.state !== 'loading', 30000, 'the game to load');
  if (Ed.game.state === 'menu') Ed.game.begin(); return Ed.game;
}
async function playFor(label) {
  const g = await startGame(); ok(g.state === 'play', label + ': the game is in "' + g.state + '" instead of playing'); const P = g.player;
  drive(g, 10); const y0 = P.pos.y, t0 = g.time, f0 = g.renderer.info.render.frame;
  /* walk forward, look around and fire for a moment */
  const key = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code === 'KeyW' ? 'w' : code, bubbles: true }));
  key('keydown', 'KeyW'); drive(g, 40); key('keyup', 'KeyW'); g.mouse.l = true; drive(g, 20); g.mouse.l = false; drive(g, 20);
  ok(g.state !== 'gone', label + ': the game closed by itself'); ok(g.time > t0 + .5, label + ': game time did not move (' + g.time.toFixed(2) + ' s)');
  ok(fin(P.pos.x) && fin(P.pos.y) && fin(P.pos.z), label + ': the player position became NaN'); ok(P.pos.y > y0 - 4, label + ': the player fell through the world (' + y0.toFixed(1) + ' to ' + P.pos.y.toFixed(1) + ')');
  ok(g.renderer.info.render.frame > f0, label + ': nothing was drawn');
  if (g.state === 'play') { g.pause(); ok(g.state === 'pause', label + ': pause did not work'); } g.quit(); await wait(30); ok(!Ed.playing, label + ': the game did not return to the editor');
}

/* ---------------- tabs ---------------- */
const tabButtons = () => $$('#tabs [data-tab]').filter(b => b.style.display !== 'none' && b.offsetParent !== null);
async function visitTabs(label) {
  const seen = []; for (const b of tabButtons()) { const t = b.dataset.tab; b.click(); await wait(40); ok(b.getAttribute('aria-selected') === 'true', label + ': the ' + b.textContent.trim() + ' tab did not open'); seen.push(t); }
  const lv = $('#tabs [data-tab="level"]'); lv.click(); await wait(30); ok(Ed.tab === 'level', label + ': could not get back to the Level tab'); return seen;
}

/* ---------------- fixtures: project files from the past, damaged ones and ones from the future ---------------- */
function oldProject() {
  /* the shape of a first-version project: no format number, no models, sculpts or blueprints, the old colour grade */
  return { name: 'Old format test', objects: [{ id: 'f1', type: 'floor', name: 'Ground', p: [0, -.2, 0], r: [0, 0, 0], s: [20, .2, 20], props: { tile: 2 } }, { id: 'ps', type: 'player_start', name: 'Player start', p: [0, 0, 4], r: [0, 0, 0], props: {} }, { id: 'l1', type: 'light', name: 'Lamp', p: [0, 3, 0], props: {} }, { id: 'w1', type: 'wall', p: [0, 0, -8], s: [12, 3, .3] }],
    settings: { title: 'Old format test', look: 'noir', grade: { contrast: 1.2 } }, cutscenes: [], hud: [] };
}
function damagedProject() {
  return { name: '', v: 2, objects: [null, 7, { type: 'floor', id: 'x', p: [0, -.2, 0], s: [20, .2, 20], props: 'oops' }, { id: 'x', type: 'player_start', p: ['a', null, 3], props: {} }, { id: 'n', p: [1, 1, 1] }, { id: 'c', type: 'crate', p: [2, 0, 0], r: [0, 'nope'], s: [1, 1, 1], props: {}, logic: 'broken' }],
    models: [], sculpts: { s1: 5, s2: { recipe: { base: 'sphere', level: 2 } } }, settings: { gravity: 'fast', fov: null, title: 'Damaged' }, hud: 'x', cutscenes: { a: 1 }, blueprints: 'none', skins: 3, logic: 'gone' };
}
function futureProject() {
  const p = A.emptyProject(); p.name = 'Future test'; p.v = ENG.FORMAT + 3; p.engine = '9.0.0'; p.futureThing = { keep: true }; const o = ENG.newObject('crate'); o.p = [2, 0, -2]; p.objects.push(o, { id: 'h1', type: 'hologram_9000', name: 'Something new', p: [0, 1, -3], props: { glow: 2 } }); return p;
}

/* ---------------- the HTML game used for the import check ---------------- */
const HTML_GAME = '<!doctype html><html><head><meta charset="utf-8"><title>Self-test Blaster</title></head><body><canvas id="c" width="320" height="200"></canvas><script>\n' +
  '// Weapons the player can pick up\nconst WEAPONS = [\n  { name: "Pistol", damage: 10, rate: 0.3 },\n  { name: "Rifle", damage: 6, rate: 0.1 }\n];\nconst PLAYER_SPEED = 5;\nconst ENEMY_COLOR = "#ff3355";\n' +
  'let score = 0; const ctx = document.getElementById("c").getContext("2d"); function frame() { ctx.fillStyle = ENEMY_COLOR; ctx.fillRect(10, 10, PLAYER_SPEED * 4, 20); requestAnimationFrame(frame); } frame();\n<\/script></body></html>';

/* ---------------- the checks ---------------- */
function checks() {
  const L = [], add = (name, fn) => L.push({ name, fn });
  add('Engine and libraries are loaded', async () => {
    ok(window.THREE && THREE.REVISION === '128', 'three.js r128 is missing'); ok(window.CANNON, 'cannon.js is missing'); ok(typeof ENG.Game === 'function', 'The game runtime is missing');
    ok(typeof ENG.VERSION === 'string' && fin(ENG.FORMAT), 'The engine has no version number'); ok($('#kiln-runtime') && $('#kiln-runtime').textContent.length > 100000, 'The runtime source needed for export is missing');
    ['lib-three', 'lib-cannon', 'lib-gltf', 'lib-bloom', 'kiln-fonts'].forEach(id => ok(document.getElementById(id), 'Bundled file ' + id + ' is missing'));
    let last = 1; ENG.MIGRATIONS.forEach(m => { ok(m.to > last, 'Upgrade steps are out of order at format ' + m.to); last = m.to; }); ok(last === ENG.FORMAT, 'The newest upgrade step (' + last + ') does not match the format number (' + ENG.FORMAT + ')');
    ok(A.templates && A.templates.length >= 5, 'The example project list is missing');
  });
  add('Project files: first-version files upgrade', async () => {
    const p = ENG.migrate(oldProject()); ok(p.v === ENG.FORMAT, 'Format is ' + p.v + ' after the upgrade'); ok(p.models && p.sculpts && Array.isArray(p.blueprints), 'Newer project parts were not added');
    ok(p.objects.length === 4, 'Objects were lost (' + p.objects.length + ' of 4)'); Object.keys(ENG.DEFAULT_SETTINGS).forEach(k => ok(p.settings[k] !== undefined, 'Setting ' + k + ' is missing after the upgrade'));
    ok(p.settings.look === 'noir' && p.settings.lookTune && p.settings.lookTune.noir && p.settings.lookTune.noir.contrast === 1.2, 'The old colour grade was not carried over');
    ok(ENG.lastMigration.steps.length >= 1, 'No upgrade step ran'); ENG.lastMigration.seen = true;
  });
  add('Project files: damaged files are repaired', async () => {
    const p = ENG.migrate(damagedProject()), m = ENG.lastMigration; m.seen = true; ok(m.log.length >= 5, 'Only ' + m.log.length + ' repairs were reported');
    ok(p.name && Array.isArray(p.objects) && p.objects.every(o => o && o.type && typeof o.id === 'string'), 'Broken objects were left in'); ok(new Set(p.objects.map(o => o.id)).size === p.objects.length, 'Duplicate object ids were left in');
    ok(p.objects.every(o => o.p.every(fin) && (!o.r || o.r.every(fin)) && (!o.s || o.s.every(fin))), 'Broken numbers were left in'); ok(fin(p.settings.gravity) && fin(p.settings.fov), 'Broken settings were left in');
    ok(!Array.isArray(p.models) && Object.keys(p.sculpts).length === 0 && Array.isArray(p.hud) && Array.isArray(p.cutscenes) && Array.isArray(p.blueprints), 'Broken project parts were left in');
  });
  add('Project files: newer files open and keep what they do not know', async () => {
    const p = ENG.migrate(futureProject()), m = ENG.lastMigration; m.seen = true; ok(m.newer, 'A file from a newer Vira was not noticed'); ok(p.v === ENG.FORMAT + 3, 'The newer format number was lowered');
    ok(p.futureThing && p.futureThing.keep, 'Unknown project data was thrown away'); ok(p.objects.some(o => o.type === 'hologram_9000'), 'An unknown kind of object was thrown away');
  });
  add('Project files: anything else is refused clearly', async () => {
    for (const bad of [null, 'hello', 42, [1, 2]]) { let threw = null; try { ENG.migrate(bad); } catch (e) { threw = e; } ok(threw && /not a Vira project/.test(threw.message), 'Opening ' + JSON.stringify(bad) + ' did not give a clear error'); }
  });
  add('Project files: opening twice changes nothing', async () => {
    for (const [name, , fn] of A.templates) { const a = ENG.migrate(fn()); const j1 = JSON.stringify(a); const b = ENG.migrate(JSON.parse(j1)); ENG.lastMigration.seen = true; const strip = s => s.replace(/"savedAt":"[^"]*",?/g, ''); ok(strip(JSON.stringify(b)) === strip(j1), name + ' changes each time it is opened'); }
  });
  for (const [label, p] of [['first-version', oldProject], ['damaged', damagedProject], ['newer-version', futureProject]]) add('Project files: a ' + label + ' file opens, shows every tab and plays', async () => {
    await A.loadProject(p(), null); ENG.lastMigration && (ENG.lastMigration.seen = true); ok(Ed.project && Ed.project.objects.length, 'Nothing opened'); await visitTabs(label + ' file'); await playFor(label + ' file');
  });
  /* every example project */
  for (const [name, , fn] of A.templates) {
    add(name + ': opens clean and shows every tab', async () => {
      const p = fn(); ok(p && Array.isArray(p.objects), 'The template did not make a project'); await A.loadProject(p, null); const m = ENG.lastMigration; if (m) m.seen = true;
      ok(Ed.project.name, 'The project has no name'); ok(!m || !m.log.length, 'The template needed repairs: ' + (m && m.log.join('; '))); const issues = A.checkLevel(); ok(Array.isArray(issues), 'Check level failed');
      const tabs = await visitTabs(name); ok(tabs.length >= 8, 'Only ' + tabs.length + ' tabs were found');
      ok(A.undoFns, 'Undo is missing');
    });
    add(name + ': plays', async () => { await playFor(name); });
    add(name + ': exports and the exported file runs', async () => {
      const html = A.exportHTML(); ok(typeof html === 'string' && html.length > 500000 && html.includes('ENG.boot('), 'The export is incomplete'); const net = html.match(/(?:src|href)="(https?:\/\/[^"]+)"/); ok(!net, 'The export loads a file from the internet: ' + (net && net[1]));
      const back = window.VIRA_IMPORT.analyze(html).vira; ok(back && back.objects.length === Ed.project.objects.length, 'Importing the exported file did not give the same project back');
      await runExported(html, name);
    });
  }
  add('Editing: duplicate, undo and redo', async () => {
    await A.loadProject(tpl('Starter level')(), null); const n = Ed.project.objects.length, o = Ed.project.objects.find(x => x.type === 'crate' || x.type === 'barrel') || Ed.project.objects[Ed.project.objects.length - 1];
    A.select(o.id); A.duplicate(); ok(Ed.project.objects.length === n + 1, 'Duplicate did not add an object'); const u = A.undoFns(); u.undo(); ok(Ed.project.objects.length === n, 'Undo did not remove it'); u.redo(); ok(Ed.project.objects.length === n + 1, 'Redo did not bring it back');
  });
  add('Opening: a project that fails half way puts the previous one back', async () => {
    await A.loadProject(tpl('Starter level')(), null); const name = Ed.project.name, n = Ed.project.objects.length, orig = ENG.preloadModels; let res;
    muted = true; ENG.preloadModels = () => { throw new Error('planted failure'); };
    try { res = await A.loadProject(A.emptyProject(), null); } finally { ENG.preloadModels = orig; muted = false; }
    ok(res === false, 'The failure was not reported'); ok(Ed.project.name === name && Ed.project.objects.length === n, 'The previous project did not come back'); ok(Ed.modalOpen, 'Nothing told the user'); Ed.ui.closeModal();
    await A.loadProject(A.emptyProject(), null); ok(Ed.project.objects.length > 0, 'Opening still does not work afterwards');
  });
  add('Saving: browser save and reopen', async () => {
    await A.loadProject(tpl('Gameplay test')(), null); const n = Ed.project.objects.length; Ed.dirty = true; ok(A.saveLocal(true), 'Saving in the browser failed'); const slot = A.slotId; ok(slot, 'No save slot was given');
    const raw = localStorage.getItem('kiln.p.' + slot); ok(raw, 'The save is not in browser storage'); const p = JSON.parse(raw); ok(p.v === ENG.FORMAT && p.engine === ENG.VERSION && p.savedAt, 'The save is not stamped with its version');
    await A.loadProject(p, slot); ok(Ed.project.objects.length === n, 'The reopened project lost objects');
  });
  add('Model tab: sculpt, save and rebuild', async () => {
    await A.loadProject(A.emptyProject(), null); $('#tabs [data-tab="model"]').click(); await wait(60); ok(Ed.sculpt, 'Sculpt mode is missing'); Ed.sculpt.startScreen(); await wait(30);
    const base = $('.sc-base'); ok(base, 'The sculpt start screen did not show'); base.click(); await wait(60); const M = Ed.sculpt.mesh; ok(M && M.nv > 1000, 'No clay was made');
    const i = 0, before = [M.pos[i], M.pos[i + 1], M.pos[i + 2]], n = Ed.sculpt.dab({ x: before[0], y: before[1], z: before[2] }, .2, .6, 1, 'draw'); ok(n > 0, 'The brush changed nothing');
    ok(Math.hypot(M.pos[i] - before[0], M.pos[i + 1] - before[1], M.pos[i + 2] - before[2]) > 1e-4, 'The brush did not move the clay'); Ed.sculpt.save(true);
    const id = Object.keys(Ed.project.sculpts)[0]; ok(id, 'The sculpt was not saved into the project'); const d = Ed.project.sculpts[id]; ENG.SCULPT.forget(id); const dec = ENG.SCULPT.decode(d); ok(dec.pos.length === M.pos.length, 'The saved sculpt has the wrong size');
    let err = 0; for (let k = 0; k < M.pos.length; k += 97) err = Math.max(err, Math.abs(dec.pos[k] - M.pos[k])); ok(err < .01, 'The saved sculpt does not match (off by ' + err.toFixed(4) + ')');
    const geo = ENG.SCULPT.geometry(Ed.project, { mesh: id }); ok(geo && geo.attributes.position.count > 0, 'The game could not rebuild the sculpt'); Ed.sculpt.exit(true); await wait(30);
    const back = ENG.migrate(JSON.parse(JSON.stringify(Ed.project))); ENG.lastMigration.seen = true; ok(back.sculpts[id] && back.sculpts[id].p === d.p, 'The sculpt did not survive saving to a file');
    $('#tabs [data-tab="level"]').click(); await wait(30);
  });
  add('VR: a simulated headset enters, plays and exits', async () => {
    await A.loadProject(tpl('Neon Depths')(), null); const g = await startGame(); ok(typeof g.enterVR === 'function', 'VR support is missing'); await g.enterVR(true); drive(g, 30);
    ok(g.vr && g.vr.on && g.vr.sim, 'VR did not start'); ok(fin(g.player.pos.x) && fin(g.player.pos.y), 'The player position broke in VR'); g.exitVR(); drive(g, 10); ok(!g.vr || !g.vr.on, 'VR did not stop'); g.quit(); await wait(30); ok(!Ed.playing, 'The game did not return to the editor');
  });
  add('HTML games: import, edit and rebuild', async () => {
    await A.importHTMLText(HTML_GAME, 'selftest-blaster.html'); await wait(60); Ed.ui.closeModal(); const g = Ed.project.htmlGame; ok(g && g.html === HTML_GAME, 'The game was not imported');
    const an = window.VIRA_IMPORT.analyze(HTML_GAME); ok(an.tables.some(t => t.name === 'WEAPONS'), 'The WEAPONS table was not found'); ok(an.consts.some(c => c.name === 'PLAYER_SPEED'), 'The PLAYER_SPEED setting was not found');
    const gb = $('#tabs [data-tab="game"]'); ok(gb && gb.style.display !== 'none', 'The Game tab did not appear'); gb.click(); await wait(40); ok(Ed.tab === 'game', 'The Game tab did not open');
    A.gameEdit(['PLAYER_SPEED'], 7, 5); const out = A.buildHTMLGame(); ok(/PLAYER_SPEED\s*=\s*7\b/.test(out), 'The edit was not written into the game'); ok(/ENEMY_COLOR\s*=\s*"#ff3355"/.test(out), 'Untouched code changed');
    $('#tabs [data-tab="level"]').click(); await wait(30);
  });
  /* the Build tab: modes, kit pieces, smart rooms, generators, sections, buildings, play and export */
  const studio = async () => { await A.loadProject(A.emptyProject(), null); $('#tabs [data-tab="rooms"]').click(); await wait(80); ok(Ed.studio && Ed.studio.on, 'The Build tab did not open its studio'); Ed.studio.room.door = false; return Ed.studio; };
  add('Build tab: every mode opens with its library', async () => {
    const S = await studio(); for (const m of ['rooms', 'kit', 'buildings', 'generate']) { S.setMode(m); await wait(60); ok($('.bs-p'), m + ': the studio panel is missing'); ok($('.bs-dock .bs-list'), m + ': the library is missing'); ok($$('.bs-dock .bs-card, .bs-dock .bs-gcard').length >= 3, m + ': the library is empty'); ok($('.bs-hud'), m + ': the status strip is missing'); }
    S.setMode('kit'); await until(() => $$('.bs-dock img.bs-ok').length >= 4, 20000, 'piece thumbnails');
    /* hiding and showing the library must leave the page whole */
    const was = S.dock, full = () => { const r = document.body.getBoundingClientRect(); return r.width >= innerWidth - 2 && r.height >= innerHeight - 2; };
    for (const v of [!was, was]) { const t = $('.bs-dmin'); ok(t, 'The hide library button is missing'); t.click(); await wait(60); ok(S.dock === v, 'The library did not ' + (v ? 'open' : 'hide')); ok(full(), 'The page lost its size when the library was ' + (v ? 'opened' : 'hidden')); ok($('#vpWrap').getBoundingClientRect().width > 200, 'The 3D view collapsed'); }
    $('#tabs [data-tab="level"]').click(); await wait(60); ok(!Ed.studio.on && !$('.bs-dock'), 'The studio did not close when leaving the tab');
  });
  add('Build tab: every piece builds in every style, with collision', async () => {
    let n = 0; for (const st of ENG.KIT.styles) for (const pc of Object.keys(ENG.KIT_PIECES)) { const o = ENG.kitObject(pc, st, [0, 0, 0], 0, 4, 3), g = ENG.build(o, { project: Ed.project, editor: false }); let vis = 0, col = 0; g.traverse(m => { if (m.isMesh) { if (m.userData.kitCol) col++; else vis++; } }); ok(vis > 0, pc + ' in ' + st + ' has nothing to see'); if (/^(wall|post|floor|ceiling|column|railing|beam|cave_rock|road|sidewalk)/.test(pc)) ok(col > 0, pc + ' in ' + st + ' has no collision'); n++; }
    ok(n >= 150, 'Only ' + n + ' pieces were checked');
  });
  add('Build tab: smart rooms, doorway cutting, corner posts and restyling', async () => {
    const S = await studio(); S.setMode('kit'); const kits = () => Ed.project.objects.filter(o => o.type === 'kit'), count = p => kits().filter(o => o.props.piece === p).length;
    S.fillRoom(0, 0, 2, 1); ok(count('floor') === 6, 'The room has ' + count('floor') + ' floor squares, not 6'); ok(count('post') === 4, 'The room has ' + count('post') + ' corner posts, not 4'); const walls = kits().filter(o => /^wall/.test(o.props.piece)).length; ok(walls === 10, 'The room has ' + walls + ' walls, not 10');
    S.fillRoom(3, 0, 4, 1); ok(kits().filter(o => Math.abs(o.p[0] - 12) < .01 && o.props.piece === 'wall_door').length === 1, 'The two rooms were not joined by one doorway'); ok(!kits().some(o => Math.abs(o.p[0] - 12) < .01 && /window/.test(o.props.piece)), 'A window was left between the two rooms');
    const w = kits().find(o => o.props.piece === 'wall' && Math.abs(o.p[2]) < .01); ok(w, 'No plain wall on the north side'); S.place([{ piece: 'door', x: w.p[0], y: 0, z: w.p[2], ry: w.r[1] }]); ok(!Ed.project.objects.includes(w), 'Placing a doorway on a wall did not replace it');
    const dw = kits().find(o => o.props.piece === 'wall_door' && Math.abs(o.p[0] - w.p[0]) < .01 && Math.abs(o.p[2]) < .01); ok(dw, 'The doorway is missing'); ok(Ed.project.objects.some(o => o.type === 'door' && o.props.kitLink === dw.id), 'The doorway has no door');
    const p0 = count('post'); S.removeIds([dw.id]); S.joinCorners([0]); ok(!Ed.project.objects.some(o => o.type === 'door' && o.props.kitLink === dw.id), 'Removing a doorway left its door behind'); ok(count('post') > p0 && [w.p[0] - 2, w.p[0] + 2].every(x => kits().some(o => o.props.piece === 'post' && Math.abs(o.p[0] - x) < .05 && Math.abs(o.p[2]) < .05)), 'Posts did not appear at the open wall ends (' + p0 + ' to ' + count('post') + ')');
    S.style = 'horror'; S.restyle(() => true, 'Everything'); ok(kits().every(o => o.props.style === 'horror'), 'Restyling missed some pieces');
  });
  add('Build tab: every generator builds a section, and one section rebuilds alone', async () => {
    const S = await studio(); S.setMode('generate'); const hand = ENG.kitObject('wall', 'modern', [-20, 0, -20], 0, 4, 3); Ed.project.objects.push(hand); Ed.bs.addRoot(hand); let x = 0; const made = [];
    for (const k of Object.keys(ENG.WORLDGEN.kinds)) { const r = S.generate(k, Object.assign(ENG.WORLDGEN.defaults(k), { seed: 99, w: k === 'building' ? 2 : 10, d: k === 'building' ? 2 : 10, at: [x, 0, 0] })); ok(r && r.res.objs.length > 10, k + ' made nothing'); made.push(r.sec); x += 60; }
    const [a, b] = made, bIds = Ed.project.objects.filter(o => o.sec === b.id).map(o => o.id).join(), seedA = a.cfg.seed; S.regen(a, true); ok(a.cfg.seed !== seedA, 'The section kept its old seed');
    ok(Ed.project.objects.filter(o => o.sec === b.id).map(o => o.id).join() === bIds, 'Rebuilding one section changed another'); ok(Ed.project.objects.includes(hand), 'Rebuilding a section removed a hand-made piece');
    a.locked = true; const n = Ed.project.objects.length; S.regen(a, true); ok(Ed.project.objects.length === n, 'A locked section was rebuilt'); a.locked = false;
    S.detach(b); ok(!Ed.project.objects.some(o => o.sec === b.id) && !S.sections().includes(b), 'Keeping a section as hand-made did not let it go'); S.dropSec(a); ok(!Ed.project.objects.some(o => o.sec === a.id), 'Removing a section left pieces behind');
    const back = ENG.migrate(JSON.parse(JSON.stringify(Ed.project))); ENG.lastMigration.seen = true; ok(back.build && back.build.sections.length === S.sections().length, 'Sections did not survive saving to a file');
  });
  add('Build tab: buildings, saved sections and stamping', async () => {
    const S = await studio(); S.setMode('buildings'); Object.assign(S.bld, { floors: 3, roof: 'gable', style: 'medieval' }); const r = S.makeBuilding(0, 0, 2, 2); ok(r && r.res.info.floors === 3, 'The building was not made');
    const ys = new Set(Ed.project.objects.filter(o => o.sec === r.sec.id && o.type === 'kit' && o.props.piece === 'floor').map(o => o.p[1])); ok(ys.size === 3, 'The building has ' + ys.size + ' floors, not 3'); ok(Ed.project.objects.some(o => o.sec === r.sec.id && /stairs/.test(o.props.piece || '')), 'The building has no stairs');
    const piece = Ed.project.objects.find(o => o.sec === r.sec.id && o.type === 'kit'); Ed.bs.select(piece.id); S.saveSection(); const lib = Ed.project.build.library; ok(lib.length === 1, 'The section was not saved');
    const n = Ed.project.objects.length, out = S.stampAt(lib[0], 40, 0, 0, 1); ok(out.length === lib[0].objs.length && Ed.project.objects.length === n + out.length, 'Stamping did not copy the section'); ok(out.every(o => Ed.objs.get(o.id)), 'Stamped copies are not in the level');
  });
  add('Build tab: a generated level plays, blocks the player and exports', async () => {
    const S = await studio(); S.setMode('generate'); const r = S.generate('dungeon', Object.assign(ENG.WORLDGEN.defaults('dungeon'), { seed: 5, w: 12, d: 12, at: [0, 0, 0], start: true, live: true })); ok(r && r.sec.live, 'The live section was not made'); ok(Ed.project.objects.some(o => o.type === 'player_start'), 'No player start');
    const before = Ed.project.objects.filter(o => o.sec === r.sec.id).map(o => o.p.join()).sort().join('|'); $('#tabs [data-tab="level"]').click(); await wait(40);
    const g = await startGame(), now = g.project.objects.filter(o => o.sec === r.sec.id).map(o => o.p.join()).sort().join('|'); ok(now && now !== before, 'A live section did not get a new layout when the game started'); ok(g.kitBatches > 0, 'Kit pieces were not batched'); ok(g.cols.length > 50, 'The generated level has almost no collision');
    drive(g, 30); ok(fin(g.player.pos.x) && g.player.pos.y > -3, 'The player fell out of the generated level'); g.quit(); await wait(30);
    const html = A.exportHTML(); ok(html.includes('KIT_PIECES') && html.includes('WORLDGEN'), 'The export is missing the kit or the generator'); await runExported(html, 'Generated level');
  });
  /* the UI tab and the screens it makes */
  add('UI tab: screens, library, stage, inspector and snapping', async () => {
    await A.loadProject(tpl('Starter level')(), null); $('#tabs [data-tab="hud"]').click(); await wait(150); const T = Ed.uib; ok(T && Ed.tab === 'hud', 'The UI tab did not open');
    ok($('.ub-scr .ub-sc'), 'No screens list'); ok($$('.ub-card').length > 8, 'The element library is empty'); ok($('.ub-frame .kz-w'), 'The stage shows no HUD elements'); ok($('#hRight .bs-c'), 'The right panel is empty');
    const scr = T.screens(); ok(scr.length >= 9, 'The starter level should come with its screens (' + scr.length + ')');
    for (const s of scr) { T.setScreen(s.id); await wait(40); ok($('.ub-frame'), s.name + ': the stage is missing'); ok($$('.ub-frame .kz-w').length === s.items.length, s.name + ': ' + $$('.ub-frame .kz-w').length + ' of ' + s.items.length + ' elements drawn'); }
    T.setScreen('hud'); const n = T.items().length, w = T.addItem('text'); ok(T.items().length === n + 1 && T.sel[0] === w.id, 'Adding an element failed'); ok($$('#hRight .bs-ct').length >= 5, 'The inspector did not open for the new element');
    T.dupSel(); ok(T.items().length === n + 2, 'Duplicate failed'); T.removeSel(); ok(T.items().length === n + 1, 'Remove failed'); T.sel = [w.id]; T.removeSel(); ok(T.items().length === n, 'Remove failed');
    const sn = T.snapPos(50.6, 30, [], null); ok(Math.abs(50.6 + sn.dx - 50) < 1e-6 && sn.guides.length === 1, 'Snapping to the centre line failed'); T.play = true; T.render(); await wait(300); ok($('.ub-frame.ub-play'), 'The preview did not start'); T.play = false; T.render();
    $('#tabs [data-tab="level"]').click(); await wait(40);
  });
  add('UI: every element kind builds in every theme, with effects and animations', async () => {
    const root = document.createElement('div'); root.className = 'kz-hud'; root.style.cssText = 'position:fixed;left:-3000px;top:0;width:1280px;height:720px'; document.body.append(root); let n = 0;
    try { for (const tid of Object.keys(ENG.UI.THEMES)) { const T = ENG.UI.THEMES[tid], items = Object.keys(ENG.HUD_KINDS).map((k, i) => Object.assign(ENG.UI.newWidget(k, T), { x: 10 + (i % 8) * 11, y: 10 + Math.floor(i / 8) * 20, anim: ['fade', 'up', 'pop', 'type'][i % 4], idle: ['pulse', 'float', 'glow', 'none'][i % 4], shadow: ['soft', 'neon', 'long', 'none'][i % 4], bg: ['box', 'bubble', 'burst', 'none'][i % 4], stroke: i % 3, halftone: i % 2 === 0, grad: i % 2 ? '#ff0000' : '' }));
      const upd = ENG.buildHUD(root, items, { project: Ed.project, design: true, theme: T }); upd(Ed.uib.sampleState()); items.forEach(w => { const d = root.querySelector('[data-id="' + w.id + '"]'); ok(d, w.kind + ' in ' + tid + ' was not built'); ok(d.children.length || d.textContent, w.kind + ' in ' + tid + ' is empty'); n++; }); } } finally { root.remove(); }
    ok(n >= 150, 'Only ' + n + ' elements were checked'); const names = ENG.UI.iconNames(); ok(names.length >= 50, 'Only ' + names.length + ' stickers'); names.forEach(nm => ok(ENG.UI.icon(nm).includes('<svg'), 'Sticker ' + nm + ' did not draw'));
    ['rect', 'circle', 'diamond', 'hex', 'triangle', 'star', 'burst', 'line', 'ring', 'bubble', 'ribbon', 'arrow', 'plate', 'badge', 'shield'].forEach(s => ok(ENG.UI.shapeSVG({ shape: s, w: 100, h: 60 }, ENG.UI.THEMES.arcade).includes('<path') || ENG.UI.shapeSVG({ shape: s, w: 100, h: 60 }, ENG.UI.THEMES.arcade).includes('<rect') || ENG.UI.shapeSVG({ shape: s, w: 100, h: 60 }, ENG.UI.THEMES.arcade).includes('<ellipse'), 'Shape ' + s + ' is empty'));
  });
  add('UI: themes restyle every screen, fonts import, screens export', async () => {
    await A.loadProject(tpl('Starter level')(), null); const U = ENG.UI, p = Ed.project; U.applyTheme(p, Object.assign({ id: 'neon' }, U.THEMES.neon)); const btn = p.ui.screens.find(s => s.kind === 'main').items.find(w => w.kind === 'button'); ok(btn.color === U.THEMES.neon.accent && btn.shape === 'glass', 'The theme did not restyle the main menu buttons');
    const id = Ed.uib.importFontData('Test font', 'data:font/woff2;base64,AAAA'); ok(p.ui.fonts[id] && document.getElementById('kz-uifonts') && document.getElementById('kz-uifonts').textContent.includes('VF-' + id), 'The imported font was not registered'); ok(U.fontFamily('font:' + id, p).includes('VF-' + id), 'The imported font family is not used'); delete p.ui.fonts[id];
    const html = A.exportHTML(); ok(html.includes('ENG.UI') && html.includes('"screens"'), 'The export is missing the screens'); const back = ENG.migrate(JSON.parse(JSON.stringify(p))); ENG.lastMigration.seen = true; ok(back.ui.screens.length === p.ui.screens.length, 'Screens did not survive saving to a file');
  });
  add('UI in play: main menu, keyboard and gamepad focus, pause, settings, inventory, dialogue, death', async () => {
    await A.loadProject(tpl('Starter level')(), null); const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:960px;height:540px;opacity:0;pointer-events:none;z-index:-1'; document.body.append(host); const pads = Object.getOwnPropertyDescriptor(navigator, 'getGamepads'); let g = null;
    try {
      g = new ENG.Game(host, Ed.project, { onExit: () => { } }); await Promise.race([g.ready, wait(30000)]); await until(() => g.state !== 'loading', 30000, 'the game to load'); await wait(900); const step = n => { for (let i = 0; i < n; i++) g.loopFn(g.last + 1000 / 60); }, top = () => g.uiTop() ? g.uiTop().screen.kind : null, foc = () => g.uiFocus ? g.uiFocus.textContent.replace(/\s+/g, ' ').trim() : '';
      step(3); ok(g.state === 'menu' && top() === 'main', 'The designed main menu did not show (' + g.state + ', ' + top() + ')'); ok(/Play/.test(foc()), 'Play is not focused first (' + foc() + ')');
      g.uiKey({ code: 'ArrowDown' }); ok(/Settings/.test(foc()), 'Arrow down did not move the focus'); const fake = { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }; Object.defineProperty(navigator, 'getGamepads', { value: () => [fake], configurable: true }); const tap = i => { fake.buttons[i].pressed = true; step(1); fake.buttons[i].pressed = false; step(1); };
      tap(12); ok(/Play/.test(foc()), 'The gamepad d-pad did not move the focus'); tap(0); step(2); ok(g.state === 'play' && !top(), 'The gamepad A button did not start the game'); if (g.cut) g.endCutscene(); step(2);
      const z0 = g.player.pos.z; fake.axes[1] = -1; step(60); fake.axes[1] = 0; step(2); ok(Math.abs(g.player.pos.z - z0) > 1, 'The left stick did not move the player');
      tap(9); ok(g.state === 'pause' && top() === 'pause', 'Start did not pause'); g.uiAction('settings'); ok(top() === 'settings' && g.uiStack.length === 2, 'Settings did not open over the pause screen'); g.uiFocusFirst(); const m0 = g.project.mixer.master; g.uiKey({ code: 'ArrowLeft' }); ok(g.project.mixer.master < m0, 'A setting did not change with the keyboard'); ok(localStorage.getItem(g.uiSettingsKey()), 'The setting was not remembered');
      tap(1); ok(top() === 'pause', 'B did not go back'); g.uiKey({ code: 'Escape' }); ok(g.state === 'play' && !top(), 'Escape did not resume');
      g.onKey({ code: 'Tab', preventDefault() { } }); step(1); ok(top() === 'inventory' && g.uiTop().el.querySelectorAll('.kz-slot.full').length >= 2, 'Tab did not open the inventory with items'); g.uiKey({ code: 'Escape' }); ok(g.state === 'play', 'Escape did not close the inventory');
      let chose = 0; g.showDialogue({ speaker: 'Guide', text: 'Hello there.', choices: [{ label: 'Hi', fn: () => { chose = 1; } }, { label: 'Bye' }] }); step(1); ok(top() === 'dialogue' && g.reading, 'The dialogue did not show'); step(10); ok(g.dlg.shown > 0 && g.dlg.shown < 12, 'The text is not typed out over time'); g.dlgAdvance(); step(3); ok(g.uiTop().el.querySelectorAll('.kz-choice').length === 2, 'The choices did not appear'); g.uiFocusFirst(); g.uiKey({ code: 'Enter' }); step(2); ok(chose === 1 && !g.dlg && !g.reading && !top(), 'Choosing did not close the dialogue');
      ENG.Logic.ACTIONS.dialogue.run({ g, fmt: s => s }, { speaker: 'A', text: 'B', portrait: 'icon:eye' }); ok(g.dlg && g.dlg.text === 'B', 'The Logic action did not show dialogue'); g.dlgAdvance(); g.dlgAdvance(); step(2);
      g.hurtPlayer(9999); step(3); ok(g.state === 'dead' && top() === 'dead', 'The death screen did not show'); ok(/survived/.test(g.uiTop().el.innerText), 'The death screen is missing its stats'); ok(parseFloat(g.hudEl.style.getPropertyValue('--k')) > 0, 'The HUD has no size scale');
    } finally { try { g && g.dispose(); } catch (x) { } host.remove(); if (pads) Object.defineProperty(navigator, 'getGamepads', pads); else delete navigator.getGamepads; }
  });
  add('Search: Ctrl+K opens and closes', async () => {
    const k = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true, bubbles: true })); k(); await wait(40); const p = $('.vt-cmdk'); ok(p, 'The search box did not open'); ok($$('.it', p).length > 10, 'The search box is empty');
    const inp = $('input', p); inp.value = 'sound'; inp.dispatchEvent(new Event('input')); await wait(20); ok($$('.it', p).length > 0, 'Searching found nothing'); inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(30); ok(!$('.vt-cmdk'), 'Escape did not close it');
  });
  add('Safety net: recovery storage, history and autosave', async () => {
    const S = Ed.safety; ok(S, 'The safety net is missing'); const H = await S.listHistory(); ok(Array.isArray(H), 'Version history could not be read');
    await S.kvSet('selftest', { ok: 1, t: Date.now() }); const back = await S.kvGet('selftest'); ok(back && back.ok === 1, 'Recovery storage did not keep a value'); await S.kvDel('selftest');
    await A.loadProject(A.emptyProject(), null); Ed.ui.markDirty(); ok(Ed.dirty, 'Changes are not noticed'); await S.autosave(true); ok(!Ed.dirty && A.slotId && localStorage.getItem('kiln.p.' + A.slotId), 'Autosave did not save');
    ok(typeof S.history === 'function' && typeof S.backupAll === 'function' && typeof S.report === 'function', 'Safety tools are missing from the File menu');
  });
  return L;
}

/* the exported file, run for a moment in a hidden frame */
async function runExported(html, label) {
  const guard = '<script>window.__st=[];addEventListener("error",function(e){__st.push(String(e.message))});(function(){var c=console.error;console.error=function(){__st.push("console.error: "+[].map.call(arguments,String).join(" "));return c.apply(console,arguments)}})();<\/script>';
  /* srcdoc keeps the frame on this page's origin, also when Vira runs from a file:// address */
  const fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;left:0;top:0;width:480px;height:300px;opacity:0;pointer-events:none;border:0;z-index:-1'; fr.srcdoc = html.replace('<head>', '<head>' + guard); document.body.append(fr);
  try {
    await until(() => fr.contentWindow && fr.contentWindow.GAME, 30000, 'the exported game to start'); const W = fr.contentWindow, g = W.GAME; await Promise.race([g.ready, wait(30000)]);
    await until(() => W.GAME.state !== 'loading', 30000, 'the exported game to load'); const G = W.GAME; if (G.state === 'menu') G.begin(); const t0 = G.time; for (let i = 0; i < 40; i++) G.loopFn(G.last + 1000 / 60);
    ok(G.state === 'play', label + ' export: the game is in "' + G.state + '" instead of playing'); ok(G.time > t0, label + ' export: game time did not move'); ok(fin(G.player.pos.y), label + ' export: the player position broke');
    const errs = (W.__st || []).filter(m => !IGNORE.test(m)); ok(!errs.length, label + ' export: ' + errs[0]);
    try { G.dispose(); } catch (x) { }
  } finally { fr.remove(); }
}

/* ---------------- running ---------------- */
function snapLS() { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^(kiln|vira)\./.test(k)) o[k] = localStorage.getItem(k); } } catch (x) { } return o; }
function restoreLS(o) { try { const now = []; for (let i = 0; i < localStorage.length; i++) now.push(localStorage.key(i)); now.forEach(k => { if (/^(kiln|vira)\./.test(k) && !(k in o)) localStorage.removeItem(k); }); Object.keys(o).forEach(k => { if (localStorage.getItem(k) !== o[k]) localStorage.setItem(k, o[k]); }); } catch (x) { } }
const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(what + ' took longer than ' + ms / 1000 + ' s')), ms))]);

T.run = async function (opt) {
  opt = opt || {}; if (T.running) throw new Error('The self-test is already running'); T.running = true; const t0 = performance.now(), results = [];
  const keep = Ed.project ? { json: JSON.stringify(Ed.project), slot: A.slotId, dirty: Ed.dirty, tab: Ed.tab, ls: snapLS() } : null;
  if (keep && keep.dirty && Ed.safety) try { await Ed.safety.writeRecovery('before the self-test'); } catch (x) { }
  ce0 = console.error; console.error = ceHook; addEventListener('error', onErr); addEventListener('unhandledrejection', onRej);
  const list = checks().filter(c => !opt.only || opt.only.test(c.name));
  try {
    for (let i = 0; i < list.length; i++) {
      const c = list[i], errs = []; cur = errs; const s = performance.now(); let pass = true, msg = '';
      if (opt.progress) try { opt.progress(i, list.length, c.name); } catch (x) { }
      try { await withTimeout(c.fn(), 90000, c.name); await wait(20); } catch (e) { pass = false; msg = String((e && e.message) || e); if (e && e.stack) errs.unshift(e.stack.split('\n').slice(0, 3).join(' | ')); }
      cur = null; if (pass && errs.length) { pass = false; msg = 'Errors happened: ' + errs[0]; }
      /* never leave a game, sculpt, search box or dialog open for the next check */
      try { if (Ed.playing && Ed.game) Ed.game.quit(); } catch (x) { } try { if (Ed.sculpt && Ed.sculpt.state.on) Ed.sculpt.exit(false); } catch (x) { } try { if ($('.vt-cmdk')) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })); } catch (x) { } if (Ed.modalOpen) Ed.ui.closeModal();
      const r = { name: c.name, ok: pass, ms: Math.round(performance.now() - s), msg, errors: errs.slice(0, 4) }; results.push(r); if (opt.each) try { opt.each(r, i, list.length); } catch (x) { }
    }
  } finally {
    console.error = ce0; removeEventListener('error', onErr); removeEventListener('unhandledrejection', onRej); cur = null;
    if (keep) { restoreLS(keep.ls); try { await A.loadProject(JSON.parse(keep.json), keep.slot); if (ENG.lastMigration) ENG.lastMigration.seen = true; Ed.dirty = keep.dirty; const s = $('#saveState'); if (s && keep.dirty) s.textContent = 'Unsaved changes'; const b = $('#tabs [data-tab="' + keep.tab + '"]'); if (b && b.style.display !== 'none' && keep.tab !== 'level') b.click(); } catch (e) { console.warn('Self-test: could not put the project back', e); } }
    T.running = false;
  }
  const failed = results.filter(r => !r.ok).length, out = { ok: failed === 0 && results.length > 0, passed: results.length - failed, failed, total: results.length, ms: Math.round(performance.now() - t0), engine: ENG.VERSION, format: ENG.FORMAT, browser: navigator.userAgent, t: Date.now(), results };
  T.last = out; return out;
};

/* ---------------- File › Run self-test ---------------- */
T.runUI = function () {
  if (T.running) return; const U = Ed.ui, h = U.h;
  U.modal('Run self-test', h('div', null, h('p', null, 'Vira opens every example project, visits every tab, plays each game for a moment, exports it, and checks old and damaged project files, sculpting, VR, HTML import and the safety net.'),
    h('p', { class: 'dim', style: 'font-size:12.5px' }, 'It takes about a minute. Your project is put back exactly as it is when the test ends (undo history starts fresh).')), [['Cancel'], ['Run it', () => { setTimeout(go, 30); }, 'primary']]);
  async function go() {
    const pane = h('div', { class: 'st-pane' }), card = h('div', { class: 'st-card' }), head = h('div', { class: 'st-head' }, h('b', null, 'Self-test'), h('span', { class: 'dim' }, 'Starting')), bar = h('div', { class: 'st-bar' }, h('i')), list = h('div', { class: 'st-list' });
    card.append(head, bar, list); pane.append(card); document.body.append(pane);
    const res = await T.run({ progress: (i, n, name) => { head.lastChild.textContent = (i + 1) + ' of ' + n + ': ' + name; bar.firstChild.style.width = (100 * i / n) + '%'; },
      each: r => { list.prepend(h('div', { class: 'st-row ' + (r.ok ? 'ok' : 'bad') }, h('i'), h('span', null, r.name), h('small', null, r.ok ? r.ms + ' ms' : r.msg))); } }).catch(e => ({ ok: false, failed: 1, total: 1, passed: 0, ms: 0, results: [{ name: 'Self-test', ok: false, msg: e.message }] }));
    bar.firstChild.style.width = '100%'; card.classList.add(res.ok ? 'pass' : 'fail'); head.firstChild.textContent = res.ok ? 'All ' + res.total + ' checks passed' : res.failed + ' of ' + res.total + ' checks failed';
    head.lastChild.textContent = (res.ms / 1000).toFixed(1) + ' s'; list.innerHTML = ''; res.results.slice().sort((a, b) => a.ok - b.ok).forEach(r => list.append(h('div', { class: 'st-row ' + (r.ok ? 'ok' : 'bad') }, h('i'), h('span', null, r.name), h('small', null, r.ok ? r.ms + ' ms' : r.msg))));
    const text = (res.ok ? 'PASS' : 'FAIL') + ' Vira ' + ENG.VERSION + ' self-test, ' + res.passed + '/' + res.total + '\n' + res.results.map(r => (r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : '\n     ' + r.msg + (r.errors && r.errors.length ? '\n     ' + r.errors.join('\n     ') : ''))).join('\n');
    card.append(h('div', { class: 'mrow' }, h('button', { class: 'btn', onclick: () => { try { navigator.clipboard.writeText(text); U.toast('Copied'); } catch (x) { } } }, 'Copy results'), h('button', { class: 'btn primary', onclick: () => pane.remove() }, 'Close')));
  }
};
document.head.append(Object.assign(document.createElement('style'), { textContent: `.st-pane{position:fixed;inset:0;z-index:9000;background:rgba(6,8,11,.62);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px)}
.st-card{width:min(620px,92vw);max-height:82vh;display:flex;flex-direction:column;gap:10px;padding:18px 18px 14px;border-radius:14px;background:var(--panel,#15181d);border:1px solid var(--line,rgba(255,255,255,.1));box-shadow:0 20px 60px rgba(0,0,0,.5)}
.st-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}.st-head b{font:600 15px var(--fd,inherit)}.st-head span{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}
.st-bar{height:3px;border-radius:2px;background:rgba(255,255,255,.07);overflow:hidden}.st-bar i{display:block;height:100%;width:0;background:var(--accent,#5aa9ff);transition:width .25s}
.st-card.pass .st-bar i{background:#3ecf8e}.st-card.fail .st-bar i{background:#ff5d5d}.st-card.pass .st-head b{color:#3ecf8e}.st-card.fail .st-head b{color:#ff6b6b}
.st-list{overflow:auto;display:flex;flex-direction:column;gap:3px;min-height:120px}.st-row{display:grid;grid-template-columns:10px 1fr auto;gap:9px;align-items:center;padding:6px 8px;border-radius:7px;font-size:12.5px}
.st-row i{width:8px;height:8px;border-radius:50%;background:#3ecf8e}.st-row.bad{background:rgba(255,93,93,.08)}.st-row.bad i{background:#ff5d5d}.st-row small{color:var(--dim,#8b93a0);font-size:11.5px;text-align:right;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.st-row.bad small{color:#ff9b9b;white-space:normal}` }));

/* ---------------- Index.html?selftest=1 ---------------- */
/* headless runs draw in software, so the game plays in a small window there to keep the run quick */
if (AUTO) document.head.append(Object.assign(document.createElement('style'), { textContent: '#playLayer{inset:auto!important;left:0!important;top:0!important;width:640px!important;height:400px!important}' }));
if (AUTO) (function auto() {
  if (!Ed.project || !$('#projName') || !$('#projName').value) { setTimeout(auto, 200); return; }
  const post = (path, body) => { if (REPORT) try { fetch(path, { method: 'POST', body: JSON.stringify(body) }).catch(() => {}); } catch (x) { } };
  setTimeout(async () => {
    const only = new URLSearchParams(location.search).get('only'); post('/__selftest/progress', { i: -1, name: 'starting' });
    let res; try { res = await T.run({ only: only ? new RegExp(only, 'i') : null, progress: (i, n, name) => post('/__selftest/progress', { i, n, name }), each: r => post('/__selftest/check', r) }); } catch (e) { res = { ok: false, failed: 1, total: 1, passed: 0, results: [{ name: 'Self-test', ok: false, msg: String(e && e.message || e) }] }; }
    const pre = document.createElement('pre'); pre.id = 'vira-selftest'; pre.style.display = 'none'; pre.textContent = JSON.stringify(res); document.body.append(pre);
    document.title = 'VIRA SELFTEST ' + (res.ok ? 'PASS' : 'FAIL') + ' ' + res.passed + '/' + res.total; post('/__selftest/done', res);
  }, 300);
})();
})();
