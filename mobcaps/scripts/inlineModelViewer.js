const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../node_modules/@google/model-viewer/dist/model-viewer.min.js');
const dest = path.join(__dirname, '../src/modelViewerScript.js');

// Make sure src directory exists
if (!fs.existsSync(path.join(__dirname, '../src'))) {
  fs.mkdirSync(path.join(__dirname, '../src'));
}

const content = fs.readFileSync(src, 'utf8');
const escaped = JSON.stringify(content);

fs.writeFileSync(dest, `const modelViewerScript = ${escaped};\nexport default modelViewerScript;\n`);
console.log('✅ model-viewer script inlined to src/modelViewerScript.js');