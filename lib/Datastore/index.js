'use strict';

const EventEmitter = require('events').EventEmitter;
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

class Datastore extends EventEmitter {
  constructor (config) {
    super(config);

    this._config = Object.assign({
      name: config.name,
      masters: ['localhost']
    }, config);

    this._masters = this._config.masters;
    this._slaves = this._config.read;

    return this;
  }
}

Datastore.prototype.connectionString = function () {
  let config = this._config;
  if (config.database.string) {
    return config.database.string;
  } else {
    return 'mongodb://' + config.masters.join(',') + '/' + config.name;
  }
};

Datastore.prototype.connect = async function connect () {
  this.mongoose = await mongoose.connect(this.connectionString());
  this.db = mongoose.connection;
  this.gfs = Grid(this.db.db, mongoose.mongo);

  this.db.on('error', function (err) {
    console.log('INTERNAL ERROR', err);
  });

  console.log('[DATASTORE]'.bold.green, '[' + this._config.database.name + ']'.bold, 'ready'.green);

  this.emit('ready');
  return this;
};

Datastore.prototype.disconnect = async function disconnect (done) {
  return mongoose.disconnect(done);
};

/* export a copy of our Datastore */
module.exports = Datastore;
