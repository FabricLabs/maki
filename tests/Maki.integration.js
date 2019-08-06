var assert = require('assert');
var expect = require('chai').expect;

var cheerio = require('cheerio');
var request = require('supertest');
var async = require('async');
var rest = require('restler');
var Form = require('form-data');
var WebSocket = require('ws');
var JSONRPC = require('maki-jsonrpc');

var config = require('../config');

config.services.http.port = 9201;
config.services.spdy.port = config.services.http.port + 443 - 80;
config.database.name = 'maki-test';

var Maki = require('../lib/Maki');
var maki = new Maki( config );

/*var Sessions = require('maki-sessions');
var sessions = new Sessions({
  resource: 'Person'
});

maki.use( sessions );*/

maki.define('Person', {
  name: 'Person',
  attributes: {
    username: { type: String , max: 80 , required: true , id: true },
    description: { type: String , max: 500 },
    hash: { type: String , default: 'asdf', required: true , restricted: true },
  }
});

maki.define('Example', {
  attributes: {
    name:    { type: String , max: 80 },
    slug:    { type: String , max: 80 , id: true },
    content: { type: String }
  },
  source: 'test/fixtures/examples.json',
  icon: 'idea'
});

maki.define('Unfile', {
  attributes: {
    content: { type: 'File' }
  }
});

function resource( path , options ) {
  var options  = options || {};
  var protocol = (options.ssl) ? 'https' : 'http';
  var host     = (options.ssl) ? maki.config.services.spdy.host : maki.config.services.http.host;
  var port     = (options.ssl) ? maki.config.services.spdy.port : maki.config.services.http.port;

  return protocol + '://' + host + ':' + port + path;
}
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
maki.start();

describe('Maki', function() {

  before(function(ready) {
    setTimeout(function() {
      ready();
    }, 1900);
  });

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
    // TODO: we removed Monq.  Evaluate the timer altogether.
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

  it('should allow for a resource to be created via POST (single call)', function( done ) {
    var randomNum = getRandomInt( 100000 , 1000000 );
    request( maki.app )
      .post('/people')
      .set('Accept', 'application/json')
      .send({ username: 'test-user-'+randomNum })
      .expect(303)
      .end(function(err, res) {
        if (err) throw err;
        done();
      });
  });

  it('should allow for a resource to be created via PUT (single call)', function( done ) {
    var randomNum = getRandomInt( 100000 , 1000000 );
    var username = 'test-user-'+randomNum;

    rest.put( resource('/people/' + username) , {
      data: { username: username },
      headers: { accept: 'application/json' }
    }).on('complete', function(data, res) {
      assert( res.statusCode , 200 );
      done();
    });

  });


  // TODO: evaluate this from a standards perspective.  Should HTML clients
  // be treated differently?
  it('should allow for a resource to be created (html client)', function( done ) {
    var randomNum = getRandomInt( 100000 , 1000000 );
    request( maki.app )
    .post('/people')
    .set('Accept', 'text/html')
    .send({ username: 'test-user-'+randomNum })
    .expect(303)
    .end(function(err, res) {
      if (err) throw err;
      done();
    });
  });

  it('should allow for a resource to be updated via PATCH (single call)', function( done ) {
    var randomNum = getRandomInt( 100000 , 1000000 );
    var username = 'test-user-'+randomNum;

    rest.put( resource('/people/' + username) , {
      data: { username: username },
      headers: { accept: 'application/json' }
    }).on('complete', function(data, res) {
      rest.patch( resource('/people/' + username) , {
        data: { username: username + '-patched' },
        headers: { accept: 'application/json' }
      }).on('complete', function(data, res) {
        assert( data.username , username + '-patched' );
        done();
      });
    });
  });

  it('should return a created resource from an appropriate location', function( done ) {
    var randomNum = getRandomInt( 100000 , 1000000 );
    var username = 'test-user-'+randomNum;

    request( maki.app )
      .post('/people')
      .set('Accept', 'application/json')
      .send({ username: username })
      .expect(303)
      .end(function(err, res) {
        if (err) throw err;

        request( maki.app )
          .get('/people/' + username )
          .set('Accept', 'application/json')
          .expect(200)
          .end(function(err, res) {
            if (err) throw err;
            if (res.body.username !== username) throw 'no result';

            done();
          });
      });
  });

  it('should allow for resources to be successfully destroyed', function(done) {
    var randomNum = getRandomInt( 100000 , 1000000 );
    var username = 'test-user-'+randomNum;

    request( maki.app )
      .post('/people')
      .set('Accept', 'application/json')
      .send({ username: username })
      .expect(303)
      .end(function(err, res) {
        if (err) throw err;

        request( maki.app )
          .delete('/people/' + username )
          .set('Accept', 'application/json')
          .expect(204)
          .end(function(err, res) {
            if (err) throw err;
            done();
          });
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

  it('should expose JSON when requested', function(done) {
    var randomNum = getRandomInt( 100000 , 1000000 );
    rest.post( resource('/people') , {
      data: {
        username: 'test-user-'+randomNum,
        hash: 'fooooooooo'
      }
    }).on('complete', function(createdDoc) {
      rest.get( resource('/people') , {
        headers: {
          'Accept': 'application/json'
        }
      }).on('complete', function( people ) {
        assert.ok( people.length );
        done();
      });
    });
  });

  it('should inform clients about unsupported methods', function(done) {
    rest.post( resource('/examples') , {
      headers: {
        'Accept': 'application/json'
      },
      data: {
        name: 'this-should-never-exist'
      }
    }).on('complete', function(doc, res) {
      assert( res.statusCode === 405 );
      done();
    });
  });

  it('should allow valid pre methods', function() {
    function setup() {
      maki.services.http.pre('create', function() {

      });
    }
    expect( setup ).to.not.throw();
  });

  it('should allow valid post methods', function() {
    function setup() {
      maki.services.http.post('create', function() {

      });
    }
    expect( setup ).to.not.throw();
  });

  it('should not allow invalid pre methods', function() {
    function setup() {
      maki.services.http.pre('nope', function() {
        // never get here...
      });
    }
    expect( setup ).to.throw( Error );
  });

  it('should not allow invalid post methods', function() {
    function setup() {
      maki.services.http.post('nope', function() {
        // never get here...
      });
    }
    expect( setup ).to.throw( Error );
  });

  it('should accept a valid plugin', function() {
    function setup() {
      var plugin = {};
      plugin.extends = {
        services: {
          http: function(req, res, next) {
            return next();
          }
        }
      }
      maki.use( plugin );
    }

    expect( setup ).to.not.throw();
  });

  it('should accept an invalid plugin', function() {
    function setup() {
      var plugin = {};
      plugin.extends = {
        services: {
          http: 'invalid'
        }
      }
      maki.use( {} );
    }

    expect( setup ).to.not.throw();
  });

  it('should receive uploads', function(done) {
    var data = require('crypto').randomBytes(256).toString('hex');
    var form = new Form();
    form.append('content', data);
    form.submit('http://localhost:' + config.services.http.port + '/unfiles', function(err, res) {
      assert.equal( res.statusCode , 303 );
      done();
    });
  });

  it('should serve previous uploads', function(done) {
    var data = require('crypto').randomBytes(256).toString('hex');
    var form = new Form();
    form.append('content', data);
    form.submit('http://localhost:' + config.services.http.port + '/unfiles', function(err, res) {
      assert.equal( res.statusCode , 303 );

      rest.get('http://localhost:' + config.services.http.port + res.headers.location , {
        headers: {
          'Accept': 'application/json'
        }
      }).on('complete', function(remoteFile) {
        assert.ok( remoteFile.content );
        done();
      });
    });
  });

  it('should serve previous uploads as direct downloads', function(done) {
    var data = require('crypto').randomBytes(256).toString('hex');
    var form = new Form();
    form.append('content', data);
    form.submit('http://localhost:' + config.services.http.port + '/unfiles', function(err, res) {
      assert.equal( res.statusCode , 303 );

      rest.get('http://localhost:' + config.services.http.port + res.headers.location , {
        headers: {
          'Accept': 'application/json'
        }
      }).on('complete', function(remoteFile) {
        assert.ok( remoteFile.content );

        rest.get('http://localhost:' + config.services.http.port + '/files/' + remoteFile.content ).on('complete', function(file) {
          assert.equal( file , data );
          done();
        });
      });
    });
  });

});

describe('https', function(){
  var https = require('https');
  var uri = resource('/', { ssl: true });

  it('should be listening for https', function() {
    https.get( uri , function(res) {
      assert.equal( res.statusCode , 200 );
    });
  });
});

describe('spdy', function(){
  var spdy = require('spdy');
  var https = require('https');
  var http = require('http');

  var agent = spdy.createAgent({
    host: '127.0.0.1',
    port: config.services.spdy.port
  });

  xit('should be listening for spdy', function( next ) {
    http.get({
      host: config.services.spdy.host,
      path: '/',
      agent: agent
    }, function(res) {

      assert.equal( res.statusCode , 201 );
      agent.close();

      next();

    }).end();
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
      var message = new JSONRPC('subscribe', { channel: '/' });
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
      var message = new JSONRPC('unsubscribe', { channel: '/' });
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
      maki.socks.markAndSweep();
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
  it('should clean up after itself', function( done ) {
    maki.destroy( done );
  });
});
