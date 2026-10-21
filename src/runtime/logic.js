/* VIRA LOGIC TILES runtime, behavior format v1.
   Behaviors are plain data interpreted against a fixed registry. Nothing a creator types is
   ever compiled or executed as code, and nothing here touches the network. */
(function () {
'use strict';
const ENG = window.ENG;
const L = ENG.Logic = { V: 1 };
L.TYPES = { num: 'Number', bool: 'On/off', text: 'Text' };
L.CMP = {
  num: [['eq', 'is'], ['ne', 'is not'], ['lt', 'is less than'], ['le', 'is at most'], ['gt', 'is more than'], ['ge', 'is at least']],
  bool: [['eq', 'is'], ['ne', 'is not']],
  text: [['eq', 'is'], ['ne', 'is not'], ['has', 'contains']]
};
L.LIMITS = { events: 200, steps: 500, threads: 128, copies: 8, history: 400, depth: 8 };
L.KINDS = { door: 'door', enemy: 'enemy', trigger: 'zone', switch: 'switch' };
L.defVal = t => t === 'num' ? 0 : t === 'bool' ? false : '';
L.coerce = (t, v) => t === 'num' ? (Number.isFinite(+v) ? +v : 0) : t === 'bool' ? (v === true || v === 'true' || v === 1) : String(v == null ? '' : v);
L.fmtVal = (t, v) => t === 'bool' ? (v ? 'on' : 'off') : t === 'num' ? String(Math.round(v * 1000) / 1000) : String(v);
L.newLogic = () => ({ v: L.V, seed: 1337, vars: [], behaviors: [] });
L.newBehavior = (name, ev, p) => ({ id: 'b' + ENG.uid(), v: L.V, name: name || 'New behavior', on: true, retrigger: 'ignore', when: { ev: ev || 'start', p: p || {} }, check: { mode: 'all', items: [] }, do: [], else: [] });
/* Upgrades older or partial data in place. Future format versions convert here. */
L.migrate = function (lg) {
  if (!lg || typeof lg !== 'object') lg = L.newLogic();
  if (!lg.v) lg.v = 1; if (!Array.isArray(lg.vars)) lg.vars = []; if (!Array.isArray(lg.behaviors)) lg.behaviors = []; if (!Number.isFinite(lg.seed)) lg.seed = 1337;
  lg.behaviors.forEach(L.fixBehavior); return lg;
};
L.fixBehavior = function (b) {
  if (!b.id) b.id = 'b' + ENG.uid(); if (!b.v) b.v = 1; if (b.on === undefined) b.on = true; if (!b.retrigger) b.retrigger = 'ignore';
  if (!b.when) b.when = { ev: 'start', p: {} }; if (!b.when.p) b.when.p = {};
  if (!b.check) b.check = { mode: 'all', items: [] }; if (!Array.isArray(b.check.items)) b.check.items = [];
  if (!Array.isArray(b.do)) b.do = []; if (!Array.isArray(b.else)) b.else = []; return b;
};
L.compare = function (type, a, cmp, b) {
  if (type === 'text') { a = String(a); b = String(b); }
  switch (cmp) {
    case 'eq': return type === 'num' ? Math.abs(a - b) < 1e-9 : a === b;
    case 'ne': return type === 'num' ? Math.abs(a - b) >= 1e-9 : a !== b;
    case 'lt': return a < b; case 'le': return a <= b; case 'gt': return a > b; case 'ge': return a >= b;
    case 'has': return a.toLowerCase().includes(b.toLowerCase());
  }
  return false;
};
/* {name} in text is replaced with a variable's value. This is plain substitution, not code. */
L.fmtText = function (tpl, byName) { return String(tpl == null ? '' : tpl).replace(/\{([^{}]{1,40})\}/g, (m, n) => { const k = n.trim(); return byName && Object.prototype.hasOwnProperty.call(byName, k) ? byName[k] : m; }); };

/* ---------------- registry ----------------
   param types: ref (object), num, text, enum, var, cmp, val (typed value or variable), sound, cutscene */
const R = (of, extra) => Object.assign({ t: 'ref', of }, extra || {});
L.EVENTS = {
  start: { cat: 'Game', label: 'The game starts', text: 'the game starts', params: {} },
  every: { cat: 'Game', label: 'Every few seconds (timer)', text: 'every {s} seconds', params: { s: { t: 'num', d: 5, min: .1, max: 3600, step: .1 } } },
  use: { cat: 'Player', label: 'The player uses something (E)', text: 'the player uses {target}', subject: 'target', params: { target: R(null, { any: true }) } },
  enter: { cat: 'Player', label: 'The player enters a zone', text: 'the player enters {zone}', subject: 'zone', params: { zone: R(['trigger'], { any: true }) } },
  leave: { cat: 'Player', label: 'The player leaves a zone', text: 'the player leaves {zone}', subject: 'zone', params: { zone: R(['trigger'], { any: true }) } },
  doorOpens: { cat: 'Doors', label: 'A door starts opening', text: '{door} opens', subject: 'door', params: { door: R(['door'], { any: true }) } },
  doorCloses: { cat: 'Doors', label: 'A door starts closing', text: '{door} closes', subject: 'door', params: { door: R(['door'], { any: true }) } },
  sees: { cat: 'Enemies', label: 'An enemy spots the player', text: '{enemy} spots the player', subject: 'enemy', params: { enemy: R(['enemy'], { any: true }) } },
  hurt: { cat: 'Enemies', label: 'An enemy is hurt', text: '{enemy} is hurt', subject: 'enemy', params: { enemy: R(['enemy'], { any: true }) } },
  dies: { cat: 'Enemies', label: 'An enemy dies', text: '{enemy} dies', subject: 'enemy', params: { enemy: R(['enemy'], { any: true }) } },
  activated: { cat: 'Game', label: 'Something is activated by a tag', text: '{target} is activated', subject: 'target', params: { target: R(null, { any: true }) } },
  varChanges: { cat: 'Variables', label: 'A variable changes', text: '{var} changes', params: { var: { t: 'var' } } }
};
L.CONDS = {
  var: { cat: 'Variables', label: 'Compare a variable', text: '{var} {cmp} {value}', params: { var: { t: 'var' }, cmp: { t: 'cmp', by: 'var' }, value: { t: 'val', by: 'var' } },
    test(c, p) { const t = c.varType(p.var); return L.compare(t, c.getVar(p.var), p.cmp, c.value(p.value, t)); } },
  doorState: { cat: 'Doors', label: 'A door is open or closed', text: '{door} is {state}', params: { door: R(['door']), state: { t: 'enum', o: [['open', 'open'], ['closed', 'closed']], d: 'open' } },
    test(c, p) { const e = c.ref(p.door); if (!e || !e.door) return c.fail('That door is missing'); const open = e.door.target > .5; return p.state === 'open' ? open : !open; } },
  doorLock: { cat: 'Doors', label: 'A door is locked or unlocked', text: '{door} is {state}', params: { door: R(['door']), state: { t: 'enum', o: [['locked', 'locked'], ['unlocked', 'unlocked']], d: 'locked' } },
    test(c, p) { const e = c.ref(p.door); if (!e || !e.door) return c.fail('That door is missing'); return p.state === 'locked' ? !!e.door.locked : !e.door.locked; } },
  enemyState: { cat: 'Enemies', label: 'An enemy is alive or dead', text: '{enemy} is {state}', params: { enemy: R(['enemy']), state: { t: 'enum', o: [['alive', 'alive'], ['dead', 'dead']], d: 'alive' } },
    test(c, p) { const e = c.ref(p.enemy); if (!e || !e.enemy) return c.fail('That enemy is missing'); return p.state === 'alive' ? !e.enemy.dead : e.enemy.dead; } },
  hasKey: { cat: 'Player', label: 'The player has a key', text: 'the player has the key {key}', params: { key: { t: 'text', d: 'red key' } },
    test(c, p) { return c.g.player.keys.includes(p.key); } },
  health: { cat: 'Player', label: "Check the player's health", text: "the player's health {cmp} {value}", params: { cmp: { t: 'cmp', type: 'num', d: 'lt' }, value: { t: 'val', type: 'num', d: 50 } },
    test(c, p) { return L.compare('num', c.g.player.health, p.cmp, c.value(p.value, 'num')); } },
  near: { cat: 'Player', label: 'The player is near something', text: 'the player is within {dist} m of {target}', params: { dist: { t: 'num', d: 4, min: 0, max: 1000, step: .5 }, target: R(null) },
    test(c, p) { const e = c.ref(p.target); if (!e) return c.fail('That object is missing'); return e.root.position.distanceTo(c.g.player.pos) <= p.dist; } },
  chance: { cat: 'Game', label: 'A random chance', text: 'a {pct}% chance comes up', params: { pct: { t: 'num', d: 50, min: 0, max: 100, step: 1 } },
    test(c, p) { return c.rt.rng() * 100 < p.pct; } }
};
L.ACTIONS = {
  door: { cat: 'Doors', label: 'Open, close or toggle a door', text: '{mode} {door}', params: { mode: { t: 'enum', o: [['open', 'open'], ['close', 'close'], ['toggle', 'toggle']], d: 'open' }, door: R(['door']) },
    run(c, p) { const e = c.ref(p.door); if (!e || !e.door) return c.fail('That door is missing'); const want = p.mode === 'open' ? true : p.mode === 'close' ? false : e.door.target < .5; c.g.setDoor(e, want); } },
  lock: { cat: 'Doors', label: 'Lock or unlock a door', text: '{mode} {door}', params: { mode: { t: 'enum', o: [['lock', 'lock'], ['unlock', 'unlock']], d: 'unlock' }, door: R(['door']) },
    run(c, p) { const e = c.ref(p.door); if (!e || !e.door) return c.fail('That door is missing'); e.door.locked = p.mode === 'lock'; } },
  message: { cat: 'Screen', label: 'Show a message', text: 'show the message {text} for {s} s', params: { text: { t: 'text', d: 'Something happened.' }, s: { t: 'num', d: 3, min: .5, max: 60, step: .5 } },
    run(c, p) { c.g.msg(c.fmt(p.text), p.s); } },
  objective: { cat: 'Screen', label: 'Set the objective', text: 'set the objective to {text}', params: { text: { t: 'text', d: 'Find the exit' } },
    run(c, p) { c.g.objective = c.fmt(p.text); c.g.msg('New objective: ' + c.g.objective, 3); } },
  sound: { cat: 'Sound', label: 'Play a sound', text: 'play the sound {sound}', params: { sound: { t: 'sound', d: 'preset:pickup' } },
    run(c, p) { c.g.audio.play(p.sound, c.owner ? { pos: c.owner.root.position, radius: 60 } : {}); } },
  setVar: { cat: 'Variables', label: 'Set a variable', text: 'set {var} to {value}', params: { var: { t: 'var' }, value: { t: 'val', by: 'var' } },
    run(c, p) { const t = c.varType(p.var); c.setVar(p.var, c.value(p.value, t)); } },
  changeVar: { cat: 'Variables', label: 'Do math on a number', text: '{op} {var} by {value}', params: { op: { t: 'enum', o: [['add', 'increase'], ['sub', 'decrease'], ['mul', 'multiply'], ['div', 'divide']], d: 'add' }, var: { t: 'var', types: ['num'] }, value: { t: 'val', type: 'num', d: 1 } },
    run(c, p) { const a = c.getVar(p.var), b = c.value(p.value, 'num'); let r; if (p.op === 'add') r = a + b; else if (p.op === 'sub') r = a - b; else if (p.op === 'mul') r = a * b; else { if (b === 0) return c.fail('Cannot divide by zero'); r = a / b; } if (!Number.isFinite(r)) return c.fail('The result is not a number'); c.setVar(p.var, r); } },
  flipVar: { cat: 'Variables', label: 'Flip an on/off variable', text: 'flip {var}', params: { var: { t: 'var', types: ['bool'] } },
    run(c, p) { c.setVar(p.var, !c.getVar(p.var)); } },
  wait: { cat: 'Flow', label: 'Wait', text: 'wait {s} seconds', params: { s: { t: 'num', d: 1, min: 0, max: 3600, step: .1 } },
    run(c, p) { return { wait: Math.max(0, p.s) }; } },
  stop: { cat: 'Flow', label: 'Stop this behavior', text: 'stop this behavior', params: {}, run() { return { stop: true }; } },
  alert: { cat: 'Enemies', label: 'Alert an enemy (reveals hidden ones)', text: 'alert {enemy} to the player', params: { enemy: R(['enemy']) },
    run(c, p) { const e = c.ref(p.enemy); if (!e || !e.enemy) return c.fail('That enemy is missing'); e.enemy.wake(); } },
  player: { cat: 'Player', label: 'Hurt or heal the player', text: '{mode} the player by {amount}', params: { mode: { t: 'enum', o: [['hurt', 'hurt'], ['heal', 'heal']], d: 'heal' }, amount: { t: 'num', d: 25, min: 0, max: 10000, step: 1 } },
    run(c, p) { if (p.mode === 'hurt') c.g.hurtPlayer(p.amount); else c.g.heal(p.amount); } },
  give: { cat: 'Player', label: 'Give the player an item', text: 'give the player {item}', params: { item: { t: 'enum', o: [['health', '25 health'], ['armor', '25 armor'], ['ammo', 'ammo'], ['pistol', 'a pistol'], ['shotgun', 'a shotgun'], ['rifle', 'a rifle']], d: 'health' } },
    run(c, p) { c.g.giveItem(p.item, 25, ''); } },
  giveKey: { cat: 'Player', label: 'Give the player a key', text: 'give the player the key {key}', params: { key: { t: 'text', d: 'red key' } },
    run(c, p) { c.g.giveItem('key', 1, c.fmt(p.key)); } },
  activate: { cat: 'Game', label: 'Activate a tag (remote control)', text: 'activate everything tagged {tag}', params: { tag: { t: 'text', d: 'gate' } },
    run(c, p) { c.g.activate(p.tag); } },
  cutscene: { cat: 'Game', label: 'Play a cutscene', text: 'play the cutscene {cs}', params: { cs: { t: 'cutscene' } },
    run(c, p) { c.g.playCutscene(p.cs); } },
  anim: { cat: 'Game', label: 'Play an animation', text: '{how} the animation {anim}', params: { how: { t: 'enum', o: [['play', 'play'], ['restart', 'restart'], ['reverse', 'play backwards']], d: 'play' }, anim: { t: 'anim' } },
    run(c, p) { if (c.g.anPlay) c.g.anPlay(p.anim, p.how); } },
  sndEmit: { cat: 'Game', label: 'Switch a sound emitter', text: 'turn {how} the sound emitter {name}', params: { how: { t: 'enum', o: [['on', 'on'], ['off', 'off'], ['toggle', 'on or off (toggle)']], d: 'on' }, name: { t: 'text', d: '' } },
    run(c, p) { if (c.g.sndEmit) c.g.sndEmit(p.name, p.how); } },
  animStop: { cat: 'Game', label: 'Stop an animation', text: '{how} the animation {anim}', params: { how: { t: 'enum', o: [['pause', 'pause'], ['reset', 'stop and reset']], d: 'pause' }, anim: { t: 'anim' } },
    run(c, p) { if (c.g.anStop) c.g.anStop(p.anim, p.how); } },
  end: { cat: 'Game', label: 'End the level', text: 'end the level as {result}, saying {text}', params: { result: { t: 'enum', o: [['win', 'a win'], ['lose', 'a loss']], d: 'win' }, text: { t: 'text', d: 'Level complete.' } },
    run(c, p) { c.g.endLevel(p.result === 'win', c.fmt(p.text)); } }
};
L.IF_LABEL = 'Check something (if / else)';

/* ---------------- naming and description ---------------- */
L.objOf = (project, id) => project.objects.find(o => o.id === id) || null;
L.varOf = (lg, id) => lg.vars.find(v => v.id === id) || null;
L.anyLabel = of => !of ? 'anything' : of[0] === 'trigger' ? 'any zone' : 'any ' + of[0];
L.refLabel = function (project, r, schema, owner) {
  if (!r) return '(pick)'; if (r.r === 'self') return 'this ' + (owner ? (L.KINDS[owner.type] || 'object') : 'object'); if (r.r === 'it') return 'the triggering ' + (schema && schema.of ? (L.KINDS[schema.of[0]] || 'object') : 'object');
  if (r.r === 'any') return L.anyLabel(schema && schema.of); if (r.r === 'obj') { const o = L.objOf(project, r.id); return o ? o.name : '(deleted object)'; } return '(pick)';
};
L.paramLabel = function (project, schema, v, params, owner) {
  const lg = project.logic;
  switch (schema.t) {
    case 'ref': return L.refLabel(project, v, schema, owner);
    case 'var': { const d = L.varOf(lg, v); return d ? d.name : '(pick a variable)'; }
    case 'cmp': { const t = schema.type || ((L.varOf(lg, params[schema.by]) || {}).type) || 'num'; const o = (L.CMP[t] || []).find(x => x[0] === v); return o ? o[1] : String(v); }
    case 'val': { if (v && v.var) { const d = L.varOf(lg, v.var); return d ? d.name : '(deleted variable)'; } const t = schema.type || ((L.varOf(lg, params[schema.by]) || {}).type) || 'num'; const x = v ? v.lit : undefined; return t === 'text' ? '"' + (x == null ? '' : x) + '"' : L.fmtVal(t, L.coerce(t, x)); }
    case 'enum': { const o = schema.o.find(x => x[0] === v); return o ? o[1] : String(v); }
    case 'text': return '"' + (v == null ? '' : v) + '"';
    case 'sound': return v ? String(v).replace(/^preset:/, '').replace(/^file:.*/, 'audio file') : '(none)';
    case 'cutscene': { const cs = (project.cutscenes || []).find(c => c.id === v || c.name === v); return cs ? cs.name : '(pick a cutscene)'; }
    case 'anim': { const an = (project.anims || []).find(c => c.id === v || c.name === v); return an ? an.name : '(pick an animation)'; }
    default: return String(v);
  }
};
L.describe = function (project, def, params, owner) { params = params || {}; return def.text.replace(/\{(\w+)\}/g, (m, k) => def.params[k] ? L.paramLabel(project, def.params[k], params[k], params, owner) : m); };
L.describeStmt = function (project, st, owner) { if (st.k === 'if') return 'check ' + ((st.check && st.check.items) || []).map(c => L.CONDS[c.c] ? (c.not ? 'not ' : '') + L.describe(project, L.CONDS[c.c], c.p, owner) : '?').join(st.check && st.check.mode === 'any' ? ' or ' : ' and '); const d = L.ACTIONS[st.a]; return d ? L.describe(project, d, st.p, owner) : 'unknown action "' + st.a + '"'; };
L.summary = function (project, b, owner) { const w = L.EVENTS[b.when.ev]; let s = 'When ' + (w ? L.describe(project, w, b.when.p, owner) : '?'); if (b.check.items.length) s += ', if ' + b.check.items.map(c => L.CONDS[c.c] ? (c.not ? 'not ' : '') + L.describe(project, L.CONDS[c.c], c.p, owner) : '?').join(b.check.mode === 'any' ? ' or ' : ' and '); s += ': ' + (b.do.length ? b.do.map(st => L.describeStmt(project, st, owner)).join(', then ') : 'nothing yet'); return s; };

/* ---------------- validation (shared by editor and runtime) ---------------- */
function subjectKinds(project, b, owner) {
  const ev = L.EVENTS[b.when.ev]; if (!ev || !ev.subject) return 'none';
  const r = b.when.p[ev.subject], of = ev.params[ev.subject].of;
  if (!r) return 'none'; if (r.r === 'self') return owner ? [owner.type] : 'none'; if (r.r === 'obj') { const o = L.objOf(project, r.id); return o ? [o.type] : 'none'; } return of || null;
}
function checkParam(project, schema, v, params, ctx) {
  const lg = project.logic;
  switch (schema.t) {
    case 'ref': {
      if (!v || !v.r) return 'Pick ' + (schema.of ? 'a ' + (L.KINDS[schema.of[0]] || 'object') : 'an object') + '.';
      if (v.r === 'any') return ctx.isEvent && schema.any ? null : '"Any" only works in WHEN.';
      if (v.r === 'self') { if (!ctx.owner) return '"This object" only works in behaviors that belong to an object.'; if (schema.of && !schema.of.includes(ctx.owner.type)) return 'This behavior belongs to a ' + (ENG.PREFABS[ctx.owner.type] ? ENG.PREFABS[ctx.owner.type].label.toLowerCase() : ctx.owner.type) + ', not a ' + (L.KINDS[schema.of[0]] || schema.of[0]) + '.'; return null; }
      if (v.r === 'it') { if (ctx.isEvent) return '"The triggering object" cannot be used in WHEN.'; const k = ctx.subject; if (k === 'none') return 'This WHEN has no triggering object.'; if (k && schema.of && !k.some(x => schema.of.includes(x))) return 'The triggering object is never a ' + (L.KINDS[schema.of[0]] || schema.of[0]) + ' here.'; return null; }
      if (v.r === 'obj') { const o = L.objOf(project, v.id); if (!o) return 'The object this pointed to was deleted.'; if (schema.of && !schema.of.includes(o.type)) return o.name + ' is a ' + (ENG.PREFABS[o.type] ? ENG.PREFABS[o.type].label.toLowerCase() : o.type) + ', not a ' + (L.KINDS[schema.of[0]] || schema.of[0]) + '.'; return null; }
      return 'Unknown object reference.';
    }
    case 'var': { const d = L.varOf(lg, v); if (!d) return v ? 'That variable was deleted.' : 'Pick a variable.'; if (schema.types && !schema.types.includes(d.type)) return d.name + ' is ' + L.TYPES[d.type].toLowerCase() + '; this needs ' + schema.types.map(t => L.TYPES[t].toLowerCase()).join(' or ') + '.'; return null; }
    case 'cmp': { const t = schema.type || ((L.varOf(lg, params[schema.by]) || {}).type); if (!t) return null; return (L.CMP[t] || []).some(x => x[0] === v) ? null : 'Pick how to compare.'; }
    case 'val': {
      const t = schema.type || ((L.varOf(lg, params[schema.by]) || {}).type); if (!t) return null; if (!v) return 'Pick a value.';
      if (v.var !== undefined) { const d = L.varOf(lg, v.var); if (!d) return 'That variable was deleted.'; if (d.type !== t) return d.name + ' is ' + L.TYPES[d.type].toLowerCase() + ', but this needs ' + L.TYPES[t].toLowerCase() + '.'; return null; }
      if (t === 'num' && !Number.isFinite(v.lit)) return 'Type a number.'; if (t === 'bool' && typeof v.lit !== 'boolean') return 'Pick on or off.'; if (t === 'text' && typeof v.lit !== 'string') return 'Type some text.'; return null;
    }
    case 'num': if (!Number.isFinite(v)) return 'Type a number.'; if (schema.min != null && v < schema.min) return 'Use ' + schema.min + ' or more.'; if (schema.max != null && v > schema.max) return 'Use ' + schema.max + ' or less.'; return null;
    case 'text': return typeof v === 'string' ? null : 'Type some text.';
    case 'enum': return schema.o.some(x => x[0] === v) ? null : 'Pick an option.';
    case 'sound': return v ? null : 'Pick a sound.';
    case 'cutscene': return (project.cutscenes || []).some(c => c.id === v || c.name === v) ? null : 'Pick a cutscene.';
    case 'anim': return (project.anims || []).some(c => c.id === v || c.name === v) ? null : 'Pick an animation.';
  }
  return null;
}
function checkParams(project, def, params, ctx, path, out, b, level) {
  params = params || {};
  for (const k in def.params) { const m = checkParam(project, def.params[k], params[k], params, ctx); if (m) out.push({ beh: b.id, path, param: k, msg: m, level: level || 'error' }); }
}
function checkGroup(project, check, ctx, path, out, b) {
  (check.items || []).forEach((c, i) => { const d = L.CONDS[c.c]; if (!d) { out.push({ beh: b.id, path: path + '.' + i, msg: 'Unknown check "' + c.c + '". It may come from a newer Vira.', level: 'error' }); return; } checkParams(project, d, c.p, ctx, path + '.' + i, out, b); });
}
function checkList(project, list, ctx, path, out, b, depth) {
  (list || []).forEach((st, i) => {
    const p = path + '.' + i;
    if (st.k === 'if') { if (depth >= L.LIMITS.depth) { out.push({ beh: b.id, path: p, msg: 'Too deeply nested (limit ' + L.LIMITS.depth + ').', level: 'error' }); return; } if (!st.check || !st.check.items.length) out.push({ beh: b.id, path: p, msg: 'Add at least one check.', level: 'warn' }); checkGroup(project, st.check || { items: [] }, ctx, p + '.check', out, b); checkList(project, st.do, ctx, p + '.do', out, b, depth + 1); checkList(project, st.else, ctx, p + '.else', out, b, depth + 1); return; }
    const d = L.ACTIONS[st.a]; if (!d) { out.push({ beh: b.id, path: p, msg: 'Unknown action "' + st.a + '". It may come from a newer Vira.', level: 'error' }); return; }
    checkParams(project, d, st.p, ctx, p, out, b);
  });
}
L.validateBehavior = function (project, b, owner) {
  const out = []; const ev = L.EVENTS[b.when && b.when.ev];
  if (!ev) { out.push({ beh: b.id, path: 'when', msg: 'Unknown event "' + (b.when && b.when.ev) + '". It may come from a newer Vira.', level: 'error' }); return out; }
  checkParams(project, ev, b.when.p, { owner, isEvent: true }, 'when', out, b);
  const ctx = { owner, subject: subjectKinds(project, b, owner) };
  checkGroup(project, b.check, ctx, 'check', out, b); checkList(project, b.do, ctx, 'do', out, b, 0); checkList(project, b.else, ctx, 'else', out, b, 0);
  if (!b.do.length && !b.else.length) out.push({ beh: b.id, path: 'do', msg: 'Does nothing yet. Add an action.', level: 'warn' });
  return out;
};
L.allBehaviors = function (project) { const out = []; (project.logic.behaviors || []).forEach(b => out.push({ b, owner: null })); project.objects.forEach(o => (o.logic || []).forEach(b => out.push({ b, owner: o }))); return out; };
L.validateAll = function (project) { let out = []; L.allBehaviors(project).forEach(({ b, owner }) => { out = out.concat(L.validateBehavior(project, b, owner).map(x => Object.assign(x, { owner: owner ? owner.id : null, name: b.name }))); }); const names = {}; project.logic.vars.forEach(v => { const k = v.name.trim().toLowerCase(); if (!k) out.push({ beh: null, path: '', msg: 'A variable has no name.', level: 'error' }); else if (names[k]) out.push({ beh: null, path: '', msg: 'Two variables are called "' + v.name + '".', level: 'error' }); names[k] = 1; }); return out; };
L.matchRef = function (r, subject, owner, of) {
  if (!r || !subject) return false;
  if (r.r === 'any') return !of || of.includes(subject.type);
  if (r.r === 'self') return subject === owner;
  if (r.r === 'obj') return subject.o.id === r.id;
  return false;
};

/* ======================================================================
   RUNTIME. Deterministic by construction: game time only (never the wall
   clock), stable behavior order (level behaviors, then objects in project
   order), FIFO event queue drained at one fixed point per frame, and a seeded
   random source.
   ====================================================================== */
class Runtime {
  constructor(g) {
    this.g = g; const lg = g.project.logic = L.migrate(g.project.logic); this.lg = lg; this.project = g.project;
    this.vars = {}; this.defs = {}; lg.vars.forEach(v => { this.defs[v.id] = v; this.vars[v.id] = L.coerce(v.type, v.init); });
    this.rng = ENG.rng(lg.seed); this.byId = new Map(); g.ents.forEach(e => this.byId.set(e.o.id, e));
    this.entries = []; lg.behaviors.forEach(b => this.entries.push({ b, owner: null }));
    g.ents.forEach(e => (e.o.logic || []).forEach(b => this.entries.push({ b, owner: e })));
    this.listen = {}; this.timers = []; this.usable = new Set(); this.anyUse = false;
    this.entries.forEach((en, i) => { en.i = i; const ev = en.b.when.ev; (this.listen[ev] = this.listen[ev] || []).push(en); if (ev === 'every') { en.next = Math.max(.1, +en.b.when.p.s || 5); this.timers.push(en); } if (ev === 'use') { const r = en.b.when.p.target; if (r && r.r === 'self' && en.owner) this.usable.add(en.owner); else if (r && r.r === 'obj' && this.byId.get(r.id)) this.usable.add(this.byId.get(r.id)); else if (r && r.r === 'any') this.anyUse = true; } });
    this.queue = []; this.threads = []; this.seq = 0; this.hist = []; this.counts = {}; this.checks = {}; this.errors = 0; this.events = 0;
    const issues = L.validateAll(g.project); this.bad = new Set();
    issues.filter(x => x.level === 'error').forEach(x => { this.bad.add(x.beh + ':' + x.path); });
    this.log('info', null, '', 'Logic started: ' + this.entries.length + ' behaviors, ' + lg.vars.length + ' variables.');
    issues.filter(x => x.level === 'error').forEach(x => this.log('error', this.entryOf(x.beh), x.path, 'Skipped until fixed: ' + x.msg));
  }
  entryOf(id) { return this.entries.find(e => e.b.id === id) || null; }
  log(k, en, path, m) { this.hist.push({ t: Math.round(this.g.time * 100) / 100, k, b: en ? en.b.id : null, name: en ? en.b.name : '', path: path || '', m }); if (k === 'error') this.errors++; if (this.hist.length > L.LIMITS.history) this.hist.splice(0, this.hist.length - L.LIMITS.history); }
  count(en, path) { const k = en.b.id + '|' + path; this.counts[k] = (this.counts[k] || 0) + 1; }
  listens(ev, e) { return ev === 'use' ? (this.anyUse || this.usable.has(e)) : !!this.listen[ev]; }
  raise(ev, subject, data) { if (!this.listen[ev]) return; this.queue.push({ ev, subject: subject || null, data: data || {} }); }
  byName() { const o = {}; this.lg.vars.forEach(v => { o[v.name] = L.fmtVal(v.type, this.vars[v.id]); }); return o; }
  ctx(t) {
    const rt = this, g = this.g;
    return {
      rt, g, owner: t.owner, it: t.it,
      ref(r) { if (!r) return null; if (r.r === 'self') return t.owner; if (r.r === 'it') return t.it; if (r.r === 'obj') return rt.byId.get(r.id) || null; return null; },
      varType(id) { const d = rt.defs[id]; return d ? d.type : 'num'; },
      getVar(id) { return rt.vars[id]; },
      setVar(id, v) { rt.setVar(id, v, t.entry); },
      value(v, type) { if (v && v.var !== undefined) return L.coerce(type, rt.vars[v.var]); return L.coerce(type, v ? v.lit : undefined); },
      fmt(s) { return L.fmtText(s, rt.byName()); },
      fail(msg) { rt.log('error', t.entry, t.path, msg); return false; }
    };
  }
  setVar(id, v, en) { const d = this.defs[id]; if (!d) return; v = L.coerce(d.type, v); if (this.vars[id] === v) return; this.vars[id] = v; this.log('var', en, '', d.name + ' = ' + L.fmtVal(d.type, v)); this.raise('varChanges', null, { var: id }); }
  evalGroup(t, check, path) {
    const items = (check && check.items) || []; if (!items.length) return true; const c = this.ctx(t); let res = check.mode !== 'any';
    for (let i = 0; i < items.length; i++) {
      const it = items[i], p = path + '.' + i; t.path = p; if (this.bad.has(t.entry.b.id + ':' + p)) { this.log('error', t.entry, p, 'Check skipped until fixed'); if (check.mode !== 'any') { res = false; break; } continue; }
      const d = L.CONDS[it.c]; let ok = false; try { ok = !!d.test(c, it.p || {}); } catch (err) { this.log('error', t.entry, p, 'Check failed: ' + err.message); ok = false; }
      if (it.not) ok = !ok; this.checks[t.entry.b.id + '|' + p] = ok; this.count(t.entry, p);
      if (check.mode === 'any') { if (ok) { res = true; break; } else res = false; } else if (!ok) { res = false; break; }
    }
    this.checks[t.entry.b.id + '|' + path] = res; return res;
  }
  start(en, subject, why) {
    const b = en.b; if (!b.on) return; this.events++;
    const live = this.threads.filter(x => x.entry === en && !x.done);
    if (live.length) {
      if (b.retrigger === 'restart') live.forEach(x => this.finish(x, 'Interrupted: started again'));
      else if (b.retrigger === 'parallel') { if (live.length >= L.LIMITS.copies) { this.log('skip', en, 'when', 'Ignored: already ' + live.length + ' copies running'); return; } }
      else { this.log('skip', en, 'when', 'Ignored: still running from last time'); return; }
    }
    if (this.threads.length >= L.LIMITS.threads) this.threads = this.threads.filter(x => !x.done);
    if (this.threads.length >= L.LIMITS.threads) { this.log('error', en, 'when', 'Too many behaviors running at once (' + L.LIMITS.threads + ')'); return; }
    if (this.bad.has(b.id + ':when')) return;
    const t = { id: ++this.seq, entry: en, owner: en.owner, it: subject, frames: [], wake: -1, done: false, path: 'when' };
    this.count(en, 'when'); this.log('event', en, 'when', L.describe(this.project, L.EVENTS[b.when.ev], b.when.p, en.owner ? en.owner.o : null) + (why || ''));
    const has = b.check.items.length; const ok = this.evalGroup(t, b.check, 'check');
    if (has) this.log(ok ? 'pass' : 'fail', en, 'check', ok ? 'Checks passed: doing DO' : 'Checks failed: doing ELSE');
    t.frames.push({ list: ok ? b.do : b.else, i: 0, path: ok ? 'do' : 'else' });
    this.threads.push(t); this.run(t);
  }
  run(t) {
    let steps = 0;
    while (!t.done) {
      if (t.wake > this.g.time) return;
      const f = t.frames[t.frames.length - 1]; if (!f) { this.finish(t); return; }
      if (f.i >= f.list.length) { t.frames.pop(); continue; }
      const idx = f.i++, st = f.list[idx], path = f.path + '.' + idx; t.path = path;
      if (++steps > L.LIMITS.steps) { this.log('error', t.entry, path, 'Stopped: more than ' + L.LIMITS.steps + ' steps in one frame'); this.finish(t, 'Stopped'); return; }
      if (this.bad.has(t.entry.b.id + ':' + path)) { this.log('error', t.entry, path, 'Skipped until fixed'); continue; }
      if (st.k === 'if') { const ok = this.evalGroup(t, st.check, path + '.check'); this.count(t.entry, path); this.log(ok ? 'pass' : 'fail', t.entry, path, (ok ? 'Inner check passed' : 'Inner check failed')); if (t.frames.length >= L.LIMITS.depth) { this.log('error', t.entry, path, 'Too deeply nested'); continue; } t.frames.push({ list: (ok ? st.do : st.else) || [], i: 0, path: path + (ok ? '.do' : '.else') }); continue; }
      const def = L.ACTIONS[st.a]; if (!def) { this.log('error', t.entry, path, 'Unknown action'); continue; }
      this.count(t.entry, path); this.log('do', t.entry, path, L.describe(this.project, def, st.p, t.owner ? t.owner.o : null));
      let r; try { r = def.run(this.ctx(t), st.p || {}); } catch (err) { this.log('error', t.entry, path, 'Failed: ' + err.message); continue; }
      if (r && r.stop) { this.finish(t, 'Stopped by "stop this behavior"'); return; }
      if (r && r.wait !== undefined) { t.wake = this.g.time + r.wait; t.waiting = true; return; }
    }
  }
  finish(t, why) { if (t.done) return; t.done = true; if (why) this.log('stop', t.entry, t.path, why); }
  cancelOwner(e, why) { this.threads.forEach(t => { if (!t.done && t.owner === e) this.finish(t, why || 'Interrupted: its object was removed'); }); }
  drain(budget) {
    while (this.queue.length) {
      if (budget.n++ >= L.LIMITS.events) { this.log('error', null, '', 'Event storm stopped: more than ' + L.LIMITS.events + ' events in one frame. Two behaviors are probably triggering each other.'); this.queue.length = 0; return; }
      const ev = this.queue.shift(), list = this.listen[ev.ev]; if (!list) continue; const def = L.EVENTS[ev.ev];
      for (const en of list) { const p = en.b.when.p || {}; let ok; if (ev.ev === 'varChanges') ok = p.var === ev.data.var; else if (def.subject) ok = L.matchRef(p[def.subject], ev.subject, en.owner, def.params[def.subject].of); else ok = true; if (ok) this.start(en, ev.subject, ev.subject ? '' : ''); }
    }
  }
  tick() {
    const time = this.g.time, budget = { n: 0 };
    for (const en of this.timers) { let n = 0; while (en.b.on && time >= en.next && n++ < 5) { en.next += Math.max(.1, +en.b.when.p.s || 5); this.start(en, null, ''); } }
    this.drain(budget);
    const ready = this.threads.filter(t => !t.done && t.waiting && t.wake <= time).sort((a, b) => a.wake - b.wake || a.id - b.id);
    ready.forEach(t => { t.waiting = false; t.wake = -1; this.run(t); });
    this.drain(budget);
    if (this.threads.length > 32) this.threads = this.threads.filter(t => !t.done);
  }
  snapshot() { const vars = {}; this.lg.vars.forEach(v => vars[v.id] = this.vars[v.id]); return { hist: this.hist.slice(), counts: Object.assign({}, this.counts), checks: Object.assign({}, this.checks), vars, time: this.g.time, errors: this.errors, events: this.events }; }
}
L.Runtime = Runtime;
L.subjectKinds = subjectKinds;
})();
