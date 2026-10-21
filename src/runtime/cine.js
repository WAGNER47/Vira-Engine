/* VIRA CINE: cutscene camera with transitions (cut, fade, flash, whip), camera bodies with real sensor sizes and frame shapes,
   lenses in mm that zoom between shots, roll and handheld shake. Shared by the game and the editor preview. */
(function () {
'use strict';
const ENG = window.ENG, cl = (v, a, b) => Math.max(a, Math.min(b, v)), lp = (a, b, f) => a + (b - a) * f;
ENG.CINE_BODIES = {
  standard: { name: 'Standard game camera', sensor: 36, aspect: 0, note: 'Uses the game camera and keeps the screen shape.' },
  solace: { name: 'Solace V6', sensor: 36, aspect: 2.39, note: 'Full frame, 2.39 widescreen. The classic big-movie look.' },
  canto: { name: 'Canto C70', sensor: 24.9, aspect: 1.85, note: 'Super 35, 1.85 frame. Natural drama and documentary feel.' },
  aeris: { name: 'Aeris LF', sensor: 36.7, aspect: 2.0, note: 'Large format, 2.00 frame. Soft, wide and premium.' },
  giga: { name: 'GIGAFRAME 70', sensor: 70.4, aspect: 1.43, note: 'Giant format, tall 1.43 frame. Huge, immersive scale.' },
  reel16: { name: 'Reel 16', sensor: 12.5, aspect: 1.66, note: 'Super 16, 1.66 frame. Gritty, intimate, handheld energy.' }
};
ENG.CINE_TR = { smooth: 'Smooth move', linear: 'Steady move', cut: 'Cut', fade: 'Fade through black', flash: 'Flash through white', whip: 'Whip pan' };
ENG.cineFov = (cs, mm, aspect) => { const body = ENG.CINE_BODIES[cs.body] || ENG.CINE_BODIES.standard, hf = 2 * Math.atan(body.sensor / (2 * Math.max(4, mm))); return cl(2 * Math.atan(Math.tan(hf / 2) / (aspect || 16 / 9)) * 180 / Math.PI, 3, 140); };
ENG.remapEval = (R, t) => {
  if (t <= R[0].t) return R[0].v; const L = R[R.length - 1]; if (t >= L.t) return L.v; let j = 0; while (j < R.length - 2 && R[j + 1].t <= t) j++; const a = R[j], b = R[j + 1]; if (a.hold) return a.v;
  const sg = b.t - a.t, x1 = a.t + (a.o ? a.o[0] : sg / 3), y1 = a.v + (a.o ? a.o[1] : (b.v - a.v) / 3), x2 = b.t + (b.i ? b.i[0] : -sg / 3), y2 = b.v + (b.i ? b.i[1] : -(b.v - a.v) / 3), bz = (p0, p1, p2, p3, s) => { const u = 1 - s; return u * u * u * p0 + 3 * u * u * s * p1 + 3 * u * s * s * p2 + s * s * s * p3; };
  let lo = 0, hi = 1, s = .5; for (let k = 0; k < 32; k++) { s = (lo + hi) / 2; if (bz(a.t, x1, x2, b.t, s) < t) lo = s; else hi = s; } return bz(a.v, y1, y2, b.v, s);
};
ENG.CINE_FX = { fadein: 'Fade in', fadeout: 'Fade out', flash: 'Flash', shake: 'Camera shake', zoom: 'Zoom punch', vignette: 'Vignette', bw: 'Black and white', sepia: 'Sepia', blur: 'Dream blur', glitch: 'Glitch', contrast: 'Punchy contrast' };
ENG.sampleCutscene = function (cs, rt, cam) {
  const RM = cs.remap && cs.remap.length >= 2, t = RM ? Math.max(0, ENG.remapEval(cs.remap, rt)) : rt, k = cs.keys; if (!k.length) return null; let i = 0; while (i < k.length - 1 && k[i + 1].t <= t) i++;
  const a = k[i], b = k[Math.min(i + 1, k.length - 1)], tr = a.tr || (cs.ease === false ? 'linear' : 'smooth'), seg = b.t - a.t; let f = seg > 0 ? cl((t - a.t) / seg, 0, 1) : 0;
  if (tr === 'smooth') f = f * f * (3 - 2 * f); else if (tr === 'cut' || tr === 'fade' || tr === 'flash') f = 0; else if (tr === 'whip') { const w = Math.min(seg, .45), s = w > 0 ? cl((t - (b.t - w)) / w, 0, 1) : 0; f = s * s * (3 - 2 * s); }
  cam.position.set(lp(a.p[0], b.p[0], f), lp(a.p[1], b.p[1], f), lp(a.p[2], b.p[2], f)); cam.quaternion.copy(new THREE.Quaternion().fromArray(a.q)).slerp(new THREE.Quaternion().fromArray(b.q), f);
  let ov = 0, oc = '#000';
  if ((tr === 'fade' || tr === 'flash') && b !== a) { const d = Math.min(Math.max(.1, +a.trd || .5), seg / 2 || .5); if (t > b.t - d) { ov = (t - (b.t - d)) / d; oc = tr === 'flash' ? '#fff' : '#000'; } }
  if (i > 0) { const p = k[i - 1]; if (p.tr === 'fade' || p.tr === 'flash') { const d = Math.max(.1, +p.trd || .5), v = 1 - (t - a.t) / d; if (v > ov) { ov = v; oc = p.tr === 'flash' ? '#fff' : '#000'; } } }
  const roll = lp(+a.roll || 0, +b.roll || 0, f) * Math.PI / 180, sh = lp(+a.shake || 0, +b.shake || 0, f); if (roll) cam.rotateZ(roll);
  if (sh > 0) { const s = sh * .025; cam.rotateY(Math.sin(rt * 1.7) * s + Math.sin(rt * 4.3 + 2) * s * .45); cam.rotateX(Math.sin(rt * 2.3 + 1) * s * .8 + Math.sin(rt * 5.1) * s * .3); }
  let filter = '', vig = 0, zoomF = 1;
  (cs.fx || []).forEach(e => { const d = Math.max(.05, +e.d || 1), l = (rt - e.t) / d; if (l < 0 || l > 1) return; const am = e.amt == null ? 1 : +e.amt; let v;
    switch (e.type) {
      case 'fadein': v = (1 - l) * am; if (v > ov) { ov = v; oc = '#000'; } break; case 'fadeout': v = l * am; if (v > ov) { ov = v; oc = '#000'; } break;
      case 'flash': v = Math.pow(1 - l, 2) * am; if (v > ov) { ov = v; oc = '#fff'; } break;
      case 'shake': { const s = am * .045 * (1 - l * .6); cam.rotateY(Math.sin(rt * 37) * s + Math.sin(rt * 23) * s * .5); cam.rotateX(Math.sin(rt * 29 + 1) * s); break; }
      case 'zoom': zoomF *= 1 - am * .3 * Math.sin(Math.PI * l); break; case 'vignette': vig = Math.max(vig, am * Math.min(1, Math.sin(Math.PI * l) * 3)); break;
      case 'bw': filter += ' grayscale(' + am.toFixed(2) + ')'; break; case 'sepia': filter += ' sepia(' + am.toFixed(2) + ')'; break;
      case 'blur': filter += ' blur(' + (am * 6 * Math.sin(Math.PI * l)).toFixed(2) + 'px)'; break; case 'contrast': filter += ' contrast(' + (1 + am * .6).toFixed(2) + ') saturate(' + (1 + am * .4).toFixed(2) + ')'; break;
      case 'glitch': if (Math.random() < .35) filter += ' hue-rotate(' + (Math.random() * 180 | 0) + 'deg) saturate(' + (1 + am * 2).toFixed(1) + ')'; break;
    } });
  let fov = null; const ma = +a.mm || 0, mb = +b.mm || 0; if (ma || mb || (cs.body && cs.body !== 'standard')) fov = ENG.cineFov(cs, lp(ma || 35, mb || ma || 35, f), cam.aspect);
  if (fov || zoomF !== 1) { if (cam.userData.fov0 == null) cam.userData.fov0 = cam.fov; cam.fov = cl((fov || cam.userData.fov0) * zoomF, 3, 150); cam.updateProjectionMatrix(); } else if (cam.userData.fov0 != null) ENG.cineRestore(cam);
  let text = ''; for (let j = 0; j < k.length; j++) if (k[j].t <= t && k[j].text) text = k[j].text;
  return { text, i, ct: t, end: RM ? cs.remap[cs.remap.length - 1].t : k[k.length - 1].t + (cs.hold == null ? 1 : cs.hold), ov: cl(ov, 0, 1), oc, fov, filter: filter.trim(), vig, aspect: (ENG.CINE_BODIES[cs.body] || {}).aspect || 0 };
};
ENG.cineRestore = cam => { if (cam && cam.userData.fov0 != null) { cam.fov = cam.userData.fov0; cam.userData.fov0 = null; cam.updateProjectionMatrix(); } };
/* frame overlay: fades, flashes, and bars that match the camera body's frame shape */
ENG.cineFrame = (host, parent, r, letterbox, cvs) => {
  if (!host._cine) { const mk = () => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;pointer-events:none;background:#000;z-index:30;transition:none'; parent.appendChild(d); return d; }; host._cine = { ov: mk(), vg: mk(), t: mk(), b: mk(), l: mk(), r: mk() }; host._cine.ov.style.inset = '0'; host._cine.vg.style.inset = '0'; }
  const C = host._cine, W = parent.clientWidth, H = parent.clientHeight, A = r && letterbox !== false ? r.aspect : 0; let bh = 0, bw = 0; if (A && W && H) { if (W / H < A) bh = (H - W / A) / 2; else bw = (W - H * A) / 2; }
  C.ov.style.background = (r && r.oc) || '#000'; C.ov.style.opacity = r ? String(r.ov || 0) : '0'; C.vg.style.background = 'radial-gradient(ellipse at center, transparent 45%, #000 100%)'; C.vg.style.opacity = r ? String(r.vig || 0) : '0'; if (cvs) cvs.style.filter = (r && r.filter) || '';
  Object.assign(C.t.style, { left: '0', right: '0', top: '0', height: bh + 'px' }); Object.assign(C.b.style, { left: '0', right: '0', bottom: '0', height: bh + 'px' }); Object.assign(C.l.style, { top: '0', bottom: '0', left: '0', width: bw + 'px' }); Object.assign(C.r.style, { top: '0', bottom: '0', right: '0', width: bw + 'px' });
};
const GP = ENG.Game && ENG.Game.prototype;
if (GP && GP.updateCutscene) {
  GP.updateCutscene = function (dt) {
    const c = this.cut; c.t += dt; const r = ENG.sampleCutscene(c.cs, c.t, this.cam); this.subEl.textContent = r ? r.text : '';
    c.keys.forEach((k, i) => { if (k.activates && c.t >= k.t && !c.fired[i]) { c.fired[i] = true; this.activate(k.activates); } });
    try { ENG.cineFrame(this, this.subEl.parentNode, r, c.cs.letterbox, this.renderer && this.renderer.domElement); if (r && r.aspect && this.lbs) this.lbs.forEach(l => l.style.height = '0'); } catch (e) { }
    if (!r || c.t >= r.end) this.endCutscene();
  };
  const ec = GP.endCutscene; GP.endCutscene = function () { ENG.cineRestore(this.cam); try { if (this._cine) ENG.cineFrame(this, this.subEl.parentNode, null, true, this.renderer && this.renderer.domElement); } catch (e) { } return ec.apply(this, arguments); };
}
})();
