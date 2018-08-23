'use strict';

const coalescent = require('coalescent');
const EventEmitter = require('events').EventEmitter;

class Messenger extends EventEmitter {
  constructor (config) {
    super(config);

    this.config = Object.assign({
      port: 1337,
      seeds: []
    }, config);

    this._backbone = coalescent({
      seeds: this.config.seeds
    });

    this._relay = coalescent.smartrelay();
    this._courier = coalescent.courier();
    this._router = coalescent.router();

    this._backbone.on('error', this._errorHandler.bind(this));

    this._backbone.use(this._relay);
    this._backbone.use(this._courier);
    this._backbone.use(this._router);

    return this;
  }
}

Messenger.prototype.publish = function publish (channel, message) {
  this.emit('message', channel, message);
  this._backbone.broadcast(channel, message);
};

Messenger.prototype.start = async function () {
  return this._backbone.listen(this.config.port);
};

Messenger.prototype.stop = async function () {
  return this._backbone.destroy();
};

Messenger.prototype._errorHandler = function (err) {
  console.error('[MESSENGER:ERROR]', err);
};

module.exports = Messenger;
