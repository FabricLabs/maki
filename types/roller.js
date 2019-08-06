'use strict';

const SPA = require('@fabric/http/types/spa');

class Roller extends SPA {
  constructor (settings = {}) {
    super(settings);
    this.settings = Object.assign({}, settings);
    return this;
  }
}

module.exports = Roller;
