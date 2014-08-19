var mongoose = require('mongoose');

var Database = function(config) {
  this._config = config;
  this._masters = config.database.masters;
  this._slaves = config.database.read;
}

Database.prototype.connectionString = function() {
  var config = this._config;
  return 'mongodb://' + config.database.masters.join(',') + '/' + config.database.name;
}

Database.prototype.connect = function( done ) {
  var self = this;

  if (!done) var done = new Function();

  // we should always create a new connection, as the singleton model
  // will get in the way of asynchronous processes, like tests, which
  // attempt to close the connection as part of their testing
  self.connection = mongoose.createConnection( self.connectionString() );
  self.connection.on('open', done );

}

Database.prototype.disconnect = function( done ) {
  var self = this;
  if (!self.connection) return done();

  self.connection.close( done )
}

/* export a copy of our Database */
module.exports = Database;
