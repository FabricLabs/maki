var config = require('./config');

var Maki = require('./lib/Maki');
var maki = new Maki( config );

var resources = [
  
];

resources.forEach(function(resource) {
  maki.define( resource.name , resource );
});

maki.start();
