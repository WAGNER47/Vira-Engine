/* VIRA SCREENS: the complete game interface, in games and in the UI tab of the editor.
   - Fonts: the two bundled families, system families (poster, serif, mono, comic, script) and fonts imported into the project.
   - Stickers: a built-in icon library drawn as SVG, plus imported images.
   - Themes: colours, fonts and a button shape that every screen follows (project.ui.theme).
   - Elements: everything the HUD had, plus images, shapes, logos, a minimap, pips, variable bars, buttons, settings,
     an inventory grid, a dialogue window, a loading bar and a controls list. Every element can have an outline, a shadow,
     a background plate, gradient text, halftone, an entrance animation, an idle motion and a reaction when its value changes.
   - Screens (project.ui.screens): main menu, pause, death, win, loss, loading, settings, inventory, dialogue and custom
     screens, drawn on a 1280 x 720 frame that scales to any window. A screen of a built-in kind replaces the plain menu.
   - Navigation: mouse, keyboard (arrows, Tab, Enter, Esc) and gamepad (sticks, d-pad, A and B, Start), with a focus ring.
     A gamepad also plays the game: left stick moves, right stick looks, triggers fire and slow time, A jumps.
   - Resolution scaling: the HUD grows with the window (project.ui.auto) times a size the player can set (project.ui.scale).
   - Settings a player changes (volumes, sensitivity, field of view, interface size, camera) are kept in the browser per game.
   Loaded after the other runtime files and before project.js. Logic Tiles: show a screen, show dialogue, ask a question, HUD on or off. */
(function () {
'use strict';
const ENG = window.ENG, G = ENG.Game.prototype, esc = ENG.esc, clamp = (v, a, b) => v < a ? a : v > b ? b : v, UI = ENG.UI = { W: 1280, H: 720 };
const slug = s => String(s || 'game').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game';

/* ---------------- fonts ---------------- */
UI.FONTS = [['Chakra Petch', '"Chakra Petch", sans-serif', 'Display'], ['Barlow', '"Barlow", sans-serif', 'Clean'], ['Impact', 'Impact, "Arial Black", sans-serif', 'Poster'], ['Arial Black', '"Arial Black", Impact, sans-serif', 'Heavy'],
  ['Georgia', 'Georgia, "Times New Roman", serif', 'Serif'], ['Palatino', '"Palatino Linotype", Palatino, "Book Antiqua", serif', 'Book'], ['Times New Roman', '"Times New Roman", Times, serif', 'Classic'], ['Trebuchet MS', '"Trebuchet MS", Tahoma, sans-serif', 'Round'], ['Verdana', 'Verdana, Geneva, sans-serif', 'Wide'],
  ['Courier New', '"Courier New", Consolas, monospace', 'Mono'], ['Lucida Console', '"Lucida Console", Monaco, monospace', 'Terminal'], ['Comic Sans MS', '"Comic Sans MS", "Comic Neue", cursive', 'Comic'], ['Brush Script MT', '"Brush Script MT", "Segoe Script", cursive', 'Script'], ['Copperplate', 'Copperplate, "Copperplate Gothic Light", fantasy', 'Caps'], ['monospace', 'monospace', 'Plain mono']];
UI.fontFamily = function (name, project) {
  if (!name) return UI.FONTS[0][1]; if (name.indexOf('font:') === 0) { const f = project && project.ui && project.ui.fonts && project.ui.fonts[name.slice(5)]; return f ? '"' + f.family + '", "Chakra Petch", sans-serif' : UI.FONTS[0][1]; }
  const k = UI.FONTS.find(f => f[0] === name); return k ? k[1] : '"' + name + '", sans-serif';
};
UI.fontOptions = project => UI.FONTS.map(f => [f[0], f[0], f[2]]).concat(Object.values((project && project.ui && project.ui.fonts) || {}).map(f => ['font:' + f.id, f.name, 'Imported']));
UI.fontCSS = project => Object.values((project && project.ui && project.ui.fonts) || {}).map(f => '@font-face{font-family:"' + f.family + '";src:url(' + f.data + ');font-display:block}').join('\n');
ENG.injectUIFonts = function (project, doc) { doc = doc || document; const css = UI.fontCSS(project), id = 'kz-uifonts'; let s = doc.getElementById(id); if (!css && !s) return; if (!s) { s = doc.createElement('style'); s.id = id; doc.head.appendChild(s); } if (s.textContent !== css) s.textContent = css; };

/* ---------------- stickers: a built-in icon library ---------------- */
const pt = (cx, cy, r, a) => (cx + Math.cos(a) * r).toFixed(2) + ' ' + (cy + Math.sin(a) * r).toFixed(2);
const poly = (n, r, rot, cx, cy) => { cx = cx == null ? 12 : cx; cy = cy == null ? 12 : cy; let d = ''; for (let i = 0; i < n; i++) d += (i ? 'L' : 'M') + pt(cx, cy, r, ((rot == null ? -90 : rot) + i * 360 / n) * Math.PI / 180); return '<path d="' + d + 'Z"/>'; };
const star = (n, r1, r2, rot) => { let d = ''; for (let i = 0; i < n * 2; i++) d += (i ? 'L' : 'M') + pt(12, 12, i % 2 ? r2 : r1, ((rot == null ? -90 : rot) + i * 180 / n) * Math.PI / 180); return '<path d="' + d + 'Z"/>'; };
const ring = (r1, r2) => '<path fill-rule="evenodd" d="M12 ' + (12 - r1) + 'a' + r1 + ' ' + r1 + ' 0 1 1 0 ' + 2 * r1 + 'a' + r1 + ' ' + r1 + ' 0 1 1 0 -' + 2 * r1 + 'zM12 ' + (12 - r2) + 'a' + r2 + ' ' + r2 + ' 0 1 0 0 ' + 2 * r2 + 'a' + r2 + ' ' + r2 + ' 0 1 0 0 -' + 2 * r2 + 'z"/>';
const gear = () => { let d = ''; const n = 8; for (let i = 0; i < n * 2; i++) { const a0 = (i * 180 / n - 90) * Math.PI / 180, a1 = ((i + .55) * 180 / n - 90) * Math.PI / 180, r = i % 2 ? 7.4 : 10; d += (i ? 'L' : 'M') + pt(12, 12, r, a0) + 'L' + pt(12, 12, r, a1); } return '<path fill-rule="evenodd" d="' + d + 'ZM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/>'; };
const sector = (a0, a1, r) => { let d = 'M12 12'; for (let k = 0; k <= 8; k++) d += 'L' + pt(12, 12, r, (a0 + (a1 - a0) * k / 8) * Math.PI / 180); return d + 'Z'; };
const rot = (inner, deg) => '<g transform="rotate(' + deg + ' 12 12)">' + inner + '</g>';
const chev = '<path d="M9 5l7 7-7 7-2-2 5-5-5-5z"/>';
UI.ICONS = {
  heart: '<path d="M12 21s-7.5-4.6-9.5-9.1C.9 8.3 3 4.5 6.6 4.5c2 0 3.6 1.1 5.4 3.1 1.8-2 3.4-3.1 5.4-3.1 3.6 0 5.7 3.8 4.1 7.4C19.5 16.4 12 21 12 21z"/>',
  shield: '<path d="M12 2l8 3v6c0 5.2-3.4 9.3-8 11-4.6-1.7-8-5.8-8-11V5z"/>', star: star(5, 10, 4.2), bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  skull: '<path fill-rule="evenodd" d="M12 3a7 7 0 0 0-7 7c0 2.6 1.4 4.8 3.5 6.1V20h7v-3.9A7 7 0 0 0 19 10a7 7 0 0 0-7-7zm-3 7.5a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2zm6 0a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2z"/>',
  gear: gear(), key: '<circle cx="7.5" cy="12" r="4.5"/><rect x="11" y="10.8" width="11" height="2.4"/><rect x="17" y="13" width="2.2" height="3.2"/><rect x="20" y="13" width="2" height="4.2"/>',
  coin: ring(9, 6.5) + '<rect x="10.8" y="8.5" width="2.4" height="7"/>', gem: '<path d="M4 9l4-5h8l4 5-8 12z"/>', diamond: poly(4, 9.5), hex: poly(6, 10), triangle: poly(3, 10),
  crosshair: ring(9, 7) + '<rect x="11" y="1" width="2" height="5"/><rect x="11" y="18" width="2" height="5"/><rect x="1" y="11" width="5" height="2"/><rect x="18" y="11" width="5" height="2"/>',
  target: ring(10, 8) + ring(5.5, 3.5), flag: '<rect x="4" y="3" width="2" height="18"/><path d="M6 4h12l-3 4 3 4H6z"/>',
  trophy: '<path d="M7 3h10v5a5 5 0 0 1-10 0z"/><rect x="10.8" y="12" width="2.4" height="4"/><rect x="7" y="16" width="10" height="2.6" rx="1"/><path d="M5 5h2v3.5A3.5 3.5 0 0 1 4 6zM17 5h2a3.5 3.5 0 0 1-3 3.5V5z"/>',
  warning: '<path fill-rule="evenodd" d="M12 2l11 19H1zm-1 7v6h2V9zm0 7.5v2.3h2v-2.3z"/>', radiation: '<path d="' + sector(210, 270, 10) + sector(330, 30, 10) + sector(90, 150, 10) + '"/><circle cx="12" cy="12" r="2.2"/>',
  arrow: '<path d="M3 10h11V6l7 6-7 6v-4H3z"/>', up: rot(chev, -90), down: rot(chev, 90), left: rot(chev, 180), right: chev,
  play: '<path d="M6 3l15 9-15 9z"/>', pause: '<rect x="5" y="3" width="5" height="18"/><rect x="14" y="3" width="5" height="18"/>',
  lock: '<path fill-rule="evenodd" d="M7 10V8a5 5 0 0 1 10 0v2h2v12H5V10zm2 0h6V8a3 3 0 0 0-6 0z"/>', pin: '<path fill-rule="evenodd" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>',
  compass: ring(10, 8.5) + '<path d="M12 5l2.5 5.5L12 19l-2.5-8.5z"/>', clock: ring(10, 8.5) + '<rect x="11" y="6" width="2" height="7"/><rect x="11" y="11" width="6" height="2"/>',
  fire: '<path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 1-3 0 2 1 3 2 3 0-3-1-6 2-10z"/>', drop: '<path d="M12 2s-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13z"/>',
  sword: rot('<rect x="11" y="2" width="2" height="13"/><path d="M12 1l2 2h-4z"/><rect x="8" y="14" width="8" height="2"/><rect x="11" y="16" width="2" height="6"/>', 45),
  potion: '<path d="M9 2h6v2h-1v4.5l4.5 7A4 4 0 0 1 15 22H9a4 4 0 0 1-3.5-6.5L10 8.5V4H9z"/>', chest: '<path fill-rule="evenodd" d="M3 10a9 6 0 0 1 18 0v10H3zm8 1v3h2v-3z"/>',
  speaker: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7l-1.4-1.4a3 3 0 0 0 0-4.2z"/>', eye: '<path fill-rule="evenodd" d="M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/><circle cx="12" cy="12" r="2"/>',
  hand: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4h1V4a1.5 1.5 0 0 1 3 0v6h1V5.5a1.5 1.5 0 0 1 3 0V13h1V9a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-14 0v-4z"/>',
  run: '<circle cx="14" cy="4" r="2"/><path d="M11 7l4 1 3 4-2 1-2.5-2.5L12 13l3 3v6h-2v-5l-3-2.5L8 17l-4-1 1-2 3 .6 2.5-5.5L8 10l-1.5 2.5L5 11l2.5-4z"/>',
  bullet: '<path d="M8 3h8v9a4 4 0 0 1-8 0z"/><rect x="8" y="14" width="8" height="7" rx="1"/>', medkit: '<path fill-rule="evenodd" d="M5 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm5.5 3v2.5H8v3h2.5V17h3v-2.5H16v-3h-2.5V9z"/><rect x="9" y="3" width="6" height="3" rx="1"/>',
  ammo: '<path fill-rule="evenodd" d="M3 8h18v12H3zm3 2v8h2v-8zm5 0v8h2v-8zm5 0v8h2v-8z"/><rect x="7" y="4" width="10" height="3"/>', grenade: '<circle cx="12" cy="14" r="7"/><rect x="10" y="4" width="4" height="4"/><rect x="13" y="2" width="4" height="2"/>',
  wrench: rot('<path fill-rule="evenodd" d="M9 2a5 5 0 0 1 5 7l7 7-2 2-7-7A5 5 0 0 1 5 4.5l3 3 2-2-3-3A5 5 0 0 1 9 2z"/>', 0), bomb: '<circle cx="11" cy="14" r="8"/><rect x="14" y="4" width="4" height="3" transform="rotate(45 16 5.5)"/><path d="M19 2l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
  ghost: '<path fill-rule="evenodd" d="M12 2a8 8 0 0 0-8 8v12l3-2 2.5 2 2.5-2 2.5 2 2.5-2 3 2V10a8 8 0 0 0-8-8zm-3 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>',
  crown: '<path d="M3 18V8l5 4 4-7 4 7 5-4v10z"/><rect x="3" y="19" width="18" height="2"/>', check: '<path d="M4 12.5l5 5L20 7l-2-2-9 9-3-3z"/>', cross: '<path d="M6 4.5L4.5 6 10.5 12 4.5 18 6 19.5 12 13.5 18 19.5 19.5 18 13.5 12 19.5 6 18 4.5 12 10.5z"/>',
  menu: '<rect x="3" y="5" width="18" height="2.5"/><rect x="3" y="11" width="18" height="2.5"/><rect x="3" y="17" width="18" height="2.5"/>', home: '<path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z"/>',
  pistol: '<path d="M3 7h18v4h-4l-1 3h-4l1-3H9v3H5v-3H3z"/>', rifle: '<path d="M2 10h15l5 1-5 1h-3v3h-3v-3H8l-1 4H4l1-4H2z"/>', shotgun: '<path d="M2 11h17l3 1-3 1H9l-1 5H5l1-5H2z"/>',
  map: '<path fill-rule="evenodd" d="M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2zm6 0v14l6 2V7z"/>', snow: rot('<rect x="11" y="2" width="2" height="20"/>', 0) + rot('<rect x="11" y="2" width="2" height="20"/>', 60) + rot('<rect x="11" y="2" width="2" height="20"/>', 120),
  sun: '<circle cx="12" cy="12" r="5"/>' + [0, 45, 90, 135, 180, 225, 270, 315].map(a => rot('<rect x="11" y="1" width="2" height="4"/>', a)).join(''), moon: '<path d="M14 2a10 10 0 1 0 8 15.5A8 8 0 0 1 14 2z"/>',
  battery: '<path fill-rule="evenodd" d="M2 7h17v10H2zm2 2v6h13V9z"/><rect x="20" y="10" width="2" height="4"/><rect x="5" y="10" width="8" height="4"/>', signal: '<rect x="3" y="15" width="3" height="6"/><rect x="8" y="11" width="3" height="10"/><rect x="13" y="7" width="3" height="14"/><rect x="18" y="3" width="3" height="18"/>',
  dpad: '<path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z"/>', hourglass: '<path d="M6 2h12v2l-5 7 5 7v2H6v-2l5-7-5-7z"/>', exit: '<path d="M3 3h10v2H5v14h8v2H3z"/><path d="M14 8l5 4-5 4v-3H9v-2h5z"/>',
  burst: star(12, 11, 7.5, -90), plus: '<path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/>', dot: '<circle cx="12" cy="12" r="6"/>', square: '<rect x="4" y="4" width="16" height="16" rx="2"/>', circle: '<circle cx="12" cy="12" r="10"/>'
};
UI.iconNames = () => Object.keys(UI.ICONS);
UI.icon = function (name, size, color) { const p = UI.ICONS[name] || UI.ICONS.star; return '<svg class="kz-ico" width="' + (size || 24) + '" height="' + (size || 24) + '" viewBox="0 0 24 24" fill="' + (color || 'currentColor') + '" aria-hidden="true">' + p + '</svg>'; };
UI.stickerSrc = function (src, project) { if (!src) return null; if (src.indexOf('img:') === 0) { const a = project && project.assets && project.assets.images && project.assets.images[src.slice(4)]; return a ? a.data : null; } return null; };

/* ---------------- themes ---------------- */
UI.THEMES = {
  arcade: { label: 'Arcade', tag: 'Amber on graphite, cut corners', accent: '#f0b43c', accent2: '#ff7a3c', ink: '#f2efe6', dim: '#9aa3ad', bg: '#0b0e12', panel: '#151a21', font: 'Chakra Petch', font2: 'Barlow', shape: 'cut', radius: 6, glow: false, upper: true },
  neon: { label: 'Neon', tag: 'Cyan and magenta glow on black', accent: '#3fd0ff', accent2: '#ff3df0', ink: '#eafcff', dim: '#7d9aa6', bg: '#05060c', panel: '#0d1020', font: 'Chakra Petch', font2: 'Barlow', shape: 'glass', radius: 12, glow: true, upper: true },
  noir: { label: 'Noir', tag: 'Ivory serif, no colour', accent: '#e8e2d2', accent2: '#b8a98a', ink: '#f3efe4', dim: '#8a847a', bg: '#08090b', panel: '#15161a', font: 'Georgia', font2: 'Barlow', shape: 'square', radius: 0, glow: false, upper: false },
  military: { label: 'Military', tag: 'Olive, khaki and stencil', accent: '#b8c25a', accent2: '#d9a441', ink: '#e9ecd8', dim: '#8d9a7a', bg: '#0e120d', panel: '#1b2218', font: 'Impact', font2: 'Verdana', shape: 'cut', radius: 2, glow: false, upper: true },
  comic: { label: 'Comic', tag: 'Yellow, red, thick black lines', accent: '#ffd400', accent2: '#ff2e4d', ink: '#111111', dim: '#4a4a4a', bg: '#fff3c4', panel: '#ffffff', font: 'Impact', font2: 'Comic Sans MS', shape: 'comic', radius: 14, glow: false, upper: true, stroke: true },
  minimal: { label: 'Minimal', tag: 'White on black, nothing else', accent: '#ffffff', accent2: '#bdbdbd', ink: '#ffffff', dim: '#8a8a8a', bg: '#000000', panel: '#141414', font: 'Barlow', font2: 'Barlow', shape: 'ghost', radius: 0, glow: false, upper: false },
  fantasy: { label: 'Fantasy', tag: 'Gold on dark leather, ribbons', accent: '#d8b45a', accent2: '#8e5a2b', ink: '#f3e9d2', dim: '#a3946f', bg: '#120f0b', panel: '#2a2117', font: 'Georgia', font2: 'Palatino', shape: 'ribbon', radius: 4, glow: true, upper: false },
  terminal: { label: 'Terminal', tag: 'Green phosphor, monospace', accent: '#3dff7c', accent2: '#19b35a', ink: '#c9ffd9', dim: '#4f8a60', bg: '#030704', panel: '#06120a', font: 'Courier New', font2: 'Courier New', shape: 'square', radius: 0, glow: true, upper: true },
  candy: { label: 'Candy', tag: 'Pink and violet pills', accent: '#ff6fb5', accent2: '#8f6bff', ink: '#ffffff', dim: '#d3b8e6', bg: '#1c0f2b', panel: '#2a1740', font: 'Trebuchet MS', font2: 'Verdana', shape: 'pill', radius: 999, glow: true, upper: false }
};
UI.theme = project => { const t = project && project.ui && project.ui.theme; return Object.assign({ id: 'arcade' }, UI.THEMES.arcade, t && t.id && UI.THEMES[t.id] ? UI.THEMES[t.id] : {}, t || {}); };
const hexRgb = hex => { const h = String(hex || '#000').replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
UI.rgba = (hex, a) => { const c = hexRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')'; };
UI.themeVars = function (T, project) { return '--ui-accent:' + T.accent + ';--ui-accent2:' + T.accent2 + ';--ui-ink:' + T.ink + ';--ui-dim:' + T.dim + ';--ui-bg:' + T.bg + ';--ui-panel:' + T.panel + ';--ui-font:' + UI.fontFamily(T.font, project) + ';--ui-font2:' + UI.fontFamily(T.font2, project) + ';--ui-radius:' + (T.radius == null ? 8 : T.radius) + 'px;--ui-glow:' + (T.glow ? UI.rgba(T.accent, .55) : 'transparent'); };
/* elements made from a theme carry th tags; applying another theme recolours those and leaves hand-picked colours alone */
UI.applyTheme = function (project, T) {
  const ui = UI.store(project); ui.theme = Object.assign({}, T); const map = w => { const th = w.th || {}; if (th.color && T[th.color]) w.color = T[th.color]; if (th.font && T[th.font]) w.font = T[th.font]; if (th.bgColor && T[th.bgColor]) w.bgColor = T[th.bgColor]; if (th.color2 && T[th.color2]) w.color2 = T[th.color2]; if (th.strokeColor && T[th.strokeColor]) w.strokeColor = T[th.strokeColor]; if (w.kind === 'button' && th.shape) w.shape = T.shape; if (th.upper) w.upper = !!T.upper; if (T.stroke && th.color && w.kind !== 'button' && w.kind !== 'shape') { w.stroke = w.stroke || 2; w.strokeColor = '#111111'; } else if (th.stroke) { w.stroke = 0; } };
  ui.screens.forEach(s => { (s.items || []).forEach(map); if (s.th) { if (s.bg) { if (s.bg.kind === 'solid' || s.bg.kind === 'gradient') { s.bg.color = T.bg; s.bg.color2 = T.panel; } if (s.bg.kind === 'dim' || s.bg.kind === 'blur') s.bg.color = T.bg; } } }); (project.hud || []).forEach(map); return ui;
};
UI.store = project => { if (!project.ui || typeof project.ui !== 'object') project.ui = {}; const u = project.ui; if (!Array.isArray(u.screens)) u.screens = []; if (!u.fonts || typeof u.fonts !== 'object') u.fonts = {}; return u; };
UI.screen = (project, kindOrId) => { const u = project && project.ui; if (!u || !Array.isArray(u.screens)) return null; return u.screens.find(s => s.id === kindOrId) || u.screens.find(s => s.kind === kindOrId && s.kind !== 'custom') || u.screens.find(s => s.name && s.name.toLowerCase() === String(kindOrId).toLowerCase()) || null; };
UI.SCREEN_KINDS = { main: 'Main menu', pause: 'Pause', dead: 'Death', win: 'Level won', lose: 'Level lost', loading: 'Loading', settings: 'Settings', inventory: 'Inventory', dialogue: 'Dialogue', custom: 'Custom screen' };

/* ---------------- element catalogue (the editor reads this) ---------------- */
Object.assign(ENG.HUD_KINDS, { image: 'Sticker or image', shape: 'Shape', logo: 'Logo', minimap: 'Minimap', pips: 'Hearts and pips', vbar: 'Variable bar', button: 'Button', setting: 'Setting', inventory: 'Inventory grid', dialogue: 'Dialogue window', keyhelp: 'Controls list', progress: 'Loading bar' });
UI.KINDS = {
  health: { group: 'Game info' }, armor: { group: 'Game info' }, ammo: { group: 'Game info' }, weapon: { group: 'Game info' }, enemies: { group: 'Game info' }, keys: { group: 'Game info' }, timer: { group: 'Game info' }, collectibles: { group: 'Game info' }, compass: { group: 'Game info' }, crosshair: { group: 'Game info', hud: true },
  objective: { group: 'Game info' }, messages: { group: 'Game info', hud: true }, bullettime: { group: 'Bars and meters' }, credits: { group: 'Game info' }, floor: { group: 'Game info' }, bossbar: { group: 'Bars and meters' }, perks: { group: 'Game info' },
  pips: { group: 'Bars and meters', d: { icon: 'heart', count: 5, which: 'health', gap: 4, size: 26, colorOff: '#3a3f47' } }, vbar: { group: 'Bars and meters', d: { label: 'Energy', var: '', max: 100, width: 220 } }, progress: { group: 'Bars and meters', screen: true, d: { label: 'Loading', width: 420 } },
  text: { group: 'Text and logo', text: true, d: { text: 'Your text', size: 28 } }, logo: { group: 'Text and logo', sized: true, d: { text: '{title}', sub: '', icon: 'bolt', shape: 'shield', style: 'flat', color2: '#1a1d24', w: 320, h: 200 } }, keyhelp: { group: 'Text and logo', screen: true, d: { size: 14 } },
  image: { group: 'Shapes and stickers', sized: true, d: { src: 'icon:star', w: 64, h: 64 } }, shape: { group: 'Shapes and stickers', sized: true, d: { shape: 'rect', w: 200, h: 100, strokeColor: '#ffffff', stroke: 0, round: 12 } },
  button: { group: 'Menus and controls', screen: true, sized: true, focus: true, d: { label: 'Play', action: 'play', w: 260, h: 52, icon: '' } }, setting: { group: 'Menus and controls', screen: true, sized: true, focus: true, d: { which: 'master', label: 'Master volume', w: 460, h: 44 } },
  inventory: { group: 'Menus and controls', screen: true, sized: true, focus: true, d: { cols: 6, rows: 2, slot: 72, vars: '' } }, dialogue: { group: 'Menus and controls', screen: true, sized: true, d: { w: 900, h: 170, speed: 40, side: 'left' } },
  minimap: { group: 'Game info', sized: true, d: { w: 190, h: 190, zoom: 26, shape: 'circle', rotate: true, walls: '#aeb6c2', enemy: '#ff5a5f', item: '#f0c45a', exit: '#3ddc84' } }
};
UI.kindMeta = k => UI.KINDS[k] || { group: 'Game info' };
UI.newWidget = function (kind, T) {
  T = T || UI.THEMES.arcade; const m = UI.kindMeta(kind), w = Object.assign({ id: ENG.uid(), kind, x: 50, y: 50, scale: 1, color: T.ink, opacity: 1, font: T.font, label: { enemies: 'Enemies', timer: 'Time', objective: 'Objective', health: 'Health', armor: 'Armor', credits: 'Credits', floor: 'Floor', perks: 'Upgrades', collectibles: 'Collected', keys: 'Keys', bullettime: 'Slow time' }[kind] || '', width: 220, style: 'cross', text: 'Your text' }, m.d || {});
  if (kind === 'button') { w.color = T.accent; w.font = T.font; w.shape = T.shape; w.upper = !!T.upper; w.th = { color: 'accent', font: 'font', shape: 1, upper: 1 }; } return w;
};

/* ---------------- effects, animations and the one transform ---------------- */
/* --s size, --k window scale, --rot --skew, and the animated --ax --ay --as --ao, all in one transform so animations never fight positioning */
const SHADOWS = { none: '', soft: '0 2px 10px rgba(0,0,0,.65)', hard: '2px 2px 0 rgba(0,0,0,.9)', long: '1px 1px 0 #000,2px 2px 0 #000,3px 3px 0 #000,4px 4px 0 #000,5px 5px 0 #000,6px 6px 0 #000', glow: '0 0 10px currentColor,0 0 22px currentColor', neon: '0 0 4px #fff,0 0 10px currentColor,0 0 24px currentColor,0 0 48px currentColor' };
const TEXTY = { text: 1, timer: 1, weapon: 1, ammo: 1, enemies: 1, keys: 1, objective: 1, credits: 1, floor: 1, collectibles: 1, keyhelp: 1, messages: 1 };
function decorate(d, w, ctx) {
  const T = ctx.theme, pj = ctx.project; d.style.transform = ''; d.style.opacity = ''; d.style.setProperty('--s', String(w.scale == null ? 1 : w.scale)); d.style.setProperty('--op', String(w.opacity == null ? 1 : w.opacity)); d.style.setProperty('--rot', (w.rot || 0) + 'deg'); d.style.setProperty('--skew', (w.skew || 0) + 'deg');
  d.style.fontFamily = UI.fontFamily(w.font, pj); if (w.size) d.style.fontSize = w.size + 'px'; if (w.weight) d.style.fontWeight = String(w.weight); if (w.letter) d.style.letterSpacing = w.letter + 'px'; if (w.upper) d.style.textTransform = 'uppercase'; if (w.italic) d.style.fontStyle = 'italic'; if (w.align) d.style.textAlign = w.align;
  if (w.name) d.dataset.name = w.name; if (w.hidden && !ctx.design) d.style.display = 'none'; if (w.hidden && ctx.design) d.classList.add('kz-hid');
  if (w.stroke > 0) { d.style.webkitTextStroke = w.stroke + 'px ' + (w.strokeColor || '#000'); d.style.paintOrder = 'stroke fill'; }
  if (w.shadow && SHADOWS[w.shadow] != null) d.style.textShadow = SHADOWS[w.shadow]; else if (w.shadow === 'none') d.style.textShadow = 'none';
  if (w.bg && w.bg !== 'none') { d.classList.add('kz-bg', 'kz-bg-' + w.bg); d.style.setProperty('--bgc', UI.rgba(w.bgColor || T.panel, w.bgOp == null ? .72 : w.bgOp)); d.style.setProperty('--pad', (w.pad == null ? 10 : w.pad) + 'px'); d.style.setProperty('--rad', (w.radius == null ? T.radius : w.radius) + 'px'); d.style.setProperty('--bgs', w.bgStroke || 'transparent'); }
  if (w.grad && TEXTY[w.kind]) { d.classList.add('kz-grad'); d.style.setProperty('--g1', w.color || '#fff'); d.style.setProperty('--g2', w.grad); }
  if (w.halftone) d.classList.add('kz-ht');
  const anims = []; const dur = (w.animDur || .6), delay = (w.animDelay || 0); if (w.anim && w.anim !== 'none' && !ctx.noAnim) anims.push('kzIn-' + w.anim + ' ' + dur + 's ' + delay + 's cubic-bezier(.22,1,.36,1) both');
  if (w.idle && w.idle !== 'none') anims.push('kzIdle-' + w.idle + ' ' + ({ pulse: 1.6, float: 3.2, blink: 1.1, shake: .5, glow: 1.8, spin: 6, bob: 2.2, wobble: 2.6 }[w.idle] || 2) + 's ' + (w.anim && w.anim !== 'none' ? (dur + delay) : 0) + 's ' + (w.idle === 'spin' ? 'linear' : 'ease-in-out') + ' infinite');
  d.style.animation = anims.join(','); if (w.anim === 'type' && TEXTY[w.kind]) d.classList.add('kz-type');
  if (ctx.design && w.locked) d.classList.add('kz-locked');
}
function react(d, w, kind) { const r = w.react || (['health', 'armor', 'ammo', 'credits', 'collectibles', 'pips', 'vbar', 'bossbar', 'timer'].includes(w.kind) ? 'bump' : 'none'); if (r === 'none' || !d.animate) return; try {
  if (r === 'flash') d.animate([{ filter: 'brightness(2.4)' }, { filter: 'brightness(1)' }], { duration: 320, easing: 'ease-out' });
  else if (r === 'bump') d.animate([{ '--as': 1 }, { '--as': kind === 'down' ? .9 : 1.18, offset: .3 }, { '--as': 1 }], { duration: 340, easing: 'ease-out' });
  else if (r === 'shake') d.animate([{ '--ax': '0px' }, { '--ax': '-6px' }, { '--ax': '6px' }, { '--ax': '-4px' }, { '--ax': '0px' }], { duration: 320 }); } catch (e) { } }

/* ---------------- text tokens: {health} {time} {title} and Logic variables ---------------- */
UI.tokens = function (st, ctx) {
  const S = (ctx.project && ctx.project.settings) || {}, s = Math.floor(st.time || 0), H = ENG._rgHud, g = st.game, total = g ? g.enemies.length : (st.enemyTotal != null ? st.enemyTotal : (st.enemies || 0) + 2);
  const t = { health: Math.max(0, Math.ceil(st.health || 0)), maxHealth: st.maxHealth || 100, armor: Math.ceil(st.armor || 0), ammo: st.mag == null ? '' : st.mag, reserve: st.res == null ? '' : st.res, weapon: st.weapon || '', enemies: st.enemies == null ? 0 : st.enemies, enemyTotal: total, killed: Math.max(0, total - (st.enemies || 0)), time: Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'), seconds: s, keys: st.keys && st.keys.length ? st.keys.join(', ') : 'none', collected: st.collected || 0, total: st.collectTotal || 0, objective: st.objective || '', message: st.message || '',
    title: S.title || (ctx.project && ctx.project.name) || 'Game', subtitle: S.subtitle || '', name: (ctx.project && ctx.project.name) || '', credits: H ? H.credits : 0, floor: H && H.inRun ? H.floor + ' / ' + H.floors : '', text: st.legacyText || '', legacyTitle: st.legacyTitle || '', controls: ctx.controls || 'WASD move · Mouse look · Click shoot · Right click or Q slow time · E use · R reload · Space jump · Shift sprint · C crouch · 1 to 4 weapons' };
  if (st.vars) for (const k in st.vars) t[k] = st.vars[k]; return t;
};
const q = s => String(s).replace(/"/g, "'");
const fmt = (tpl, tk) => String(tpl == null ? '' : tpl).replace(/\{([^{}]{1,40})\}/g, (m, n) => { const k = n.trim(); return Object.prototype.hasOwnProperty.call(tk, k) ? tk[k] : m; });

/* ---------------- building: the HUD function grows the new kinds, effects and animations ---------------- */
const baseHUD = ENG.buildHUD;
ENG.buildHUD = function (root, hud, ctx) {
  ctx = Object.assign({ project: null, design: false, theme: null }, ctx || {}); ctx.theme = ctx.theme || UI.theme(ctx.project); const T = ctx.theme, pj = ctx.project; root.classList.add('kz-layer');
  const upd = baseHUD(root, hud), mine = [], typers = [], focus = [];
  (hud || []).forEach(w => {
    const d = root.querySelector('[data-id="' + w.id + '"]'); if (!d) return; decorate(d, w, ctx); const m = { w, d, prev: {} }; mine.push(m); const K = w.kind;
    if (K === 'text' || K === 'keyhelp') { d.textContent = ''; d.style.whiteSpace = 'pre-line'; m.tpl = K === 'keyhelp' ? '{controls}' : (w.text || ''); if (K === 'keyhelp') d.classList.add('kz-keyhelp'); }
    else if (K === 'image') { const url = UI.stickerSrc(w.src, pj); d.innerHTML = url ? '<img src="' + url + '" alt="" draggable="false">' : UI.icon((w.src || 'icon:star').replace('icon:', ''), 24, w.tint || w.color); const el = d.firstChild; el.style.width = (w.w || 64) + 'px'; el.style.height = (w.h || 64) + 'px'; if (w.flip) el.style.transform = 'scaleX(-1)'; if (w.round && el.tagName === 'IMG') el.style.borderRadius = w.round + 'px'; if (el.tagName === 'IMG') el.style.objectFit = 'contain'; }
    else if (K === 'shape') d.innerHTML = UI.shapeSVG(w, T);
    else if (K === 'logo') { d.innerHTML = UI.logoHTML(w, T, pj, ctx); m.lgt = d.querySelector('.kz-lgt'); m.lgs = d.querySelector('.kz-lgs'); }
    else if (K === 'pips') { const n = Math.max(1, Math.min(30, w.count | 0 || 5)); d.innerHTML = ''; d.style.setProperty('--gap', (w.gap == null ? 4 : w.gap) + 'px'); for (let i = 0; i < n; i++) { const s = document.createElement('i'); s.innerHTML = UI.icon(w.icon || 'heart', w.size || 26); d.appendChild(s); } m.pips = [...d.children]; d.style.setProperty('--off', w.colorOff || '#3a3f47'); }
    else if (K === 'vbar') { d.innerHTML = '<div class="kz-bl"><span>' + esc(w.label || '') + '</span><b></b></div><div class="kz-bar" style="width:' + (w.width || 220) + 'px"><i style="background:' + w.color + '"></i></div>'; m.num = d.querySelector('b'); m.fill = d.querySelector('i'); }
    else if (K === 'progress') { d.innerHTML = '<div class="kz-bl"><span>' + esc(w.label || '') + '</span><b></b></div><div class="kz-bar kz-prog" style="width:' + (w.width || 420) + 'px"><i style="background:' + w.color + '"></i></div>'; m.num = d.querySelector('b'); m.fill = d.querySelector('i'); }
    else if (K === 'button') { const sh = w.shape || T.shape; d.innerHTML = '<button class="kz-btn kz-shape-' + sh + '" type="button" tabindex="0">' + (w.icon ? UI.icon(w.icon, 20) : '') + '<span>' + esc(w.label || 'Button') + '</span>' + (w.hotkey ? '<kbd>' + esc(w.hotkey) + '</kbd>' : '') + '</button>'; const b = d.firstChild; b.style.width = (w.w || 260) + 'px'; b.style.height = (w.h || 52) + 'px'; b.style.setProperty('--c', w.color || T.accent); b.style.setProperty('--rad', (w.radius == null ? T.radius : w.radius) + 'px'); b.dataset.action = w.action || ''; m.btn = b; focus.push({ w, el: b, kind: 'button' }); if (!ctx.design) b.addEventListener('click', e => { e.stopPropagation(); if (ctx.onAction) ctx.onAction(w.action || '', w); }); }
    else if (K === 'setting') { const info = UI.SETTINGS[w.which] || UI.SETTINGS.master; d.innerHTML = '<div class="kz-set" tabindex="0"><div class="kz-setl"><span>' + esc(w.label || info.label) + '</span><b></b></div>' + (info.kind === 'toggle' ? '<div class="kz-tog"><i></i></div>' : '<div class="kz-sl"><i></i><u></u></div>') + '</div>'; const el = d.firstChild; el.style.width = (w.w || 460) + 'px'; el.style.setProperty('--c', w.color || T.accent); m.set = { el, val: el.querySelector('b'), fill: el.querySelector('.kz-sl i'), thumb: el.querySelector('.kz-sl u'), tog: el.querySelector('.kz-tog'), info }; focus.push({ w, el, kind: 'setting', m }); if (!ctx.design) UI.bindSetting(m, ctx); }
    else if (K === 'inventory') { const cols = Math.max(1, Math.min(12, w.cols | 0 || 6)), rows = Math.max(1, Math.min(6, w.rows | 0 || 2)), sz = w.slot || 72; d.innerHTML = '<div class="kz-inv" style="grid-template-columns:repeat(' + cols + ',' + sz + 'px);--slot:' + sz + 'px"></div><div class="kz-invn"></div>'; m.inv = { grid: d.firstChild, name: d.lastChild, n: cols * rows, slots: [] }; for (let i = 0; i < cols * rows; i++) { const s = document.createElement('div'); s.className = 'kz-slot'; s.tabIndex = 0; m.inv.grid.appendChild(s); m.inv.slots.push(s); focus.push({ w, el: s, kind: 'slot', m, i }); s.addEventListener('mouseenter', () => { m.inv.name.textContent = s.dataset.n || ''; }); s.addEventListener('focus', () => { m.inv.name.textContent = s.dataset.n || ''; }); } }
    else if (K === 'dialogue') { d.innerHTML = '<div class="kz-dlg kz-dlg-' + (w.side || 'left') + '"><div class="kz-dlgp"></div><div class="kz-dlgb"><div class="kz-dlgn"></div><div class="kz-dlgt"></div><div class="kz-dlgc"></div><div class="kz-dlgk">' + UI.icon('down', 16) + '</div></div></div>'; const el = d.firstChild; el.style.width = (w.w || 900) + 'px'; el.style.minHeight = (w.h || 170) + 'px'; el.style.setProperty('--c', w.color || T.accent); el.style.setProperty('--bgc', UI.rgba(w.bgColor || T.panel, w.bgOp == null ? .92 : w.bgOp)); m.dlg = { el, p: el.querySelector('.kz-dlgp'), n: el.querySelector('.kz-dlgn'), t: el.querySelector('.kz-dlgt'), c: el.querySelector('.kz-dlgc'), k: el.querySelector('.kz-dlgk'), speed: w.speed || 40 }; if (!ctx.design) el.addEventListener('click', e => { e.stopPropagation(); if (ctx.game && ctx.game.dlg) ctx.game.dlgAdvance(); }); }
    else if (K === 'minimap') { const sz = w.w || 190; d.innerHTML = '<canvas class="kz-map kz-map-' + (w.shape || 'circle') + '" width="' + sz * 2 + '" height="' + sz * 2 + '"></canvas>'; const cv = d.firstChild; cv.style.width = cv.style.height = sz + 'px'; m.map = { cv, g: cv.getContext('2d'), sz, built: null }; }
    if (m.tpl == null && TEXTY[K] && K !== 'messages' && w.anim === 'type') m.tpl = null;
  });
  const typeIn = (m, text) => { if (!m.w.anim || m.w.anim !== 'type' || ctx.noAnim) { m.d.textContent = text; return; } if (m.typed === text) return; m.typed = text; m.d.textContent = ''; const t0 = performance.now() + (m.w.animDelay || 0) * 1000, cps = Math.max(8, (m.w.typeSpeed || 40)); const step = now => { if (m.typed !== text) return; const n = Math.max(0, Math.floor((now - t0) / 1000 * cps)); m.d.textContent = text.slice(0, n); if (n < text.length) requestAnimationFrame(step); }; requestAnimationFrame(step); };
  function update(st) {
    st = st || {}; upd(st); const tk = UI.tokens(st, ctx), low = st.maxHealth ? st.health / st.maxHealth < .26 : false;
    mine.forEach(m => { const w = m.w, d = m.d, K = w.kind;
      if (m.tpl != null) typeIn(m, fmt(m.tpl, tk));
      if (K === 'logo') { const a = fmt(w.text || '{title}', tk), b = fmt(w.sub || '', tk); if (m.lgt && m.lgt.textContent !== a) m.lgt.textContent = a; if (m.lgs && m.lgs.textContent !== b) m.lgs.textContent = b; }
      if (K === 'health') { d.classList.toggle('kz-low', !!(low && w.low !== false)); } if (K === 'messages') { d.style.visibility = tk.message || st.design ? 'visible' : 'hidden'; if (st.design && !tk.message) d.textContent = 'Messages and subtitles appear here'; }
      if (K === 'pips') { const which = w.which || 'health', v = which === 'armor' ? (st.armor || 0) / 100 : which === 'ammo' ? (st.mag == null ? 0 : st.mag / Math.max(1, (st.magMax || 12))) : (st.health || 0) / Math.max(1, st.maxHealth || 100), on = Math.ceil(clamp(v, 0, 1) * m.pips.length - 1e-6); m.pips.forEach((p, i) => p.classList.toggle('off', i >= on)); if (which === 'ammo' && st.mag == null) d.style.visibility = st.design ? 'visible' : 'hidden'; m.cur = on; }
      else if (K === 'vbar') { const v = st.vars && w.var && st.vars[w.var] != null ? +st.vars[w.var] : (st.design ? 64 : 0), mx = st.vars && st.vars[w.max] != null ? +st.vars[w.max] : (+w.max || 100); m.num.textContent = isFinite(v) ? Math.round(v) : v; m.fill.style.width = clamp(v / Math.max(1e-6, mx), 0, 1) * 100 + '%'; m.cur = v; }
      else if (K === 'progress') { const v = st.loadProgress == null ? (st.design ? .62 : 1) : st.loadProgress; m.fill.style.width = clamp(v, 0, 1) * 100 + '%'; m.num.textContent = Math.round(clamp(v, 0, 1) * 100) + '%'; }
      else if (K === 'button') { const a = w.action || ''; let show = true, off = false; if (!st.design) { if (a === 'checkpoint') off = !(st.game && st.game.checkpoint); if (a === 'quit') show = !!(st.game && st.game.opt && st.game.opt.onExit); if (a === 'settings' || a === 'inventory' || a.indexOf('screen:') === 0) show = !!(st.game && UI.screen(st.game.project, a.indexOf('screen:') === 0 ? a.slice(7) : a)); } d.style.display = show && !w.hidden ? '' : 'none'; d.classList.toggle('kz-off', off); }
      else if (K === 'setting') UI.drawSetting(m, st, ctx);
      else if (K === 'inventory') UI.drawInventory(m, st, ctx, tk);
      else if (K === 'dialogue') UI.drawDialogue(m, st, ctx);
      else if (K === 'minimap') UI.drawMinimap(m, st, ctx);
      /* reactions: a value moved */
      const key = K === 'health' ? tk.health : K === 'armor' ? tk.armor : K === 'ammo' ? tk.ammo : K === 'credits' ? tk.credits : K === 'collectibles' ? tk.collected : K === 'pips' || K === 'vbar' ? m.cur : K === 'bossbar' ? (ENG._rgHud && ENG._rgHud.boss ? ENG._rgHud.boss.hp : null) : K === 'timer' && w.react === 'bump' ? Math.floor(st.time || 0) : null;
      if (key != null && m.prev.v !== undefined && m.prev.v !== key && !st.design) react(d, w, key < m.prev.v ? 'down' : 'up'); m.prev.v = key; });
  }
  update.focusables = () => focus.filter(f => f.el.isConnected && f.el.offsetParent !== null && !f.w.hidden && !f.el.closest('.kz-off')); update.items = mine; return update;
};

/* shapes and logos as SVG */
UI.shapeSVG = function (w, T) {
  const W = w.w || 200, H = w.h || 100, f = w.color || T.accent, sw = w.stroke || 0, sc = w.strokeColor || '#fff', r = w.round == null ? 12 : w.round, k = w.shape || 'rect'; let inner = '';
  const attrs = 'fill="' + f + '"' + (sw ? ' stroke="' + sc + '" stroke-width="' + sw + '" stroke-linejoin="round"' : '');
  const pts = (n, rot, r1, r2) => { let d = ''; const cx = W / 2, cy = H / 2, m = r2 == null ? n : n * 2; for (let i = 0; i < m; i++) { const rr = r2 == null ? 1 : (i % 2 ? r2 : 1); const a = (rot + i * 360 / m) * Math.PI / 180; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * (W / 2 - sw) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * (H / 2 - sw) * rr).toFixed(1); } return d + 'Z'; };
  if (k === 'rect' || k === 'panel') inner = '<rect x="' + sw / 2 + '" y="' + sw / 2 + '" width="' + (W - sw) + '" height="' + (H - sw) + '" rx="' + r + '" ' + attrs + '/>';
  else if (k === 'circle') inner = '<ellipse cx="' + W / 2 + '" cy="' + H / 2 + '" rx="' + (W / 2 - sw) + '" ry="' + (H / 2 - sw) + '" ' + attrs + '/>';
  else if (k === 'diamond') inner = '<path d="' + pts(4, -90) + '" ' + attrs + '/>'; else if (k === 'hex') inner = '<path d="' + pts(6, 0) + '" ' + attrs + '/>'; else if (k === 'triangle') inner = '<path d="' + pts(3, -90) + '" ' + attrs + '/>';
  else if (k === 'star') inner = '<path d="' + pts(5, -90, 1, .45) + '" ' + attrs + '/>'; else if (k === 'burst') inner = '<path d="' + pts(w.points || 14, -90, 1, .72) + '" ' + attrs + '/>';
  else if (k === 'line') inner = '<rect x="0" y="' + (H / 2 - Math.max(1, sw || 2) / 2) + '" width="' + W + '" height="' + Math.max(1, sw || 2) + '" fill="' + f + '"/>';
  else if (k === 'ring') inner = '<ellipse cx="' + W / 2 + '" cy="' + H / 2 + '" rx="' + (W / 2 - Math.max(2, sw) / 2) + '" ry="' + (H / 2 - Math.max(2, sw) / 2) + '" fill="none" stroke="' + f + '" stroke-width="' + Math.max(2, sw || 6) + '"/>';
  else if (k === 'bubble') { const t = Math.min(28, H * .22), bw = H - t; inner = '<path d="M' + r + ' 0H' + (W - r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'V' + (bw - r) + 'a' + r + ' ' + r + ' 0 0 1 -' + r + ' ' + r + 'H' + (W * .32) + 'L' + (W * .2) + ' ' + H + 'L' + (W * .24) + ' ' + bw + 'H' + r + 'a' + r + ' ' + r + ' 0 0 1 -' + r + ' -' + r + 'V' + r + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' -' + r + 'z" ' + attrs + '/>'; }
  else if (k === 'ribbon') { const n = Math.min(W * .12, H * .6); inner = '<path d="M0 0H' + W + 'L' + (W - n) + ' ' + H / 2 + 'L' + W + ' ' + H + 'H0L' + n + ' ' + H / 2 + 'z" ' + attrs + '/>'; }
  else if (k === 'arrow') { const hh = H * .5, b = W * .62; inner = '<path d="M0 ' + (H / 2 - hh / 2) + 'H' + b + 'V0L' + W + ' ' + H / 2 + 'L' + b + ' ' + H + 'V' + (H / 2 + hh / 2) + 'H0z" ' + attrs + '/>'; }
  else if (k === 'plate') { const c = Math.min(H * .35, 22); inner = '<path d="M' + c + ' 0H' + W + 'V' + (H - c) + 'L' + (W - c) + ' ' + H + 'H0V' + c + 'z" ' + attrs + '/>'; }
  else if (k === 'badge') inner = '<path d="' + pts(16, -90, 1, .86) + '" ' + attrs + '/>';
  else if (k === 'shield') inner = '<path d="M' + W / 2 + ' ' + sw + 'L' + (W - sw) + ' ' + (H * .15) + 'V' + (H * .48) + 'C' + (W - sw) + ' ' + (H * .78) + ' ' + (W * .7) + ' ' + (H * .93) + ' ' + W / 2 + ' ' + (H - sw) + 'C' + (W * .3) + ' ' + (H * .93) + ' ' + sw + ' ' + (H * .78) + ' ' + sw + ' ' + (H * .48) + 'V' + (H * .15) + 'z" ' + attrs + '/>';
  return '<svg class="kz-shp" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" style="overflow:visible">' + inner + '</svg>';
};
UI.logoHTML = function (w, T, pj, ctx) {
  const W = w.w || 320, H = w.h || 200, st = w.style || 'flat', c1 = w.color || T.accent, c2 = w.color2 || T.panel, shape = w.shape || 'shield', ico = w.icon && w.icon !== 'none' ? w.icon : null;
  const tk = UI.tokens({ design: true }, ctx), text = fmt(w.text || '{title}', tk), sub = fmt(w.sub || '', tk), fontMain = UI.fontFamily(w.font || T.font, pj), fontSub = UI.fontFamily(w.font2 || T.font2, pj);
  const sid = 'lg' + (w.id || '0').replace(/[^a-z0-9]/gi, ''), fill = st === 'metal' ? 'url(#' + sid + ')' : st === 'outline' ? 'none' : c2, stroke = st === 'outline' ? c1 : st === 'comic' ? '#111' : st === 'neon' ? c1 : 'none', swidth = st === 'comic' ? 7 : st === 'outline' ? 4 : st === 'neon' ? 3 : 0;
  const defs = st === 'metal' ? '<defs><linearGradient id="' + sid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".48" stop-color="' + c2 + '"/><stop offset=".52" stop-color="' + c1 + '" stop-opacity=".35"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>' : '';
  const bg = shape === 'none' ? '' : UI.shapeSVG({ shape, w: W, h: H, color: fill, stroke: swidth, strokeColor: stroke, round: 18, id: w.id }, T).replace('<svg ', '<svg data-defs="1" ').replace('>', '>' + defs);
  const big = Math.min(H * .3, W / Math.max(4, text.length) * 1.9), small = Math.max(10, Math.min(H * .1, 20));
  const tstyle = 'font-family:' + fontMain + ';font-size:' + big.toFixed(0) + 'px;color:' + c1 + (st === 'comic' ? ';-webkit-text-stroke:' + Math.max(2, big * .07).toFixed(1) + 'px #111;paint-order:stroke fill;text-shadow:4px 4px 0 #111' : st === 'neon' ? ';text-shadow:0 0 6px #fff,0 0 14px ' + c1 + ',0 0 30px ' + c1 : st === 'metal' ? ';background:linear-gradient(180deg,#fff,' + c1 + ' 50%,' + c2 + ' 52%,' + c1 + ');-webkit-background-clip:text;background-clip:text;color:transparent' : st === 'retro' ? ';text-shadow:3px 3px 0 ' + T.accent2 + ',6px 6px 0 ' + c2 : ';text-shadow:0 2px 8px rgba(0,0,0,.5)');
  return '<div class="kz-lg kz-lg-' + st + '" style="width:' + W + 'px;height:' + H + 'px">' + bg + '<div class="kz-lgi">' + (ico ? '<div class="kz-lgic" style="color:' + c1 + '">' + UI.icon(ico, Math.min(H * .34, W * .3)) + '</div>' : '') + '<div class="kz-lgt" style="' + q(tstyle) + '">' + esc(text) + '</div>' + (sub ? '<div class="kz-lgs" style="' + q('font-family:' + fontSub + ';font-size:' + small + 'px;color:' + (st === 'outline' || st === 'neon' ? c1 : T.ink)) + '">' + esc(sub) + '</div>' : '') + '</div></div>';
};

/* ---------------- settings a player can change ---------------- */
UI.SETTINGS = {
  master: { label: 'Master volume', min: 0, max: 1, step: .05, pct: true, get: g => g.project.mixer.master == null ? 1 : g.project.mixer.master, set: (g, v) => { g.project.mixer.master = v; g.audio.applyMix(); } },
  music: { label: 'Music', min: 0, max: 1, step: .05, pct: true, get: g => g.project.mixer.music == null ? 1 : g.project.mixer.music, set: (g, v) => { g.project.mixer.music = v; g.audio.applyMix(); } },
  sfx: { label: 'Effects', min: 0, max: 1, step: .05, pct: true, get: g => g.project.mixer.sfx == null ? 1 : g.project.mixer.sfx, set: (g, v) => { g.project.mixer.sfx = v; g.audio.applyMix(); } },
  sens: { label: 'Look sensitivity', min: .2, max: 3, step: .05, get: g => g.S.sens || 1, set: (g, v) => { g.S.sens = v; } },
  fov: { label: 'Field of view', min: 50, max: 120, step: 1, unit: '°', get: g => g.S.fov || 75, set: (g, v) => { g.S.fov = v; g.cam.fov = v; g.cam.updateProjectionMatrix(); } },
  uiscale: { label: 'Interface size', min: .6, max: 1.8, step: .05, pct: true, get: g => (g.project.ui && g.project.ui.scale) || 1, set: (g, v) => { UI.store(g.project).scale = v; g.uiFit(); } },
  camera: { label: 'Camera', kind: 'toggle', on: 'Third person', off: 'First person', get: g => g.S.camera === 'tps', set: (g, v) => { g.S.camera = v ? 'tps' : 'fps'; if (g.playerModel) g.playerModel.visible = v; if (g.vm) g.vm.visible = !v; } },
  shadows: { label: 'Shadows', kind: 'toggle', on: 'On', off: 'Off', get: g => !!g.renderer.shadowMap.enabled, set: (g, v) => { g.renderer.shadowMap.enabled = v; if (g.sun) g.sun.castShadow = v; g.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); } }
};
UI.settingValue = (m, g, design) => { const I = m.set.info; if (design || !g) return I.kind === 'toggle' ? false : I.which === 'fov' ? 75 : .7; try { return I.get(g); } catch (e) { return I.kind === 'toggle' ? false : I.min; } };
UI.drawSetting = function (m, st, ctx) { const I = m.set.info, g = st.game, v = UI.settingValue(m, g, st.design); if (I.kind === 'toggle') { m.set.tog.classList.toggle('on', !!v); m.set.val.textContent = v ? I.on : I.off; } else { const f = clamp((v - I.min) / (I.max - I.min), 0, 1); m.set.fill.style.width = f * 100 + '%'; m.set.thumb.style.left = f * 100 + '%'; m.set.val.textContent = I.pct ? Math.round(v * 100) + '%' : (I.step < 1 ? v.toFixed(2) : Math.round(v)) + (I.unit || ''); } };
UI.bindSetting = function (m, ctx) {
  const el = m.set.el, I = m.set.info, apply = v => { const g = ctx.game; if (!g) return; v = I.kind === 'toggle' ? !!v : clamp(Math.round(v / I.step) * I.step, I.min, I.max); I.set(g, v); g.uiSaveSettings(); if (ctx.update) ctx.update(g.uiState()); };
  m.set.adjust = dir => { const g = ctx.game; if (!g) return; if (I.kind === 'toggle') apply(!I.get(g)); else apply(I.get(g) + dir * I.step * (I.step < .1 ? 2 : 1)); };
  el.addEventListener('click', e => { e.stopPropagation(); if (I.kind === 'toggle') { m.set.adjust(1); return; } const r = m.set.fill.parentNode.getBoundingClientRect(); apply(I.min + clamp((e.clientX - r.left) / r.width, 0, 1) * (I.max - I.min)); });
  if (I.kind !== 'toggle') { let drag = false; const track = m.set.fill.parentNode; track.addEventListener('pointerdown', e => { drag = true; try { track.setPointerCapture(e.pointerId); } catch (x) { } }); track.addEventListener('pointermove', e => { if (!drag) return; const r = track.getBoundingClientRect(); apply(I.min + clamp((e.clientX - r.left) / r.width, 0, 1) * (I.max - I.min)); }); track.addEventListener('pointerup', () => { drag = false; }); }
};
G.uiSettingsKey = function () { return 'vira.game.' + slug(this.project.name); };
G.uiSaveSettings = function () { try { const g = this, o = {}; for (const k in UI.SETTINGS) if (k !== 'shadows') o[k] = UI.SETTINGS[k].get(g); localStorage.setItem(this.uiSettingsKey(), JSON.stringify(o)); } catch (e) { } };
G.uiLoadSettings = function () { try { const o = JSON.parse(localStorage.getItem(this.uiSettingsKey()) || 'null'); if (!o) return; for (const k in o) { const I = UI.SETTINGS[k]; if (!I || o[k] == null) continue; const v = I.kind === 'toggle' ? !!o[k] : clamp(+o[k], I.min, I.max); if (isFinite(v) || I.kind === 'toggle') I.set(this, v); } } catch (e) { } };

/* ---------------- inventory, dialogue and minimap drawing ---------------- */
const WICON = { fists: 'hand', pistol: 'pistol', shotgun: 'shotgun', rifle: 'rifle' };
UI.drawInventory = function (m, st, ctx, tk) {
  const g = st.game, items = [];
  if (g) { const W = g.wep; Object.keys(W.owned).forEach(k => { const o = W.owned[k], D = ENG.WEAPONS[k]; if (!D) return; items.push({ icon: WICON[k] || 'pistol', n: D.name, v: D.mag ? o.mag + ' / ' + o.res : '', on: W.cur === k, act: () => g.setWeapon(k) }); }); if (!W.owned.fists) items.unshift({ icon: 'hand', n: 'Fists', on: W.cur === 'fists', act: () => g.setWeapon('fists') });
    g.player.keys.forEach(k => items.push({ icon: 'key', n: k, col: '#f0b43c' })); if (g.collectTotal) items.push({ icon: 'gem', n: 'Collectibles', v: (g.collected || 0) + ' / ' + g.collectTotal, col: '#c792ff' }); items.push({ icon: 'medkit', n: 'Health', v: tk.health + ' / ' + tk.maxHealth, col: '#ff6b6b' }); if (g.player.armor > 0) items.push({ icon: 'shield', n: 'Armor', v: String(tk.armor), col: '#4f9be8' }); }
  else { items.push({ icon: 'pistol', n: 'Pistol', v: '12 / 48', on: true }, { icon: 'shotgun', n: 'Shotgun', v: '6 / 18' }, { icon: 'key', n: 'Red key', col: '#e5383b' }, { icon: 'gem', n: 'Collectibles', v: '3 / 5', col: '#c792ff' }, { icon: 'medkit', n: 'Health', v: '76 / 100', col: '#ff6b6b' }); }
  String(m.w.vars || '').split(',').map(s => s.trim()).filter(Boolean).forEach(n => items.push({ icon: 'coin', n, v: tk[n] == null ? (st.design ? '12' : '0') : String(tk[n]), col: m.w.color }));
  m.inv.slots.forEach((s, i) => { const it = items[i]; if (!it) { s.innerHTML = ''; s.className = 'kz-slot'; s.dataset.n = ''; s.onclick = null; return; } s.className = 'kz-slot full' + (it.on ? ' on' : ''); s.dataset.n = it.n + (it.v ? ' · ' + it.v : ''); s.innerHTML = '<span style="color:' + (it.col || 'inherit') + '">' + UI.icon(it.icon, 30) + '</span>' + (it.v ? '<small>' + esc(it.v) + '</small>' : ''); s.onclick = it.act ? e => { e.stopPropagation(); it.act(); if (ctx.update && g) ctx.update(g.uiState()); } : null; });
  if (!m.inv.name.textContent && items[0]) m.inv.name.textContent = items[0].n + (items[0].v ? ' · ' + items[0].v : '');
};
UI.drawDialogue = function (m, st, ctx) {
  const g = st.game, D = g && g.dlg ? g.dlg : (st.design ? { speaker: 'Captain Reyes', portrait: 'icon:eye', text: 'Dialogue appears here, typed out letter by letter. Choices show as buttons below.', shown: 1e9, choices: [{ label: 'Tell me more' }, { label: 'Not now' }] } : null), d = m.dlg;
  if (!D) { m.d.style.visibility = 'hidden'; return; } m.d.style.visibility = 'visible';
  const url = UI.stickerSrc(D.portrait, ctx.project); d.p.innerHTML = D.portrait ? (url ? '<img src="' + url + '" alt="">' : UI.icon(String(D.portrait).replace('icon:', ''), 48)) : ''; d.p.style.display = D.portrait ? '' : 'none'; d.n.textContent = D.speaker || ''; d.n.style.display = D.speaker ? '' : 'none';
  const full = D.text || '', n = Math.min(full.length, Math.floor(D.shown == null ? full.length : D.shown)); if (d.t.textContent !== full.slice(0, n)) d.t.textContent = full.slice(0, n); const done = n >= full.length;
  d.k.style.display = done && !(D.choices && D.choices.length) ? '' : 'none';
  if (done && D.choices && D.choices.length && !d.cBuilt) { d.cBuilt = true; d.c.innerHTML = ''; D.choices.forEach((c, i) => { const b = document.createElement('button'); b.className = 'kz-btn kz-shape-' + ((ctx.theme && ctx.theme.shape) || 'cut') + ' kz-choice'; b.type = 'button'; b.tabIndex = 0; b.innerHTML = '<span>' + esc(c.label) + '</span>'; b.style.setProperty('--c', m.w.color || ctx.theme.accent); b.style.setProperty('--rad', ((ctx.theme && ctx.theme.radius) || 8) + 'px'); b.addEventListener('click', e => { e.stopPropagation(); if (g) g.dlgChoose(i); }); d.c.appendChild(b); }); if (g) g.uiRefocus(); } else if (!done || !(D.choices && D.choices.length)) { if (d.cBuilt) { d.c.innerHTML = ''; d.cBuilt = false; } }
};
UI.drawMinimap = function (m, st, ctx) {
  const M = m.map, g = st.game, w = m.w, c = M.g, S = M.cv.width, R = S / 2, zoom = w.zoom || 26, k = R / zoom, T = ctx.theme; c.clearRect(0, 0, S, S);
  c.save(); if ((w.shape || 'circle') === 'circle') { c.beginPath(); c.arc(R, R, R - 2, 0, 7); c.clip(); } c.fillStyle = UI.rgba(w.bgColor || T.bg, w.bgOp == null ? .55 : w.bgOp); c.fillRect(0, 0, S, S);
  const px = g ? g.player.pos.x : 0, pz = g ? g.player.pos.z : 0, yaw = g ? g.player.yaw : (st.yaw || 0), rotate = w.rotate !== false;
  c.translate(R, R); if (rotate) c.rotate(yaw); c.scale(k, k);
  /* static walls: drawn once into an image of the whole level */
  if (g && !M.built) M.built = buildMapImage(g, w, T); if (M.built) { const B = M.built; c.drawImage(B.cv, (B.x0 - px), (B.z0 - pz), B.cv.width / B.s, B.cv.height / B.s); }
  else { c.fillStyle = w.walls || '#aeb6c2'; const r = ENG.rng(7); for (let i = 0; i < 26; i++) { const x = (r() - .5) * 60, z = (r() - .5) * 60, len = 3 + r() * 10; if (r() < .5) c.fillRect(x, z, len, .6); else c.fillRect(x, z, .6, len); } }
  if (g) { c.fillStyle = w.item || '#f0c45a'; g.ents.forEach(e => { if (!e.alive || e.type !== 'pickup' || e.taken) return; c.beginPath(); c.arc(e.root.position.x - px, e.root.position.z - pz, 1.1, 0, 7); c.fill(); });
    c.fillStyle = w.exit || '#3ddc84'; g.ents.forEach(e => { if (e.type !== 'trigger' || !/end level/.test(e.p.action || '')) return; c.beginPath(); c.arc(e.o.p[0] - px, e.o.p[2] - pz, 1.8, 0, 7); c.fill(); });
    c.fillStyle = w.enemy || '#ff5a5f'; g.enemies.forEach(en => { if (en.dead || en.dormant) return; const p = en.e.root.position; c.beginPath(); c.arc(p.x - px, p.z - pz, 1.3, 0, 7); c.fill(); }); }
  else { c.fillStyle = w.enemy || '#ff5a5f'; [[6, -8], [-10, 5], [12, 11]].forEach(([x, z]) => { c.beginPath(); c.arc(x, z, 1.3, 0, 7); c.fill(); }); c.fillStyle = w.item || '#f0c45a'; [[-5, -12], [8, 4]].forEach(([x, z]) => { c.beginPath(); c.arc(x, z, 1.1, 0, 7); c.fill(); }); }
  c.restore(); c.save(); c.translate(R, R); if (!rotate) c.rotate(-yaw); c.fillStyle = w.color || T.accent; c.beginPath(); c.moveTo(0, -R * .07); c.lineTo(R * .05, R * .05); c.lineTo(0, R * .025); c.lineTo(-R * .05, R * .05); c.closePath(); c.fill(); c.restore();
  if (w.stroke !== 0) { c.strokeStyle = UI.rgba(w.strokeColor || T.ink, .6); c.lineWidth = 3; c.beginPath(); if ((w.shape || 'circle') === 'circle') c.arc(R, R, R - 2, 0, 7); else c.rect(2, 2, S - 4, S - 4); c.stroke(); }
};
function buildMapImage(g, w, T) {
  const boxes = []; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
  g.cols.forEach(col => { const b = col.box, e = col.e; if (!e || ['floor', 'terrain', 'land', 'reflect_floor', 'trigger', 'arena'].includes(e.type) || col.dyn) return; const h = b.max.y - b.min.y, fw = b.max.x - b.min.x, fd = b.max.z - b.min.z; if (h < .5 || fw * fd > 900) return; boxes.push([b.min.x, b.min.z, fw, fd]); x0 = Math.min(x0, b.min.x); z0 = Math.min(z0, b.min.z); x1 = Math.max(x1, b.max.x); z1 = Math.max(z1, b.max.z); });
  if (!boxes.length) return { cv: document.createElement('canvas'), x0: 0, z0: 0, s: 1 }; const s = Math.min(4, 2000 / Math.max(1, x1 - x0), 2000 / Math.max(1, z1 - z0)), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil((x1 - x0) * s) + 2); cv.height = Math.max(1, Math.ceil((z1 - z0) * s) + 2);
  const c = cv.getContext('2d'); c.fillStyle = w.walls || '#aeb6c2'; boxes.forEach(([x, z, fw, fd]) => c.fillRect((x - x0) * s, (z - z0) * s, Math.max(1.5, fw * s), Math.max(1.5, fd * s))); return { cv, x0, z0, s };
}

/* ---------------- screens ---------------- */
ENG.buildScreen = function (root, screen, ctx) {
  ctx = ctx || {}; const pj = ctx.project, T = ctx.theme || UI.theme(pj); root.innerHTML = ''; root.className = 'kz-scr kz-scr-' + (screen.kind || 'custom') + (screen.enter && screen.enter !== 'none' ? ' kz-scrin-' + screen.enter : ''); root.style.cssText = UI.themeVars(T, pj);
  const bg = document.createElement('div'); bg.className = 'kz-scrbg'; const B = screen.bg || { kind: 'dim' }; const col = B.color || T.bg, op = B.opacity == null ? .72 : B.opacity;
  if (B.kind === 'solid') bg.style.background = col; else if (B.kind === 'gradient') bg.style.background = 'radial-gradient(120% 100% at 50% 0%,' + (B.color2 || T.panel) + ' 0%,' + col + ' 70%)'; else if (B.kind === 'image') { const url = UI.stickerSrc(B.image, pj); bg.style.background = (url ? 'url(' + url + ') center/cover no-repeat,' : '') + col; if (url && op > 0) bg.style.boxShadow = 'inset 0 0 0 9999px ' + UI.rgba(col, op * .8); } else if (B.kind === 'none') bg.style.background = 'transparent'; else { bg.style.background = UI.rgba(col, op); if (B.kind === 'blur') { bg.style.backdropFilter = bg.style.webkitBackdropFilter = 'blur(' + (B.blur || 10) + 'px)'; } }
  root.appendChild(bg); const frame = document.createElement('div'); frame.className = 'kz-frame'; root.appendChild(frame); const layer = document.createElement('div'); layer.className = 'kz-hud kz-scrl'; frame.appendChild(layer);
  const upd = ENG.buildHUD(layer, screen.items || [], Object.assign({}, ctx, { theme: T })); const fit = () => { const W = root.clientWidth || 1280, H = root.clientHeight || 720, k = Math.min(W / 1280, H / 720); frame.style.setProperty('--fk', String(k)); }; fit();
  return { el: root, frame, layer, update: upd, fit, focusables: upd.focusables, screen };
};
/* a dialogue screen when the project has none */
UI.autoDialogueScreen = T => ({ id: 'auto-dialogue', kind: 'dialogue', name: 'Dialogue', bg: { kind: 'none' }, enter: 'fade', items: [Object.assign(UI.newWidget('dialogue', T), { x: 50, y: 82, w: 900, h: 170 })] });

/* the default screens a theme makes */
UI.defaultScreens = function (T, project) {
  T = T || UI.THEMES.arcade; const mk = (kind, o) => Object.assign(UI.newWidget(kind, T), o), txt = (text, x, y, size, o) => mk('text', Object.assign({ text, x, y, size, color: T.ink, th: { color: 'ink', font: 'font' } }, o || {}));
  const btn = (label, action, x, y, o) => mk('button', Object.assign({ label, action, x, y, anim: 'up', animDelay: .15 }, o || {})), bk = (x, y) => btn('Back', 'back', x, y, { w: 180, h: 44, hotkey: 'Esc' });
  const title = (t, y, o) => txt(t, 50, y == null ? 20 : y, 64, Object.assign({ color: T.accent, th: { color: 'accent', font: 'font' }, upper: !!T.upper, anim: 'drop', shadow: T.glow ? 'glow' : 'soft', weight: 700, letter: 2 }, o || {}));
  const help = (y) => mk('keyhelp', { x: 50, y: y == null ? 94 : y, size: 13, color: T.dim, font: T.font2, th: { color: 'dim', font: 'font2' }, anim: 'fade', animDelay: .5 });
  const scr = (kind, name, bg, items, enter) => ({ id: ENG.uid(), kind, name, bg, enter: enter || 'fade', th: 1, items });
  const steps = (list, y0, dy) => list.map((b, i) => Object.assign(b, { y: y0 + i * dy, animDelay: .12 + i * .07 }));
  const subLong = !!(project && project.settings && (project.settings.subtitle || '').length > 40);
  return [
    scr('main', 'Main menu', { kind: 'blur', color: T.bg, opacity: .58, blur: 7 }, [mk('logo', { x: 50, y: 29, w: 440, h: 230, text: '{title}', sub: subLong ? '' : '{subtitle}', icon: 'bolt', shape: T.shape === 'comic' ? 'burst' : T.shape === 'pill' ? 'circle' : T.shape === 'ribbon' ? 'ribbon' : 'shield', style: T.shape === 'comic' ? 'comic' : T.glow ? 'neon' : T.id === 'fantasy' ? 'metal' : 'flat', color: T.accent, color2: T.panel, th: { color: 'accent', color2: 'panel', font: 'font' }, anim: 'pop' })].concat(subLong ? [txt('{subtitle}', 50, 48, 18, { color: T.dim, font: T.font2, th: { color: 'dim', font: 'font2' }, anim: 'fade', animDelay: .3 })] : []).concat(steps([btn('Play', 'play', 50, 0, { hotkey: 'Enter' }), btn('Settings', 'settings', 50, 0), btn('Back to editor', 'quit', 50, 0)], 60, 9.2)).concat([help()]), 'fade'),
    scr('pause', 'Pause', { kind: 'blur', color: T.bg, opacity: .62, blur: 10 }, [title('Paused', 22)].concat(steps([btn('Resume', 'resume', 50, 0, { hotkey: 'Esc' }), btn('Restart', 'restart', 50, 0), btn('Last checkpoint', 'checkpoint', 50, 0), btn('Settings', 'settings', 50, 0), btn('Back to editor', 'quit', 50, 0)], 40, 9)).concat([help()]), 'zoom'),
    scr('dead', 'Death', { kind: 'dim', color: '#2a0607', opacity: .78 }, [title('You died', 30, { color: T.accent2, th: { color: 'accent2', font: 'font' }, anim: 'blur', size: 84 }), txt('{time} survived · {killed} of {enemyTotal} enemies down', 50, 44, 20, { color: T.dim, th: { color: 'dim', font: 'font2' }, font: T.font2, anim: 'fade', animDelay: .4 })].concat(steps([btn('Restart', 'restart', 50, 0, { hotkey: 'Enter' }), btn('Last checkpoint', 'checkpoint', 50, 0), btn('Back to editor', 'quit', 50, 0)], 58, 9.2)), 'fade'),
    scr('win', 'Level won', { kind: 'dim', color: T.bg, opacity: .7 }, [mk('image', { src: 'icon:trophy', x: 50, y: 22, w: 96, h: 96, color: T.accent, th: { color: 'accent' }, anim: 'pop', idle: 'float' }), title('Level complete', 38), txt('{text}', 50, 49, 20, { color: T.ink, font: T.font2, th: { color: 'ink', font: 'font2' }, anim: 'fade', animDelay: .3 }), txt('{time} · {killed} of {enemyTotal} enemies · {collected} of {total} collected', 50, 56, 16, { color: T.dim, font: T.font2, th: { color: 'dim', font: 'font2' }, anim: 'fade', animDelay: .45 })].concat(steps([btn('Play again', 'restart', 50, 0, { hotkey: 'Enter' }), btn('Back to editor', 'quit', 50, 0)], 68, 9.2)), 'zoom'),
    scr('lose', 'Level lost', { kind: 'dim', color: '#1a0a0a', opacity: .78 }, [title('Game over', 32, { color: T.accent2, th: { color: 'accent2', font: 'font' } }), txt('{text}', 50, 45, 20, { color: T.ink, font: T.font2, th: { color: 'ink', font: 'font2' }, anim: 'fade', animDelay: .3 })].concat(steps([btn('Restart', 'restart', 50, 0, { hotkey: 'Enter' }), btn('Back to editor', 'quit', 50, 0)], 60, 9.2)), 'fade'),
    scr('loading', 'Loading', { kind: 'solid', color: T.bg }, [title('{title}', 42, { size: 56 }), mk('progress', { x: 50, y: 56, width: 420, color: T.accent, th: { color: 'accent', font: 'font' }, label: 'Loading' }), txt('Tip: hold Shift to sprint, press Q to slow time.', 50, 66, 15, { color: T.dim, font: T.font2, th: { color: 'dim', font: 'font2' }, anim: 'fade', animDelay: .3 })], 'none'),
    scr('settings', 'Settings', { kind: 'blur', color: T.bg, opacity: .72, blur: 12 }, [title('Settings', 14)].concat(steps(['master', 'music', 'sfx', 'sens', 'fov', 'uiscale', 'camera'].map(k => mk('setting', { which: k, label: UI.SETTINGS[k].label, x: 50, y: 0, w: 480, h: 44, anim: 'left', color: T.accent, th: { color: 'accent', font: 'font2' }, font: T.font2 })), 27, 8.6)).concat([bk(50, 90)]), 'zoom'),
    scr('inventory', 'Inventory', { kind: 'blur', color: T.bg, opacity: .72, blur: 12 }, [title('Inventory', 14), mk('inventory', { x: 50, y: 46, cols: 6, rows: 2, slot: 84, color: T.accent, th: { color: 'accent', font: 'font2' }, font: T.font2, anim: 'pop' }), txt('{health} health · {armor} armor · {keys}', 50, 72, 18, { color: T.dim, font: T.font2, th: { color: 'dim', font: 'font2' } }), bk(50, 86)], 'zoom'),
    scr('dialogue', 'Dialogue', { kind: 'none' }, [mk('dialogue', { x: 50, y: 82, w: 920, h: 170, color: T.accent, bgColor: T.panel, th: { color: 'accent', bgColor: 'panel', font: 'font2' }, font: T.font2, anim: 'up' })], 'fade')
  ];
};
UI.ensureScreens = function (project, T) { const u = UI.store(project); T = T || UI.theme(project); const have = new Set(u.screens.map(s => s.kind)); UI.defaultScreens(T, project).forEach(s => { if (!have.has(s.kind)) u.screens.push(s); }); if (!u.theme) u.theme = Object.assign({}, T); return u; };

/* ---------------- in a game ---------------- */
G.uiState = function () { const W = this.wep, o = W.owned[W.cur]; return { game: this, health: this.player.health, maxHealth: this.player.maxHealth, armor: this.player.armor, mag: o ? o.mag : null, res: o ? o.res : null, magMax: o && ENG.WEAPONS[W.cur] ? ENG.WEAPONS[W.cur].mag : null, weapon: ENG.WEAPONS[W.cur] ? ENG.WEAPONS[W.cur].name : '', objective: this.objective, collected: this.collected || 0, collectTotal: this.collectTotal || 0, enemies: this.enemies.filter(en => !en.dead).length, keys: this.player.keys, time: this.time, yaw: this.player.yaw, vars: this.logic && this.logic.lg.vars.length ? this.logic.byName() : null, message: this.message, legacyText: this.uiLegacy ? this.uiLegacy.text : '', legacyTitle: this.uiLegacy ? this.uiLegacy.title : '', loadProgress: this.loadProgress }; };
G.uiInit = function () { if (this.uiEl) return; this.uiEl = this.div('kz-ui'); this.uiStack = []; this.uiFocus = null; ENG.injectUIFonts(this.project); this.root.style.cssText += ';' + UI.themeVars(UI.theme(this.project), this.project); this.uiFit(); };
G.uiFit = function () { const W = this.c.clientWidth || innerWidth, H = this.c.clientHeight || innerHeight, u = this.project.ui || {}, k = (u.auto === false ? 1 : clamp(Math.min(W / 1280, H / 720), .5, 3)) * (u.scale || 1); this.hudEl.style.setProperty('--k', String(k)); if (this.uiStack) this.uiStack.forEach(s => s.fit()); };
G.uiShow = function (kindOrId, opts) {
  opts = opts || {}; this.uiInit(); let screen = UI.screen(this.project, kindOrId); if (!screen && kindOrId === 'dialogue') screen = UI.autoDialogueScreen(UI.theme(this.project)); if (!screen) return null;
  if (!opts.push) this.uiHide(true); const root = document.createElement('div'); this.uiEl.appendChild(root); const g = this;
  const api = ENG.buildScreen(root, screen, { project: this.project, game: this, theme: UI.theme(this.project), onAction: (a, w) => g.uiAction(a, w), update: st => api.update(st) }); api.update(this.uiState()); this.uiStack.push(api); this.uiEl.style.display = 'block';
  this.uiStack.forEach((s, i) => { s.el.style.display = i === this.uiStack.length - 1 ? '' : 'none'; }); this.uiFocusFirst(); if (document.pointerLockElement && screen.kind !== 'dialogue') try { document.exitPointerLock(); } catch (e) { } return api;
};
G.uiTop = function () { return this.uiStack && this.uiStack.length ? this.uiStack[this.uiStack.length - 1] : null; };
G.uiHide = function (all) { if (!this.uiStack) return; const drop = all ? this.uiStack.splice(0) : [this.uiStack.pop()]; drop.forEach(s => { if (!s) return; s.el.classList.add('kz-scrout'); setTimeout(() => s.el.remove(), 180); }); const top = this.uiTop(); if (top) { top.el.style.display = ''; top.update(this.uiState()); this.uiFocusFirst(); } else { this.uiEl.style.display = 'none'; this.uiFocus = null; } };
G.uiBack = function () { const top = this.uiTop(); if (!top) return; if (this.uiStack.length > 1) { this.uiHide(false); return; } const k = top.screen.kind; if (k === 'pause' || k === 'inventory' || k === 'settings' || k === 'custom') this.uiResume(); };
G.uiResume = function () { this.uiHide(true); if (this.state === 'pause') { this.state = 'play'; this.lock(true); } };
G.uiAction = function (a, w) {
  a = a || ''; if (a === 'play') { if (this.state === 'menu') this.begin(); else this.uiResume(); } else if (a === 'resume') this.uiResume(); else if (a === 'restart') this.restart(); else if (a === 'checkpoint') { if (this.checkpoint) this.restart(this.checkpoint); else this.restart(); } else if (a === 'quit') { if (this.opt.onExit) this.quit(); }
  else if (a === 'settings' || a === 'inventory') { if (UI.screen(this.project, a)) this.uiShow(a, { push: true }); } else if (a === 'back' || a === 'close') this.uiBack(); else if (a.indexOf('screen:') === 0) { const name = a.slice(7); if (UI.screen(this.project, name)) this.uiShow(name, { push: true }); }
  else if (a === 'next') this.dlgAdvance(); else if (a.indexOf('url:') === 0) { try { window.open(a.slice(4), '_blank', 'noopener'); } catch (e) { } }
  if (this.audio && this.audio.ctx) this.audio.play('click', { volume: .5 });
};
/* which plain menu a game state means */
const STATE_SCREEN = { menu: 'main', pause: 'pause', dead: 'dead', won: 'win', lost: 'lose' };
const baseShow = G.showMenu; G.showMenu = function (title, text, buttons, help) {
  const kind = STATE_SCREEN[this.state]; const inVR = this.vr && this.vr.on;
  if (kind && !inVR && UI.screen(this.project, kind)) { this.uiLegacy = { title, text: String(text || '').trim(), buttons }; if (this.menu) this.menu.style.display = 'none'; this.uiShow(kind); return; }
  this.uiLegacy = null; if (this.uiStack && this.uiStack.length) this.uiHide(true); return baseShow.apply(this, arguments);
};
const baseHide = G.hideMenu; G.hideMenu = function () { if (this.uiStack && this.uiStack.length && !this.dlg) this.uiHide(true); return baseHide.apply(this, arguments); };
const baseBegin = G.begin; G.begin = function () { if (this.uiStack && this.uiStack.length) this.uiHide(true); return baseBegin.apply(this, arguments); };
G.uiInventory = function () { if (this.state !== 'play' || !UI.screen(this.project, 'inventory')) return; this.state = 'pause'; this.mouse.l = false; this.keys = {}; try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { } this.uiShow('inventory'); };
const baseKey = G.onKey; G.onKey = function (e) { const c = e.code; if ((c === 'Tab' || c === 'KeyI') && this.state === 'play' && !this.cut && !this.reading && UI.screen(this.project, 'inventory')) { e.preventDefault && e.preventDefault(); this.uiInventory(); return; } return baseKey.apply(this, arguments); };

/* keyboard and gamepad navigation */
G.uiFocusables = function () { const top = this.uiTop(); if (!top) return []; return top.focusables().map(f => f.el).concat([...top.el.querySelectorAll('.kz-choice')]).filter((el, i, a) => a.indexOf(el) === i); };
G.uiSetFocus = function (el) { const top = this.uiTop(); if (!top) return; top.el.querySelectorAll('.kz-focus').forEach(x => x.classList.remove('kz-focus')); this.uiFocus = el || null; if (el) { el.classList.add('kz-focus'); try { el.focus({ preventScroll: true }); } catch (e) { } } };
G.uiFocusFirst = function () { const list = this.uiFocusables(); this.uiSetFocus(list.find(el => el.classList.contains('kz-choice')) || list[0] || null); };
G.uiRefocus = function () { if (!this.uiFocus || !this.uiFocus.isConnected) this.uiFocusFirst(); };
G.uiMove = function (dx, dy) {
  const list = this.uiFocusables(); if (!list.length) return; if (!this.uiFocus || !list.includes(this.uiFocus)) { this.uiSetFocus(list[0]); return; } const r0 = this.uiFocus.getBoundingClientRect(), c0 = [r0.left + r0.width / 2, r0.top + r0.height / 2]; let best = null;
  list.forEach(el => { if (el === this.uiFocus) return; const r = el.getBoundingClientRect(), vx = r.left + r.width / 2 - c0[0], vy = r.top + r.height / 2 - c0[1], along = vx * dx + vy * dy; if (along < 4) return; const side = Math.abs(vx * dy - vy * dx), d = along + side * 2.2; if (!best || d < best.d) best = { el, d }; });
  if (!best) { const i = list.indexOf(this.uiFocus), n = list.length; best = { el: list[(i + (dx + dy > 0 ? 1 : -1) + n) % n] }; } this.uiSetFocus(best.el);
};
G.uiActivate = function () { const el = this.uiFocus; if (!el) return; if (el.classList.contains('kz-set')) { const f = this.uiTop().focusables().find(x => x.el === el); if (f && f.m && f.m.set.adjust) f.m.set.adjust(1); return; } el.click(); };
G.uiAdjust = function (dir) { const el = this.uiFocus; if (!el) return false; const f = this.uiTop() && this.uiTop().focusables().find(x => x.el === el); if (f && f.kind === 'setting') { f.m.set.adjust(dir); return true; } return false; };
G.uiKey = function (e) {
  const top = this.uiTop(); if (!top) return false; const c = e.code;
  if (this.dlg && top.screen.kind === 'dialogue') { if (['Enter', 'Space', 'KeyE'].includes(c)) { if (this.uiFocus && this.uiFocus.classList.contains('kz-choice')) this.uiFocus.click(); else this.dlgAdvance(); return true; } if (['ArrowLeft', 'KeyA'].includes(c)) { this.uiMove(-1, 0); return true; } if (['ArrowRight', 'KeyD'].includes(c)) { this.uiMove(1, 0); return true; } return false; }
  if (c === 'ArrowUp' || c === 'KeyW') { this.uiMove(0, -1); return true; } if (c === 'ArrowDown' || c === 'KeyS') { this.uiMove(0, 1); return true; }
  if (c === 'ArrowLeft' || c === 'KeyA') { if (!this.uiAdjust(-1)) this.uiMove(-1, 0); return true; } if (c === 'ArrowRight' || c === 'KeyD') { if (!this.uiAdjust(1)) this.uiMove(1, 0); return true; }
  if (c === 'Tab') { const list = this.uiFocusables(), i = list.indexOf(this.uiFocus), n = list.length; if (n) this.uiSetFocus(list[(i + (e.shiftKey ? -1 : 1) + n) % n]); return true; } if (c === 'Enter' || c === 'Space') { this.uiActivate(); return true; }
  if (c === 'Escape') { if (top.screen.kind === 'main' || top.screen.kind === 'dead' || top.screen.kind === 'win' || top.screen.kind === 'lose' || top.screen.kind === 'loading') return true; this.uiBack(); return true; }
  const hot = top.focusables().find(f => f.w.hotkey && (f.w.hotkey.toLowerCase() === (e.key || '').toLowerCase() || 'Key' + f.w.hotkey.toUpperCase() === c || (f.w.hotkey === 'Esc' && c === 'Escape') || (f.w.hotkey === 'Enter' && c === 'Enter'))); if (hot) { hot.el.click(); return true; } return false;
};
document.addEventListener('keydown', e => { const g = ENG._uiGame; if (!g || g.state === 'gone' || !g.uiTop()) return; if (g.uiKey(e)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
G.uiPad = function (dt) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : null; let gp = null; if (pads) for (let i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { gp = pads[i]; break; } const P = this.pad || (this.pad = { was: [], rep: 0, keys: [] }); if (!gp) { if (P.keys.length) { P.keys.forEach(k => { this.keys[k] = false; }); P.keys = []; } return; }
  const b = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > .5)), press = i => b(i) && !P.was[i], ax = i => { const v = gp.axes[i] || 0; return Math.abs(v) < .22 ? 0 : v; }, open = !!this.uiTop();
  if (open) {
    const dx = ax(0) || (b(15) ? 1 : b(14) ? -1 : 0), dy = ax(1) || (b(13) ? 1 : b(12) ? -1 : 0); P.rep -= dt; if ((Math.abs(dx) > .5 || Math.abs(dy) > .5) && P.rep <= 0) { P.rep = P.first ? .16 : .32; P.first = true; if (Math.abs(dy) >= Math.abs(dx)) this.uiMove(0, dy > 0 ? 1 : -1); else if (!this.uiAdjust(dx > 0 ? 1 : -1)) this.uiMove(dx > 0 ? 1 : -1, 0); } else if (Math.abs(dx) < .4 && Math.abs(dy) < .4) { P.rep = 0; P.first = false; }
    if (press(0)) this.uiActivate(); if (press(1)) this.uiBack(); if (press(9) && this.state === 'pause') this.uiResume();
  } else if (this.state === 'play' && !this.cut && !this.reading) {
    const mv = [['KeyW', -ax(1) > .35], ['KeyS', ax(1) > .35], ['KeyA', -ax(0) > .35], ['KeyD', ax(0) > .35], ['ShiftLeft', b(10)], ['KeyC', b(1)]]; P.keys.forEach(k => { this.keys[k] = false; }); P.keys = []; mv.forEach(([k, on]) => { if (on) { this.keys[k] = true; P.keys.push(k); } });
    const lx = ax(2), ly = ax(3), s = 2.6 * (this.S.sens || 1) * dt; if (lx || ly) { this.player.yaw -= lx * Math.abs(lx) * s; this.player.pitch = clamp(this.player.pitch - ly * Math.abs(ly) * s, -1.5, 1.5); }
    const kd = code => document.dispatchEvent(new KeyboardEvent('keydown', { code, key: code === 'Space' ? ' ' : code.replace('Key', '').toLowerCase(), bubbles: true }));
    if (press(0)) kd('Space'); if (press(2)) kd('KeyR'); if (press(3)) kd('KeyE'); if (press(6) && this.setBulletTime) this.setBulletTime(!this.btOn);
    const fire = b(7); if (fire && !P.fire) { this.mouse.l = true; this.fire(true); } else if (!fire && P.fire) this.mouse.l = false; P.fire = fire;
    if (press(4) || press(5)) { const order = ['fists', 'pistol', 'shotgun', 'rifle'].filter(k => k === 'fists' || this.wep.owned[k]); let i = order.indexOf(this.wep.cur); i = (i + (press(5) ? 1 : -1) + order.length) % order.length; this.setWeapon(order[i]); }
    if (press(9)) this.pause(); if (press(8)) this.uiInventory();
  } else if (this.state === 'pause' && press(9)) this.uiResume();
  P.was = gp.buttons.map((x, i) => b(i));
};
const baseLoop = G.loop; G.loop = function (now) {
  const dt = Math.min(.05, Math.max(0, (now - (this.last || now)) / 1000)); ENG._uiGame = this; try { this.uiPad(dt); } catch (e) { } const r = baseLoop.apply(this, arguments);
  try { if (this.dlg) this.dlgTick(dt); const top = this.uiTop(); if (top && this.state !== 'play') top.update(this.uiState()); else if (top && this.dlg) top.update(this.uiState()); if (this.hudHidden && this.hudEl.style.visibility !== 'hidden') this.hudEl.style.visibility = 'hidden'; } catch (e) { } return r;
};
const baseResize = G.resize; G.resize = function () { const r = baseResize.apply(this, arguments); try { if (this.hudEl) this.uiFit(); } catch (e) { } return r; };
const baseDispose = G.dispose; G.dispose = function () { if (ENG._uiGame === this) ENG._uiGame = null; return baseDispose.apply(this, arguments); };

/* the HUD in a game: theme vars, scaling, loading screen, saved settings */
const baseLoad = G.load; G.load = async function () {
  this.uiInit(); const hasLoad = !!UI.screen(this.project, 'loading'); this.loadProgress = 0; const t0 = performance.now(); let shown = null; if (hasLoad) { shown = this.uiShow('loading'); }
  ENG._loadHook = p => { this.loadProgress = Math.max(this.loadProgress, p); if (shown) shown.update(this.uiState()); };
  const r = await baseLoad.apply(this, arguments); ENG._loadHook = null; this.loadProgress = 1; this.uiLoadSettings(); this.uiFit();
  if (shown) { shown.update(this.uiState()); const wait = Math.max(0, 650 - (performance.now() - t0)); await new Promise(res => setTimeout(res, wait)); if (this.uiStack.includes(shown)) { const i = this.uiStack.indexOf(shown); this.uiStack.splice(i, 1); shown.el.classList.add('kz-scrout'); setTimeout(() => shown.el.remove(), 200); if (!this.uiStack.length) this.uiEl.style.display = 'none'; } }
  /* the loading screen was in the way of the main menu: show it now */
  if (this.state === 'menu' && !this.uiTop() && UI.screen(this.project, 'main') && !(this.vr && this.vr.on)) this.showMenu(this.S.title || this.project.name, (this.S.subtitle || '') + '\n', [['Play', () => this.begin()]], true);
  return r;
};
{ const ps = ENG.preloadSkins, pm = ENG.preloadModels; ENG.preloadSkins = async function () { const r = await ps.apply(this, arguments); if (ENG._loadHook) ENG._loadHook(.45); return r; }; ENG.preloadModels = async function () { const r = await pm.apply(this, arguments); if (ENG._loadHook) ENG._loadHook(.8); return r; }; }

/* ---------------- dialogue ---------------- */
G.showDialogue = function (d) {
  d = Object.assign({ speaker: '', text: '', portrait: '', choices: null, speed: 40, onDone: null }, d || {}); this.dlg = d; d.shown = 0; d.queue = d.queue || []; this.reading = true; this.keys = {}; this.mouse.l = false;
  const scr = UI.screen(this.project, 'dialogue'); const api = this.uiShow('dialogue', { push: !!(this.uiTop() && this.uiTop().screen.kind !== 'dialogue') }); if (api) { const m = api.update.items.find(x => x.w.kind === 'dialogue'); if (m) { d.speed = m.w.speed || d.speed; m.dlg.cBuilt = false; } api.update(this.uiState()); } return api;
};
G.dlgTick = function (dt) { const d = this.dlg; if (!d) return; if (d.shown < d.text.length) d.shown += dt * (d.speed || 40); };
G.dlgAdvance = function () { const d = this.dlg; if (!d) return; if (d.shown < d.text.length) { d.shown = d.text.length; return; } if (d.choices && d.choices.length) return; this.dlgEnd(); };
G.dlgChoose = function (i) { const d = this.dlg; if (!d || !d.choices || !d.choices[i]) return; const c = d.choices[i]; this.dlgEnd(); if (c.fn) c.fn(i); };
G.dlgEnd = function () { const d = this.dlg; if (!d) return; this.dlg = null; const top = this.uiTop(); if (top && top.screen.kind === 'dialogue') this.uiHide(false); if (!this.uiTop()) { this.reading = false; if (this.state === 'play' && !document.pointerLockElement && !this.noLock) this.lock(true); } else this.reading = false; if (d.onDone) d.onDone(); };
const baseCloseNote = G.closeNote; G.closeNote = function () { if (this.dlg) { this.dlgAdvance(); return; } return baseCloseNote ? baseCloseNote.apply(this, arguments) : undefined; };
G.hudShow = function (on) { this.hudHidden = !on; this.hudEl.style.visibility = on ? '' : 'hidden'; };

/* ---------------- Logic Tiles ---------------- */
if (ENG.Logic && ENG.Logic.ACTIONS) Object.assign(ENG.Logic.ACTIONS, {
  screen: { cat: 'Screen', label: 'Show a screen', text: 'show the screen {name}', params: { name: { t: 'text', d: 'Shop' } }, run(c, p) { const g = c.g, n = String(p.name || '').trim(); if (/^(close|hide|none)$/i.test(n)) { if (g.uiTop()) g.uiBack(); return; } if (!UI.screen(g.project, n)) return c.fail('There is no screen called ' + n); if (g.state === 'play') { g.state = 'pause'; g.mouse.l = false; g.keys = {}; try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { } } g.uiShow(n); } },
  dialogue: { cat: 'Screen', label: 'Show dialogue', text: '{speaker} says {text}', params: { speaker: { t: 'text', d: 'Guide' }, text: { t: 'text', d: 'Welcome. Follow the lights to the exit.' }, portrait: { t: 'text', d: 'icon:eye' } }, run(c, p) { c.g.showDialogue({ speaker: c.fmt(p.speaker), text: c.fmt(p.text), portrait: p.portrait }); } },
  ask: { cat: 'Screen', label: 'Ask a question (sets a number: 1, 2 or 3)', text: 'ask {text}: {a} / {b} / {c}, store the answer in {var}', params: { text: { t: 'text', d: 'Will you help us?' }, a: { t: 'text', d: 'Yes' }, b: { t: 'text', d: 'No' }, c: { t: 'text', d: '' }, var: { t: 'var', types: ['num'] } },
    run(c, p) { const opts = [p.a, p.b, p.c].map(s => c.fmt(s)).filter(s => s && s.trim()); c.g.showDialogue({ speaker: '', text: c.fmt(p.text), choices: opts.map((label, i) => ({ label, fn: () => { if (p.var) c.setVar(p.var, i + 1); } })) }); } },
  hud: { cat: 'Screen', label: 'Show or hide the HUD', text: 'turn the HUD {mode}', params: { mode: { t: 'enum', o: [['on', 'on'], ['off', 'off']], d: 'off' } }, run(c, p) { c.g.hudShow(p.mode !== 'off'); } }
});

/* ---------------- the look ---------------- */
ENG.CSS += `
@property --ax{syntax:'<length>';inherits:false;initial-value:0px}@property --ay{syntax:'<length>';inherits:false;initial-value:0px}@property --as{syntax:'<number>';inherits:false;initial-value:1}@property --ao{syntax:'<number>';inherits:false;initial-value:1}
.kz-w{transform:translate(-50%,-50%) translate(var(--ax,0px),var(--ay,0px)) rotate(var(--rot,0deg)) skew(var(--skew,0deg)) scale(calc(var(--k,1) * var(--s,1) * var(--as,1)));opacity:calc(var(--op,1) * var(--ao,1));will-change:transform,opacity}
.kz-w.kz-hid{opacity:calc(.35 * var(--ao,1))}.kz-w.kz-off{opacity:calc(.38 * var(--ao,1));filter:saturate(.3)}.kz-off .kz-btn{pointer-events:none}.kz-w.kz-locked{pointer-events:none}
.kz-ui{position:absolute;inset:0;z-index:5;display:none;pointer-events:none}.kz-menu{z-index:6}.kz-note{z-index:7}
.kz-scr{position:absolute;inset:0;pointer-events:auto;font-family:var(--ui-font2);color:var(--ui-ink);animation:kzScrIn .32s cubic-bezier(.22,1,.36,1) both}.kz-scr-dialogue{pointer-events:none}.kz-scr-dialogue .kz-dlg{pointer-events:auto}
.kz-scrin-zoom{animation-name:kzScrZoom}.kz-scrin-slide{animation-name:kzScrSlide}.kz-scrout{animation:kzScrOut .18s ease-in both;pointer-events:none}
@keyframes kzScrIn{from{opacity:0}to{opacity:1}}@keyframes kzScrZoom{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:none}}@keyframes kzScrSlide{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}@keyframes kzScrOut{to{opacity:0}}
.kz-scrbg{position:absolute;inset:0}.kz-frame{position:absolute;left:50%;top:50%;width:1280px;height:720px;transform:translate(-50%,-50%) scale(var(--fk,1));transform-origin:center}.kz-scrl{pointer-events:none}.kz-scrl .kz-btn,.kz-scrl .kz-set,.kz-scrl .kz-slot,.kz-scrl .kz-dlg{pointer-events:auto}
.kz-bg{padding:var(--pad,10px) calc(var(--pad,10px) * 1.6);background:var(--bgc);border-radius:var(--rad,8px);box-shadow:0 10px 30px -14px rgba(0,0,0,.7);box-sizing:border-box;border:1px solid var(--bgs,transparent)}
.kz-bg-pill{border-radius:999px}.kz-bg-plate{border-radius:0;clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)}
.kz-bg-glass{background:var(--bgc);backdrop-filter:blur(10px) saturate(1.3);-webkit-backdrop-filter:blur(10px) saturate(1.3);border:1px solid rgba(255,255,255,.18)}
.kz-bg-bubble{border-radius:18px;background:var(--bgc);color:#111;border:3px solid #111;box-shadow:4px 4px 0 #111}.kz-bg-bubble:after{content:"";position:absolute;left:22%;bottom:-16px;border:9px solid transparent;border-top:14px solid #111;border-bottom:0}
.kz-bg-burst{border-radius:0;clip-path:polygon(50% 0,58% 22%,80% 8%,70% 30%,100% 32%,76% 48%,98% 66%,72% 62%,80% 92%,58% 72%,50% 100%,42% 72%,20% 92%,28% 62%,2% 66%,24% 48%,0 32%,30% 30%,20% 8%,42% 22%);padding:calc(var(--pad,10px) * 2.6) calc(var(--pad,10px) * 3.2);box-shadow:none}
.kz-bg-ribbon{border-radius:0;clip-path:polygon(0 0,100% 0,calc(100% - 16px) 50%,100% 100%,0 100%,16px 50%);padding-left:calc(var(--pad,10px) * 2.6);padding-right:calc(var(--pad,10px) * 2.6)}
.kz-bg-tag{border-left:4px solid currentColor;border-radius:4px}
.kz-grad{background:linear-gradient(180deg,var(--g1),var(--g2));-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}.kz-grad.kz-bg{-webkit-text-fill-color:initial}
.kz-ht:before{content:"";position:absolute;inset:-6px;background:radial-gradient(circle,rgba(0,0,0,.42) .9px,transparent 1.6px) 0 0/5px 5px;pointer-events:none;mix-blend-mode:multiply;border-radius:inherit}
.kz-low .kz-bar i{animation:kzLow .7s ease-in-out infinite}@keyframes kzLow{50%{filter:brightness(1.9) saturate(1.4);opacity:.75}}
@keyframes kzIn-fade{from{--ao:0}}@keyframes kzIn-up{from{--ao:0;--ay:46px}}@keyframes kzIn-down{from{--ao:0;--ay:-46px}}@keyframes kzIn-left{from{--ao:0;--ax:-70px}}@keyframes kzIn-right{from{--ao:0;--ax:70px}}
@keyframes kzIn-pop{0%{--ao:0;--as:.4}70%{--as:1.08}100%{--as:1}}@keyframes kzIn-drop{0%{--ao:0;--as:1.8}100%{--as:1}}@keyframes kzIn-blur{from{--ao:0;filter:blur(14px)}to{filter:blur(0)}}@keyframes kzIn-type{from{--ao:0}}
@keyframes kzIdle-pulse{50%{--as:1.08}}@keyframes kzIdle-float{50%{--ay:-9px}}@keyframes kzIdle-blink{50%{--ao:.25}}@keyframes kzIdle-shake{25%{--ax:-3px}75%{--ax:3px}}@keyframes kzIdle-glow{50%{filter:brightness(1.5) drop-shadow(0 0 10px currentColor)}}@keyframes kzIdle-spin{to{--rot:360deg}}@keyframes kzIdle-bob{50%{--ay:5px}}@keyframes kzIdle-wobble{25%{--rot:-3deg}75%{--rot:3deg}}
.kz-ico{display:inline-block;vertical-align:middle}.kz-image img{display:block;max-width:none}
.kz-pips{display:flex;gap:var(--gap,4px)}.kz-pips i{display:inline-flex;transition:transform .2s,color .2s,opacity .2s}.kz-pips i.off{color:var(--off,#3a3f47);opacity:.75;transform:scale(.85)}
.kz-lg{position:relative}.kz-lg .kz-shp{position:absolute;left:0;top:0}.kz-lgi{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:6% 8%;box-sizing:border-box;text-align:center;white-space:normal}.kz-lgt{font-weight:700;letter-spacing:.03em;line-height:1;text-transform:uppercase}.kz-lgs{letter-spacing:.14em;text-transform:uppercase;opacity:.85}.kz-lgic{line-height:0}
.kz-keyhelp{font-size:14px;opacity:.85;text-align:center;letter-spacing:.02em;white-space:normal;max-width:1100px}
.kz-prog{height:14px}.kz-prog i{transition:width .25s}
.kz-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;font:600 20px var(--ui-font);color:#fff;background:var(--c);border:0;cursor:pointer;letter-spacing:.04em;transition:transform .15s cubic-bezier(.22,1,.36,1),filter .15s,box-shadow .2s;outline:none;white-space:nowrap;text-transform:inherit}
.kz-btn kbd{position:absolute;right:12px;font:600 11px var(--ui-font2);opacity:.6;background:rgba(0,0,0,.25);padding:2px 6px;border-radius:4px}
.kz-btn:hover,.kz-btn.kz-focus{transform:translateY(-2px) scale(1.03);filter:brightness(1.1)}.kz-btn:active{transform:translateY(1px) scale(.98)}
.kz-shape-cut{clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);color:#15181d}.kz-shape-pill{border-radius:999px;color:#15181d}.kz-shape-square{border-radius:0;color:#15181d}
.kz-shape-ghost{background:transparent;color:var(--c);border:2px solid var(--c);border-radius:var(--rad,6px)}.kz-shape-ghost:hover,.kz-shape-ghost.kz-focus{background:var(--c);color:#111}
.kz-shape-glass{background:color-mix(in srgb,var(--c) 18%,rgba(255,255,255,.04));color:var(--c);border:1px solid color-mix(in srgb,var(--c) 70%,transparent);border-radius:var(--rad,12px);backdrop-filter:blur(8px);box-shadow:0 0 0 0 var(--c)}.kz-shape-glass:hover,.kz-shape-glass.kz-focus{box-shadow:0 0 22px -4px var(--c),inset 0 0 18px -8px var(--c);background:color-mix(in srgb,var(--c) 32%,rgba(255,255,255,.04))}
.kz-shape-comic{background:var(--c);color:#111;border:4px solid #111;border-radius:var(--rad,14px);box-shadow:5px 5px 0 #111;font-weight:800}.kz-shape-comic:hover,.kz-shape-comic.kz-focus{transform:translate(-2px,-2px);box-shadow:8px 8px 0 #111}
.kz-shape-ribbon{clip-path:polygon(0 0,100% 0,calc(100% - 16px) 50%,100% 100%,0 100%,16px 50%);color:#1a140c;padding:0 28px}
.kz-focus{outline:none}.kz-shape-cut.kz-focus,.kz-shape-pill.kz-focus,.kz-shape-square.kz-focus,.kz-shape-ribbon.kz-focus{box-shadow:0 0 0 3px #fff,0 0 24px var(--ui-glow)}
.kz-set{display:flex;flex-direction:column;gap:7px;padding:8px 14px;border-radius:var(--ui-radius);background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.1);cursor:pointer;font:500 17px var(--ui-font2);color:var(--ui-ink);transition:border-color .15s,box-shadow .2s}.kz-set.kz-focus,.kz-set:hover{border-color:var(--c);box-shadow:0 0 0 1px var(--c),0 0 20px -6px var(--c)}
.kz-setl{display:flex;justify-content:space-between}.kz-setl b{font:700 15px var(--ui-font);color:var(--c)}.kz-sl{position:relative;height:6px;border-radius:3px;background:rgba(255,255,255,.14)}.kz-sl i{position:absolute;left:0;top:0;bottom:0;background:var(--c);border-radius:3px}.kz-sl u{position:absolute;top:50%;width:16px;height:16px;border-radius:50%;background:#fff;transform:translate(-50%,-50%);box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 45%,transparent)}
.kz-tog{position:relative;width:52px;height:26px;border-radius:999px;background:rgba(255,255,255,.14);align-self:flex-start}.kz-tog i{position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s}.kz-tog.on{background:var(--c)}.kz-tog.on i{transform:translateX(26px)}
.kz-inv{display:grid;gap:8px}.kz-slot{position:relative;width:var(--slot);height:var(--slot);border-radius:var(--ui-radius);background:rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;cursor:default;transition:border-color .15s,transform .15s}.kz-slot.full{cursor:pointer}.kz-slot.on{border-color:var(--ui-accent);background:color-mix(in srgb,var(--ui-accent) 18%,transparent)}.kz-slot.kz-focus,.kz-slot:hover{border-color:#fff;transform:scale(1.05)}
.kz-slot small{position:absolute;right:5px;bottom:3px;font:600 11px var(--ui-font);opacity:.8}.kz-invn{margin-top:10px;text-align:center;font:600 16px var(--ui-font);color:var(--ui-ink);min-height:20px}
.kz-dlg{display:flex;gap:16px;align-items:flex-start;padding:16px 18px;border-radius:var(--ui-radius);background:var(--bgc);border:1px solid color-mix(in srgb,var(--c) 55%,transparent);box-shadow:0 20px 50px -20px rgba(0,0,0,.8);text-align:left;white-space:normal;font:500 20px/1.45 var(--ui-font2);color:var(--ui-ink);box-sizing:border-box}
.kz-dlg-right{flex-direction:row-reverse}.kz-dlgp{flex:none;width:88px;height:88px;border-radius:var(--ui-radius);background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:var(--c);overflow:hidden}.kz-dlgp img{width:100%;height:100%;object-fit:cover}
.kz-dlgb{flex:1;min-width:0;position:relative}.kz-dlgn{font:700 15px var(--ui-font);color:var(--c);letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px}.kz-dlgt{min-height:1.4em}.kz-dlgc{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}.kz-dlgc .kz-btn{height:40px;padding:0 18px;font-size:16px}
.kz-dlgk{position:absolute;right:0;bottom:-4px;color:var(--c);animation:kzIdle-bob 1s ease-in-out infinite}
.kz-map{display:block;border-radius:50%}.kz-map-square{border-radius:var(--ui-radius,8px)}
`;
})();
