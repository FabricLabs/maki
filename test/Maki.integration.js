var assert = require('assert');
var expect = require('chai').expect;

var Browser = require('zombie');
var request = require('supertest');

var config = require('../config');
config.services.http.port = 0;

var Maki = require('../lib/Maki');
var maki = new Maki( config );

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

describe('http', function(){

  before(function(done) {
    maki.start(function() {
      done();
    });
  });

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
