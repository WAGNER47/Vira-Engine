"""Builds Index.html: the whole Vira Engine (editor + runtime + libraries + fonts) in one offline HTML file.

    python build.py              # writes Index.html next to this script
    python build.py out.html     # writes somewhere else
"""
import base64, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
def path(*p): return os.path.join(ROOT, *p)
def read(*p):
    with open(path(*p), encoding='utf-8') as f: return f.read()

# runtime files, in load order (later files extend earlier ones; project.js wraps ENG.migrate and must stay last)
RUNTIME = ['rt.js', 'logic.js', 'fx.js', 'vira.js', 'sculptmesh.js', 'np_guns.js', 'fl_data.js', 'starters.js', 'np_body.js', 'cubegrid.js', 'cubegrid2.js',
           'rooms_data.js', 'rooms_free.js', 'terrain.js', 'vis.js', 'move.js', 'cine.js', 'lights2.js', 'anim.js', 'stairs.js', 'snd.js',
           'wk.js', 'vr.js', 'rogue.js', 'kits.js', 'worldgen.js', 'screens.js', 'project.js']
EDITOR = ['imp.js', 'ed.js', 'sculpt.js', 'ui.js', 'build.js', 'uitab.js', 'safety.js', 'selftest.js']

shell = read('src', 'shell.html')
rt = '\n'.join(read('src', 'runtime', f) for f in RUNTIME)
ed = '\n'.join(read('src', 'editor', f) for f in EDITOR)
for name, src in (('runtime', rt), ('editor', ed)):
    assert '</script' not in src.lower(), name + ' contains </script'
out = shell.replace('/*RUNTIME*/', rt).replace('/*EDITOR*/', ed)

# the CDN script tags in shell.html are replaced by the bundled copies, so the file works offline
LIBS = [('lib-three', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'three/three.min.js'),
        ('lib-tc', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js', 'three/examples/js/controls/TransformControls.js'),
        ('lib-gltf', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', 'three/examples/js/loaders/GLTFLoader.js'),
        ('lib-obj', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js', 'three/examples/js/loaders/OBJLoader.js'),
        ('lib-skel', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js', 'three/examples/js/utils/SkeletonUtils.js'),
        ('lib-cannon', 'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js', 'cannon/cannon.min.js')]
def lib(p):
    code = read('lib', p)
    assert '</script' not in code.lower() and '<!--' not in code and '<script' not in code.lower(), p
    return code
for lid, url, p in LIBS:
    tag = '<script src="%s"></script>' % url
    assert out.count(tag) == 1, tag
    out = out.replace(tag, '<script id="%s">\n%s\n</script>' % (lid, lib(p)))
EXTRA = [('lib-copy', 'shaders/CopyShader.js'), ('lib-lumhp', 'shaders/LuminosityHighPassShader.js'), ('lib-afters', 'shaders/AfterimageShader.js'),
         ('lib-fxaa', 'shaders/FXAAShader.js'), ('lib-composer', 'postprocessing/EffectComposer.js'), ('lib-renderpass', 'postprocessing/RenderPass.js'),
         ('lib-shaderpass', 'postprocessing/ShaderPass.js'), ('lib-maskpass', 'postprocessing/MaskPass.js'), ('lib-bloom', 'postprocessing/UnrealBloomPass.js'),
         ('lib-afterpass', 'postprocessing/AfterimagePass.js'), ('lib-reflector', 'objects/Reflector.js')]
anchor = '<script id="lib-cannon">'
assert out.count(anchor) == 1
out = out.replace(anchor, ''.join('<script id="%s">\n%s\n</script>\n' % (lid, lib('three/examples/js/' + p)) for lid, p in EXTRA) + anchor)

# fonts are embedded as data: URLs instead of loading from Google Fonts
css = ''
for fam, stem, weights in (('Chakra Petch', 'chakra-petch', (500, 600, 700)), ('Barlow', 'barlow', (400, 500, 600))):
    for w in weights:
        with open(path('lib', 'fonts', '%s-latin-%d-normal.woff2' % (stem, w)), 'rb') as f: b64 = base64.b64encode(f.read()).decode()
        css += '@font-face{font-family:"%s";font-style:normal;font-weight:%d;font-display:swap;src:url(data:font/woff2;base64,%s) format("woff2")}\n' % (fam, w, b64)
for line in ['<link rel="preconnect" href="https://fonts.googleapis.com">\n', '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n',
             '<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Chakra+Petch:wght@500;600;700&display=swap" rel="stylesheet">\n']:
    assert out.count(line) == 1, line
    out = out.replace(line, '')
out = out.replace('<style>\n:root{', '<style id="kiln-fonts">\n' + css + '</style>\n<style>\n:root{', 1)
assert 'kiln-fonts' in out

ext = re.findall(r'(?:src|href)="(https?://[^"]+)"', out)
target = sys.argv[1] if len(sys.argv) > 1 else path('Index.html')
with open(target, 'w', encoding='utf-8', newline='\n') as f: f.write(out)
print('wrote', os.path.relpath(target, ROOT), '|', len(out), 'characters | external src/href left:', ext)
