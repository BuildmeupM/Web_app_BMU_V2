/* eslint-disable */
const dgram = require('dgram');

const server = dgram.createSocket('udp4');
const port = 5514;

server.on('error', (err) => {
  console.log(`UDP server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  console.log(`\n--- NEW MESSAGE RECEIVED ---`);
  console.log(`From IP: ${rinfo.address}:${rinfo.port}`);
  console.log(`Message raw data: ${msg.toString()}`);
  console.log(`----------------------------\n`);
});

server.on('listening', () => {
  const address = server.address();
  console.log(`UDP Syslog Listener is actively waiting for data on ${address.address}:${address.port}...`);
});

server.bind(port);
