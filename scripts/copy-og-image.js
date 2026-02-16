const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'public', 'og-image.png');
const dest = path.join(__dirname, '..', 'dist', 'og-image.png');
if (fs.existsSync(src)) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('Copied og-image.png to dist/');
}
