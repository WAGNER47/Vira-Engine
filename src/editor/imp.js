/* Imported HTML games: bring in a game made outside Vira (for example with Claude) and edit it here.
   The game's own code runs unchanged. Its settings tables (const GUNS = {...}, const GRAV = 12.2, ...) are found by reading
   the code, shown as editable tables in the editor, and every edit is written back into the code itself, so a played or
   exported game is just the original file with your changes typed in. No eval: literals are parsed, and anything that is
   not a plain value (functions, math, calls) is kept as it was. Used by the editor only. */
window.VIRA_IMPORT = (function () {
  const ID = /[A-Za-z0-9_$]/, KW_RX = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await', 'instanceof']);

  /* ---------------- a small JavaScript scanner: strings, templates, comments, regex literals, brackets ---------------- */
  function skipStr(s, i) { const q = s[i]; i++; while (i < s.length) { const c = s[i]; if (c === '\\') { i += 2; continue; } if (c === q) return i + 1; if (c === '\n') return i; i++; } return i; }
  function skipTpl(s, i) { i++; while (i < s.length) { const c = s[i]; if (c === '\\') { i += 2; continue; } if (c === '`') return i + 1; if (c === '$' && s[i + 1] === '{') { i = scan(s, i + 2, s.length, null, 'close'); continue; } i++; } return i; }
  function skipRx(s, i) { i++; let cls = false; while (i < s.length) { const c = s[i]; if (c === '\\') { i += 2; continue; } if (c === '\n') return i; if (cls) { if (c === ']') cls = false; } else if (c === '[') cls = true; else if (c === '/') { i++; while (i < s.length && /[a-z]/i.test(s[i])) i++; return i; } i++; } return i; }
  function skipWs(s, i) {
    for (;;) {
      while (i < s.length && /\s/.test(s[i])) i++;
      if (s[i] === '/' && s[i + 1] === '/') { const n = s.indexOf('\n', i); i = n < 0 ? s.length : n; continue; }
      if (s[i] === '/' && s[i + 1] === '*') { const n = s.indexOf('*/', i + 2); i = n < 0 ? s.length : n + 2; continue; }
      return i;
    }
  }
  /* Walks code from i. mode 'close': stop after the bracket that closes the starting level. mode 'expr': stop before a , ; ) ] }
     at the starting level. onWord(start, word, end, depth) may return a new position to jump to. */
  function scan(s, i, end, onWord, mode) {
    let depth = 0, prev = '', word = '';
    while (i < end) {
      const c = s[i];
      if (c === '/' && s[i + 1] === '/') { const n = s.indexOf('\n', i); i = n < 0 ? end : n; continue; }
      if (c === '/' && s[i + 1] === '*') { const n = s.indexOf('*/', i + 2); i = n < 0 ? end : n + 2; continue; }
      if (c === '"' || c === "'") { i = skipStr(s, i); prev = '"'; word = ''; continue; }
      if (c === '`') { i = skipTpl(s, i); prev = '"'; word = ''; continue; }
      if (c === '/') { if (!prev || '(,=:[!&|?{};+-*%<>~^'.includes(prev) || KW_RX.has(word)) { i = skipRx(s, i); prev = '"'; word = ''; continue; } prev = '/'; word = ''; i++; continue; }
      if (mode === 'expr' && depth === 0 && (c === ',' || c === ';' || c === ')' || c === ']' || c === '}')) return i;
      if (c === '{' || c === '(' || c === '[') { depth++; prev = c; word = ''; i++; continue; }
      if (c === '}' || c === ')' || c === ']') { depth--; if (mode === 'close' && depth < 0) return i + 1; prev = c; word = ''; i++; continue; }
      if (ID.test(c)) { const st = i; while (i < end && ID.test(s[i])) i++; word = s.slice(st, i); prev = 'a'; if (onWord) { const r = onWord(st, word, i, depth); if (r > i) { i = r; prev = '}'; word = ''; } } continue; }
      if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') { prev = c; word = ''; }
      i++;
    }
    return i;
  }

  /* ---------------- literal parser: objects, arrays, numbers, strings, booleans; anything else stays as raw code ---------------- */
  const NUM = /^-?\s*(0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/;
  function ends(s, e) { const j = skipWs(s, e); return j >= s.length || ',}]);'.includes(s[j]) || /\n/.test(s.slice(e, j)); }
  function raw(s, i) { const e = scan(s, i, s.length, null, 'expr'); let t = e; while (t > i && /\s/.test(s[t - 1])) t--; return { t: 'raw', s: i, e: t }; }
  function parseValue(s, i) {
    i = skipWs(s, i); const c = s[i];
    if (c === '{') return parseObj(s, i);
    if (c === '[') return parseArr(s, i);
    if (c === '"' || c === "'" || c === '`') {
      const e = c === '`' ? skipTpl(s, i) : skipStr(s, i), txt = s.slice(i, e);
      if ((c === '`' && txt.includes('${')) || !ends(s, e)) return raw(s, i);
      let v; try { v = c === '`' ? txt.slice(1, -1).replace(/\\`/g, '`').replace(/\\\$/g, '$').replace(/\\\\/g, '\\') : c === '"' ? JSON.parse(txt) : JSON.parse('"' + txt.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"'); } catch (x) { return raw(s, i); }
      return { t: 'str', s: i, e, v, q: c };
    }
    const m = NUM.exec(s.slice(i, i + 40));
    if (m && !ID.test(s[i + m[0].length] || '')) {
      const e = i + m[0].length; if (!ends(s, e)) return raw(s, i);
      const neg = m[0][0] === '-', body = m[1], hex = /^0x/i.test(body), v = (neg ? -1 : 1) * (hex ? parseInt(body, 16) : parseFloat(body));
      return { t: 'num', s: i, e, v, hex, hexLen: hex ? body.length - 2 : 0 };
    }
    const w = /^(true|false|null|undefined)\b/.exec(s.slice(i, i + 10));
    if (w && ends(s, i + w[1].length)) return w[1] === 'true' || w[1] === 'false' ? { t: 'bool', s: i, e: i + w[1].length, v: w[1] === 'true' } : { t: 'nul', s: i, e: i + w[1].length };
    return raw(s, i);
  }
  function parseObj(s, i) {
    const node = { t: 'obj', s: i, props: [] }; i++;
    for (;;) {
      i = skipWs(s, i); const c = s[i];
      if (i >= s.length) { node.e = i; return node; }
      if (c === '}') { node.e = i + 1; return node; }
      if (c === ',') { i++; continue; }
      const ks = i; let k = null;
      if (c === '"' || c === "'") { const e = skipStr(s, i); try { k = c === '"' ? JSON.parse(s.slice(i, e)) : s.slice(i + 1, e - 1).replace(/\\'/g, "'"); } catch (x) { k = s.slice(i + 1, e - 1); } i = e; }
      else if (ID.test(c)) { const st = i; while (ID.test(s[i] || '')) i++; k = s.slice(st, i); }
      if (k != null) { const j = skipWs(s, i); if (s[j] === ':') { const v = parseValue(s, j + 1); node.props.push({ k, s: ks, e: v.e, v }); i = v.e; continue; } }
      const r = raw(s, ks); node.props.push({ k: null, s: ks, e: r.e, v: r }); i = Math.max(r.e, ks + 1);
    }
  }
  function parseArr(s, i) {
    const node = { t: 'arr', s: i, items: [] }; i++;
    for (;;) {
      i = skipWs(s, i);
      if (i >= s.length) { node.e = i; return node; }
      if (s[i] === ']') { node.e = i + 1; return node; }
      if (s[i] === ',') { i++; continue; }
      const v = s.slice(i, i + 3) === '...' ? raw(s, i) : parseValue(s, i); node.items.push({ s: v.s, e: v.e, v }); i = Math.max(v.e, i + 1);
    }
  }
  const prop = (node, k) => node && node.t === 'obj' ? node.props.find(p => p.k === k) : null;
  function itemKey(item, idx) { const p = prop(item.v, 'id'); return p && p.v.t === 'str' ? '#' + p.v.v : String(idx); }
  const entries = node => node.t === 'obj' ? node.props.filter(p => p.k != null).map(p => [p.k, p]) : node.items.map((it, i) => [itemKey(it, i), it]);
  function countLeaves(n) { if (!n) return 0; if (n.t === 'obj') return n.props.reduce((a, p) => a + countLeaves(p.v), 0); if (n.t === 'arr') return n.items.reduce((a, p) => a + countLeaves(p.v), 0); return n.t === 'num' || n.t === 'str' || n.t === 'bool' ? 1 : 0; }

  /* ---------------- reading a whole HTML game ---------------- */
  const LIB_URLS = [ // CDN files Vira already carries, so imported games keep working offline
    [/three(\.js\/r128|@0\.128\.\d+\/build)\/three(\.min)?\.js/i, 'lib-three'], [/cannon(\.js\/0\.6\.2|@0\.6\.2)\/.*cannon(\.min)?\.js/i, 'lib-cannon'],
    [/three@0\.128.*\/GLTFLoader\.js/i, 'lib-gltf'], [/three@0\.128.*\/OBJLoader\.js/i, 'lib-obj'], [/three@0\.128.*\/SkeletonUtils\.js/i, 'lib-skel'], [/three@0\.128.*\/TransformControls\.js/i, 'lib-tc'],
    [/three@0\.128.*\/CopyShader\.js/i, 'lib-copy'], [/three@0\.128.*\/LuminosityHighPassShader\.js/i, 'lib-lumhp'], [/three@0\.128.*\/AfterimageShader\.js/i, 'lib-afters'], [/three@0\.128.*\/FXAAShader\.js/i, 'lib-fxaa'],
    [/three@0\.128.*\/EffectComposer\.js/i, 'lib-composer'], [/three@0\.128.*\/RenderPass\.js/i, 'lib-renderpass'], [/three@0\.128.*\/ShaderPass\.js/i, 'lib-shaderpass'], [/three@0\.128.*\/MaskPass\.js/i, 'lib-maskpass'],
    [/three@0\.128.*\/UnrealBloomPass\.js/i, 'lib-bloom'], [/three@0\.128.*\/AfterimagePass\.js/i, 'lib-afterpass'], [/three@0\.128.*\/Reflector\.js/i, 'lib-reflector']];
  function pretty(name) { const w = name.toLowerCase().split('_').filter(Boolean).join(' '); return w.charAt(0).toUpperCase() + w.slice(1); }
  function noteBefore(s, at, lo) { // the comment just above a declaration (or on its first line) explains what the table is
    const lineEnd = s.indexOf('\n', at), first = s.slice(at, lineEnd < 0 ? s.length : lineEnd), m = /\/\/\s*(.+)$|\/\*\s*(.+?)\s*\*\//.exec(first); if (m) return (m[1] || m[2]).trim();
    const before = s.slice(Math.max(lo, at - 400), at).replace(/\s+$/, ''), c1 = /\/\/\s*([^\n]+)$/.exec(before);
    const t = c1 ? c1[1] : before.endsWith('*/') && before.lastIndexOf('/*') >= 0 ? before.slice(before.lastIndexOf('/*') + 2, -2) : ''; return t.replace(/^[=\-*\s]+|[=\-*\s]+$/g, '').replace(/\s+/g, ' ').slice(0, 160);
  }
  function analyze(html) {
    const out = { scripts: [], tables: [], consts: [], media: [], links: [], vira: null, title: '' };
    const tm = /<title>([\s\S]*?)<\/title>/i.exec(html); out.title = tm ? tm[1].trim() : '';
    const vb = /<script>\s*ENG\.boot\((\{[\s\S]*\})\);\s*<\/script>/.exec(html); if (vb && /id="lib-three"|ENG\.Game/.test(html)) { try { out.vira = JSON.parse(vb[1]); } catch (x) { } }
    const re = /<script\b([^>]*)>/gi; let m;
    while ((m = re.exec(html))) {
      const attrs = m[1], cs = m.index + m[0].length, close = html.toLowerCase().indexOf('<\/script', cs); if (close < 0) break;
      const ce = close, tagEnd = html.indexOf('>', close) + 1, srcM = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs), type = (/\btype\s*=\s*["']([^"']+)["']/i.exec(attrs) || [])[1] || '';
      re.lastIndex = tagEnd;
      if (srcM) { const url = srcM[1], lib = LIB_URLS.find(([r]) => r.test(url)); out.links.push({ url, s: m.index, e: tagEnd, lib: lib ? lib[1] : null }); continue; }
      if (type && !/javascript|module|^text\/babel$/i.test(type)) continue;
      const code = html.slice(cs, ce), head = code.slice(0, 2000), longest = code.length > 100000 ? Math.max(...code.split('\n').map(l => l.length)) : 0;
      const lib = code.length > 100000 && (/@license|Copyright \(c\)|Copyright \d{4}|SPDX-License/i.test(head) || longest > 40000);
      const name = lib ? 'Library' + (/three\.js|THREE/.test(head) ? ' (three.js)' : /cannon/i.test(head) ? ' (cannon.js)' : '') : 'Game script ' + (out.scripts.filter(x => !x.lib).length + 1);
      const sc = { i: out.scripts.length, s: cs, e: ce, lib, name, module: /module/i.test(type), lines: code.split('\n').length, size: code.length }; out.scripts.push(sc);
      if (lib) continue;
      /* imports from the web (ES modules) still need a connection */
      code.replace(/\bfrom\s+["'](https?:\/\/[^"']+)["']|import\(\s*["'](https?:\/\/[^"']+)["']\s*\)/g, (_, a, b) => { out.links.push({ url: a || b, s: -1, e: -1, lib: null }); return _; });
      /* a game wrapped in (function(){ ... })() keeps its tables one or two levels in */
      let p0 = skipWs(code, 0); while (/^["']use strict["']\s*;?/.test(code.slice(p0, p0 + 16))) p0 = skipWs(code, p0 + /^["']use strict["']\s*;?/.exec(code.slice(p0, p0 + 16))[0].length);
      const pre = code.slice(p0, p0 + 200), iife = /^[;!]?\s*\(?\s*(async\s+)?(function\s*[\w$]*\s*\([^)]*\)|\([^)]*\)\s*=>)\s*\{/.exec(pre);
      const top = iife ? (/^;?\s*!/.test(pre) ? 1 : 2) : 0;
      scan(html, cs, ce, (st, word, end, depth) => {
        if (depth !== top || (word !== 'const' && word !== 'let' && word !== 'var')) return 0;
        let j = end, last = end;
        for (;;) {
          j = skipWs(html, j); const nm = /^[A-Za-z_$][\w$]*/.exec(html.slice(j, j + 80)); if (!nm) return last; const name = nm[0]; let k = skipWs(html, j + name.length); if (html[k] !== '=') return last;
          const v = parseValue(html, k + 1); if (v.t === 'raw') return last;
          if (/^[A-Z][A-Z0-9_]+$/.test(name)) {
            const note = noteBefore(html, st, cs), entry = { name, label: pretty(name), note, node: v, script: sc.i };
            if (v.t === 'obj' || v.t === 'arr') { if (countLeaves(v) > 0) out.tables.push(entry); } else if (v.t !== 'nul') out.consts.push(entry);
          }
          last = v.e; k = skipWs(html, v.e); if (html[k] !== ',') return last; j = k + 1;
        }
      });
    }
    const mre = /data:(image|audio|video|font|model|application\/octet-stream)[\w.+\/-]*;base64,[A-Za-z0-9+/=]{200,}/g;
    while ((m = mre.exec(html))) { const uri = m[0], kind = m[1] === 'application/octet-stream' ? 'file' : m[1], mime = uri.slice(5, uri.indexOf(';')); out.media.push({ key: kind + ':' + uri.length + ':' + uri.slice(uri.indexOf(',') + 1, uri.indexOf(',') + 33), kind, mime, s: m.index, e: m.index + uri.length, size: Math.round(uri.length * .75) }); }
    return out;
  }

  /* ---------------- writing edits back ---------------- */
  function literal(node, v) {
    if (typeof v === 'boolean') return String(v);
    if (typeof v === 'number') { if (!isFinite(v)) return '0'; if (node.hex && Number.isInteger(v) && v >= 0) return '0x' + v.toString(16).padStart(node.hexLen || 1, '0'); return String(v); }
    const t = String(v), q = node.q || "'";
    if (q === '"') return JSON.stringify(t);
    if (q === '`') return '`' + t.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
    return "'" + t.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";
  }
  const keyText = k => /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
  function render(s, node, o) {
    const orig = s.slice(node.s, node.e);
    if (o === undefined) return orig;
    if (node.t === 'obj' || node.t === 'arr') {
      if (!o || typeof o !== 'object') return orig;
      const list = node.t === 'obj' ? node.props : node.items, mods = [], keyOf = (en, i) => node.t === 'obj' ? en.k : itemKey(en, i);
      list.forEach((en, i) => {
        const k = keyOf(en, i); if (k == null || !Object.prototype.hasOwnProperty.call(o, k)) return; const ov = o[k];
        if (ov && ov.$delete) { const nx = list[i + 1], pv = list[i - 1]; mods.push(nx ? { s: en.s, e: nx.s, text: '' } : { s: pv ? pv.e : en.s, e: en.e, text: '' }); return; }
        mods.push({ s: en.v.s, e: en.v.e, text: render(s, en.v, ov) });
      });
      const adds = Object.keys(o).filter(k => o[k] && o[k].$copyOf != null && !list.some((en, i) => keyOf(en, i) === k));
      if (adds.length && list.length) {
        const last = list[list.length - 1], ls = s.lastIndexOf('\n', last.s) + 1, ind = s.slice(ls, last.s), sep = /^\s*$/.test(ind) && ls > node.s ? '\n' + ind : ' '; let txt = '';
        adds.forEach(k => {
          const spec = o[k], src = list.find((en, i) => keyOf(en, i) === spec.$copyOf); if (!src) return;
          const rest = {}; for (const x in spec) if (x[0] !== '$') rest[x] = spec[x];
          txt += ',' + sep + (node.t === 'obj' ? keyText(k) + ': ' : '') + render(s, src.v, Object.keys(rest).length ? rest : undefined);
        });
        mods.push({ s: last.e, e: last.e, text: txt });
      }
      let out = orig; mods.sort((a, b) => b.s - a.s || b.e - a.e).forEach(m => { out = out.slice(0, m.s - node.s) + m.text + out.slice(m.e - node.s); });
      return out;
    }
    if (node.t === 'raw' || node.t === 'nul' || (o !== null && typeof o === 'object')) return orig;
    return literal(node, o);
  }
  /* the playable HTML: the original file with table edits, swapped media and offline libraries applied */
  function build(html, A, game, libText) {
    const mods = [], edits = game.edits || {}, media = game.media || {};
    A.tables.concat(A.consts).forEach(t => { const o = edits[t.name]; if (o !== undefined) mods.push({ s: t.node.s, e: t.node.e, text: render(html, t.node, o) }); });
    const inside = (s, e) => mods.some(m => s >= m.s && e <= m.e);
    A.media.forEach(md => { const rep = media[md.key]; if (rep && !inside(md.s, md.e)) mods.push({ s: md.s, e: md.e, text: rep }); });
    if (libText) A.links.forEach(l => { if (l.s < 0 || !l.lib) return; const code = libText(l.lib); if (code) mods.push({ s: l.s, e: l.e, text: '<script>' + code + '\n<\/script>' }); });
    let out = html; mods.sort((a, b) => b.s - a.s).forEach(m => { out = out.slice(0, m.s) + m.text + out.slice(m.e); });
    return out;
  }
  /* reading a table as plain values, for showing it */
  function value(node) {
    if (!node) return undefined;
    if (node.t === 'obj') { const o = {}; node.props.forEach(p => { if (p.k != null) o[p.k] = value(p.v); }); return o; }
    if (node.t === 'arr') return node.items.map(it => value(it.v));
    if (node.t === 'num' || node.t === 'str' || node.t === 'bool') return node.v;
    return undefined;
  }
  /* the guide for making new games that come in cleanly */
  const READY = [
    'Keep the whole game in one .html file, with libraries inlined or from a CDN (three.js r128 and cannon.js 0.6.2 are swapped for Vira\'s own copies so they work offline).',
    'Put every number a designer might tune in top level tables named in CAPITALS, for example const GUNS = { pistol: { dmg: 26, mag: 15 } }, const ENEMIES = {...}, const LEVELS = [...], const PLAYER = { speed: 4.5 }.',
    'Write table values as plain literals (numbers, text, true or false, colors as 0xff8800 or \'#ff8800\'). Math or function calls in a value are kept but are not editable.',
    'Give items in a list an id field (id: \'shotgun\') so edits stay attached when the list changes.',
    'Read the tables at run time instead of copying their numbers into the code, so an edit changes the game everywhere.',
    'Put a short comment above each table saying what it controls. Vira shows it as the table description.',
    'Embed images, sounds and models as data: URLs if the game has any. Vira lists them so they can be swapped.'];
  return { analyze, build, render, value, entries, itemKey, countLeaves, parseValue, scan, READY };
})();
