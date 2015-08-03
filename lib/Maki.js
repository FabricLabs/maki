if (process.env.NODE_ENV === 'debug') require('debug-trace')({ always: true });

var _ = require('lodash');
var colors = require('colors');
var util = require('util');
var async = require('async');
var NeDB = require('nedb');
var pathToRegex = require('path-to-regexp');

var Maki = function( config ) {
  var defaults = require( __dirname + '/../config');

  this.config = _.merge( defaults , config );
  this.debug = (process.env.NODE_ENV === 'debug');

  this.routes    = {};
  this.clients   = {};
  this.plugins   = {};
  this.resources = {};
  this.services  = {}; // stores instances
  this._services = {}; // stores classes
  this.types     = {}; // stores [custom] attribute types
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

  this.oplog = new NeDB({
    filename: process.env.PWD + '/oplog',
    autoload: true
  });

  //if (this.debug) {
    this.oplog.count({}, function(err, count) {
      console.log('oplog length now:', count);
    });
  //}

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

  if (!self.resources['Index']) {
    console.log(
      '[WARNING]'.yellow,
      'Maki is now serving content, but no index was defined',
      'so it created one for you.'
    );

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

  async.each( services , function( name , complete ) {
    var Service = self._services[ name ];
    self.services[ name ] = new Service();

    if (self.plugins[ name ] && self.plugins[ name ].length) {
      self.plugins[ name ].forEach(function(plugin) {
        self.services[ name ]._plugins.push( plugin );

        ['pre', 'post'].forEach(function(prop) {
          var option = plugin[ prop ];
          if (!option) return;

          Object.keys( option ).forEach(function(method) {
            self.services[ name ][ prop ]( method , option[ method ] );
          });
        });
      });
    }

    self.services[ name ].init();
    self.services[ name ].attach( self );
    self.services[ name ].start( complete );

  }, function(err, results) {
    self.served = true;
    self.emit('ready');
    return cb();
  });

  return self;
}

Maki.prototype.start = function( done ) {
  var self = this;
  if (!done) var done = new Function();

  self.messenger = new self.Messenger(self.config);
  self.messenger.on('message', function(channel, msg) {
    console.log('msg incoming!', channel, msg);

    self.oplog.insert({
      timestamp: new Date(),
      namespace: self.config.service.name || 'maki',
      channel: channel,
      ops: msg
    });

    self.oplog.count({}, function(err, count) {
      console.log('oplog length now:', count);
    });

  });

  self.messenger._backbone.route('inv', function(socket, message) {
    console.log('inv message received', message);
    self.oplog.find({}).skip( message.body || 0 ).exec(function(err, transactions) {
      transactions.forEach(function(t) {
        socket.send('transaction', t );
      });
    });
  });

  self.messenger._backbone.route('transaction', function(socket, message) {
    var channel = message.body.channel;
    console.log('TRANSACTION!', channel, message.body.ops );

    // Identify the intended Resource...
    for (var route in self.routes) {
      console.log('parsing route:', route);
      var regex = pathToRegex(route);
      if (channel.match(regex)) {
        var resource = self.resources[ self.routes[route] ];
        console.log('channel match!', resource.name);

        // Identify the appropriate method, so we can build a query
        // TODO: this is terrible.  This should be unnecessary, we need a router
        for (var method in resource.paths) {
          console.log('comparing', resource.paths[method].toString(), 'to', regex.toString());

          if (resource.paths[method].toString() === regex.toString()) {
            console.log('method match!', method);
            var q = {};
            if (~['get', 'delete'].indexOf(method)) {
              console.log('method:', method, 'is in the list');
              q[ resource.fields.id ] = channel.split('/').slice(-1)[0];
            } else {
              console.log('method:', method, 'is not in the list.');
            }

            console.log('query:', q, message.body.ops);

            resource.patch(q, message.body.ops);

            break;
          }
        }
        break;
      }
    }
  });

  self.datastore = new self.Datastore(self.config);
  self.datastore.connect(function() {
    self.queue = new self.Queue( self.config );

    if (!self.served) return self.serve( Object.keys( self._services ) , done );

    done();
  });

}

Maki.prototype.destroy = function( done ) {
  var self = this;
  if (!done) var done = new Function();

  async.each( self.services , function( service , complete ) {
    service.destroy( complete );
  }, function(err) {
    self.datastore.disconnect( done );
  });

}

module.exports = Maki;
