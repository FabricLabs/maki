var util = require('util');
var coalescent = require('coalescent');

var Messenger = function() {
  var self = this;
  
  self._backbone = coalescent();
  
  self._backbone.on('error', function(err, socket) {
    self.emit('error', err);
  });
  
  self._backbone.use( coalescent.tattletale() );
  self._backbone.use( coalescent.courier() );
  self._backbone.use( coalescent.router() );

  return self;
};

util.inherits( Messenger , require('events').EventEmitter );

Messenger.prototype.publish = function( channel , message ) {
  this.emit( channel , message );
  this._backbone.broadcast( channel , message );
};

Messenger.prototype.subscribe = function( channel ) {
  var self = this;
  
  self.on( channel , function(message) {
    self.handle( channel , message );
  });
  
  self._backbone.route( channel , function(socket, message) {
    self.handle( channel , message);
  } );
};

Messenger.prototype.handle = function( channel , message ) {
  console.log( channel + ' provided ' , message );
};

module.exports = Messenger;
