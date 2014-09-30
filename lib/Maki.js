var fs = require('fs');
var pem = require('pem');

var http = require('http');
var https = require('https');
var express = require('express');
var mongoose = require('mongoose');

var redis = require('redis');
var async = require('async');

var _ = require('underscore');

var pathToRegex = require('path-to-regexp');

var Maki = function( config ) {
  var self = this;

  self.config = _.extend( require( __dirname + '/../config') , config );
  self.debug = (process.env.NODE_ENV === 'debug') ? true : false;

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
  self.JSONRPC         = require('../lib/jsonrpc');
  self.Queue           = require('maki-queue');
  self.WebSocketServer = require('maki-service-websockets');

  self.app.engine('jade', require('jade').__express);
  self.app.set('view engine', 'jade');
  self.app.set('views', ['app/views'] );

  self.app.locals.pretty = true;
  self.app.locals.maki = {
    resources: []
  }
  
  var provide = function() {
    return function( req , res , next ) {
      var v = req.method.toLowerCase();
      
      res.error = function( code , message) {
        if (!message) {
          var message = code;
          var code = 500;
        }
        
        res.format({
          json: function() {
            res.status( code ).send( message );
          },
          html: function() {
            res.render('error', {
              error: message
            })
          }
        });
      }
      
      res.provide = function( name , data , handler ) {
        var resource = self.resources[ name ];
        var method = null;
        
        if (!handler) var handler = new Function();
        
        // METHOD SELECTION
        // of available resources r[], locate matching path p based on regex r
        // select appropriate method m from path p
        // resolves to r_i_m
        if (self.debug) console.log('verbs', resource.verbs);
        Object.keys( resource.verbs[ v ] ).forEach(function( i ) {
          var r = resource.verbs[ v ][ i ];
          var regex = pathToRegex( r.regex );
          
          if (self.debug) console.log('testing ' + req.path , r ,  resource.methods[ r ],  v , resource.verbs[ v ][ r ] );
          
          if (regex.test( req.path )) {
            if (!method) method = r.method;
            return;
          }
        });

        res.format({
          json: function() {
            
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
              var object = clean( object );
            }
            
            res.send( object );
          },
          html: function() {
            var locals = {};
            locals[ resource.names[ method ] ] = data;
            
            async.map( Object.keys(resource.requires) , function( requirement , done ) {
              if (self.debug) console.log('LE REQUIREMENTS', resource.requires );
              
              if (self.debug) console.log( requirement );
              if (self.debug) console.log( Object.keys( self.resources ) );
              
              //var provider = self.resources[ requirement ].query;
              
              if (self.debug) console.log( provider );
              
              done( null , [] );
            }, function(err, requirements) {
              if (self.debug) console.log('looking for ' + method + ' in ' , resource.templates );
              res.render( resource.templates[ method ] , locals , function( err , body , next ) {
                // internal express succeeded, send it!
                if (body) return res.send(body);
                
                console.log('sup', err.view , data );
                
                // it didn't render, let's see if there wasn't a template...
                if (err && err.view && !err.view.path) {
                  return res.render('resource', {
                    resource: resource,
                    collection: data
                  });
                }
                
              } );
            } );
          }
        });
      }

      next();
    }
  }

  var rack = require('asset-rack');
  /* use AssetRack to minify and cache static objects */
  var assets = new rack.Rack([
    new rack.JadeAsset({
        url: '/js/templates.js',
        dirname: 'app/views',
        clientVariable: 'Templates',
        watch: self.debug,
        // strip out layouts (we don't want them)
        beforeCompile: function( input ) {
          return input.replace(/extends (.*)\n/, '');
        }
    }),
    new rack.StaticAssets({
      urlPrefix: '/',
      dirname: 'public'
    }),
    //new rack.LessAsset({
    //  url: '/css/bootstrap.css',
    //  filename: 'private/less/bootstrap.less'
    //}),
    new rack.LessAsset({
      url: '/css/font-awesome.css',
      filename: 'private/less/fontawesome/font-awesome.less'
    }),
    new rack.LessAsset({
      url: '/css/maki.css',
      filename: 'private/less/maki.less'
    }),
    /*/new rack.DynamicAssets({
      type: rack.LessAsset,
      urlPrefix: '/css',
      dirname: 'private/css'
    })/**/
  ]);
  self.app.use( assets.handle );
  self.app.use( provide() );
  self.app.use( require('body-parser')() );

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

  /* Configure the registration and login system */
  self.app.use( self.passport.initialize() );
  self.app.use( self.passport.session() );

  self.app.locals.user = null;
  /* configure some local variables for use later */
  self.app.use(function(req, res, next) {
    // set a user context (from passport)
    res.locals.user = req.user;
    
    if (self.debug) console.log( req.method + ' request to ' + req.path )
    
    res.removeHeader('X-Powered-By');
    next();
  });

  self.resources['Index'] = new self.Resource('Index', {
    name: 'Index',
    template: 'index',
    internal: true,
    singular: true
  });

  /*/self.resources['Error'] = new self.Resource('Error', {
    name: 'Error',
    template: 'error',
    internal: true
  });/**/

  self.app.all('/', function(req, res, next) {
    if ('OPTIONS' === req.method) {
      var resourceList = Object.keys( self.resources ).map(function(r) {
        var resource = self.resources[ r ];
        
        var realPaths = {};
        Object.keys( resource.paths ).forEach(function( path ) {
          realPaths[ path ] = resource.paths[ path ].toString();
        });
        resource.paths = realPaths;

        return resource;
      });
      
      return res.send( resourceList );
    }
    next();
  });
  
  self.app.get('/', function(req, res, next) {
    res.provide('Index', {
      index: {}
    });
  });

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

Maki.prototype.bootstrap = function( done ) {
  var self = this;
  var base = self.app.set('views');
  
  var engines = Object.keys( self.app.engines );
  
  for (var name in self.resources) {
    var resource = self.resources[ name ];
    
    for (var method in resource.templates) {
      var template = resource.templates[ method ];
      var found = false;
      
      engines.forEach(function(ext) {
        var path = __dirname + '/../' + base + '/' + template + ext;
        if (fs.existsSync( path )) found = true;
      });

      if (!found) {
        console.log('[BOOTSTRAP]', resource.name , template );
      }
    }
  }
  
  return this;
}

Maki.prototype.start = function( done ) {
  var self = this;
  
  if (!done) var done = new Function();
  
  self.db = new self.Database( self.config );
  self.db.connect();

  var map = {
    'query':   'get',
    'create':  'post',
    'get':     'get',
    'update':  'patch',
    'destroy': 'delete'
  }
  
  // determine all possible routes
  Object.keys( self.resources ).forEach(function( r ) {
    
    var resource = self.resources[ r ];
    self.app.locals.maki.resources.push( resource );
    
    
    Object.keys( resource.routes ).forEach(function( p ) {
      var regex = resource.routes[ p ];
      
      self.routes[ regex ] = r;

      if (self.debug) console.log('binding ' + map[p].toUpperCase() + ' ' + regex + ' to ' + p + ' of ' + resource.name );
      
      if (!self.resources[ r ].verbs[ map[p] ]) {
        self.resources[ r ].verbs[ map[p] ] = [];
      }
      self.resources[ r ].verbs[ map[p] ].push({
        regex: regex ,
        method: p
      });
      
      self.resources[ r ].methods[ regex ] = p;
      
      self.app[ map[p] ]( regex , resource[ p ]() );
    });
  });
  
  self.httpd = http.createServer( self.app );
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
