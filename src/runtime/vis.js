/* VIRA VISUALS 2: light from the sky on every surface, relief on every texture, shadows that follow the player,
   light shafts and glows on lamps, wet ground with splashes and mist in rain, and lightning in heavy storms. */
(function () {
'use strict';
const ENG = window.ENG, V = ENG.VIS2 = {}, D2R = Math.PI / 180, QL = { low: 0, medium: 1, high: 2, ultra: 3 };
const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _d = new THREE.Vector3(), _c = new THREE.Vector3(), _f = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _down = new THREE.Vector3(0, -1, 0), _up = new THREE.Vector3(0, 1, 0), _col = new THREE.Color();
/* ---------- relief: every procedural texture gets a matching normal map ---------- */
V.nm = new Map();
V.NM = { brick: -1.4, bricks: -1.4, tiles: 1.2, tile: 1.2, cobble: 1.4, cobblestone: 1.4, stone: 1.2, rock: 1.2, planks: .9, wood: .7, concrete: .55, plaster: .4, metal: .35, grate: 1.2, panel: .8, dirt: .7, grass: .5, sand: .4, asphalt: .5, carpet: .3, hazard: 0, checker: 0, stripes: 0, grid: .6 };
V.normalFrom = tex => {
  if (!tex || !tex.image || !tex.image.getContext) return null; if (V.nm.has(tex.uuid)) return V.nm.get(tex.uuid); const c = tex.image, W = c.width, H = c.height; if (!W || !H) return null;
  let src; try { src = c.getContext('2d').getImageData(0, 0, W, H).data; } catch (e) { return null; }
  const L = new Float32Array(W * H); for (let i = 0; i < W * H; i++) L[i] = (src[i * 4] * .3 + src[i * 4 + 1] * .59 + src[i * 4 + 2] * .11) / 255;
  const o = document.createElement('canvas'); o.width = W; o.height = H; const g = o.getContext('2d'), im = g.createImageData(W, H), s = 3 * W / 256, l = (a, b) => L[((b + H) % H) * W + ((a + W) % W)];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = l(x + 1, y - 1) + 2 * l(x + 1, y) + l(x + 1, y + 1) - l(x - 1, y - 1) - 2 * l(x - 1, y) - l(x - 1, y + 1), dy = l(x - 1, y + 1) + 2 * l(x, y + 1) + l(x + 1, y + 1) - l(x - 1, y - 1) - 2 * l(x, y - 1) - l(x + 1, y - 1);
    const nx = -dx * s, ny = dy * s, n = Math.hypot(nx, ny, 1), q = (y * W + x) * 4; im.data[q] = (nx / n * .5 + .5) * 255; im.data[q + 1] = (ny / n * .5 + .5) * 255; im.data[q + 2] = (1 / n * .5 + .5) * 255; im.data[q + 3] = 255;
  }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(o); t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.anisotropy = tex.anisotropy; V.nm.set(tex.uuid, t); return t;
};
V.relief = (m, kind) => { try { if (!m || m.normalMap || !m.map || !kind || typeof kind !== 'string' || kind.indexOf('img:') === 0) return m; const k = V.NM[kind] != null ? V.NM[kind] : .8; if (!k) return m; const nm = V.normalFrom(m.map); if (nm) { m.normalMap = nm; m.normalScale.set(k, k); m.needsUpdate = true; } } catch (e) { } return m; };
{ const f = ENG.mat; ENG.mat = function (o, project, extra) { return V.relief(f(o, project, extra), o && o.props && o.props.texture); }; }
if (ENG.partMaterial) { const f = ENG.partMaterial; ENG.partMaterial = function (m, kind, project) { return V.relief(f(m, kind, project), m && m.tex); }; }
/* ---------- light from the sky: an environment map built from the level's own sky ---------- */
V.envFor = (renderer, S) => {
  /* six tiny painted faces with mipmaps: the same fill light and glossy reflections as a filtered map, with almost no GPU work */
  const key = [S.sky, S.skyLight, S.groundLight, S.sunColor, S.sun, S.ambient, S.sunAngle, S.sunYaw].join('|'); if (V.env && V.envKey === key) return V.env;
  const amb = Math.max(.24, +S.ambient || .5), top = new THREE.Color(S.skyLight || '#dfe8f0').multiplyScalar(amb), mid = new THREE.Color(S.sky || '#8fb0cf').multiplyScalar(amb * .75), bot = new THREE.Color(S.groundLight || '#3a3530').multiplyScalar(amb * .55);
  const el = (S.sunAngle || 45) * D2R, az = (S.sunYaw || 0) * D2R, sd = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)), sc = new THREE.Color(S.sunColor || '#fff4e0'), sk = Math.min(3, Math.max(0, +S.sun || 0)), N = 32, dir = new THREE.Vector3(), out = new THREE.Color();
  const face = f => { const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), im = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const s = 2 * (x + .5) / N - 1, t = 2 * (y + .5) / N - 1; [[1, -t, -s], [-1, -t, s], [s, 1, t], [s, -1, -t], [s, -t, 1], [-s, -t, -1]][f].forEach((v, i) => dir.setComponent(i, v)); dir.normalize();
      const yy = dir.y; out.copy(mid).lerp(yy > 0 ? top : bot, Math.pow(Math.abs(yy), yy > 0 ? .55 : .45)); if (sk > 0) { const d = Math.max(0, dir.dot(sd)), k = sk * (Math.pow(d, 64) * 2.5 + Math.pow(d, 6) * .12); out.r += sc.r * k; out.g += sc.g * k; out.b += sc.b * k; }
      const q = (y * N + x) * 4; im.data[q] = Math.min(255, out.r * 255); im.data[q + 1] = Math.min(255, out.g * 255); im.data[q + 2] = Math.min(255, out.b * 255); im.data[q + 3] = 255; }
    g.putImageData(im, 0, 0); return c; };
  const tex = new THREE.CubeTexture([0, 1, 2, 3, 4, 5].map(face)); tex.needsUpdate = true; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  if (V.env) V.env.dispose(); V.env = tex; V.envKey = key; return tex;
};
/* older matte materials become physically based so they pick up the sky light too */
V.upCache = new WeakMap();
V.upgrade = scene => {
  const up = m => { if (!m || !(m.isMeshLambertMaterial || m.isMeshPhongMaterial) || Object.prototype.hasOwnProperty.call(m, 'onBeforeCompile') || m.userData.keep) return m; if (V.upCache.has(m)) return V.upCache.get(m);
    const s = new THREE.MeshStandardMaterial({ color: m.color, map: m.map, emissive: m.emissive, emissiveMap: m.emissiveMap, emissiveIntensity: m.emissiveIntensity, transparent: m.transparent, opacity: m.opacity, side: m.side, vertexColors: m.vertexColors, skinning: m.skinning, morphTargets: m.morphTargets, alphaTest: m.alphaTest, depthWrite: m.depthWrite, flatShading: m.flatShading, fog: m.fog, roughness: m.isMeshPhongMaterial ? Math.max(.25, 1 - (m.shininess || 30) / 110) : .86, metalness: 0 }); s.shadowSide = m.shadowSide;
    s.name = m.name; V.upCache.set(m, s); return s; };
  scene.traverse(n => { if (!n.isMesh || n.isInstancedMesh || !n.material) return; n.material = Array.isArray(n.material) ? n.material.map(up) : up(n.material); });
};
/* ---------- light shafts and glows ---------- */
V.glowTex = () => V._gt || (V._gt = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.16, 'rgba(255,255,255,.6)'); gr.addColorStop(.42, 'rgba(255,255,255,.13)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })());
const SHAFT_V = 'uniform float uLen; varying float vT; varying vec3 vN; varying vec3 vW; void main(){ vT = clamp(-position.y / uLen, 0.0, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }';
const SHAFT_F = 'uniform vec3 uColor; uniform float uI; varying float vT; varying vec3 vN; varying vec3 vW; void main(){ vec3 vv = normalize(cameraPosition - vW); float edge = pow(abs(dot(normalize(vN), vv)), 1.5); float fall = pow(1.0 - vT, 1.7) * smoothstep(0.0, .06, vT); float nearCam = smoothstep(.5, 2.5, distance(cameraPosition, vW)); float a = edge * fall * nearCam * uI; gl_FragColor = vec4(uColor, a); }';
const shown = o => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
V.dress = (g, L) => {
  const E = { L, base: Math.max(.5, L.intensity || 0, (L.userData && L.userData.baseI) || 0) };
  const shS = L.userData.shaft == null ? 1 : +L.userData.shaft, glS = +L.userData.glow || 0; E.sh = shS; E.gl = glS;
  if (L.isSpotLight && shS > 0) { const len = Math.min(L.distance || 14, 14), geo = new THREE.ConeGeometry(Math.tan(L.angle) * len, len, 32, 1, true); geo.translate(0, -len / 2, 0);
    const cone = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { uColor: { value: L.color.clone() }, uI: { value: 0 }, uLen: { value: len } }, vertexShader: SHAFT_V, fragmentShader: SHAFT_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    cone.raycast = () => { }; cone.renderOrder = 5; cone.frustumCulled = false; g.scene.add(cone); E.cone = cone; }
  if (glS > 0) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: V.glowTex(), color: L.color.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar((L.isSpotLight ? 1 : .8) * Math.max(.5, glS)); sp.raycast = () => { }; g.scene.add(sp); E.glow = sp; }
  g.vis.lights.push(E);
};
V.updateLights = g => {
  const v = g.vis, fogD = g.scene.fog && g.scene.fog.density ? g.scene.fog.density : 0, dens = .1 + .32 * v.rainA + Math.min(.4, fogD * 14);
  v.lights.forEach(E => { const L = E.L, on = shown(L), r = on ? Math.max(0, Math.min(1.6, L.intensity / E.base)) : 0; L.getWorldPosition(_p);
    if (E.cone) { L.target.getWorldPosition(_t); _d.copy(_t).sub(_p).normalize(); E.cone.position.copy(_p); E.cone.quaternion.setFromUnitVectors(_down, _d); E.cone.material.uniforms.uI.value = r * dens * .55 * E.sh; E.cone.material.uniforms.uColor.value.copy(L.color); E.cone.visible = r > .01; if (E.glow) E.glow.position.copy(_p).addScaledVector(_d, .14); }
    else if (E.glow) E.glow.position.copy(_p);
    if (E.glow) { E.glow.material.opacity = Math.min(1, r) * .85 * Math.min(1, E.gl); E.glow.material.color.copy(L.color); E.glow.visible = r > .01; } });
};
/* ---------- the sun's shadow box follows the camera, snapped so it does not shimmer ---------- */
V.followSun = g => {
  const v = g.vis, sun = g.sun; if (!v.sunDir || !sun || !sun.castShadow) return; const R = v.shR, cam = g.cam; cam.getWorldPosition(_c); _f.set(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(_q)); _f.y = 0; if (_f.lengthSq() > 1e-6) _c.addScaledVector(_f.normalize(), R * .45);
  const Ld = v.sunDir, r = _s.copy(_up).cross(Ld); if (r.lengthSq() < 1e-6) r.set(1, 0, 0); r.normalize(); const u = _t.copy(Ld).cross(r).normalize(), tx = 2 * R / sun.shadow.mapSize.x;
  const a = Math.round(_c.dot(r) / tx) * tx, b = Math.round(_c.dot(u) / tx) * tx, d = _c.dot(Ld); _c.copy(r).multiplyScalar(a).addScaledVector(u, b).addScaledVector(Ld, d);
  sun.target.position.copy(_c); sun.position.copy(_c).addScaledVector(Ld, 110); sun.target.updateMatrixWorld();
};
/* ---------- rain: wet surfaces, splashes, mist, lightning ---------- */
V.wet = (g, a) => {
  const v = g.vis;
  g.scene.traverse(n => { if (!n.isMesh || !n.material || n.isInstancedMesh || n.isSprite) return; (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => { if (!m.isMeshStandardMaterial || m.userData.wet || m.transparent || m.metalness > .5 || (m.emissive && m.emissive.r + m.emissive.g + m.emissive.b > .3)) return; m.userData.wet = true; m.roughness = Math.max(.08, m.roughness * (1 - .62 * a)); m.color.multiplyScalar(1 - .22 * a); m.envMapIntensity = 1 + 1.3 * a; }); });
  if (g.scene.fog) g.scene.fog.density *= 1 + .5 * a; else if (v.ql >= 1) g.scene.fog = new THREE.FogExp2(g.S.fogColor || g.S.sky || '#556677', .005 + .012 * a);
  if (v.ql >= 1) { const N = [0, 90, 160, 240][v.ql], geo = new THREE.RingGeometry(.035, .06, 14); geo.rotateX(-Math.PI / 2); const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#d6e4f2', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), N); im.frustumCulled = false; im.raycast = () => { };
    _col.setRGB(0, 0, 0); for (let i = 0; i < N; i++) { im.setMatrixAt(i, _m.makeScale(0, 0, 0)); im.setColorAt(i, _col); } g.scene.add(im); v.splash = { im, N, t: new Float32Array(N).fill(1), p: new Float32Array(N * 3), next: 0, acc: 0 }; }
  v.storm = a >= .55 && v.ql >= 1; v.bg = g.scene.background && g.scene.background.isColor ? g.scene.background.clone() : null;
};
V.updateRain = (g, dt) => {
  const v = g.vis, S = v.splash;
  if (S) { g.cam.getWorldPosition(_c); S.acc += dt * (40 + 150 * v.rainA);
    while (S.acc >= 1) { S.acc -= 1; const x = _c.x + (Math.random() * 2 - 1) * 11, z = _c.z + (Math.random() * 2 - 1) * 11, y = g.groundAt(x, _c.y + 4, z, 30); if (y === null) continue; const roof = g.rain && g.rain.roofAt ? g.rain.roofAt(x, z) : -1e9; if (roof > y + .3) continue; const i = S.next; S.next = (S.next + 1) % S.N; S.p[i * 3] = x; S.p[i * 3 + 1] = y + .02; S.p[i * 3 + 2] = z; S.t[i] = 0; }
    for (let i = 0; i < S.N; i++) { if (S.t[i] >= 1) continue; S.t[i] = Math.min(1, S.t[i] + dt / .32); const t = S.t[i], k = t >= 1 ? 0 : .4 + 1.7 * t, b = t >= 1 ? 0 : Math.pow(1 - t, 1.5) * .9; _m.compose(_p.set(S.p[i * 3], S.p[i * 3 + 1], S.p[i * 3 + 2]), _q.identity(), _s.set(k, k, k)); S.im.setMatrixAt(i, _m); S.im.setColorAt(i, _col.setRGB(b, b, b)); }
    S.im.instanceMatrix.needsUpdate = true; S.im.instanceColor.needsUpdate = true; }
  if (v.storm) {
    v.flashT -= dt; if (v.flashT <= 0) { v.flashSeq = .5; v.flashT = 9 + Math.random() * 16; v.thunder = .7 + Math.random() * 2.2; }
    if (v.flashSeq > 0) { v.flashSeq -= dt; const t = .5 - v.flashSeq, k = t < .07 ? 1.6 : (t > .14 && t < .32 ? 1 : 0); if (v.hemi) v.hemi.intensity = v.hemiBase + k * 2.4; if (v.bg) g.scene.background.copy(v.bg).lerp(_col.set('#c9d6ee'), k * .55); if (v.flashSeq <= 0) { if (v.hemi) v.hemi.intensity = v.hemiBase; if (v.bg) g.scene.background.copy(v.bg); } }
    if (v.thunder > 0) { v.thunder -= dt; if (v.thunder <= 0) try { g.audio.play('preset:thunder', { bus: 'ambient', volume: .75 }); } catch (e) { } }
  }
};
if (ENG.SOUND_PRESETS && ENG.SOUND_PRESETS.rain && !ENG.SOUND_PRESETS.thunder) ENG.SOUND_PRESETS.thunder = Object.assign({}, ENG.SOUND_PRESETS.rain, { freq: 110, slide: -.4, attack: .03, sustain: .35, decay: 2.8, loop: false });
/* ---------- wiring into the game ---------- */
V.setup = g => {
  const S = g.S, ql = QL[S.quality] == null ? 2 : QL[S.quality], rainA = S.weather === 'rain' ? Math.max(0, Math.min(1, S.rain == null ? .6 : +S.rain)) : 0;
  g.vis = { ql, rainA, lights: [], splash: null, flashT: 6 + Math.random() * 10, flashSeq: 0, thunder: 0 };
  g.scene.traverse(n => { if (n.isHemisphereLight) { g.vis.hemi = n; n.intensity *= .86; g.vis.hemiBase = n.intensity; } });
  g.scene.environment = V.envFor(g.renderer, S); V.upgrade(g.scene);
  const sun = g.sun, R = [16, 24, 30, 40][ql]; g.vis.shR = R;
  if (sun && sun.castShadow) { sun.shadow.normalBias = .02; sun.shadow.bias = -.0002; const sc = sun.shadow.camera; sc.near = .5; sc.far = 260; sc.left = sc.bottom = -R; sc.right = sc.top = R; sc.updateProjectionMatrix(); g.vis.sunDir = sun.position.clone().sub(sun.target.position).normalize(); }
  g.scene.traverse(n => { if (!(n.isSpotLight || n.isPointLight) || n === g.boom) return; if (n.isSpotLight && n.penumbra < .5) n.penumbra = .55; if (n.castShadow) { n.shadow.normalBias = .025; n.shadow.bias = -.0004; if (n.isSpotLight) { const ms = [512, 1024, 1024, 2048][ql]; if (n.shadow.mapSize.x !== ms) { n.shadow.mapSize.set(ms, ms); if (n.shadow.map) { n.shadow.map.dispose(); n.shadow.map = null; } } } } });
  if (ql >= 1) { const ls = []; g.scene.traverse(n => { if ((n.isSpotLight || n.isPointLight) && n !== g.boom && n !== g.flash && n.parent !== g.cam) ls.push(n); }); ls.forEach(L => V.dress(g, L)); }
  if (rainA > 0) V.wet(g, rainA);
};
const GP = ENG.Game && ENG.Game.prototype;
if (GP && GP.setupCinematic) {
  const prevSetup = GP.setupCinematic; GP.setupCinematic = function () { const r = prevSetup.apply(this, arguments); try { V.setup(this); } catch (e) { console.warn('Vira visuals', e); } return r; };
  const prevStep = GP.step; GP.step = function (dt) { const r = prevStep.apply(this, arguments); const v = this.vis; if (v) { try { V.followSun(this); if (v.lights.length) V.updateLights(this); if (v.rainA > 0) V.updateRain(this, dt || 1 / 60); } catch (e) { } } return r; };
}
})();
