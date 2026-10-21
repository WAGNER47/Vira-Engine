/* ======================================================================
   VIRA SOUND RUNTIME: sound emitters (3D point, directional, surround zone), invisible in game,
   switched by Logic; sound cues inside cutscenes.
   ====================================================================== */
(function () {
  const AE = ENG.AudioEngine.prototype, cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const sp = AE.spatial; AE.spatial = function (h) {
    if (!h.g) return;
    if (h.surround && h.pos && this.cam) { const d = h.pos.distanceTo(this.cam.position), R = h.radius || 20, e = Math.max(.5, R * .2); h.g.gain.value = h.vol * cl((R - d) / e, 0, 1); if (h.pan) h.pan.pan.value = 0; return; }
    sp.call(this, h);
    if (h.dir && h.cone && h.pos && this.cam) { const to = this.cam.position.clone().sub(h.pos).normalize(), a = Math.acos(cl(to.dot(h.dir), -1, 1)) * 57.2958, half = h.cone / 2, f = a <= half ? 1 : Math.max(h.outer == null ? .12 : h.outer, 1 - (a - half) / 40); h.g.gain.value *= f; }
  };
  const pl = AE.play; AE.play = function (ref, o) { const h = pl.call(this, ref, o); if (h && o) { if (o.dir) h.dir = o.dir.clone().normalize(); h.cone = o.cone || 0; h.surround = !!o.surround; h.outer = o.outer; this.spatial(h); } return h; };
  const MODES = ['3D point', 'Directional', 'Surround zone'];
  ENG.PREFABS.speaker = { type: 'speaker', label: 'Sound emitter', cat: 'Gameplay', size: [1, 1, 1], props: {
    sound: { t: 'sound', d: 'preset:ambience', l: 'Sound' }, mode: { t: 'sel', d: '3D point', o: MODES, l: 'Type' },
    play: { t: 'sel', d: 'loop', o: ['loop', 'once', 'every few seconds'], l: 'Play' }, every: { t: 'num', d: 6, min: .5, max: 120, step: .5, l: 'Every (seconds)' },
    range: { t: 'num', d: 18, min: 1, max: 200, step: .5, l: 'Range (m)' }, volume: { t: 'num', d: .8, min: 0, max: 1, step: .05, l: 'Volume' },
    cone: { t: 'num', d: 70, min: 10, max: 300, step: 5, l: 'Cone angle (directional)' }, auto: { t: 'bool', d: true, l: 'Starts on' }, tag: { t: 'text', d: '', l: 'Tag' } },
    build(o, c) {
      const g = new THREE.Group(); if (!c.editor) return g; const P = o.props, col = P.mode === 'Surround zone' ? '#3fb6ff' : P.mode === 'Directional' ? '#ffb02e' : '#ff4058', mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .9 }), lm = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .55 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(.34, .46, .3), mat); box.position.y = .5; g.add(box); const horn = new THREE.Mesh(new THREE.CylinderGeometry(.11, .24, .2, 16), mat); horn.rotation.x = Math.PI / 2; horn.position.set(0, .5, -.24); g.add(horn);
      [.45, .7, .95].forEach((r, i) => { const pts = []; for (let k = 0; k <= 12; k++) { const a = -.7 + 1.4 * k / 12; pts.push(new THREE.Vector3(Math.sin(a) * r, .5 + Math.cos(a) * r * .0, -Math.cos(a) * r)); } const L = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .8 - i * .2 })); g.add(L); });
      const R = Math.min(+P.range || 18, 200), ring = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2; ring.push(new THREE.Vector3(Math.cos(a) * R, .05, Math.sin(a) * R)); } g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), lm));
      if (P.mode === 'Directional') { const h = (+P.cone || 70) / 2 * Math.PI / 180, L = Math.min(R, 8); [-h, h].forEach(a => g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, .5, 0), new THREE.Vector3(Math.sin(a) * L, .5, -Math.cos(a) * L)]), lm))); }
      return g;
    } };
  const GP = ENG.Game.prototype, st = GP.step;
  GP.sndOpts = function (s) { const P = s.e.o.props, r = s.e.root; r.updateMatrixWorld(true); const pos = r.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .5, 0)), dir = new THREE.Vector3(0, 0, -1).applyQuaternion(r.getWorldQuaternion(new THREE.Quaternion())); return { pos, radius: +P.range || 18, volume: P.volume == null ? .8 : +P.volume, loop: P.play === 'loop', dir: P.mode === 'Directional' ? dir : null, cone: P.mode === 'Directional' ? (+P.cone || 70) : 0, surround: P.mode === 'Surround zone' }; };
  GP.sndStart = function (s) { const P = s.e.o.props; s.on = true; s.t = 0; if (s.h) { this.audio.stop(s.h); s.h = null; } if (!P.sound || P.play === 'every few seconds') return; s.h = this.audio.play(P.sound, this.sndOpts(s)); if (s.h && P.play === 'loop' && !this.audio.loops.includes(s.h)) this.audio.loops.push(s.h); };
  GP.sndStop = function (s) { s.on = false; if (s.h) { this.audio.stop(s.h); s.h = null; } };
  GP.sndEmit = function (name, how) { (this._sn || []).filter(s => !name || s.e.o.name === name || (s.e.o.props.tag && s.e.o.props.tag === name)).forEach(s => { const on = how === 'toggle' ? !s.on : how !== 'off'; if (on) this.sndStart(s); else this.sndStop(s); }); };
  GP.step = function (dt) {
    if (!this._sn && this.ents && this.ents.length && this.audio) { this._sn = []; try { this._sn = this.ents.filter(e => e.o && e.o.type === 'speaker').map(e => ({ e, on: false, h: null, t: 0 })); this._sn.forEach(s => { if (s.e.o.props.auto !== false) this.sndStart(s); }); } catch (e) { } }
    const r = st.apply(this, arguments);
    if (this._sn && this._sn.length && this.state === 'play') this._sn.forEach(s => { if (!s.on) return; const P = s.e.o.props; if (P.play === 'every few seconds') { s.t -= dt; if (s.t <= 0) { s.t = (+P.every || 6) * (.7 + Math.random() * .6); this.audio.play(P.sound, Object.assign(this.sndOpts(s), { loop: false })); } } else if (s.h && s.h.pos) { s.e.root.getWorldPosition(s.h.pos); s.h.pos.y += .5; } });
    return r;
  };
  const uc = GP.updateCutscene; if (uc) GP.updateCutscene = function (dt) {
    const c = this.cut, t0 = c ? c.t : 0, r = uc.apply(this, arguments);
    try { const C = c && c.cs && c.cs.sounds; if (C && C.length && this.audio) { c._sf = c._sf || {}; c._sh = c._sh || []; const t1 = c.t; C.forEach(k => { if (!c._sf[k.id] && k.at >= t0 - 1e-6 && k.at < t1 + 1e-6) { c._sf[k.id] = 1; const h = this.audio.play(k.ref, { volume: k.vol == null ? 1 : +k.vol, loop: !!k.loop }); if (h) c._sh.push(h); } }); if (this.cut !== c) c._sh.forEach(h => { if (h.src && h.src.loop) this.audio.stop(h); }); } } catch (e) { }
    return r;
  };
})();
