var fs = require('fs');

var http = require('http');
var express = require('express');
var mongoose = require('mongoose');

var redis = require('redis');

var pathToRegex = require('path-to-regexp');

var Maki = function( config ) {
  var self = this;
  
  self.config = config;
  self.debug = (process.env.NODE_ENV === 'debug') ? true : false;

  self.app = express();

  self.app.models      = [];
  self.app.views       = [];
  self.app.controllers = [];
  
  self.routes = {};
  self.clients = {};
  self.resources = {};
  
  self.Database        = require('../lib/Database');
  self.Resource        = require('../lib/Resource');
  self.Queue           = require('maki-queue');
  self.WebSocketServer = require('./Websockets');
  self.JSONRPC         = require('../lib/jsonrpc');
  
  self.app.engine('jade', require('jade').__express);
  self.app.set('view engine', 'jade');
  self.app.set('views', 'app/views' );

  self.app.locals.pretty = true;
  self.app.locals.maki = {
    resources: []
  }
  
  var provide = function() {
    return function( req, res, next ) {
      var v = req.method.toLowerCase();
      
      res.provide = function( name , data ) {
        var resource = self.resources[ name ];
        var method = null;
        
        // METHOD SELECTION
        // of available resources r[], locate matching path p based on regex r
        // select appropriate method m from path p
        // resolves to r_i_m
        console.log('verbs', resource.verbs);
        Object.keys( resource.verbs[ v ] ).forEach(function( i ) {
          var r = resource.verbs[ v ][ i ];
          var regex = pathToRegex( r.regex );
          
          console.log('testing ' + req.path , r ,  resource.methods[ r ],  v , resource.verbs[ v ][ r ] );
          
          if (regex.test( req.path )) {
            
            console.log('method found', r.method );
            
            if (!method) method = r.method;
            return;
          }
        });
        
        console.log('method to use: ' , method , resource.name );

        res.format({
          json: function() { res.send( data ); },
          html: function() {
            var locals = {};
            locals[ resource.names[ method ] ] = data;
            
            console.log('looking for ' + method + ' in ' , resource.templates );
            
            res.render( resource.templates[ method ] , locals );
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
        // strip out layouts (we don't want them)
        beforeCompile: function( input ) {
          return input.replace(/extends (.*)\n/, '');
        }
    }),
    new rack.StaticAssets({
      urlPrefix: '/',
      dirname: 'public'
    }),
    new rack.LessAsset({
      url: '/css/bootstrap.css',
      filename: 'private/less/bootstrap.less'
    }),
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
  var LocalStrategy = require('passport-local').Strategy;
  var passportLocalMongoose = require('passport-local-mongoose');

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

  /* enable "local" login (e.g., username and password) */
  //self.passport.use(new LocalStrategy( self.app.models.Person.authenticate() ) );

  //self.passport.serializeUser( self.app.models.Person.serializeUser() );
  //self.passport.deserializeUser( self.app.models.Person.deserializeUser() );

  self.app.locals.user = null;
  /* configure some local variables for use later */
  self.app.use(function(req, res, next) {
    // set a user context (from passport)
    res.locals.user = req.user;
    
    console.log( req.method + ' request to ' + req.path )
    
    res.removeHeader('X-Powered-By');
    next();
  });

  // set up controlers for various resources
  self.app.controllers.pages    = pages  = require('../app/controllers/pages');
  self.app.controllers.people   = people = require('../app/controllers/people');

  self.resources['Index'] = new self.Resource('Index', {
    name: 'Index',
    template: 'index',
    internal: true,
    singular: true
  });

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
  
  return this;
}

Maki.prototype.use = function( middleware ) {
  var self = this;
  middleware( self );
  return this;
}

Maki.prototype.start = function( done ) {
  var self = this;
  
  if (!done) var done = new Function();
  
  var db = new self.Database( self.config );
  db.connect();
  
  var queue = new self.Queue( self.config );
  queue.bind( self.app );

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

      console.log('binding ' + map[p].toUpperCase() + ' ' + regex + ' to ' + p + ' of ' + resource.name );
      
      if (!self.resources[ r ].verbs[ map[p] ]) {
        self.resources[ r ].verbs[ map[p] ] = [];
      }
      self.resources[ r ].verbs[ map[p] ].push({
        regex: regex ,
        method: p
      });
      
      self.resources[ r ].methods[ regex ]         = p;
      
      self.app[ map[p] ]( regex , resource[ p ]() );
    });
  });
  
  self.httpd = http.createServer( self.app );
  self.redis = redis.createClient( self.config.redis.port , self.config.redis.host );
  self.socks = new self.WebSocketServer();

  self.socks.bind( self );
  
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
    done();
  });
  
}

Maki.prototype.destroy = function( done ) {
  if (!done) var done = new Function();
  if (!this.httpd) return done();

  this.httpd.close( done );
}

module.exports = Maki;
