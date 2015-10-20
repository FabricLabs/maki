var util = require('util');
var NeDB = require('nedb');

var Datastore = function(config) {
  this._config = config;
  this.root = config.root || process.env.PWD + '/data';
};

util.inherits( Datastore , require('events').EventEmitter );

Datastore.prototype.connectionString = function() {
  var config = this._config;
  return 'mongodb://' + config.database.masters.join(',') + '/' + config.database.name;
}

Datastore.prototype.define = function(name, attributes) {
  return this._define(name, attributes);
};

Datastore.prototype.model = function(name, schema) {
  return this._model(name, schema);
};

Datastore.prototype._define = function(name, attributes) {
  return;
};

Datastore.prototype._model = function(name, schema) {
  var self = this;
  var me = new NeDB({
    filename: self.root + '/' + name,
    autoload: true
  });  
  return me;
};

Datastore.prototype.query = function(q, done) {

};

Datastore.prototype.connect = function( done ) {
  var self = this;

  if (!done) var done = new Function();

  // we should always create a new connection, as the singleton model
  // will get in the way of asynchronous processes, like tests, which
  // attempt to close the connection as part of their testing
  //self.connection = mongoose.createConnection( self.connectionString() );
  //self.connection.on('open', done );

  /* mongoose.connect( self.connectionString() );
  self.mongoose = mongoose; // <- temporary hack
  self.db = mongoose.connection;
  self.db.once('open', function() {
    self.gfs = Grid( self.db.db , mongoose.mongo );
    self.emit('ready');
    done();
  }); */

  self.emit('ready');
  done();

}

Datastore.prototype.disconnect = function( done ) {
  var self = this;
  mongoose.disconnect( done );
}

/* export a copy of our Datastore */
module.exports = Datastore;
