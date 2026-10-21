"""Takes the README screenshots: opens the built engine in a headless browser, sets up a scene (a project, a tab, a
selection, a running game) and saves a picture of it into assets/.

    python tools/shots.py              # every scene
    python tools/shots.py hero ui      # only these
    python tools/shots.py --list       # the scene names
    python tools/shots.py --png        # keep PNG instead of JPEG (JPEG needs Windows PowerShell for the conversion)

Scenes are small scripts that run inside the editor page (see SCENES below). Add one there and it appears in the list.
"""
import argparse, os, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import find_browser  # noqa: E402

# name: (window size, virtual time budget ms, javascript run inside the page)
SCENES = {
    'banner': ((1600, 560), 6000, "banner()"),
    'hero': ((1600, 1000), 14000, "await load('Build sampler'); tab('level'); look([-54, 19, 50], [4, 0, -4])"),
    'hero2': ((1600, 1000), 14000, "await load('Build sampler'); tab('level'); look([36, 15, 46], [-12, 2, 2])"),
    'level': ((1600, 1000), 14000, "await load('Starter level'); tab('level'); const o = Ed.project.objects.find(x => x.name === 'Gate switch') || Ed.project.objects[5]; Ed.bs.select(o.id); look([o.p[0] + 7, 4.5, o.p[2] + 9], [o.p[0], 1.2, o.p[2]])"),
    'build': ((1600, 1000), 16000, "await load('Build sampler'); tab('rooms'); Ed.studio.setMode('kit'); Ed.studio.style = 'modern'; Ed.studio.render(); look([4, 11, 40], [-18, 1, 4])"),
    'generate': ((1600, 1000), 16000, "await load('Build sampler'); tab('rooms'); Ed.studio.setMode('generate'); Ed.studio.gen.cfg.seed = 777; Ed.studio.gen.cfg.w = 14; Ed.studio.gen.cfg.d = 12; Ed.studio.render(); look([54, 52, 48], [54, 0, 6])"),
    'model': ((1600, 1000), 16000, "await load('Starter level'); tab('model'); await wait(300); Ed.sculpt.startScreen(); await wait(200); document.querySelector('.sc-base').click(); await wait(400); sculptSomething()"),
    'logic': ((1600, 1000), 12000, "await load('Logic Tiles test'); tab('logic')"),
    'ui': ((1600, 1000), 14000, "await load('Starter level'); tab('hud'); await wait(300); const m = Ed.uib.screens().find(s => s.kind === 'main'); Ed.uib.setScreen(m.id); await wait(200); Ed.uib.sel = [m.items.find(w => w.kind === 'logo').id]; Ed.uib.render()"),
    'ui_hud': ((1600, 1000), 14000, "await load('Starter level'); tab('hud'); await wait(300); comicHud(); Ed.uib.play = true; Ed.uib.render()"),
    'theme': ((1600, 1000), 14000, "await load('Starter level'); tab('hud'); await wait(300); Ed.uib.themeDialog(); await wait(300); [...document.querySelectorAll('.ub-tcard')].find(c => c.textContent.includes('Neon')).click()"),
    'logo': ((1600, 1000), 14000, "await load('Starter level'); tab('hud'); await wait(300); Ed.uib.logoMaker(null); await wait(300); [...document.querySelectorAll('.ub-lpre .sbtn')].find(b => b.textContent === 'Comic').click()"),
    'anim': ((1600, 1000), 14000, "await load('Project Animation Test'); tab('anim'); await wait(300); look([14, 9, 24], [0, 2, 0])"),
    'cutscene': ((1600, 1000), 14000, "await load('Starter level'); tab('cutscene'); await wait(300); look([0, 8, 14.5], [0, 1, -5])"),
    'sound': ((1600, 1000), 12000, "await load('Starter level'); tab('sound')"),
    'terrain': ((1600, 1000), 18000, "await load('Open world'); tab('terrain'); await wait(300); const m = [...document.querySelectorAll('#details *')].find(e => !e.children.length && e.textContent.trim() === 'Mountains'); if (m) (m.closest('button') || m.parentElement).click(); await wait(600); look([78, 48, 84], [0, 6, -4])"),
    'workshop': ((1600, 1000), 16000, "await load('Starter level'); tab('workshop'); await wait(300); const b = [...document.querySelectorAll('#wsWorkshop button, .ws.on button')].find(x => x.textContent.trim() === 'Turret'); if (b) b.click(); await wait(600); const fl = document.querySelector('.wkmode button:last-child'); if (fl) fl.click(); await wait(600)"),
    'game_menu': ((1600, 900), 16000, "await game('Starter level', async g => { await untilMenu(g); })"),
    'game_play': ((1600, 900), 18000, "await game('Starter level', async g => { await untilMenu(g); g.begin(); if (g.cut) g.endCutscene(); g.player.yaw = .55; await wait(700); })"),
    'game_pause': ((1600, 900), 18000, "await game('Starter level', async g => { await untilMenu(g); g.begin(); if (g.cut) g.endCutscene(); await wait(500); g.pause(); })"),
    'game_dialogue': ((1600, 900), 18000, "await game('Starter level', async g => { await untilMenu(g); g.begin(); if (g.cut) g.endCutscene(); await wait(400); g.showDialogue({ speaker: 'Mara', portrait: 'icon:eye', text: 'The gate only opens from the switch room. I can get you there, but we move now.', choices: [{ label: 'Lead the way' }, { label: 'Give me a minute' }] }); await wait(100); g.dlg.shown = 999; })"),
    'game_neon': ((1600, 900), 20000, "await game('Neon Depths', async g => { await untilMenu(g); g.begin(); if (g.cut) g.endCutscene(); await wait(900); })"),
    'vr': ((1600, 900), 20000, "await game('Neon Depths', async g => { await untilMenu(g); g.begin(); if (g.cut) g.endCutscene(); await wait(300); await g.enterVR(true); await wait(900); })"),
}

HELPERS = r"""
const wait = ms => new Promise(r => setTimeout(r, ms));
const tpl = n => Ed.api.templates.find(t => t[0].startsWith(n))[2]();
const load = async n => { await Ed.api.loadProject(tpl(n), null); Ed.ui.closeModal(); const w = document.getElementById('welcome'); if (w) w.style.display = 'none'; };
const look = (p, t) => Ed.bs.lookFrom(new THREE.Vector3(...p), new THREE.Vector3(...t));
const tab = t => document.querySelector('#tabs [data-tab="' + t + '"]').click();
const zoomOut = () => {};
function sculptSomething() { const S = Ed.sculpt, M = S.mesh; if (!M) return; const p = M.pos; let R = 0, cx = 0, cy = 0, cz = 0, n = p.length / 3; for (let i = 0; i < p.length; i += 3) { cx += p[i] / n; cy += p[i + 1] / n; cz += p[i + 2] / n; } for (let i = 0; i < p.length; i += 3) R = Math.max(R, Math.hypot(p[i] - cx, p[i + 1] - cy, p[i + 2] - cz));
  const hit = (x, y, z, r, s, sign, b, k) => { for (let j = 0; j < (k || 1); j++) S.dab({ x: cx + x * R, y: cy + y * R, z: cz + z * R }, r * R, s, sign, b); };
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .3; hit(Math.cos(a) * .9, Math.sin(a * 3) * .3, Math.sin(a) * .9, .5, .55, 1, 'clay', 4); }
  hit(.4, .55, .75, .3, .7, -1, 'clay', 3); hit(-.4, .55, .75, .3, .7, -1, 'clay', 3); hit(0, -.1, .98, .38, .6, 1, 'clay', 3); hit(0, .98, 0, .55, .5, 1, 'inflate', 2);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .3; hit(Math.cos(a) * .9, Math.sin(a * 3) * .3, Math.sin(a) * .9, .6, .5, 1, 'smooth', 2); } hit(0, 0, 1, .5, .4, 1, 'smooth', 2); S.frame(); S.render(); }
function comicHud() { const T = Ed.uib; T.setScreen('hud');
  const w1 = T.addItem('text'); Object.assign(w1, { text: 'POW!', x: 24, y: 42, size: 72, font: 'Impact', color: '#ffd400', stroke: 4, strokeColor: '#111111', bg: 'burst', bgColor: '#ff2e4d', bgOp: 1, shadow: 'hard', idle: 'wobble', rot: -8 });
  const w2 = T.addItem('text'); Object.assign(w2, { text: 'Find the red key before the gate locks.', x: 72, y: 36, size: 24, font: 'Comic Sans MS', color: '#111111', bg: 'bubble', bgColor: '#ffffff', bgOp: 1, halftone: true });
  const w3 = T.addItem('pips'); Object.assign(w3, { x: 14, y: 24, which: 'health', count: 5, size: 30, color: '#ff4d6d', idle: 'pulse' });
  const w4 = T.addItem('minimap'); Object.assign(w4, { x: 88, y: 20, w: 180 });
  const w5 = T.addItem('logo'); Object.assign(w5, { x: 50, y: 14, w: 320, h: 130, text: 'Score {Score}', sub: 'neon style', style: 'neon', shape: 'hex', color: '#3fd0ff', color2: '#0d1020' });
  const w6 = T.addItem('text'); Object.assign(w6, { text: 'TIME {time}', x: 50, y: 62, size: 44, color: '#ffffff', grad: '#f0b43c', shadow: 'neon', letter: 4, weight: 800 }); T.sel = [w2.id]; }
async function game(name, fn) { const p = tpl(name); document.getElementById('app').style.display = 'none'; const c = document.createElement('div'); c.style.cssText = 'position:fixed;inset:0;background:#000'; document.body.append(c);
  const g = window.__g = new ENG.Game(c, p, { onExit() { } }); await g.ready; await fn(g); }
async function untilMenu(g) { for (let i = 0; i < 200 && g.state === 'loading'; i++) await wait(50); await wait(900); }
function banner() { const d = document.createElement('div'); d.innerHTML = '<div style="position:fixed;inset:0;z-index:9999;background:radial-gradient(120% 110% at 50% -10%,#1b1f29 0%,#0b0d11 55%,#06070a 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;overflow:hidden">'
    + '<div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:40px 40px;-webkit-mask-image:radial-gradient(ellipse at 50% 40%,#000 20%,transparent 70%);mask-image:radial-gradient(ellipse at 50% 40%,#000 20%,transparent 70%)"></div>'
    + '<div style="position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#e5383b 50%,transparent)"></div>'
    + '<div style="display:flex;align-items:center;gap:34px;position:relative"><svg width="118" height="118" viewBox="0 0 32 32" fill="none" stroke="#e5383b" stroke-width="1.5" stroke-linejoin="round"><path d="M16 3.5 27 9.8v12.4L16 28.5 5 22.2V9.8z"/><path d="M10.5 11.5 16 21.5l5.5-10"/></svg>'
    + '<div><div style="font:700 124px/1 \'Chakra Petch\',sans-serif;letter-spacing:.06em">VIRA <span style="color:#e5383b">ENGINE</span></div><div style="font:500 28px \'Barlow\',sans-serif;color:#9aa3ad;margin-top:14px;letter-spacing:.02em">A complete 3D game engine in one file. Build it, play it, share it.</div></div></div></div>';
  document.body.append(d.firstChild); }
"""

RUNNER = """
<script>
window.addEventListener('error', e => console.log('SHOT error ' + e.message + ' line ' + e.lineno));
window.addEventListener('load', () => { setTimeout(async () => { try { HELPERS_HERE
  document.documentElement.classList.add('rm'); const name = decodeURIComponent(location.hash.slice(1)); const scenes = SCENES_HERE; const code = scenes[name]; if (!code) { console.log('SHOT unknown ' + name); return; }
  await (new Function('wait', 'tpl', 'load', 'look', 'tab', 'zoomOut', 'sculptSomething', 'comicHud', 'game', 'untilMenu', 'banner', 'return (async () => { ' + code + ' })()'))(wait, tpl, load, look, tab, zoomOut, sculptSomething, comicHud, game, untilMenu, banner);
  console.log('SHOT done ' + name); } catch (e) { console.log('SHOT failed ' + e.message + ' ' + (e.stack || '').split('\\n')[1]); } }, 2500); });
</script></body>"""


def main():
    ap = argparse.ArgumentParser(description='Take the README screenshots.')
    ap.add_argument('scenes', nargs='*'); ap.add_argument('--list', action='store_true'); ap.add_argument('--png', action='store_true'); ap.add_argument('--browser'); ap.add_argument('--out', default=os.path.join(ROOT, 'assets'))
    a = ap.parse_args()
    if a.list: print('\n'.join(SCENES)); return 0
    names = a.scenes or list(SCENES); bad = [n for n in names if n not in SCENES]
    if bad: print('Unknown scene: ' + ', '.join(bad)); return 2
    page = os.path.join(ROOT, 'Index.html')
    if not os.path.isfile(page): print('Index.html is missing. Run: python build.py'); return 2
    exe = find_browser(a.browser)
    if not exe: print('No Chrome, Edge, Brave or Chromium was found.'); return 2
    with open(page, encoding='utf-8') as f: html = f.read()
    import json
    runner = RUNNER.replace('HELPERS_HERE', HELPERS).replace('SCENES_HERE', json.dumps({k: v[2] for k, v in SCENES.items()}))
    i = html.rfind('</body>'); html = html[:i] + runner + html[i + 7:]
    work = tempfile.mkdtemp(prefix='vira-shots-'); test = os.path.join(work, 'shots.html')
    with open(test, 'w', encoding='utf-8') as f: f.write(html)
    os.makedirs(a.out, exist_ok=True); ok = 0
    try:
        for n in names:
            (w, h), budget, _ = SCENES[n]; png = os.path.join(work, n + '.png'); prof = os.path.join(work, 'profile-' + n); log = os.path.join(work, n + '.log')
            url = 'file:///' + test.replace('\\', '/') + '#' + n
            args = [exe, '--headless=new', '--no-first-run', '--disable-extensions', '--mute-audio', '--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-device-scale-factor=1',
                    '--user-data-dir=' + prof, '--window-size=%d,%d' % (w, h), '--virtual-time-budget=%d' % budget, '--enable-logging=stderr', '--v=0', '--screenshot=' + png, url]
            if sys.platform.startswith('linux'): args += ['--no-sandbox', '--disable-dev-shm-usage']
            with open(log, 'w', encoding='utf-8') as lf: subprocess.run(args, stdout=subprocess.DEVNULL, stderr=lf, timeout=300)
            msgs = [l.split('"')[1] for l in open(log, encoding='utf-8', errors='replace') if 'SHOT ' in l and '"' in l]
            state = next((m for m in msgs if m.startswith('SHOT failed') or m.startswith('SHOT error') or m.startswith('SHOT unknown')), None) or next((m for m in msgs if m.startswith('SHOT done')), 'SHOT no result')
            if not os.path.isfile(png): print('  FAIL %-14s no screenshot (%s)' % (n, state)); continue
            dest = os.path.join(a.out, n + ('.png' if a.png else '.jpg'))
            if a.png or sys.platform != 'win32': shutil.copyfile(png, dest if a.png else dest.replace('.jpg', '.png'))
            else:
                ps = ("Add-Type -AssemblyName System.Drawing; $i=[System.Drawing.Image]::FromFile('%s'); $e=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }; "
                      "$p=New-Object System.Drawing.Imaging.EncoderParameters(1); $p.Param[0]=New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality,[long]90); $i.Save('%s',$e,$p); $i.Dispose()") % (png, dest)
                subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-Command', ps], check=True, stdout=subprocess.DEVNULL)
            ok += 1; print('  ok   %-14s %s  (%s)' % (n, os.path.relpath(dest, ROOT), state.replace('SHOT ', '')))
    finally:
        shutil.rmtree(work, ignore_errors=True)
    print('%d of %d scenes saved' % (ok, len(names))); return 0 if ok == len(names) else 1


if __name__ == '__main__':
    sys.exit(main())
