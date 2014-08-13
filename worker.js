var config = require('./config');
var database = require('./db');

var Queue = require('./lib/Queue');
var queue = new Queue( config );

var processors = {
  'test': function( data , jobIsDone ) {
    console.log('#winning' , data );
    jobIsDone();
  }
};

var worker = new queue.Worker( config.database.name );

worker.register( processors );

worker.start();
