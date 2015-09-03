#!/usr/bin/env node
var Maki = require('../lib/Maki');
var program = require('commander');

program
  .version(require('../package.json').version)
  .command('maki <command> [parameters...]')
  .option('define <name>', 'Define a resource.')
  .on('define', function() {
    console.log('heyyyy!');
  });




program.parse(process.argv);
