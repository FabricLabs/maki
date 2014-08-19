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

Database.prototype.connect = function() {
  var self = this;
  mongoose.connect( self.connectionString() );
}

/* export a copy of our Database */
module.exports = Database;
