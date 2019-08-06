'use strict';

const config = require('./config');

const Fabric = require('@fabric/core');
const Server = require('@fabric/http/types/server');

async function main () {
  let fabric = new Fabric(config);
  let server = new Server(config.services.http);

  await fabric.start();
  await server.start();

  console.log('server:', server);
}

main();
