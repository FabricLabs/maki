var assert = require('assert');
var should = require('chai').should();

var config = {
  database: {
    name: 'maki-queue'
  }
}

describe('Queue', function() {
  describe('#Queue', function() {
    it('should expose a constructor', function(done) {
      var Queue = require('../lib/Queue');
      assert(typeof Queue, 'function');
      
      done();
    });

    it('should instantiate a queue', function(done) {
      var Queue = require('../lib/Queue');
      var queue = new Queue( config );

      done();
    });

    it('should allow jobs to be created', function(done) {
      var Queue = require('../lib/Queue');
      var queue = new Queue( config );

      queue.enqueue('test', {
        foo: 'bar'
      }, function(err) {
        assert.equal( err , null );
        done();
      });

    });
  });
  describe('#Worker', function() {
    it('should expose a constructor for the Worker', function(done) {
      var Queue = require('../lib/Queue');
      var queue = new Queue( config );

      assert.equal( typeof( queue.Worker ) , 'function' );
      done();
    });

    it('should instantiate a worker', function(done) {
      var Queue = require('../lib/Queue');
      var queue = new Queue( config );

      var worker = new queue.Worker( config.database.name );

      done();
    });

    it('should process new jobs', function(done) {
      var Queue = require('../lib/Queue');
      var queue = new Queue( config );

      var worker = new queue.Worker( config.database.name );
      worker.jobRun = false;

      worker.register({
        'test': function( data , jobIsDone ) {
          worker.jobRun = true;
          jobIsDone();
        }
      });

      worker.start();

      queue.enqueue('test', {
        foo: 'bar'
      }, function(err) {});

      setInterval(function() {
        if (worker.jobRun === true) {
          done();
        }
      }, 10);

    });
  });
});
