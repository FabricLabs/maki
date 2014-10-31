var util = require('util');

var Service = function( config ) {
  this.name = config.name;
};

util.inherits( Service , require('events').EventEmitter );

Service.prototype.attach = function( maki ) {
  var self = this;
  
  Object.keys( maki.resources ).forEach(function( r ) {
    var resource = maki.resources[ r ];
    
    
  });
  
  return self;
};

module.exports = Service;
