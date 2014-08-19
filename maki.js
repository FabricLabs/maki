var config = require('./config');

var Maki = require('./lib/Maki');
var maki = new Maki( config );

maki.start();
