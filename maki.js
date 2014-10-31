var config = require('./config');

var Maki = require('./lib/Maki');
var maki = new Maki( config );

maki.define('Random', {});

var HTTP = require('./lib/Service/http');

maki.serve([ HTTP ]);

maki.start();
