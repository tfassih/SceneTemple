"""Build and launch-test the offline installer for the current native platform."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import plistlib
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text().strip()
RUNTIME = '43.8.12'
HASHES = {
    'linux-x64': '737419891e0a749488c854db5d3b47f46ae128355566b5e7b916dd030c631663',
    'win32-x64': '5af2194e6b86fcad6d9f66d0a9c2158fecceaf1bd9518f43e68bd629dd3f6b9d',
    'darwin-x64': '5d9185374c3a0676db02768037c484eafa8846f7630b4fe31c761434ab61b6f7',
    'darwin-arm64': 'd48d1b50bb4afa3e96991c350cff5ef0d493731456b13c003bc4f354f5909dcb',
}
DIST = ROOT / 'dist'
ARTIFACTS = ROOT / 'artifacts'
def run(*args, **kwargs):
    return subprocess.run([str(a) for a in args], check=True, **kwargs)
def textfile(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value.strip()+'\n', encoding='utf-8')

def fetch(platform_id):
    filename = f'electron-v{RUNTIME}-{platform_id}.zip'
    cache = Path(tempfile.gettempdir()) / 'scenetemple-electron' / filename
    cache.parent.mkdir(parents=True, exist_ok=True)
    if cache.exists() and hashlib.sha256(cache.read_bytes()).hexdigest() == HASHES[platform_id]:
        return cache
    req = urllib.request.Request(f'https://github.com/electron/electron/releases/download/v{RUNTIME}/{filename}', headers={'User-Agent':'SceneTemple-release-build'})
    with urllib.request.urlopen(req, timeout=150) as source, cache.open('wb') as dest:
        shutil.copyfileobj(source,dest)
    if hashlib.sha256(cache.read_bytes()).hexdigest() != HASHES[platform_id]:
        raise ValueError('Electron archive checksum mismatch')
    return cache

def resources(dest):
    app_dir = dest / 'app'
    app_dir.mkdir(parents=True)
    (dest / 'default_app.asar').unlink(missing_ok=True)
    shutil.copytree(ROOT / 'app',app_dir / 'app')
    shutil.copytree(ROOT / 'desktop',app_dir / 'desktop',ignore=shutil.ignore_patterns('*.iss','*.icns'))
    (app_dir / 'tests').mkdir()
    shutil.copy2(ROOT / 'tests/native-smoke.cjs',app_dir / 'tests')
    for name in ['package.json','README.md']:
        shutil.copy2(ROOT / name,app_dir / name)

def linux(stage,archive):
    root=stage/'root'
    core=root/'opt/scenetemple'
    core.mkdir(parents=True)
    run('unzip','-q',archive,'-d',core)
    resources(core/'resources')
    exe=core/'scenetemple'
    (core/'electron').rename(exe)
    (core/'chrome-sandbox').chmod(0o4755)
    textfile(root/'DEBIAN/control', f"""Package: scenetemple
Version: {VERSION}
Section: editors
Priority: optional
Architecture: amd64
Maintainer: SceneTemple contributors <noreply@github.com>
Depends: libgtk-3-0t64 | libgtk-3-0, libnss3, libasound2t64 | libasound2, libatk-bridge2.0-0t64 | libatk-bridge2.0-0, libdrm2, libgbm1, libxkbcommon0, libx11-xcb1, libxcomposite1, libxdamage1, libxrandr2, libxfixes3, libxss1, libatspi2.0-0t64 | libatspi2.0-0, libcups2t64 | libcups2, libnotify4, xdg-utils
Description: Offline scriptwriting for screen, stage and interactive media
 Write, navigate, proofread, and export formatted scripts locally.
Homepage: https://github.com/tfassih/SceneTemple""")
    bindir=root/'usr/bin';bindir.mkdir(parents=True)
    (bindir/'scenetemple').symlink_to('/opt/scenetemple/scenetemple')
    textfile(root/'usr/share/applications/scenetemple.desktop', """[Desktop Entry]
Type=Application
Name=SceneTemple
Comment=Write screenplays, stage plays and interactive scripts
Exec=/opt/scenetemple/scenetemple %f
Icon=scenetemple
Terminal=false
Categories=Office;TextEditor;
MimeType=application/x-scenetemple;
StartupWMClass=scenetemple""")
    textfile(root/'usr/share/mime/packages/scenetemple.xml','<?xml version="1.0"?><mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info"><mime-type type="application/x-scenetemple"><comment>SceneTemple project</comment><glob pattern="*.scenetemple"/></mime-type></mime-info>')
    icons=root/'usr/share/icons/hicolor/512x512/apps';icons.mkdir(parents=True)
    shutil.copy2(ROOT/'app/assets/icon.png',icons/'scenetemple.png')
    dest=ARTIFACTS/f'SceneTemple-{VERSION}-Ubuntu-amd64.deb'
    run('dpkg-deb','--root-owner-group','-Zxz','-z3','--build',root,dest)
    run('dpkg-deb','--info',dest)
    return exe

def windows(stage,archive):
    core=stage/'SceneTemple';core.mkdir()
    with ZipFile(archive) as z:z.extractall(core)
    exe=core/'SceneTemple.exe';(core/'electron.exe').rename(exe)
    resources(core/'resources')
    compiler=shutil.which('iscc') or Path(os.environ.get('ProgramFiles(x86)','C:/Program Files (x86)'))/'Inno Setup 6/ISCC.exe'
    if not Path(compiler).exists():raise RuntimeError('Install Inno Setup 6 to build the Windows installer.')
    run(compiler,f'/DAppVersion={VERSION}',f'/DSourceDir={core}',f'/DArtifactDir={ARTIFACTS}',ROOT/'desktop/windows.iss')
    # Verify the offline setup and run the installed application in a private test destination.
    dest=stage/'installed'
    setup=ARTIFACTS/f'SceneTemple-{VERSION}-Windows-x64-Setup.exe'
    run(setup,'/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/NOICONS',f'/DIR={dest}')
    return dest/'SceneTemple.exe'

def mac(stage,archive,arch):
    unpack=stage/'unpack';unpack.mkdir()
    run('ditto','-x','-k',archive,unpack)
    volume=stage/'volume';volume.mkdir()
    app=volume/'SceneTemple.app';(unpack/'Electron.app').rename(app)
    (app/'Contents/MacOS/Electron').rename(app/'Contents/MacOS/SceneTemple')
    res=app/'Contents/Resources'
    resources(res)
    shutil.copy2(ROOT/'desktop/icon.icns',res/'scenetemple.icns')
    for license_name in ['LICENSE','LICENSES.chromium.html']:
        if (unpack/license_name).exists():shutil.copy2(unpack/license_name,res/license_name)
    info=app/'Contents/Info.plist';props=plistlib.loads(info.read_bytes())
    props.update(CFBundleIdentifier='io.github.tfassih.scenetemple',CFBundleName='SceneTemple',CFBundleDisplayName='SceneTemple',
        CFBundleExecutable='SceneTemple',CFBundleVersion=VERSION,CFBundleShortVersionString=VERSION,CFBundleIconFile='scenetemple.icns',LSMinimumSystemVersion='12.0.0',
        CFBundleDocumentTypes=[{'CFBundleTypeName':'SceneTemple project','CFBundleTypeRole':'Editor','LSHandlerRank':'Owner','LSItemContentTypes':['io.github.tfassih.scenetemple.project']}],
        UTExportedTypeDeclarations=[{'UTTypeIdentifier':'io.github.tfassih.scenetemple.project','UTTypeDescription':'SceneTemple project','UTTypeConformsTo':['public.json'],'UTTypeTagSpecification':{'public.filename-extension':['scenetemple']}}])
    info.write_bytes(plistlib.dumps(props))
    run('codesign','--force','--deep','--sign','-',app)
    run('codesign','--verify','--deep','--strict',app)
    (volume/'Applications').symlink_to('/Applications')
    label='Intel' if arch=='x64' else 'Apple-Silicon'
    target=ARTIFACTS/f'SceneTemple-{VERSION}-macOS-{label}.dmg'
    run('hdiutil','create','-volname','SceneTemple','-srcfolder',volume,'-format','UDZO','-ov',target)
    run('hdiutil','verify',target)
    return app/'Contents/MacOS/SceneTemple'

def portable():
    output=ARTIFACTS/f'SceneTemple-{VERSION}-Portable.zip'
    with ZipFile(output,'w',ZIP_DEFLATED) as z:
        for f in sorted((ROOT/'app').rglob('*')):
            if f.is_file():z.write(f,Path('SceneTemple')/f.relative_to(ROOT/'app'))
        z.writestr('SceneTemple/START-HERE.txt','Open index.html in a desktop browser. Files and fonts run locally. Open or save .scenetemple projects. PDF export uses the browser print dialog. Use your browser’s Save as PDF with headers and footers disabled. The native installer adds direct file saves and PDF export.\n')
    return output

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--portable',action='store_true');args=parser.parse_args()
    ARTIFACTS.mkdir(exist_ok=True)
    run('node',ROOT/'tools/prepare.cjs')
    if args.portable:print(portable());return
    arch={'x86_64':'x64','amd64':'x64','arm64':'arm64','aarch64':'arm64'}[platform.machine().lower()]
    platform_id=sys.platform+'-'+arch
    archive=fetch(platform_id);DIST.mkdir(exist_ok=True)
    stage=Path(tempfile.mkdtemp(prefix='native-',dir=DIST))
    if sys.platform=='win32':exe=windows(stage,archive)
    elif sys.platform=='darwin':exe=mac(stage,archive,arch)
    elif sys.platform=='linux':exe=linux(stage,archive)
    else:raise RuntimeError('Unsupported build host')
    qa=DIST/'qa';qa.mkdir(exist_ok=True)
    env={**os.environ,'SCENETEMPLE_TEST_DIR':str(qa)}
    cmd=[str(exe),'--scenetemple-test']
    if sys.platform=='linux':cmd=['xvfb-run','-a',*cmd,'--no-sandbox']
    result=subprocess.run(cmd,env=env,timeout=160)
    if result.returncode or not (qa/'success.json').exists():
        if (qa/'failure.txt').exists():print((qa/'failure.txt').read_text())
        raise RuntimeError(f'Native smoke test failed (exit {result.returncode})')
    print('Native smoke test:',(qa/'success.json').read_text())

if __name__=='__main__':main()
