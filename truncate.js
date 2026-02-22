const fs = require('fs');
const f = 'src/pages/MessengerRoutes.tsx';
const content = fs.readFileSync(f, 'utf8');
const lines = content.split(/\r?\n/);
const clean = lines.slice(0, 1059).join('\r\n') + '\r\n';
fs.writeFileSync(f, clean, 'utf8');
console.log('Trimmed from ' + lines.length + ' to 1059 lines');
