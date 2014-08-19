var assert = require('assert');
var expect = require('chai').expect;

var config = require('../config');

var Maki = require('../lib/Maki');
var maki = new Maki( config );

describe('maki', function(){

  it('should be callable', function(){
    assert(typeof maki, 'function');
  });
  
  it('should expose a map of resources', function() {
    assert(typeof maki.resources, 'object');
  });
  
  it('should expose a list of resources', function() {
    expect( Object.keys(maki.resources).length ).to.be.at.least(1);
  });

});
