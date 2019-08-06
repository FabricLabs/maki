'use strict';

const assert = require('assert');

const Maki = require('../');

describe('Maki', function () {
  it('should expose a constructor', function () {
    assert.equal(typeof Maki, 'function');
  });
});
