var config = require('./config')

var mongoose = require('mongoose');
mongoose.connect('localhost', config.databaseName );
exports.mongoose = mongoose;