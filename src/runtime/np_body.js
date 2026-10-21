/* Character bodies and ragdolls from "No perks. Only wounds." (prototype 4), imported as-is, plus a bridge into Vira. */
(function () {
const ENG = window.ENG;
const World = { scene: null, bounds: { x0: -1e4, x1: 1e4, z0: -1e4, z1: 1e4 }, near: () => [] }, FX = {}, SFX = {}, Game = { camera: null, combatants: [], player: null, time: 0 }, Pr = { push() {} };
const V3=THREE.Vector3, Q4=THREE.Quaternion, DEG=Math.PI/180; const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, rand=(a,b)=>a+Math.random()*(b-a), chance=p=>Math.random()<p, damp=(a,b,k,dt)=>lerp(a,b,1-Math.exp(-k*dt)), pick=a=>a[(Math.random()*a.length)|0];
const TUNING_SCHEMA = [
  // [group, key, label, min, max, step, default]
  ['Crosshair', 'xhLen', 'Line length (px, lines style)', 2, 20, 1, 7],
  ['Crosshair', 'xhThick', 'Line thickness (px)', 1, 5, 0.5, 2],
  ['Crosshair', 'xhGap', 'Minimum ring or gap size (px)', -3, 20, 1, 3],
  ['Crosshair', 'xhSpreadScale', 'Spread to gap (1 = bullets land inside the gap)', 0, 2, 0.05, 1],
  ['Crosshair', 'xhOpacity', 'Opacity', 0.2, 1, 0.05, 0.92],
  ['Controls', 'sens', 'Mouse sensitivity', 0.2, 3, 0.05, 1],
  ['Controls', 'adsSensMult', 'Aiming sensitivity multiplier', 0.3, 1.2, 0.05, 0.75],
  ['Controls', 'fov', 'Field of view', 60, 100, 1, 78],
  ['Aim', 'swayMult', 'Global aim sway', 0, 3, 0.05, 1],
  ['Aim', 'hipSpreadMult', 'Global hipfire spread', 0.2, 3, 0.05, 1],
  ['Aim', 'hipSwayShare', 'Share of sway applied in hipfire', 0, 1, 0.05, 0.5],
  ['Pistol aim', 'focusStart', 'Focus starts at (accuracy)', 0.3, 0.9, 0.01, 0.6],
  ['Pistol aim', 'focusMax', 'Focus peaks at (accuracy)', 0.6, 0.99, 0.01, 0.9],
  ['Visuals', 'killcamCooldown', 'Kill cam: seconds between replays', 0, 120, 1, 20],
  ['Visuals', 'killcamChance', 'Kill cam: chance on an ordinary kill past 8 m', 0, 1, 0.05, 0.12],
  ['Visuals', 'bloom', 'Bloom strength (neon, flashes, embers glow)', 0, 2, 0.05, 0.55],
  ['Bullet time', 'btWorld', 'World speed in bullet time', 0.05, 1, 0.01, 0.3],
  ['Bullet time', 'btPlayer', 'Your speed in bullet time', 0.1, 1, 0.01, 0.6],
  ['Bullet time', 'btDuration', 'Full meter lasts (s, real time)', 1, 20, 0.5, 6],
  ['Bullet time', 'btRecharge', 'Meter refill per second when off', 0, 0.5, 0.01, 0.04],
  ['Bullet time', 'btKillRefill', 'Meter refill per kill', 0, 1, 0.05, 0.3],
  ['Pistol aim', 'focusTime', 'Time to reach peak focus (s)', 0.2, 4, 0.05, 0.8],
  ['Pistol aim', 'accRise', 'Hip accuracy build-up speed (per s)', 0.2, 4, 0.05, 1.2],
  ['Pistol aim', 'focusWalk', 'Best focus while walking', 0, 0.9, 0.01, 0.48],
  ['Pistol aim', 'focusMoveSpeed', 'Move speed while focusing', 0.3, 1, 0.05, 0.7],
  ['Pistol aim', 'accStand', 'Hip accuracy standing still', 0, 0.9, 0.01, 0.5],
  ['Pistol aim', 'accCrouch', 'Hip accuracy crouched', 0, 0.9, 0.01, 0.6],
  ['Pistol aim', 'accWalk', 'Hip accuracy walking', 0, 0.9, 0.01, 0.2],
  ['Pistol aim', 'accCrouchWalk', 'Hip accuracy crouch-walking', 0, 0.9, 0.01, 0.38],
  ['Pistol aim', 'accSprint', 'Accuracy sprinting', 0, 0.5, 0.01, 0.03],
  ['Pistol aim', 'accAir', 'Accuracy in the air', 0, 0.5, 0.01, 0],
  ['Pistol aim', 'turnPenalty', 'Turning penalty (fast flicks cost accuracy)', 0, 2, 0.05, 0.45],
  ['Pistol aim', 'bloomMult', 'Accuracy lost per shot (x)', 0, 3, 0.05, 1.15],
  ['Pistol aim', 'recoilKick', 'Recoil and shot punch (x)', 0.3, 3, 0.05, 1.3],
  ['Counter-strafe', 'csDecel', 'Counter-strafe braking (higher = snappier stop)', 5, 80, 1, 36],
  ['Counter-strafe', 'releaseDecel', 'Braking when you just let go of the keys', 2, 30, 0.5, 7],
  ['Counter-strafe', 'csSnapTime', 'Snap window after a clean stop (s)', 0, 1, 0.05, 0.35],
  ['Counter-strafe', 'csSnapRise', 'Accuracy build-up during the snap (x)', 1, 12, 0.5, 6],
  ['Counter-strafe', 'csSnapBonus', 'Extra accuracy on a clean stop', 0, 0.3, 0.01, 0.08],
  ['Pistol aim', 'hitAccLoss', 'Accuracy lost when you get hit', 0, 1, 0.01, 0.3],
  ['Pistol aim', 'landAccLoss', 'Accuracy lost on landing', 0, 1, 0.01, 0.35],
  ['Aim', 'aimLag', 'Gun lag behind fast turns (reticle drift)', 0, 1, 0.02, 0.3],
  ['Aim', 'aimLagRecover', 'Gun lag recovery speed', 1, 20, 0.5, 7],
  ['Aim', 'gunBob', 'Walking bob on the reticle', 0, 3, 0.05, 1],
  ['Aim', 'exertionSway', 'Extra sway after sprinting', 0, 6, 0.1, 2.6],
  ['Aim', 'staminaSway', 'Extra sway at low stamina', 0, 4, 0.1, 1.4],
  ['Aim', 'breathHoldTime', 'Breath hold length (s)', 0.5, 8, 0.1, 3],
  ['Aim', 'breathHoldSway', 'Sway while holding breath', 0.05, 1, 0.05, 0.25],
  ['Movement', 'rollCooldown', 'Roll cooldown, shared (s)', 1, 40, 0.5, 20],
  ['Movement', 'walkSpeed', 'Walk speed (m/s)', 1, 6, 0.1, 3.3],
  ['Movement', 'sprintSpeed', 'Sprint speed (m/s)', 3, 10, 0.1, 5.8],
  ['Movement', 'staminaDrain', 'Stamina drain while sprinting', 5, 60, 1, 20],
  ['Movement', 'staminaRegen', 'Stamina regen', 5, 60, 1, 16],
  ['Wounds', 'maxWounds', 'Max active wounds', 1, 6, 1, 3],
  ['Wounds', 'comboWindow', 'Combo window (s)', 2, 20, 0.5, 8],
  ['Wounds', 'neckBleedTime', 'Neck: bleed-out time (s)', 2, 10, 0.1, 5.5],
  ['Wounds', 'heartTime', 'Heart: time until death (s)', 0.5, 5, 0.1, 2],
  ['Wounds', 'heartSway', 'Heart: sway multiplier', 1, 6, 0.1, 3],
  ['Wounds', 'chestNoSprint', 'Chest: no-sprint time (s)', 0, 8, 0.5, 3],
  ['Wounds', 'coughRollMin', 'Cough roll interval min (s)', 0.3, 5, 0.1, 1],
  ['Wounds', 'coughRollMax', 'Cough roll interval max (s)', 0.5, 8, 0.1, 3],
  ['Wounds', 'coughTriggerChance', 'Cough chance per roll', 0, 1, 0.05, 0.5],
  ['Wounds', 'coughChainChance', 'Cough chain chance', 0, 0.9, 0.05, 0.25],
  ['Wounds', 'coughKick', 'Cough aim kick strength', 0, 3, 0.05, 1],
  ['Wounds', 'stomachBleedTime', 'Stomach: bleed time (s)', 4, 20, 0.5, 11],
  ['Wounds', 'stomachBleedDmg', 'Stomach: total bleed damage', 0, 60, 1, 24],
  ['Wounds', 'stomachSpeed', 'Stomach: move speed multiplier', 0.3, 1, 0.05, 0.8],
  ['Wounds', 'thighBob', 'Thigh: limp camera bob', 0, 3, 0.05, 1],
  ['Wounds', 'thighSprintMult', 'Thigh: sprint speed multiplier', 0.3, 1, 0.05, 0.65],
  ['Wounds', 'slideDamage', 'Thigh: damage per slide', 0, 30, 1, 8],
  ['Wounds', 'jumpDamage', 'Thigh: damage per jump', 0, 30, 1, 5],
  ['Wounds', 'kneeKneelTime', 'Knee: forced kneel (s)', 0.5, 15, 0.1, 9],
  ['Wounds', 'kneeQteAfter', 'Knee: timing bar appears after (s)', 0, 8, 0.1, 4.5],
  ['Wounds', 'kneeQteZone', 'Knee: timing bar sweet zone width', 0.05, 0.6, 0.01, 0.22],
  ['Wounds', 'kneeQteSpeed', 'Knee: timing marker speed (sweeps/s)', 0.3, 4, 0.05, 1.3],
  ['Wounds', 'groinSitTime', 'Groin: down and dizzy (s)', 1, 15, 0.5, 7],
  ['Wounds', 'groinFireMult', 'Groin: time between shots multiplier', 1, 5, 0.1, 2.4],
  ['Hands and bones', 'supportHandReloadMult', 'Off hand shot: reload time multiplier', 1, 5, 0.1, 2.7],
  ['Hands and bones', 'reloadStruggleSway', 'Off hand shot: sway while reloading', 1, 5, 0.1, 2.4],
  ['Hands and bones', 'gripFillWalk', 'Gun hand shot: grip loss walking (per s)', 0, 2, 0.01, 0.3],
  ['Hands and bones', 'gripFillSprint', 'Gun hand shot: grip loss sprinting (per s)', 0, 4, 0.05, 0.9],
  ['Hands and bones', 'gripFillTurn', 'Gun hand shot: grip loss from fast turns', 0, 1, 0.01, 0.07],
  ['Hands and bones', 'gripShot', 'Gun hand shot: grip loss per shot', 0, 0.6, 0.01, 0.14],
  ['Hands and bones', 'gripDrain', 'Gun hand shot: grip recovery standing still (per s)', 0, 2, 0.05, 0.5],
  ['Hands and bones', 'boneBreakChance', 'High calibre arm hit: bone break chance', 0, 1, 0.05, 0.35],
  ['Hands and bones', 'severChance', 'High calibre shoulder hit: arm lost chance', 0, 1, 0.05, 0.3],
  ['Hands and bones', 'severBleed', 'Lost arm: total bleed damage', 0, 100, 1, 40],
  ['Hands and bones', 'severBleedTime', 'Lost arm: bleed time (s)', 3, 60, 1, 20],
  ['Hands and bones', 'severRollCd', 'Lost arm: roll cooldown cap (s)', 1, 20, 0.5, 6],
  ['Hands and bones', 'severRollStamina', 'Lost arm: stamina per roll', 0, 20, 1, 4],
  ['Wounds', 'calfSpeedMult', 'Calf: speed multiplier', 0.5, 1, 0.01, 0.93],
  ['Wounds', 'crawlSpeed', 'Crawl speed (m/s)', 0.2, 2, 0.05, 0.75],
  ['Wounds', 'crawlFireRateMult', 'Crawl: time between shots multiplier', 1, 4, 0.1, 2],
  ['Wounds', 'gripTremorTime', 'Gun hand: tremor after pickup (s)', 0, 4, 0.1, 1.4],
  ['Wounds', 'bicepReloadMult', 'Gun bicep: reload time multiplier', 1, 4, 0.05, 1.9],
  ['Wounds', 'supportReloadMult', 'Support arm: reload time multiplier', 1, 3, 0.05, 1.35],
  ['Wounds', 'holsterJamTime', 'Holster: fast-draw disabled (s)', 0.2, 5, 0.1, 1],
  ['Wounds', 'dynamiteDamage', 'Dynamite: damage to wearer', 10, 150, 1, 65],
  ['Wounds', 'dynamiteRadius', 'Dynamite: splash radius (m)', 1, 12, 0.5, 5],
  ['Combos', 'execKneelTime', 'Execution Kneel: length (s)', 2, 10, 0.5, 5],
  ['Combos', 'execRollAfter', 'Execution Kneel: roll allowed after (s)', 0, 5, 0.1, 3],
  ['Combos', 'execFinishRange', 'Execution Kneel: finisher range (m)', 1, 6, 0.1, 3],
  ['Combos', 'execCommitTime', 'Execution Kneel: finisher commit (s)', 0.3, 3, 0.1, 1],
  ['Combos', 'crawlGutNoFire', 'Crawl + gut shot: no fire (s)', 0, 10, 0.5, 4],
  ['Combos', 'dizzyArmTime', 'Disarmed and Dizzy: arm useless (s)', 1, 15, 0.5, 6],
  ['Combos', 'dizzyPickupMult', 'Disarmed and Dizzy: pickup time multiplier', 1, 4, 0.1, 2],
  ['Combos', 'comboBonusPoints', 'Bonus points per combo', 0, 300, 10, 50],
  ['Punch', 'punchWindup', 'Punch wind-up (s)', 0.1, 1, 0.05, 0.35],
  ['Punch', 'punchCooldown', 'Punch cooldown (s)', 0.2, 3, 0.05, 1],
  ['Punch', 'punchRange', 'Punch range (m)', 0.6, 2.5, 0.05, 1.2],
  ['Punch', 'punchBodyDrop', 'Body punch: drop chance', 0, 1, 0.05, 0.2],
  ['Punch', 'punchFaceDrop', 'Face punch: drop chance', 0, 1, 0.05, 0.65],
  ['Punch', 'punchStagger', 'Face punch: stagger (s)', 0, 3, 0.1, 1],
  ['Punch', 'catchWindow', 'Face punch: airborne catch window (s)', 0.3, 2, 0.05, 0.9],
  ['Punch', 'punchDamage', 'Punch damage', 0, 40, 1, 8],
  ['Economy', 'boxCost', 'Mystery crate cost', 0, 2000, 50, 300],
  ['Economy', 'startPoints', 'Starting points', 0, 5000, 50, 300],
  ['Economy', 'killPoints', 'Points per kill', 0, 1000, 10, 150],
  ['Deathmatch', 'dmBots', 'Bots in deathmatch (applies on restart)', 1, 10, 1, 6],
  ['Deathmatch', 'dmScoreLimit', 'Kills to win', 3, 50, 1, 15],
  ['Deathmatch', 'dmTimeLimit', 'Time limit (minutes)', 2, 20, 1, 8],
  ['Deathmatch', 'respawnDelay', 'Respawn delay (s)', 1, 8, 0.5, 4],
  ['Deathmatch', 'spawnShield', 'Spawn protection (s, ends when you fire)', 0, 3, 0.25, 1.5],
  ['Bot', 'botEnabled', 'Bots active (1 on, 0 off)', 0, 1, 1, 1],
  ['Bot', 'botAccuracy', 'Bot accuracy', 0, 1, 0.05, 0.42],
  ['Bot', 'botReaction', 'Bot reaction time (s)', 0.1, 2, 0.05, 0.55],
  ['Bot', 'botDamageMult', 'Bot damage multiplier', 0, 2, 0.05, 1],
  ['Health', 'healthMax', 'Max health', 50, 300, 5, 100],
  ['Health', 'whiskeyHeal', 'Whiskey heal amount', 0, 100, 1, 35],
  ['Health', 'whiskeyRespawn', 'Whiskey bottle respawn (s)', 3, 120, 1, 25],
  ['Kick', 'kickWindup', 'Kick wind-up (s)', 0.05, 0.8, 0.01, 0.2],
  ['Kick', 'kickCooldown', 'Kick cooldown (s)', 0.3, 5, 0.1, 1.6],
  ['Kick', 'kickRange', 'Kick range (m)', 0.8, 3, 0.05, 1.8],
  ['Kick', 'kickDamage', 'Kick damage', 0, 50, 1, 12],
  ['Kick', 'kickForce', 'Knockback speed (m/s)', 0, 20, 0.5, 9],
  ['Kick', 'kickLift', 'Knockback lift (m/s)', 0, 8, 0.25, 3],
  ['Kick', 'kickKnockdown', 'Knocked down for (s)', 0, 3, 0.05, 1.1],
  ['Kick', 'kickStun', 'Stunned after getting up (s)', 0, 4, 0.1, 1.2],
  ['Kick', 'wallSlamDamage', 'Wall slam damage', 0, 60, 1, 14],
  ['Beer', 'beerHeal', 'Beer heal amount', 0, 60, 1, 15],
  ['Ragdoll', 'ragdollForce', 'Death impulse (x)', 0, 3, 0.05, 1],
  ['Ragdoll', 'ragGravity', 'Ragdoll gravity (m/s2, lower = floatier falls)', 3, 30, 0.5, 7],
  ['Ragdoll', 'ragTone', 'Muscle tone at death (holds the body shape)', 0, 2, 0.05, 1],
  ['Ragdoll', 'ragToneTime', 'How long the body holds before going limp (s)', 0.1, 3, 0.05, 1],
  ['Ragdoll', 'ragThrow', 'How far heavy guns throw bodies (x)', 0, 3, 0.05, 1],
  ['Trauma judge', 'judgeLimit', 'Shock a body can take before it may drop (higher = tougher)', 1, 8, 0.1, 4.2],
  ['Trauma judge', 'judgeBurst', 'Extra shock per hit landed in the window (stacking)', 0, 1.5, 0.05, 0.45],
  ['Trauma judge', 'judgeWindow', 'Stacking window (s)', 0.3, 4, 0.1, 1.5],
  ['Trauma judge', 'judgeDecay', 'Shock recovery per second', 0, 0.5, 0.01, 0.08],
  ['Trauma judge', 'judgeNoise', 'Randomness per hit (+/-)', 0, 0.8, 0.05, 0.3],
  ['Trauma judge', 'toughMin', 'Toughness roll, lowest', 0.4, 1.5, 0.05, 0.8],
  ['Trauma judge', 'toughMax', 'Toughness roll, highest', 0.6, 2, 0.05, 1.25],
  ['Trauma judge', 'judgeDown', 'Chance scale for going down instead of dying', 0, 1, 0.05, 0.6],
  ['Trauma judge', 'dyingTime', 'Down: seconds to bleed out unless healed', 3, 30, 0.5, 10],
  ['Balance', 'balK', 'Balance recovery strength', 5, 120, 1, 40],
  ['Balance', 'balDamp', 'Balance damping', 1, 30, 0.5, 9],
  ['Balance', 'balStep', 'Lean that forces a stumble step (m)', 0.02, 0.5, 0.01, 0.06],
  ['Balance', 'balFall', 'Lean that topples them (m, scaled by stability)', 0.1, 1, 0.01, 0.3],
  ['Balance', 'balImpulse', 'How hard hits push balance (x)', 0, 3, 0.05, 0.9],
  ['Balance', 'balLean', 'How far the body visibly leans (x)', 0, 5, 0.1, 2],
  ['Gun impact', 'crushPower', 'Close-range limb crushing (x)', 0, 3, 0.05, 1],
  ['Gun impact', 'sgCloseBonus', 'Shotgun point-blank damage bonus', 0, 2, 0.05, 0.6],
  ['Gun impact', 'closeKnock', 'Close-range knockback boost', 0, 4, 0.1, 1.5],
  ['Ragdoll', 'ragWaist', 'Waist bend limit (deg)', 10, 90, 1, 38],
  ['Ragdoll', 'ragNeck', 'Neck bend limit (deg)', 10, 90, 1, 42],
  ['Ragdoll', 'jointBreakForce', 'Hit force that breaks a joint past its limit', 1, 30, 0.5, 9],
  ['Ragdoll', 'dismemberForce', 'Hit force that takes a limb off (head needs 1.4x)', 3, 40, 0.5, 12],
  ['Physics', 'physKnock', 'Knockback from hits on the living (x)', 0, 3, 0.05, 1],
  ['Ragdoll', 'ragdollLife', 'Bodies stay for (s)', 3, 60, 1, 25],
  ['Ragdoll', 'ragdollMax', 'Max bodies at once', 2, 20, 1, 10],
  ['Sniper', 'sniperBodyDamage', 'Lower chest and stomach damage in the sweet spot', 20, 100, 1, 55],
  ['Sniper', 'sniperSweetMin', 'Sweet spot starts (m)', 5, 80, 1, 22],
  ['Sniper', 'sniperSweetMax', 'Sweet spot ends (m)', 20, 200, 1, 55],
  ['Sniper', 'sniperCloseMult', 'Damage at point blank (x)', 0.2, 1, 0.05, 0.55],
  ['Sniper', 'sniperFarMult', 'Damage at very long range (x)', 0.2, 1, 0.05, 0.7],
  ['Smoke', 'smokeTime', 'Seconds per cigarette', 3, 40, 1, 20],
  ['Smoke', 'smokeKillBonus', 'First kill while smoking adds (s)', 0, 20, 0.5, 8],
  ['Smoke', 'smokeKillDecay', 'Each further kill adds less (x)', 0.2, 1, 0.05, 0.75],
  ['Smoke', 'smokeMax', 'Smoke timer cap (s)', 5, 90, 1, 35],
  ['Smoke', 'smokeAccBoost', 'Accuracy build-up while smoking (x)', 1, 4, 0.05, 1.6],
  ['Smoke', 'smokeStartCigs', 'Cigarettes you spawn with', 0, 3, 1, 1],
  ['Beer', 'beerThrowDamage', 'Thrown bottle damage', 0, 80, 1, 22],
  ['Beer', 'brokenDamage', 'Broken bottle damage', 0, 60, 1, 16],
  ['Beer', 'lacerationBleed', 'Broken bottle bleed (total damage over 8 s)', 0, 80, 1, 22],
  ['Beer', 'brokenHits', 'Hits before a broken bottle falls apart', 1, 10, 1, 4],
];
const TOGGLES = [
  ['xhOn', 'Hipfire reticle (hides when a rifle aims down sights)', true, 'Crosshair'],
  ['xhDynamic', 'Dynamic gap: opens with movement, jumping, firing and wound spread', true, 'Crosshair'],
  ['xhFollow', 'Follows the true aim point, so wound sway moves it', true, 'Crosshair'],
  ['xhDot', 'Center dot', true, 'Crosshair'],
  ['xhAcc', 'Show accuracy percentage next to the reticle', true, 'Crosshair'],
  ['xhOutline', 'Black outline', true, 'Crosshair'],
  ['xhNames', 'Enemy under the crosshair: tint red and show name', true, 'Crosshair'],
  ['counterStrafe', 'Counter-strafe (tap the opposite key to stop dead)', true],
  ['rollRefill', 'Rolling refills your gun', true],
  ['rollGear', 'Rolling knocks off the hat (1st) and sunglasses (every 3rd)', true],
  ['post', 'Bloom and film grade (turn off on slow machines)', true],
  ['killcam', 'X-ray bullet cam on special kills', true],
  ['bounties', 'Bounties on kill streaks (deathmatch)', true],
  ['weather', 'Weather events: dust storms, thunder, power cuts', true],
  ['music', 'Western music stings', true],
  ['ragdolls', 'Ragdoll bodies', true],
  ['dismember', 'Heavy hits can take limbs and heads off', true],
  ['judge', 'Trauma judge decides graze, wound, down or kill per hit', true],
  ['judgeGraze', 'Weak far hits on limbs can graze', true],
  ['balance', 'Hits push balance: stumbles and falls', true],
  ['liveRagdolls', 'Bots fall as active ragdolls and get back up', true],
  ['deathCam', 'Third-person death cam on your body', true],
  ['hitboxDebug', 'Hit zone debug view (H)', false],
  ['trueAim', 'Show true aim point (debug only, the game has no crosshair)', false],
  ['debugStats', 'Show aim and movement stats', false],
  ['plannedCombos', 'Enable planned combos (Hipfire Hell, Lung Rattle, Blind Bleeder, Dead Man Standing)', false],
  ['godMode', 'Bot shots do no damage to me (wounds still apply)', false],
  ['hatchet', 'Spawn with hatchet instead of knife', false],
];
const T = {};
const __T={}; for (const r of TUNING_SCHEMA) if (Array.isArray(r) && typeof r[1]==='string') __T[r[1]]=r[6]; for (const t of TOGGLES) if (Array.isArray(t)) __T[t[0]]=t[2]; Object.assign(T, __T);
const MATS = {};
function M(hex, opts = {}) {
  const key = hex + JSON.stringify(opts);
  if (!MATS[key]) MATS[key] = opts.basic ? new THREE.MeshBasicMaterial({ color: hex, ...opts.p })
    : new THREE.MeshLambertMaterial({ color: hex, ...(opts.p || {}) });
  return MATS[key];
}
const GEO = { box: new THREE.BoxGeometry(1, 1, 1), sphere: new THREE.SphereGeometry(1, 14, 10), cyl: new THREE.CylinderGeometry(1, 1, 1, 12), cyl6: new THREE.CylinderGeometry(1, 1, 1, 7) };
function mbox(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(GEO.box, mat); m.scale.set(w, h, d); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m;
}
function mcyl(r, h, mat, x = 0, y = 0, z = 0, parent, seg) {
  const m = new THREE.Mesh(seg === 7 ? GEO.cyl6 : GEO.cyl, mat); m.scale.set(r, h, r); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m;
}
const PHONG = {};
function phong(hex, shin = 24, extra) {
  const k = hex + '|' + shin + (extra ? JSON.stringify(extra) : '');
  return PHONG[k] || (PHONG[k] = new THREE.MeshPhongMaterial(Object.assign({ color: hex, shininess: shin, specular: 0x222222 }, extra || {})));
}
const GLASS_MATS = {};
function glassMat(color) { return GLASS_MATS[color] || (GLASS_MATS[color] = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.88, emissive: new THREE.Color(color).multiplyScalar(0.35) })); }
function makeBottleMesh(scale = 1, color = 0x7a3d12) {
  const g = new THREE.Group();
  const glass = glassMat(color);
  const b = mcyl(0.038 * scale, 0.19 * scale, glass, 0, 0.095 * scale, 0, g); const n = mcyl(0.014 * scale, 0.08 * scale, glass, 0, 0.23 * scale, 0, g);
  mbox(0.05 * scale, 0.06 * scale, 0.078 * scale, M(0xe8d8b0), 0, 0.1 * scale, 0, g);
  return { group: g, parts: [b, n] };
}
const WEAPONS = {
  revolver: { id: 'revolver', name: 'Trail revolver', slot: 'sidearm', focus: true, noADS: true, acc: { min: 0.22, max: 7, bloom: 0.3, focusBloom: 0.17 }, dmg: 34, pellets: 1, range: 90, mag: 6,
    reload: { type: 'single', start: 0.35, each: 0.55, end: 0.25 }, cadence: { type: 'cock', time: 0.42 },
    adsFov: 62, adsTime: 0.2, adsSway: 0.0045, adsSpread: 0.12,
    hip: { still: 0.9, move: 3.5, air: 9, bloom: 2.4, recover: 5.5, crouch: 0.75 },
    recoil: { pitch: 0.05, yaw: 0.014, recover: 7, kick: 1 }, falloff: { start: 25, end: 60, min: 0.6 }, sound: 'revolver', switchTime: 0.22 },
  // Double Slinger: one weapon, two guns. Left click fires the right gun, right click fires the left. No sights.
  dual: { id: 'dual', name: 'Twin trail revolvers', slot: 'sidearm', dual: true, noADS: true, acc: { min: 0.45, max: 8, bloom: 0.22, focusBloom: 0.22, cap: 0.62 }, dmg: 30, pellets: 1, range: 85, mag: 6,
    reload: { type: 'single', start: 0.35, each: 0.42, end: 0.25 }, cadence: { type: 'cock', time: 0.42 },
    adsFov: 75, adsTime: 0.2, adsSway: 0.0055, adsSpread: 0.4,
    hip: { still: 1.25, move: 4.2, air: 9.5, bloom: 2.8, recover: 5, crouch: 0.75 },
    recoil: { pitch: 0.045, yaw: 0.02, recover: 7, kick: 1 }, falloff: { start: 22, end: 55, min: 0.55 }, sound: 'revolver', switchTime: 0.35 },
  // High impact revolver: slow, brutal, staggers and shoves what it hits.
  dragoon: { id: 'dragoon', name: 'Dragoon hand cannon', slot: 'sidearm', caliber: 'high', focus: true, noADS: true, acc: { min: 0.28, max: 8, bloom: 0.42, focusBloom: 0.27 }, dmg: 56, pellets: 1, range: 95, mag: 5, impact: true,
    reload: { type: 'single', start: 0.4, each: 0.7, end: 0.3 }, cadence: { type: 'cock', time: 0.72 },
    adsFov: 58, adsTime: 0.26, adsSway: 0.0055, adsSpread: 0.1,
    hip: { still: 1.2, move: 4.6, air: 10, bloom: 4.2, recover: 4.2, crouch: 0.75 },
    recoil: { pitch: 0.105, yaw: 0.03, recover: 5, kick: 1.9 }, falloff: { start: 22, end: 60, min: 0.6 }, sound: 'dragoon', switchTime: 0.32 },
  shotgun: { id: 'shotgun', name: 'Coach gun', slot: 'primary', caliberClose: 8, twoHanded: true, dmg: 12, pellets: 9, pelletSpread: 3.4, range: 45, mag: 2,
    reload: { type: 'all', time: 2.2 }, cadence: { type: 'semi', time: 0.24 },
    adsFov: 64, adsTime: 0.28, adsSway: 0.0055, adsSpread: 0.5,
    hip: { still: 1.4, move: 4.5, air: 8, bloom: 3, recover: 4, crouch: 0.8 },
    recoil: { pitch: 0.11, yaw: 0.03, recover: 5, kick: 2 }, falloff: { start: 8, end: 25, min: 0.25 }, sound: 'shotgun', switchTime: 0.5 },
  lever: { id: 'lever', name: 'Lever rifle', slot: 'primary', twoHanded: true, dmg: 42, pellets: 1, range: 160, mag: 8,
    reload: { type: 'single', start: 0.4, each: 0.5, end: 0.35 }, cadence: { type: 'lever', time: 0.58 },
    adsFov: 50, adsTime: 0.3, adsSway: 0.004, adsSpread: 0.05,
    hip: { still: 1.6, move: 5.5, air: 10, bloom: 3, recover: 4, crouch: 0.75 },
    recoil: { pitch: 0.065, yaw: 0.016, recover: 6, kick: 1.3 }, sound: 'lever', switchTime: 0.5 },
  buffalo: { id: 'buffalo', name: 'Buffalo rifle', slot: 'primary', caliber: 'high', twoHanded: true, dmg: 80, pellets: 1, range: 260, mag: 1,
    reload: { type: 'all', time: 2.3 }, cadence: { type: 'semi', time: 0.3 },
    adsFov: 36, adsTime: 0.42, adsSway: 0.0065, adsSpread: 0.02,
    hip: { still: 2.4, move: 7, air: 12, bloom: 4, recover: 3, crouch: 0.7 },
    recoil: { pitch: 0.14, yaw: 0.03, recover: 4, kick: 2.2 }, sound: 'buffalo', switchTime: 0.6 },
  // Sniper: Creedmoor rifle with a Malcolm scope. The scope magnifies every bit of sway.
  scoped: { id: 'scoped', name: 'Scoped rifle', slot: 'primary', caliber: 'high', twoHanded: true, scope: true, sniper: true, dmg: 92, pellets: 1, range: 320, mag: 4,
    reload: { type: 'single', start: 0.5, each: 0.6, end: 0.4 }, cadence: { type: 'lever', time: 1.15 },
    adsFov: 13, adsTime: 0.45, adsSway: 0.0042, adsSpread: 0.01,
    hip: { still: 3.4, move: 9, air: 14, bloom: 5, recover: 2.5, crouch: 0.7 },
    recoil: { pitch: 0.15, yaw: 0.03, recover: 4, kick: 2.2 }, sound: 'scoped', switchTime: 0.7 },
  // Beer Drinker's bottle: smash it (blunt, stagger), then cut with what is left (bleed). RMB throws, R drinks.
  beer: { id: 'beer', name: 'Beer bottle', slot: 'melee', melee: true, beer: true, dmg: 28, range: 1.75, swing: 0.45, hitAt: 0.16, switchTime: 0.25 },
  knife: { id: 'knife', name: 'Bowie knife', slot: 'melee', melee: true, dmg: 38, range: 1.7, swing: 0.42, hitAt: 0.14,
    woundMap: { leg: 'thigh' }, switchTime: 0.25 },   // knife to any leg zone = limp
  hatchet: { id: 'hatchet', name: 'Hatchet', slot: 'melee', melee: true, dmg: 50, range: 1.85, swing: 0.7, hitAt: 0.27,
    woundMap: { arm: 'gunHandChop' }, switchTime: 0.3 },  // hatchet to any arm zone = gun drops
};
// ---- crate-only weapons ----
// knock: shove (m/s) on a living target and on a ragdoll. throw: how much of that carries the whole body when it dies.
// weight: move speed while held. selfKnock: pushes the shooter back. auto: hold to fire. spin: seconds to spin up.
Object.assign(WEAPONS, {
  buntline: { id: 'buntline', name: 'Long-barrel revolver', slot: 'sidearm', focus: true, noADS: true, rarity: 'common', acc: { min: 0.14, max: 6.5, bloom: 0.34, focusBloom: 0.2 }, dmg: 44, pellets: 1, range: 110, mag: 6,
    reload: { type: 'single', start: 0.35, each: 0.55, end: 0.25 }, cadence: { type: 'cock', time: 0.5 }, adsFov: 60, adsTime: 0.22, adsSway: 0.004, adsSpread: 0.08,
    hip: { still: 0.8, move: 3.4, air: 9, bloom: 2.4, recover: 5.5, crouch: 0.75 }, recoil: { pitch: 0.06, yaw: 0.014, recover: 7, kick: 1.2 }, falloff: { start: 35, end: 80, min: 0.65 }, knock: 1.2, sound: 'revolver', switchTime: 0.3,
    model: { kind: 'revolver', barrel: 0.3, finish: 0x8a8f96, grip: 0x5a3a20 } },
  widowmaker: { id: 'widowmaker', name: '.50 Hand cannon', slot: 'sidearm', focus: true, noADS: true, caliber: 'high', impact: true, rarity: 'rare', acc: { min: 0.3, max: 9, bloom: 0.55, focusBloom: 0.35 }, dmg: 72, pellets: 1, range: 100, mag: 4,
    reload: { type: 'single', start: 0.45, each: 0.8, end: 0.35 }, cadence: { type: 'cock', time: 0.85 }, adsFov: 58, adsTime: 0.28, adsSway: 0.006, adsSpread: 0.1,
    hip: { still: 1.3, move: 4.8, air: 10, bloom: 4.5, recover: 4, crouch: 0.75 }, recoil: { pitch: 0.14, yaw: 0.04, recover: 4.5, kick: 2.4 }, falloff: { start: 25, end: 65, min: 0.6 }, knock: 4.5, throw: 1.6, sound: 'dragoon', switchTime: 0.4,
    model: { kind: 'revolver', barrel: 0.22, bore: 0.03, cylR: 0.032, chambers: 4, finish: 0x2a2624, grip: 0x7a1a14, ports: true } },
  schofield: { id: 'schofield', name: 'Break-top .45', slot: 'sidearm', focus: true, noADS: true, rarity: 'common', acc: { min: 0.25, max: 7, bloom: 0.3, focusBloom: 0.18 }, dmg: 38, pellets: 1, range: 90, mag: 6,
    reload: { type: 'all', time: 1.35 }, cadence: { type: 'cock', time: 0.36 }, adsFov: 62, adsTime: 0.2, adsSway: 0.0045, adsSpread: 0.12,
    hip: { still: 0.9, move: 3.5, air: 9, bloom: 2.4, recover: 5.5, crouch: 0.75 }, recoil: { pitch: 0.05, yaw: 0.014, recover: 7, kick: 1.1 }, falloff: { start: 25, end: 60, min: 0.6 }, knock: 1.1, sound: 'revolver', switchTime: 0.22,
    model: { kind: 'revolver', barrel: 0.17, finish: 0xc8ccd2, grip: 0x2a1a10 } },
  lemat: { id: 'lemat', name: 'Twin-barrel Nine', slot: 'sidearm', focus: true, noADS: true, rarity: 'common', acc: { min: 0.3, max: 7.5, bloom: 0.28, focusBloom: 0.18 }, dmg: 31, pellets: 1, range: 85, mag: 9,
    reload: { type: 'single', start: 0.4, each: 0.5, end: 0.3 }, cadence: { type: 'cock', time: 0.4 }, adsFov: 64, adsTime: 0.2, adsSway: 0.0045, adsSpread: 0.14,
    hip: { still: 1, move: 3.6, air: 9, bloom: 2.4, recover: 5.5, crouch: 0.75 }, recoil: { pitch: 0.05, yaw: 0.016, recover: 7, kick: 1 }, falloff: { start: 22, end: 55, min: 0.6 }, knock: 1, sound: 'revolver', switchTime: 0.28,
    model: { kind: 'revolver', barrel: 0.19, cylR: 0.03, chambers: 9, finish: 0x4a4540, grip: 0x6a4428, under: true } },
  snub: { id: 'snub', name: 'Bulldog snub', slot: 'sidearm', focus: true, noADS: true, rarity: 'common', acc: { min: 0.55, max: 6, bloom: 0.22, focusBloom: 0.16 }, dmg: 30, pellets: 1, range: 60, mag: 5,
    reload: { type: 'single', start: 0.3, each: 0.42, end: 0.2 }, cadence: { type: 'cock', time: 0.24 }, adsFov: 68, adsTime: 0.15, adsSway: 0.005, adsSpread: 0.3,
    hip: { still: 1, move: 3, air: 8, bloom: 2, recover: 7, crouch: 0.75 }, recoil: { pitch: 0.045, yaw: 0.02, recover: 9, kick: 0.9 }, falloff: { start: 8, end: 28, min: 0.5 }, knock: 0.8, sound: 'revolver', switchTime: 0.15,
    model: { kind: 'revolver', barrel: 0.06, finish: 0x3a3d42, grip: 0x1a1a1a } },
  sawedoff: { id: 'sawedoff', name: 'Sawed-off', slot: 'sidearm', noADS: true, caliberClose: 6, rarity: 'common', dmg: 11, pellets: 10, pelletSpread: 6.5, range: 30, mag: 2,
    reload: { type: 'all', time: 1.5 }, cadence: { type: 'semi', time: 0.22 }, adsFov: 70, adsTime: 0.2, adsSway: 0.006, adsSpread: 1,
    hip: { still: 2.4, move: 5, air: 9, bloom: 3, recover: 5, crouch: 0.85 }, recoil: { pitch: 0.16, yaw: 0.04, recover: 5, kick: 2.4 }, falloff: { start: 5, end: 18, min: 0.25 }, knock: 5, throw: 1.5, sound: 'shotgun', switchTime: 0.3,
    model: { kind: 'shotgun', barrel: 0.2, stock: 'grip', twin: true } },
  maresleg: { id: 'maresleg', name: "Mare's Leg", slot: 'primary', twoHanded: true, rarity: 'common', dmg: 40, pellets: 1, range: 120, mag: 6,
    reload: { type: 'single', start: 0.35, each: 0.45, end: 0.3 }, cadence: { type: 'lever', time: 0.45 }, adsFov: 60, adsTime: 0.22, adsSway: 0.0045, adsSpread: 0.12,
    hip: { still: 1.3, move: 4.2, air: 9, bloom: 2.4, recover: 5, crouch: 0.75 }, recoil: { pitch: 0.07, yaw: 0.02, recover: 6.5, kick: 1.3 }, falloff: { start: 20, end: 50, min: 0.6 }, knock: 1.4, sound: 'lever', switchTime: 0.35,
    model: { kind: 'lever', barrel: 0.3, stock: 'grip' } },
  buzzer: { id: 'buzzer', name: 'Tin Star Buzzer', slot: 'primary', twoHanded: true, auto: true, rarity: 'common', dmg: 17, pellets: 1, range: 70, mag: 32,
    reload: { type: 'all', time: 1.9 }, cadence: { type: 'auto', time: 0.075 }, adsFov: 62, adsTime: 0.2, adsSway: 0.004, adsSpread: 0.45,
    hip: { still: 1.8, move: 3.6, air: 8, bloom: 0.55, recover: 7, crouch: 0.8 }, recoil: { pitch: 0.022, yaw: 0.013, recover: 9, kick: 0.5 }, falloff: { start: 12, end: 35, min: 0.5 }, knock: 0.5, sound: 'smg', switchTime: 0.35,
    model: { kind: 'smg', barrel: 0.2, coil: 0x46f0ff } },
  drum: { id: 'drum', name: 'Chicago Drum', slot: 'primary', twoHanded: true, auto: true, rarity: 'rare', weight: 0.92, dmg: 20, pellets: 1, range: 80, mag: 50,
    reload: { type: 'all', time: 2.8 }, cadence: { type: 'auto', time: 0.09 }, adsFov: 60, adsTime: 0.25, adsSway: 0.0045, adsSpread: 0.55,
    hip: { still: 2.1, move: 4.2, air: 9, bloom: 0.6, recover: 6, crouch: 0.8 }, recoil: { pitch: 0.03, yaw: 0.017, recover: 8, kick: 0.7 }, falloff: { start: 15, end: 40, min: 0.5 }, knock: 0.7, sound: 'smg', switchTime: 0.45,
    model: { kind: 'smg', barrel: 0.28, drum: true, stock: true } },
  elephant: { id: 'elephant', name: 'Elephant Gun .577', slot: 'primary', twoHanded: true, caliber: 'high', impact: true, rarity: 'legendary', weight: 0.85, dmg: 110, pellets: 1, range: 220, mag: 2,
    reload: { type: 'all', time: 2.8 }, cadence: { type: 'semi', time: 0.3 }, adsFov: 45, adsTime: 0.4, adsSway: 0.006, adsSpread: 0.03,
    hip: { still: 3, move: 7, air: 12, bloom: 5, recover: 3, crouch: 0.7 }, recoil: { pitch: 0.22, yaw: 0.05, recover: 3.5, kick: 3 }, knock: 7.5, throw: 2.6, selfKnock: 2, sound: 'heavyGun', switchTime: 0.7,
    model: { kind: 'rifle', barrel: 0.7, twin: true, bore: 0.03 } },
  puntgun: { id: 'puntgun', name: 'Punt Gun', slot: 'primary', twoHanded: true, noADS: true, caliberClose: 12, rarity: 'legendary', weight: 0.72, dmg: 13, pellets: 18, pelletSpread: 5, range: 45, mag: 1,
    reload: { type: 'all', time: 3.4 }, cadence: { type: 'semi', time: 0.4 }, adsFov: 70, adsTime: 0.3, adsSway: 0.007, adsSpread: 1,
    hip: { still: 3.2, move: 7, air: 12, bloom: 5, recover: 2.5, crouch: 0.75 }, recoil: { pitch: 0.3, yaw: 0.06, recover: 3, kick: 3.5 }, falloff: { start: 8, end: 28, min: 0.3 }, knock: 9, throw: 3.2, selfKnock: 4.5, sound: 'heavyGun', switchTime: 0.9,
    model: { kind: 'shotgun', barrel: 1.0, stock: true, bore: 0.05 } },
  gatling: { id: 'gatling', name: 'Hand crank gun', slot: 'primary', twoHanded: true, noADS: true, auto: true, spin: 0.55, rarity: 'legendary', weight: 0.7, dmg: 15, pellets: 1, range: 80, mag: 80,
    reload: { type: 'all', time: 4 }, cadence: { type: 'auto', time: 0.06 }, adsFov: 70, adsTime: 0.3, adsSway: 0.006, adsSpread: 1.5,
    hip: { still: 2.6, move: 5, air: 10, bloom: 0.3, recover: 8, crouch: 0.8 }, recoil: { pitch: 0.018, yaw: 0.02, recover: 10, kick: 0.45 }, falloff: { start: 20, end: 50, min: 0.6 }, knock: 0.9, sound: 'smg', switchTime: 0.9,
    model: { kind: 'gatling' } },
  machete: { id: 'machete', name: 'Machete', slot: 'melee', melee: true, enchant: true, rarity: 'common', dmg: 44, range: 1.8, swing: 0.5, hitAt: 0.18, switchTime: 0.3, knock: 1.5, model: { kind: 'melee', head: 'machete' } },
  tomahawk: { id: 'tomahawk', name: 'Tomahawk', slot: 'melee', melee: true, enchant: true, rarity: 'common', dmg: 40, range: 1.75, swing: 0.42, hitAt: 0.15, switchTime: 0.25, knock: 1.5, model: { kind: 'melee', head: 'axe' } },
  sabre: { id: 'sabre', name: 'Cavalry sabre', slot: 'melee', melee: true, enchant: true, rarity: 'common', dmg: 38, range: 2.1, swing: 0.4, hitAt: 0.13, switchTime: 0.3, knock: 1.2, model: { kind: 'melee', head: 'sabre' } },
  sledge: { id: 'sledge', name: 'Sledgehammer', slot: 'melee', melee: true, enchant: true, rarity: 'rare', weight: 0.88, dmg: 62, range: 1.9, swing: 0.95, hitAt: 0.4, switchTime: 0.5, knock: 7, throw: 2, model: { kind: 'melee', head: 'hammer' } },
});
WEAPONS.dragoon.knock = 2.6; WEAPONS.dragoon.throw = 1.3; WEAPONS.buffalo.knock = 3.5; WEAPONS.buffalo.throw = 1.8; WEAPONS.scoped.knock = 2.5; WEAPONS.scoped.throw = 1.5;
WEAPONS.shotgun.knock = 3.2; WEAPONS.shotgun.throw = 1.4; WEAPONS.revolver.knock = 1; WEAPONS.lever.knock = 1.4; WEAPONS.dual.knock = 0.9; WEAPONS.hatchet.knock = 2; WEAPONS.knife.knock = 1;
WEAPONS.dragoon.rarity = WEAPONS.scoped.rarity = WEAPONS.buffalo.rarity = 'rare';
for (const k in WEAPONS) WEAPONS[k].rarity = WEAPONS[k].rarity || 'common';
const RARITY = { common: { name: 'Common', col: '#e8d8b0', hex: 0xffd27a }, rare: { name: 'Rare', col: '#7ac8ff', hex: 0x5ab8ff }, legendary: { name: 'Legendary', col: '#ff8af0', hex: 0xff5ae0 } };
// Crate melee weapons roll one of these. Named like "Galvanic machete".
const MELEE_FX = {
  serrated: { name: 'Serrated', col: 0xff5040, desc: 'every cut bleeds' },
  galvanic: { name: 'Galvanic', col: 0x60e8ff, desc: 'shocks and stuns' },
  burning: { name: 'Burning', col: 0xff9a30, desc: 'sets them on fire' },
  heavy: { name: 'Heavy', col: 0xc0c0c0, desc: 'knocks them off their feet' },
  thirsty: { name: 'Thirsty', col: 0xb0203a, desc: 'heals you on every hit' },
  rattler: { name: 'Rattler', col: 0x8adf40, desc: 'poisons, slows and blurs' },
};

// ---- base guns added for the loadout ----
Object.assign(WEAPONS, {
  navy: { id: 'navy', name: 'Navy revolver', slot: 'sidearm', focus: true, noADS: true, acc: { min: 0.22, max: 7, bloom: 0.26, focusBloom: 0.16 }, dmg: 30, pellets: 1, range: 90, mag: 6,
    reload: { type: 'single', start: 0.3, each: 0.45, end: 0.25 }, cadence: { type: 'cock', time: 0.3 }, adsFov: 62, adsTime: 0.2, adsSway: 0.0045, adsSpread: 0.12,
    hip: { still: 0.9, move: 3.4, air: 9, bloom: 2.2, recover: 6, crouch: 0.75 }, recoil: { pitch: 0.045, yaw: 0.014, recover: 7.5, kick: 0.95 }, falloff: { start: 22, end: 55, min: 0.6 }, knock: 0.9, sound: 'revolver', switchTime: 0.25,
    model: { kind: 'revolver', barrel: 0.2, finish: 0x9a8a6a, grip: 0x6a4428 } },
  volcanic: { id: 'volcanic', name: 'Lever pistol', slot: 'sidearm', focus: true, noADS: true, acc: { min: 0.3, max: 7, bloom: 0.24, focusBloom: 0.15 }, dmg: 26, pellets: 1, range: 80, mag: 10,
    reload: { type: 'single', start: 0.4, each: 0.32, end: 0.3 }, cadence: { type: 'lever', time: 0.3 }, adsFov: 64, adsTime: 0.2, adsSway: 0.0045, adsSpread: 0.14,
    hip: { still: 1, move: 3.5, air: 9, bloom: 2, recover: 6, crouch: 0.75 }, recoil: { pitch: 0.04, yaw: 0.014, recover: 8, kick: 0.85 }, falloff: { start: 15, end: 45, min: 0.55 }, knock: 0.8, sound: 'lever', switchTime: 0.25,
    model: { kind: 'lever', barrel: 0.16, stock: 'grip' } },
  derringer: { id: 'derringer', name: 'Pocket pistol', slot: 'sidearm', focus: true, noADS: true, acc: { min: 0.5, max: 7, bloom: 0.4, focusBloom: 0.3 }, dmg: 48, pellets: 1, range: 30, mag: 2,
    reload: { type: 'all', time: 1.1 }, cadence: { type: 'cock', time: 0.25 }, adsFov: 68, adsTime: 0.15, adsSway: 0.005, adsSpread: 0.4,
    hip: { still: 1, move: 3, air: 8, bloom: 2.6, recover: 7, crouch: 0.75 }, recoil: { pitch: 0.07, yaw: 0.02, recover: 8, kick: 1.2 }, falloff: { start: 4, end: 15, min: 0.35 }, knock: 1.4, sound: 'revolver', switchTime: 0.12,
    model: { kind: 'revolver', barrel: 0.05, chambers: 2, cylR: 0.016, finish: 0xc8a050, grip: 0x3a2014 } },
  henry: { id: 'henry', name: 'Brass-frame repeater', slot: 'primary', twoHanded: true, dmg: 34, pellets: 1, range: 140, mag: 15,
    reload: { type: 'single', start: 0.45, each: 0.32, end: 0.35 }, cadence: { type: 'lever', time: 0.38 }, adsFov: 58, adsTime: 0.25, adsSway: 0.004, adsSpread: 0.1,
    hip: { still: 1.4, move: 4.4, air: 9, bloom: 2.2, recover: 5.5, crouch: 0.75 }, recoil: { pitch: 0.06, yaw: 0.018, recover: 6.5, kick: 1.1 }, falloff: { start: 30, end: 70, min: 0.6 }, knock: 1.2, sound: 'lever', switchTime: 0.4,
    model: { kind: 'lever', barrel: 0.5, stock: true } },
  spencer: { id: 'spencer', name: 'Tube-fed carbine', slot: 'primary', twoHanded: true, caliber: 'high', dmg: 46, pellets: 1, range: 150, mag: 7,
    reload: { type: 'all', time: 2.2 }, cadence: { type: 'lever', time: 0.55 }, adsFov: 56, adsTime: 0.27, adsSway: 0.0042, adsSpread: 0.08,
    hip: { still: 1.4, move: 4.4, air: 9, bloom: 2.6, recover: 5, crouch: 0.75 }, recoil: { pitch: 0.08, yaw: 0.02, recover: 6, kick: 1.4 }, falloff: { start: 30, end: 80, min: 0.65 }, knock: 1.8, sound: 'buffalo', switchTime: 0.45,
    model: { kind: 'lever', barrel: 0.4, stock: true } },
  pump: { id: 'pump', name: 'Trench pump', slot: 'primary', twoHanded: true, caliberClose: 6, dmg: 11, pellets: 8, pelletSpread: 4.5, range: 40, mag: 5,
    reload: { type: 'single', start: 0.4, each: 0.45, end: 0.35 }, cadence: { type: 'lever', time: 0.6 }, adsFov: 62, adsTime: 0.25, adsSway: 0.005, adsSpread: 0.8,
    hip: { still: 2.2, move: 4.8, air: 9, bloom: 3, recover: 4.5, crouch: 0.85 }, recoil: { pitch: 0.13, yaw: 0.035, recover: 5, kick: 2.1 }, falloff: { start: 8, end: 26, min: 0.3 }, knock: 3, throw: 1.3, sound: 'shotgun', switchTime: 0.45,
    model: { kind: 'shotgun', barrel: 0.5, stock: true } },
});
for (const k in WEAPONS) WEAPONS[k].rarity = WEAPONS[k].rarity || 'common';

// guns get real material response: steel and brass catch highlights, wood stays satin
const STEEL = () => phong(0x3e4248, 80, { specular: 0x77808a }), DARKSTEEL = () => phong(0x23252a, 70, { specular: 0x5a6068 }), WOOD = () => phong(0x6e4424, 22, { specular: 0x2a1c10 }), BRASS = () => phong(0x9d7f3e, 90, { specular: 0xb08a40 });
// barrels, tubes and handles modelled as long thin boxes become rounded cylinders
function roundBarrels(g) {
  if (!GEO.cylZ) { GEO.cylZ = new THREE.CylinderGeometry(0.5, 0.5, 1, 12); GEO.cylZ.rotateX(Math.PI / 2); }
  g.traverse(m => { if (!m.isMesh || m.geometry !== GEO.box) return; const s = m.scale, thin = Math.max(s.x, s.y); if (s.z > thin * 4 && Math.abs(s.x - s.y) < thin * 0.35 && thin < 0.06) m.geometry = GEO.cylZ; });
  return g;
}

// Gun models: meters, barrel along -z, origin at the grip. sightY = height of the sight line.
function buildGunModel(id, simple) {
  const g = new THREE.Group(), parts = {}; let sightY = 0.05, muzzle = new V3(0, 0.03, -0.5);
  const b = (w, h, d, m, x, y, z, parent = g) => { const k = mbox(w, h, d, m, x, y, z, parent); k.castShadow = !simple; k.receiveShadow = !simple; return k; };
  const dt = (...a) => simple ? null : b(...a); // small detail parts, skipped on third-person and dropped guns
  if (id === 'revolver') {
    b(0.032, 0.05, 0.11, STEEL(), 0, 0.018, -0.015);
    parts.cyl = new THREE.Group(); parts.cyl.position.set(0, 0.022, -0.035); g.add(parts.cyl);
    const c = mcyl(0.023, 0.045, DARKSTEEL(), 0, 0, 0, parts.cyl); c.rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; dt(0.006, 0.006, 0.047, M(0x121314), Math.cos(a) * 0.014, Math.sin(a) * 0.014, 0, parts.cyl); }
    b(0.02, 0.02, 0.16, STEEL(), 0, 0.034, -0.14);
    dt(0.008, 0.008, 0.12, STEEL(), 0, 0.018, -0.12);
    dt(0.004, 0.012, 0.008, M(0x101010), 0, 0.05, -0.215);
    b(0.03, 0.008, 0.05, STEEL(), 0, 0.046, 0.0);
    dt(0.01, 0.008, 0.012, M(0x101010), 0.009, 0.052, 0.02); dt(0.01, 0.008, 0.012, M(0x101010), -0.009, 0.052, 0.02);
    parts.hammer = new THREE.Group(); parts.hammer.position.set(0, 0.035, 0.035); g.add(parts.hammer);
    b(0.01, 0.032, 0.012, DARKSTEEL(), 0, 0.016, 0, parts.hammer);
    const grip = b(0.028, 0.085, 0.036, WOOD(), 0, -0.035, 0.045); grip.rotation.x = 0.3;
    dt(0.006, 0.025, 0.03, STEEL(), 0, -0.012, 0.004);
    sightY = 0.056; muzzle = new V3(0, 0.034, -0.225);
  } else if (id === 'lever') {
    b(0.036, 0.065, 0.15, BRASS(), 0, 0.012, -0.02);
    b(0.022, 0.022, 0.6, STEEL(), 0, 0.03, -0.39); b(0.018, 0.018, 0.5, STEEL(), 0, 0.008, -0.34);
    b(0.04, 0.042, 0.24, WOOD(), 0, 0.012, -0.21);
    const st = b(0.036, 0.07, 0.3, WOOD(), 0, -0.022, 0.2); st.rotation.x = -0.14;
    parts.lever = new THREE.Group(); parts.lever.position.set(0, -0.02, 0.0); g.add(parts.lever);
    b(0.008, 0.012, 0.12, STEEL(), 0, -0.012, 0.03, parts.lever); b(0.008, 0.045, 0.012, STEEL(), 0, -0.035, 0.085, parts.lever);
    dt(0.004, 0.014, 0.008, M(0x101010), 0, 0.048, -0.68);
    dt(0.006, 0.012, 0.006, M(0x101010), 0.007, 0.049, -0.2); dt(0.006, 0.012, 0.006, M(0x101010), -0.007, 0.049, -0.2);
    sightY = 0.055; muzzle = new V3(0, 0.03, -0.69);
  } else if (id === 'shotgun') {
    b(0.022, 0.022, 0.5, STEEL(), 0.012, 0.03, -0.33); b(0.022, 0.022, 0.5, STEEL(), -0.012, 0.03, -0.33);
    dt(0.008, 0.006, 0.5, DARKSTEEL(), 0, 0.044, -0.33);
    b(0.045, 0.055, 0.1, STEEL(), 0, 0.018, -0.03);
    b(0.04, 0.03, 0.18, WOOD(), 0, 0.012, -0.17);
    const st = b(0.04, 0.075, 0.3, WOOD(), 0, -0.022, 0.18); st.rotation.x = -0.15;
    parts.hammer = new THREE.Group(); parts.hammer.position.set(0, 0.045, 0.0); g.add(parts.hammer);
    b(0.008, 0.02, 0.01, DARKSTEEL(), 0.014, 0.008, 0, parts.hammer); b(0.008, 0.02, 0.01, DARKSTEEL(), -0.014, 0.008, 0, parts.hammer);
    dt(0.007, 0.007, 0.007, M(0xd8d0b0), 0, 0.05, -0.575);
    sightY = 0.052; muzzle = new V3(0, 0.03, -0.58);
  } else if (id === 'buffalo') {
    b(0.028, 0.028, 0.76, DARKSTEEL(), 0, 0.032, -0.47);
    b(0.04, 0.07, 0.14, M(0x5d5048), 0, 0.012, -0.03);
    b(0.04, 0.04, 0.22, WOOD(), 0, 0.012, -0.2);
    const st = b(0.04, 0.08, 0.34, WOOD(), 0, -0.026, 0.21); st.rotation.x = -0.12;
    parts.lever = new THREE.Group(); parts.lever.position.set(0, -0.02, 0.0); g.add(parts.lever);
    b(0.008, 0.045, 0.012, STEEL(), 0, -0.03, 0.05, parts.lever);
    dt(0.006, 0.02, 0.006, M(0x101010), 0.007, 0.056, -0.1); dt(0.006, 0.02, 0.006, M(0x101010), -0.007, 0.056, -0.1);
    dt(0.004, 0.02, 0.008, M(0x101010), 0, 0.056, -0.84);
    sightY = 0.066; muzzle = new V3(0, 0.032, -0.85);
  } else if (id === 'dragoon') {
    // bigger frame, long octagonal barrel, dark case-hardened steel
    b(0.038, 0.06, 0.13, M(0x3b3530), 0, 0.02, -0.02);
    parts.cyl = new THREE.Group(); parts.cyl.position.set(0, 0.024, -0.04); g.add(parts.cyl);
    const c = mcyl(0.027, 0.055, DARKSTEEL(), 0, 0, 0, parts.cyl); c.rotation.x = Math.PI / 2;
    if (!simple) for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; b(0.007, 0.007, 0.057, M(0x121314), Math.cos(a) * 0.016, Math.sin(a) * 0.016, 0, parts.cyl); }
    b(0.024, 0.024, 0.24, DARKSTEEL(), 0, 0.037, -0.2);
    b(0.012, 0.012, 0.16, STEEL(), 0, 0.017, -0.16);
    dt(0.005, 0.014, 0.01, M(0x101010), 0, 0.055, -0.315);
    b(0.034, 0.009, 0.06, M(0x3b3530), 0, 0.053, 0.0);
    dt(0.011, 0.008, 0.012, M(0x101010), 0.01, 0.058, 0.024); dt(0.011, 0.008, 0.012, M(0x101010), -0.01, 0.058, 0.024);
    parts.hammer = new THREE.Group(); parts.hammer.position.set(0, 0.04, 0.04); g.add(parts.hammer);
    b(0.012, 0.036, 0.014, DARKSTEEL(), 0, 0.018, 0, parts.hammer);
    const grip = b(0.032, 0.1, 0.04, M(0x4a2c16), 0, -0.04, 0.05); grip.rotation.x = 0.28;
    sightY = 0.062; muzzle = new V3(0, 0.037, -0.32);
  } else if (id === 'scoped') {
    b(0.022, 0.022, 0.7, DARKSTEEL(), 0, 0.03, -0.43);
    b(0.04, 0.06, 0.16, M(0x3b3530), 0, 0.012, -0.03);
    b(0.04, 0.04, 0.26, WOOD(), 0, 0.01, -0.22);
    const st = b(0.04, 0.08, 0.34, WOOD(), 0, -0.026, 0.21); st.rotation.x = -0.12;
    parts.lever = new THREE.Group(); parts.lever.position.set(0.02, 0.03, 0.02); g.add(parts.lever);
    b(0.04, 0.008, 0.008, STEEL(), 0.02, 0, 0, parts.lever); b(0.012, 0.012, 0.012, STEEL(), 0.042, 0, 0, parts.lever);
    // Malcolm scope: long thin tube with mounts
    const tube = mcyl(0.012, 0.52, M(0x1a1a1c), 0, 0.075, -0.22, g); tube.rotation.x = Math.PI / 2; tube.castShadow = !simple;
    const eye = mcyl(0.017, 0.06, M(0x1a1a1c), 0, 0.075, 0.03, g); eye.rotation.x = Math.PI / 2;
    const obj = mcyl(0.019, 0.06, M(0x1a1a1c), 0, 0.075, -0.47, g); obj.rotation.x = Math.PI / 2;
    b(0.01, 0.03, 0.012, STEEL(), 0, 0.055, -0.08); b(0.01, 0.03, 0.012, STEEL(), 0, 0.055, -0.4);
    sightY = 0.075; muzzle = new V3(0, 0.03, -0.79);
  } else if (id === 'beer' || id === 'beerBroken') {
    // held by the neck, body pointing forward
    const glass = glassMat(0x3f5f22);
    const neck = mcyl(0.013, 0.1, glass, 0, 0, -0.02, g); neck.rotation.x = Math.PI / 2;
    if (id === 'beer') {
      const body = mcyl(0.033, 0.17, glass, 0, 0, -0.155, g); body.rotation.x = Math.PI / 2;
      b(0.068, 0.05, 0.07, M(0xe8d8b0), 0, 0, -0.16);
      muzzle = new V3(0, 0, -0.24);
    } else {
      const stub = mcyl(0.033, 0.035, glass, 0, 0, -0.085, g); stub.rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const s = b(0.012, 0.006, 0.05 + (i % 2) * 0.035, glass, Math.cos(a) * 0.024, Math.sin(a) * 0.024, -0.12 - (i % 2) * 0.015); s.rotation.set(Math.sin(a) * 0.25, -Math.cos(a) * 0.25, 0); }
      muzzle = new V3(0, 0, -0.16);
    }
  } else if (id === 'knife') {
    b(0.026, 0.032, 0.11, WOOD(), 0, 0, 0.02); b(0.05, 0.012, 0.012, BRASS(), 0, 0, -0.04);
    b(0.006, 0.036, 0.22, M(0xc9ccd2), 0, 0.004, -0.155); b(0.006, 0.018, 0.04, M(0xc9ccd2), 0, 0.012, -0.275);
    muzzle = new V3(0, 0, -0.28);
  } else if (WEAPONS[id] && WEAPONS[id].model) return buildSpecGun(id, WEAPONS[id].model, simple);
  else if (id === 'hatchet') {
    b(0.026, 0.032, 0.42, WOOD(), 0, 0, -0.1);
    b(0.016, 0.1, 0.07, DARKSTEEL(), 0, 0.035, -0.28); b(0.006, 0.12, 0.02, M(0xc9ccd2), 0, 0.04, -0.325);
    muzzle = new V3(0, 0.04, -0.33);
  }
  roundBarrels(g);
  return { group: g, sightY, muzzle, parts, id };
}

// Crate weapons are built from a small spec so there can be many of them.
function buildSpecGun(id, S, simple) {
  const g = new THREE.Group(), parts = {}; let sightY = 0.05, muzzle = new V3(0, 0.03, -0.5);
  const b = (w, h, d, m, x, y, z, parent = g) => { const k = mbox(w, h, d, m, x, y, z, parent); k.castShadow = !simple; return k; };
  const dt = (...a) => simple ? null : b(...a);
  const cyl = (r, len, m, x, y, z, parent = g) => { const c = mcyl(r, len, m, x, y, z, parent); c.rotation.x = Math.PI / 2; c.castShadow = !simple; return c; };
  if (S.kind === 'revolver') {
    const fin = M(S.finish || 0x6a6e74), bl = S.barrel, bore = S.bore || 0.02, cr = S.cylR || 0.024, n = S.chambers || 6;
    b(0.034, 0.055, 0.12, fin, 0, 0.018, -0.015);
    parts.cyl = new THREE.Group(); parts.cyl.position.set(0, 0.023, -0.035); g.add(parts.cyl);
    cyl(cr, 0.05, DARKSTEEL(), 0, 0, 0, parts.cyl);
    if (!simple) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; b(0.006, 0.006, 0.052, M(0x121314), Math.cos(a) * cr * 0.6, Math.sin(a) * cr * 0.6, 0, parts.cyl); }
    b(bore, bore, bl, fin, 0, 0.036, -0.06 - bl / 2);
    if (S.ports) for (let i = 0; i < 3; i++) dt(bore + 0.004, 0.006, 0.012, M(0x101010), 0, 0.036 + bore / 2, -0.08 - bl + 0.03 + i * 0.02);
    if (S.under) cyl(0.012, bl * 0.7, DARKSTEEL(), 0, 0.012, -0.06 - bl * 0.35);
    dt(0.004, 0.012, 0.008, M(0x101010), 0, 0.05 + bore / 2 - 0.01, -0.06 - bl + 0.01);
    b(0.032, 0.008, 0.05, fin, 0, 0.048, 0.0);
    parts.hammer = new THREE.Group(); parts.hammer.position.set(0, 0.037, 0.035); g.add(parts.hammer); b(0.01, 0.032, 0.012, DARKSTEEL(), 0, 0.016, 0, parts.hammer);
    const grip = b(0.029, 0.088, 0.038, M(S.grip || 0x5a3a20), 0, -0.036, 0.047); grip.rotation.x = 0.3;
    sightY = 0.056; muzzle = new V3(0, 0.036, -0.07 - bl);
  } else if (S.kind === 'shotgun') {
    const bl = S.barrel, bore = S.bore || 0.022;
    if (S.twin) { b(bore, bore, bl, STEEL(), 0.012, 0.03, -0.1 - bl / 2); b(bore, bore, bl, STEEL(), -0.012, 0.03, -0.1 - bl / 2); }
    else { cyl(bore, bl, DARKSTEEL(), 0, 0.03, -0.1 - bl / 2); dt(bore * 1.6, 0.012, 0.03, BRASS(), 0, 0.03, -0.12 - bl + 0.03); }
    b(0.045, 0.055, 0.1, STEEL(), 0, 0.018, -0.03);
    if (S.stock === 'grip') { const gp = b(0.034, 0.1, 0.04, WOOD(), 0, -0.04, 0.05); gp.rotation.x = 0.35; }
    else { b(0.04, 0.03, Math.min(0.3, bl * 0.4), WOOD(), 0, 0.012, -0.16); const st = b(0.045, 0.08, 0.34, WOOD(), 0, -0.024, 0.2); st.rotation.x = -0.14; }
    parts.hammer = new THREE.Group(); parts.hammer.position.set(0, 0.045, 0.0); g.add(parts.hammer); b(0.008, 0.02, 0.01, DARKSTEEL(), 0, 0.008, 0, parts.hammer);
    sightY = 0.052; muzzle = new V3(0, 0.03, -0.12 - bl);
  } else if (S.kind === 'lever') {
    const bl = S.barrel;
    b(0.036, 0.065, 0.15, BRASS(), 0, 0.012, -0.02); b(0.022, 0.022, bl, STEEL(), 0, 0.03, -0.09 - bl / 2); b(0.04, 0.042, bl * 0.6, WOOD(), 0, 0.012, -0.08 - bl * 0.3);
    if (S.stock === true) { const st = b(0.045, 0.08, 0.32, WOOD(), 0, -0.022, 0.2); st.rotation.x = -0.14; } else { const gp = b(0.034, 0.09, 0.045, WOOD(), 0, -0.035, 0.06); gp.rotation.x = 0.4; }
    parts.lever = new THREE.Group(); parts.lever.position.set(0, -0.02, 0.0); g.add(parts.lever);
    b(0.008, 0.012, 0.12, STEEL(), 0, -0.012, 0.03, parts.lever); b(0.008, 0.045, 0.012, STEEL(), 0, -0.035, 0.085, parts.lever);
    sightY = 0.055; muzzle = new V3(0, 0.03, -0.1 - bl);
  } else if (S.kind === 'smg') {
    const bl = S.barrel;
    b(0.042, 0.07, 0.24, M(0x2e3036), 0, 0.012, -0.08); cyl(0.013, bl, DARKSTEEL(), 0, 0.03, -0.2 - bl / 2);
    if (S.drum) { const d = mcyl(0.07, 0.045, M(0x24262a), 0, -0.06, -0.12, g); d.rotation.z = Math.PI / 2; d.castShadow = !simple; }
    else b(0.024, 0.13, 0.04, M(0x24262a), 0, -0.07, -0.1);
    const gp = b(0.03, 0.09, 0.04, WOOD(), 0, -0.05, 0.03); gp.rotation.x = 0.3;
    if (S.stock) { const st = b(0.036, 0.06, 0.26, WOOD(), 0, -0.01, 0.17); st.rotation.x = -0.1; } else b(0.012, 0.05, 0.18, STEEL(), 0, 0.0, 0.14);
    if (S.coil) { for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 5, 12), new THREE.MeshBasicMaterial({ color: S.coil })); r.position.set(0, 0.03, -0.24 - i * 0.035); g.add(r); } }
    sightY = 0.062; muzzle = new V3(0, 0.03, -0.2 - bl);
  } else if (S.kind === 'rifle') {
    const bl = S.barrel, bore = S.bore || 0.026;
    if (S.twin) { b(bore, bore, bl, DARKSTEEL(), 0.015, 0.032, -0.1 - bl / 2); b(bore, bore, bl, DARKSTEEL(), -0.015, 0.032, -0.1 - bl / 2); } else b(bore, bore, bl, DARKSTEEL(), 0, 0.032, -0.1 - bl / 2);
    b(0.06, 0.07, 0.16, M(0x5d5048), 0, 0.012, -0.03); b(0.05, 0.045, 0.28, WOOD(), 0, 0.01, -0.22);
    const st = b(0.05, 0.09, 0.36, WOOD(), 0, -0.028, 0.22); st.rotation.x = -0.12;
    dt(0.03, 0.01, 0.1, BRASS(), 0, 0.05, -0.02);
    parts.hammer = new THREE.Group(); parts.hammer.position.set(0, 0.05, 0.02); g.add(parts.hammer); b(0.01, 0.024, 0.012, DARKSTEEL(), 0.02, 0.01, 0, parts.hammer); b(0.01, 0.024, 0.012, DARKSTEEL(), -0.02, 0.01, 0, parts.hammer);
    sightY = 0.07; muzzle = new V3(0, 0.032, -0.12 - bl);
  } else if (S.kind === 'gatling') {
    parts.spin = new THREE.Group(); parts.spin.position.set(0, 0.02, -0.35); g.add(parts.spin);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; cyl(0.009, 0.5, DARKSTEEL(), Math.cos(a) * 0.028, Math.sin(a) * 0.028, 0, parts.spin); }
    cyl(0.045, 0.03, BRASS(), 0, 0, 0.2, parts.spin); cyl(0.045, 0.02, BRASS(), 0, 0, -0.22, parts.spin);
    b(0.09, 0.1, 0.22, M(0x3b3530), 0, 0.02, 0.0); b(0.05, 0.14, 0.12, BRASS(), 0.06, 0.03, -0.02);
    const gp = b(0.03, 0.1, 0.04, WOOD(), 0, -0.07, 0.08); gp.rotation.x = 0.3; b(0.02, 0.02, 0.18, STEEL(), 0, 0.1, -0.05);
    sightY = 0.1; muzzle = new V3(0, 0.02, -0.62);
  } else if (S.kind === 'melee') {
    const h = S.head;
    const handle = h === 'hammer' ? 0.62 : h === 'sabre' ? 0.14 : h === 'axe' ? 0.42 : 0.14;
    b(0.028, 0.032, handle, WOOD(), 0, 0, 0.04 - handle / 2);
    let edge;
    if (h === 'machete') { b(0.006, 0.05, 0.42, M(0xb8bcc2), 0, 0.01, -0.3); edge = b(0.004, 0.012, 0.4, M(0xd8dce2), 0, -0.018, -0.3); b(0.04, 0.012, 0.014, BRASS(), 0, 0, -0.07); }
    else if (h === 'sabre') { const bl = b(0.005, 0.03, 0.7, M(0xc9ccd2), 0, 0.02, -0.45); bl.rotation.x = -0.08; edge = b(0.003, 0.008, 0.66, M(0xe0e4ea), 0, 0.005, -0.45); edge.rotation.x = -0.08; b(0.06, 0.05, 0.012, BRASS(), 0, 0.01, -0.08); }
    else if (h === 'axe') { b(0.016, 0.09, 0.06, DARKSTEEL(), 0, 0.035, -0.4); edge = b(0.006, 0.11, 0.018, M(0xd0d4da), 0, 0.04, -0.44); for (let i = 0; i < 3; i++) dt(0.03, 0.006, 0.01, M(0x9a3a20), 0, -0.01, -0.3 + i * 0.03); }
    else { b(0.09, 0.08, 0.13, DARKSTEEL(), 0, 0.01, -0.62); edge = b(0.095, 0.085, 0.01, M(0x9aa0a8), 0, 0.01, -0.69); }
    parts.edge = edge;
    muzzle = new V3(0, 0.02, h === 'sabre' ? -0.8 : -0.5);
  }
  roundBarrels(g);
  return { group: g, sightY, muzzle, parts, id };
}
function tintEdge(model, w) { if (w && w.fx && model && model.parts.edge) model.parts.edge.material = new THREE.MeshBasicMaterial({ color: MELEE_FX[w.fx].col }); }

/* ---------------- Character rig ---------------- */
// ---------------- 1800s western looks: gender, outfit, hat, hair, face, period colors ----------------
const LOOK_POOL = {
  skin: [0xe6bc98, 0xd4a07c, 0xbc8a64, 0xa06e4a, 0x84563a, 0x6a432c],
  hair: [0x1a120c, 0x2e1c10, 0x4a2c16, 0x6e4422, 0x9a6a38, 0xc49a5a, 0x7a2e16, 0x8a8680],
  shirt: [0xd8cfb8, 0xc4b89c, 0xa89a7c, 0x7a2a22, 0x4a5466, 0x5c5a3e, 0x8a6a4a, 0x3a3430, 0x9a8a72],
  vest: [0x2a2420, 0x3a2a1e, 0x4a3a2a, 0x2c3036, 0x5a3a28, 0x1e1a18, 0x5e4a34, 0x3a2c34],
  coat: [0x6e5640, 0x4a3a2a, 0x2a2420, 0x8a7458, 0x3d342c, 0x5a4a3a, 0x2e2a2c, 0x5e3a2a],
  pants: [0x3a3632, 0x4d3b2b, 0x5a4e40, 0x2d3440, 0x6a5a48, 0x2a2622, 0x4a4238],
  skirt: [0x4a3a2a, 0x5e3a2a, 0x2e2a2c, 0x6a5a48, 0x3d342c, 0x5a2a2a],
  hat: [0x1a1512, 0x3a2a1e, 0x6b4a2e, 0xb8955a, 0x2b2b2b, 0x8a7a5a, 0x4a3525, 0x5a4636],
  scarf: [0x7e2a1e, 0x151515, 0x355c6a, 0x9a7a2a, 0xd8cfb8, 0x5a2a4a, 0x3a4a2a],
  boots: [0x1c1410, 0x2a1c12, 0x3a2618, 0x4a2e1a],
};
const BOT_ROSTER = [['Hollis', 'm'], ['Annie', 'f'], ['Calloway', 'm'], ['Belle', 'f'], ['Mercer', 'm'], ['Etta', 'f'], ['Dutch', 'm'], ['Pearl', 'f'], ['Boone', 'm'], ['Josephine', 'f']];
function makeLook(gender) {
  const P = (k) => pick(LOOK_POOL[k]), f = gender === 'f';
  const outfit = pick(f ? ['vest', 'duster', 'poncho', 'riding', 'riding', 'gambler'] : ['vest', 'duster', 'duster', 'poncho', 'gambler', 'sheriff', 'bandit', 'chaps']);
  const L = { gender: f ? 'f' : 'm', outfit, skin: P('skin'), hair: P('hair'), shirt: P('shirt'), vest: P('vest'), coat: P('coat'), pants: f && outfit === 'riding' ? P('skirt') : P('pants'), hat: P('hat'), scarf: P('scarf'), boots: P('boots'),
    accent: pick([0xb8955a, 0x8a2a1e, 0xd8cfb8, 0x355c6a]) };
  L.hatStyle = pick(f ? ['flat', 'cattleman', 'bowler', 'flat'] : ['cattleman', 'cattleman', 'flat', 'bowler', 'slouch', 'wide']);
  if (outfit === 'gambler') { L.hatStyle = pick(['flat', 'bowler']); L.coat = pick([0x1e1a18, 0x3a1a1a, 0x2a2430]); L.shirt = 0xd8cfb8; }
  if (outfit === 'sheriff') L.hatStyle = 'cattleman';
  L.hairStyle = f ? pick(['long', 'braid', 'bun']) : pick(['short', 'short', 'short', 'long']);
  L.beard = f ? 'none' : pick(['none', 'mustache', 'mustache', 'full', 'goatee', 'none']);
  L.sleeve = outfit === 'duster' || outfit === 'gambler' ? L.coat : L.shirt;
  return L;
}
// hats: the crown and brim are the hit boxes, details are decoration. Also used for the prop that falls off.
function buildHat(g, pal, hit, deco) {
  const H = lam(pal.hat || 0x2b1f16), band = lam(0x1a120c), st = pal.hatStyle || 'cattleman', sc = pal.gender === 'f' ? 0.93 : 1;
  const C = (r1, r2, h, y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1 * sc, r2 * sc, h, 14), H); m.position.y = y; m.castShadow = true; g.add(m); return m; };
  if (st === 'flat') { hit(C(0.1, 0.105, 0.1, 0.14)); hit(C(0.21, 0.21, 0.016, 0.09)); deco(mcyl(0.107 * sc, 0.022, band, 0, 0.1, 0, g)); }
  else if (st === 'bowler') { const cr = new THREE.Mesh(GEO.sphere, H); cr.scale.set(0.11 * sc, 0.09, 0.115 * sc); cr.position.y = 0.11; cr.castShadow = true; g.add(cr); hit(cr); hit(C(0.155, 0.155, 0.014, 0.088)); deco(mcyl(0.112 * sc, 0.02, band, 0, 0.098, 0, g)); }
  else if (st === 'wide') { hit(C(0.07, 0.1, 0.16, 0.17)); hit(C(0.28, 0.27, 0.018, 0.088)); deco(mcyl(0.098, 0.026, lam(pal.accent || 0x8a2a1e), 0, 0.105, 0, g)); }
  else if (st === 'slouch') { hit(mbox(0.2 * sc, 0.1, 0.2 * sc, H, 0, 0.14, 0, g)); const b = hit(mbox(0.4 * sc, 0.02, 0.42 * sc, H, 0, 0.086, 0, g)); b.rotation.x = 0.12; deco(mbox(0.205 * sc, 0.022, 0.205 * sc, band, 0, 0.1, 0, g)); }
  else { hit(mbox(0.2 * sc, 0.12, 0.21 * sc, H, 0, 0.15, 0, g)); hit(mbox(0.38 * sc, 0.022, 0.4 * sc, H, 0, 0.088, 0, g)); deco(mbox(0.205 * sc, 0.025, 0.215 * sc, band, 0, 0.105, 0, g)); deco(mbox(0.05, 0.02, 0.15 * sc, lam(0x120c08), 0, 0.205, 0, g)); }
}
// clothes, hair, faces and gear on top of the hit boxes. None of this can be shot: hits still land on the same body boxes.
function decorateRig(R, pal, vis) {
  const T0 = R.torso, head = R.head, o = pal.outfit || 'vest', f = pal.gender === 'f';
  const B = (w, h, d, c, x, y, z, p) => vis(mbox(w, h, d, typeof c === 'number' ? lam(c) : c, x, y, z, p));
  const coat = lam(pal.coat || 0x5a4632), brass = 0xb8955a, leather = 0x4a2e1a;
  // gun belt with cartridge loops and a buckle
  B(0.37, 0.055, 0.235, leather, 0, 0.02, 0, T0);
  for (let i = 0; i < 9; i++) { const x = -0.17 + i * 0.042; if (Math.abs(x) > 0.03) B(0.012, 0.024, 0.012, brass, x, 0.02, -0.12, T0); }
  B(0.05, 0.045, 0.012, brass, 0, 0.02, -0.123, T0);
  // shirt collar
  for (const sx of [-1, 1]) { const c = B(0.06, 0.035, 0.02, pal.shirt, sx * 0.035, 0.588, -0.105, T0); c.rotation.z = sx * 0.35; }
  // hair and facial hair
  const hairM = lam(pal.hair || 0x2a1a10);
  B(0.235, 0.085, 0.24, hairM, 0, 0.05, 0.015, head); B(0.22, 0.1, 0.05, hairM, 0, -0.01, 0.1, head);
  if (pal.hairStyle === 'long' || pal.hairStyle === 'braid') { R.hairPiv = new THREE.Group(); R.hairPiv.position.set(0, 0.03, 0.1); head.add(R.hairPiv); }
  if (pal.hairStyle === 'long') { B(0.23, 0.3, 0.065, hairM, 0, -0.15, 0, R.hairPiv); for (const sx of [-1, 1]) B(0.03, 0.2, 0.12, hairM, sx * 0.118, -0.05, 0.03, head); }
  if (pal.hairStyle === 'braid') { B(0.05, 0.34, 0.05, hairM, 0, -0.23, 0.02, R.hairPiv); B(0.055, 0.03, 0.055, lam(pal.accent || 0x8a2a1e), 0, -0.4, 0.02, R.hairPiv); }
  if (pal.hairStyle === 'bun') { const b = B(0.1, 0.09, 0.08, hairM, 0, 0.0, 0.13, head); b.rotation.x = 0.3; }
  if (pal.beard === 'mustache' || pal.beard === 'full') { B(0.085, 0.017, 0.016, hairM, 0, -0.026, -0.113, head); for (const sx of [-1, 1]) B(0.013, 0.032, 0.012, hairM, sx * 0.041, -0.042, -0.108, head); }
  if (pal.beard === 'full') { B(0.17, 0.075, 0.06, hairM, 0, -0.078, -0.072, head); for (const sx of [-1, 1]) B(0.02, 0.07, 0.07, hairM, sx * 0.106, -0.015, -0.02, head); }
  if (pal.beard === 'goatee') B(0.04, 0.05, 0.03, hairM, 0, -0.083, -0.1, head);
  // boots: tall shafts and spurs
  for (const k of [R.kneeL, R.kneeR]) { B(0.135, 0.17, 0.145, pal.boots, 0, -0.33, -0.005, k); B(0.01, 0.01, 0.05, 0x9aa0a8, 0, -0.45, 0.085, k); const sp = vis(mcyl(0.02, 0.006, lam(0x9aa0a8), 0, -0.45, 0.115, k)); sp.rotation.z = Math.PI / 2; }
  // outfits
  if (o === 'vest' || o === 'sheriff' || o === 'chaps' || o === 'bandit') {
    for (let i = 0; i < 3; i++) B(0.012, 0.012, 0.008, brass, 0.04, 0.3 + i * 0.08, -0.129, T0);
    B(0.07, 0.006, 0.006, 0xc9a24d, -0.07, 0.33, -0.128, T0); // watch chain
  }
  if (o === 'sheriff') { const s = vis(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.008, 5), lam(0xd8b45a))); s.position.set(-0.1, 0.46, -0.13); s.rotation.x = Math.PI / 2; T0.add(s); }
  if (o === 'duster' || o === 'gambler') {
    const long = o === 'duster';
    vis(mbox(0.44, 0.58, 0.035, coat, 0, 0.3, 0.13, T0)); for (const sx of [-1, 1]) { vis(mbox(0.035, 0.56, 0.26, coat, sx * 0.226, 0.3, 0, T0)); vis(mbox(0.11, 0.56, 0.03, coat, sx * 0.165, 0.3, -0.132, T0)); const lp = vis(mbox(0.12, 0.09, 0.03, coat, sx * 0.1, 0.545, -0.135, T0)); lp.rotation.z = sx * 0.45; vis(mbox(0.15, 0.06, 0.18, coat, sx * 0.25, 0.575, 0, T0)); }
    vis(mbox(0.3, 0.08, 0.06, coat, 0, 0.6, 0.1, T0));
    for (const hp of [R.hipL, R.hipR]) vis(mbox(0.2, long ? 0.62 : 0.42, 0.21, coat, 0, long ? -0.3 : -0.2, 0.025, hp)); // tails swing with the legs
    for (const e of [R.elbowL, R.elbowR]) B(0.098, 0.03, 0.098, pal.shirt, 0, -0.255, 0, e); // shirt cuffs
    if (o === 'gambler') { B(0.012, 0.08, 0.006, 0x101010, 0, 0.53, -0.129, T0); B(0.07, 0.006, 0.006, 0xc9a24d, -0.07, 0.33, -0.128, T0); }
  }
  if (o === 'poncho') {
    const pc = lam(pal.coat || 0x6e5640); vis(mbox(0.52, 0.27, 0.34, pc, 0, 0.47, 0, T0));
    for (const y of [0.4, 0.45]) vis(mbox(0.525, 0.022, 0.345, lam(y < 0.42 ? pal.accent || 0x8a2a1e : pal.shirt), 0, y, 0, T0));
    for (let i = 0; i < 10; i++) B(0.012, 0.05, 0.012, pal.coat || 0x6e5640, -0.23 + i * 0.051, 0.315, -0.165, T0); // fringe
  }
  if (o === 'chaps') for (const [hp, sx] of [[R.hipL, -1], [R.hipR, 1]]) { B(0.17, 0.44, 0.04, 0x5a3a22, 0, -0.2, -0.088, hp); for (let i = 0; i < 6; i++) B(0.012, 0.05, 0.02, 0x5a3a22, sx * 0.09, -0.06 - i * 0.065, -0.06, hp); }
  if (o === 'riding') {
    for (const hp of [R.hipL, R.hipR]) vis(mbox(0.22, 0.5, 0.235, lam(pal.pants), 0, -0.23, 0, hp)); // split riding skirt
    B(0.36, 0.06, 0.225, pal.accent || 0x8a2a1e, 0, 0.07, 0, T0); // sash
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) { const l = B(0.06, 0.006, 0.004, 0xd8cfb8, 0, 0.3 + i * 0.05, -0.128, T0); l.rotation.z = sx * 0.6; } // bodice lacing
  }
  if (o === 'bandit') { B(0.2, 0.085, 0.05, pal.scarf, 0, -0.048, -0.098, head); const t = B(0.12, 0.07, 0.04, pal.scarf, 0, -0.1, -0.085, head); t.rotation.x = -0.2; }
}

const PALETTES = {
  player: { shirt: 0xd8cfb8, vest: 0x3a2a1e, pants: 0x3d4a5e, hat: 0x2b1f16, skin: 0xc58c68, boots: 0x2a1c12, scarf: 0x7e2a1e, coat: 0x5a4632, sleeve: 0x5a4632, glove: 0x3a2618, outfit: 'duster', hatStyle: 'cattleman', gender: 'm', hair: 0x3a2414, hairStyle: 'short', beard: 'mustache' },
  dummyA: { shirt: 0xc9b89a, vest: 0x6b4a2e, pants: 0x5a4a3a, hat: 0xb8955a, skin: 0xb98a6a, boots: 0x3a2818, scarf: 0x355c6a },
  dummyB: { shirt: 0x6f8a8e, vest: 0x3b3029, pants: 0x4d3b2b, hat: 0x4a3525, skin: 0xa8765a, boots: 0x2a1c12, scarf: 0x9a7a2a },
  bot: Object.assign({ outfit: 'duster', hatStyle: 'wide', gender: 'm', hair: 0x1a120c, hairStyle: 'short', beard: 'full', coat: 0x2a2420, sleeve: 0x2a2420 }, { shirt: 0x8c2f23, vest: 0x1f1a17, pants: 0x2d3440, hat: 0x1a1512, skin: 0xc0906c, boots: 0x1c1410, scarf: 0x151515 }),
};
const DEBUG_MATS = {};
function debugMat(zone) {
  if (!DEBUG_MATS[zone]) DEBUG_MATS[zone] = new THREE.MeshBasicMaterial({ color: ZONES[zone].col, transparent: true, opacity: zone === 'heart' ? 0.95 : 0.78, depthTest: zone !== 'heart' });
  return DEBUG_MATS[zone];
}
const LAMB = {}; function lam(hex) { return LAMB[hex] || (LAMB[hex] = new THREE.MeshLambertMaterial({ color: hex })); }

function buildRig(owner, pal) {
  const R = { owner, hit: [], activeHit: [], visuals: [], cur: {}, sig: '' };
  const root = R.root = new THREE.Group();
  const body = R.body = new THREE.Group(); root.add(body);
  const hips = R.hips = new THREE.Group(); hips.position.y = 0.86; body.add(hips);
  const torso = R.torso = new THREE.Group(); hips.add(torso);
  const hb = (mesh, zone, gearKey) => { mesh.userData.zone = zone; mesh.userData.owner = owner; mesh.userData.baseMat = mesh.material; mesh.userData.gearKey = gearKey || null; R.hit.push(mesh); return mesh; };
  const vis = (mesh) => { R.visuals.push(mesh); mesh.castShadow = false; return mesh; };
  const skin = lam(pal.skin), shirt = lam(pal.shirt), vest = lam(pal.vest), pants = lam(pal.pants), boots = lam(pal.boots), sleeve = lam(pal.sleeve || pal.shirt);
  // torso
  hb(mbox(0.34, 0.25, 0.21, shirt, 0, 0.125, 0, torso), 'stomach');
  vis(mbox(0.36, 0.05, 0.23, lam(0x2a1c12), 0, 0.02, 0, torso));
  vis(mbox(0.05, 0.05, 0.02, lam(0xc9a24d), 0, 0.02, -0.12, torso));
  hb(mbox(0.42, 0.32, 0.25, vest, 0, 0.41, 0, torso), 'chest');
  vis(mbox(0.12, 0.3, 0.02, shirt, 0, 0.41, -0.128, torso));
  const heart = R.heart = hb(mbox(0.075, 0.075, 0.05, lam(0xff1e78), -0.08, 0.45, -0.12, torso), 'heart');
  heart.visible = false; heart.castShadow = false;
  hb(mbox(0.1, 0.11, 0.1, skin, 0, 0.62, 0, torso), 'neck');
  vis(mbox(0.16, 0.06, 0.14, lam(pal.scarf), 0, 0.58, -0.01, torso));
  const head = R.head = new THREE.Group(); head.position.set(0, 0.76, 0); torso.add(head);
  const hs = new THREE.Mesh(GEO.sphere, skin); hs.scale.setScalar(0.115); hs.castShadow = true; head.add(hs); hb(hs, 'head');
  vis(mbox(0.03, 0.035, 0.03, skin, 0, -0.005, -0.115, head));
  vis(mbox(0.07, 0.014, 0.02, lam(pal.gender === 'f' ? 0x8a3a30 : 0x3a2718), 0, -0.042, -0.105, head)); // mouth
  for (const sx of [-1, 1]) { vis(mbox(0.024, 0.014, 0.01, lam(0x1a120c), sx * 0.04, 0.02, -0.109, head)); vis(mbox(0.034, 0.008, 0.012, lam(pal.hair || 0x2a1a10), sx * 0.04, 0.045, -0.107, head)); } // eyes, brows
  R.cig = new THREE.Group(); R.cig.position.set(0.03, -0.045, -0.115); R.cig.rotation.set(0.2, 0.3, 0); head.add(R.cig); R.cig.visible = false;
  vis(mbox(0.012, 0.012, 0.07, lam(0xf2eee6), 0, 0, -0.03, R.cig)); vis(mbox(0.013, 0.013, 0.012, new THREE.MeshBasicMaterial({ color: 0xff6a20 }), 0, 0, -0.068, R.cig));
  R.hat = new THREE.Group(); head.add(R.hat);
  buildHat(R.hat, pal, (m) => hb(m, 'hat', 'hat'), vis);
  // round tinted spectacles: the hit box is invisible, the lenses ride on it so they vanish together
  R.glasses = hb(mbox(0.18, 0.04, 0.02, new THREE.MeshBasicMaterial({ visible: false }), 0, 0.022, -0.12, head), 'sunglasses', 'sunglasses');
  { const fr = lam(0x6a5a3a), le = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.1, metalness: 0.5 }); for (const sx of [-1, 1]) { const l = vis(mcyl(0.026, 0.006, le, sx * 0.042, 0, -0.004, R.glasses)); l.rotation.x = Math.PI / 2; const f = vis(mcyl(0.029, 0.004, fr, sx * 0.042, 0, -0.001, R.glasses)); f.rotation.x = Math.PI / 2; } vis(mbox(0.03, 0.006, 0.006, fr, 0, 0.004, -0.004, R.glasses)); }
  // shoulders
  hb(mbox(0.13, 0.12, 0.15, vest, 0.25, 0.5, 0, torso), 'shoulder'); hb(mbox(0.13, 0.12, 0.15, vest, -0.25, 0.5, 0, torso), 'shoulder');
  // gun arm (right, +x)
  R.armR = new THREE.Group(); R.armR.position.set(0.25, 0.46, 0); torso.add(R.armR);
  hb(mbox(0.1, 0.28, 0.1, sleeve, 0, -0.14, 0, R.armR), 'gunBicep', 'armR');
  R.elbowR = new THREE.Group(); R.elbowR.position.y = -0.28; R.armR.add(R.elbowR);
  hb(mbox(0.09, 0.26, 0.09, sleeve, 0, -0.13, 0, R.elbowR), 'gunHand', 'armR');
  R.handR = hb(mbox(0.09, 0.09, 0.1, skin, 0, -0.3, 0, R.elbowR), 'gunHand', 'armR');
  R.gunAnchor = new THREE.Group(); R.gunAnchor.position.set(0, -0.3, -0.01); R.gunAnchor.rotation.x = -Math.PI / 2; R.elbowR.add(R.gunAnchor);
  // support arm (left, -x)
  R.armL = new THREE.Group(); R.armL.position.set(-0.25, 0.46, 0); torso.add(R.armL);
  hb(mbox(0.1, 0.28, 0.1, sleeve, 0, -0.14, 0, R.armL), 'supportArm', 'armL');
  R.elbowL = new THREE.Group(); R.elbowL.position.y = -0.28; R.armL.add(R.elbowL);
  hb(mbox(0.09, 0.26, 0.09, sleeve, 0, -0.13, 0, R.elbowL), 'supportArm', 'armL');
  R.handL = hb(mbox(0.1, 0.11, 0.11, skin, 0, -0.3, 0, R.elbowL), 'supportHand', 'armL');
  R.gunAnchorL = new THREE.Group(); R.gunAnchorL.position.set(0, -0.3, -0.01); R.gunAnchorL.rotation.x = -Math.PI / 2; R.elbowL.add(R.gunAnchorL);
  R.bottleAnchor = new THREE.Group(); R.bottleAnchor.position.set(0, -0.33, -0.02); R.elbowL.add(R.bottleAnchor);
  const bm = makeBottleMesh(1.05); bm.group.rotation.x = Math.PI; bm.group.position.y = 0.1; R.bottleAnchor.add(bm.group); R.bottleMesh = bm.group;
  hb(mbox(0.08, 0.26, 0.08, new THREE.MeshBasicMaterial({ visible: false }), 0, -0.02, 0, R.bottleAnchor), 'bottle', 'bottle');
  // gear
  R.sling = new THREE.Group(); R.sling.position.set(0, 0.32, 0.16); R.sling.rotation.z = 0.75; torso.add(R.sling);
  hb(mbox(0.07, 0.95, 0.06, new THREE.MeshBasicMaterial({ visible: false }), 0, 0, 0.01, R.sling), 'sling', 'sling');
  R.slungAnchor = new THREE.Group(); R.slungAnchor.rotation.x = -Math.PI / 2; R.slungAnchor.position.set(0, 0.15, 0.03); R.sling.add(R.slungAnchor);
  R.strap = vis(mbox(0.05, 0.62, 0.02, lam(0x4a3020), 0, 0.35, -0.13, torso)); R.strap.rotation.z = -0.75;
  R.dyn = new THREE.Group(); R.dyn.position.set(-0.1, 0.04, -0.125); torso.add(R.dyn);
  for (let i = 0; i < 3; i++) vis(mcyl(0.013, 0.12, lam(0xb81d10), -0.02 + i * 0.02, 0, 0, R.dyn));
  vis(mbox(0.004, 0.05, 0.004, lam(0xe0d6b0), 0.0, 0.08, 0, R.dyn));
  hb(mbox(0.075, 0.13, 0.035, new THREE.MeshBasicMaterial({ visible: false }), 0, 0, 0, R.dyn), 'dynamite', 'dynamite');
  R.canteen = hb(mbox(0.05, 0.13, 0.13, lam(0x6d8a96), -0.215, 0.0, 0.04, torso), 'canteen', 'canteen');
  hb(mbox(0.06, 0.17, 0.09, lam(0x6a4122), 0.215, -0.04, -0.01, torso), 'holster');
  R.holsterGun = new THREE.Group(); R.holsterGun.position.set(0.215, 0.07, -0.01); torso.add(R.holsterGun);
  vis(mbox(0.025, 0.07, 0.035, lam(0x6e4424), 0, 0, 0.02, R.holsterGun));
  // legs
  const leg = (side, sx) => {
    const hip = new THREE.Group(); hip.position.set(sx * 0.1, 0, 0); hips.add(hip);
    hb(mbox(0.15, 0.32, 0.16, pants, 0, -0.16, 0, hip), 'thigh' + side);
    const knee = new THREE.Group(); knee.position.y = -0.38; hip.add(knee);
    hb(mbox(0.165, 0.19, 0.2, pants, 0, 0, -0.01, knee), 'knee' + side);
    hb(mbox(0.12, 0.33, 0.13, pants, 0, -0.235, 0, knee), 'calf' + side);
    hb(mbox(0.12, 0.08, 0.25, boots, 0, -0.44, -0.05, knee), 'calf' + side);
    return { hip, knee };
  };
  hb(mbox(0.11, 0.1, 0.13, pants, 0, -0.07, -0.025, hips), 'groin');
  const L = leg('L', -1), Rr = leg('R', 1); R.hipL = L.hip; R.kneeL = L.knee; R.hipR = Rr.hip; R.kneeR = Rr.knee;
  R.heldModel = null; R.heldId = null; R.slungModel = null; R.slungId = null;
  decorateRig(R, pal, vis);
  return R;
}

function rigGearActive(o, key) {
  if (!key) return true;
  if (key === 'hat') return o.gear.hat; if (key === 'sunglasses') return o.gear.sunglasses;
  if (key === 'sling') return !!o.inv.primary && o.held !== 'primary';
  if (key === 'dynamite') return o.gear.dynamite; if (key === 'canteen') return o.gear.canteen;
  if (key === 'bottle') return !!o.drinking;
  if (key === 'armL') return !o.flags.severL; if (key === 'armR') return !o.flags.severR;
  return true;
}
function refreshRigGear(R, o) {
  const w = o.weapon, slung = (o.inv.primary && o.held !== 'primary') ? o.inv.primary.def.id : null;
  const f = o.flags || {}, cig = !!(o.smoke > 0 || o.smoking), bl = !!(o.mods.bloodyL), br = !!(o.mods.bloodyR);
  const sig = [o.gear.hat, o.gear.sunglasses, o.gear.dynamite, o.gear.canteen, w ? w.def.id + (w.broken ? 'b' : '') : '-', slung, !!(o.inv.sidearm && o.held !== 'sidearm'), !!o.drinking, T.hitboxDebug, f.severL, f.severR, cig, bl, br].join('|');
  if (sig === R.sig) return; R.sig = sig;
  R.hat.visible = o.gear.hat; R.glasses.visible = o.gear.sunglasses; R.dyn.visible = o.gear.dynamite; R.canteen.visible = o.gear.canteen;
  R.sling.visible = !!slung; R.strap.visible = !!slung; R.holsterGun.visible = !!(o.inv.sidearm && o.held !== 'sidearm');
  R.bottleAnchor.visible = !!o.drinking; R.armL.visible = !f.severL; R.armR.visible = !f.severR; R.cig.visible = cig;
  const blood = lam(0x7a1a10), skin = lam(o.pal.skin); R.handL.userData.baseMat = bl ? blood : skin; R.handR.userData.baseMat = br ? blood : skin;
  const wid = w ? (w.def.dual ? 'revolver' : w.def.beer ? (w.broken ? 'beerBroken' : 'beer') : w.def.id) : null;
  const anchor = f.severR ? R.gunAnchorL : R.gunAnchor;
  if (R.heldId !== wid || R.heldAnchor !== anchor) { if (R.heldModel) R.heldModel.group.parent && R.heldModel.group.parent.remove(R.heldModel.group); R.heldModel = wid ? buildGunModel(wid, true) : null; if (R.heldModel) anchor.add(R.heldModel.group); R.heldId = wid; R.heldAnchor = anchor; }
  const lid = w && w.def.dual ? 'revolver' : null;
  if (R.heldLId !== lid) { if (R.heldLModel) R.gunAnchorL.remove(R.heldLModel.group); R.heldLModel = lid ? buildGunModel(lid, true) : null; if (R.heldLModel) R.gunAnchorL.add(R.heldLModel.group); R.heldLId = lid; }
  if (R.slungId !== slung) { if (R.slungModel) R.slungAnchor.remove(R.slungModel.group); R.slungModel = slung ? buildGunModel(slung, true) : null; if (R.slungModel) R.slungAnchor.add(R.slungModel.group); R.slungId = slung; }
  R.activeHit = R.hit.filter(m => rigGearActive(o, m.userData.gearKey));
  setRigDebug(R, T.hitboxDebug);
}
function setRigDebug(R, on) {
  for (const m of R.hit) { m.material = on ? debugMat(m.userData.zone) : m.userData.baseMat; }
  R.heart.visible = on;
  for (const v of R.visuals) v.visible = !on;
  R.strap.visible = !on && R.sling.visible;
  if (R.heldModel) R.heldModel.group.visible = !on; if (R.heldLModel) R.heldLModel.group.visible = !on; if (R.slungModel) R.slungModel.group.visible = !on;
  R.holsterGun.children.forEach(c => c.visible = !on);
}

const RIG_KEYS = ['bodyX', 'bodyY', 'bodyZ', 'hipsY', 'torsoX', 'torsoY', 'headX', 'armRX', 'armRZ', 'elbR', 'armLX', 'armLZ', 'elbL', 'hipLX', 'kneeLX', 'hipRX', 'kneeRX'];
function poseRig(R, s, dt) {
  const t = { bodyX: 0, bodyY: 0, bodyZ: 0, hipsY: 0.86, torsoX: 0, torsoY: 0, headX: 0, armRX: 0.1, armRZ: -0.08, elbR: 0.2, armLX: 0.1, armLZ: 0.08, elbL: 0.2, hipLX: 0, kneeLX: 0, hipRX: 0, kneeRX: 0 };
  const pitch = s.pitch || 0, mv = s.move || 0, ph = s.phase || 0;
  if (s.holding === 'gun2') { t.armRX = 0.95 + pitch * 0.5; t.armRZ = -0.2; t.elbR = 0.62 + pitch * 0.5; t.armLX = 1.08 + pitch * 0.5; t.armLZ = 0.62; t.elbL = 0.5; }
  else if (s.holding === 'dual') { t.armRX = 0.95 + pitch * 0.5; t.armRZ = -0.1; t.elbR = 0.62 + pitch * 0.5; t.armLX = 0.95 + pitch * 0.5; t.armLZ = 0.1; t.elbL = 0.62 + pitch * 0.5; }
  else if (s.holding === 'gun1') { t.armRX = 0.95 + pitch * 0.5; t.armRZ = -0.12; t.elbR = 0.62 + pitch * 0.5; t.armLX = 0.25; t.armLZ = 0.15; t.elbL = 0.5; }
  else if (s.holding === 'melee') { t.armRX = 0.55; t.armRZ = -0.15; t.elbR = 1.3; t.armLX = 0.5; t.armLZ = 0.25; t.elbL = 1.5; }
  else { t.armRX = 0.7; t.armRZ = -0.28; t.elbR = 2.0; t.armLX = 0.7; t.armLZ = 0.28; t.elbL = 2.0; }
  if (s.swing > 0) { const k = s.swing; t.armRX = lerp(2.7, 0.4, k); t.elbR = lerp(1.2, 0.2, k); t.armRZ = -0.3; }
  if (s.punch) { if (s.punch < 0) { t.armLX = 0.4; t.armLZ = 0.35; t.elbL = 2.3; } else { t.armLX = 1.55; t.armLZ = 0.25; t.elbL = 0.05; } }
  if (s.drink) { t.armLX = 0.55; t.armLZ = 0.6; t.elbL = 2.45; t.headX += 0.35; }
  if (s.clutch > 0) { t.armRX = lerp(t.armRX, 0.55, s.clutch); t.armRZ = lerp(t.armRZ, 0.55, s.clutch); t.elbR = lerp(t.elbR, 2.35, s.clutch); }
  t.torsoX += pitch * 0.25; t.headX += pitch * 0.5;
  t.torsoX -= (s.hunch || 0) * 0.3 + (s.cough || 0) * 0.35; t.headX -= (s.cough || 0) * 0.3;
  if (s.stagger) { t.torsoX += 0.3; t.headX += 0.45; }
  const st = s.stance;
  if (st === 'crouch') { t.hipsY = 0.58; t.hipLX = 1.15 + Math.sin(ph) * 0.25 * mv; t.hipRX = 1.15 - Math.sin(ph) * 0.25 * mv; t.kneeLX = -1.9; t.kneeRX = -1.9; t.torsoX -= 0.2; }
  else if (st === 'kneel') { t.hipsY = 0.46; t.hipRX = 1.45; t.kneeRX = -1.45; t.hipLX = 0.1; t.kneeLX = -1.6; }
  else if (st === 'execKneel') {
    t.hipsY = 0.46; t.hipLX = 0.1; t.kneeLX = -1.6; t.hipRX = 0.1; t.kneeRX = -1.6; t.torsoX -= 0.25; t.headX -= 0.55;
    if (!s.offhand) { t.armRX = 0.15; t.armRZ = -0.1; t.elbR = 0.35; t.armLX = 0.15; t.armLZ = 0.1; t.elbL = 0.35; }
  } else if (st === 'prone') {
    const cp = s.crawlPhase || 0, cm = s.move > 0.1 ? 1 : 0.15;
    t.bodyX = -Math.PI / 2; t.bodyY = 0.13; t.bodyZ = 0.86; t.headX = 1.2;
    t.hipLX = 0.15 + Math.sin(cp) * 0.35 * cm; t.kneeLX = -0.2 - Math.max(0, Math.sin(cp)) * 0.9 * cm;
    t.hipRX = 0.15 - Math.sin(cp) * 0.35 * cm; t.kneeRX = -0.2 - Math.max(0, -Math.sin(cp)) * 0.9 * cm;
    if (s.holding === 'gun1' || s.holding === 'gun2' || s.holding === 'dual') { t.armRX = 2.95; t.armRZ = -0.15; t.elbR = 0.2; t.armLX = 2.6 + Math.sin(cp) * 0.4 * cm; t.armLZ = 0.35; t.elbL = 0.4; }
    else { t.armRX = 2.7 - Math.sin(cp) * 0.4 * cm; t.armRZ = -0.3; t.elbR = 0.3; t.armLX = 2.7 + Math.sin(cp) * 0.4 * cm; t.armLZ = 0.3; t.elbL = 0.3; }
  } else if (st === 'dead' || st === 'knockdown') {
    const fwd = st === 'dead' && s.deadDir > 0;
    t.bodyX = fwd ? -Math.PI / 2 : Math.PI / 2; t.bodyY = 0.13; t.bodyZ = fwd ? 0.86 : -0.86; t.headX = fwd ? 0.4 : -0.3;
    t.armRX = 1.4; t.armRZ = -1.3; t.elbR = 0.3; t.armLX = 1.2; t.armLZ = 1.3; t.elbL = 0.4; t.hipLX = 0.2; t.kneeLX = -0.4; t.hipRX = -0.1; t.kneeRX = -0.1;
  } else { // stand, walk, run: knees bend on the swing, hips bob twice a stride, shoulders counter-rotate, free arms swing
    const m1 = Math.min(1, mv), run = clamp((mv - 0.7) / 0.6, 0, 1), amp = lerp(0.5, 0.8, run) * m1, sw = Math.sin(ph);
    t.hipLX = sw * amp; t.hipRX = -sw * amp;
    const kb = lerp(0.95, 1.55, run) * Math.min(1, mv * 1.4);
    t.kneeLX = -Math.max(0, Math.sin(ph + 1.25)) * kb - 0.06; t.kneeRX = -Math.max(0, Math.sin(ph + 1.25 + Math.PI)) * kb - 0.06;
    t.hipsY = 0.86 - Math.abs(Math.cos(ph)) * lerp(0.025, 0.06, run) * m1 - run * 0.03;
    t.torsoX += run * 0.18 * m1; t.headX -= run * 0.12; t.torsoY += sw * 0.07 * m1;
    const as = sw * lerp(0.35, 0.75, run) * m1;
    if (s.holding === 'gun1' && !s.drink && !(s.smokeArm > 0)) { t.armLX += as; t.elbL += run * 0.6; }
    else if (s.holding === 'melee' && !s.swing) { t.armLX += as; t.armRX -= as * 0.5; }
    if (mv < 0.08) { const br = Math.sin((s.time || 0) * 1.7 + (s.seed || 0)); t.torsoX += br * 0.018; t.headX -= br * 0.012; t.armLX += br * 0.02; } // breathing
    if (s.limp) { t.kneeRX *= 0.3; t.torsoY = Math.sin(ph) * 0.08 * mv; t.hipsY -= Math.max(0, Math.sin(ph)) * 0.04 * mv; }
  }
  if (s.reload && !s.drink) { t.armLX = 0.8; t.armLZ = 0.45; t.elbL = 1.45; t.armRX = Math.min(t.armRX, 0.6); t.elbR = 1.15; t.headX += 0.22; } // looking down at the gun while loading
  if (s.smokeArm > 0) { const k = s.smokeArm; t.armLX = lerp(t.armLX, 0.6, k); t.armLZ = lerp(t.armLZ, 0.55, k); t.elbL = lerp(t.elbL, 2.4, k); t.headX += 0.08 * k; }
  const c = R.cur; const fast = st === 'dead' ? 4 : st === 'knockdown' ? 7 : st === 'prone' ? 5 : 12;
  for (const k of RIG_KEYS) {
    if (c[k] === undefined) c[k] = t[k];
    const rate = (k.startsWith('body') || k === 'hipsY') ? fast : (k.startsWith('arm') || k.startsWith('elb')) ? 16 : 12;
    c[k] = damp(c[k], t[k], rate, dt);
  }
  R.body.rotation.x = c.bodyX; R.body.position.y = c.bodyY; R.body.position.z = c.bodyZ; R.hips.position.y = c.hipsY;
  R.torso.rotation.x = c.torsoX; R.torso.rotation.y = c.torsoY; R.head.rotation.x = c.headX;
  R.armR.rotation.set(c.armRX, 0, c.armRZ); R.elbowR.rotation.x = c.elbR; R.armL.rotation.set(c.armLX, 0, c.armLZ); R.elbowL.rotation.x = c.elbL;
  R.hipL.rotation.x = c.hipLX; R.kneeL.rotation.x = c.kneeLX; R.hipR.rotation.x = c.hipRX; R.kneeR.rotation.x = c.kneeRX;
  const rc = s.react;
  if (rc) {
    R.torso.rotation.x += rc.torso.y; R.torso.rotation.y += rc.torso.x;
    R.head.rotation.x += rc.head.y; R.head.rotation.z = rc.head.x;
    R.armR.rotation.x += rc.armR.y; R.armR.rotation.z += rc.armR.x * 0.5; R.armL.rotation.x += rc.armL.y; R.armL.rotation.z += rc.armL.x * 0.5;
    const dip = Math.max(0, rc.leg.y);
    R.hips.position.y -= dip * 0.12; R.torso.rotation.x -= dip * 0.15;
    R.kneeL.rotation.x -= Math.max(0, -rc.leg.x) * 1.2; R.kneeR.rotation.x -= Math.max(0, rc.leg.x) * 1.2;
    R.hipL.rotation.x += Math.max(0, -rc.leg.x) * 0.5; R.hipR.rotation.x += Math.max(0, rc.leg.x) * 0.5;
  } else R.head.rotation.z = 0;
  if (st !== 'prone' && st !== 'dead' && st !== 'knockdown') { const roll = Math.sin(ph) * 0.05 * Math.min(1, mv); R.hips.rotation.z = roll; R.torso.rotation.z = -roll * 0.6; } else { R.hips.rotation.z = 0; R.torso.rotation.z = 0; } // hips roll with the stride
  if (R.hairPiv) R.hairPiv.rotation.x = -Math.min(1.4, mv) * 0.2 + Math.sin((s.time || 0) * 2.3 + (s.seed || 0)) * 0.035 + Math.sin(ph * 2) * 0.04 * Math.min(1, mv); // hair swings
}
/* =========================================================================
   RAGDOLLS: a skeleton, not a string of beads.
   Particles are body landmarks. Bones are hard constraints. The chest and the
   pelvis are rigid blocks joined by a waist that only bends so far. Knees are
   hinges, hips have a cone limit, the neck only nods and turns a little.
   Heavy hits can break a joint past its limit or take a limb or the head off.
   ========================================================================= */
// 0 head, 1 neck, 2 pelvis, 3 shL, 4 shR, 5 elL, 6 elR, 7 haL, 8 haR, 9 hiL, 10 hiR, 11 knL, 12 knR, 13 ftL, 14 ftR, 15 sternum, 16 belly
const RAG_W0 = [1 / 5, 1 / 9, 1 / 12, 1 / 6, 1 / 6, 1 / 3, 1 / 3, 1 / 1.5, 1 / 1.5, 1 / 7, 1 / 7, 1 / 4, 1 / 4, 1 / 2.5, 1 / 2.5, 1 / 8, 1 / 8];
const RAG_RAD = [0.11, 0.09, 0.1, 0.08, 0.08, 0.06, 0.06, 0.06, 0.06, 0.08, 0.08, 0.07, 0.07, 0.07, 0.07, 0.09, 0.09];
const RAG_BONES = [
  [1, 3], [1, 4], [3, 4], [15, 1], [15, 3], [15, 4],        // chest block, rigid
  [2, 9], [2, 10], [9, 10], [16, 2], [16, 9], [16, 10],     // pelvis block, rigid
  [0, 1], [3, 5], [5, 7], [4, 6], [6, 8], [9, 11], [11, 13], [10, 12], [12, 14],
];
// joint ranges as fractions of the rest distance: [a, b, min, max]
const RAG_RANGES = [
  [1, 2, 0.95, 1.02], [3, 9, 0.87, 1.07], [4, 10, 0.87, 1.07], [3, 10, 0.91, 1.06], [4, 9, 0.91, 1.06], [15, 16, 0.78, 1.07], // waist
  [0, 3, 0.9, 1.08], [0, 4, 0.9, 1.08], [0, 15, 0.86, 1.1], [0, 2, 0.95, 1.03],                                              // neck
];
// limbs can't pass through the body: [a, b, min meters]
const RAG_MINS = [[5, 4, 0.28], [6, 3, 0.28], [7, 2, 0.2], [8, 2, 0.2], [7, 15, 0.14], [8, 15, 0.14], [7, 3, 0.15], [8, 4, 0.15], [11, 12, 0.15], [13, 14, 0.12], [5, 2, 0.18], [6, 2, 0.18], [11, 2, 0.2], [12, 2, 0.2]];
const RAG_LIMBS = { armL: { root: 3, chain: [5, 7] }, armR: { root: 4, chain: [6, 8] }, legL: { root: 9, chain: [11, 13] }, legR: { root: 10, chain: [12, 14] }, head: { root: 1, chain: [0] } };
const RAG_LIMB_OF = { 0: 'head', 5: 'armL', 7: 'armL', 6: 'armR', 8: 'armR', 11: 'legL', 13: 'legL', 12: 'legR', 14: 'legR' };
const RAG_JOINT_OF = { 0: 'neck', 11: 'kneeL', 13: 'kneeL', 9: 'hipL', 12: 'kneeR', 14: 'kneeR', 10: 'hipR', 5: 'elbowL', 7: 'elbowL', 6: 'elbowR', 8: 'elbowR', 16: 'waist', 2: 'waist' };
const ZONE_LIMB = { head: 'head', neck: 'head', gunBicep: 'armR', gunHand: 'armR', supportArm: 'armL', supportHand: 'armL', thighL: 'legL', kneeL: 'legL', calfL: 'legL', thighR: 'legR', kneeR: 'legR', calfR: 'legR' };
const ZONE_JOINT = { head: 'neck', neck: 'neck', gunBicep: 'elbowR', gunHand: 'elbowR', supportArm: 'elbowL', supportHand: 'elbowL', thighL: 'hipL', kneeL: 'kneeL', calfL: 'kneeL', thighR: 'hipR', kneeR: 'kneeR', calfR: 'kneeR', stomach: 'waist', groin: 'waist' };
const RAG_PART_ZONE = { 0: 'head', 1: 'neck', 2: 'stomach', 3: 'shoulder', 4: 'shoulder', 5: 'supportArm', 6: 'gunBicep', 7: 'supportHand', 8: 'gunHand', 9: 'thighL', 10: 'thighR', 11: 'kneeL', 12: 'kneeR', 13: 'calfL', 14: 'calfR', 15: 'chest', 16: 'stomach' };
const RAG_ZONE_IDX = { head: 0, neck: 0, gunBicep: 6, gunHand: 8, supportArm: 5, supportHand: 7, thighL: 11, kneeL: 11, calfL: 13, thighR: 12, kneeR: 12, calfR: 14 };
function ragHops(bones, n) {
  const adj = Array.from({ length: n }, () => []); for (const [a, b] of bones) { adj[a].push(b); adj[b].push(a); }
  return Array.from({ length: n }, (_, s) => { const d = new Array(n).fill(99); d[s] = 0; const q = [s]; while (q.length) { const u = q.shift(); for (const v of adj[u]) if (d[v] > d[u] + 1) { d[v] = d[u] + 1; q.push(v); } } return d; });
}
const RAG_FALL = [1, 0.55, 0.28, 0.14, 0.07, 0.04, 0.03];
const RAG_TMP = { up: new V3(0, 1, 0), tmp: new V3(), mat: new THREE.Matrix4(), x: new V3(), y: new V3(), z: new V3(), a: new V3(), b: new V3() };
// scratch space for the joint solver, so it allocates nothing per step
const RJ = { r: new V3(), a: new V3(), n: new V3(), cr: new V3(), ca: new V3(), cn: new V3(), want: new V3(), cur: new V3(), axis: new V3(), cq: new V3(), q: new THREE.Quaternion(), l: new V3(), bulge: new V3(), mid: new V3(), up: new V3(), rr: new V3() };
const RJ_LEGS = [[9, 11, 13, -1, 'kneeL', 'hipL', 'legL', [11, 13]], [10, 12, 14, 1, 'kneeR', 'hipR', 'legR', [12, 14]]];
const RJ_ARMS = [[3, 7, 'elbowL', 'armL'], [4, 8, 'elbowR', 'armR']];
const RJ_CHEST = [1, 3, 4, 15], RJ_PELV = [9, 10, 16], RJ_HEAD = [0], RJ_NONE = [];
class Ragdoll {
  constructor(c, imp, opts = {}) {
    this.live = !!opts.live;
    const R = c.rig; R.root.updateMatrixWorld(true);
    const W = (o, x = 0, y = 0, z = 0) => o.localToWorld(new V3(x, y, z));
    this.P = [W(R.head), W(R.torso, 0, 0.6, 0), W(R.hips), W(R.armL), W(R.armR), W(R.elbowL), W(R.elbowR), W(R.elbowL, 0, -0.3, 0), W(R.elbowR, 0, -0.3, 0),
      W(R.hipL), W(R.hipR), W(R.kneeL), W(R.kneeR), W(R.kneeL, 0, -0.44, 0), W(R.kneeR, 0, -0.44, 0), W(R.torso, 0, 0.4, -0.15), W(R.hips, 0, 0.08, -0.13)];
    for (const p of this.P) { const fy = World.floor(p.x, p.z); if (p.y < fy + 0.08) p.y = fy + 0.08; }
    this.W = RAG_W0.slice(); this.rad = RAG_RAD.slice();
    this.Q = this.P.map(p => p.clone()); this.resolveSpawn(); // start clear of walls so the first frame doesn't pop
    const h = 1 / 120, v0 = c.vel ? c.vel.clone().multiplyScalar(0.8) : new V3();
    this.Q = this.P.map(p => p.clone().addScaledVector(v0, -h)); this.Pr = this.P.map(p => p.clone()); this.R = this.P.map(p => p.clone());
    const D = (a, b) => this.P[a].distanceTo(this.P[b]);
    this.bones = RAG_BONES.map(([a, b]) => [a, b, D(a, b)]);
    this.ranges = RAG_RANGES.map(([a, b, lo, hi]) => { const d = D(a, b); return [a, b, d * lo, d * hi]; });
    this.mins = RAG_MINS.map(m => m.slice());
    this.hops = ragHops([...this.bones, [1, 2]], this.P.length);
    this.detached = {}; this.broken = {}; this.free = new Set(); this.bleed = [];
    const fl = c.flags || {}; if (fl.brokenL) this.broken.elbowL = true; if (fl.brokenR) this.broken.elbowR = true;
    { const F = this.frame(); this.local = this.P.map(p => { const d = p.clone().sub(this.P[2]); return new V3(d.dot(F.r), d.dot(F.u), d.dot(F.f)); }); }
    { const pf = this.blockFrame(9, 10, 2, 16), s = this.P[1].clone().sub(this.P[2]).normalize(); this.spine0 = [s.dot(pf.r), s.dot(pf.a), s.dot(pf.n)];
      const cf = this.blockFrame(3, 4, 1, 15), hd = this.P[0].clone().sub(this.P[1]).normalize(); this.head0 = [hd.dot(cf.r), hd.dot(cf.a), hd.dot(cf.n)];
      const fw = new V3(-Math.sin(c.yaw), 0, -Math.cos(c.yaw)), hc = new V3(0, -Math.cos(40 * DEG), 0).addScaledVector(fw, Math.sin(40 * DEG)).normalize(); this.hip0 = [hc.dot(pf.r), hc.dot(pf.a), hc.dot(pf.n)]; }
    this.tone = 0; this.toneTime = 0.8; this.legTone = 0.55; this.wallT = 0; this.plant = {}; this.plantOk = false;
    this.owner = c; this.t = 0; this.still = 0; this.asleep = false; this.pooled = false; this.fade = 0; this.landed = {};
    // body parts, colored like the living rig. Limbs are drawn at their bone length, so they never stretch.
    const pal = c.pal, sk = lam(pal.skin), sh = lam(pal.shirt), sl = lam(pal.sleeve || pal.shirt), ve = lam(pal.vest), pa = lam(pal.pants), bo = lam(pal.boots);
    const mk = (mat, pi) => { const m = new THREE.Mesh(GEO.box, mat); m.castShadow = true; m.userData.rag = this; m.userData.pi = pi; World.scene.add(m); return m; };
    const seg = (a, b, w, d, mat) => { const m = mk(mat, b); m.userData.dims = [w, d]; this.segs.push({ m, a, b, L: D(a, b), leg: a >= 9 }); return m; };
    this.segs = [];
    this.head = new THREE.Mesh(GEO.sphere, sk); this.head.scale.setScalar(0.115); this.head.castShadow = true; this.head.userData.rag = this; this.head.userData.pi = 0; World.scene.add(this.head);
    this.chest = mk(ve, 15); this.chest.scale.set(0.42, 0.36, 0.25);
    this.belly = mk(sh, 16); this.belly.scale.set(0.35, 0.3, 0.21);
    this.neckM = mk(sk, 1); this.neckM.scale.set(0.1, 0.14, 0.1);
    if (!fl.severL) { seg(3, 5, 0.1, 0.1, sl); seg(5, 7, 0.09, 0.09, sl); } if (!fl.severR) { seg(4, 6, 0.1, 0.1, sl); seg(6, 8, 0.09, 0.09, sl); }
    if (pal.hairStyle === 'long' || pal.hairStyle === 'braid') { this.hairM = mk(lam(pal.hair || 0x2a1a10), 0); this.hairM.scale.set(pal.hairStyle === 'long' ? 0.22 : 0.05, pal.hairStyle === 'long' ? 0.28 : 0.32, 0.06); }
    seg(9, 11, 0.15, 0.16, pa); seg(11, 13, 0.125, 0.13, pa); seg(10, 12, 0.15, 0.16, pa); seg(12, 14, 0.125, 0.13, pa);
    this.boots = [13, 14].map(i => { const m = mk(bo, i); m.scale.set(0.12, 0.09, 0.25); return m; });
    const blood = lam(0x7a1a10);
    this.hands = [7, 8].map((i, k) => { const m = mk((k ? c.mods.bloodyR : c.mods.bloodyL) ? blood : sk, i); m.scale.set(0.08, 0.08, 0.09); m.visible = !(k ? fl.severR : fl.severL); return m; });
    this.stumps = [];
    this.meshes = [this.head, this.chest, this.belly, ...this.segs.map(s => s.m), ...this.boots, ...this.hands.filter(m => m.visible)];
    this.applyDeathImpulse(c, imp);
    this.sync();
  }
  // velocity kick in m/s; spreads from the particle that was hit
  // torso frame: right across the shoulders, up along the spine
  frame() { const P = this.P, u = P[1].clone().sub(P[2]).normalize(), r = P[4].clone().sub(P[3]); r.addScaledVector(u, -r.dot(u)).normalize(); return { r, u, f: new V3().crossVectors(r, u) }; }
  // orthonormal frame of a rigid block: right from l to r, second axis from o toward f
  blockFrame(l, rr, o, f) { const P = this.P, r = P[rr].clone().sub(P[l]).normalize(), a = P[f].clone().sub(P[o]); a.addScaledVector(r, -a.dot(r)).normalize(); return { r, a, n: new V3().crossVectors(r, a) }; }
  frameInto(l, rr, o, f, R, A, N) { const P = this.P; R.subVectors(P[rr], P[l]).normalize(); A.subVectors(P[f], P[o]); A.addScaledVector(R, -A.dot(R)).normalize(); N.crossVectors(R, A); }
  // keep a joint inside a cone: rotate the child side toward the allowed direction, the parent side back, lighter side moves more
  cone(pivot, cur, want, maxAng, moveA, moveB) {
    const ang = Math.acos(clamp(cur.dot(want), -1, 1)); if (ang <= maxAng) return;
    const axis = RJ.axis.crossVectors(cur, want); if (axis.lengthSq() < 1e-10) return; axis.normalize();
    let ma = 0, mb = 0; for (const i of moveA) ma += 1 / this.W[i]; for (const i of moveB) mb += 1 / this.W[i];
    // move current positions only: hitting a limit becomes a dead stop, the way it should.
    // Capped per pass, so a big violation eases out instead of snapping (snapping is what flings bodies).
    const ex = Math.min(ang - maxAng, 0.05), ka = mb ? ex * mb / (ma + mb) : ex, kb = ex - ka, P = this.P, q = RJ.q, cq = RJ.cq.copy(P[pivot]);
    q.setFromAxisAngle(axis, ka); for (const i of moveA) P[i].sub(cq).applyQuaternion(q).add(cq);
    if (kb > 0) { q.setFromAxisAngle(axis, -kb); for (const i of moveB) P[i].sub(cq).applyQuaternion(q).add(cq); }
  }
  shift(i, d, k) { this.P[i].addScaledVector(d, k); this.Q[i].addScaledVector(d, k); } // move without adding speed
  // velocity kick (m/s) at particle i. local: falls off along the skeleton from the hit; otherwise only that particle
  push(i, v, local = 1) {
    const h = 1 / 120, hops = this.hops[i];
    for (let k = 0; k < this.P.length; k++) { const w = local ? RAG_FALL[Math.min(6, hops[k])] : (k === i ? 1 : 0); if (w) this.Q[k].addScaledVector(v, -h * w); }
    this.wake(); this.still = 0;
  }
  pushAll(v) { const h = 1 / 120; for (const q of this.Q) q.addScaledVector(v, -h); this.wake(); this.still = 0; }
  nearestIdx(p) { let bi = 0, bd = 1e9; this.P.forEach((q, i) => { const d = q.distanceToSquared(p); if (d < bd) { bd = d; bi = i; } }); return bi; }
  applyDeathImpulse(c, lh) {
    const fwd = new V3(-Math.sin(c.yaw), 0, -Math.cos(c.yaw)), K = T.ragdollForce;
    if (this.live) { // knocked off balance: muscles still working, knees give, arms go out to catch the fall
      const dir = (lh && lh.dir ? lh.dir.clone() : fwd).setY(0).normalize(), F = lh ? lh.force : 2;
      this.tone = 1; this.toneTime = 1.3; this.legTone = 0.3; this.brace = { dir, t: 1.1 };
      this.pushAll(dir.clone().multiplyScalar(Math.min(2.6, 0.5 + F * 0.25))); this.push(1, dir.clone().multiplyScalar(1.2), 1);
      return;
    }
    if (lh && lh.explosion) {
      if (T.dismember) for (const name in RAG_LIMBS) { const p = this.P[RAG_LIMBS[name].chain[0]], dd = p.distanceTo(lh.point); if (dd < 2.4 && chance(name === 'head' ? 0.3 : 0.55)) this.detach(name, p.clone().sub(lh.point).setY(0.6).normalize().multiplyScalar(9)); }
      this.tone = 0.3; this.toneTime = 0.3; for (let i = 0; i < this.P.length; i++) { const d = this.P[i].clone().sub(lh.point); const k = Math.max(0, 1 - d.length() / 8); d.y = Math.abs(d.y) + 0.9; this.push(i, d.normalize().multiplyScalar((7 + 7 * k) * K), 0); } return; }
    const fresh = lh && lh.point && Game.time - lh.t < 1;
    if (!fresh) { // bled out: the body holds on, the knees go, then it folds forward
      this.tone = T.ragTone; this.toneTime = T.ragToneTime * 1.8; this.legTone = 0.2; this.plantOk = true;
      this.push(11, fwd.clone().multiplyScalar(0.9), 0); this.push(12, fwd.clone().multiplyScalar(0.9), 0); this.push(0, fwd.clone().multiplyScalar(0.8), 1);
      if (lh && lh.point) this.push(this.nearestIdx(lh.point), (lh.dir || fwd).clone().multiplyScalar(1.2), 1);
      return;
    }
    const dir = lh.dir ? lh.dir.clone() : fwd.clone().negate(); dir.y = Math.max(dir.y, -0.1); dir.normalize();
    const F = lh.force || 1, i = this.nearestIdx(lh.point), flat = dir.clone().setY(0).normalize();
    // muscle tone: the lighter the hit, the longer the body keeps its shape before it drops
    this.tone = T.ragTone; this.toneTime = T.ragToneTime * clamp(1.45 - F / 10, 0.35, 1.45) * (i === 0 ? 0.8 : 1); this.legTone = i >= 9 && i <= 14 ? 0.25 : 1;
    // 1) the spot that got hit jerks away from the bullet
    this.push(i, dir.clone().multiplyScalar(Math.min(7, 0.6 + (lh.dmg || 20) / 50 + F * 0.3) * K), 1);
    // 2) heavy hits carry the whole body: thrown back, off the feet, into whatever is behind
    const carry = Math.min(8, F * 0.28 * T.ragThrow) * K;
    this.pushAll(flat.clone().multiplyScalar(carry).add(new V3(0, F > 5 ? Math.min(1.8, F * 0.08) : 0.1, 0)));
    // 3) shape of the fall
    if (i === 0) this.push(0, dir.clone().multiplyScalar(3 * K), 0);                          // head snaps back
    else if (i >= 11 && i <= 14) { this.push(13, flat.clone().multiplyScalar(2), 0); this.push(14, flat.clone().multiplyScalar(2), 0); } // legs swept out
    else if (i === 2 || i === 16 || i === 9 || i === 10) this.push(16, flat.clone().multiplyScalar(0.8), 0); // gut shot folds at the waist
    this.spin = (Math.random() - 0.5) * Math.min(3, F * 0.25); this.plantOk = F < 2.5 && !(i >= 9 && i <= 14) && i !== 16 && i !== 2; // only light hits plant the feet
    this.wound(i, dir, F, lh.zone);
    if (F < 6 && i !== 0) this.brace = { dir: flat.clone(), t: 0.8 }; // a dying man still puts his hands out
    if (F < 4 && (lh.zone === 'stomach' || lh.zone === 'chest' || lh.zone === 'heart')) this.clutch = { to: lh.zone === 'stomach' ? 16 : 15, t: 1.4 }; // and grabs at the wound
    if (lh.limb && lh.limb !== lh.zone && ZONE_LIMB[lh.limb]) this.wound(RAG_ZONE_IDX[lh.limb] != null ? RAG_ZONE_IDX[lh.limb] : i, dir, F, lh.limb); // pellets that hit a limb as well as the body
  }
  // what a heavy hit does to the part it lands on: past a joint's limit, or clean off
  wound(i, dir, F, zone) {
    let limb = (zone && ZONE_LIMB[zone]) || RAG_LIMB_OF[i], joint = (zone && ZONE_JOINT[zone]) || RAG_JOINT_OF[i];
    if (zone === 'shoulder') { const sL = this.P[3].distanceToSquared(this.P[i]) < this.P[4].distanceToSquared(this.P[i]); limb = sL ? 'armL' : 'armR'; joint = null; }
    if (T.dismember && limb && F >= T.dismemberForce * (limb === 'head' ? 1.4 : 1)) this.detach(limb, dir.clone().multiplyScalar(Math.min(12, F * 0.5)));
    else if (joint && F >= T.jointBreakForce && !this.broken[joint]) { this.broken[joint] = true; SFX.play('bone', this.P[i], 1); }
  }
  shot(point, dir, F, speed) { // bullets into a corpse: push, and big guns still break and take parts
    const i = this.nearestIdx(point); this.push(i, dir.clone().multiplyScalar(speed), 1); FX.blood(point, dir, 12);
    if (F >= T.jointBreakForce) this.wound(i, dir, F);
  }
  detach(name, v) {
    if (this.detached[name]) return; const L = RAG_LIMBS[name]; this.detached[name] = true;
    const P = this.P, Q = this.Q, root = L.root, first = L.chain[0]; let end = root;
    if (name === 'head') this.bones = this.bones.filter(b => !(b[0] === 0 || b[1] === 0));
    else { // the limb keeps its own copy of the joint end
      end = P.length; P.push(P[root].clone()); Q.push(Q[root].clone()); this.Pr.push(P[root].clone()); this.R.push(P[root].clone()); this.W.push(this.W[root] * 1.5); this.rad.push(0.06); if (this.cands) this.cands.push([]);
      for (const b of this.bones) if ((b[0] === root && b[1] === first) || (b[1] === root && b[0] === first)) { if (b[0] === root) b[0] = end; else b[1] = end; }
      for (const sg of this.segs) if (sg.a === root && sg.b === first) sg.a = end;
    }
    const chain = new Set(end === root ? L.chain : [...L.chain, end]);
    this.ranges = this.ranges.filter(r => !chain.has(r[0]) && !chain.has(r[1]) || (chain.has(r[0]) && chain.has(r[1])));
    this.mins = this.mins.filter(r => !chain.has(r[0]) && !chain.has(r[1]));
    for (const k of chain) this.free.add(k);
    this.hops = ragHops([...this.bones, [1, 2]], P.length);
    for (const k of L.chain) this.push(k, v, 0);
    FX.blood(P[root].clone(), null, 55); SFX.play('sever', P[root], 1.1);
    this.bleed.push({ i: root, t: 4 }, { i: end === root ? first : end, t: 2.5 });
    const st = new THREE.Mesh(GEO.sphere, lam(0x6a0f08)); st.scale.setScalar(name === 'head' ? 0.06 : 0.055); World.scene.add(st); this.stumps.push({ m: st, i: root }); this.meshes.push(st);
    if (name === 'head') { this.neckM.visible = true; }
    this.asleep = false;
  }
  // ---------------- simulation: called by Ragdolls.stepAll at a fixed 120 Hz ----------------
  resolveSpawn() { this.gather(); for (let k = 0; k < 3; k++) for (let i = 0; i < this.P.length; i++) this.collide(i, false); }
  gather() { // nearby boxes looked up once per step per particle, not once per solver iteration
    const P = this.P; if (!this.cands) this.cands = P.map(() => []);
    for (let i = 0; i < P.length; i++) { const a = this.cands[i] || (this.cands[i] = []); a.length = 0; for (const c of World.near(P[i].x, P[i].z)) a.push(c); }
  }
  preStep(h) {
    this.far = Game.camera.position.distanceToSquared(this.P[2]) > 1225; // past 35 m, half the solver work
    const P = this.P, Q = this.Q, g = T.ragGravity * h * h, cap = 24 * h;
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = Q[i]; this.Pr[i].copy(p);
      const age = this.t - (this.wakeT || 0), dmp = age > 5 ? 0.95 : age > 2 ? 0.985 : 0.998; // the longer it lies there, the faster it loses energy
      let vx = (p.x - q.x) * dmp, vy = (p.y - q.y) * dmp, vz = (p.z - q.z) * dmp;
      const sp = Math.hypot(vx, vy, vz); if (sp > cap) { vx *= cap / sp; vy *= cap / sp; vz *= cap / sp; } // nothing outruns 24 m/s
      q.copy(p); p.x += vx; p.y += vy - g; p.z += vz;
    }
    this.gather();
    if (this.toneK > 0.01) this.applyTone();
    // Euphoria touches: hands reach toward the ground ahead of the fall, or one hand holds the wound
    if (this.brace && this.brace.t > 0 && !this.detached.armL && !this.detached.armR) {
      this.brace.t -= h; const P = this.P, v = new V3(P[1].x - this.Q[1].x, 0, P[1].z - this.Q[1].z), d = v.lengthSq() > 1e-6 ? v.normalize() : this.brace.dir;
      const side = new V3(-d.z, 0, d.x), base = P[2].clone().addScaledVector(d, 0.65); base.y = 0.08;
      for (const [hi, sx] of [[7, -1], [8, 1]]) { if (this.clutch && this.clutch.t > 0 && hi === 7) continue; const tgt = base.clone().addScaledVector(side, sx * 0.28); P[hi].lerp(tgt, 0.035); }
    }
    if (this.clutch && this.clutch.t > 0 && !this.detached.armL) { this.clutch.t -= h; this.P[7].lerp(this.P[this.clutch.to], 0.05); }
  }
  solveInternal() {
    for (const [a, b, r] of this.bones) this.solve(a, b, r, r);
    for (const [a, b, lo, hi] of this.ranges) this.solve(a, b, lo, hi);
    for (const [a, b, r] of this.mins) this.solve(a, b, r, 1e9);
    this.joints();
  }
  addCorr(i, n, k) { const C = this.corr || (this.corr = []), N = this.corrN || (this.corrN = []); if (!C[i]) { C[i] = new V3(); N[i] = 0; } C[i].addScaledVector(n, k); N[i]++; }
  applyCorr() {
    const C = this.corr, N = this.corrN; if (!C) return;
    for (let i = 0; i < C.length; i++) { if (!N[i]) continue; const c = C[i].divideScalar(N[i]), l = c.length(); if (l > 0.02) c.multiplyScalar(0.02 / l); this.P[i].add(c); C[i].set(0, 0, 0); N[i] = 0; }
  }
  collideAll(last) { for (let i = 0; i < this.P.length; i++) this.collide(i, last); }
  finishStep(h) {
    this.joints(); for (let k = 0; k < 2; k++) for (const [a, b, r] of this.bones) this.solve(a, b, r, r); // bones get the last word: nothing stretches
    this.collideAll(true); // then the world: nothing ends a step inside the floor or a wall
    let mx = 0, sum = 0; for (let i = 0; i < this.P.length; i++) { const v = this.P[i].distanceTo(this.Q[i]) / h; sum += v; if (v > mx) mx = v; }
    const avg = sum / this.P.length, age = this.t - (this.wakeT || 0);
    this.still = (avg < 0.12 && mx < 0.6) || (age > 5 && avg < 0.35) ? this.still + h : 0; // one twitchy foot doesn't keep a body awake
    if ((this.still > 0.4 && this.t > 0.8 && this.toneK < 0.05) || age > 9) this.sleep(); // and nothing twitches forever
  }
  sleep() {
    this.asleep = true; for (let i = 0; i < this.P.length; i++) { this.Q[i].copy(this.P[i]); this.Pr[i].copy(this.P[i]); }
    if (!this.pooled && !this.live) { this.pooled = true; FX.decal(this.P[2].clone(), rand(0.35, 0.55)); FX.decal(this.P[1].clone(), rand(0.2, 0.35)); }
  }
  wake() { if (this.asleep) { this.asleep = false; this.still = 0; this.wakeT = this.t; } }
  collide(i, last) {
    const p = this.P[i], q = this.Q[i], r = this.rad[i]; let ground = false, wn = -1;
    for (const c of this.cands[i]) {
      if (p.x < c.x0 - r || p.x > c.x1 + r || p.z < c.z0 - r || p.z > c.z1 + r || p.y < c.y0 - r || p.y > c.y1 + r) continue;
      const pen = [p.x - (c.x0 - r), (c.x1 + r) - p.x, p.z - (c.z0 - r), (c.z1 + r) - p.z, (c.y1 + r) - p.y, p.y - (c.y0 - r)];
      // push out through the face it came in from (last position), so edges and corners don't flip it back and forth
      const was = [q.x <= c.x0 - r + 1e-4, q.x >= c.x1 + r - 1e-4, q.z <= c.z0 - r + 1e-4, q.z >= c.z1 + r - 1e-4, q.y >= c.y1 + r - 1e-4, q.y <= c.y0 - r + 1e-4];
      let m = -1; for (let k = 0; k < 6; k++) if (was[k] && (m < 0 || pen[k] < pen[m])) m = k;
      if (m < 0) { m = 0; for (let k = 1; k < 6; k++) if (pen[k] < pen[m]) m = k; }
      if (m < 4 && !this.wallT && (i === 2 || i === 1)) { const sp = Math.hypot(p.x - q.x, p.z - q.z) * 120; if (sp > 4.5) this.wallSlam(p, m, sp); }
      if (m === 0) p.x = c.x0 - r; else if (m === 1) p.x = c.x1 + r; else if (m === 2) p.z = c.z0 - r; else if (m === 3) p.z = c.z1 + r;
      else if (m === 4) { p.y = c.y1 + r; ground = true; } else p.y = c.y0 - r;
      if (m < 4) wn = m;
    }
    if (p.y < r) { p.y = r; ground = true; }
    // planted feet: while the muscles still hold, the feet stay put and the body pivots over them
    if (ground && (i === 13 || i === 14) && this.toneK > 0.12 && this.plantOk && this.P[2].y > 0.45 && (this.upY === undefined || this.upY > 0.55) && Math.hypot(this.P[2].x - this.Q[2].x, this.P[2].z - this.Q[2].z) * 120 < 2) {
      const a = this.plant[i] || (this.plant[i] = new V3(p.x, p.y, p.z)); p.x = lerp(p.x, a.x, 0.6); p.z = lerp(p.z, a.z, 0.6); q.x = p.x; q.z = p.z;
    }
    if (!last) return;
    if (ground) {
      if ((i === 2 || i === 0) && !this.landed[i] && q.y - p.y > 0.018) { this.landed[i] = true; if (i === 2) { SFX.play('thud', p, 0.9); for (let k = 0; k < 6; k++) FX.spawn('dust', p, new V3(rand(-1, 1), rand(0.3, 1), rand(-1, 1)), rand(0.03, 0.06), rand(0.4, 0.8)); } }
      if (q.y > p.y) q.y = p.y; // no bounce: bodies land dead
      const vx = p.x - q.x, vz = p.z - q.z, sp = Math.hypot(vx, vz) * 120;
      if (sp < 0.8) { q.x = p.x; q.z = p.z; }        // static friction: slow contact sticks
      else { q.x += vx * 0.28; q.z += vz * 0.28; }   // kinetic friction: sliding bleeds speed fast
    }
    if (wn >= 0) { // walls take the momentum going into them and drag a little along them
      const vx = p.x - q.x, vz = p.z - q.z;
      if (wn < 2) q.x = p.x; else q.z = p.z;
      if (wn < 2) q.z += vz * 0.12; else q.x += vx * 0.12;
    }
    const B = World.bounds; p.x = clamp(p.x, B.x0, B.x1); p.z = clamp(p.z, B.z0, B.z1);
  }
  // hinge knees, cone hips, waist and neck cones. A broken joint loses its limit.
  joints() {
    const P = this.P, r = RJ.rr.subVectors(P[10], P[9]).normalize();
    this.frameInto(9, 10, 2, 16, RJ.r, RJ.a, RJ.n); // pelvis block frame, shared by hips and waist
    const pw = (c, out) => out.copy(RJ.r).multiplyScalar(c[0]).addScaledVector(RJ.a, c[1]).addScaledVector(RJ.n, c[2]).normalize();
    for (const [hip, knee, foot, side, kn, hn, leg, chain] of RJ_LEGS) {
      if (this.detached[leg]) continue;
      if (!this.broken[hn]) this.cone(hip, RJ.cur.subVectors(P[knee], P[hip]).normalize(), pw(this.hip0, RJ.want), 70 * DEG, chain, RJ_NONE); // about 110 deg forward, 30 back
      if (!this.broken[kn]) { // knee: only bends forward
        const l = RJ.l.subVectors(P[foot], P[hip]), ll = l.length(); if (ll > 1e-4) {
          l.divideScalar(ll); const bulge = RJ.bulge.crossVectors(r, l).normalize(), d = RJ.mid.addVectors(P[hip], P[foot]).multiplyScalar(0.5).sub(P[knee]).negate().dot(bulge);
          if (d < -0.01) { const k = Math.min(0.02, -0.01 - d), wk = this.W[knee], wo = (this.W[hip] + this.W[foot]) * 0.5, s = wk + wo; P[knee].addScaledVector(bulge, k * wk / s); P[hip].addScaledVector(bulge, -k * wo / s * 0.5); P[foot].addScaledVector(bulge, -k * wo / s * 0.5); }
        }
      }
    }
    if (!this.broken.waist) this.cone(2, RJ.cur.subVectors(P[1], P[2]).normalize(), pw(this.spine0, RJ.want), T.ragWaist * DEG, RJ_CHEST, RJ_PELV); // waist
    if (!this.detached.head && !this.broken.neck) { // neck
      this.frameInto(3, 4, 1, 15, RJ.cr, RJ.ca, RJ.cn); const s = this.head0;
      RJ.want.copy(RJ.cr).multiplyScalar(s[0]).addScaledVector(RJ.ca, s[1]).addScaledVector(RJ.cn, s[2]).normalize();
      this.cone(1, RJ.cur.subVectors(P[0], P[1]).normalize(), RJ.want, T.ragNeck * DEG, RJ_HEAD, RJ_NONE);
    }
    for (const [sh, ha, en, an] of RJ_ARMS) if (!this.broken[en] && !this.detached[an]) this.solve(ha, sh, 0.16, 1e9); // elbows don't fold flat
  }
  // pull each point toward the pose it had at death, in the torso's current frame. Fades out over toneTime.
  applyTone() {
    const P = this.P, F = this.frame(), pel = P[2]; this.upY = F.u.y;
    const k0 = this.toneK * 0.5 * clamp((F.u.y - 0.15) / 0.5, 0, 1); // muscles hold you up, they don't hold a handstand
    if (k0 <= 0) return;
    if (this.spin) { const s = this.spin * 0.004; F.r.applyAxisAngle(F.u, s); F.f.applyAxisAngle(F.u, s); }
    // muscles are internal: work out every pull, then remove the average so the body's momentum is untouched
    const n = this.local.length, C = this._tc || (this._tc = Array.from({ length: n }, () => new V3())); let mx = 0, my = 0, mz = 0, mt = 0;
    for (let i = 0; i < n; i++) {
      const c = C[i].set(0, 0, 0), m = 1 / this.W[i]; mt += m;
      if (i === 2 || this.free.has(i)) continue;
      const L = this.local[i], k = k0 * (i >= 9 && i <= 14 ? this.legTone : i >= 5 && i <= 8 ? 0.35 : 1); // arms go limp first
      c.set(pel.x + F.r.x * L.x + F.u.x * L.y + F.f.x * L.z - P[i].x, pel.y + F.r.y * L.x + F.u.y * L.y + F.f.y * L.z - P[i].y, pel.z + F.r.z * L.x + F.u.z * L.y + F.f.z * L.z - P[i].z).multiplyScalar(k);
      const cl = c.length(); if (cl > 0.012) c.multiplyScalar(0.012 / cl); // muscles pull, they don't teleport
      mx += c.x * m; my += c.y * m; mz += c.z * m;
    }
    mx /= mt; my /= mt; mz /= mt;
    for (let i = 0; i < n; i++) { if (this.free.has(i)) continue; const c = C[i]; P[i].x += c.x - mx; P[i].y += c.y - my; P[i].z += c.z - mz; }
  }
  solve(a, b, lo, hi) { // keeps the distance between lo and hi (lo === hi: a rigid bone)
    const pa = this.P[a], pb = this.P[b], dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    let r; if (d < lo) r = lo; else if (d > hi) r = hi; else return;
    const wa = this.W[a], wb = this.W[b], c = (d - r) / d / (wa + wb), ka = c * wa, kb = c * wb;
    pa.x += dx * ka; pa.y += dy * ka; pa.z += dz * ka; pb.x -= dx * kb; pb.y -= dy * kb; pb.z -= dz * kb;
  }
  wallSlam(p, m, sp) {
    this.wallT = 0.35; const n = [new V3(-1, 0, 0), new V3(1, 0, 0), new V3(0, 0, -1), new V3(0, 0, 1)][m];
    SFX.play('slam', p, Math.min(1.4, sp / 6)); FX.impact(p.clone(), n); FX.blood(p.clone(), n.clone().negate(), Math.min(40, sp * 5));
    for (let k = 0; k < Math.min(10, sp * 1.5); k++) FX.spawn('blood', p.clone().add(new V3(0, rand(-0.3, 0.3), 0)), new V3(rand(-0.3, 0.3), rand(-1.5, 0.2), rand(-0.3, 0.3)).addScaledVector(n, 0.4), rand(0.02, 0.05), rand(0.5, 1.2));
    if (Game.player.alive && Game.player.pos.distanceTo(p) < 12) Game.player.shakeAdd(Math.min(0.5, sp / 20));
    for (let k = 0; k < this.Q.length; k++) { this.Q[k].x = lerp(this.Q[k].x, this.P[k].x, 0.45); this.Q[k].z = lerp(this.Q[k].z, this.P[k].z, 0.45); } // the wall eats the momentum
  }
  // draw from positions interpolated between physics steps, oriented from the body's own frame (no flipping boxes)
  sync(alpha = 1) {
    const P = this.P, R = this.R, T0 = RAG_TMP, mat = T0.mat, xA = T0.x, yA = T0.y, zA = T0.z;
    for (let i = 0; i < P.length; i++) R[i].lerpVectors(this.Pr[i], P[i], alpha);
    const basis = (m, yDir, xHint, center) => { yA.copy(yDir); xA.copy(xHint).addScaledVector(yA, -xHint.dot(yA)); if (xA.lengthSq() < 1e-6) xA.set(1, 0, 0).addScaledVector(yA, -yA.x); xA.normalize(); zA.crossVectors(xA, yA); mat.makeBasis(xA, yA, zA); m.quaternion.setFromRotationMatrix(mat); m.position.copy(center); };
    const rC = new V3().subVectors(R[4], R[3]).normalize(), rP = new V3().subVectors(R[10], R[9]).normalize();
    const ms = new V3().addVectors(R[3], R[4]).multiplyScalar(0.5), uC = new V3().subVectors(R[1], ms); if (uC.lengthSq() < 1e-6) uC.set(0, 1, 0); uC.normalize();
    const uP = new V3().subVectors(ms, R[2]).normalize(), fwd = new V3().crossVectors(uP, rP).normalize();
    this.head.position.copy(R[0]);
    basis(this.chest, uC, rC, ms.clone().addScaledVector(uC, -0.06));
    basis(this.belly, uP, rP, R[2].clone().addScaledVector(uP, 0.13));
    { const d = new V3().subVectors(R[0], R[1]); let L = Math.min(0.16, d.length()); if (this.detached.head) { d.copy(uC); L = 0.06; } if (d.lengthSq() < 1e-8) d.copy(uC); d.normalize(); basis(this.neckM, d, rC, R[1].clone().addScaledVector(d, L * 0.5)); this.neckM.scale.set(0.1, Math.max(0.04, L), 0.1); }
    for (const sg of this.segs) {
      const a = R[sg.a], b = R[sg.b], d = new V3().subVectors(b, a), len = d.length() || 0.01; d.divideScalar(len);
      const L = clamp(len, sg.L * 0.94, sg.L * 1.06); // tiny stretch allowed so joints never show gaps
      basis(sg.m, d, sg.leg ? rP : rC, a.clone().add(b).multiplyScalar(0.5)); sg.m.scale.set(sg.m.userData.dims[0], L + 0.02, sg.m.userData.dims[1]);
    }
    this.boots.forEach((m, k) => { // boot: up along the shin, length pointing where the feet point
      const f = R[13 + k], kn = R[11 + k], shin = new V3().subVectors(kn, f).normalize(), fz = fwd.clone().addScaledVector(shin, -fwd.dot(shin)); if (fz.lengthSq() < 1e-6) fz.copy(rP).cross(shin); fz.normalize();
      zA.copy(fz); yA.copy(shin); xA.crossVectors(yA, zA).normalize(); mat.makeBasis(xA, yA, zA); m.quaternion.setFromRotationMatrix(mat);
      m.position.copy(f).addScaledVector(fz, 0.05); m.position.y = Math.max(m.position.y, 0.045);
    });
    this.hands.forEach((m, k) => m.position.copy(R[7 + k]));
    if (this.hairM) { this.hairM.visible = !this.detached.head; const hu = new V3().subVectors(R[0], R[1]); if (hu.lengthSq() < 1e-6) hu.copy(uC); hu.normalize(); const back = new V3().crossVectors(rC, hu).normalize(); basis(this.hairM, hu, rC, R[0].clone().addScaledVector(hu, -0.1).addScaledVector(back, 0.1)); }
    for (const st of this.stumps) st.m.position.copy(R[st.i]);
    const sink = this.fade * 0.6; if (sink > 0) for (const m of this.allMeshes()) m.position.y -= sink;
  }
  allMeshes() { return [this.head, this.chest, this.belly, this.neckM, ...this.segs.map(s => s.m), ...this.boots, ...this.hands, ...this.stumps.map(s => s.m), ...(this.hairM ? [this.hairM] : [])]; }
  // once per rendered frame: timers, bleeding, fading, drawing. Physics runs in Ragdolls.stepAll.
  post(dt, alpha) {
    this.t += dt; this.wallT = Math.max(0, this.wallT - dt);
    for (const b of this.bleed) if (b.t > 0) { b.t -= dt; if (chance(dt * 18)) { const p = this.P[b.i]; FX.spawn('blood', p.clone(), new V3(rand(-0.6, 0.6), rand(0.2, 1.4), rand(-0.6, 0.6)), rand(0.02, 0.04), rand(0.4, 0.8)); if (p.y < 0.3 && chance(0.3)) FX.decal(p.clone(), rand(0.05, 0.12)); } }
    this.toneK = this.tone * Math.max(0, 1 - this.t / Math.max(0.05, this.toneTime));
    if (!this.asleep && this.t < 3 && this.P[2].y < 0.3 && this.P[2].distanceToSquared(this.Q[2]) > 0.0002 && chance(dt * 8)) FX.decal(this.P[2].clone(), rand(0.06, 0.14)); // smear while sliding
    if (this.t > T.ragdollLife) this.fade += dt;
    this.sync(this.asleep ? 1 : alpha);
    return this.fade < 1.2;
  }
  dispose() { for (const m of this.allMeshes()) World.scene.remove(m); }
}
// contact points for body-on-body: joints plus the middle of the spine and the long bones
const RAG_CP = [[0, -1, 0.11], [1, -1, 0.1], [2, -1, 0.11], [3, -1, 0.08], [4, -1, 0.08], [5, -1, 0.06], [6, -1, 0.06], [7, -1, 0.06], [8, -1, 0.06], [9, -1, 0.09], [10, -1, 0.09], [11, -1, 0.07], [12, -1, 0.07], [13, -1, 0.07], [14, -1, 0.07], [15, -1, 0.1], [16, -1, 0.1],
  [1, 2, 0.13], [9, 11, 0.085], [10, 12, 0.085], [11, 13, 0.07], [12, 14, 0.07], [3, 5, 0.06], [4, 6, 0.06]];
const _ca = new V3(), _cb = new V3(), _cn = new V3();
const Ragdolls = {
  list: [], acc: 0,
  spawn(c, lastHit, opts) {
    if (!T.ragdolls) return null;
    const r = new Ragdoll(c, lastHit, opts); this.list.push(r);
    while (this.list.length > T.ragdollMax) { const k = this.list.findIndex(x => !x.live); if (k < 0) break; this.list[k].dispose(); this.list.splice(k, 1); }
    return r;
  },
  remove(r) { const k = this.list.indexOf(r); if (k >= 0) this.list.splice(k, 1); r.dispose(); },
  // fixed 120 Hz steps: identical at any frame rate, and slowed time just means fewer steps
  update(dt) {
    const H = 1 / 120; this.acc = Math.min(this.acc + dt, H * 4);
    while (this.acc >= H) { this.acc -= H; this.stepAll(H); }
    const alpha = this.acc / H;
    for (let i = this.list.length - 1; i >= 0; i--) if (!this.list[i].post(dt, alpha)) { this.list[i].dispose(); this.list.splice(i, 1); }
  },
  stepAll(h) {
    const awake = this.list.filter(r => !r.asleep); if (!awake.length) return;
    for (const r of awake) r.preStep(h);
    this.walkers(awake, h);
    // body pairs close enough to touch: awake against anything (a sleeping body is solid ground)
    const pairs = [];
    for (const A of awake) for (const B of this.list) if (A !== B && (B.asleep || this.list.indexOf(B) > this.list.indexOf(A)) && A.P[2].distanceToSquared(B.P[2]) < 6.5) pairs.push([A, B]);
    const N = 6;
    for (let it = 0; it < N; it++) {
      for (const r of awake) { if (r.far && (it & 1)) continue; r.solveInternal(); }
      for (const [A, B] of pairs) this.contact(A, B);
      for (const r of awake) { r.applyCorr(); r.collideAll(false); }
    }
    for (const r of awake) r.finishStep(h);
  },
  // body-on-body: gather every push first, then apply the average per part (stable when bodies pile up)
  contact(A, B) {
    let wake = false;
    for (const [ia, ja, ra] of RAG_CP) {
      if (ia >= A.P.length) continue;
      const pa = ja < 0 ? _ca.copy(A.P[ia]) : _ca.addVectors(A.P[ia], A.P[ja]).multiplyScalar(0.5);
      for (const [ib, jb, rb] of RAG_CP) {
        const pb = jb < 0 ? _cb.copy(B.P[ib]) : _cb.addVectors(B.P[ib], B.P[jb]).multiplyScalar(0.5);
        const dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z, R = ra + rb, d2 = dx * dx + dy * dy + dz * dz; if (d2 >= R * R || d2 < 1e-10) continue;
        const d = Math.sqrt(d2), pen = R - d; _cn.set(dx / d, dy / d, dz / d);
        const wa = A.asleep ? 0 : (ja < 0 ? A.W[ia] : (A.W[ia] + A.W[ja]) * 0.5), wb = B.asleep ? 0 : (jb < 0 ? B.W[ib] : (B.W[ib] + B.W[jb]) * 0.5), s = wa + wb; if (!s) continue;
        const ka = pen * wa / s, kb = pen * wb / s;
        if (ka) { A.addCorr(ia, _cn, -ka); if (ja >= 0) A.addCorr(ja, _cn, -ka); if (B.asleep) { A.Q[ia].lerp(A.P[ia], 0.2); if (ja >= 0) A.Q[ja].lerp(A.P[ja], 0.2); } } // friction against a body lying still
        if (kb) { B.addCorr(ib, _cn, kb); if (jb >= 0) B.addCorr(jb, _cn, kb); }
        if (B.asleep && A.P[ia].distanceTo(A.Q[ia]) * 120 > 1.5) wake = true;
      }
    }
    if (wake) B.wake();
  },
  clear() { for (const r of this.list) r.dispose(); this.list = []; this.acc = 0; },
  meshes() { const a = []; for (const r of this.list) for (const m of r.meshes) a.push(m); return a; },
  // the living shove bodies aside as they walk through them
  walkers(awake, h) {
    for (const c of Game.combatants) {
      if (!c.alive || c.liveRag) continue; const sp = Math.hypot(c.vel.x, c.vel.z); // someone mid-fall is the ragdoll, not standing in it
      for (const r of this.list) {
        if ((r.P[2].x - c.pos.x) ** 2 + (r.P[2].z - c.pos.z) ** 2 > 2.2) continue;
        if (r.asleep) { if (sp < 1) continue; r.wake(); } // standing still in a pile doesn't stir it
        for (let i = 0; i < r.P.length; i++) {
          const p = r.P[i]; if (p.y > c.pos.y + 1.7 || p.y < c.pos.y - 0.3) continue;
          const dx = p.x - c.pos.x, dz = p.z - c.pos.z, d = Math.hypot(dx, dz); if (d > 0.4 || d < 1e-4) continue;
          const k = Math.min(0.02, 0.4 - d) / d; p.x += dx * k; p.z += dz * k; r.Q[i].x += dx * k; r.Q[i].z += dz * k; // displace, don't fling
          if (sp > 1) { r.Q[i].x -= c.vel.x * 0.25 * h; r.Q[i].z -= c.vel.z * 0.25 * h; }
        }
      }
    }
  },
  blast(center, radius, force) {
    for (const r of this.list) for (let i = 0; i < r.P.length; i++) {
      const d = r.P[i].clone().sub(center), L = d.length(); if (L > radius) continue;
      d.y = Math.abs(d.y) + 0.6; r.push(i, d.normalize().multiplyScalar(force * (1 - L / radius)), 0);
    }
    if (T.dismember) for (const r of this.list) for (const name in RAG_LIMBS) { const p = r.P[RAG_LIMBS[name].chain[0]]; if (p.distanceTo(center) < radius * 0.3 && chance(0.4)) r.detach(name, p.clone().sub(center).setY(0.5).normalize().multiplyScalar(8)); }
  },
};
/* ---------------- Vira bridge: No perks bodies and ragdolls inside Vira ---------------- */
T.ragdollLife = 1e9; T.ragdollMax = 14; T.hitboxDebug = false;
const seeded = (seed, f) => { let a = (seed >>> 0) || 1; const R0 = Math.random; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; try { return f(); } finally { Math.random = R0; } };
const hexN = c => typeof c === 'number' ? c : parseInt(String(c || '#888888').replace('#', ''), 16);
const hashStr = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const showTree = (o, v) => { if (o) o.traverse(n => { n.visible = v; }); };
ENG.buildWestern = function (props, opts) {
  props = props || {}; opts = opts || {}; const seed = (props.lookSeed | 0) || hashStr(opts.id || 'body');
  const { R, pal } = seeded(seed, () => { const pal = makeLook(props.gender === 'f' ? 'f' : 'm'); if (props.skinTone) pal.skin = hexN(props.skinTone); if (props.top) pal.shirt = hexN(props.top); if (props.bottom) pal.pants = hexN(props.bottom); if (props.hair) pal.hair = hexN(props.hair); return { R: buildRig({ id: seed }, pal), pal }; });
  const holder = new THREE.Group(); R.root.rotation.y = Math.PI; R.root.scale.setScalar((opts.height || 1.8) / 1.8); holder.add(R.root);
  [R.glasses, R.dyn, R.canteen, R.sling, R.strap, R.bottleAnchor, R.cig].forEach(g => showTree(g, false)); showTree(R.hat, props.headwear !== 'none'); showTree(R.holsterGun, !!opts.holster);
  R.__np = true; R.__seed = seed % 997; R.__pal = pal;
  if (opts.weapon && ENG.WEAPONS[opts.weapon] && opts.weapon !== 'fists') { const gm = ENG.gunModel(opts.weapon, true); R.gunAnchor.add(gm.group); R.__gun = gm.group; R.__twoHanded = !!ENG.WEAPONS[opts.weapon].twoHanded; R.__melee = !!ENG.WEAPONS[opts.weapon].melee; }
  R.hit.forEach(m => { const z = m.userData.zone; m.userData.part = z === 'head' || z === 'neck' ? 'head' : z; });
  const mats = []; holder.traverse(n => { if (n.isMesh && n.material && !mats.includes(n.material)) mats.push(n.material); });
  poseRig(R, { stance: 'stand', move: 0, phase: 0, time: 0, seed: R.__seed }, 1);
  holder.userData.parts = R; holder.userData.mats = mats; holder.userData.npRig = R; return holder;
};
ENG.buildBody = (props, opts) => (props && props.body === 'smooth') ? ENG.buildHuman(ENG.lookOf(props), opts) : ENG.buildWestern(props, opts);
const baseAnim = ENG.animateHuman;
ENG.animateHuman = function (P, ph, a, aim) {
  if (!P || !P.__np) return baseAnim(P, ph, a, aim);
  const now = performance.now() / 1000, dt = P.__lt ? Math.min(.1, Math.max(.001, now - P.__lt)) : 1 / 60; P.__lt = now;
  poseRig(P, { pitch: aim ? (P.__pitch || 0) : (P.__gun && !P.__melee ? -.55 : 0), move: a > 0 ? clamp(a / .7, 0, 1.3) : 0, phase: ph, holding: P.__melee ? 'melee' : P.__gun ? (P.__twoHanded ? 'gun2' : 'gun1') : 'none', stance: P.__stance || 'stand', time: now, seed: P.__seed || 0 }, dt);
};
{ // enemies: body style, gender, look seed and a weapon in hand
  const PF = ENG.PREFABS, ep = {}, old = PF.enemy.props;
  for (const k in old) { if (k === 'outfit') Object.assign(ep, { body: { t: 'sel', d: 'western', o: ['western', 'smooth'], l: 'Body' }, gender: { t: 'sel', d: 'm', o: ['m', 'f'], l: 'Body type' }, lookSeed: { t: 'num', d: 0, min: 0, max: 99999, step: 1, l: 'Look (0 = from name, change to re-roll)' }, weapon: { t: 'weapon', d: 'revolver', l: 'Weapon in hand' } }); ep[k] = old[k]; }
  PF.enemy.props = ep; const base = PF.enemy.build;
  PF.enemy.build = function (o, c) { const p = o.props; if (p.body === 'smooth' || (p.model && c.project.assets.models[p.model])) return base(o, c); const g = new THREE.Group(), w = p.attack === 'ranged' ? (p.weapon && p.weapon !== 'none' ? p.weapon : 'revolver') : null, b = ENG.buildWestern(p, { id: o.id, height: p.height, weapon: w, holster: !!w }); g.add(b); g.userData.parts = b.userData.parts; g.userData.mats = b.userData.mats; return g; };
}
/* the level, seen by the ragdoll: boxes in a 4 m grid, plus moving ones (doors, platforms) */
const NPW = { game: null, cells: new Map(), dyn: [] };
function npSync(game) {
  if (NPW.game === game) return; Ragdolls.clear(); NPW.game = game; World.scene = game.scene; Game.camera = game.cam; NPW.cells = new Map(); NPW.dyn = [];
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const c of game.cols) { if (!c.box || c.box.isEmpty()) continue; if (c.dyn) { NPW.dyn.push(c); continue; } const b = c.box, o = { x0: b.min.x, x1: b.max.x, y0: b.min.y, y1: b.max.y, z0: b.min.z, z1: b.max.z };
    x0 = Math.min(x0, o.x0); x1 = Math.max(x1, o.x1); z0 = Math.min(z0, o.z0); z1 = Math.max(z1, o.z1);
    for (let i = Math.floor(o.x0 / 4); i <= Math.floor(o.x1 / 4); i++) for (let j = Math.floor(o.z0 / 4); j <= Math.floor(o.z1 / 4); j++) { const k = i + ',' + j; let a = NPW.cells.get(k); if (!a) NPW.cells.set(k, a = []); a.push(o); } }
  World.bounds = x0 < x1 ? { x0: x0 - 40, x1: x1 + 40, z0: z0 - 40, z1: z1 + 40 } : { x0: -1e4, x1: 1e4, z0: -1e4, z1: 1e4 };
}
const _wfv = new THREE.Vector3();
World.floor = (x, z) => { const g = NPW.game, L = g && g._lands; if (L && L.length && window.ENG && ENG.LAND) for (const st of L) { _wfv.set(x, 0, z).applyMatrix4(st.inv); const hh = ENG.LAND.heightAt(st, _wfv.x, _wfv.z); if (hh !== null) { _wfv.y = hh; return _wfv.applyMatrix4(st.world).y; } } return 0; };
if (window.ENG) ENG.npWorldFloor = (x, z) => World.floor(x, z);
if (window.ENG) ENG.npSyncTest = g => npSync(g);
World.near = (x, z) => { const out = [], seen = new Set(); for (let i = Math.floor((x - 1.2) / 4); i <= Math.floor((x + 1.2) / 4); i++) for (let j = Math.floor((z - 1.2) / 4); j <= Math.floor((z + 1.2) / 4); j++) { const a = NPW.cells.get(i + ',' + j); if (a) for (const o of a) if (!seen.has(o)) { seen.add(o); out.push(o); } }
  for (const c of NPW.dyn) { const b = c.box; if (b && x > b.min.x - 2 && x < b.max.x + 2 && z > b.min.z - 2 && z < b.max.z + 2) out.push({ x0: b.min.x, x1: b.max.x, y0: b.min.y, y1: b.max.y, z0: b.min.z, z1: b.max.z }); } return out; };
const v3of = args => args.find(a => a && a.isVector3);
FX.blood = (...a) => { const p = v3of(a), g = NPW.game; if (p && g && g.fxp) g.fxp.spawn(p, 6, { color: '#6e0b0b', speed: 1.4, spread: .5, up: 1, life: .5 }); };
FX.spawn = (k, ...a) => { const p = v3of(a), g = NPW.game; if (p && g && g.fxp) g.fxp.spawn(p, 1, { color: k === 'dust' ? '#b9a88a' : '#7a0b0b', speed: .8, life: .6 }); };
FX.decal = () => {}; FX.impact = () => {}; SFX.play = (n, p, v) => { const g = NPW.game; if (g && g.audio) g.audio.play('punch', { pos: p && p.isVector3 ? p : undefined, volume: Math.min(1, (v || .6) * .7), rate: .7 }); };
const G = ENG.Game.prototype;
const baseMake = G.makeRagdoll;
G.makeRagdoll = function (enemy, dir, force) {
  const R = enemy.parts && enemy.parts.__np ? enemy.parts : null; if (!R) return baseMake.call(this, enemy, dir, force); if (this.S.ragdolls === false) return false;
  npSync(this); T.ragdolls = true; Game.time = this.time; const lh = enemy.lastHit || {}, d = dir ? dir.clone().normalize() : new V3(0, 0, 1); enemy.root.updateMatrixWorld(true);
  const r = Ragdolls.spawn({ rig: R, pal: R.__pal, vel: enemy.vel && enemy.vel.isVector3 ? enemy.vel.clone() : new V3(), yaw: enemy.yaw || 0, flags: {}, mods: {} }, { dir: d, dmg: lh.dmg || 30, explosion: !!lh.explosion, force: clamp((force || 30) / 30, .5, 4), limb: null, point: lh.point || R.torso.getWorldPosition(new V3()), t: this.time, zone: lh.zone || 'chest' }, {});
  if (!r) return false; enemy.root.visible = false; enemy.npRagdoll = r; const ms = r.allMeshes(); ms.forEach(m => this.targets.push(m));
  const dsp = r.dispose.bind(r); r.dispose = () => { const all = r.allMeshes(); this.targets = this.targets.filter(t => !all.includes(t)); dsp(); };
  this.player.bt = Math.min(1, (this.player.bt || 0) + .22); return true;
};
const baseHit = G.applyHit;
G.applyHit = function (h, dir, dmg) {
  const rag = h && h.object && h.object.userData.rag; if (rag instanceof Ragdoll) { try { rag.shot(h.point, dir, clamp((dmg || 20) / 300, .04, .4), 320); } catch (e) {} FX.blood(h.point); return; }
  let o = h && h.object; while (o && !(o.userData && o.userData.e)) o = o.parent; const e = o && o.userData.e; if (e && e.enemy) e.enemy.lastHit = { point: h.point.clone(), zone: h.object.userData.zone || h.object.userData.part, dmg };
  return baseHit.call(this, h, dir, dmg);
};
const baseGp = G.updateGameplay;
G.updateGameplay = function (dt) { baseGp.call(this, dt); if (NPW.game === this && Ragdolls.list.length) { Game.time = this.time; Game.camera = this.cam; Ragdolls.update(dt); } };
const baseBlast = G.ragdollImpulse;
G.ragdollImpulse = function (pos, rad, D) { if (baseBlast) baseBlast.call(this, pos, rad, D); if (NPW.game === this && Ragdolls.list.length) try { Ragdolls.blast(pos, rad, (D || 60) / 25); } catch (e) {} };
const baseDispose = G.dispose; G.dispose = function () { if (NPW.game === this) { Ragdolls.clear(); NPW.game = null; } return baseDispose.apply(this, arguments); };
/* third person player gets the same body */
const baseArm = G.armBody;
G.armBody = function (k) {
  const pm = this.playerModel, R = pm && pm.userData.parts; if (!R || !R.__np) return baseArm.call(this, k);
  if (R.__gun) { R.__gun.parent && R.__gun.parent.remove(R.__gun); R.__gun = null; } R.__melee = false; R.__twoHanded = false; if (!k || k === 'fists' || !ENG.WEAPONS[k]) return;
  const gm = ENG.gunModel(k, true); R.gunAnchor.add(gm.group); R.__gun = gm.group; R.__twoHanded = !!ENG.WEAPONS[k].twoHanded; R.__melee = !!ENG.WEAPONS[k].melee; gm.group.userData.muzzle = gm.muzzle; R.gun = gm.group;
};
ENG.NPB = { T, buildRig, poseRig, makeLook, Ragdoll, Ragdolls, World, npSync };

})();
