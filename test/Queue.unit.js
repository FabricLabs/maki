var should = require('chai').should();
var assert = require('assert');

var config = {
  database: {
    name: 'maki-queue'
  }
}

describe('Queue', function() {
  describe('#Queue', function() {
    it('should expose a constructor', function(done) {
      assert.equal( typeof( require('../') ) , 'function' );
      done();
    });

    it('should instantiate a queue', function(done) {
      var Queue = require('../');
      var queue = new Queue();

      done();
    });

    it('should allow jobs to be created', function(done) {
      var Queue = require('../');
      var queue = new Queue();

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
      var Queue = require('../');
      var queue = new Queue();

      assert.equal( typeof( queue.Worker ) , 'function' );
      done();
    });

    it('should instantiate a worker', function(done) {
      var Queue = require('../');
      var queue = new Queue();

      var worker = new queue.Worker( config.database.name );

      done();
    });

    it('should process new jobs', function(done) {
      var Queue = require('../');
      var queue = new Queue();

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
      }, 50);

    });
  });
});