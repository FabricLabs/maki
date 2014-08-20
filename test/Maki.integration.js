var assert = require('assert');
var expect = require('chai').expect;

var Browser = require('zombie');
var request = require('supertest');
var WebSocket = require('ws');

var config = require('../config');

config.services.http.port = 9201;
config.database.name = 'maki-test';

var Maki = require('../lib/Maki');
var maki = new Maki( config );

function resource( path ) {
  return 'http://' + config.services.http.host + ':' + config.services.http.port + path;
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
  
});

describe('ws', function() {
  
  it('should allow for a websocket upgrade', function( done ) {
    var ws = new WebSocket( resource('/') );
    ws.on('open', done );
  });

  it('should respond to subscription messages', function( done ) {
    var ws = new WebSocket( resource('/') );

    ws.on('message', function(data) {
      done();
    });
    ws.on('open', function() {
      var message = new maki.JSONRPC('subscribe', { channel: '/' });
      ws.send( message.toJSON() );
    });
    
  });

  it('should respond to unsubscription messages', function( done ) {
    var ws = new WebSocket( resource('/') );

    ws.on('message', function(data) {
      done();
    });
    ws.on('open', function() {
      var message = new maki.JSONRPC('unsubscribe', { channel: '/' });
      ws.send( message.toJSON() );
    });
    
  });
  
  it('should reject incorrect JSON', function( done ) {
    var ws = new WebSocket( resource('/') );
    
    ws.on('open', function() {
      
      ws.on('message', function(data) {
        // see http://www.jsonrpc.org/specification#error_object
        console.log(data);
        assert.equal( data.code , 32700 );
        done();
      });
      
      ws.send( 'fail me, I dare you' );
    });
    
  });
  
  it('should reject non-JSONRPC messages', function( done ) {
    var ws = new WebSocket( resource('/') );
    
    ws.on('open', function() {
      
      ws.on('message', function(data) {
        // see http://www.jsonrpc.org/specification#error_object
        console.log(data);
        assert.equal( data.code , 32600 );
        done();
      });
      
      ws.send('{}');
    });
    
  });
  
});

describe('browser', function() {
  var self = this;

  before(function(done) {
    self.browser = new Browser();
    self.browser.runScripts = false;
    done();
  });
  
  it('should correctly connect', function(done) {
    self.browser.visit( resource('/') , function() {
      assert.equal( self.browser.location.pathname, '/' );
      done();
    });
  });
  it('should have a page title', function(done) {

    self.browser.visit( resource('/') , function( e , browser ) {
      assert.ok( self.browser.document.title );
      done();
    });
  });
  it('should have a page body', function() {

    self.browser.visit( resource('/') )
      .then(function() {
        assert.ok( browser.query('div') );
        
        console.log('asdfasdfasdfasdfsadfa')
        
        done();
      })
      .fail(function(err) {
        console.log(err);
        done(err);
      });
  });
});

describe('browser with javascript', function() {
  
});
