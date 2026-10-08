const fs = require('node:fs');
fs.copyFileSync('dist/main.js', 'main.js');
fs.copyFileSync('dist/main.js.LICENSE.txt', 'main.js.LICENSE.txt');
