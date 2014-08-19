var assert = require('assert');
var Maki = require('../lib/Maki');
var request = require('supertest');

var config = require('../config');
var db = require('../db');

describe('maki', function(){

  it('should be callable', function(){
    var maki = new Maki( config );
    assert(typeof maki, 'function');
  });

});
