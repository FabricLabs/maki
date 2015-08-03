var util = require('util');
var coalescent = require('coalescent');

var Messenger = function(config) {
  var self = this;
  if (!config) var config = {};

  self._backbone = coalescent({
    seeds: config.seeds || []
  });

  self._backbone.on('error', function(err, socket) {
    self.emit('error', err);
  });

  self._backbone.use( coalescent.smartrelay() );
  self._backbone.use( coalescent.courier() );
  self._backbone.use( coalescent.router() );

  return self;
};

util.inherits( Messenger , require('events').EventEmitter );

Messenger.prototype.publish = function( channel , message ) {
  console.log('publish', channel , message );
  this.emit('message', channel , message );
  this._backbone.broadcast( channel , message );
};

module.exports = Messenger;
