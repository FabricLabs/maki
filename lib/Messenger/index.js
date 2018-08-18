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

  self._backbone.listen((config.fabric) ? config.fabric.port || 1337 : 1337);

  return self;
};

util.inherits( Messenger , require('events').EventEmitter );

Messenger.prototype.publish = function( channel , message ) {
  this.emit('message', channel , message );
  this._backbone.broadcast( channel , message );
};

Messenger.prototype.stop = async function () {
  await this._backbone.destroy();
};

module.exports = Messenger;
