var assert = require('assert');
var should = require('chai').should();

var config = require('../../config');

var Maki = require('../../lib/Maki');
var maki = new Maki( config );

before(function(done) {
  maki.start( done );
});

after(function(done) {
  maki.destroy( done );
});

describe('Queue', function() {
  describe('#Queue', function() {
    it('should expose a constructor', function(done) {
      assert(typeof maki.Queue, 'function');
      
      done();
    });

    it('should instantiate a queue', function(done) {
      var queue = new maki.Queue( config );

      done();
    });

    it('should allow jobs to be created', function(done) {
      var queue = new maki.Queue( config );

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
      var queue = new maki.Queue( config );

      assert.equal( typeof( queue.Worker ) , 'function' );
      done();
    });

    it('should instantiate a worker', function(done) {
      var queue = new maki.Queue( config );

      var worker = new queue.Worker( config.database.name );

      done();
    });

    it('should process new jobs', function(done) {
      var queue = new maki.Queue( config );

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
