var fs = require('fs');
var util = require('util');
var pluralize = require('pluralize');
var pathToRegex = require('path-to-regexp');

var procure = require('procure');
var slugify = require('speakingurl');
var jsonpatch = require('fast-json-patch');
var yaml = require('yaml-front-matter');

var _ = require('lodash');
var async = require('async');

var ObjectId = require('mongoose').SchemaTypes.ObjectId;
var ObjectID = require('mongoose').Types.ObjectId;
var uuid = require('uuid');

var Resource = function( name , options ) {
  var self = this;

  if (!name)  throw new Error('Some configuration is required to create a Resource');
  if (!options) var options = name;

  if (!options.paths) options.paths = {};
  if (!options.routes) options.routes = {};
  if (!options.methods) options.methods = {};
  if (!options.templates) options.templates = {};
  if (!options.components) options.components = {};
  if (!options.plugins) options.plugins = [];
  if (!options.requires) options.requires = [];
  if (!options.handlers) options.handlers = {};
  if (!options.params) options.params = { query: {} };
  if (!options.fields) options.fields = {};
  if (!options.attributes) options.attributes = {};
  if (!options.names) options.names = {};

  self.name = name;
  self.plural = pluralize( self.name );
  self.internal = options.internal || false;
  self.public = (options.public === false) ? false : true;
  self.static = options.static || false;
  self.source = options.source || null; // TODO: switch to a source type, maybe?
  self.map = options.map || null;
  self.options = options;

  self.attributes = {};
  self.keys = { '_id': 0 };
  self._meta = {
    files: [],
    refs: []
  };

  var nameLower      = self.name.toLowerCase();
  var collectionName = self.plural.toLowerCase();
  self.collection    = collectionName;

  self.synopsis    = options.synopsis    || 'Resource.';
  self.image       = options.image       || '/img/resource.png';
  self.masthead    = options.masthead    || null;
  self.description = options.description || 'A Resource available on this server.';
  self.template    = options.template    || nameLower;
  self.templates   = options.templates;

  self.routes = {};
  self.paths = { query: new RegExp( self.routes.query ) };
  self.methods = {};
  self.verbs = {};
  self.names = _.defaults( self.options.names , {
    handle: (self.options.handle) ? self.options.handle : self.plural,
    query:  self.collection,
    queryProper:  (self.options.handle) ? self.options.handle : self.plural,
    get:    nameLower,
    getProper:    self.name,
    create: nameLower
  });

  if (!self.templates.query) self.templates.query = options.template || (options.singular) ? nameLower : collectionName;
  if (!self.templates.get) self.templates.get = options.template || nameLower;

  if (self.options.routes) self.routes = _.merge( self.routes , self.options.routes );

  self.fields = {
    id: 'id',
    name: '_id',
    slug: '_id',
    description: null,
    image: null
  };

  self.requires = options.requires;
  self.handlers = options.handlers;

  if (!self.options.attributes.id) {
    self.options.attributes.id = { type: String , required: true , id: true };
  }

  // internal resources should now be complete! return!
  if (self.options.internal || self.options.static) return;

  // determine which field to use in the path (defaults to _id)
  // TODO: recurse
  Object.keys( self.options.attributes ).forEach(function( f ) {
    var attribute = self.options.attributes[ f ];

    if (!attribute.type) {
      console.log(
        '[WARNING]'.yellow,
        'Resource "' + self.name + '"',
        'attribute `' + f + '` has no type.',
        'You should consider adding one.'
      );
      self._meta.refs.push( f );
    }

    // check for special file types, like 'File'
    // if not special, add it to the schema
    if (attribute.type && ~['File'].indexOf( attribute.type )) {
      self._meta.files.push( f );
      self.attributes[ f ] = { type: ObjectId };
    } else {
      self.attributes[ f ] = attribute;
    }

    if ( attribute.id === true ) {
      self.fields.id = f;
      delete self.keys._id; //Remove the _id field from white-list
    }

    if ( attribute.name === true ) {
      self.fields.name = f;
    }

  });

  self.middlewares = {
    pre: {
      query:   [],
      get:     [],
      create:  [],
      update:  [],
      patch:   [], // TODO: alias for update?
      destroy: [],
      count:   [],
    },
    post: {
      query:   [],
      get:     [],
      create:  [],
      update:  [],
      patch:   [], // TODO: alias for update?
      destroy: [],
      count:   []
    }
  };

  // build the routes for this resource (passed to generate regexes)
  self.routes = {
    query:   options.routes.query   || '/' + collectionName ,
    get:     options.routes.get     || '/' + collectionName + '/:id',
    create:  options.routes.create  || '/' + collectionName ,
    update:  options.routes.update  || '/' + collectionName + '/:id',
    destroy: options.routes.destroy || '/' + collectionName + '/:id'
  };

  // generate paths for each action, to be used with RegExp.test
  self.paths = {
    query:   options.paths.query   || pathToRegex( self.routes.query ),
    get:     options.paths.get     || pathToRegex( self.routes.get ),
    create:  options.paths.create  || pathToRegex( self.routes.create ),
    update:  options.paths.update  || pathToRegex( self.routes.update ),
    destroy: options.paths.destroy || pathToRegex( self.routes.destroy )
  };

  // set the templates for each action
  self.templates = {
    query:  options.template || options.templates.query  || collectionName,
    get:    options.templates.get    || nameLower,
    create: options.templates.create || nameLower + '-create',
    update: options.templates.update || nameLower + '-update'
  };

}

util.inherits( Resource , require('events').EventEmitter );

Resource.prototype.attach = function( maki ) {
  var self = this;

  self.Schema = new maki.mongoose.Schema( self.attributes );
  self.options.attributes.__v = { restricted: true };

  self.Schema.plugin(require('mongoose-deep-populate'));
  self.Schema.plugin(require('mongoose-json-patch'));
  // TODO: implement
  //self.Schema.plugin(require('maki-types-id'));
  self.Schema.plugin(require('maki-mongoose-hooks'), {
    maki: maki, // <- le sigh.  can we do this another way?
    resource: self
  });

  self.Schema.methods.Resource = self;
  self.Schema.methods.Resources = maki.resources;

  Object.keys( self.options.methods ).forEach(function( name ) {
    self.Schema.methods[ name ] = self.options.methods[ name ];
  });

  Object.keys( self.options.attributes ).forEach(function( f ) {
    var field = self.options.attributes[ f ];

    if (~self._meta.files.indexOf( f )) {
      // TODO: setup middleware here?
      // self.Schema.attach...
      self.attributes[ f ] = field;
    }

    if (field.slug === true) {
      self.fields.slug = f;
      self.fields.name = f;

      self.Schema.plugin( require('mongoose-slug')( f , {
        unique: true
      }) );
    }

    if ( field.validator ) {
      self.path( f ).validate( field.validator );
    }

    // Add unrestricted keys to an easily accessible array
    if (!field.restricted) {
      self.keys[f] = 1;
    }
  });

  self.Schema.plugin(function(schema, options) {
    schema.pre('save', function(next) {
      this.id = new ObjectID();
      next();
    });
    schema.post('init', function(next) {
      if (!this.id) this.id = this._id;
    });
  });
  
  self.Schema.plugin(function(schema, options) {
    schema.add({ link: String });
    schema.post('init', function(next) {
      this.link = '/' + self.names.query + '/' + this.id;
    });
  });

  if (self.options.indices && self.options.indices instanceof Array) {
    self.options.indices.forEach(function(index) {
      var fields = {};

      index.fields.forEach(function(field) {
        fields[field] = 1;
      });

      var opts = {
        unique: index.unique || false
      };

      self.Schema.index(fields, opts);
    });
  }

  if (maki.resourcePlugins[ self.name ]) {
    maki.resourcePlugins[ self.name ].forEach(function(plugin) {
      self.options.plugins.push( plugin );
    });
  }

  self.options.plugins.forEach(function(plugin) {
    self.Schema.plugin( plugin );
  });

  if (!self.internal ) {
    self.Model = maki.mongoose.model( self.name , self.Schema );
    maki.models[self.name] = self.Model;
  }

  if (self.source) {

    function handleContent( err , content ) {
      if (err || !content) throw new Error( self.name + ' could not be loaded from remote: ' + self.source + ' – ' + err );
      if (!self.data) self.data = [];

      content = content.toString();

      // TODO: make this simpler.
      // 1. attempt to parse as valid JSON
      // 2. look for frontmatter
      // 3. parse markdown (?)

      if (content) {
        try {
          self.data = JSON.parse( content );
        } catch (e) {
          console.log( self.name , 'sourced content', 'json parse error', e );
        }
      }

      // transformer for imported data accessible via the `map` property
      if (typeof self.map === 'function') self.data = self.data.map( self.map );

      self.props = {};

      if (self.fields.slug) {
        self.props['slug'] = function() {
          return slugify( this[ self.fields.slug ] );
        }
      }

      self.Model.find = function( q ) {
        return {
          // TODO: implement
          limit: function() {
            return this;
          },
          exec: function( cb ) {
            Object.keys( self.props ).forEach(function(prop) {
              self.data.forEach(function( el , i ) {
                self.data[ i ][ prop ] = self.props[ prop ].apply( self.data[ i ] );
              });
            });
            
            // filter local items
            var items = _.filter(self.data, q);
            cb(null, items);
          },
          sort: function() { return this; }
        };
      };
      self.Model.findOne = function( q ) {
        return {
          exec: function( cb ) {
            Object.keys( self.props ).forEach(function(prop) {
              self.data.forEach(function( el , i ) {
                self.data[ i ][ prop ] = self.props[ prop ].apply( self.data[ i ] );
              });
            });

            // use the first match
            var item = _.filter(self.data, q)[0];
            cb(null, item);
          },
          sort: function() { return this; }
        };
      };

      var stub = function( cb ) { return cb(); };
      self.Model.save = stub;
      self.Model.update = stub;

    }

    if (typeof( self.source ) === 'function') {
      var output = JSON.stringify(self.source());
      handleContent( null , output );
    } else if ( self.source instanceof Array ) {
      handleContent( null, self.source );
    } else {
      if (!fs.existsSync(self.source) && maki.config.debug) {
        console.error('[MAKI:RESOURCE]', 'source does not exist:', self.source);
      }

      if (fs.existsSync(self.source) && handle.isDirectory()) {
        function importContent(filename) {
          var id = filename.split('.')[0];
          var content = fs.readFileSync([self.source, filename].join('/'), 'utf8');
          var doc = yaml.loadFront(content);
          
          doc.id = id;
          doc.content = content.split('---\n')[2];
          
          return doc;
        }
        
        var files = fs.readdirSync(self.source).map(importContent);

        handleContent(null, JSON.stringify(files));

      } else {
        // read file directly.  Dangerous. :)
        procure( self.source , handleContent );
      }
    }
  }

  self.components = {
    query: self.options.components.query || maki.config.service.namespace + '-' + self.names.query,
    get:   self.options.components.get || maki.config.service.namespace + '-' + self.names.get
  };

  if (!maki.suppress) {
    console.log(
      '[INFO]',
      'Resource',
      '"'+self.name+'"',
      'using human interfaces:',
      self.components
    );
  }

  var lib = __dirname + '/../../components/';
  var base = process.env.PWD + '/components/';
  
  ['query', 'get'].forEach(function(action) {
    var paths = [];
    var name = self.components[action];
    var clean = self.components[action].split('-').slice(1).join('-');

    var path = base + self.components[action] + '.jade';
    var alt = base + clean + '.jade';

    var fall = lib + self.components[action] + '.jade';
    var back = lib + clean + '.jade';
    
    paths.push(path);
    paths.push(alt);
    paths.push(fall);
    paths.push(back);

  });

  //if (self.internal || self.static) return;
  maki.resources[ self.name ] = self;
};

// TODO: dry with post
Resource.prototype.pre = function( event , binding ) {
  var self = this;
  if (!self.middlewares['pre'][ event ]) throw new Error('not a valid event');
  self.middlewares['pre'][ event ].push( binding );
  return self;
}

// TODO: dry with pre
Resource.prototype.post = function( event , binding ) {
  var self = this;
  if (!self.middlewares['post'][ event ]) throw new Error('not a valid event');
  self.middlewares['post'][ event ].push( binding );
  return self;
}

Resource.prototype.path = function( name ) {
  var self = this;

  return {
    validate: function( validator , errorString ) {
      self.Schema.path( name ).validate( validator , errorString );
    }
  }
}

Resource.prototype.query = function( q , opts , complete ) {
  if (opts instanceof Function) {
    complete = opts;
    opts = {};
  }
  var self = this;
  var Model = self.Model;

  async.waterfall([
    executePreFunctions,
    executeMethod,
    executePostFunctions
  ], function(err, instances) {
    if (err) return complete(err);
    return complete( err , instances );
  });

  function executeMethod( q , done ) {
    var limit = self.options.params.query.limit;
    var query = Model.find( q ).limit(self.options.params.query.limit || 20).sort( opts.sort || '-_id' );
    if (opts.populate) {
      if (typeof opts.populate === 'string') {
        query.deepPopulate( opts.populate );
      } else {
        query.populate( opts.populate );
      }
    }

    query.exec(function(err, collection) {
      if (err) return complete(err);
      return done( err , collection );
    });
  }

  function executePreFunctions( done ) {
    async.series( self.middlewares['pre']['query'].map(function(x) {
      return function( next ) {
        // NOTE: edited from `create`! 'doc' changed to {}
        x.apply( {} , [ next , complete ] );
      };
    }), function(err, results) {
      // NOTE: edited from `create`! 'doc' changed to null
      done( null , q );
    } );
  }
  function executePostFunctions( instances , done ) {
    async.series( self.middlewares['post']['query'].map(function(x) {
      return function( done ) {
        x.apply( instances , [ done ] );
      };
    }), function(err, results) {
      return done( null , instances );
    });
  }

}

Resource.prototype.count = function( q , opts , complete ) {
  if (opts instanceof Function) {
    complete = opts;
    opts = {};
  }
  var self = this;
  var Model = self.Model;

  async.waterfall([
    executePreFunctions,
    executeMethod,
    executePostFunctions
  ], function(err, instances) {
    if (err) return complete(err);
    return complete( err , instances );
  });

  function executeMethod( q , done ) {
    var limit = self.options.params.query.limit;
    var query = Model.count( q );

    query.exec(function(err, collection) {
      if (err) return complete(err);
      return done( err , collection );
    });
  }

  function executePreFunctions( done ) {
    async.series( self.middlewares['pre']['count'].map(function(x) {
      return function( next ) {
        // NOTE: edited from `create`! 'doc' changed to {}
        x.apply( {} , [ next , complete ] );
      };
    }), function(err, results) {
      // NOTE: edited from `create`! 'doc' changed to null
      done( null , q );
    } );
  }
  function executePostFunctions( instances , done ) {
    async.series( self.middlewares['post']['count'].map(function(x) {
      return function( done ) {
        x.apply( instances , [ done ] );
      };
    }), function(err, results) {
      return done( null , instances );
    });
  }

}

// get a SINGLE instance of this resource, based on req.param('id')
Resource.prototype.get = function( q , opts , complete ) {
  if (opts instanceof Function) {
    complete = opts;
    opts = {};
  }
  var self = this;
  var Model = self.Model;

  async.waterfall([
    executePreFunctions,
    executeMethod,
    executePostFunctions
  ], function(err, instances) {
    if (err) return complete(err);
    return complete( err , instances );
  });

  function executeMethod( q , done ) {
    var query = Model.findOne( q ).sort( opts.sort || '-_id' );

    if (opts.populate instanceof String) {
      query.populate( opts.populate.path );
    }

    if (opts.populate instanceof Array) {
      opts.populate.forEach(function(field) {
        if (field.fields) {
          query.populate( field.path , field.fields );
        } else {
          query.populate( field.path );
        }
      });
    }

    query.exec(function(err, doc) {
      if (err) return complete(err);
      return done( err , doc );
    });
  }

  function executePreFunctions( done ) {
    async.series( self.middlewares['pre']['get'].map(function(x) {
      return function( next ) {
        // NOTE: edited from `create`! 'doc' changed to {}
        x.apply( {} , [ next , complete ] );
      };
    }), function(err, results) {
      // NOTE: edited from `create`! 'doc' changed to null
      done( null , q );
    } );
  }
  function executePostFunctions( doc , done ) {
    async.series( self.middlewares['post']['get'].map(function(x) {
      return function( done ) {
        x.apply( doc , [ done ] );
      };
    }), function(err, results) {
      return done( null , doc );
    });
  }

}

Resource.prototype.create = function( doc , opts , complete ) {
  var self = this;
  if (typeof( opts ) === 'function') var complete = opts;
  if (!complete) var complete = new Function();
  if (self.options.static) return complete();

  var Model = self.Model;

  async.waterfall([
    checkForDuplicates,
    executePreFunctions,
    executeMethod,
    executePostFunctions
  ], function(err, instance) {
    self.emit('create', instance );
    return complete( err , instance );
  });

  function executeMethod( doc , done ) {
    var instance = new Model( doc );
    instance.save(function(err) {
      if (err) return complete(err);

      if (opts.populate instanceof String) {
        return instance.populate( opts.populate , done );
      }

      if (opts.populate instanceof Array) {
        return opts.populate.forEach(function(field) {
          if (field.fields) {
            instance.populate( field , done );
          } else {
            instance.populate( field , done );
          }
        });
      }

      return done( null , instance );
    });
  }

  function checkForDuplicates( done ) {
    var query = {};
    query[ self.fields.id ] = doc[ self.fields.id ];
    // disallow creation of documents with the same identifier field
    // find one based on our query, and return it if it exists
    Model.findOne( query ).exec(function(err, instance) {
      if (err) return complete(err);
      if (instance) {
        return complete( err , instance );
      }
      return done( null );
    });
  }
  function executePreFunctions( done ) {
    async.series( self.middlewares['pre']['create'].map(function(x) {
      return function( next ) {
        x.apply( doc , [ next , complete ] );
      };
    }), function(err, results) {
      done( null , doc );
    } );
  }
  function executePostFunctions( instance , done ) {
    async.series( self.middlewares['post']['create'].map(function(x) {
      return function( done ) {
        x.apply( instance , [ done ] );
      };
    }), function(err, results) {
      return done( null , instance );
    });
  }

}

Resource.prototype.count = function(query, complete) {
  var self = this;
  var Model = self.Model;
  Model.count(query, complete);
}

Resource.prototype.patch = function( query , params, complete ) {
  var self = this;
  if (!complete) var complete = new Function();
  if (!query) return complete('no query');
  if (self.options.static) return complete();

  var Model = self.Model;

  async.waterfall([
    executePreFunctions,
    executeMethod,
    executePostFunctions
  ], function(err, instance) {
    // TODO: consider offering a changeset.
    //self.emit('update', instance );
    // TODO: explore this particular concept of event emission.
    //self.emit('patch', query , instance , complete );
    return complete( err , instance );
  });

  function executeMethod( doc , done ) {
    Model.find( query ).exec(function(err, list) {
      if (err) return complete( err );
      if (!list) return complete( 404 );

      async.map(list, function(doc, next) {
        doc.patch( params , function(err) {
          if (err) return next(err);
          return next(err, doc);
        });
      }, done);
    });
  }
  function executePreFunctions( done ) {
    async.series( self.middlewares['pre']['patch'].map(function(x) {
      return function( next ) {
        x.apply({}, [ next , complete ] );
      };
    }), function(err, results) {
      // NOTE: edited from `create`! 'doc' changed to null
      done( null , null );
    } );
  }
  function executePostFunctions( instance , done ) {
    async.series( self.middlewares['post']['patch'].map(function(x) {
      return function( done ) {
        x.apply( instance , [ done ] );
      };
    }), function(err, results) {
      return done( null , instance );
    });
  }

};

Resource.prototype.update = function( query , params , complete ) {
  var self = this;
  //console.log('update()', self.name , self.options.static , query , params );
  if (self.options.static) return complete();
  if (!complete) var complete = new Function();
  if (!query) return complete('no query');

  var Model = self.Model;

  async.waterfall([
    executePreFunctions,
    executeMethod,
    executePostFunctions
  ], function(err, instance) {
    // TODO: consider offering a changeset.
    //self.emit('update', instance );
    return complete( err , instance );
  });

  function executeMethod( params , done ) {
    Model.findOne( query ).exec(function(err, doc) {
      if (err) return complete( err );
      if (!doc) return complete( 404 );

      // TODO: understand a little more about why this is needed,
      // how does doc get updated after it's been cast to an object?
      // why doesn't it work without the `toObject()`?
      var base = doc.toObject();
      var observer = jsonpatch.observe( base );
      _.assign( base , params );

      var patches = jsonpatch.generate( observer );

      self.patch( query , patches , function(err, doc) {
        if (err) console.error(err);
        // TODO: consider offering a changeset.
        //self.emit('update', doc );
        complete( err , doc );
      });
    });
  }
  function executePreFunctions( done ) {
    async.series( self.middlewares['pre']['update'].map(function(x) {
      return function( next ) {
        x.apply( params , [ next , complete ] );
      };
    }), function(err, results) {
      done( null , params );
    } );
  }
  function executePostFunctions( instance , done ) {
    async.series( self.middlewares['post']['update'].map(function(x) {
      return function( done ) {
        x.apply( instance , [ done ] );
      };
    }), function(err, results) {
      return done( null , instance );
    });
  }

}

Resource.prototype.destroy = function( q, complete ) {
  var self = this;
  if (self.options.static) return complete();

  var Model = self.Model;

  Model.remove( q , function(err, num) {
    console.log('remove', q , 'generated', err , 'and' , num );
    complete( err );
  });

  return;

}

module.exports = Resource;
