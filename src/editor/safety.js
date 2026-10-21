/* SAFETY NET: nothing you make in Vira should be lost.
   - Autosave every 2 minutes while there are changes (into the browser save list), plus a recovery copy every
     30 seconds, when you switch away, and when the tab closes.
   - Crash recovery: on the next start, unsaved work newer than the last save is offered back.
   - If the last project cannot open, Vira opens the starter level instead and offers the broken copy (see boot in ed.js).
   - Version history (the last 25 versions of each project, in IndexedDB), backups of every project in one file,
     a warning when the same project is saved from another tab, caught errors, storage health and a problem report.
   Loaded after ed.js; it talks to the editor through Ed, Ed.api and Ed.ui. */
(function () {
'use strict';
const ENG = window.ENG, Ed = window.Ed; if (!Ed || !Ed.api || !Ed.ui) return;
const U = Ed.ui, h = U.h, TEST = /[?&]selftest\b/.test(location.search);
const AUTOSAVE_MS = 120000, SNAP_MS = 30000, HISTORY_EVERY_MS = 10 * 60000, KEEP = 25;
const SAFE = Ed.safety = { errors: [], lastSnap: 0, lastHist: {}, ready: false };
/* quiet while the self-test borrows the editor, so test projects never land in your saves */
const quiet = () => TEST || !!(Ed.selftest && Ed.selftest.running);
const lsGet = k => { try { return localStorage.getItem(k); } catch (x) { return null; } }, lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (x) { return false; } }, lsDel = k => { try { localStorage.removeItem(k); } catch (x) { } };
const saveIndex = () => { try { return JSON.parse(lsGet('kiln.index') || '{}') || {}; } catch (x) { return {}; } };
const setState = t => { const s = document.getElementById('saveState'); if (s) s.textContent = t; };

/* ---------------- IndexedDB, small and promise based ---------------- */
let dbp = null;
function db() {
  if (dbp) return dbp; dbp = new Promise((res, rej) => { if (!window.indexedDB) return rej(new Error('IndexedDB is not available')); const rq = indexedDB.open('vira-safety', 1);
    rq.onupgradeneeded = () => { const d = rq.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if (!d.objectStoreNames.contains('history')) { const s = d.createObjectStore('history', { keyPath: 'id', autoIncrement: true }); s.createIndex('proj', 'proj'); } };
    rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); rq.onblocked = () => rej(new Error('IndexedDB is blocked')); }); dbp.catch(() => { dbp = null; }); return dbp;
}
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
function tx(store, mode, fn) { return db().then(d => new Promise((res, rej) => { const t = d.transaction(store, mode), s = t.objectStore(store); let out; Promise.resolve(fn(s)).then(v => { out = v; }, () => {}); t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); })); }
const kvGet = k => tx('kv', 'readonly', s => req(s.get(k))), kvSet = (k, v) => tx('kv', 'readwrite', s => req(s.put(v, k))), kvDel = k => tx('kv', 'readwrite', s => req(s.delete(k))).catch(() => {});

/* ---------------- snapshots ---------------- */
const projKey = () => Ed.api.slotId ? 'slot:' + Ed.api.slotId : 'unsaved:' + ((Ed.project && Ed.project.name) || 'game');
function snapshotData() { const p = Ed.project; if (!p) return null; try { if (ENG.stampProject) ENG.stampProject(p); return JSON.stringify(p); } catch (e) { return null; } }
function recInfo(json, reason) { return { json, name: Ed.project.name, slot: Ed.api.slotId || null, proj: projKey(), t: Date.now(), reason, size: json.length }; }
async function writeRecovery(reason) {
  const json = snapshotData(); if (!json) return false;
  try { await kvSet('recovery', recInfo(json, reason)); SAFE.lastSnap = Date.now(); return true; } catch (e) { console.warn('Vira safety: recovery copy failed', e); return false; }
}
/* localStorage writes finish before the page goes away, IndexedDB ones may not, so closing uses this */
function writeRescue(reason) { const json = snapshotData(); if (!json) return false; return lsSet('vira.rescue', JSON.stringify(recInfo(json, reason))); }
function clearRecovery() { kvDel('recovery'); lsDel('vira.rescue'); }
async function addHistory(reason, json) {
  json = json || snapshotData(); if (!json) return; const proj = projKey(), entry = { proj, name: Ed.project.name, t: Date.now(), reason, size: json.length, objects: (Ed.project.objects || []).length, json };
  try { await tx('history', 'readwrite', s => req(s.add(entry))); SAFE.lastHist[proj] = entry.t; await prune(proj); } catch (e) { console.warn('Vira safety: history copy failed', e); }
}
async function listHistory(proj) { return tx('history', 'readonly', s => req(proj ? s.index('proj').getAll(proj) : s.getAll())).then(a => (a || []).sort((x, y) => y.t - x.t)); }
async function prune(proj) {
  const mine = await listHistory(proj), drop = mine.slice(KEEP).map(e => e.id);
  /* and a ceiling for everything together, oldest first */
  const every = (await listHistory()).filter(e => !drop.includes(e.id)); let total = every.reduce((a, e) => a + e.size, 0); for (let i = every.length - 1; i >= 0 && total > 200 * 1048576; i--) { total -= every[i].size; drop.push(every[i].id); }
  if (drop.length) await tx('history', 'readwrite', s => Promise.all(drop.map(id => req(s.delete(id)))));
}

/* ---------------- autosave ---------------- */
async function autosave(test) {
  if ((quiet() && !test) || !Ed.project || Ed.playing || !Ed.dirty) return;
  /* into the browser save list (a new project gets its place there on its first autosave) */
  let ok = false; try { ok = Ed.api.saveLocal(true); } catch (e) { ok = false; }
  if (!ok) { await writeRecovery('autosave, browser save space full'); setState('Kept in recovery storage'); }
  if (test) return; const k = projKey(); if (!SAFE.lastHist[k] || Date.now() - SAFE.lastHist[k] > HISTORY_EVERY_MS) await addHistory('Autosave');
}
setInterval(() => autosave(false), AUTOSAVE_MS);
setInterval(() => { if (!quiet() && Ed.project && Ed.dirty && !Ed.playing && Date.now() - SAFE.lastSnap > SNAP_MS - 1000) writeRecovery('snapshot'); }, SNAP_MS);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && Ed.dirty && !quiet()) writeRecovery('tab hidden'); });

/* ---------------- clean exit and crash detection ---------------- */
const SID = Math.random().toString(36).slice(2), PREV = (() => { try { return JSON.parse(lsGet('vira.session') || 'null'); } catch (x) { return null; } })();
function sessionMark(clean) { lsSet('vira.session', JSON.stringify({ sid: SID, t: Date.now(), clean })); }
if (!TEST) sessionMark(false);
function closing() { if (quiet()) return; if (Ed.dirty) { writeRescue('closing'); writeRecovery('closing'); } sessionMark(true); }
addEventListener('pagehide', closing);
setInterval(() => { if (!quiet()) sessionMark(false); }, 30000);

const whenFree = fn => { if (Ed.modalOpen || Ed.playing) setTimeout(() => whenFree(fn), 600); else fn(); };
async function checkRecovery() {
  const prev = PREV; let rec = null, res = null; try { rec = await kvGet('recovery'); } catch (e) { rec = null; } try { res = JSON.parse(lsGet('vira.rescue') || 'null'); } catch (x) { res = null; }
  if (res && res.json && (!rec || res.t > rec.t)) rec = res; if (!rec || !rec.json) return;
  /* only offer it when it is newer than what that project last saved */
  const idx = saveIndex(), savedT = (rec.slot && idx[rec.slot] && idx[rec.slot].t) || 0; if (savedT >= rec.t) { clearRecovery(); return; }
  const crashed = !!(prev && prev.clean === false), ago = timeAgo(rec.t);
  const body = h('div', null, h('p', null, (crashed ? 'Vira did not close normally last time. ' : '') + 'Your project "' + rec.name + '" has changes from ' + ago + ' that were not saved.'),
    h('p', { class: 'dim', style: 'font-size:12.5px' }, 'Restoring opens that version. The project open right now goes into Version history first, so nothing is lost either way.'));
  U.modal(crashed ? 'Bring back your work?' : 'Unsaved work found', body, [['Discard it', () => { if (Ed.project) addHistory('Unsaved work that was discarded', rec.json); clearRecovery(); }], ['Download a copy', () => { download(rec.json, slugName(rec.name) + '-recovered.vira.json'); return false; }],
    ['Restore it', () => { restoreJson(rec.json, rec.slot && idx[rec.slot] ? rec.slot : null, 'Before restoring unsaved work').then(() => { clearRecovery(); U.toast('Restored "' + rec.name + '" from ' + ago); }, () => {}); }, 'primary']]);
}
async function restoreJson(json, slot, reason) {
  if (Ed.project) await addHistory(reason || 'Before restoring', snapshotData());
  /* the editor's loadProject puts the open project back and explains if this one fails (it resolves to false) */
  if (await Ed.api.loadProject(JSON.parse(json), slot || null) === false) throw new Error('it could not open');
  Ed.dirty = true; setState('Restored, not saved yet');
}
function bootProblem() {
  const b = Ed.bootProblem; if (!b) return; Ed.bootProblem = null; const name = (saveIndex()[b.slot] || {}).name || (() => { try { return JSON.parse(b.raw).name; } catch (x) { return ''; } })(), q = name ? '"' + name + '"' : 'your last project';
  const body = h('div', null, h('p', null, b.safe ? 'Safe mode: Vira opened the starter level instead of ' + q + '. Your project is still saved in this browser.' : 'Vira could not open ' + q + ', so it opened the starter level instead. Your project is still saved in this browser, untouched.'),
    b.error ? h('p', { class: 'dim', style: 'font:12px/1.5 ui-monospace,Consolas,monospace' }, b.error) : null, h('p', { class: 'dim', style: 'font-size:12.5px' }, 'Download a copy to keep it safe, try an earlier version from Version history, or send File › Problem report along with it.'));
  U.modal(b.safe ? 'Safe mode' : 'Your last project did not open', body, [['OK'], ['Saved projects', () => { setTimeout(() => Ed.api.openSavedList(), 50); }], ['Download a copy', () => { download(b.raw, slugName(name) + '.vira.json'); return false; }, 'primary']]);
}

/* ---------------- the same project saved from another tab ---------------- */
addEventListener('storage', e => {
  if (quiet() || !e.key || !Ed.api.slotId || e.key !== 'kiln.p.' + Ed.api.slotId || e.newValue == null) return;
  whenFree(() => U.modal('Saved in another tab', h('p', null, '"' + Ed.project.name + '" was just saved from another Vira tab or window. If you keep working here, your next save replaces that version.'),
    [['Keep mine', () => { Ed.dirty = true; setState('Unsaved changes'); }], ['Load the other version', () => { restoreJson(e.newValue, Ed.api.slotId, 'Before loading the version from another tab').then(() => { Ed.dirty = false; setState('Saved'); }, () => {}); }, 'primary']]));
});

/* ---------------- version history ---------------- */
SAFE.history = async function () {
  let list; try { list = await listHistory(projKey()); } catch (e) { U.toast('Version history is not available in this browser', 'warn'); return; }
  let all = false; const body = h('div', { class: 'sf-hist' }), draw = async () => {
    body.innerHTML = ''; const rows = all ? await listHistory() : list;
    body.append(h('div', { class: 'sf-hhead' }, h('p', { class: 'dim', style: 'margin:0;font-size:12.5px' }, all ? 'Every project kept in this browser.' : 'Earlier versions of "' + Ed.project.name + '". Vira keeps the last ' + KEEP + '.'), h('button', { class: 'btn sm', onclick: () => { all = !all; draw(); } }, all ? 'Only this project' : 'All projects')));
    if (!rows.length) { body.append(h('p', { class: 'dim' }, 'No earlier versions yet. Vira keeps one every time you save, and one every 10 minutes while you work.')); return; }
    const tbl = h('div', { class: 'sf-list' }); rows.forEach(e => tbl.append(h('div', { class: 'sf-row' }, h('div', null, h('b', null, all ? e.name : new Date(e.t).toLocaleString()), h('small', null, (all ? new Date(e.t).toLocaleString() + ' · ' : '') + e.reason + ' · ' + e.objects + ' objects · ' + kb(e.size))),
      h('button', { class: 'btn sm', onclick: () => download(e.json, slugName(e.name) + '-' + new Date(e.t).toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.vira.json') }, 'Download'),
      h('button', { class: 'btn sm primary', onclick: async () => { U.closeModal(); const sl = e.proj.startsWith('slot:') ? e.proj.slice(5) : null; try { await restoreJson(e.json, sl && saveIndex()[sl] ? sl : null, 'Before opening an earlier version'); U.toast('Opened the version from ' + timeAgo(e.t) + '. Save to keep it.'); } catch (x) { } } }, 'Open')))); body.append(tbl);
  }; await draw(); U.modal('Version history', body, [['Close']]);
};

/* ---------------- backups ---------------- */
SAFE.backupAll = async function () {
  const out = { vira: 'backup', engine: ENG.VERSION, format: ENG.FORMAT, t: new Date().toISOString(), projects: [] }, idx = saveIndex();
  Object.keys(idx).forEach(id => { try { const d = lsGet('kiln.p.' + id); if (d) out.projects.push({ slot: id, name: idx[id].name, t: idx[id].t, project: JSON.parse(d) }); } catch (x) { } });
  if (Ed.project && (Ed.dirty || !out.projects.some(p => p.slot === Ed.api.slotId))) { const cur = { slot: Ed.api.slotId || null, name: Ed.project.name + (Ed.dirty ? ' (open, with unsaved changes)' : ''), t: Date.now(), project: JSON.parse(snapshotData()) }; out.projects.push(cur); }
  await download(JSON.stringify(out), 'vira-backup-' + new Date().toISOString().slice(0, 10) + '.json'); U.toast(out.projects.length + ' project' + (out.projects.length === 1 ? '' : 's') + ' backed up');
};
SAFE.restoreBackup = async function (data) {
  if (!data) { const f = await new Promise(res => { const i = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' }); document.body.append(i); i.onchange = () => { res(i.files[0]); i.remove(); }; i.click(); }); if (!f) return;
    try { data = JSON.parse(await f.text()); } catch (e) { U.toast('That file could not be read', 'warn'); return; } }
  const list = data && data.vira === 'backup' && Array.isArray(data.projects) ? data.projects.filter(e => e && e.project) : data && Array.isArray(data.objects) ? [{ name: data.name, project: data }] : null; if (!list || !list.length) { U.toast('That is not a Vira backup or project file', 'warn'); return; }
  const body = h('div', { class: 'sf-list' }); list.forEach(e => body.append(h('div', { class: 'sf-row' }, h('div', null, h('b', null, e.name || 'Project'), h('small', null, (e.t ? new Date(e.t).toLocaleString() + ' · ' : '') + ((e.project.objects || []).length) + ' objects')),
    h('button', { class: 'btn sm primary', onclick: async () => { U.closeModal(); try { await restoreJson(JSON.stringify(e.project), null, 'Before opening from a backup'); U.toast('Opened "' + (e.name || 'project') + '". Press Ctrl+S to keep it in this browser.'); } catch (x) { } } }, 'Open'))));
  if (list.length > 1) body.append(h('div', { class: 'sf-row' }, h('div', null, h('b', null, 'All ' + list.length + ' projects'), h('small', null, 'Adds every one to this browser\'s saved projects')), h('button', { class: 'btn sm', onclick: () => {
    const idx = saveIndex(); let n = 0; list.forEach(e => { const id = ENG.uid(); if (lsSet('kiln.p.' + id, JSON.stringify(e.project))) { idx[id] = { name: e.name || e.project.name || 'Project', t: Date.now(), size: 0 }; n++; } }); lsSet('kiln.index', JSON.stringify(idx));
    U.closeModal(); U.toast(n + ' of ' + list.length + ' projects added. Open them from File › Open saved project.', n < list.length ? 'warn' : ''); } }, 'Add all')));
  U.modal('Restore from a backup', body, [['Cancel']]);
};

/* ---------------- errors: caught, kept, never silent ---------------- */
let lastToast = 0;
function caught(msg, stack, kind) {
  msg = String(msg == null ? 'Unknown error' : msg); if (/ResizeObserver loop|^Script error\.?$/i.test(msg)) return;
  SAFE.errors.push({ t: Date.now(), msg: msg.slice(0, 400), stack: String(stack || '').slice(0, 1600), kind, tab: Ed.tab }); if (SAFE.errors.length > 60) SAFE.errors.shift();
  if (quiet() || kind === 'console') return; if (Date.now() - lastToast > 6000) { lastToast = Date.now(); U.toast('Something went wrong (' + msg.slice(0, 80) + '). Your work is safe.', 'warn'); if (Ed.dirty) writeRecovery('after an error'); }
}
SAFE.caught = caught;
addEventListener('error', e => { if (e.message) caught(e.message, e.error && e.error.stack, 'error'); });
addEventListener('unhandledrejection', e => { const r = e.reason; caught(r && (r.message || r), r && r.stack, 'promise'); });
{ const ce = console.error; console.error = function (...a) { try { const st = a.find(x => x && x.stack); caught(a.map(x => x && x.message ? x.message : String(x)).join(' '), st && st.stack, 'console'); } catch (x) { } return ce.apply(console, a); }; }

/* ---------------- storage health ---------------- */
let asked = false;
async function keepStorage() { if (asked) return; asked = true; try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (x) { } }
async function storageCheck() {
  let chars = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); chars += k.length + (localStorage.getItem(k) || '').length; } } catch (x) { } SAFE.lsChars = chars;
  try { if (navigator.storage && navigator.storage.estimate) SAFE.quota = await navigator.storage.estimate(); } catch (x) { }
  if (!quiet() && chars > 4.2e6) U.toast('The browser save space is almost full. File › Back up all projects keeps everything in one file.', 'warn');
}

/* ---------------- problem report ---------------- */
SAFE.report = function () {
  let gl = 'unknown'; try { const c = document.createElement('canvas').getContext('webgl'); const ext = c && c.getExtension('WEBGL_debug_renderer_info'); gl = ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : (c ? c.getParameter(c.RENDERER) : 'no WebGL'); } catch (x) { }
  const p = Ed.project || {}, json = snapshotData() || '', lines = ['Vira Engine ' + ENG.VERSION + ' (project format ' + ENG.FORMAT + ')', 'Browser: ' + navigator.userAgent, 'Screen: ' + innerWidth + 'x' + innerHeight + ' at ' + devicePixelRatio + 'x', 'Graphics: ' + gl, 'VR headset found: ' + !!(ENG.VR && ENG.VR.ok), 'Tab: ' + Ed.tab,
    'Project: format ' + p.v + ', saved by ' + (p.engine || '?') + ', ' + (p.objects || []).length + ' objects, ' + Object.keys(p.models || {}).length + ' models, ' + Object.keys(p.sculpts || {}).length + ' sculpts, ' + (p.htmlGame ? 'imported game, ' : '') + kb(json.length),
    'Browser save space used: ' + kb((SAFE.lsChars || 0) * 2) + (SAFE.quota ? ', storage ' + kb(SAFE.quota.usage || 0) + ' of ' + kb(SAFE.quota.quota || 0) : ''), 'Self-test: ' + (Ed.selftest && Ed.selftest.last ? (Ed.selftest.last.ok ? 'passed' : Ed.selftest.last.failed + ' failed') + ' at ' + new Date(Ed.selftest.last.t).toLocaleString() : 'not run'), '', SAFE.errors.length ? 'Problems caught this session (' + SAFE.errors.length + '):' : 'Problems caught this session: none']
    .concat(SAFE.errors.slice(-20).map(e => new Date(e.t).toLocaleTimeString() + ' [' + e.kind + ', ' + e.tab + '] ' + e.msg + (e.stack ? '\n   ' + e.stack.split('\n').slice(0, 4).join('\n   ') : '')));
  const text = lines.join('\n'), ta = h('textarea', { class: 'in', spellcheck: 'false', style: 'width:100%;box-sizing:border-box;height:300px;font:12px/1.45 ui-monospace,Consolas,monospace' }); ta.value = text;
  U.modal('Problem report', h('div', { class: 'sf-wide' }, h('p', { class: 'dim', style: 'font-size:12.5px' }, 'This describes your setup and any errors Vira caught. Your project itself is not included.'), ta), [['Close'], ['Copy', () => { const done = () => U.toast('Copied'); try { navigator.clipboard.writeText(text).then(done, () => { ta.select(); document.execCommand('copy'); done(); }); } catch (x) { ta.select(); document.execCommand('copy'); done(); } return false; }, 'primary']]);
};

/* ---------------- helpers ---------------- */
function timeAgo(t) { const s = Math.round((Date.now() - t) / 1000), n = (v, u) => v + ' ' + u + (v === 1 ? '' : 's') + ' ago'; return s < 60 ? 'a few seconds ago' : s < 3600 ? n(Math.round(s / 60), 'minute') : s < 86400 ? n(Math.round(s / 3600), 'hour') : new Date(t).toLocaleString(); }
const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB', slugName = s => (String(s || 'game').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game');
async function download(text, name) { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }

/* ---------------- editor hooks ---------------- */
Ed.onSaved = (silent, json) => { if (quiet()) return; clearRecovery(); if (!silent) { addHistory('Saved', json); keepStorage(); } };
Ed.onSaveFailed = () => { if (!quiet()) { writeRecovery('save failed'); writeRescue('save failed'); } };
Ed.onLoaded = p => {
  const m = ENG.lastMigration; if (!m || m.seen) return; m.seen = true; if (quiet()) return;
  if (m.newer) U.toast('This project was made with a newer Vira (' + (m.engine || 'unknown') + '). It opened, but some parts may not work here.', 'warn');
  else if (m.log.length) whenFree(() => U.modal('Opened with repairs', h('div', null, h('p', null, 'Some parts of "' + p.name + '" were damaged or out of date. Vira fixed them so the project opens:'), h('ul', { style: 'margin:6px 0 10px 18px;line-height:1.65;font-weight:400;font-size:13px' }, m.log.slice(0, 12).map(x => h('li', null, x.charAt(0).toUpperCase() + x.slice(1) + '.'))), h('p', { class: 'dim', style: 'font-size:12.5px' }, 'The file it came from is unchanged. Save to keep the repaired version.')), [['OK', null, 'primary']]));
  else if (m.steps.length && m.from < ENG.FORMAT && m.from > 1) U.toast('Updated "' + p.name + '" from an older Vira version');
};
document.head.append(h('style', null, `.sf-hhead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}#modal .card:has(.sf-list),#modal .card:has(.sf-wide){width:min(640px,100%)}.sf-list{display:flex;flex-direction:column;gap:6px;max-height:56vh;overflow:auto}
.sf-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.1));background:rgba(255,255,255,.02)}.sf-row>div{flex:1;min-width:0}.sf-row b{display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sf-row small{color:var(--dim);font-size:11.5px}`));

/* start once the editor has opened its first project */
(function start() { if (!Ed.project) { setTimeout(start, 200); return; } if (SAFE.ready) return; SAFE.ready = true; if (TEST) return; db().catch(() => {}); setTimeout(() => whenFree(bootProblem), 900); setTimeout(() => whenFree(checkRecovery), 1600); setTimeout(storageCheck, 4000); })();
Object.assign(SAFE, { autosave, writeRecovery, writeRescue, clearRecovery, listHistory, addHistory, kvGet, kvSet, kvDel, checkRecovery, quiet });
})();
