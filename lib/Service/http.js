var Service = require('./index');

var HTTP = function() {
  this.maki = null;
};

require('util').inherits( HTTP , Service );

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
        console.log('collected!' , obj );
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
            req.flash('success', resource.names.get + ' created successfully!');
            return res.redirect( '/' + resource.collection + '/' + locals[ resource.names[ method ] ][ resource.fields.id ] );
          }
        }
      } , resource.handlers ) );
    });
  } );
};

HTTP.prototype.attach = function( maki ) {
  var self = this;
  self.maki = maki;
  
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
    src: ['private/less', __dirname + '/../private/less'],
    dest: 'public/css',
    prefix: '/css'
  }) );

  var statics = require('serve-static');
  maki.app.use( statics( 'public' ) );
  maki.app.use( statics( __dirname + '/../public' ) );

  maki.app.use( require('body-parser')() );

  /* Configure the registration and login system */
  maki.app.use( maki.passport.initialize() );
  maki.app.use( maki.passport.session() );
  //maki.app.use( require('connect-flash')() );
  maki.app.use( require('flashify') );
  
  //maki.app.use( self.provide );

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

      switch (p) {
        case 'query':
          // TODO: query pipeline
          maki.app[ map[p] ]( regex , function(req, res, next) {
            var q = {};
            console.log('query called, providing...')
            
            resource[ p ]( q , function(err, data) {
              console.log('query...', r );
              return res.provide( r , err , data );
            });
          });
        break;
        case 'get':
          maki.app[ map[p] ]( regex , function(req, res, next) {
            var q = {};
            resource[ p ]( q , function(err, data) {
              return res.status( 200 ).send( data );
            });
          });
        break;
        case 'create':
          maki.app[ map[p] ]( regex , function(req, res, next) {
            var doc = req.body;
            resource[ p ]( doc , function(err, instance) {
              return res.status( 200 ).send( instance );
            });
          });
        break;
        case 'update':
          maki.app[ map[p] ]( regex , function(req, res, next) {
            var query = {};
            var changes = req.body;
            resource[ p ]( query , changes , function(err, instance) {
              return res.status( 200 ).send( instance );
            });
          });
        break;
        case 'destroy':
          maki.app[ map[p] ]( regex, function(req, res, next) {
            resource[ p ]( query , function(err, instance) {
              return res.status( 200 ).send( instance );
            });
          });
        break;
      }
      
      //var cb = resource[ p ]();
      //if (cb) maki.app[ map[p] ]( regex , cb );
    });
  });
  
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

  maki.httpd = require('http').createServer( maki.app );
  
};

HTTP.prototype.start = function( ) {
  
};

module.exports = HTTP;
