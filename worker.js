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

worker.on('dequeued', function (data) {
  console.log('worker dequeued job %s', data._id );
});
worker.on('failed', function (data) {
  console.log('job %s failed', data._id , data.data );
});
worker.on('complete', function (data) {
  console.log('job %s complete', data._id );
});
worker.on('error', function (err) {
  console.log('worker error', err );
});

worker.start();
