var util = require('util');
var coalescent = require('coalescent');
var Onramp = require('onramp');

var Messenger = function(config) {
  var self = this;
  if (!config) var config = {};

  self.onramp = Onramp.create();
  self.onramp.on('connection', function(connection) {
    console.log('new P connection', connection.address);
    self.onramp.connections.forEach(function(other) {
      if (other === connection) return;
      connection.send(other.address);
      other.send(connection.address);
    });
  });

  self._backbone = coalescent({
    seeds: config.seeds || []
  });

  self._backbone.on('error', function(err, socket) {
    self.emit('error', err);
  });

  self._backbone.use( coalescent.smartrelay() );
  self._backbone.use( coalescent.courier() );
  self._backbone.use( coalescent.router() );

  self._backbone.listen((config.fabric) ? config.fabric.port || 1337 : 1337);

  return self;
};

util.inherits( Messenger , require('events').EventEmitter );

Messenger.prototype.publish = function( channel , message ) {
  this.emit('message', channel , message );
  this._backbone.broadcast( channel , message );
};

module.exports = Messenger;
