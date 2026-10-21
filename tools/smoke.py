"""Smoke test: runs Vira's self-test (Index.html?selftest=1) in a headless browser and fails loudly if anything breaks.

    python tools/smoke.py                  # tests Index.html in this repo
    python tools/smoke.py --only Neon      # only the checks whose name matches
    python tools/smoke.py --headed         # watch it run in a normal window
    python tools/smoke.py --browser PATH   # a specific Chrome, Edge, Brave or Chromium (or set VIRA_BROWSER)

The page is served from a local server on 127.0.0.1 so it can report each check back as it finishes.
Exit code 0 means every check passed, 1 means something failed (or never finished), 2 means no browser could run it.
"""
import argparse, http.server, json, os, queue, shutil, subprocess, sys, tempfile, threading, time, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
events = queue.Queue()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(n).decode('utf-8', 'replace') if n else ''
        self.send_response(204); self.end_headers()
        if self.path.startswith('/__selftest/'):
            try: data = json.loads(body) if body else {}
            except ValueError: data = {'raw': body}
            events.put((self.path[len('/__selftest/'):], data))


def find_browser(given):
    cands = [given, os.environ.get('VIRA_BROWSER')]
    if sys.platform == 'win32':
        for base in (os.environ.get('PROGRAMFILES(X86)'), os.environ.get('PROGRAMFILES'), os.environ.get('LOCALAPPDATA')):
            if not base: continue
            cands += [os.path.join(base, r'Microsoft\Edge\Application\msedge.exe'), os.path.join(base, r'Google\Chrome\Application\chrome.exe'),
                      os.path.join(base, r'BraveSoftware\Brave-Browser\Application\brave.exe'), os.path.join(base, r'Chromium\Application\chrome.exe')]
    elif sys.platform == 'darwin':
        cands += ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
                  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', '/Applications/Chromium.app/Contents/MacOS/Chromium']
    for name in ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'msedge', 'chrome', 'brave-browser'):
        cands.append(shutil.which(name))
    for c in cands:
        if c and os.path.isfile(c): return c
    return None


def main():
    ap = argparse.ArgumentParser(description='Run the Vira self-test in a headless browser.')
    ap.add_argument('--browser'); ap.add_argument('--only', help='only run checks whose name matches this (a regular expression)')
    ap.add_argument('--timeout', type=float, default=900, help='seconds before giving up (default 900)')
    ap.add_argument('--headed', action='store_true', help='show the browser window'); ap.add_argument('--out', help='also write the full result as JSON here')
    ap.add_argument('--page', default='Index.html', help='the built file to test, inside the repo (default Index.html)')
    a = ap.parse_args()

    page = os.path.join(ROOT, a.page)
    if not os.path.isfile(page) or os.path.relpath(page, ROOT).startswith('..'): print('%s is missing. Run: python build.py' % a.page); return 2
    exe = find_browser(a.browser)
    if not exe: print('No Chrome, Edge, Brave or Chromium was found. Install one, or pass --browser PATH (or set VIRA_BROWSER).'); return 2

    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler); threading.Thread(target=srv.serve_forever, daemon=True).start()
    q = {'selftest': '1', 'report': '1'}
    if a.only: q['only'] = a.only
    url = 'http://127.0.0.1:%d/%s?%s' % (srv.server_address[1], urllib.parse.quote(os.path.relpath(page, ROOT).replace(os.sep, '/')), urllib.parse.urlencode(q))
    prof = tempfile.mkdtemp(prefix='vira-smoke-')
    args = [exe, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync', '--disable-features=Translate,MediaRouter',
            '--user-data-dir=' + prof, '--window-size=1600,1000', '--autoplay-policy=no-user-gesture-required', '--mute-audio',
            '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
            '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    if not a.headed: args += ['--headless=new']
    if sys.platform.startswith('linux'): args += ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle']
    print('Vira smoke test\n  browser: %s\n  page:    %s\n' % (exe, url)); sys.stdout.flush()
    proc = subprocess.Popen(args + [url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    result, seen, t0, last = None, 0, time.time(), 'the page to load'
    try:
        while time.time() - t0 < a.timeout:
            try: kind, data = events.get(timeout=1)
            except queue.Empty:
                if proc.poll() is not None: print('\nThe browser closed before the test finished.'); break
                continue
            if kind == 'progress': last = data.get('name', last)
            elif kind == 'check':
                seen += 1; okc = data.get('ok')
                print('  %s %-62s %s' % ('ok  ' if okc else 'FAIL', data.get('name', '')[:62], '%d ms' % data.get('ms', 0) if okc else ''))
                if not okc:
                    print('       ' + str(data.get('msg', '')))
                    for e in (data.get('errors') or [])[:3]: print('       ' + str(e)[:300])
                sys.stdout.flush()
            elif kind == 'done': result = data; break
    finally:
        try: proc.terminate(); proc.wait(10)
        except Exception:
            try: proc.kill()
            except Exception: pass
        srv.shutdown(); shutil.rmtree(prof, ignore_errors=True)

    if a.out and result is not None:
        with open(a.out, 'w', encoding='utf-8') as f: json.dump(result, f, indent=2)
    if result is None:
        print('\nFAIL: the self-test did not finish within %d s (%d checks reported). Last step: %s' % (a.timeout, seen, last)); return 1
    print('\n%s: %d of %d checks passed in %.1f s (Vira %s, project format %s)' % ('PASS' if result.get('ok') else 'FAIL', result.get('passed', 0), result.get('total', 0), result.get('ms', 0) / 1000, result.get('engine'), result.get('format')))
    if not result.get('ok'):
        for r in result.get('results', []):
            if not r.get('ok'): print('  failed: %s: %s' % (r.get('name'), r.get('msg')))
    return 0 if result.get('ok') else 1


if __name__ == '__main__':
    sys.exit(main())
