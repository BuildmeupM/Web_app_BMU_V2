const jwt = require('jsonwebtoken');
const http = require('http');

const JWT_SECRET = '4b02249b6ab66162ed837857711eecbf1db5ca175fba3ce333ed720bdebb0684cf1a7483c36d12eecb1916fb2406cb1e203bd53666d943e44f48f25ca3ef83dc';
const token = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '1h' });

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/document-entry-work/491/2026/2',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, '\nBODY:', data));
});
req.on('error', e => console.error(e));
req.end();
