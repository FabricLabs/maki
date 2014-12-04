var config = require('./config');
var database = require('./db');

var Queue = require('./lib/Queue');
var queue = new Queue( config );

queue.enqueue('test', {
 foo: 'bar'
}, function(err, job) {
  if (err) console.log(err);
  console.log('queued up!');
  process.exit();
});