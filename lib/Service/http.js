var Service = require('./index');

var WebSocketServer = require('maki-service-websockets');
var express = require('express');

var pem = require('pem');
var async = require('async');
var _ = require('lodash');

var streamifier = require('streamifier');
var Torrent = require('node-torrent-stream');
var ObjectID = require('mongoose').Types.ObjectId;

var HTTP = function() {
  this.maki = null;
  this.name = 'http';
  this._pre = {};
  this._post = {};
  this._plugins = [];
};

require('util').inherits( HTTP , Service );

HTTP.prototype.pre = function( event , binding ) {
  if (!~['query', 'get', 'update', 'delete', 'create'].indexOf( event )) {
    throw new Error('event "'+event+'" is not a valid method.');
  }
  this._pre[ event ] = binding;
};

HTTP.prototype.post = function( event , binding ) {
  if (!~['query', 'get', 'update', 'delete', 'create'].indexOf( event )) {
    throw new Error('event "'+event+'" is not a valid method.');
  }
  this._post[ event ] = binding;
};

HTTP.prototype.provide = function() {
  var self = this;

  return function( req , res , next ) {

    // always define some locals...
    var always = {};

    res.error = function( code , message) {
      if (!message) {
        var message = code;
        var code = 500;
      }

      res.format({
        html: function() {
          var locals = {
            error: message
          };
          res.render('error', _.merge( locals , always ) );
        },
        json: function() {
          res.status( code ).send( message );
        }
      });
    };

    res.provide = function( name , data , handlers ) {
      if (!handlers) var handlers = {};

      if (self.maki.debug) console.log('res.provide()', name , data );

      var resource = self.maki.resources[ name ];

      if (self.maki.debug) console.log('requires', resource.requires );

      var formatters = {
        xml: function() {
          console.log('lol xml');
          var locals = {
            collection: data,
            resource: resource
          };
          res.render('feed', _.merge( locals , always ));
        },
        html: function() {
          var locals = data || {};

          // TODO: use Jade's lexer to determine requirements
          // TODO: not clobber locals
          locals[ resource.names[ req.m ] ] = data;

          // only use collectors if HTML
          var collectors = [];
          Object.keys( resource.requires ).forEach(function( r ) {
            var requirement = resource.requires[ r ];

            var collector = function(done) {
              var filter = requirement.filter || {};

              var resource = self.maki.resources[ r ];
              resource.query( filter , function(err, obj) {
                var element = {};

                if (requirement.single) {
                  element[ resource.names.get ] = (obj) ? obj[0] : {};
                } else {
                  element[ resource.names.query ] = obj;
                }

                done( err, element );
              })
            }

            collectors.push( collector );

          });
          
          if (self.maki.debug) console.log('collectors', collectors );

          async.parallel( collectors , function(err, results) {
            // take our aggregated results and add them to the locals for Jade
            results.forEach(function(c) {
              Object.keys( c ).forEach(function( r ) {
                locals[ r ] = c[ r ];
              });
            });

            if (self.maki.debug) console.log('looking for ' + req.m + ' in ' , resource.templates );

            locals = _.merge( locals , always );

            res.render( resource.templates[ req.m ] , locals , function( err , body , next ) {
              if (self.maki.debug) console.log('render callback', err );
              if (err && err.view && err.view.path) return res.render('error'); // TODO: replace with Error handler

              // internal express render succeeded, send it!
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
                  return res.render('resource', _.merge( always , {
                    resource: resource,
                    item: subject
                  }) );
                } else {
                  return res.render('resource', _.merge( always , {
                    resource: resource,
                    collection: subject
                  }) );
                }
              } else {
                return res.render('error'); // TODO: replace with Error handler
                console.log('whuuuuutttt');
              }
            } );

          });
        },
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

          if (data.populate) data.populate();

          if (data.toObject) {
            var object = clean( data.toObject() );
          } else if (data && data.map) {
            var object = data.map(function(i) {
              return clean( i );
            });
          } else {
            var object = clean( data );
          }

          res.send( object );
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
};

HTTP.prototype.setup = function( maki ) {
  var self = this;
  
  
  
  return self;
};

/**
 * Construct an Express application and attach it to Maki.
 */
HTTP.prototype.attach = function( maki ) {
  var self = this;

  maki.app = express();
  maki.socks = new WebSocketServer();
  maki.app.use( require('maki-forms') );

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
    src: [ __dirname + 'private/less', __dirname + '/../../private/less'],
    dest:  __dirname + 'public/css',
    prefix: '/css'
  }) );

  var statics = require('serve-static');
  maki.app.use( statics( 'public' ) );
  maki.app.use( statics( __dirname + '/../../public' ) );

  maki.app.engine('jade', require('jade').__express);
  maki.app.set('view engine', 'jade');
  maki.app.set('views', ['views', __dirname + '/../../views'] );
  maki.app.locals.pretty = true;

  maki.app.locals.markdown = require('marked');
  maki.app.locals.moment = require('moment');
  maki.app.locals.user = null;
  
  maki.app.use( require('body-parser')() );
  maki.app.use( require('multer')({
    inMemory: true
  }));

  maki.app.locals[ 'config' ]    = maki.config;
  maki.app.locals[ 'resources' ] = maki.resources;
  maki.app.locals[ 'services' ]  = maki.services;
  
  self._plugins.forEach(function(plugin) {
    if (plugin.setup) plugin.setup( maki );
    if (plugin.middleware) maki.app.use( plugin.middleware );
  });

  maki.app.use(function(req, res, next) {
    if (self.debug) console.log( req.method + ' request to ' + req.path )
    res.removeHeader('X-Powered-By');
    return next();
  });

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
      var resourceList = Object.keys( maki.resources ).filter(function(r) {
        var resource = maki.resources[ r ];
        return !resource.internal || !resource.static;
      }).map(function(r) {
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
        // TODO: fix circular JSON issue here
        resources: resourceList
      });
    }
    next();
  });
  
  function filePopulator(req, res, next) {
    var db = maki.datastore.mongoose.connections[0].db;
    var files = db.collection('fs.files');
    var fileID = new ObjectID( req.param('fileID') );

    files.findOne({ _id: fileID }, function(err, thing) {
      if (err || !thing) return res.error('404');
      res.file = thing;
      res.files = files;
      return next();
    });
  };

  maki.app.get('/files/:fileID\.md5sum', filePopulator , function(req, res, next) {
    res.set('Content-Type', 'text/plain');
    res.set('Content-Disposition', 'attachment; filename=' + res.file.filename + '.md5sum' );
    res.send( res.file._id + ' ' + res.file.filename );
  });
  maki.app.get('/files/:fileID', filePopulator , function(req, res, next) {
    var file = maki.datastore.gfs.createReadStream({
      _id: req.param('fileID')
    });
    res.set('Content-Disposition', 'attachment; filename=' + res.file.filename );
    res.files.update({
      _id: res.file._id
    }, {
      $inc: { 'metadata.hits': 1 }
    }, function(err, num) {
      if (maki.debug) console.log('hitcounter update;', err || num );
    });
    
    // TODO: use a different stat to prevent inflated counts.
    file.pipe( res );
  });

  function defineAttributeProperties( attribute ) {

    Object.defineProperty( attribute , '_rows', {
      get: function() {
        return (this.max) ? this.max / 240 : 3;
      }
    });
    
    Object.defineProperty( attribute , '_ref', {
      get: function() {
        if (this[0] instanceof maki.mongoose.Schema) {
          return this[0].name;
        } else {
          return this.ref;
        }
      }
    });

    Object.defineProperty( attribute , '_type', {
      get: function() {
        if (~['File'].indexOf( this.type )) return 'file';

        if (this[0] instanceof maki.mongoose.Schema) {
          return 'lookup';
        }
        
        // TODO: determine a smarter way to check for composites
        // this currently only catches a very special case
        // so this really shouldn't be considered functional
        if (!this.type || !this.type.name) return 'composite';

        // this probably means mixed, though (see above note about recursion)
        if (!this.type) return 'text';

        if (this.type && this.type.name === 'String') {
          if (this.enum) {
            return 'option';
          }
          
          if (!this.max || this.max > 240) {
            return 'textarea';
          }
        }

        switch (this.type.name) {
          default:
            return 'text';
          break;
          case 'ObjectId':
            return 'lookup';
          break;
          case 'Date':
            return 'datetime-local';
          break;
        }
      }
      
    });

    Object.defineProperty( attribute , '_default', {
      get: function() {
        if (!this.type) return;
        if (!this.default) return;
        // TODO: determine how to convert to localtime on clientside
        if (this.type.name === 'Date') return new Date(this.default()).toISOString().slice(0, -1);
        return this.default;
      }
    });

    if (!attribute.type || !attribute.type.name) {
      if (attribute.type === 'File') return;
      if (attribute.type === 'Mixed') return;
      
      if (attribute.constructor.name === 'Array') {
        if (attribute[0] instanceof maki.mongoose.Schema) return;
      }
      
      for (var prop in attribute) {
        var attr = attribute[ prop ];
        defineAttributeProperties( attr );
      }
    }
    
  }

  // determine all possible routes
  Object.keys( maki.resources ).forEach(function( r ) {
    var resource = maki.resources[ r ];

    // recursively attach some HTML-specific properties
    for (var prop in resource.attributes) {
      var attribute = resource.attributes[ prop ];
      defineAttributeProperties( attribute );
    }

    Object.keys( resource.routes ).forEach(function( p ) {
      var regex = resource.routes[ p ];

      maki.routes[ regex ] = r;

      if (maki.debug) console.log('binding method HTTPD.' + map[p] + '( ' + regex + ' ) to ' + resource.name + '.' + p + '()' );

      if (!maki.resources[ r ].verbs[ map[p] ]) {
        maki.resources[ r ].verbs[ map[p] ] = [];
      }
      maki.resources[ r ].verbs[ map[p] ].push({
        regex: regex ,
        method: p
      });

      maki.resources[ r ].methods[ regex ] = p;
      
      var resourceCreatedSeeOther = function(req, res, next) {
        // send the correct status code to clients expecting HTML (usually browsers)
        res.redirect( 303 , '/' + maki.resources[ r ].collection + '/' + req.locals[ resource.fields.id ] );
      };
      var handlers = _.merge({
        html: {
          create: resourceCreatedSeeOther
        },
        json: {
          create: resourceCreatedSeeOther
        }
      }, resource.handlers );

      // TODO: completely DRY this out
      // there is a slight difference in how Resource methods are implemented//
      // specifically, "editing" a resourcing requires 1) a query , and 2)//
      // patches.  Perhaps we can use a "builder" and .apply() here.
      switch (p) {
        case 'query':
          var stack = [ regex ];
          var pre = [];
          var post = [];
          
          if (self._pre[ p ])  pre  = pre.concat( self._pre[ p ] );
          if (self._post[ p ]) post = post.concat( self._post[ p ] );

          // TODO: evaluate statics as an entity type different from a resource
          if (resource.options.static) {
            stack = stack.concat( pre , staticHandler , post );
          } else {
            stack = stack.concat( pre , executor , post );
          }
          
          maki.app[ map[p] ].apply( maki.app , stack );
          
          function staticHandler(req, res, next) {
            req.m = p;
            res.provide( resource.name );
          }
          
          function executor(req, res, next) {
            req.m = p;
            // TODO: query pipeline (facades)
            var q = {};

            resource[ p ]( q , function(err, instance) {
              if (err) return res.error( err );
              res.provide( resource.name , instance , handlers );
            });
          }
          
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
          maki.app[ map[p] ]( regex ,  function(req, res, next) {
            req.m = p; console.log('setting up create for ', resource.name );
            if (resource.source) return res.status( 405 ).provide( r );
            
            var doc = req.body;
            doc._id = new ObjectID();

            async.map( resource._meta.files , function( filename , complete ) {
              var file = req.files[ filename ] || req.body[ filename ];
              if (!file) return complete('not provided');

              var stream = require('stream');
              var rs = streamifier.createReadStream( file.buffer || file );
              var incoming = new stream.PassThrough();

              rs.pipe( incoming );
              resource.emit('file', incoming );

              var filestore = maki.datastore.gfs.createWriteStream({
                mode: 'w',
                filename: file.originalname,
                content_type: file.mimetype,
                metadata: {
                  originalname: file.originalname,
                  fieldname: filename,
                  document: doc._id
                }
              });
              filestore.on('error', function(data) {
                console.log('error!' , data );
              });
              filestore.on('close', function(file) {
                resource.emit('file:' + filename , file );
                complete( null , file );
              });

              incoming.pipe( filestore );

            }, function(err, files) {

              files.forEach(function(file) {
                if (!file) return;
                var field = file.metadata.fieldname;
                doc[ field ] = file._id;
              });

              resource[ p ]( doc , function(err, instance) {
                if (err) return res.error( err );
                req.locals = instance;
                return res.provide( r , instance , handlers );
              });
            });
          });

          // handle PUT of this resource, too
          maki.app['put']( regex + '/:id' , function(req, res, next) {
            req.m = p;
            if (resource.source) return res.status( 405 ).provide( r );

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

            if (resource.source) return res.status( 405 ).provide( r );

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

            if (resource.source) return res.status( 405 ).provide( r );

            // TODO: query pipeline (facades)
            var q = {};
            q[ resource.fields.id ] = req.param('id');

            resource[ p ]( q , function(err, count) {
              if (err) return res.error( err );
              return res.status( 204 ).provide( r , handlers );
            });
          });
        break;
      }

    });
  });

  //maki.app.use( provider );

  self.maki = maki;

};

HTTP.prototype.start = function( started ) {
  var self = this;

  if (!started) var started = new Function();

  // TODO: spdy/https should be the default.  Make it so, with optional http.
  // TODO: allow configurable certificate, supplied by config
  // this will allow for standalone mode, as well as a "backend worker" mode.
  pem.createCertificate({
    days: 1,
    selfSigned: true
  }, function(err, keys) {

    var sslPort = self.maki.config.services.http.port + 443 - 80;
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
      self.maki.socks.markAndSweep();
    }, self.maki.config.sockets.timeout );

    self.maki.httpd.listen( self.maki.config.services.http.port , function() {
      var address = self.maki.httpd.address();
      self.maki.config.services.http.port = address.port;

      // setup defaults, expose service and variables
      self.protocol = 'http';
      self.host = 'localhost';
      self.port = address.port;

      self.authority = self.host;

      if (self.port != 80) self.authority += ':' + self.port ;

      if (!self.maki.supress) console.log('[SERVICE]'.bold.green , '[HTTP]'.bold , 'listening'.green, 'for', '[http]      '.bold, 'on ' , 'http://' + address.address + ':' + address.port  );

      self.address = address;

      self.maki.spdyd.listen( sslPort , function() {
        var address = self.maki.spdyd.address();
        if (!self.maki.supress) console.log('[SERVICE]'.bold.green , '[HTTP]'.bold , 'listening'.green, 'for', '[https,spdy]'.bold, 'on' , 'https://' + address.address + ':' + address.port   );
        return started();
      });

    });

  });


};

module.exports = HTTP;
