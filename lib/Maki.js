'use strict';

if (process.env.NODE_ENV === 'debug') require('debug-trace')({ always: true });

var _ = require('lodash');

var Maki = function( config ) {
  var self = this;

  self.config = _.extend( require( __dirname + '/../config') , config );
  self.debug = (process.env.NODE_ENV === 'debug');

  self.routes    = {};
  self.clients   = {};
  self.resources = {};
  self.services  = {};
  
  self.Datastore = require('../lib/Datastore');
  self.Resource  = require('../lib/Resource');
  self.Messenger = require('../lib/Messenger');
  self.Service   = require('../lib/Service');
  self.Queue     = require('maki-queue');

}

Maki.prototype.define = function( name , options ) {
  var self = this;
  if (!name) throw new Error('"name" is required.');

  var resource = new self.Resource( name , options );
  
  resource.attach( self );
  
  return resource;
}

Maki.prototype.use = function( middleware ) {
  var self = this;
  middleware( self );
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
      internal: true, // TODO: prevent some bindings when this is specified
      singular: true, // TODO: utilize this to prevent creation of plurals
      static: true
    });
  }
  
  services.forEach(function(Service) {
    var service = new Service();
    service.init();
    service.attach( self );
    service.start();
  });
  
  console.log('using services', services);
}

Maki.prototype.start = function( done ) {
  var self = this;
  if (!done) var done = new Function();
  
  self.messenger = new self.Messenger();

  self.db = new self.Datastore( self.config );
  self.db.connect();

  self.queue = new self.Queue( self.config );

  done();
}

Maki.prototype.destroy = function( done ) {
  var self = this;
  if (!done) var done = new Function();
  
  self.db.disconnect( done );

}

module.exports = Maki;
