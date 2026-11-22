const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '../app/assets');
const fonts = {};
for (const face of ['Regular','Bold','Italic','BoldItalic']) {
  fonts[face] = fs.readFileSync(path.join(base, 'CourierPrime-' + face + '.ttf')).toString('base64');
}
fs.writeFileSync(path.join(base,'font-data.js'), 'globalThis.SceneFonts = '+JSON.stringify(fonts)+';\n');

if (!fs.existsSync(path.join(base,'en-us.js'))) {
  const {execFileSync}=require('node:child_process');
  const python=process.platform==='win32'?'python':'python3';
  execFileSync(python,[path.join(__dirname,'dictionary.py'),'--fetch'],{stdio:'inherit'});
}
