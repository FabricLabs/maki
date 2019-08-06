'use strict';

const Fabric = require('@fabric/core');
const WebApp = require('@fabric/http/types/app');

class App extends WebApp {
  constructor (settings = {}) {
    super(settings);

    this.fabric = new Fabric();
    this.settings = Object.assign({
      title: 'Maki',
      description: 'Smooth-rolling.',
      handle: 'maki-app'
    }, settings);

    // Set an initial state
    this.state = {};

    return this;
  }
}

module.exports = App;
