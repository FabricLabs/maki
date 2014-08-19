// config
var config = require('./config');
var database = require('./db');

var Maki = require('./lib/Maki');
var maki = new Maki( config );

maki.start();
