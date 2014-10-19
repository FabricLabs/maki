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
  self.JSONRPC         = require('../lib/jsonrpc');
  self.Queue           = require('maki-queue');
  self.WebSocketServer = require('maki-service-websockets');

  self.app.engine('jade', require('jade').__express);
  self.app.set('view engine', 'jade');
  self.app.set('views', ['views', 'app/views', __dirname + '/../app/views'] );

  console.log( self.app.set('views') )

  self.app.locals.pretty = true;
  self.app.locals.maki = {
    resources: []
  }
  
  var mapper = function(req, res, next) {
    // collect a normalized HTTP verb from the inbound request
    req.v = req.method.toLowerCase();
    
    console.log(':look_of_disapproval:', req.param('id'));
    
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
  
  var provide = function() {
    return function( req , res , next ) {

      res.error = function( code , message) {
        if (!message) {
          var message = code;
          var code = 500;
        }
        
        res.format({
          html: function() {
            res.render('error', {
              error: message
            })
          },
          json: function() {
            res.status( code ).send( message );
          }
        });
      }
      
      res.provide = function( name , data , handlers ) {
        if (!handlers) var handlers = {};
        
        console.log('res.provide', name , data);

        var resource = self.resources[ name ];
        
        var formatters = {
          html: function() {
            var locals = {};
            //locals[ resource.names[ method ] ] = data;
            console.log('data provided', data);
            var locals = data;

            if (self.debug) console.log('looking for ' + req.m + ' in ' , resource.templates );

            res.render( resource.templates[ req.m ] , locals , function( err , body , next ) {
              console.log('wat');
              if (self.debug) console.log('render callback', err , locals);
              
              console.log('no render')
              
              // internal express succeeded, send it!
              if (body) {
                if (self.debug) console.log('successful render!  sending.');
                res.set('Content-Type', 'text/html');
                return res.send(body);
              }

              // it didn't render, let's see if there wasn't a template...
              if (err && err.view && !err.view.path) {
                if (self.debug) console.log('4. no such view, falling back', err.view , subject );
                
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
            
            console.log(resource);
            console.log('json requested.', data);
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
              console.log('data.toObject exists')
              var object = clean( data.toObject() );
            } else if (data.map) {
              console.log('data.map exists');
              var object = data.map(function(i) {
                return clean( i );
              });
            } else {
              console.log('welp');
              var object = clean( data );
            }
            
            console.log('sending!', object );
            
            res.send( object[ resource.names[ req.m ] ] );
          }

        };
        
        Object.keys( handlers ).forEach(function( f ) {
          if (handlers[ f ][ req.m ]) {
            formatters[ f ] = handlers[ f ][ req.m ].bind( null , req , res , next );
          }
        });

        res.format( formatters );
        
      }

      next();
    }
  }
  
  /*var jademin = require('jade-browser');
  self.app.use( jademin('/js/templates.js', self.app.set('views'), {
    beforeCompile: function( input ) {
      return input.replace(/extends (.*)\n/, '');
    }
  }) );*/

  var lessmin = require('less-middleware');
  self.app.use( lessmin({
    debug: self.debug,
    src: ['private/less', __dirname + '/../private/less'],
    dest: 'public/css',
    prefix: '/css'
  }) );
  
  var statics = require('serve-static');
  self.app.use( statics( 'public' ) );
  self.app.use( statics( __dirname + '/../public' ) );

  self.app.use( provide() );
  
  var provider = function(req, res, next) {
    if (!req.resource) return next();
    if (!req.v) return next();
    var v = req.v;
    
    var resource = self.resources[ req.resource ];
    
    var method = null;
    
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
        
        console.log('matched method', method , 'for path', r.regex );
        
        
        return;
      }
    });
    
    
    req.m = method;

    var collectors = [];
    var locals = {};

    Object.keys( resource.requires ).forEach(function( r ) {
      var requirement = resource.requires[ r ];
      
      console.log('requirements:', r , requirement);
      
      var collector = function(done) {
        var filter = requirement.filter || {};
        self.resources[ r ].query( filter , function(err, obj) {
          console.log('collected!' , obj );
          if (requirement.single) {
            r = self.resources[ r ].names.get;
            obj = obj[ 0 ];
          } else {
            r = self.resources[ r ].names.query;
          }

          locals[ r ] = obj;
          done( err, obj );
        })
      }
      
      collectors.push( collector );
      
    });
    
    console.log('executing collectors', collectors );
    
    // TODO: querybuilder
    var query = {};
    if (req.params.id) query[ resource.fields.id ] = req.params.id;
    console.log('req.param(\'id\')', req.param('id'));
    console.log('req.params.id', req.params.id);
    
    
    console.log('collecting primary;', method , 'from', resource.name , 'via', query);
    if (!resource[ method ]) return next();
    console.log('resource method exists', method);
    
    resource[ method ]( query , function(err, instance ) {
      console.log('called back, ' , err , instance );

      locals[ resource.names[ method ] ] = instance;
      
      async.parallel( collectors , function(err, results) {
        
        console.log('collectors done.' , resource.name , err , results );
        console.log('providing locals', locals);
        console.log('handlers', resource.options.handlers)
        res.provide( resource.name , locals , resource.options.handlers );
        
      });
    } );
  }
  self.app.use( provider );
  
  
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
      
      return res.send({
        config: {
          views: {
            client: self.config.views.client
          }
        },
        resources: resourceList
      });
    }
    next();
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

Maki.prototype.start = function( done ) {
  var self = this;
  
  if (!done) var done = new Function();
  
  if (!self.resources['Index']) {
    console.log('starting, but no index defined');
    
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
      
      var cb = resource[ p ]();
      if (cb) self.app[ map[p] ]( regex , cb );
    });
  });
  
  if (self.config.statics && self.config.statics.length) {
    Object.keys( self.config.statics ).forEach(function( s ) {
      var static = self.config.statics[ s ];
      
      var path = static.path || '/' + s;
      app.get( path , function(req, res) {
        res.provide( s );
      });
    })
  }
  
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
