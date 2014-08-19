var assert = require('assert');
var request = require('supertest');

var config = require('../config');

var Maki = require('../lib/Maki');
var maki = new Maki( config );

before(function(done) {
  maki.start( done );
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
