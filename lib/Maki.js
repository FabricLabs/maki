if (process.env.NODE_ENV === 'debug') require('debug-trace')({ always: true });

var fs = require('fs');
var pem = require('pem');

var http = require('http');
var https = require('https');
var express = require('express');
var mongoose = require('mongoose');

var redis = require('redis');
var async = require('async');

var _ = require('lodash');

var pathToRegex = require('path-to-regexp');

var Maki = function( config ) {
  var self = this;

  self.config = _.extend( require( __dirname + '/../config') , config );
  self.debug = (process.env.NODE_ENV === 'debug');

  self.app = express();
  self.mongoose = mongoose;

  self.app.models      = [];
  self.app.views       = [];
  self.app.controllers = [];
  
  self.routes = {};
  self.clients = {};
  self.resources = {};
  
  self.Database        = require('../lib/Database');
  self.Resource        = require('../lib/Resource');
  self.Service         = require('../lib/Service');
  self.JSONRPC         = require('../lib/jsonrpc');
  self.Queue           = require('maki-queue');
  self.WebSocketServer = require('maki-service-websockets');

  self.app.engine('jade', require('jade').__express);
  self.app.set('view engine', 'jade');
  self.app.set('views', ['views', 'app/views', __dirname + '/../app/views'] );

  self.app.locals.pretty = true;
  self.app.locals.maki = {
    resources: []
  }
  
  self.passport = require('passport');

  var session = require('express-session');
  var RedisStore = require('connect-redis')( session );

  // set up middlewares for session handling
  self.app.use( require('cookie-parser')( self.config.sessions.secret ) );
  self.app.use( session({
      store: new RedisStore({
        client: self.app.redis
      })
    , secret: self.config.sessions.secret
  }));
  
  var mapper = function(req, res, next) {
    // collect a normalized HTTP verb from the inbound request
    req.v = req.method.toLowerCase();

    // TODO: store hashmap of these regii somewhere?  faster?
    for (var route in self.routes) {
      var regex = pathToRegex( route );
      if (regex.test( req.path )) {
        req.resource = self.routes[ route ];
        return next();
      }
    }
    
    return next();
    
  };
  self.app.use( mapper );

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
}

Maki.prototype.start = function( done ) {
  var self = this;
  
  if (!done) var done = new Function();
  
  if (!self.resources['Index']) {
    console.log('starting, but no index defined, so defaulting to basic.');
    
    self.resources['Index'] = new self.Resource('Index', {
      name: 'Index',
      template: 'index',
      internal: true, // TODO: prevent some bindings when this is specified
      singular: true, // TODO: utilize this to prevent creation of plurals
      static: true
    });
    
    /*self.app.get('/', function(req, res, next) {
      res.provide('Index', {
        index: {}
      });
    });*/
  }
  
  self.db = new self.Database( self.config );
  self.db.connect();
  
  var provide = function(req, res, next) {
    console.log(' HTTP().provide() (middleware)');
    
    res.provide = function( name , data , handlers ) {
      var self = this;
      if (!handlers) var handlers = {};
      
      console.log('res.provide() called...');

      var resource = self.resources[ name ];
      
      var formatters = {
        html: function() {
          var locals = {};
          //locals[ resource.names[ method ] ] = data;
          var locals = data;

          if (maki.debug) console.log('looking for ' + req.m + ' in ' , resource.templates );

          res.render( resource.templates[ req.m ] , locals , function( err , body , next ) {
            if (maki.debug) console.log('render callback', err , locals);

            // internal express succeeded, send it!
            if (body) {
              if (maki.debug) console.log('successful render!  sending.');
              res.set('Content-Type', 'text/html');
              return res.send(body);
            }

            // it didn't render, let's see if there wasn't a template...
            if (err && err.view && !err.view.path) {
              if (maki.debug) console.log('4. no such view, falling back', err.view , subject );
              
              var subject = locals[ resource.names[ req.m ] ];
              
              if (subject && !Array.isArray(subject)) {
                return res.render('resource', {
                  resource: resource,
                  item: subject
                });
              } else {
                return res.render('resource', {
                  resource: resource,
                  collection: subject
                });
              }
            }
          } );
        },
        json: function() {
          //if (!data) var data = {};
          
          // goddamn heisenbug again
          //var guh = data[ resource.names[ req.m ] ];
          
          function clean( obj ) {
            if (!obj) return null;
            
            Object.keys( obj ).forEach(function( k ) {
              if ( resource.options.attributes[ k ] && resource.options.attributes[ k ].restricted ) {
                delete obj[ k ];
              }
            });
            return obj;
          }
          
          if (data.toObject) {
            var object = clean( data.toObject() );
          } else if (data.map) {
            var object = data.map(function(i) {
              return clean( i );
            });
          } else {
            var object = clean( data );
          }

          res.send( object[ resource.names[ req.m ] ] );
        }

      };
      
      Object.keys( handlers ).forEach(function( f ) {
        if (handlers[ f ][ req.m ]) {
          formatters[ f ] = handlers[ f ][ req.m ].bind( null , req , res , next );
        }
      });

      res.format( formatters );
    };
    
    console.log('res.provide bound...');
    next();
  };
  self.app.use( provide );
  
  var HTTP = require('../lib/Service/http');
  var http = new HTTP();
  http.attach( self );

  self.redis = redis.createClient( self.config.redis.port , self.config.redis.host );
  self.socks = new self.WebSocketServer();
  self.queue = new self.Queue( self.config );
  
  self.socks.bind( self );
  self.queue.bind( self );
  
  // catch-all route (404)
  self.app.get('*', function(req, res) {
    res.status(404).render('404');
  });
  
  // clean up clients at an interval
  // TODO: consider setTimeout per-client
  setInterval(function() {
    if (self.debug) console.log( '[HEARTBEAT] %d connected clients' , Object.keys( self.clients ).length );
    self.socks.server.markAndSweep();
  }, self.config.sockets.timeout );

  // make server available
  self.httpd.listen( self.config.services.http.port , function() {
    var address = self.httpd.address();
    self.config.services.http.port = address.port;
    
    if (self.debug) console.log('[HTTPD] listening for http' , address );
    
    pem.createCertificate({
      days: 1,
      selfSigned: true
    }, function(err, keys) {
      
      var spdy = require('spdy');
      var sslPort = self.config.services.http.port + 443;
      
      spdy.createServer({
        key: keys.serviceKey,
        cert: keys.certificate
      }, self.app ).listen( sslPort , function() {
        
        if (self.debug) console.log('[HTTPD] listening for https' , address );
        done();
      });
      
    });
    
  });
  
}

Maki.prototype.destroy = function( done ) {
  var self = this;
  if (!done) var done = new Function();
  
  self.httpd.close(function() {
    self.db.disconnect( done );
  });

}

module.exports = Maki;
