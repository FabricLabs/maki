'use strict';

if (process.env.NODE_ENV === 'debug') require('debug-trace')({ always: true });

var fs = require('fs-extra');

var _ = require('lodash');
var colors = require('colors');
var util = require('util');
var async = require('async');

var Maki = function( config ) {
  // TODO: prepopulate `service.about` with `{{service.name}} is built with...`
  // override when supplied, but use by default
  var defaults = require( __dirname + '/../config');
  
  // bad patch
  //- TODO: roll these up into config.js process
  defaults.namespace = config.service.name || defaults.namespace;
  //- WARNING: test in production
  defaults.database.name = config.service.name || defaults.database.name;

  this.config = _.merge( defaults , config );
  this.debug = (process.env.NODE_ENV === 'debug');

  this.routes    = {};
  this.clients   = {};
  this.plugins   = {};
  this.resources = {};
  this.services  = {}; // stores instances
  this._services = {}; // stores classes
  this.types     = {}; // stores [custom] attribute types
  this.models    = {};
  this.resourcePlugins = {};
  this.resourceModifiers = {};

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

util.inherits( Maki , require('events').EventEmitter );

Maki.prototype.define = function( name , options ) {
  var self = this;
  if (!name) throw new Error('"name" is required.');

  //Apply all resource modifiers to this resource's options
  if (self.resourceModifiers[ name ]) {
    self.resourceModifiers[ name ].forEach(function( modifier ) {
      options = modifier( options );
    });
  }

  var resource = new self.Resource( name , options );

  resource.attach( self );
  self.emit('resource', resource );

  return resource;
};

Maki.prototype.use = function( plugin ) {
  var self = this;
  if (!plugin.extends) {
    plugin.extends = {};
  }

  if (plugin.provides) {
    Object.keys(plugin.provides).forEach(function(name) {
      self.define(name, plugin.provides[name]);
    });
  }

  if (plugin.extends.resources) {
    Object.keys( plugin.extends.resources ).forEach(function( n ) {
      //Build array of plugins which extend this resource
      if (!self.resourcePlugins[ n ]) self.resourcePlugins[ n ] = [];
      self.resourcePlugins[ n ].push( plugin.extends.resources[ n ].plugin );

      //Build array of modifiers which extend this resource
      if (!self.resourceModifiers[ n ]) self.resourceModifiers[ n ] = [];
      if (plugin.extends.resources[ n ].modifier) {
        self.resourceModifiers[ n ].push( plugin.extends.resources[ n ].modifier );
      }
    });
  }

  if (plugin.extends.services) {
    if (plugin.extends.services.http) {
      if (!self.plugins['http']) self.plugins['http'] = [];
      self.plugins['http'].push( plugin.extends.services.http );
    }
  }

  return self;
};

Maki.prototype.register = function( name , service ) {
  this._services[ name ] = service;
  return this;
};

Maki.prototype.serve = function( services , cb ) {
  var self = this;
  if (typeof services === 'String') var services = [ services ];
  
  if (self.debug) {
    console.log(
      '[INFO]',
      'Serving the following Resources:',
      Object.keys(self.resources).map(function(x) {
        return self.resources[x].name;
      })
    );
  }

  if (!self.resources['Index']) {
    console.log(
      '[WARNING]'.yellow,
      'Maki is now serving content, but no index was defined',
      'so it created one for you.'
    );

    self.resources['Index'] = new self.Resource('Index', {
      name: 'Index',
      template: 'index',
      handle: self.config.service.pitch,
      description: self.config.service.description,
      components: {
        masthead: 'maki-pitch',
        query: 'maki-splash',
        get: 'maki-splash'
      },
      routes: {
        query: '/'
      },
      public: false,
      static: true,
      //internal: true
    });
  }

  async.each( services , function( name , complete ) {
    if (!self.suppress) console.log('[SERVICE]'.bold.green , '['+name+']'.bold , 'preparing...'.bold);

    var config = self.config.services[name] || {};

    var Service = self._services[name];
    var service = new Service(config);

    service.on('started', function() {
      var address = service._server.address();
      if (!self.suppress) console.log('[SERVICE]'.bold.green , '['+name+']'.bold , 'listening'.green, 'for', '['+Service.protocol+'] '.bold, 'on', Service.protocol + '://' + service.host + ':' + address.port  );
    });

    if (self.plugins[ name ] && self.plugins[ name ].length) {
      self.plugins[ name ].forEach(function(plugin) {
        service._plugins.push( plugin );

        ['pre', 'post'].forEach(function(prop) {
          var option = plugin[ prop ];
          if (!option) return;

          Object.keys( option ).forEach(function(method) {
            service[ prop ]( method , option[ method ] );
          });
        });
      });
    }

    if (!self.suppress) console.log('[SERVICE]'.bold.green , '['+name+']'.bold , '[stage:0]', 'inititializing...'.bold);
    service.init();
    
    if (!self.suppress) console.log('[SERVICE]'.bold.green , '['+name+']'.bold , '[stage:1]', 'compiling...'.bold);
    service.attach( self );

    if (!self.suppress) console.log('[SERVICE]'.bold.green , '['+name+']'.bold , '[stage:2]', 'starting...'.bold);
    service.start( complete );

  }, function(err, results) {
    self.served = true;
    self.emit('ready');
    return cb();
  });

  return self;
};

Maki.prototype.build = function(done) {
  var self = this;
  if (!done) done = new Function();
  
  var dir = process.env.PWD + '/build';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  
  self.services['httpd'].init();
  self.services['httpd'].attach( self );
  
  // TODO: allow different builds via templates,
  // i.e., `desktop` -> /views/desktop -> /views/layouts/electron
  self.app.render('index.jade', function(err, html) {
    if (err) console.error('[MAKI:BUILD]', 'error', err);
    fs.writeFileSync(dir + '/app.html', html);
    done(err);
  });
};

Maki.prototype.start = function( done ) {
  var self = this;
  if (!done) var done = new Function();

  self.messenger = new self.Messenger();

  self.datastore = new self.Datastore( self.config );
  self.datastore.connect(function() {
    self.queue = new self.Queue( self.config );

    if (!self.served) return self.serve( Object.keys( self._services ) , done );

    done();
  });

};

Maki.prototype.destroy = function( done ) {
  var self = this;
  if (!done) var done = new Function();

  async.each( self.services , function( service , complete ) {
    service.destroy( complete );
  }, function(err) {
    self.datastore.disconnect( done );
  });

};

Maki.prototype.stop = Maki.prototype.destroy;

Maki.prototype.bootstrap = function(done) {
  var self = this;
  var base = process.env.PWD;
  var maki = __dirname + '/..';
  var main = [
    '/views',
    '/views/layouts',
    '/views/partials'
  ];

  if (!done) {
    var done = new Function();
  }

  main.forEach(function(f) {
    if (!fs.existsSync(base+f)) fs.mkdirSync(base+f);
  });

  Object.keys(self.resources).forEach(function(r) {
    var resource = self.resources[r];
    var listName = resource.plural.toLowerCase();
    var viewName = resource.name.toLowerCase();
    var listView = base+'/views/'+listName+'.jade';
    var viewView = base+'/views/'+viewName+'.jade';

    var reqs = [
      '/views/layouts/default.jade',
      '/views/partials/navbar.jade',
      '/views/partials/flash.jade'
    ];

    reqs.forEach(function(r) {
      if (!fs.existsSync(base+r)) fs.copySync(maki+r, base+r);
    });

    if (!fs.existsSync(listView)) {
      var template = fs.readFileSync(maki+'/data/resource-list.jaml')
        .toString()
        .replace(/{{resource.name}}/gi, resource.name)
        .replace(/{{resource.plural}}/gi, resource.plural)
        .replace(/{{resource.names.query}}/gi, resource.names.query)
        .replace(/{{resource.names.get}}/gi, resource.names.get);
      fs.writeFileSync(listView, template);
    }

    if (!fs.existsSync(viewView)) {
      var template = fs.readFileSync(maki+'/data/resource-view.jaml')
        .toString()
        .replace(/{{resource.name}}/gi, resource.name)
        .replace(/{{resource.plural}}/gi, resource.plural)
        .replace(/{{resource.names.query}}/gi, resource.names.query)
        .replace(/{{resource.names.get}}/gi, resource.names.get);
      fs.writeFileSync(viewView, template);
    }

  });

  done();
};

module.exports = Maki;
