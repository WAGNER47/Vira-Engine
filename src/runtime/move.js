/* VIRA MOVE: Source-style player movement. Velocity is simulated: friction on the ground, acceleration toward
   where you want to go, tiny air control that still allows air strafing, and speed you keep when you land and jump again. */
(function () {
'use strict';
const ENG = window.ENG;
ENG.MOVE_DEF = { style: 'source', friction: 5, accel: 10, airAccel: 14, airCap: .85, stop: 2.4 };
ENG.moveSim = function (P, wx, wz, sp, dt, g) {
  const S = (g && g.S) || {}, M = ENG.MOVE_DEF, style = S.moveStyle || M.style;
  if (style === 'classic') { const k = Math.min(1, (P.onGround ? 12 : 3) * dt); P.vel.x += (wx * sp - P.vel.x) * k; P.vel.z += (wz * sp - P.vel.z) * k; return; }
  const num = (v, d) => (v == null || v === '' || isNaN(+v)) ? d : +v, fr = num(S.moveFriction, M.friction), ac = num(S.moveAccel, M.accel), aa = num(S.moveAirAccel, M.airAccel), cap = num(S.moveAirCap, M.airCap);
  const wl = Math.hypot(wx, wz), dx = wl > 1e-6 ? wx / wl : 0, dz = wl > 1e-6 ? wz / wl : 0, wish = sp * Math.min(1, wl);
  const accel = (a, capSpd) => { if (wish <= 0) return; const cur = P.vel.x * dx + P.vel.z * dz, add = Math.min(wish, capSpd) - cur; if (add <= 0) return; const as = Math.min(a * wish * dt, add); P.vel.x += dx * as; P.vel.z += dz * as; };
  if (P.onGround) { const s = Math.hypot(P.vel.x, P.vel.z); if (s > 1e-4) { const ns = Math.max(0, s - Math.max(s, M.stop) * fr * dt) / s; P.vel.x *= ns; P.vel.z *= ns; } accel(ac, wish); }
  else accel(aa, cap);
};
})();
