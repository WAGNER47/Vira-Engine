/* VIRA TERRAIN: sculpted heightmap ground with four painted layers, wind-blown grass and scattered trees.
   Heights, paint and grass live in compact byte arrays inside the object, so terrain saves, undoes and exports like anything else. */
(function () {
'use strict';
const ENG = window.ENG, L = ENG.LAND = {}, D2R = Math.PI / 180, _Y = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
/* ---------- noise ---------- */
const hash = (x, z, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
L.noise = (x, z, s) => { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf), a = hash(xi, zi, s), b = hash(xi + 1, zi, s), c = hash(xi, zi + 1, s), d = hash(xi + 1, zi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
L.fbm = (x, z, o, s) => { let t = 0, a = .5, f = 1, n = 0; for (let i = 0; i < (o || 4); i++) { t += L.noise(x * f, z * f, (s || 0) + i * 17) * a; n += a; a *= .5; f *= 2.02; } return t / n; };
L.rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
L.smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/* ---------- compact storage ---------- */
const b64e = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
L.decode = p => {
  const res = Math.max(8, Math.min(256, Math.round(+p.res || 96))), V = res + 1, d = p.data, h = new Float32Array(V * V), sp = new Uint8Array(V * V * 4), gr = new Uint8Array(V * V); let trees = [];
  for (let k = 0; k < V * V; k++) sp[k * 4] = 255;
  if (d && d.res && d.h) {
    const r0 = d.res, V0 = r0 + 1, i16 = new Int16Array(b64d(d.h).buffer), s0 = d.sp ? b64d(d.sp) : null, g0 = d.gr ? b64d(d.gr) : null; trees = (d.trees || []).map(t => t.slice());
    if (r0 === res) { for (let k = 0; k < V * V; k++) h[k] = i16[k] / 100; if (s0 && s0.length === sp.length) sp.set(s0); if (g0 && g0.length === gr.length) gr.set(g0); }
    else for (let iz = 0; iz < V; iz++) for (let ix = 0; ix < V; ix++) {
      const u = ix * r0 / res, v = iz * r0 / res, x0 = Math.min(r0 - 1, Math.floor(u)), z0 = Math.min(r0 - 1, Math.floor(v)), fx = u - x0, fz = v - z0, k = iz * V + ix, i00 = z0 * V0 + x0, i10 = i00 + 1, i01 = i00 + V0, i11 = i01 + 1;
      const bl = (A, a, b, c, e) => (A[a] * (1 - fx) + A[b] * fx) * (1 - fz) + (A[c] * (1 - fx) + A[e] * fx) * fz;
      h[k] = bl(i16, i00, i10, i01, i11) / 100; if (g0) gr[k] = Math.round(bl(g0, i00, i10, i01, i11)); if (s0) for (let c = 0; c < 4; c++) sp[k * 4 + c] = Math.round((s0[i00 * 4 + c] * (1 - fx) + s0[i10 * 4 + c] * fx) * (1 - fz) + (s0[i01 * 4 + c] * (1 - fx) + s0[i11 * 4 + c] * fx) * fz);
    }
  }
  return { res, size: Math.max(8, +p.size || 96), h, sp, gr, trees };
};
L.encode = st => { const V = st.res + 1, i16 = new Int16Array(V * V), r2 = v => Math.round(v * 100) / 100; for (let k = 0; k < V * V; k++) i16[k] = Math.max(-32767, Math.min(32767, Math.round(st.h[k] * 100))); return { v: 1, res: st.res, h: b64e(new Uint8Array(i16.buffer)), sp: b64e(st.sp), gr: b64e(st.gr), trees: st.trees.map(t => [t[0], r2(t[1]), r2(t[2]), r2(t[3]), r2(t[4])]) }; };
/* ---------- sampling (local metres, exact to the mesh triangles) ---------- */
L.heightAt = (st, x, z) => {
  const N = st.res, V = N + 1, d = st.size / N, half = st.size / 2; let fx = (x + half) / d, fz = (z + half) / d; if (fx < 0 || fz < 0 || fx > N || fz > N) return null;
  const ix = Math.min(N - 1, Math.floor(fx)), iz = Math.min(N - 1, Math.floor(fz)); fx -= ix; fz -= iz; const H = st.h, a = H[iz * V + ix], b = H[iz * V + ix + 1], c = H[(iz + 1) * V + ix], e = H[(iz + 1) * V + ix + 1];
  return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : e + (c - e) * (1 - fx) + (b - e) * (1 - fz);
};
L.normalAt = (st, x, z, out) => { const e = st.size / st.res * .5, hf = st.size / 2, c = v => Math.max(-hf, Math.min(hf, v)), H = (a, b) => L.heightAt(st, c(a), c(b)) || 0; return (out || new THREE.Vector3()).set(H(x - e, z) - H(x + e, z), 2 * e, H(x, z - e) - H(x, z + e)).normalize(); };
const _inv = new THREE.Matrix4(), _lr = new THREE.Ray(), _box = new THREE.Box3(), _hp = new THREE.Vector3();
L.raycast = function (raycaster, out) {
  const st = this.userData.land; if (!st) return; _inv.copy(this.matrixWorld).invert(); _lr.copy(raycaster.ray).applyMatrix4(_inv); const g = this.geometry; if (!g.boundingBox) g.computeBoundingBox(); _box.copy(g.boundingBox).expandByScalar(.02);
  let t0 = 0; if (!_box.containsPoint(_lr.origin)) { if (!_lr.intersectBox(_box, _hp)) return; t0 = _lr.origin.distanceTo(_hp); }
  const o = _lr.origin, dir = _lr.direction, f = t => { const h = L.heightAt(st, o.x + dir.x * t, o.z + dir.z * t); return h === null ? null : o.y + dir.y * t - h; }, step = st.size / st.res * .45, maxT = t0 + Math.min(raycaster.far + 1, Math.hypot(st.size * 1.5, _box.max.y - _box.min.y) + 2);
  let pt = t0, pf = f(t0); if (pf !== null && pf < 0) return;
  for (let t = t0 + step; t <= maxT + step; t += step) {
    const tt = Math.min(t, maxT), ft = f(tt); if (ft === null) { if (pf !== null) break; pt = tt; continue; }
    if (pf !== null && ft <= 0) { let a = pt, b = tt; for (let i = 0; i < 12; i++) { const m = (a + b) / 2, fm = f(m); if (fm !== null && fm > 0) a = m; else b = m; } const P = _hp.copy(dir).multiplyScalar(b).add(o), W = P.clone().applyMatrix4(this.matrixWorld), dist = raycaster.ray.origin.distanceTo(W); if (dist < raycaster.near || dist > raycaster.far) return; out.push({ distance: dist, point: W, object: this, face: { a: 0, b: 0, c: 0, normal: L.normalAt(st, P.x, P.z), materialIndex: 0 }, faceIndex: 0 }); return; }
    if ((dir.y > 0 && o.y + dir.y * tt > _box.max.y) || (dir.y < 0 && o.y + dir.y * tt < _box.min.y)) break; pt = tt; pf = ft; if (tt >= maxT) break;
  }
};
/* ---------- ground textures: tileable grey detail, tinted per layer ---------- */
L.tex = i => {
  L._tex = L._tex || []; if (L._tex[i]) return L._tex[i]; const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), im = g.createImageData(S, S), r = L.rng(91 + i * 7);
  const tn = (u, v, sc, s) => { const n = (a, b) => L.fbm(a * sc, b * sc, 3, s); return n(u, v) * (1 - u) * (1 - v) + n(u - 1, v) * u * (1 - v) + n(u, v - 1) * (1 - u) * v + n(u - 1, v - 1) * u * v; };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S; let l;
    if (i === 0) l = .8 + (tn(u, v, 8, 3) - .5) * .4 + (r() - .5) * .14;
    else if (i === 1) l = .74 + (tn(u, v, 6, 5) - .5) * .46 + (r() - .5) * .1 - (r() < .01 ? .25 : 0);
    else if (i === 2) l = .72 + (tn(u, v, 4, 7) - .5) * .5 + .11 * Math.sin((v * 14 + tn(u, v, 3, 11) * 6) * Math.PI);
    else l = .86 + (tn(u, v, 10, 13) - .5) * .18 + .05 * Math.sin((u * 9 + v * 4 + tn(u, v, 3, 17) * 2) * 2 * Math.PI) + (r() - .5) * .06;
    const q = (y * S + x) * 4, b = Math.max(0, Math.min(255, Math.round(l * 255))); im.data[q] = im.data[q + 1] = im.data[q + 2] = b; im.data[q + 3] = 255;
  }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return (L._tex[i] = t);
};
L.LAYERS = [['Grass', '#5d8a3b'], ['Dirt', '#7a5b3d'], ['Rock', '#7f8187'], ['Sand', '#cdb88d']];
L.time = { value: 0 };
L.material = p => {
  const m = new THREE.MeshStandardMaterial({ map: L.tex(0), roughness: .96, metalness: 0 }), cols = L.LAYERS.map((l, i) => new THREE.Color(p['c' + i] || l[1]));
  m.onBeforeCompile = sh => {
    sh.uniforms.tL1 = { value: L.tex(1) }; sh.uniforms.tL2 = { value: L.tex(2) }; sh.uniforms.tL3 = { value: L.tex(3) }; cols.forEach((c, i) => sh.uniforms['uC' + i] = { value: c });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 splat;\nvarying vec4 vSplat;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tL1, tL2, tL3;\nuniform vec3 uC0, uC1, uC2, uC3;\nvarying vec4 vSplat;').replace('#include <map_fragment>',
      'vec4 sw = vSplat / max(vSplat.x + vSplat.y + vSplat.z + vSplat.w, 1e-3);\nvec3 tcol = texture2D(map, vUv).rgb * uC0 * sw.x + texture2D(tL1, vUv * 1.31).rgb * uC1 * sw.y + texture2D(tL2, vUv * .57).rgb * uC2 * sw.z + texture2D(tL3, vUv * 1.73).rgb * uC3 * sw.w;\ndiffuseColor.rgb *= tcol;');
  };
  m.customProgramCacheKey = () => 'vira-land'; return m;
};
const sway = (m, key, amount) => { m.onBeforeCompile = sh => { sh.uniforms.uTime = L.time; sh.uniforms.uWind = m.userData.wind; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;').replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nvec3 ip = vec3(instanceMatrix[3]);\n#else\nvec3 ip = vec3(0.0);\n#endif\n' + amount); }; m.customProgramCacheKey = () => key; return m; };
L.grassMat = p => { const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.FrontSide, color: new THREE.Color(p.grassColor || '#7fae46') }); m.userData.wind = { value: p.wind == null ? 1 : +p.wind }; return sway(m, 'vira-grass', 'float gk = position.y * position.y; float gs = sin(uTime * 1.7 + ip.x * .35 + ip.z * .27) + .5 * sin(uTime * 3.1 + ip.x * .9 + ip.z * .4);\ntransformed.x += gs * .13 * gk * uWind; transformed.z += cos(uTime * 1.3 + ip.z * .4 + ip.x * .1) * .07 * gk * uWind;'); };
L.treeMat = p => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .92 }); m.userData.wind = { value: p.wind == null ? 1 : +p.wind }; return sway(m, 'vira-tree', 'float tk = max(position.y - 1.3, 0.0);\ntransformed.x += sin(uTime * 1.1 + ip.x * .3 + ip.z * .2) * .028 * tk * uWind; transformed.z += cos(uTime * .9 + ip.z * .3) * .018 * tk * uWind;'); };
/* ---------- grass clumps and low-poly trees ---------- */
L.grassGeo = () => {
  if (L._gg) return L._gg; const P = [], C = [], N = [], r = L.rng(7);
  for (let b = 0; b < 7; b++) { const a = r() * 6.283, rad = r() * .15, x = Math.cos(a) * rad, z = Math.sin(a) * rad, w = .05 + r() * .035, an = r() * Math.PI, ca = Math.cos(an) * w, sa = Math.sin(an) * w, hg = .62 + r() * .5, ln = (r() - .5) * .3, tx = x + Math.cos(a) * ln, tz = z + Math.sin(a) * ln, lo = .32 + r() * .08;
    P.push(x - ca, 0, z - sa, x + ca, 0, z + sa, tx, hg, tz, x - ca, 0, z - sa, tx, hg, tz, x + ca, 0, z + sa); C.push(lo, lo, lo, lo, lo, lo, 1, 1, 1, lo, lo, lo, 1, 1, 1, lo, lo, lo); for (let q = 0; q < 6; q++) N.push(0, 1, 0); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.computeBoundingSphere(); return (L._gg = g);
};
const M4 = (x, y, z, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx || 1, sy || sx || 1, sz || sx || 1));
const Cy = (a, b, hh, n) => new THREE.CylinderGeometry(a, b, hh, n), Co = (r, hh, n) => new THREE.ConeGeometry(r, hh, n), Ic = r => new THREE.IcosahedronGeometry(r, 0), Do = r => new THREE.DodecahedronGeometry(r, 0);
L.TREES = [
  { id: 'pine', label: 'Pine', col: { r: .22, h: 3 }, parts: () => [[Cy(.11, .17, 1.4, 6), '#5a3d26', M4(0, .7, 0)], [Co(1.15, 1.7, 7), '#2f5a2e', M4(0, 1.9, 0)], [Co(.9, 1.5, 7), '#35683a', M4(0, 2.7, 0)], [Co(.6, 1.3, 7), '#3c7442', M4(0, 3.45, 0)]] },
  { id: 'oak', label: 'Oak', col: { r: .26, h: 3 }, parts: () => [[Cy(.15, .24, 2, 6), '#5e4330', M4(0, 1, 0)], [Ic(1.25), '#4f7d33', M4(0, 2.75, 0, 1, .85, 1)], [Ic(.95), '#5b8c3b', M4(.75, 2.35, .35)], [Ic(.9), '#47722e', M4(-.7, 2.45, -.3)]] },
  { id: 'birch', label: 'Birch', col: { r: .16, h: 3 }, parts: () => [[Cy(.09, .12, 2.8, 6), '#e6e1d6', M4(0, 1.4, 0)], [Ic(.85), '#8fb85a', M4(0, 3.15, 0, 1, 1.2, 1)], [Ic(.6), '#9cc565', M4(.35, 2.6, .2)]] },
  { id: 'bush', label: 'Bush', col: null, parts: () => [[Ic(.65), '#4a7a32', M4(0, .45, 0, 1, .8, 1)], [Ic(.5), '#548a39', M4(.5, .35, .2)], [Ic(.48), '#43702d', M4(-.42, .33, -.28)]] },
  { id: 'rock', label: 'Rock', col: { r: .7, h: .9 }, parts: () => [[Do(.8), '#7c7e83', M4(0, .25, 0, 1, .62, .9)], [Do(.45), '#8a8c91', M4(.6, .12, .35, 1, .6, 1)]] }
];
L.treeGeo = i => {
  L._tg = L._tg || []; if (L._tg[i]) return L._tg[i]; const P = [], C = [];
  L.TREES[i].parts().forEach(([g0, col, m]) => { const g = g0.index ? g0.toNonIndexed() : g0; g.applyMatrix4(m); const a = g.attributes.position.array, c = new THREE.Color(col); for (let j = 0; j < a.length; j++) P.push(a[j]); for (let j = 0; j < a.length / 3; j++) C.push(c.r, c.g, c.b); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals(); g.computeBoundingSphere(); return (L._tg[i] = g);
};
L.CH = 16;
L.buildGrass = (st, only) => {
  const grp = st.grassGrp, N = st.res, V = N + 1, d = st.size / N, half = st.size / 2, nc = Math.ceil(st.size / L.CH), per = Math.max(0, +st.p.grassDensity || 0) * d * d, hgt = +st.p.grassHeight || .6, col = new THREE.Color(); st.gchunks = st.gchunks || {};
  for (let cz = 0; cz < nc; cz++) for (let cx = 0; cx < nc; cx++) {
    const key = cx + ',' + cz; if (only && !only.has(key)) continue; const old = st.gchunks[key]; if (old) { grp.remove(old); if (old.dispose) old.dispose(); delete st.gchunks[key]; }
    if (per <= 0) continue; const x0 = cx * L.CH, z0 = cz * L.CH, ix0 = Math.max(0, Math.ceil(x0 / d - .5)), ix1 = Math.min(N, Math.ceil((x0 + L.CH) / d - .5)), iz0 = Math.max(0, Math.ceil(z0 / d - .5)), iz1 = Math.min(N, Math.ceil((z0 + L.CH) / d - .5)), arr = [], cl = []; let ys = 0;
    for (let iz = iz0; iz < iz1; iz++) for (let ix = ix0; ix < ix1; ix++) {
      const k = iz * V + ix, G = st.gr, dens = (G[k] + G[k + 1] + G[k + V] + G[k + V + 1]) / 1020; if (dens < .02) continue; const S = st.sp, rock = (S[k * 4 + 2] + S[(k + 1) * 4 + 2] + S[(k + V) * 4 + 2] + S[(k + V + 1) * 4 + 2]) / 1020; if (rock > .55) continue;
      const R = L.rng(k * 7919 + 13), cnt = Math.floor(per * dens + R());
      for (let j = 0; j < cnt; j++) { const x = -half + (ix + R()) * d, z = -half + (iz + R()) * d, y = L.heightAt(st, x, z) || 0, s = hgt * (.7 + R() * .6); _q.setFromAxisAngle(_Y, R() * 6.283); _m.compose(_v.set(x, y - .02, z), _q, _s.set(s * (.8 + R() * .4), s, s * (.8 + R() * .4))); arr.push(..._m.elements); const vr = .82 + R() * .3; cl.push(vr, vr * (.96 + R() * .08), vr * .92); ys += y; }
    }
    const n = arr.length / 16; if (!n) continue; const im = new THREE.InstancedMesh(L.grassGeo(), st.grassMat, n); im.instanceMatrix.array.set(arr); im.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < n; i++) im.setColorAt(i, col.setRGB(cl[i * 3], cl[i * 3 + 1], cl[i * 3 + 2])); im.instanceColor.needsUpdate = true;
    im.frustumCulled = false; im.raycast = () => { }; im.receiveShadow = true; im.userData.c = [x0 - half + L.CH / 2, ys / n, z0 - half + L.CH / 2]; grp.add(im); st.gchunks[key] = im;
  }
};
L.buildTrees = st => {
  const grp = st.treeGrp; grp.children.slice().forEach(c => { grp.remove(c); if (c.dispose) c.dispose(); }); const by = L.TREES.map(() => []), col = new THREE.Color(); st.trees.forEach(t => { if (by[t[0]]) by[t[0]].push(t); });
  by.forEach((list, i) => { if (!list.length) return; const im = new THREE.InstancedMesh(L.treeGeo(i), st.treeMat, list.length); list.forEach((t, k) => { const y = L.heightAt(st, t[1], t[2]) || 0; _q.setFromAxisAngle(_Y, t[4]); _m.compose(_v.set(t[1], y - .06, t[2]), _q, _s.set(t[3], t[3], t[3])); im.setMatrixAt(k, _m); const vr = .86 + hash(Math.round(t[1] * 10), Math.round(t[2] * 10), i) * .26; im.setColorAt(k, col.setRGB(vr, vr, vr)); }); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.castShadow = im.receiveShadow = true; im.frustumCulled = false; im.userData.treeType = i; grp.add(im); });
};
L.build = p => {
  const st = L.decode(p), N = st.res, V = N + 1, d = st.size / N, half = st.size / 2, tile = Math.max(.25, +p.tile || 4), pos = new Float32Array(V * V * 3), uv = new Float32Array(V * V * 2), idx = new (V * V > 65535 ? Uint32Array : Uint16Array)(N * N * 6);
  for (let iz = 0; iz < V; iz++) for (let ix = 0; ix < V; ix++) { const k = iz * V + ix, x = -half + ix * d, z = -half + iz * d; pos[k * 3] = x; pos[k * 3 + 1] = st.h[k]; pos[k * 3 + 2] = z; uv[k * 2] = x / tile; uv[k * 2 + 1] = z / tile; }
  let q = 0; for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) { const a = iz * V + ix, b = a + 1, c = a + V, e = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = e; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('splat', new THREE.BufferAttribute(st.sp, 4, true)); geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, L.material(p)), G = new THREE.Group(), grass = new THREE.Group(), trees = new THREE.Group(); mesh.receiveShadow = mesh.castShadow = true; mesh.userData.land = st; mesh.raycast = L.raycast; if (p.collide !== false) mesh.userData.walk = true;
  Object.assign(st, { p, mesh, grassGrp: grass, treeGrp: trees, grassMat: L.grassMat(p), treeMat: L.treeMat(p) }); G.add(mesh, grass, trees); L.buildGrass(st); L.buildTrees(st);
  mesh.onBeforeRender = (r, s, cam) => { L.time.value = performance.now() / 1000; const dist = (+p.grassDist || 70) + 12; for (const k in st.gchunks) { const im = st.gchunks[k]; _hp.fromArray(im.userData.c).applyMatrix4(G.matrixWorld); im.visible = _hp.distanceTo(cam.position) < dist; } };
  G.userData.landState = st; return G;
};
ENG.PREFABS.land = { cat: 'Build', label: 'Terrain', props: {
  size: { t: 'num', d: 96, l: 'Size (m)' }, res: { t: 'num', d: 96, l: 'Detail (cells across)' },
  c0: { t: 'color', d: L.LAYERS[0][1], l: 'Grass layer' }, c1: { t: 'color', d: L.LAYERS[1][1], l: 'Dirt layer' }, c2: { t: 'color', d: L.LAYERS[2][1], l: 'Rock layer' }, c3: { t: 'color', d: L.LAYERS[3][1], l: 'Sand layer' }, tile: { t: 'num', d: 4, l: 'Ground texture size (m)' },
  grassColor: { t: 'color', d: '#7fae46', l: 'Grass color' }, grassHeight: { t: 'num', d: .6, l: 'Grass height (m)' }, grassDensity: { t: 'num', d: 3, l: 'Grass clumps per m²' }, grassDist: { t: 'num', d: 70, l: 'Grass draw distance (m)' },
  wind: { t: 'num', d: 1, l: 'Wind strength' }, slopeLimit: { t: 'num', d: 48, l: 'Steepest walkable slope (°)' }, collide: { t: 'bool', d: true, l: 'Solid' }, data: { t: 'json', d: null, l: 'Data' } },
  build(o) { return L.build(o.props); } };
/* ---------- in the game: trunks block you, cliffs are too steep to walk up ---------- */
/* the physics library warns about every terrain collision column; the warning is a known false alarm and logging it every frame costs speed */
['error', 'warn'].forEach(k => { const f = console[k].bind(console); console[k] = function (...a) { if (typeof a[0] === 'string' && a[0].indexOf('.faceNormals[') === 0) return; return f(...a); }; });
const GP = ENG.Game && ENG.Game.prototype;
if (GP) {
  const prevSpawn = GP.spawnExtra;
  GP.spawnExtra = function (e) {
    if (prevSpawn) prevSpawn.call(this, e); if (e.type !== 'land' || !e.root) return; let st = null; e.root.traverse(n => { if (n.userData.landState) st = n.userData.landState; }); if (!st) return;
    e.root.updateMatrixWorld(true); st.world = e.root.matrixWorld.clone(); st.inv = st.world.clone().invert(); st.slopeMax = Math.max(5, Math.min(89, +(st.p.slopeLimit || 48))); (this._lands = this._lands || []).push(st);
    st.trees.forEach(t => { const T = L.TREES[t[0]]; if (!T || !T.col) return; const y = L.heightAt(st, t[1], t[2]) || 0, r = T.col.r * t[3], hh = T.col.h * t[3], a = new THREE.Vector3(t[1] - r, y, t[2] - r).applyMatrix4(st.world), b = new THREE.Vector3(t[1] + r, y + hh, t[2] + r).applyMatrix4(st.world); this.cols.push({ box: new THREE.Box3(a.clone().min(b), a.clone().max(b)), m: st.mesh, e }); });
    if (this.world && typeof CANNON !== 'undefined' && CANNON.Heightfield && st.p.collide !== false) {
      const N = st.res, V = N + 1, es = st.size / N, half = st.size / 2, data = []; for (let i = 0; i <= N; i++) { const col = []; for (let j = 0; j <= N; j++) col.push(st.h[(N - j) * V + i]); data.push(col); }
      const body = new CANNON.Body({ mass: 0 }); body.addShape(new CANNON.Heightfield(data, { elementSize: es })); const q = new THREE.Quaternion(); e.root.getWorldQuaternion(q); q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
      const lp = new THREE.Vector3(-half, 0, half).applyMatrix4(st.world); body.position.set(lp.x, lp.y, lp.z); body.quaternion.set(q.x, q.y, q.z, q.w); body.collisionFilterMask = -1; this.world.addBody(body); e.bodies = (e.bodies || []).concat(body); st.body = body;
    }
  };
  const prevStep = GP.step;
  GP.step = function (dt) {
    const LS = this._lands, P = this.player; if (!LS || !LS.length || !P || !P.pos) return prevStep.call(this, dt);
    const px = P.pos.x, py = P.pos.y, pz = P.pos.z, r = prevStep.call(this, dt); if (P.pos.y <= py + .004) return r;
    for (const st of LS) { if (st.slopeMax >= 89) continue; const lp = _v.copy(P.pos).applyMatrix4(st.inv), hgt = L.heightAt(st, lp.x, lp.z); if (hgt === null || Math.abs(lp.y - hgt) > .35) continue;
      const n = L.normalAt(st, lp.x, lp.z); if (Math.acos(Math.min(1, n.y)) > st.slopeMax * D2R) { P.pos.x = px; P.pos.z = pz; P.pos.y = py; if (P.vel) { P.vel.x *= .2; P.vel.z *= .2; } } }
    return r;
  };
}
})();
