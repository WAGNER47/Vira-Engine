/* VIRA PRO INTERFACE: the last layer of the editor look and feel.
   A calmer graphite palette, one accent, consistent spacing and type, and motion that explains what changed:
   a sliding tab pill, workspace and panel transitions, folding sections, spring menus and dialogs, live slider fills,
   tooltips, a Ctrl+K command palette and a short intro. Everything respects the reduced motion setting (html.rm).
   Loaded after ed.js; it only reads the editor through the DOM, Ed and Ed.api. */
(function () {
'use strict';
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const RM = () => document.documentElement.classList.contains('rm') || matchMedia('(prefers-reduced-motion: reduce)').matches;

/* empty pieces (null, false, undefined) passed to append or prepend used to show up as the text "null" */
['append', 'prepend'].forEach(fn => [Element.prototype, DocumentFragment.prototype].forEach(P => { const base = P[fn]; P[fn] = function (...a) { return base.apply(this, a.filter(x => x != null && x !== false)); }; }));

/* ---------------- the look ---------------- */
const CSS = `
:root,:root[data-theme="dark"]{
  --bg:#07080a;--panel:#0d0e11;--panel2:#14161a;--panel3:#1b1d23;--line:#1f2228;--line2:#2b2f37;--ink:#e9eaee;--dim:#868b97;--field:#0a0b0d;
  --vp:#0b0c0f;--hair:rgba(255,255,255,.06);--hair2:rgba(255,255,255,.1);--lift:0 18px 40px -18px rgba(0,0,0,.85);
  --r1:7px;--r2:10px;--r3:14px;--ease:cubic-bezier(.2,.8,.2,1);--spring:cubic-bezier(.22,1,.36,1);--fast:.14s;--mid:.26s;
}
:root[data-theme="light"]{--bg:#e7e8ec;--panel:#f6f7f9;--panel2:#eceef2;--panel3:#e2e5ea;--line:#d5d8df;--line2:#c3c7d0;--ink:#15171b;--dim:#5d6270;--field:#fff;--hair:rgba(0,0,0,.07);--hair2:rgba(0,0,0,.12);--lift:0 18px 40px -20px rgba(0,0,0,.35)}
body{font-feature-settings:"tnum" 1,"ss01" 1;letter-spacing:.005em;background:var(--bg)}
::selection{background:var(--accent);color:#fff}

/* top bar: glass, an accent hairline that breathes, and a sliding pill behind the active tab */
#top{position:relative;background:linear-gradient(180deg,rgba(20,21,26,.96),rgba(11,12,15,.96))!important;border-bottom:1px solid var(--hair)!important;box-shadow:0 1px 0 rgba(0,0,0,.6);z-index:30}
:root[data-theme="light"] #top{background:linear-gradient(180deg,#fdfdfe,#f0f1f4)!important}
#top:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent 0%,var(--accent) 35%,var(--accent2,var(--accent)) 50%,var(--accent) 65%,transparent 100%);opacity:.38;background-size:200% 100%;animation:vtLine 14s linear infinite;pointer-events:none}
@keyframes vtLine{from{background-position:0 0}to{background-position:200% 0}}
#tabs{position:relative;align-items:center;gap:2px;margin-left:14px;height:100%}
#tabs button{height:32px!important;padding:0 13px!important;border-radius:9px!important;border:0!important;font:600 13px "Chakra Petch",sans-serif!important;letter-spacing:.02em;color:var(--dim)!important;z-index:1;transition:color var(--mid) var(--ease)!important}
#tabs button:after{display:none!important}
#tabs button:hover{color:var(--ink)!important}
#tabs button[aria-selected="true"]{color:#fff!important}
:root[data-theme="light"] #tabs button[aria-selected="true"]{color:var(--ink)!important}
.vt-pill{position:absolute;top:50%;height:32px;margin-top:-16px;left:0;width:0;border-radius:9px;z-index:0;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.03));box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 6px 18px -8px rgba(0,0,0,.8);
  transition:transform .42s var(--spring),width .42s var(--spring),opacity .2s}
.vt-pill:after{content:"";position:absolute;left:22%;right:22%;bottom:-1px;height:2px;border-radius:2px;background:var(--accent);box-shadow:0 0 12px var(--glow)}
:root[data-theme="light"] .vt-pill{background:#fff;box-shadow:0 0 0 1px var(--line),0 4px 12px -6px rgba(0,0,0,.25)}
#projName{border-radius:var(--r1)!important;transition:background var(--fast),border-color var(--fast)}
#saveState{font:500 11.5px "Barlow",sans-serif;color:var(--dim);padding:3px 9px;border:1px solid var(--hair);border-radius:999px;background:rgba(255,255,255,.02)}

/* buttons: one shape everywhere, honest hover and press feedback */
.btn{height:30px;border-radius:var(--r1)!important;border:1px solid var(--hair2)!important;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015))!important;color:var(--ink);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04);font:600 12.5px "Barlow",sans-serif;letter-spacing:.01em;transition:background var(--fast),border-color var(--fast),box-shadow var(--mid),transform .1s var(--ease),color var(--fast)!important}
.btn:hover{border-color:rgba(255,255,255,.18)!important;background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.03))!important}
.btn:active{transform:translateY(1px) scale(.985)}
.btn.ghost{background:transparent!important;border-color:transparent!important;box-shadow:none}.btn.ghost:hover{background:rgba(255,255,255,.06)!important;border-color:var(--hair)!important}
.btn.primary{position:relative;overflow:hidden;background:linear-gradient(180deg,var(--accent2,var(--accent)),var(--accent))!important;border-color:transparent!important;color:#fff!important;box-shadow:0 6px 18px -8px var(--glow),inset 0 1px 0 rgba(255,255,255,.22)!important}
.btn.primary:hover{box-shadow:0 10px 26px -8px var(--glow),inset 0 1px 0 rgba(255,255,255,.28)!important;filter:brightness(1.06)}
.btn.primary:before{content:"";position:absolute;top:0;bottom:0;left:-60%;width:45%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.28),transparent);transform:skewX(-18deg);transition:left .6s var(--ease);pointer-events:none}
.btn.primary:hover:before{left:120%}
.btn.danger{color:#ff7476!important}.btn.danger:hover{border-color:rgba(255,77,79,.45)!important;background:rgba(255,77,79,.08)!important}
.btn.sm{height:27px;padding:0 10px;font-size:12px;border-radius:7px!important}
.btn[disabled]{opacity:.4;pointer-events:none}
.split .caret{border-left:1px solid rgba(0,0,0,.25)!important}
#playBtn{padding:0 16px!important;letter-spacing:.04em}
/* buttons in side panels never cut their words off: they grow instead */
.panel .btn,#right .btn,.mzsec .btn,.wkcard .btn,.hgcard .btn,.acts .btn,.btnrow .btn,.iempty .btn,.ctl .btn,.studio .btn{height:auto;min-height:27px;white-space:normal;line-height:1.2;padding-top:5px;padding-bottom:5px;text-align:center}
.mrow .btn{height:32px;padding:0 16px}

/* fields */
.in,select.in,textarea.in,input[type=color]{background:var(--field)!important;border:1px solid var(--hair2)!important;border-radius:var(--r1)!important;color:var(--ink);transition:border-color var(--fast),box-shadow var(--mid),background var(--fast)!important}
.in:hover,select.in:hover{border-color:rgba(255,255,255,.17)!important}
.in:focus,select:focus,textarea:focus{border-color:var(--accent)!important;box-shadow:0 0 0 3px var(--sel)!important;outline:none}
select.in{appearance:none;-webkit-appearance:none;padding-right:24px!important;background-image:linear-gradient(45deg,transparent 50%,var(--dim) 50%),linear-gradient(135deg,var(--dim) 50%,transparent 50%)!important;background-position:calc(100% - 13px) 50%,calc(100% - 9px) 50%!important;background-size:4px 4px!important;background-repeat:no-repeat!important}
input[type=number]{-moz-appearance:textfield}input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
/* sliders: a thin track that fills with the accent up to the thumb */
input[type=range]{-webkit-appearance:none;appearance:none;height:18px;background:transparent;cursor:pointer;--p:50%}
input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:4px;background:linear-gradient(90deg,var(--accent) 0 var(--p),rgba(255,255,255,.12) var(--p) 100%)}
input[type=range]::-moz-range-track{height:4px;border-radius:4px;background:rgba(255,255,255,.12)}input[type=range]::-moz-range-progress{height:4px;border-radius:4px;background:var(--accent)}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-5px;border-radius:50%;background:#fff;border:0;box-shadow:0 0 0 4px var(--sel),0 2px 6px rgba(0,0,0,.6);transition:transform .15s var(--spring),box-shadow .2s}
input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#fff;border:0;box-shadow:0 0 0 4px var(--sel)}
input[type=range]:hover::-webkit-slider-thumb{transform:scale(1.15)}input[type=range]:active::-webkit-slider-thumb{transform:scale(1.25);box-shadow:0 0 0 6px var(--sel),0 2px 8px rgba(0,0,0,.6)}
:root[data-theme="light"] input[type=range]::-webkit-slider-runnable-track{background:linear-gradient(90deg,var(--accent) 0 var(--p),rgba(0,0,0,.14) var(--p) 100%)}

/* panels and folding sections */
#left,#right,.panel{background:linear-gradient(180deg,var(--panel),#0b0c0e)!important}
:root[data-theme="light"] #left,:root[data-theme="light"] #right,:root[data-theme="light"] .panel{background:var(--panel)!important}
.panel.l{border-right:1px solid var(--hair)!important}.panel.r,#right{border-left:1px solid var(--hair)!important}
.ph{font:700 11px "Chakra Petch",sans-serif!important;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)!important;display:flex;align-items:center;justify-content:space-between;gap:8px}
details.sec{border-top:1px solid var(--hair)!important;margin:0 8px;border-radius:0}
details.sec>summary{margin:3px 0;padding:9px 8px!important;border-radius:8px!important;font:700 11px "Chakra Petch",sans-serif!important;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)!important;transition:color var(--fast),background var(--fast)!important}
details.sec>summary:hover{color:var(--ink)!important;background:rgba(255,255,255,.035)!important}
details.sec[open]>summary{color:var(--ink)!important}
details.sec>summary:before{border-color:var(--dim)!important;transition:transform .3s var(--spring),border-color .2s!important}
details.sec[open]>summary:before{border-color:var(--accent)!important}
details.sec>.body{padding:2px 6px 12px!important}
.row{margin:6px 0!important;gap:10px!important}.row>label,.row>.lb{font-size:12px!important;color:var(--dim)!important}
.hint2,.help{color:var(--dim);line-height:1.5}
.sw{background:rgba(255,255,255,.14)!important;transition:background .2s var(--ease)!important}.sw:after{box-shadow:0 1px 3px rgba(0,0,0,.5);transition:transform .3s var(--spring)!important}.sw:checked{background:var(--accent)!important;box-shadow:0 0 10px -2px var(--glow)}
.li,.orow{transition:background var(--fast),transform .2s var(--spring),box-shadow var(--fast)!important;border-radius:8px}
.li:hover,.orow:hover{background:rgba(255,255,255,.045)!important}
.li.on,.orow.on{background:var(--sel)!important;box-shadow:inset 2px 0 0 var(--accent)}
.badge,.tag,.li .tag{border-color:var(--hair2)!important;border-radius:6px!important;background:rgba(255,255,255,.03)}
.rtabs{background:rgba(0,0,0,.35)!important;border:1px solid var(--hair)!important;border-radius:12px!important}
.rtabs .rind{border-radius:9px!important;box-shadow:0 6px 18px -8px var(--glow),inset 0 1px 0 rgba(255,255,255,.25)!important;transition:transform .42s var(--spring),width .42s var(--spring)!important}
/* segmented controls keep every label whole */
.seg{flex:none;max-width:100%;overflow:visible}.seg button{flex:1 0 auto!important;white-space:nowrap!important;padding:5px 11px!important;transition:background .25s var(--ease),color .2s,box-shadow .25s!important}
.tlseg button,.wktabs button,.sndmodes button{white-space:nowrap}
/* the music studio sections used to be squeezed shorter than their content */
.mzsec{flex:none!important}.mzsec .mzsecb{animation:vtFold .28s var(--ease)}
/* viewport toolbars: smoked glass */
.grp{background:rgba(10,11,14,.72)!important;border:1px solid rgba(255,255,255,.07)!important;box-shadow:0 12px 28px -14px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.04)!important}
.tb{font:600 12px "Barlow",sans-serif!important}
.tb.on{box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 6px 16px -6px var(--glow)!important}
#status{background:linear-gradient(180deg,#0b0c0f,#08090b)!important;border-top:1px solid var(--hair)!important;font-size:11.5px;color:var(--dim)}
#status kbd{transform:translateY(-1px)}
#stat{font-variant-numeric:tabular-nums;padding:0 4px}

/* motion: workspaces, panels, menus, dialogs, toasts */
.ws.on{animation:vtWs .38s var(--spring)}
@keyframes vtWs{from{opacity:0;transform:translateY(8px) scale(.995)}to{opacity:1;transform:none}}
@keyframes vtFold{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.vt-swap{animation:vtSwap .32s var(--spring)}@keyframes vtSwap{from{opacity:.0;transform:translateX(6px)}to{opacity:1;transform:none}}
.menu{background:rgba(14,15,19,.94)!important;backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);border:1px solid var(--hair2)!important;border-radius:12px!important;padding:5px!important;box-shadow:0 24px 60px -18px rgba(0,0,0,.9),0 0 0 1px rgba(0,0,0,.4)!important;transform-origin:top left;animation:vtMenu .22s var(--spring)}
@keyframes vtMenu{from{opacity:0;transform:translateY(-6px) scale(.97)}to{opacity:1;transform:none}}
.menu .mi{border-radius:8px!important;padding:7px 10px!important;transition:background .12s,color .12s,padding .18s var(--spring)!important}
.menu .mi:hover,.menu .mi:focus{background:var(--sel)!important;color:#fff;padding-left:13px!important;outline:none}
.menu .sep{background:var(--hair)!important;margin:4px 6px!important}
#modal{background:rgba(4,5,7,.55)!important;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:vtFade .2s var(--ease)}
#modal .card{background:linear-gradient(180deg,#15171c,#0f1014)!important;border:1px solid var(--hair2)!important;border-radius:16px!important;box-shadow:0 40px 90px -30px rgba(0,0,0,.95),inset 0 1px 0 rgba(255,255,255,.05)!important;animation:vtCard .34s var(--spring)}
:root[data-theme="light"] #modal .card{background:var(--panel)!important}
#modal .card h3{font:700 17px "Chakra Petch",sans-serif;letter-spacing:.01em}
@keyframes vtCard{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
@keyframes vtFade{from{opacity:0}to{opacity:1}}
#toast{transition:opacity .25s var(--ease),transform .4s var(--spring)!important}
#toast:not(.show){transform:translate(-50%,14px)!important;opacity:0}
.choice{border-radius:12px!important;border:1px solid var(--hair2)!important;transition:border-color .15s,transform .25s var(--spring),background .15s,box-shadow .25s!important}
.choice:hover{transform:translateY(-2px);border-color:var(--accent)!important;box-shadow:0 14px 30px -18px var(--glow)}

/* tooltips */
.vt-tip{position:fixed;z-index:9999;max-width:300px;padding:6px 9px;border-radius:8px;background:rgba(14,15,19,.96);border:1px solid var(--hair2);color:#e9eaee;font:500 12px/1.4 "Barlow",sans-serif;pointer-events:none;box-shadow:0 12px 30px -12px rgba(0,0,0,.9);opacity:0;transform:translateY(3px);transition:opacity .14s,transform .2s var(--spring)}
.vt-tip.on{opacity:1;transform:none}.vt-tip kbd{margin-left:6px}

/* command palette */
.vt-cmdk{position:fixed;inset:0;z-index:9000;display:flex;justify-content:center;align-items:flex-start;padding-top:12vh;background:rgba(3,4,6,.55);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);animation:vtFade .16s var(--ease)}
.vt-cmdk .box{width:min(640px,92vw);background:linear-gradient(180deg,#16181d,#0f1014);border:1px solid var(--hair2);border-radius:16px;box-shadow:0 40px 100px -30px rgba(0,0,0,.95),0 0 0 1px rgba(0,0,0,.5),0 0 60px -30px var(--glow);overflow:hidden;animation:vtCard .3s var(--spring)}
.vt-cmdk .q{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--hair)}
.vt-cmdk .q svg{color:var(--accent);flex:none}.vt-cmdk input{flex:1;background:none;border:0;outline:none;color:var(--ink);font:500 16px "Barlow",sans-serif}
.vt-cmdk .q kbd{opacity:.7}
.vt-cmdk .list{max-height:52vh;overflow:auto;padding:6px}
.vt-cmdk .grp-h{padding:8px 10px 4px;font:700 10.5px "Chakra Petch",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
.vt-cmdk .it{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;cursor:pointer;color:var(--ink);font:500 13.5px "Barlow",sans-serif;transition:background .1s}
.vt-cmdk .it small{margin-left:auto;color:var(--dim);font-size:11.5px}
.vt-cmdk .it i{width:22px;height:22px;border-radius:6px;display:grid;place-items:center;background:rgba(255,255,255,.05);color:var(--dim);font-style:normal;font-size:11px;flex:none}
.vt-cmdk .it.on{background:var(--sel)}.vt-cmdk .it.on i{background:var(--accent);color:#fff}
.vt-cmdk .it b{font-weight:600;color:#fff}
.vt-cmdk .foot{display:flex;gap:14px;padding:8px 14px;border-top:1px solid var(--hair);color:var(--dim);font-size:11.5px}
.vt-cmdk .none{padding:22px;text-align:center;color:var(--dim)}
.vt-cmdkbtn{display:inline-flex;align-items:center;gap:8px;height:28px;padding:0 10px;margin-right:6px;border-radius:8px;border:1px solid var(--hair2);background:rgba(255,255,255,.03);color:var(--dim);font:500 12px "Barlow",sans-serif;cursor:pointer;transition:border-color .15s,color .15s,background .15s}
.vt-cmdkbtn:hover{color:var(--ink);border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.06)}.vt-cmdkbtn kbd{font-size:10px;white-space:nowrap}
@media (max-width:1480px){.vt-cmdkbtn .lb{display:none}#tabs button{padding:0 9px!important;font-size:12.5px!important}#tabs{margin-left:8px}}
@media (max-width:1320px){.vt-cmdkbtn kbd{display:none}#saveState{display:none}#tabs button{padding:0 7px!important}}
@media (max-width:1180px){.brand .wm{display:none}#tabs button{padding:0 6px!important;font-size:12px!important}#projName{width:110px!important}}

/* intro */
.vt-intro{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 55%,#121318 0%,#060709 70%);transition:opacity .5s var(--ease),visibility .5s}
.vt-intro.out{opacity:0;visibility:hidden}
.vt-intro .mk{display:flex;flex-direction:column;align-items:center;gap:16px}
.vt-intro svg path{stroke-dasharray:120;stroke-dashoffset:120;animation:vtDraw 1s var(--ease) .05s forwards}
.vt-intro .wm{font:600 22px "Chakra Petch",sans-serif;letter-spacing:.6em;color:#e9eaee;opacity:0;transform:translateY(6px);animation:vtUp .7s var(--spring) .35s forwards;padding-left:.6em}
.vt-intro .ln{width:180px;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);transform:scaleX(0);animation:vtGrow .9s var(--ease) .45s forwards}
@keyframes vtDraw{to{stroke-dashoffset:0}}@keyframes vtUp{to{opacity:1;transform:none}}@keyframes vtGrow{to{transform:none}}
html.rm .vt-intro{display:none}
@media (prefers-reduced-motion: reduce){*{animation-duration:.001s!important;transition-duration:.001s!important}.vt-intro{display:none}}
`;
document.head.append(Object.assign(document.createElement('style'), { id: 'viraPro', textContent: CSS }));

/* ---------------- the sliding pill behind the active top tab ---------------- */
function pillInit() {
  const nav = $('#tabs'); if (!nav || $('.vt-pill', nav)) return; const pill = document.createElement('div'); pill.className = 'vt-pill'; nav.prepend(pill);
  const place = () => { const b = $$('#tabs button').find(x => x.getAttribute('aria-selected') === 'true' && x.offsetParent); if (!b) { pill.style.opacity = 0; return; } pill.style.opacity = 1; pill.style.width = b.offsetWidth + 'px'; pill.style.transform = 'translateX(' + b.offsetLeft + 'px)'; };
  new MutationObserver(place).observe(nav, { attributes: true, subtree: true, attributeFilter: ['aria-selected', 'style'] }); addEventListener('resize', place); if (document.fonts) document.fonts.ready.then(place); place(); setTimeout(place, 300);
}

/* ---------------- sections fold open and shut instead of jumping ---------------- */
document.addEventListener('click', e => {
  const s = e.target.closest('details.sec > summary'); if (!s || RM()) return; const d = s.parentElement, body = d.querySelector(':scope > .body'); if (!body || d.dataset.vtAnim) return;
  e.preventDefault(); d.dataset.vtAnim = '1'; const done = () => { delete d.dataset.vtAnim; body.style.overflow = ''; };
  body.style.overflow = 'hidden';
  if (d.open) { const h = body.offsetHeight; const a = body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 220, easing: 'cubic-bezier(.4,0,.2,1)' }); a.onfinish = () => { d.open = false; done(); }; }
  else { d.open = true; const h = body.offsetHeight; const a = body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' }); a.onfinish = done; }
}, true);

/* ---------------- sliders fill with the accent as they move ---------------- */
const fill = r => { const a = +r.min || 0, b = r.max === '' ? 100 : +r.max, v = +r.value; r.style.setProperty('--p', (b > a ? (v - a) / (b - a) * 100 : 0) + '%'); };
document.addEventListener('input', e => { if (e.target.type === 'range') fill(e.target); }, true);
let fillT = 0; new MutationObserver(() => { if (fillT) return; fillT = requestAnimationFrame(() => { fillT = 0; $$('input[type=range]').forEach(fill); }); }).observe(document.body, { childList: true, subtree: true });

/* ---------------- the right panel slides in new content when the selection changes ---------------- */
let lastSel; new MutationObserver(() => { const d = $('#details'); if (!d || !window.Ed) return; const s = Ed.sel || null; if (s === lastSel) return; lastSel = s; if (RM()) return; d.classList.remove('vt-swap'); void d.offsetWidth; d.classList.add('vt-swap'); }).observe(document.body, { childList: true, subtree: true });

/* ---------------- tooltips: the title text, shown cleanly after a short pause ---------------- */
const tip = document.createElement('div'); tip.className = 'vt-tip'; document.body.append(tip); let tipT = 0, tipEl = null;
const tipHide = () => { clearTimeout(tipT); tip.classList.remove('on'); if (tipEl && tipEl.dataset.vtTitle != null) { tipEl.setAttribute('title', tipEl.dataset.vtTitle); delete tipEl.dataset.vtTitle; } tipEl = null; };
document.addEventListener('mouseover', e => {
  const el = e.target.closest && e.target.closest('[title]'); if (!el || el === tipEl || el.closest('#playLayer') || el.closest('.vt-cmdk')) return; tipHide(); const t = el.getAttribute('title'); if (!t) return;
  tipEl = el; el.dataset.vtTitle = t; el.removeAttribute('title');
  tipT = setTimeout(() => { if (tipEl !== el || !el.isConnected) return; const m = /\(([^()]{1,14})\)\s*$/.exec(t); tip.innerHTML = ''; tip.append(m ? t.slice(0, m.index).trim() : t); if (m) { const k = document.createElement('kbd'); k.textContent = m[1]; tip.append(k); }
    const r = el.getBoundingClientRect(); tip.style.left = '0px'; tip.style.top = '0px'; const tw = tip.offsetWidth, th = tip.offsetHeight; let x = Math.min(innerWidth - tw - 8, Math.max(8, r.left + r.width / 2 - tw / 2)), y = r.bottom + 8; if (y + th > innerHeight - 8) y = r.top - th - 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('on'); }, 420);
});
document.addEventListener('mouseout', e => { if (tipEl && (!e.relatedTarget || !tipEl.contains(e.relatedTarget))) tipHide(); });
['mousedown', 'wheel', 'keydown'].forEach(ev => document.addEventListener(ev, tipHide, true));

/* ---------------- Ctrl+K: search every tab, action, template and object ---------------- */
const PAL = { el: null, sel: 0, items: [] };
function clickMenu(btnSel, label, then) { const b = $(btnSel); if (!b) return; b.click(); setTimeout(() => { const mi = $$('.menu .mi').find(m => m.textContent.trim().startsWith(label)); if (mi) { mi.click(); if (then) setTimeout(then, 120); } else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); }, 30); }
function actions() {
  const A = [], tab = (t, l) => A.push({ g: 'Go to', t: l, k: 'tab', run: () => { const b = $('#tabs [data-tab="' + t + '"]'); if (b) b.click(); else if (Ed.api && Ed.api.setTab) Ed.api.setTab(t); } });
  $$('#tabs button').forEach(b => { if (b.offsetParent || b.style.display !== 'none') tab(b.dataset.tab, b.textContent.trim() + ' tab'); });
  const file = (l, hint) => A.push({ g: 'File', t: l.replace(/…$/, ''), k: hint || '', run: () => clickMenu('#fileBtn', l) });
  ['New project…', 'Open saved project…', 'Open project file…', 'Save', 'Save project file (.json)', 'Import model, texture or audio…', 'Import HTML game…', 'Export game (.html)', 'Keyboard shortcuts'].forEach(l => file(l, l === 'Save' ? 'Ctrl+S' : ''));
  A.push({ g: 'Game', t: 'Play', k: 'Alt+P', run: () => { const b = $('#playBtn'); if (b) b.click(); } });
  A.push({ g: 'Game', t: 'World settings', k: '', run: () => { const b = $('#tabs [data-tab="level"]'); if (b) b.click(); setTimeout(() => { const w = $$('.rtabs button').find(x => /World/.test(x.textContent)); if (w) w.click(); }, 80); } });
  A.push({ g: 'Game', t: 'Check level', k: '', run: () => { const b = $$('button').find(x => /Check level/.test(x.textContent)); if (b) b.click(); } });
  ['Neon Depths (VR roguelite)', 'Starter level', 'Gameplay test', 'Noir test', 'Skyline Valley', 'Logic Tiles test', 'Empty level', 'Roguelike dungeon', 'Open world'].forEach(n => A.push({ g: 'New from template', t: n, k: '', run: () => clickMenu('#fileBtn', 'New project', () => { const c = $$('#modal .choice').find(x => x.textContent.startsWith(n)); if (c) c.click(); }) }));
  if (window.ENG && Ed.api && Ed.api.startPlacing) Object.entries(ENG.PREFABS).forEach(([k, p]) => { if (!p.label || k === 'blueprint' || k === 'cubegrid') return; A.push({ g: 'Add to level', t: p.label, k: p.cat || '', run: () => { const b = $('#tabs [data-tab="level"]'); if (b) b.click(); setTimeout(() => { try { Ed.api.startPlacing(k); } catch (x) { } }, 60); } }); });
  if (window.Ed && Ed.project) Ed.project.objects.slice(0, 400).forEach(o => A.push({ g: 'Select in level', t: o.name || o.type, k: (ENG.PREFABS[o.type] || {}).label || o.type, run: () => { const b = $('#tabs [data-tab="level"]'); if (b) b.click(); setTimeout(() => { try { Ed.api.select(o.id); } catch (x) { } }, 60); } }));
  return A;
}
function score(q, s) { if (!q) return 1; s = s.toLowerCase(); const i = s.indexOf(q); if (i >= 0) return 100 - i; let j = 0, sc = 0; for (const c of q) { const f = s.indexOf(c, j); if (f < 0) return 0; sc += f === j ? 3 : 1; j = f + 1; } return sc; }
function palOpen() {
  if (PAL.el) return; const all = actions(); const wrap = document.createElement('div'); wrap.className = 'vt-cmdk';
  wrap.innerHTML = '<div class="box" role="dialog" aria-label="Command palette"><div class="q"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input placeholder="Search tabs, actions, templates and objects" aria-label="Search"><kbd>Esc</kbd></div><div class="list"></div><div class="foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> run</span><span><kbd>Ctrl</kbd> <kbd>K</kbd> open anywhere</span></div></div>';
  document.body.append(wrap); PAL.el = wrap; const inp = $('input', wrap), list = $('.list', wrap);
  const draw = () => { const q = inp.value.trim().toLowerCase(); PAL.items = all.map(a => ({ a, s: Math.max(score(q, a.t), score(q, a.g + ' ' + a.t) * .6) })).filter(x => x.s > 0).sort((x, y) => y.s - x.s).slice(0, q ? 60 : 40).map(x => x.a); PAL.sel = Math.min(PAL.sel, Math.max(0, PAL.items.length - 1)); list.innerHTML = '';
    if (!PAL.items.length) { list.innerHTML = '<div class="none">Nothing matches that.</div>'; return; } let g = null;
    PAL.items.forEach((a, i) => { if (a.g !== g && !q) { g = a.g; const hd = document.createElement('div'); hd.className = 'grp-h'; hd.textContent = g; list.append(hd); } const it = document.createElement('div'); it.className = 'it' + (i === PAL.sel ? ' on' : ''); const ic = document.createElement('i'); ic.textContent = a.g[0]; const t = document.createElement('span'); t.textContent = a.t; const sm = document.createElement('small'); sm.textContent = q ? a.g + (a.k ? ' · ' + a.k : '') : a.k; it.append(ic, t, sm); it.onmousemove = () => { if (PAL.sel !== i) { PAL.sel = i; $$('.it', list).forEach((x, j) => x.classList.toggle('on', j === i)); } }; it.onclick = () => run(i); list.append(it); }); };
  const run = i => { const a = PAL.items[i]; palClose(); if (a) setTimeout(() => a.run(), 20); };
  inp.addEventListener('input', () => { PAL.sel = 0; draw(); });
  inp.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); PAL.sel = (PAL.sel + (e.key === 'ArrowDown' ? 1 : -1) + PAL.items.length) % Math.max(1, PAL.items.length); draw(); const on = $('.it.on', list); if (on) on.scrollIntoView({ block: 'nearest' }); } else if (e.key === 'Enter') { e.preventDefault(); run(PAL.sel); } else if (e.key === 'Escape') { e.preventDefault(); palClose(); } e.stopPropagation(); });
  wrap.addEventListener('mousedown', e => { if (e.target === wrap) palClose(); }); draw(); setTimeout(() => inp.focus(), 10);
}
function palClose() { if (PAL.el) { PAL.el.remove(); PAL.el = null; } }
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') { if (window.Ed && Ed.playing) return; e.preventDefault(); e.stopPropagation(); PAL.el ? palClose() : palOpen(); } }, true);
function palButton() { const help = $('#helpBtn'); if (!help || $('.vt-cmdkbtn')) return; const b = document.createElement('button'); b.className = 'vt-cmdkbtn'; b.title = 'Search everything (Ctrl+K)'; b.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span class="lb">Search</span><kbd>Ctrl K</kbd>'; b.onclick = palOpen; const studio = $('#studioBtn'); (studio || help).before(b); }

/* ---------------- a short intro while the editor wakes up ---------------- */
function intro() {
  if (RM() || sessionStorage.getItem('vtIntro')) return; try { sessionStorage.setItem('vtIntro', '1'); } catch (x) { }
  const o = document.createElement('div'); o.className = 'vt-intro'; o.innerHTML = '<div class="mk"><svg width="64" height="64" viewBox="0 0 32 32" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"><path d="M16 3.5 27 9.8v12.4L16 28.5 5 22.2V9.8z"/><path d="M10.5 11.5 16 21.5l5.5-10"/></svg><div class="wm">VIRA</div><div class="ln"></div></div>';
  document.body.append(o); const t0 = performance.now(); const go = () => { o.classList.add('out'); setTimeout(() => o.remove(), 600); };
  const wait = () => { const ready = window.Ed && Ed.project && document.getElementById('projName') && document.getElementById('projName').value; if ((ready && performance.now() - t0 > 1150) || performance.now() - t0 > 3000) go(); else setTimeout(wait, 80); }; wait();
}

pillInit(); palButton(); intro();
setTimeout(() => { pillInit(); palButton(); }, 800);
})();
