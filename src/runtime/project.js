/* PROJECT VERSIONS AND REPAIR: every project file carries a format number (p.v) and the engine version that saved it.
   Opening a project runs, in order: a repair pass (wrong types, broken numbers, missing or duplicate ids), the older
   upgrade code (ENG.migrate in rt.js and fx.js), then each numbered upgrade step the file has not had yet. So an old
   or slightly damaged project still opens, and exported games use the same code. Loaded last in the runtime.
   To change the format: add a step to ENG.MIGRATIONS with the next number and bump ENG.FORMAT. Steps must be safe to
   run on any project of the previous format, including ones with missing pieces. */
(function () {
'use strict';
const ENG = window.ENG;
ENG.VERSION = '2.2.0';
ENG.FORMAT = 3;
ENG.MIGRATIONS = [
  { to: 2, note: 'Vira 2: VR settings, roguelite runs, sculpts, imported games', run(p) {
    if (!p.models) p.models = {}; if (!p.sculpts) p.sculpts = {}; if (!p.blueprints) p.blueprints = [];
    Object.values(p.models).forEach(m => (m.parts || []).forEach(pt => { if (pt.kind === 'sculpt' && pt.d) { pt.d.sx = pt.d.sx || 1; pt.d.sy = pt.d.sy || 1; pt.d.sz = pt.d.sz || 1; } }));
  } },
  { to: 3, note: 'Vira 2.2: interface screens, themes and fonts', run(p) {
    if (!p.ui || typeof p.ui !== 'object' || Array.isArray(p.ui)) p.ui = {}; if (!Array.isArray(p.ui.screens)) p.ui.screens = []; if (!p.ui.fonts || typeof p.ui.fonts !== 'object') p.ui.fonts = {};
  } }
];

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v), fin = v => typeof v === 'number' && isFinite(v);
const okv = a => Array.isArray(a) && a.length >= 3 && fin(+a[0]) && fin(+a[1]) && fin(+a[2]), vec = (a, d) => okv(a) ? [+a[0], +a[1], +a[2]] : d.slice();
ENG.repairProject = function (p, log) {
  log = log || []; const fix = m => log.push(m);
  if (!isObj(p)) throw new Error('This file is not a Vira project');
  if (typeof p.name !== 'string' || !p.name.trim()) { p.name = 'Recovered game'; fix('gave the project a name'); }
  [['objects', []], ['cutscenes', []], ['blueprints', []]].forEach(([k, d]) => { if (p[k] !== undefined && !Array.isArray(p[k])) { p[k] = d; fix(k + ' was not a list and was reset'); } });
  if (p.hud !== undefined && !Array.isArray(p.hud)) { p.hud = ENG.defaultHUD(); fix('the HUD was reset'); }
  ['models', 'sculpts', 'skins', 'sounds', 'slots', 'assets', 'settings', 'mixer'].forEach(k => { if (p[k] !== undefined && !isObj(p[k])) { p[k] = {}; fix(k + ' was reset'); } });
  if (p.logic !== undefined && !isObj(p.logic)) { delete p.logic; fix('the Logic Tiles were reset'); }
  /* objects: real entries only, unique ids, finite numbers, known shapes of data */
  if (Array.isArray(p.objects)) {
    const ids = new Set(), keep = []; let dropped = 0, reid = 0, bad = 0, unknown = 0;
    p.objects.forEach(o => {
      if (!isObj(o) || typeof o.type !== 'string' || !o.type) { dropped++; return; }
      if (typeof o.id !== 'string' && typeof o.id !== 'number') { o.id = ENG.uid(); reid++; } o.id = String(o.id); if (ids.has(o.id)) { o.id = ENG.uid(); reid++; } ids.add(o.id);
      if (!okv(o.p) || (o.r !== undefined && !okv(o.r)) || (o.s !== undefined && !okv(o.s))) bad++;
      o.p = vec(o.p, [0, 0, 0]); if (o.r !== undefined) o.r = vec(o.r, [0, 0, 0]); if (o.s !== undefined) o.s = vec(o.s, [1, 1, 1]);
      /* a kind this version does not have (from a newer Vira, say): kept in the file untouched, it just does not show */
      if (!ENG.PREFABS[o.type]) { unknown++; if (!o.r) o.r = [0, 0, 0]; if (!o.s) o.s = [1, 1, 1]; }
      if (!isObj(o.props)) { o.props = {}; } if (typeof o.name !== 'string') o.name = o.type; if (o.logic !== undefined && !Array.isArray(o.logic)) delete o.logic; keep.push(o);
    });
    p.objects = keep; if (dropped) fix(dropped + ' broken object' + (dropped > 1 ? 's were' : ' was') + ' removed'); if (reid) fix(reid + ' object id' + (reid > 1 ? 's were' : ' was') + ' renewed'); if (bad) fix(bad + ' object' + (bad > 1 ? 's had' : ' had') + ' broken position, rotation or size numbers');
    if (unknown) fix(unknown + ' object' + (unknown > 1 ? 's are' : ' is') + ' a kind this version of Vira does not have. ' + (unknown > 1 ? 'They stay' : 'It stays') + ' in the file but will not show');
  }
  /* models made in the Model tab */
  if (isObj(p.models)) Object.keys(p.models).forEach(id => { const m = p.models[id]; if (!isObj(m)) { delete p.models[id]; fix('a broken model was removed'); return; } if (!Array.isArray(m.parts)) { m.parts = []; fix('model ' + (m.name || id) + ' had no parts list'); } if (!m.id) m.id = id; if (typeof m.name !== 'string') m.name = 'Model';
    const ids = new Set(); m.parts = m.parts.filter(pt => isObj(pt) && typeof pt.kind === 'string'); m.parts.forEach(pt => { if (!pt.id || ids.has(pt.id)) pt.id = 'p' + ENG.uid(); ids.add(pt.id); pt.p = vec(pt.p, [0, 0, 0]); pt.r = vec(pt.r, [0, 0, 0]); if (pt.kind !== 'group' && !isObj(pt.d)) pt.d = {}; if (pt.kind !== 'group' && !isObj(pt.m)) pt.m = {}; }); });
  if (isObj(p.sculpts)) Object.keys(p.sculpts).forEach(id => { const s = p.sculpts[id]; if (!isObj(s) || !isObj(s.recipe) || typeof s.p !== 'string' || !Array.isArray(s.b)) { delete p.sculpts[id]; fix('a damaged sculpt was removed'); } });
  if (Array.isArray(p.cutscenes)) p.cutscenes = p.cutscenes.filter(c => { if (!isObj(c)) return false; if (!Array.isArray(c.keys)) c.keys = []; c.keys = c.keys.filter(k => isObj(k) && fin(+k.t)); return true; });
  if (Array.isArray(p.hud)) p.hud = p.hud.filter(w => isObj(w) && typeof w.kind === 'string').map(w => { if (!w.id) w.id = ENG.uid(); return w; });
  /* interface screens, themes and fonts */
  if (p.ui !== undefined && !isObj(p.ui)) { p.ui = {}; fix('the interface screens were reset'); }
  if (isObj(p.ui)) { if (p.ui.screens !== undefined && !Array.isArray(p.ui.screens)) { p.ui.screens = []; fix('the screen list was reset'); } if (p.ui.fonts !== undefined && !isObj(p.ui.fonts)) { p.ui.fonts = {}; fix('the imported fonts list was reset'); } if (p.ui.theme !== undefined && p.ui.theme !== null && !isObj(p.ui.theme)) { delete p.ui.theme; fix('the interface theme was reset'); }
    if (Array.isArray(p.ui.screens)) { const n = p.ui.screens.length; p.ui.screens = p.ui.screens.filter(s => isObj(s) && typeof s.kind === 'string'); if (p.ui.screens.length < n) fix((n - p.ui.screens.length) + ' broken screen' + (n - p.ui.screens.length > 1 ? 's were' : ' was') + ' removed'); p.ui.screens.forEach(s => { if (!s.id) s.id = ENG.uid(); if (!Array.isArray(s.items)) s.items = []; s.items = s.items.filter(w => isObj(w) && typeof w.kind === 'string'); s.items.forEach(w => { if (!w.id) w.id = ENG.uid(); if (!fin(+w.x)) w.x = 50; if (!fin(+w.y)) w.y = 50; }); if (s.bg !== undefined && !isObj(s.bg)) delete s.bg; }); }
    if (isObj(p.ui.fonts)) Object.keys(p.ui.fonts).forEach(id => { const f = p.ui.fonts[id]; if (!isObj(f) || typeof f.data !== 'string' || !f.family) { delete p.ui.fonts[id]; fix('a broken imported font was removed'); } }); }
  if (Array.isArray(p.blueprints)) p.blueprints = p.blueprints.filter(isObj);
  if (isObj(p.htmlGame)) { if (typeof p.htmlGame.html !== 'string') { delete p.htmlGame; fix('an imported game without its file was removed'); } else { if (!isObj(p.htmlGame.edits)) p.htmlGame.edits = {}; if (!isObj(p.htmlGame.media)) p.htmlGame.media = {}; } }
  return log;
};

const baseMigrate = ENG.migrate;
ENG.migrate = function (p) {
  const log = [], from = fin(p && p.v) ? p.v : 1;
  ENG.repairProject(p, log); p = baseMigrate(p);
  /* settings: numbers that came out broken go back to their defaults */
  const S = p.settings, D = ENG.DEFAULT_SETTINGS; let nums = 0; for (const k in D) if (typeof D[k] === 'number' && S[k] !== undefined && !fin(S[k])) { S[k] = D[k]; nums++; } if (nums) log.push(nums + ' setting' + (nums > 1 ? 's were' : ' was') + ' reset to the default');
  for (const step of ENG.MIGRATIONS) if (from < step.to) { try { step.run(p); log.push('updated to format ' + step.to + ': ' + step.note); } catch (e) { log.push('format ' + step.to + ' update had a problem: ' + e.message); } }
  const newer = from > ENG.FORMAT; p.v = Math.max(from, ENG.FORMAT); p.engine = p.engine || ENG.VERSION;
  /* notes add up until the editor shows them, when the same project passes through here twice while it opens */
  const prev = ENG.lastMigration && !ENG.lastMigration.seen && ENG.lastMigration.project === p ? ENG.lastMigration : null, fixes = log.filter(m => !/^updated to format/.test(m)), steps = log.filter(m => /^updated to format/.test(m));
  ENG.lastMigration = { project: p, from: prev ? Math.min(prev.from, from) : from, to: p.v, newer: newer || !!(prev && prev.newer), engine: p.engine, log: (prev ? prev.log : []).concat(fixes), steps: (prev ? prev.steps : []).concat(steps), seen: false };
  return p;
};
const baseNew = ENG.newProject; ENG.newProject = function () { const p = baseNew(); p.v = ENG.FORMAT; p.engine = ENG.VERSION; p.sculpts = {}; p.blueprints = []; return p; };
/* call before writing a project anywhere, so the file says which format and engine wrote it */
ENG.stampProject = function (p) { if (!p) return p; p.v = Math.max(p.v || 1, ENG.FORMAT); p.engine = ENG.VERSION; p.savedAt = new Date().toISOString(); return p; };
})();
