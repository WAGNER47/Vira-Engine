/* VIRA CINEMATIC: post effects, looks, mirrors, light shafts, ragdolls, bullet time, rain.
   Built only on the bundled three.js r128 examples and cannon.js 0.6.2. */
(function () {
'use strict';
const ENG = window.ENG, D2R = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, rand = (a, b) => a + Math.random() * (b - a);

/* ---------------- looks (color grades) and quality ---------------- */
ENG.LOOKS = {
  classic: { label: 'Classic (no post effects)' },
  natural: { label: 'Natural', exposure: 1.05, bloom: .35, threshold: .85, radius: .45, contrast: 1.04, saturation: 1.05, shadowTint: '#f2f5ff', highTint: '#fff8ee', vignette: .28, grain: .025, fringe: 0 },
  noir: { label: 'Noir (noir film)', exposure: 1.4, bloom: .72, threshold: .72, radius: .62, contrast: 1.18, saturation: .45, shadowTint: '#9fb4dc', highTint: '#ffd9a6', vignette: .5, grain: .07, fringe: .0016 },
  neon: { label: 'Neon night', exposure: 1.1, bloom: 1.15, threshold: .52, radius: .7, contrast: 1.16, saturation: 1.3, shadowTint: '#b9a4ff', highTint: '#9ff3ff', vignette: .45, grain: .045, fringe: .0024 },
  warm: { label: 'Warm interior', exposure: 1.08, bloom: .55, threshold: .72, radius: .55, contrast: 1.08, saturation: 1.12, shadowTint: '#e6d2c0', highTint: '#ffe2b8', vignette: .38, grain: .03, fringe: 0 },
  horror: { label: 'Horror', exposure: 1.05, bloom: .4, threshold: .7, radius: .5, contrast: 1.32, saturation: .32, shadowTint: '#a9c4ac', highTint: '#e2ead6', vignette: .75, grain: .12, fringe: .0012 },
  flashback: { label: 'Flashback (sepia)', exposure: 1.12, bloom: .9, threshold: .58, radius: .8, contrast: 1.12, saturation: .05, shadowTint: '#c9a27a', highTint: '#ffe6bb', vignette: .7, grain: .14, fringe: .002 },
  bleach: { label: 'Bleach bypass', exposure: 1.1, bloom: .45, threshold: .75, radius: .5, contrast: 1.42, saturation: .55, shadowTint: '#dfe6ee', highTint: '#ffffff', vignette: .5, grain: .06, fringe: .001 }
};
ENG.QUALITY = {
  low: { label: 'Low (fastest)', post: false, shadow: 1024, pixel: 1, fxaa: false, mirror: 256, lightShadows: false },
  medium: { label: 'Medium', post: true, shadow: 2048, pixel: 1, fxaa: true, mirror: 384, lightShadows: true },
  high: { label: 'High', post: true, shadow: 2048, pixel: 1.5, fxaa: true, mirror: 640, lightShadows: true },
  ultra: { label: 'Ultra (maximum)', post: true, shadow: 4096, pixel: 2, fxaa: true, mirror: 1024, lightShadows: true }
};
ENG.gradeOf = S => S.look === 'classic' ? null : Object.assign({}, ENG.LOOKS.natural, ENG.LOOKS[S.look] || {}, (S.lookTune && S.lookTune[S.look]) || {}, S.grade || {});
/* older projects kept one set of tuned values: they now belong to the look they were tuned on */
{ const bm = ENG.migrate; ENG.migrate = p => { p = bm(p); const S = p && p.settings; if (S) { if (!S.lookTune) S.lookTune = {}; if (S.grade) { S.lookTune[S.look] = Object.assign({}, S.lookTune[S.look] || {}, S.grade); S.grade = null; } } return p; }; }
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(1, 1) }, time: { value: 0 }, contrast: { value: 1 }, saturation: { value: 1 }, shadowTint: { value: new THREE.Color(1, 1, 1) }, highTint: { value: new THREE.Color(1, 1, 1) }, vignette: { value: 0 }, grain: { value: 0 }, fringe: { value: 0 }, slowmo: { value: 0 }, fade: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse; uniform vec2 res; uniform float time, contrast, saturation, vignette, grain, fringe, slowmo, fade; uniform vec3 shadowTint, highTint; varying vec2 vUv;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
    'void main(){',
    '  vec2 d = vUv - 0.5; float f = fringe * (1.0 + slowmo * 2.0);',
    '  vec3 c = vec3(texture2D(tDiffuse, vUv + d * f * 2.0).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * f * 2.0).b);',
    '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
    '  vec3 tone = mix(shadowTint, highTint, smoothstep(0.05, 0.85, l)); tone /= max(dot(tone, vec3(0.2126, 0.7152, 0.0722)), 0.001); c *= tone;',
    '  l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, saturation);',
    '  c = (c - 0.5) * contrast + 0.5;',
    '  l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(c, vec3(l) * vec3(1.1, 0.98, 0.82), slowmo * 0.55);',
    '  vec2 a = d * vec2(res.x / res.y, 1.0); float v = smoothstep(1.05, 0.25, length(a) * 1.25); c *= mix(1.0, v, clamp(vignette + slowmo * 0.25, 0.0, 1.0));',
    '  c += (hash(vUv * res + fract(time * 7.13) * 91.7) - 0.5) * grain;',
    '  c *= 1.0 - fade;',
    '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
    '}'].join('\n')
};
ENG.Post = class {
  constructor(renderer, scene, camera) {
    this.r = renderer; this.scene = scene; this.cam = camera; this.slowmo = 0; this.fade = 0; this.t = 0; this.ok = !!(THREE.EffectComposer && THREE.UnrealBloomPass);
    if (!this.ok) return;
    const s = renderer.getSize(new THREE.Vector2());
    this.composer = new THREE.EffectComposer(renderer); this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.addPass(new THREE.RenderPass(scene, camera));
    this.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(Math.max(2, s.x), Math.max(2, s.y)), .5, .5, .8); this.composer.addPass(this.bloom);
    this.after = new THREE.AfterimagePass(.78); this.after.enabled = false; this.composer.addPass(this.after);
    this.grade = new THREE.ShaderPass(GradeShader); this.composer.addPass(this.grade);
    this.fxaa = new THREE.ShaderPass(THREE.FXAAShader); this.composer.addPass(this.fxaa);
    this.cur = null; this.goal = null;
  }
  apply(S, instant) {
    const q = ENG.QUALITY[S.quality] || ENG.QUALITY.high, g = ENG.gradeOf(S);
    this.on = this.ok && !!g && q.post; this.r.toneMapping = g ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    if (!g) { this.r.toneMappingExposure = 1; return; }
    this.goal = Object.assign({}, g); if (!this.cur || instant) this.cur = Object.assign({}, g);
    if (this.ok) this.fxaa.enabled = q.fxaa; this.push();
  }
  push() {
    const c = this.cur; if (!c) return; this.r.toneMappingExposure = c.exposure; if (!this.ok) return;
    this.bloom.strength = c.bloom; this.bloom.threshold = c.threshold; this.bloom.radius = c.radius;
    const u = this.grade.uniforms; u.contrast.value = c.contrast; u.saturation.value = c.saturation; u.vignette.value = c.vignette; u.grain.value = c.grain; u.fringe.value = c.fringe;
    u.shadowTint.value.set(c.shadowTint); u.highTint.value.set(c.highTint);
  }
  blend(dt) {
    if (!this.cur || !this.goal) return; const k = Math.min(1, dt * 1.6); let moved = false;
    for (const key in this.goal) { const a = this.cur[key], b = this.goal[key]; if (typeof b === 'number' && Math.abs(a - b) > 1e-4) { this.cur[key] = a + (b - a) * k; moved = true; } else if (typeof b === 'string' && a !== b) { const ca = new THREE.Color(a).lerp(new THREE.Color(b), k); this.cur[key] = '#' + ca.getHexString(); if (ca.equals(new THREE.Color(b))) this.cur[key] = b; moved = true; } }
    if (moved) this.push();
  }
  setSize(w, h) { if (!this.ok) return; const pr = this.r.getPixelRatio(); this.composer.setPixelRatio(pr); this.composer.setSize(w, h); this.fxaa.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr)); this.grade.uniforms.res.value.set(w * pr, h * pr); }
  render(dt) {
    this.t += dt || 0; this.blend(dt || 0);
    if (!this.on) { this.r.render(this.scene, this.cam); return; }
    if (this.cur) this.r.toneMappingExposure = this.cur.exposure * (this.adapt || 1);
    const u = this.grade.uniforms; u.time.value = this.t; u.slowmo.value = this.slowmo; u.fade.value = this.fade; this.after.enabled = this.slowmo > .05;
    this.composer.render(dt);
  }
  dispose() { if (this.composer) { this.composer.renderTarget1.dispose(); this.composer.renderTarget2.dispose(); } }
};

/* ---------------- mirror and light shaft objects ---------------- */
const MirrorShader = {
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, opacity: { value: 1 } },
  vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; void main(){ vUv = textureMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 color; uniform sampler2D tDiffuse; uniform float opacity; varying vec4 vUv; void main(){ vec4 base = texture2DProj(tDiffuse, vUv); gl_FragColor = vec4(base.rgb * color, opacity); }'
};
ENG.mirrorRes = 512;
const P = ENG.PREFABS;
function prefab(type, cfg) { cfg.type = type; P[type] = cfg; }
function solidMesh(m) { m.castShadow = m.receiveShadow = true; m.userData.walk = true; m.userData.solid = true; return m; }
prefab('mirror', { label: 'Mirror', cat: 'Lights & FX', size: [1.2, 1.6, .05], props: { tint: { t: 'color', d: '#d9e0e6', l: 'Tint' }, opacity: { t: 'num', d: 1, min: .05, max: 1, step: .05, l: 'Strength (low = glossy floor)' }, frame: { t: 'bool', d: true, l: 'Frame' }, breakable: { t: 'bool', d: true, l: 'Shatters when shot' }, strength: { t: 'num', d: 8, min: 1, max: 500, step: 1, l: 'Toughness' }, shards: { t: 'num', d: 16, min: 4, max: 60, step: 1, l: 'Shards' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const [sx, sy] = o.s, p = o.props, g = new THREE.Group(), res = Math.round(ENG.mirrorRes);
  if (THREE.Reflector && !c.thumb) {
    const m = new THREE.Reflector(new THREE.PlaneGeometry(sx, sy), { textureWidth: res, textureHeight: Math.max(64, Math.round(res * Math.min(2, sy / sx))), clipBias: .003, color: p.tint, shader: MirrorShader });
    m.material.uniforms.opacity.value = p.opacity; if (p.opacity < 1) { m.material.transparent = true; m.material.depthWrite = false; }
    m.position.set(0, sy / 2, .012); m.userData.walk = true; m.userData.solid = !p.frame; m.userData.mirror = true; g.add(m);
  } else { const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sy), new THREE.MeshStandardMaterial({ color: p.tint, metalness: 1, roughness: .05 })); m.position.set(0, sy / 2, .012); g.add(m); }
  if (p.frame) { const f = solidMesh(new THREE.Mesh(new THREE.BoxGeometry(sx + .08, sy + .08, .04), new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: .6, metalness: .2 }))); f.position.set(0, sy / 2, -.01); g.add(f); }
  return g;
} });
const BeamShader = {
  uniforms: { color: { value: new THREE.Color('#fff') }, strength: { value: .3 }, len: { value: 5 } },
  vertexShader: 'uniform float len; varying float vF; varying vec3 vN; varying vec3 vV; void main(){ vF = clamp(-position.y / len, 0.0, 1.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform vec3 color; uniform float strength; varying float vF; varying vec3 vN; varying vec3 vV; void main(){ float e = pow(abs(dot(normalize(vN), normalize(vV))), 1.7); float a = strength * e * (1.0 - vF) * (1.0 - vF * 0.6); gl_FragColor = vec4(color * a, 1.0); }'
};
ENG.beamMesh = function (radius, len, color, strength) {
  const geo = new THREE.ConeGeometry(Math.max(.01, radius), len, 40, 1, true); geo.translate(0, -len / 2, 0);
  const mat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(BeamShader.uniforms), vertexShader: BeamShader.vertexShader, fragmentShader: BeamShader.fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  mat.uniforms.color.value.set(color); mat.uniforms.strength.value = strength; mat.uniforms.len.value = len;
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 5; m.userData.beam = true; return m;
};
prefab('shaft', { label: 'Light shaft', cat: 'Lights & FX', size: [1.6, 4, 1], props: { color: { t: 'color', d: '#ffe9c4', l: 'Color' }, strength: { t: 'num', d: .22, min: .02, max: 2, step: .02, l: 'Strength' }, spread: { t: 'num', d: 1, min: .2, max: 4, step: .05, l: 'Spread at the bottom' }, tag: { t: 'text', d: '', l: 'Tag' } }, build(o, c) {
  const [sx, sy] = o.s, g = new THREE.Group(); const b = ENG.beamMesh(sx / 2 * o.props.spread, sy, o.props.color, o.props.strength); b.position.y = sy; g.add(b); g.userData.beam = b;
  if (c.editor) { const k = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), new THREE.MeshBasicMaterial({ color: o.props.color })); k.position.y = sy; k.userData.editorOnly = true; g.add(k); }
  return g;
} });
/* spotlights can cast a visible beam */
if (P.spotlight) {
  Object.assign(P.spotlight.props, { beam: { t: 'bool', d: false, l: 'Visible beam' }, beamStrength: { t: 'num', d: .2, min: .02, max: 2, step: .02, l: 'Beam strength' } });
  const base = P.spotlight.build;
  P.spotlight.build = function (o, c) { const g = base(o, c); if (o.props.beam) { const len = Math.min(o.props.range * .75, 14), r = Math.tan(o.props.angle * D2R) * len; const b = ENG.beamMesh(r, len, o.props.color, o.props.beamStrength); g.add(b); g.userData.beam = b; } return g; };
}

/* ---------------- sounds for the cinematic layer ---------------- */
Object.assign(ENG.SOUND_PRESETS, {
  rain: { wave: 'noise', freq: 2400, slide: 0, attack: 1, sustain: 6, decay: 1, lowpass: .32, volume: .32 },
  slowIn: { wave: 'saw', freq: 150, slide: -1.6, attack: .02, sustain: .12, decay: .6, lowpass: .3, volume: .45, vib: .05, vibSpeed: 5 },
  slowOut: { wave: 'saw', freq: 80, slide: 1.6, attack: .02, sustain: .08, decay: .35, lowpass: .3, volume: .35 },
  shell: { wave: 'square', freq: 2300, slide: -1, attack: 0, sustain: 0, decay: .05, lowpass: .9, volume: .08 }
});
ENG.SLOTS.slowIn = 'Bullet time start'; ENG.SLOTS.slowOut = 'Bullet time end';

/* ---------------- HUD: bullet time meter ---------------- */
ENG.HUD_KINDS.bullettime = 'Bullet time meter';
ENG.HUD_PROPS.bullettime = { label: ['text', 'Label'], width: ['num', 60, 600, 5, 'Bar width'] };

/* ---------------- logic actions for storytelling ---------------- */
if (ENG.Logic) {
  const A = ENG.Logic.ACTIONS;
  A.look = { cat: 'Screen', label: 'Change the cinematic look', text: 'change the look to {look}', params: { look: { t: 'enum', o: Object.keys(ENG.LOOKS).filter(k => k !== 'classic').map(k => [k, ENG.LOOKS[k].label.toLowerCase()]), d: 'noir' } }, run(c, p) { c.g.setLook(p.look); } };
  A.slowmo = { cat: 'Screen', label: 'Slow motion', text: 'slow time down for {s} seconds', params: { s: { t: 'num', d: 2, min: .1, max: 30, step: .1 } }, run(c, p) { c.g.slowT = Math.max(c.g.slowT || 0, p.s); } };
  A.fade = { cat: 'Screen', label: 'Fade the screen', text: 'fade the screen {dir} over {s} s', params: { dir: { t: 'enum', o: [['out', 'to black'], ['in', 'back in']], d: 'out' }, s: { t: 'num', d: 1.5, min: 0, max: 20, step: .1 } }, run(c, p) { c.g.fadeTo(p.dir === 'out' ? 1 : 0, p.s); } };
}

/* ---------------- game additions ---------------- */
const G = ENG.Game.prototype;
G.setupCinematic = function () {
  const S = this.S, q = ENG.QUALITY[S.quality] || ENG.QUALITY.high;
  this.ts = 1; this.slowT = 0; this.btOn = false; if (this.player.bt == null) this.player.bt = 1; this.bullets = []; this.ragdolls = []; this.shells = 0;
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixel)); this.resize();
  this.sun.shadow.mapSize.set(q.shadow, q.shadow);
  if (!q.lightShadows) this.scene.traverse(n => { if (n.isPointLight || n.isSpotLight) n.castShadow = false; });
  this.post = new ENG.Post(this.renderer, this.scene, this.cam); this.post.apply(S, true); this.resize();
  this.probeLights = []; this.scene.traverse(n => { if ((n.isPointLight || n.isSpotLight) && n !== this.boom) this.probeLights.push(n); }); this.adapt = 1;
  if (S.weather === 'rain') this.rain = new Rain(this, S.rain == null ? .6 : S.rain);
  this.bulletGeo = new THREE.BoxGeometry(.035, .035, 1); this.bulletGeo.translate(0, 0, -.5);
  this.bulletMat = new THREE.MeshBasicMaterial({ color: '#ffe3a3', transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false });
  this.enemyBulletMat = new THREE.MeshBasicMaterial({ color: '#ff9c6e', transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false });
  this.shellGeo = new THREE.CylinderGeometry(.007, .007, .028, 6); this.shellMat = new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: .9, roughness: .35 });
};
/* eye adaptation: sample how much light reaches the camera and ease exposure toward a target,
   so dark corridors open up and bright rooms pull down. CPU only, no GPU readback. */
const _lp = new THREE.Vector3();
G.updateExposure = function (rdt) {
  if (!this.post || !this.post.on || this.S.adapt === false || !this.probeLights) { if (this.post) this.post.adapt = 1; return; }
  const p = this.cam.position; let L = this.S.ambient * .9 + this.S.sun * .35;
  for (const l of this.probeLights) { if (!l.visible || l.intensity <= 0 || !l.parent) continue; l.getWorldPosition(_lp); const d = _lp.distanceTo(p), R = l.distance || 30; if (d >= R) continue; L += l.intensity * Math.pow(1 - d / R, l.decay || 1) * (l.isSpotLight ? .5 : 1); }
  const goal = clamp(1.6 / Math.max(.2, L), .45, 1.9); this.adapt += (goal - this.adapt) * Math.min(1, rdt * 1.2); this.post.adapt = this.adapt;
};
G.setLook = function (key) { if (!ENG.LOOKS[key]) return; this.S.look = key; if (this.post) this.post.apply(this.S, false); this.scene.traverse(m => { if (m.material && m.material.needsUpdate !== undefined && !m.material.isShaderMaterial) m.material.needsUpdate = true; }); };
G.fadeTo = function (v, s) { this.fadeGoal = v; this.fadeRate = s > 0 ? 1 / s : 1e9; };
G.setBulletTime = function (on) {
  if (on && (!this.S.bulletTime || this.player.bt < .08 || this.cut)) return; if (on === this.btOn) return;
  this.btOn = on; this.audio.play(on ? 'slowIn' : 'slowOut', { bus: 'ui' });
};
/* world speed: bullet time, scripted slow motion, and the fade */
G.updateTime = function (rdt) {
  const P = this.player;
  if (this.btOn) { P.bt = Math.max(0, P.bt - rdt / Math.max(1, this.S.btLength || 6)); if (P.bt <= 0) this.setBulletTime(false); }
  else P.bt = Math.min(1, P.bt + rdt * .012);
  if (this.slowT > 0) this.slowT = Math.max(0, this.slowT - rdt);
  const goal = (this.btOn || this.slowT > 0) ? clamp(this.S.btScale || .3, .05, 1) : 1;
  this.ts += (goal - this.ts) * Math.min(1, rdt * 7); if (Math.abs(goal - this.ts) < .002) this.ts = goal;
  this.audio.timeRate = .45 + .55 * this.ts; if (this.updateExposure) this.updateExposure(rdt);
  if (this.post) this.post.slowmo = clamp((1 - this.ts) / .7, 0, 1);
  if (this.fadeGoal != null) { const f = this.post ? this.post.fade : 0, nf = f + clamp(this.fadeGoal - f, -this.fadeRate * rdt, this.fadeRate * rdt); if (this.post && this.post.on) this.post.fade = nf; else if (this.fadeEl) { this.fadeEl.style.transition = 'none'; this.fadeEl.style.opacity = nf; if (this.post) this.post.fade = nf; } }
};
/* visible bullets: the hit is decided when fired, then lands when the round arrives */
G.fireBullet = function (from, to, onHit, enemy) {
  const dir = to.clone().sub(from), dist = dir.length(); dir.normalize();
  if (dist < 1.2) { onHit(); return; }
  const m = new THREE.Mesh(this.bulletGeo, enemy ? this.enemyBulletMat : this.bulletMat); m.position.copy(from); m.lookAt(from.clone().add(dir)); this.scene.add(m);
  this.bullets.push({ from: from.clone(), dir, dist, t: 0, onHit, m });
};
G.updateBullets = function (dt) {
  const v = 640 * (this.ts < .95 ? .14 : 1);
  for (let i = this.bullets.length - 1; i >= 0; i--) {
    const b = this.bullets[i]; b.t += dt * v; const p = Math.min(b.t, b.dist);
    b.m.position.copy(b.from).addScaledVector(b.dir, p); b.m.scale.z = Math.max(.05, Math.min(this.ts < .95 ? 1.2 : 3, p));
    if (b.t >= b.dist) { this.scene.remove(b.m); this.bullets.splice(i, 1); try { b.onHit(); } catch (e) { console.warn(e); } }
  }
};
G.ejectShell = function () {
  if (this.S.shells === false || this.S.camera !== 'fps' || !this.vm) return;
  /* casings are 1.4 cm across: a rigid body would tunnel through floors, so they fly ballistically and bounce off the ground found by raycast */
  this.vm.updateMatrixWorld(true); const m = new THREE.Mesh(this.shellGeo, this.shellMat); m.castShadow = true; const p = this.vm.localToWorld(new THREE.Vector3(.05, .04, -.12)); m.position.copy(p); this.scene.add(m);
  const rt = new THREE.Vector3(1, 0, 0).applyQuaternion(this.cam.quaternion);
  const vel = rt.multiplyScalar(rand(1.6, 2.4)).add(new THREE.Vector3(0, rand(1.4, 2.2), 0)).add(this.player.vel.clone().multiplyScalar(.8));
  (this.shellList = this.shellList || []).push({ m, v: vel, spin: new THREE.Vector3(rand(-18, 18), rand(-18, 18), rand(-18, 18)), rest: false, t: 9 });
  if (this.shellList.length > 40) { const o = this.shellList.shift(); this.scene.remove(o.m); }
};
G.updateShells = function (dt) {
  if (!this.shellList) return;
  for (let i = this.shellList.length - 1; i >= 0; i--) {
    const s = this.shellList[i]; s.t -= dt; if (s.t <= 0) { this.scene.remove(s.m); this.shellList.splice(i, 1); continue; } if (s.rest) continue;
    s.v.y -= this.S.gravity * dt; const p = s.m.position, step = s.v.clone().multiplyScalar(dt), g = this.groundAt(p.x + step.x, p.y + .05, p.z + step.z, Math.max(.1, -step.y + .06));
    p.add(step); s.m.rotation.x += s.spin.x * dt; s.m.rotation.y += s.spin.y * dt; s.m.rotation.z += s.spin.z * dt;
    if (g !== null && p.y <= g + .007 && s.v.y < 0) { p.y = g + .007; if (s.v.y < -1.2 && Math.random() < .7) this.audio.play('shell', { pos: p, radius: 12, rate: rand(.85, 1.25) }); s.v.y = -s.v.y * .32; s.v.x *= .55; s.v.z *= .55; s.spin.multiplyScalar(.5); if (Math.abs(s.v.y) < .35 && Math.hypot(s.v.x, s.v.z) < .2) { s.rest = true; s.m.rotation.set(Math.PI / 2, s.m.rotation.y, 0); } }
    if (p.y < -60) { this.scene.remove(s.m); this.shellList.splice(i, 1); }
  }
};
G.bloodDecal = function (point, dir) {
  if (this.S.blood === false) return; _ray.set(point, dir); _ray.near = 0; _ray.far = 2.6; const h = _ray.intersectObjects(this.sightBlock, false)[0]; if (!h) return;
  const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : dir.clone().negate();
  const m = new THREE.Mesh(new THREE.CircleGeometry(rand(.12, .3), 9), new THREE.MeshBasicMaterial({ color: '#4a0b0b', transparent: true, opacity: .82, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  m.position.copy(h.point).addScaledVector(n, .006); m.lookAt(h.point.clone().add(n)); m.rotation.z = Math.random() * 6; m.scale.y = rand(.6, 1.4); this.scene.add(m); this.decals.push(m); if (this.decals.length > 80) this.scene.remove(this.decals.shift());
};
const _ray = new THREE.Raycaster();

/* ---------------- ragdolls ---------------- */
const MASS = { head: 5, body: 28, armR: 4.5, armL: 4.5, legR: 9, legL: 9 };
const JOINT = { head: [.55, .45], armR: [1.35, .7], armL: [1.35, .7], legR: [.95, .35], legL: [.95, .35] };
G.makeRagdoll = function (enemy, dir, force) {
  if (this.S.ragdolls === false) return false; const root = enemy.root, parts = root.userData.parts; if (!parts || !root.visible) return false;
  root.updateMatrixWorld(true); const W = this.world, rd = { parts: [], bodies: {}, joints: [], t: 0, frozen: false }, wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3();
  ENG.SKIN_PARTS.forEach(SP => {
    const piv = parts[SP.n], base = piv.children[0], outer = piv.children[1]; base.matrixWorld.decompose(wp, wq, ws);
    const [w, h, d] = SP.sz, body = new CANNON.Body({ mass: MASS[SP.n], linearDamping: .06, angularDamping: .45 });
    body.addShape(new CANNON.Box(new CANNON.Vec3(w * ws.x / 2, h * ws.y / 2, d * ws.z / 2))); body.position.set(wp.x, wp.y, wp.z); body.quaternion.set(wq.x, wq.y, wq.z, wq.w);
    body.collisionFilterGroup = 2; body.collisionFilterMask = 1; body.allowSleep = true; body.sleepSpeedLimit = .15; body.sleepTimeLimit = .8; W.addBody(body);
    const g = new THREE.Group(); [base, outer].forEach(src => { if (!src) return; const c = new THREE.Mesh(src.geometry, src.material); c.scale.copy(ws); c.castShadow = true; c.userData.rag = { rd, body }; c.userData.part = SP.n; g.add(c); });
    g.position.copy(wp); g.quaternion.copy(wq); this.scene.add(g); this.targets.push(g); rd.parts.push({ g, body, n: SP.n }); rd.bodies[SP.n] = body;
  });
  const torso = rd.bodies.body, pivotW = n => parts[n].getWorldPosition(new THREE.Vector3());
  ['head', 'armR', 'armL', 'legR', 'legL'].forEach(n => {
    const b = rd.bodies[n], p = pivotW(n), wv = new CANNON.Vec3(p.x, p.y, p.z), up = b.vectorToWorldFrame(new CANNON.Vec3(0, 1, 0));
    const c = new CANNON.ConeTwistConstraint(b, torso, { pivotA: b.pointToLocalFrame(wv), pivotB: torso.pointToLocalFrame(wv), axisA: new CANNON.Vec3(0, 1, 0), axisB: torso.vectorToLocalFrame(up), angle: JOINT[n][0], twistAngle: JOINT[n][1], maxForce: 1e6 });
    W.addConstraint(c); rd.joints.push(c);
  });
  root.visible = false;
  if (dir) { const f = force || 26, imp = new CANNON.Vec3(dir.x * f, Math.max(.15, dir.y) * f * .5 + 3, dir.z * f); torso.applyImpulse(imp, torso.position); rd.bodies.head.applyImpulse(new CANNON.Vec3(imp.x * .25, imp.y * .2, imp.z * .25), rd.bodies.head.position); }
  enemy.ragdoll = rd; this.ragdolls.push(rd);
  const live = this.ragdolls.filter(r => !r.frozen); if (live.length > 6) this.freezeRagdoll(live[0]);
  this.player.bt = Math.min(1, (this.player.bt || 0) + .22);
  return true;
};
G.freezeRagdoll = function (rd) { if (rd.frozen) return; rd.frozen = true; rd.joints.forEach(c => this.world.removeConstraint(c)); rd.parts.forEach(p => this.world.removeBody(p.body)); };
G.updateRagdolls = function (dt) {
  this.ragdolls.forEach(rd => {
    if (rd.frozen) return; rd.t += dt; let asleep = true;
    rd.parts.forEach(p => { const b = p.body; p.g.position.set(b.position.x, b.position.y, b.position.z); p.g.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w); if (b.sleepState !== CANNON.Body.SLEEPING) asleep = false; if (b.position.y < -60) asleep = true; });
    if ((asleep && rd.t > 2) || rd.t > 25) this.freezeRagdoll(rd);
  });
};
G.ragdollImpulse = function (pos, R, D) {
  /* a velocity kick (not an impulse) so light limbs and the heavy torso fly together */
  this.ragdolls.forEach(rd => { if (rd.frozen) return; const t = rd.bodies.body.position, d = pos.distanceTo(new THREE.Vector3(t.x, t.y, t.z)); if (d > R) return; const k = (1 - d / R) * D * .075; const v = new THREE.Vector3(t.x - pos.x, Math.max(0, t.y - pos.y) + 1.1, t.z - pos.z).normalize(); rd.parts.forEach(p => { const b = p.body; b.wakeUp(); b.velocity.x += v.x * k; b.velocity.y += v.y * k; b.velocity.z += v.z * k; b.angularVelocity.x += rand(-3, 3); b.angularVelocity.z += rand(-3, 3); }); });
};

/* ---------------- rain with roof occlusion ---------------- */
class Rain {
  constructor(g, amount) {
    this.g = g; const N = Math.round(400 + 2600 * clamp(amount, 0, 1)); this.N = N; this.box = 26; this.top = 14;
    const pos = new Float32Array(N * 6), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); this.pos = pos; this.geo = geo; this.drops = new Float32Array(N * 3); this.speed = new Float32Array(N);
    this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#9fb2c4', transparent: true, opacity: .42, depthWrite: false })); this.lines.frustumCulled = false; g.scene.add(this.lines);
    this.roof(); const c = g.player.pos; for (let i = 0; i < N; i++) this.spawn(i, c, true);
    this.snd = g.audio.play('preset:rain', { loop: true, bus: 'ambient', volume: .55 * amount + .2 });
  }
  roof() {
    /* one downward ray per square metre, once: anything with a ceiling above head height stays dry */
    const b = new THREE.Box3(); this.g.walk.forEach(m => b.expandByObject(m)); if (b.isEmpty()) { this.grid = null; return; }
    const x0 = Math.floor(b.min.x) - 1, z0 = Math.floor(b.min.z) - 1, nx = Math.min(160, Math.ceil(b.max.x - x0) + 2), nz = Math.min(160, Math.ceil(b.max.z - z0) + 2);
    const grid = new Float32Array(nx * nz).fill(-1e9), rc = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), o = new THREE.Vector3();
    for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) { o.set(x0 + x + .5, b.max.y + 5, z0 + z + .5); rc.set(o, down); rc.far = b.max.y - b.min.y + 10; const hits = rc.intersectObjects(this.g.walk, false); if (hits.length > 1) grid[z * nx + x] = hits[0].point.y; else if (hits.length === 1 && hits[0].point.y > b.min.y + 2.2) grid[z * nx + x] = hits[0].point.y; }
    this.grid = { grid, x0, z0, nx, nz };
  }
  roofAt(x, z) { const R = this.grid; if (!R) return -1e9; const gx = Math.floor(x - R.x0), gz = Math.floor(z - R.z0); if (gx < 0 || gz < 0 || gx >= R.nx || gz >= R.nz) return -1e9; return R.grid[gz * R.nx + gx]; }
  spawn(i, c, any) { const d = this.drops; d[i * 3] = c.x + rand(-1, 1) * this.box; d[i * 3 + 2] = c.z + rand(-1, 1) * this.box; d[i * 3 + 1] = any ? c.y + rand(-4, this.top) : c.y + this.top + rand(0, 4); this.speed[i] = rand(17, 24); }
  update(dt) {
    const c = this.g.player.pos, d = this.drops, p = this.pos, wind = .18, len = .55 * (this.g.ts < .95 ? .55 : 1);
    for (let i = 0; i < this.N; i++) {
      d[i * 3 + 1] -= this.speed[i] * dt; d[i * 3] += wind * this.speed[i] * dt * .1;
      const x = d[i * 3], y = d[i * 3 + 1], z = d[i * 3 + 2];
      if (y < c.y - 4 || Math.abs(x - c.x) > this.box || Math.abs(z - c.z) > this.box || y < this.roofAt(x, z)) this.spawn(i, c, false);
      const j = i * 6; p[j] = d[i * 3]; p[j + 1] = d[i * 3 + 1]; p[j + 2] = d[i * 3 + 2]; p[j + 3] = d[i * 3] - wind * len * .3; p[j + 4] = d[i * 3 + 1] + len; p[j + 5] = d[i * 3 + 2];
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}
ENG.Rain = Rain;
})();
