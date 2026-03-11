/* eslint-disable */
const dgram = require('dgram');

const client = dgram.createSocket('udp4');
const message = Buffer.from('<165>1 2026-03-11T16:00:00Z my-nas.local test-app - - - Test NAS log message from local script');

const port = 5514;
const host = 'buildmeupconsultant.direct.synology.me';

console.log(`Sending UDP packet to ${host}:${port}...`);
client.send(message, 0, message.length, port, host, (err) => {
  if (err) {
    console.error('Error sending message:', err);
  } else {
    console.log('Message sent successfully!');
  }
  client.close();
});
