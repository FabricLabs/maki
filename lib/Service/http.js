var Service = require('./index');

var WebSocketServer = require('maki-service-websockets');
var express = require('express');

var fs = require('fs');
var pem = require('pem');
var async = require('async');
var walk = require('walk');
var _ = require('lodash');

var streamifier = require('streamifier');
var Torrent = require('node-torrent-stream');
var ObjectID = require('mongoose').Types.ObjectId;

var Bundler = require('browserify');

var HTTP = function() {
  this.maki = null;
  this.name = 'http';
  this._pre = {};
  this._post = {};
  this._plugins = [];
  this._scripts = [
    __dirname + '/../../public/js/webcomponents-lite.min.js',
    __dirname + '/../../public/js/semantic.min.js',
    //__dirname + '/../../public/assets/peer.js',
    //'public/js/jquery.js',
    //'public/js/maki.js'
  ];
  this._workers = [];
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
        html: function() {
          var locals = {};
          // TODO: use Jade's lexer to determine requirements
          locals[ resource.names[ req.m ] ] = data;

          // only use collectors if HTML
          var collectors = [];
          Object.keys( resource.requires ).forEach(function( r ) {
            var requirement = resource.requires[ r ];

            var collector = function(done) {
              var filter = requirement.filter || {};

              if (filter instanceof Function) {
                var filter = filter.apply( data );
              }

              var resource = self.maki.resources[ r ];
              resource.query( filter , {
                populate: requirement.populate,
                sort: requirement.sort
              }, function(err, obj) {
                var element = {};

                if (requirement.single) {
                  element[ resource.names.get ] = (obj) ? obj[0] : {};
                } else {
                  if (requirement.map instanceof Function) {
                    obj = obj.map( requirement.map );
                  }
                  element[ resource.names.query ] = obj;
                }

                done( err, element );
              });
            };

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

            if (self.maki.debug) console.log('local output:', locals);

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

          if (data && data.populate) data.populate();

          if (data && data.toObject) {
            var object = clean( data.toObject() );
          } else if (data && data.map) {
            var object = data.map(function(i) {
              return clean( i );
            });
          } else {
            var object = clean( data );
          }

          res.send( object );
        },
        'application/rss+xml': function() {
          var locals = {
            collection: data,
            resource: resource
          };
          res.render('feed', _.merge( locals , always ));
        }
      };

      Object.keys( handlers ).forEach(function( f ) {
        if (handlers[ f ][ req.m ]) {
          formatters[ f ] = handlers[ f ][ req.m ].bind( data , req , res , next );
        }
      });

      if (req.param('format') === 'json') {
        formatters.json();
      } else {
        res.format( formatters );
      }


    };

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
  };
  self.map = map;
  self.invertedMap = _.invert(map);

  var lessmin = require('less-middleware');
  maki.app.use( lessmin({
    debug: self.debug,
    src: [ __dirname + 'private/less', __dirname + '/../../private/less'],
    dest:  __dirname + '/../../public/css',
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
    if (self.debug) console.log('iterating plugin:', plugin);

    if (plugin.setup) plugin.setup( maki );
    if (plugin.middleware) maki.app.use( plugin.middleware );
    if (plugin.client) self._scripts.push( plugin.client );
    if (plugin.worker) self._workers.push( plugin.worker );
  });

  maki.app.use(function(req, res, next) {
    if (self.debug) console.log( req.method + ' request to ' + req.path )
    res.removeHeader('X-Powered-By');
    return next();
  });

  maki.app.locals.componentMap = {};
  maki.app.locals.components = '';

  var defaults = __dirname + '/../../components';
  var overrides = process.env.PWD + '/components';

  [defaults, overrides].forEach(function(path) {
    var options = {
      listeners: {
        file: function(root, fileStats, next) {
          var component = path + '/' + fileStats.name;
          maki.app.render(component, function(err, html) {
            if (err) console.error(err);
            maki.app.locals.componentMap[fileStats.name] = html;
            next();
          });
        }
      }
    };
    walk.walkSync(path, options);
  });

  Object.keys(maki.app.locals.componentMap).forEach(function(name) {
    maki.app.locals.components += maki.app.locals.componentMap[name];
  });

  maki.app.use( self.provide() );

  if (maki.config.statics && maki.config.statics.length) {
    Object.keys( maki.config.statics ).forEach(function( s ) {
      var static = maki.config.statics[ s ];

      var path = static.path || '/' + s;
      maki.app.get( path , function(req, res) {
        res.provide( s );
      });
    });
  }

  function serveDocumentation(req, res, next) {
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

    var resourceMap = {};
    Object.keys(maki.resources).filter(function(r) {
      var resource = maki.resources[ r ];
      return true;
      return !resource.internal || !resource.static;
    }).forEach(function(name) {
      var model = maki.resources[name];
      var resource = _.clone(model, true);
      delete resource.Schema;
      resourceMap[name] = resource;
    });

    return res.format({
      html: function() {
        res.render('endpoints', {
          resources: resourceList
        });
      },
      json: function() {
        res.send({
          config: {
            service: maki.config.service
          },
          resources: resourceMap
        });
      }
    });
  }

  maki.app.all('/', function(req, res, next) {
    if ('OPTIONS' === req.method) {
      return serveDocumentation(req, res, next);
    }
    next();
  });

  maki.app.get('/components', function(req, res, next) {
    return res.send(maki.app.locals.components);
  });

  maki.app.get('/components/:name', function(req, res, next) {
    var name = req.params.name;
    var path = __dirname + '/../../components/'+name+'.jade';
    if (fs.existsSync(path)) return res.render(path);
    var path = process.env.PWD + '/components/'+name+'.jade';
    if (fs.existsSync(path)) return res.render(path);
    return next();
  });

  maki.app.get('/api', function(req, res, next) {
    return serveDocumentation(req, res, next);
  });

  function filePopulatorFor(field) {
    return function(req, res, next) {
      var db = maki.datastore.mongoose.connections[0].db;
      var files = db.collection('fs.files');
      var query = {};

      if (field === 'fileID') {
        query._id = new ObjectID( req.param('fileID') );
      } else if (field === 'filename') {
        query.filename = req.param('filename');
      } else if (field === 'hash') {
        query.md5 = req.param('hash');
      }

      files.findOne( query , function(err, thing) {
        if (err || !thing) return next();
        res.file = thing;
        res.files = files;
        return next();
      });

    };
  }

  function sendFile(req, res, next) {
    if (!res.file) return next();

    var opts = {
      _id: res.file._id
    };

    var enablePartial = true;

    if (req.headers['range'] && enablePartial) {
      var range = req.headers['range'];
      var parts = range.replace(/bytes=/, '').split('-');

      var rawStart = parts[0];
      var rawEnd = parts[1];

      var start = parseInt( rawStart , 10 );
      var end = (rawEnd) ? parseInt( rawEnd , 10 ) : res.file.length;
      var chunksize = ( end - start ) + 1;

      res.status( 206 );

      res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + res.file.length );
      res.set('Accept-Ranges', 'bytes');
      res.set('Content-Type', res.file.contentType );
      res.set('Content-Length', chunksize );

      opts.range = {
        startPos: start,
        endPos: end
      }

    } else {

      res.files.update({
        _id: res.file._id
      }, {
        $inc: { 'metadata.hits': 1 }
      }, function(err, num) {
        if (maki.debug) console.log('hitcounter update;', err || num );
      });

      res.set('Content-Type', res.file.contentType );
      res.set('Content-Length', res.file.length );
      res.set('Content-Disposition', 'attachment; filename=' + res.file.filename );

    }

    var file = maki.datastore.gfs.createReadStream( opts );

    file.on('error', function(err) {
      console.log('ERROR:', err );
    });
    file.on('end', function() {
      //console.log('end!');
      //res.end();
    });

    file.pipe( res );
  }

  maki.app.get('/files/:fileID\.md5sum', filePopulatorFor('fileID') , function(req, res, next) {
    res.set('Content-Type', 'text/plain');
    res.set('Content-Disposition', 'attachment; filename=' + res.file.filename + '.md5sum' );
    res.send( res.file._id + ' ' + res.file.filename );
  });

  maki.app.get('/files/:filename', filePopulatorFor('filename'), sendFile );
  maki.app.get('/files/:hash',     filePopulatorFor('hash') ,    sendFile );
  maki.app.get('/files/:fileID',   filePopulatorFor('fileID') ,  sendFile );

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

        if (this.ref) {
          return 'lookup';
        }

        // TODO: determine a smarter way to check for composites
        // this currently only catches a very special case
        // so this really shouldn't be considered functional
        if (!this.type || !this.type.name) return 'composite';

        // this probably means mixed, though (see above note about recursion)
        if (!this.type) return 'text';

        if (this.type && this.type.name === 'String') {
          if (this.enum) return 'option';
          if (this.masked) return 'password';
          if (!this.max || this.max > 240) return 'textarea';
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
          case 'Number':
            return 'number';
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
    var methodPopulationMap = {};

    // recursively attach some HTML-specific properties
    for (var prop in resource.attributes) {
      var attribute = resource.attributes[ prop ];
      defineAttributeProperties( attribute );

      if (attribute.populate && attribute.populate instanceof Array) {
        attribute.populate.forEach(function(method) {
          if (method.method && method.fields) {
            if (!methodPopulationMap[ method.method ]) methodPopulationMap[ method.method ] = [];
            method.path = prop;
            methodPopulationMap[ method.method ].push( method );
          } else {
            if (!methodPopulationMap[ method ]) methodPopulationMap[ method ] = [];
            methodPopulationMap[ method ].push({ path: prop , fields: undefined });
          }
        });
      }
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

      if (p === 'query') {
        var executor = function(req, res, next) {
          req.m = p;
          // TODO: query pipeline (facades)
          var q = {};

          resource[ p ]( q , {
            populate: methodPopulationMap[ p ]
          }, function(err, instance) {
            if (err) return res.error( err );
            res.provide( resource.name , instance , handlers );
          });
        }
      } else if (p === 'get') {
        var executor = function(req, res, next) {
          req.m = p;
          // TODO: query pipeline (facades)
          var q = {};
          q[ resource.fields.id ] = req.param('id');

          resource[ p ]( q , {
            populate: methodPopulationMap[ p ]
          }, function(err, instance) {
            if (err) return res.error( err );
            return res.provide( r , instance );
          });
        }
      } else if (p === 'create') {
        var executor = function(req, res, next) {
          req.m = p;
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

            async.parallel([
              createFile
            ], function(err, results) {
              complete( err , results[0] );
            });

            function createFile( innerDone ) {
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
                innerDone( null , file );
              });

              incoming.pipe( filestore );
            }

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
        }

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

      } else if (p === 'update') {
        var executor = function(req, res, next) {
          req.m = p;

          if (resource.source) return res.status( 405 ).provide( r );

          // TODO: query pipeline (facades)
          var q = {};
          q[ resource.fields.id ] = req.param('id');

          var changes = req.body;

          resource[ p ]( q , changes , function(err, instances) {
            if (err) return res.error( err );
            return res.provide( r , instances[0] , handlers );
          });
        }
      } else if (p === 'destroy') {
        var executor = function(req, res, next) {
          req.m = p;

          if (resource.source) return res.status( 405 ).provide( r );

          // TODO: query pipeline (facades)
          var q = {};
          q[ resource.fields.id ] = req.param('id');

          resource[ p ]( q , function(err, count) {
            if (err) return res.error( err );
            return res.status( 204 ).provide( r , handlers );
          });
        }
      } else {
        console.error('method', p, 'not handled in http service');
      }

      var staticHandler = function(req, res, next) {
        req.m = p;
        res.provide( resource.name );
      }

      var stack = [ regex ];
      var pre = [];
      var post = [];

      pre.push(function setupMiddleware(req, res, next) {
        req.resource = resource;
        next();
      });

      if (self._pre[ p ]) {
        pre  = pre.concat(self._pre[p]);
      }
      if (self._post[ p ]) {
        post = post.concat(self._post[p]);
      }

      // TODO: evaluate statics as an entity type different from a resource
      if (resource.options.static) {
        stack = stack.concat( pre , staticHandler , post );
      } else {
        stack = stack.concat( pre , executor , post );
      }

      maki.app[ map[p] ].apply( maki.app , stack );

    });
  });

  //maki.app.use( provider );

  self.maki = maki;

};

HTTP.prototype.start = function( started ) {
  var self = this;

  if (!started) var started = new Function();

  var browserify = new Bundler();
  self._scripts.forEach(function(s) {
    browserify.add(s);
  });

  var bundlePath = __dirname + '/../../public/js/bundle.js';
  var bundle = fs.createWriteStream(bundlePath);
  bundle.on('open', function() {
    browserify.bundle().pipe(bundle);
  });

  // TODO: build an extensible service worker platform; events, triggers, etc.
  self._workers.forEach(function(w) {
    var workerPath = __dirname + '/../../public/worker.js'; // sadly at root :(
    var worker = fs.createWriteStream(workerPath);
    worker.on('open', function() {
      fs.createReadStream(w).pipe(worker);
    });
  });

  self.on('started', function() {
    // TODO: final events, or mechanism for routes injected to Maki pre-start
    setTimeout(function() {
      self.maki.app.all('*', function(req, res, next) {
        return res.status(404).render('404');
      });
    }, 250);
  });

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

    self.maki.server = self.maki.httpd.listen( self.maki.config.services.http.port , function() {
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

      self.maki.serverSPDY = self.maki.spdyd.listen( sslPort , function() {
        var address = self.maki.spdyd.address();
        if (!self.maki.supress) console.log('[SERVICE]'.bold.green , '[HTTP]'.bold , 'listening'.green, 'for', '[https,spdy]'.bold, 'on' , 'https://' + address.address + ':' + address.port   );

        self.emit('started');
        self.maki.emit('service:http:started');

        return started();
      });

    });

  });


};

HTTP.prototype.destroy = function( cb ) {
  this.maki.server.stop();
  this.maki.serverSPDY.stop();
};

module.exports = HTTP;
