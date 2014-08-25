var assert = require('assert');
var expect = require('chai').expect;

var cheerio = require('cheerio');
var request = require('supertest');
var rest = require('restler');
var WebSocket = require('ws');

var config = require('../config');

config.services.http.port = 9201;
config.database.name = 'maki-test';

var Maki = require('../lib/Maki');
var maki = new Maki( config );

maki.define('Person', {
  name: 'Person',
  attributes: {
    username: { type: String , max: 80 , required: true , slug: true },
    description: { type: String , max: 500 },
    hash: { type: String , default: 'asdf', required: true , restricted: true }
  },
  plugins: [
    require('passport-local-mongoose')
  ]
});

function resource( path ) {
  return 'http://' + config.services.http.host + ':' + config.services.http.port + path;
}
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

describe('Maki', function() {
  it('should expose a constructor', function(){
    assert(typeof maki, 'function');
  });
  
  it('should expose a map of resources', function() {
    assert(typeof maki.resources, 'object');
  });
  
  it('should expose a list of resources', function() {
    expect( Object.keys(maki.resources).length ).to.be.at.least(1);
  });
  
  it('should expose a job queue', function() {
    assert( typeof maki.Queue , 'object' );
  });
  
  it('should be able to queue a job', function( done ) {
    maki.queue.enqueue( 'test' , {
      foo: 'bar'
    }, done );
  });
  
  it('should be able to process a queued job', function( done ) {
    // TODO: eliminate need for timeout by solving cttnlsn/monq#38
    this.timeout( 6000 );
    
    var jobData = { id: getRandomInt( 1000 , 10000 ) };
    
    var worker = new maki.queue.Worker( config.database.name );
    worker.register({
      'test': function( data , jobIsDone ) {
        jobIsDone();
        if (data.id == jobData.id ) return done();
      }
    });
    worker.start();

    maki.queue.enqueue( 'test' , jobData , new Function() );

  });

});


before(function(done) {
  maki.start(function() {
    done();
  });
});

describe('http', function(){

  function nonZeroArray(res) {
    if (!res.body) throw new Error('no body');
    if (res.body.length < 1) throw new Error('no resources exposed');
      
    return false;
  }

  it('should be listening for http', function() {
    request( maki.app )
      .get('/')
      .expect(200)
      .end(function(err, res) {
        if (err) throw err;
      });
  });

  it('should expose a list of resources', function() {
    request( maki.app )
      .options('/')
      .expect(200)
      .expect( nonZeroArray )
      .end(function(err, res) {
        if (err) throw err;
      });
  });
  
  it('should return 404 for non-existent resources', function( done ) {
    request( maki.app )
      .get('/this-should-never-exist')
      .end(function(err, res) {
        assert.equal( res.status , 404 );
        done();
      });
  });
  
  it('should allow for resources to be queried', function( done ) {
    request( maki.app )
      .get('/people')
      .expect(200)
      .end(function(err, res) {
        if (err) throw err;
        done();
      });
  });
  
  it('should allow for a resource to be created', function( done ) {
    var randomNum = getRandomInt( 100000 , 1000000 );
    request( maki.app )
      .post('/people')
      .send({ username: 'test-user-'+randomNum })
      .expect(200)
      .end(function(err, res) {
        if (err) throw err;
        done();
      });
  });
  
  it('should not expose restricted fields', function(done) {
    var randomNum = getRandomInt( 100000 , 1000000 );
    rest.post( resource('/people') , {
      data: {
        username: 'test-user-'+randomNum,
        hash: 'fooooooooo'
      }
    }).on('complete', function(createdDoc) {
      expect(createdDoc.hash).to.equal( undefined );
      done();
    });
  });
  
});

describe('ws', function() {
  
  it('should allow for a websocket upgrade', function( done ) {
    var ws = new WebSocket( resource('/') );
    ws.on('open', done );
  });
  
  it('should correctly clean up closed sockets', function( done ) {
    var ws = new WebSocket( resource('/') );
    
    var orig = Object.keys(maki.clients).length;
    var prev = null;
    var curr = null;
    
    ws.on('close', function() {
      now = Object.keys(maki.clients).length;
      assert.ok( now < prev );
      done();
    });
    
    ws.on('open', function() {
      prev = Object.keys(maki.clients).length;
      ws.close();
    });
    
  });

  it('should respond to subscription messages', function( done ) {
    var ws = new WebSocket( resource('/') );

    ws.on('message', function(data) {
      ws.close();
      return done();
    });
    ws.on('open', function() {
      var message = new maki.JSONRPC('subscribe', { channel: '/' });
      ws.send( message.toJSON() );
    });
    
  });

  it('should respond to unsubscription messages', function( done ) {
    var ws = new WebSocket( resource('/') );

    ws.on('message', function(data) {
      ws.close();
      return done();
    });
    ws.on('open', function() {
      var message = new maki.JSONRPC('unsubscribe', { channel: '/' });
      ws.send( message.toJSON() );
    });
    
  });
  
  it('should receive pings', function( done ) {
    var ws = new WebSocket( resource('/') );

    ws.on('message', function(data) {
      var message = JSON.parse( data );
      if (message.method === 'ping') {
        ws.close();
        return done();
      }
    });
    ws.on('open', function() {
      maki.socks.server.markAndSweep();
    });
  });
  
  it('should receive a patch event for new documents', function( done ) {
    var ws = new WebSocket( resource('/people') );
    var randomNum = getRandomInt( 100000 , 1000000 );

    ws.on('message', function(data) {
      var message = JSON.parse( data );
      if (message.method === 'patch') {
        ws.close();
        return done();
      };
    });
    ws.on('open', function() {
      rest.post( resource('/people') , {
        data: { username: 'test-user-'+randomNum }
      });
    });
  });
  
  it('should receive a patch event for changed documents', function( done ) {
    //this.timeout(5000);
    var randomNum = getRandomInt( 100000 , 1000000 );
    var personName = 'test-user-'+randomNum;
    var personURL = resource('/people/' + personName );
    
    rest.post( resource('/people') , {
      data: { username: personName }
    }).on('complete', function(created) {
      var ws = new WebSocket( personURL );
      
      ws.on('message', function(data) {
        var message = JSON.parse( data );
        if (message.method === 'patch') {
          ws.close();
          return done();
        };
      });
      
      ws.on('open', function() {
        rest.patch( personURL , {
          data: { description: Math.random() }
        } );
      });
    });
  });
  
  it('should reject incorrect JSON', function( done ) {
    var ws = new WebSocket( resource('/') );
    
    ws.on('message', function(data) {
      // see http://www.jsonrpc.org/specification#error_object
      var message = JSON.parse( data );
      assert.equal( message.error.code , 32700 );
      done();
    });
    
    ws.on('open', function() {
      ws.send( 'fail me, I dare you' );
    });
    
  });
  
  it('should reject non-JSONRPC messages', function( done ) {
    var ws = new WebSocket( resource('/') );
    
    ws.on('message', function(data) {
      // see http://www.jsonrpc.org/specification#error_object
      var message = JSON.parse( data );
      assert.equal( message.error.code , 32600 );
      done();
    });

    ws.on('open', function() {
      ws.send('{}');
    });
    
  });
  
});

describe('browser', function() {
  var self = this;

  it('should correctly connect', function(done) {
    rest.get( resource('/people') , {
      headers: {
        accept: 'text/html'
      }
    }).on('complete', function(data) {
      var $ = cheerio.load(data);
      assert.ok( $.html() );
      done();
    });
  });
  it('should have a page title', function(done) {
    rest.get( resource('/people') , {
      headers: {
        accept: 'text/html'
      }
    }).on('complete', function(data) {
      var $ = cheerio.load(data);
      assert.ok( $('title').html() );
      done();
    });
  });
  it('should have a content in the content div', function( done ) {
    rest.get( resource('/people') , {
      headers: {
        accept: 'text/html'
      }
    }).on('complete', function(data) {
      var $ = cheerio.load(data);
      assert.ok( $('div.content > *').html() );
      done();
    });
  });
});

describe('browser with javascript', function() {
  
});

describe('cleanup', function() {
  xit('should clean up after itself', function( done ) {
    maki.destroy( done );
  });
});
