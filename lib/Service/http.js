var Service = require('./index');

var WebSocketServer = require('maki-service-websockets');
var express = require('express');

var pem = require('pem');

var HTTP = function() {
  this.maki = null;
};

require('util').inherits( HTTP , Service );

HTTP.prototype.provide = function() {
  var self = this;
  
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
    };
    
    res.provide = function( name , data , handlers ) {
      if (!handlers) var handlers = {};

      var resource = self.maki.resources[ name ];
      
      var formatters = {
        html: function() {
          var locals = data || {}; 
          
          // TODO: use Jade's lexer to determine requirements
          // TODO: not clobber locals
          locals[ resource.names[ req.m ] ] = data;

          if (self.maki.debug) console.log('looking for ' + req.m + ' in ' , resource.templates );

          res.render( resource.templates[ req.m ] , locals , function( err , body , next ) {
            if (self.maki.debug) console.log('render callback', err , locals);

            // internal express succeeded, send it!
            if (body) {
              if (self.maki.debug) console.log('successful render!  sending.');
              res.set('Content-Type', 'text/html');
              return res.send(body);
            }

            // it didn't render, let's see if there wasn't a template...
            if (err && err.view && !err.view.path) {
              if (self.debug) console.log('4. no such view, falling back', err.view , subject );
              
              //var subject = locals[ resource.names[ req.m ] ];
              var subject = data;

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
      
      console.log('HEYYYYY' , data );
      
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

/*/HTTP.prototype.provideMiddleware = function( req , res , next ) {
  var self = this;
  var maki = self.maki;

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
  
  res.provide = self.provide;

  next();
};/**/

HTTP.prototype.provider = function(req, res, next) {
  var self = this;
  var maki = self.maki;

  if (!req.resource) return next();
  if (!req.v) return next();
  var v = req.v;
  
  var resource = maki.resources[ req.resource ];
  
  var method = null;
  
  // METHOD SELECTION
  // of available resources r[], locate matching path p based on regex r
  // select appropriate method m from path p
  // resolves to r_i_m
  if (maki.debug) console.log('verbs', resource.verbs);
  Object.keys( resource.verbs[ v ] ).forEach(function( i ) {
    var r = resource.verbs[ v ][ i ];
    var regex = pathToRegex( r.regex );
    
    if (maki.debug) console.log('testing ' + req.path , r ,  resource.methods[ r ],  v , resource.verbs[ v ][ r ] );
    
    if (regex.test( req.path )) {
      if (!method) method = r.method;
      if (maki.debug) console.log('matched method', method , 'for path', r.regex );
      return;
    }
  });

  req.m = method;

  var collectors = [];
  var locals = {};

  Object.keys( resource.requires ).forEach(function( r ) {
    var requirement = resource.requires[ r ];

    var collector = function(done) {
      var filter = requirement.filter || {};
      console.log('resources', Object.keys(maki.resources) );
      console.log('r value', r );
      maki.resources[ r ].query( filter , function(err, obj) {
        if (requirement.single) {
          r = maki.resources[ r ].names.get;
          obj = obj[ 0 ];
        } else {
          r = maki.resources[ r ].names.query;
        }

        locals[ r ] = obj;
        done( err, obj );
      })
    }
    
    collectors.push( collector );
    
  });

  // TODO: querybuilder
  var query = null;
  if (req.params.id) query[ resource.fields.id ] = req.params.id;
  
  if (!resource[ method ]) return next();
  
  // TODO: query pipeline
  if (['create', 'update'].indexOf( method ) >= 0) query = req.body;
  
  // WHOA
  resource[ method ]( query , function(err, instance ) {
    locals[ resource.names[ method ] ] = instance;
    async.parallel( collectors , function(err, results) {
      res.provide( resource.name , locals , _.extend({
        'html': {
          create: function( req , res , next) {
            //req.flash('success', resource.names.get + ' created successfully!');
            return res.redirect( '/' + resource.collection + '/' + locals[ resource.names[ method ] ][ resource.fields.id ] );
          }
        }
      } , resource.handlers ) );
    });
  } );
};

/**
 * Construct an Express application and attach it to Maki.
 */ 
HTTP.prototype.attach = function( maki ) {
  var self = this;

  maki.app = express();
  maki.passport = require('passport');
  maki.socks = new WebSocketServer();

  maki.app.locals.maki = {
    resources: []
  };
  
  var map = {
    'query':   'get',
    'create':  'post',
    'get':     'get',
    'update':  'patch',
    'destroy': 'delete'
  }
  
  /*var jademin = require('jade-browser');
  maki.app.use( jademin('/js/templates.js', maki.app.set('views'), {
    beforeCompile: function( input ) {
      return input.replace(/extends (.*)\n/, '');
    }
  }) );*/

  var lessmin = require('less-middleware');
  maki.app.use( lessmin({
    debug: self.debug,
    src: ['private/less', __dirname + '/../../private/less'],
    dest: 'public/css',
    prefix: '/css'
  }) );

  var statics = require('serve-static');
  maki.app.use( statics( 'public' ) );
  maki.app.use( statics( __dirname + '/../../public' ) );

  maki.app.engine('jade', require('jade').__express);
  maki.app.set('view engine', 'jade');
  maki.app.set('views', ['views', 'app/views', __dirname + '/../../app/views'] );

  maki.app.use( require('body-parser')() );

  /* Configure the registration and login system */
  maki.app.use( maki.passport.initialize() );
  maki.app.use( maki.passport.session() );
  //maki.app.use( require('connect-flash')() );
  
  maki.app.use( self.provide() );

  if (maki.config.statics && maki.config.statics.length) {
    Object.keys( maki.config.statics ).forEach(function( s ) {
      var static = maki.config.statics[ s ];
      
      var path = static.path || '/' + s;
      maki.app.get( path , function(req, res) {
        res.provide( s );
      });
    })
  }

  maki.app.all('/', function(req, res, next) {
    if ('OPTIONS' === req.method) {
      var resourceList = Object.keys( maki.resources ).map(function(r) {
        var resource = maki.resources[ r ];
        
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
            client: maki.config.views.client
          }
        },
        resources: resourceList
      });
    }
    next();
  });

  // determine all possible routes
  Object.keys( maki.resources ).forEach(function( r ) {
    var resource = maki.resources[ r ];

    maki.app.locals.maki.resources.push( resource );

    Object.keys( resource.routes ).forEach(function( p ) {
      var regex = resource.routes[ p ];

      maki.routes[ regex ] = r;

      if (maki.debug) console.log('binding ' + map[p].toUpperCase() + ' ' + regex + ' to ' + p + ' of ' + resource.name );
      
      if (!maki.resources[ r ].verbs[ map[p] ]) {
        maki.resources[ r ].verbs[ map[p] ] = [];
      }
      maki.resources[ r ].verbs[ map[p] ].push({
        regex: regex ,
        method: p
      });
      
      maki.resources[ r ].methods[ regex ] = p;
      
      var handlers = {
        html: {
          create: function(req, res, next) {
            // send the correct status code to clients expecting HTML (usually browsers)
            res.redirect( 303 , '/' + maki.resources[ r ].collection + '/' + req.locals[ resource.fields.id ] );
          }
        }
      }

      // TODO: completely DRY this out
      // there is a slight difference in how Resource methods are implemented// 
      // specifically, "editing" a resourcing requires 1) a query , and 2)// 
      // patches.  Perhaps we can use a "builder" and .apply() here.
      switch (p) {
        case 'query':
          // TODO: query pipeline
          maki.app[ map[p] ]( regex , function(req, res, next) {
            req.m = p;
            // TODO: query pipeline (facades)
            var q = {};
            
            resource[ p ]( q , function(err, instance) {
              if (err) return res.error( err );
              return res.provide( r , instance );
            });
          });
        break;
        case 'get':
          maki.app[ map[p] ]( regex , function(req, res, next) {
            req.m = p;
            // TODO: query pipeline (facades)
            var q = {};
            q[ resource.fields.id ] = req.param('id');

            resource[ p ]( q , function(err, instance) {
              if (err) return res.error( err );
              return res.provide( r , instance );
            });
          });
        break;
        case 'create':
          maki.app[ map[p] ]( regex , function(req, res, next) {
            req.m = p;
            // TODO: query pipeline (facades)
            var doc = req.body;
            resource[ p ]( doc , function(err, instance) {
              if (err) return res.error( err );
              req.locals = instance;
              return res.provide( r , instance , handlers );
            });
          });
          
          // handle PUT of this resource, too
          maki.app['put']( regex + '/:id' , function(req, res, next) {
            req.m = p;
            // TODO: query pipeline (facades)
            var doc = req.body;
            resource[ p ]( doc , function(err, instance) {
              if (err) return res.error( err );
              req.locals = instance;
              return res.provide( r , instance );
            });
          });
        break;
        case 'update':
          maki.app[ map[p] ]( regex , function(req, res, next) {
            req.m = p;
            // TODO: query pipeline (facades)
            var q = {};
            q[ resource.fields.id ] = req.param('id');

            var changes = req.body;
            
            resource[ p ]( q , changes , function(err, instance) {
              if (err) return res.error( err );
              return res.provide( r , instance , handlers );
            });
          });
        break;
        case 'destroy':
          maki.app[ map[p] ]( regex, function(req, res, next) {
            req.m = p;
            // TODO: query pipeline (facades)
            var q = {};
            q[ resource.fields.id ] = req.param('id');

            resource[ p ]( q , function(err, instance) {
              if (err) return res.error( err );
              return res.provide( r , instance , handlers );
            });
          });
        break;
      }
      
      //var cb = resource[ p ]();
      //if (cb) maki.app[ map[p] ]( regex , cb );
    });
  });
  
  // maki.app.use( provider );

  maki.app.locals.user = null;
  /* configure some local variables for use later */
  maki.app.use(function(req, res, next) {
    // set a user context (from passport)
    res.locals.user = req.user;
    
    if (self.debug) console.log( req.method + ' request to ' + req.path )
 
    res.removeHeader('X-Powered-By');
    next();
  });
  
  /**maki.app.get('/', function(req, res, next) {
    res.send('erp');
  });**/
  
  self.maki = maki;

};

HTTP.prototype.start = function( started ) {
  var self = this;
  
  if (!started) var started = new Function();
  
  pem.createCertificate({
    days: 1,
    selfSigned: true
  }, function(err, keys) {

    var sslPort = self.maki.config.services.http.port + 443;
    //self.maki.config.services.spdy.port = sslPort;
    
    self.maki.httpd = require('http').createServer( self.maki.app );
    self.maki.spdyd = require('spdy').createServer({
      key: keys.serviceKey,
      cert: keys.certificate
    }, self.maki.app );
  
    self.maki.socks.bind( self.maki );
    
    // clean up clients at an interval
    // TODO: consider setTimeout per-client
    self.maki.socks.maid = setInterval(function() {
      if (self.maki.debug) console.log( '[HEARTBEAT] %d connected clients' , Object.keys( self.maki.clients ).length );
      self.maki.socks.server.markAndSweep();
    }, self.maki.config.sockets.timeout );

    self.maki.httpd.listen( self.maki.config.services.http.port , function() {
      var address = self.maki.httpd.address();
      self.maki.config.services.http.port = address.port;
      
      if (self.maki.debug) console.log('[HTTPD] listening for http' , address );
      
      self.maki.spdyd.listen( sslPort , function() {
        var address = self.maki.spdyd.address();
        console.log('[HTTPD] listening for https' , address );
        started();
      });
      
    });

  });
  

};

module.exports = HTTP;
