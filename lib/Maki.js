'use strict';

if (process.env.NODE_ENV === 'debug') require('debug-trace')({ always: true });

var _ = require('lodash');

var Maki = function( config ) {
  this.config = _.extend( require( __dirname + '/../config') , config );
  this.debug = (process.env.NODE_ENV === 'debug');

  this.routes    = {};
  this.clients   = {};
  this.resources = {};
  this.services  = {}; // stores instances
  this._services = {}; // stores classes
  this.types     = {}; // stores [custom] attribute types
  
  this.Datastore = require('../lib/Datastore');
  this.Resource  = require('../lib/Resource');
  this.Messenger = require('../lib/Messenger');
  this.Service   = require('../lib/Service');
  this.Queue     = require('maki-queue');

  this.mongoose  = require('mongoose');
  //this.mockgoose  = require('mongoose');
  //this.mockgoose  = require('mockgoose')( require('../node_modules/mongoose') );

  this.register('http', require('../lib/Service/http') );
};

Maki.prototype.define = function( name , options ) {
  var self = this;
  if (!name) throw new Error('"name" is required.');

  var resource = new self.Resource( name , options );
  
  resource.attach( self );
  
  return resource;
};

Maki.prototype.use = function( middleware ) {
  var self = this;
  middleware( self );
  return self;
};

Maki.prototype.register = function( name , service ) {
  this._services[ name ] = service;
  return this;
};

Maki.prototype.serve = function( services ) {
  var self = this;
  if (typeof services === 'String') var services = [ services ];
  
  if (!self.resources['Index']) {
    console.log('serving, but no index defined, so defaulting to basic.');
    
    self.resources['Index'] = new self.Resource('Index', {
      name: 'Index',
      template: 'index',
      routes: {
        query: '/'
      },
      static: true,
      internal: true
    });
  }
  
  services.forEach(function( name ) {
    var Service = self._services[ name ];
    self.services[ name ] = new Service();

    self.services[ name ].init();
    self.services[ name ].attach( self );
    self.services[ name ].start();
  });
  
  self.served = true;
  
  return self;
}

Maki.prototype.start = function( done ) {
  var self = this;
  if (!done) var done = new Function();
  
  self.messenger = new self.Messenger();

  self.datastore = new self.Datastore( self.config );
  self.datastore.connect(function() {
    self.queue = new self.Queue( self.config );

    if (!self.served) self.serve( Object.keys( self._services ) );

    done();
  });

}

Maki.prototype.destroy = function( done ) {
  var self = this;
  if (!done) var done = new Function();
  
  self.datastore.disconnect( done );

}

module.exports = Maki;
