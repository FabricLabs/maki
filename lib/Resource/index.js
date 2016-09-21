var fs = require('fs');
var util = require('util');
var pluralize = require('pluralize');
var pathToRegex = require('path-to-regexp');

var procure = require('procure');
var slugify = require('speakingurl');
var jsonpatch = require('fast-json-patch');

var _ = require('lodash');
var async = require('async');

var ObjectId = require('mongoose').SchemaTypes.ObjectId;

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
  if (!options.attributes) options.attributes = {};
  if (!options.names) options.names = {};

  self.name = name;
  self.plural = pluralize( self.name );
  self.internal = options.internal || false;
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
  self.description = options.description || 'A Resource available on this server.';
  self.template    = options.template    || nameLower;
  self.templates   = options.templates;

  self.routes = {};
  self.paths = { query: new RegExp( self.routes.query ) };
  self.methods = {};
  self.verbs = {};
  self.names = _.defaults( self.options.names , {
    query:  self.collection,
    get:    nameLower,
    create: nameLower
  });

  if (!self.templates.query) self.templates.query = options.template || (options.singular) ? nameLower : collectionName;
  if (!self.templates.get) self.templates.get = options.template || nameLower;

  if (self.options.routes) self.routes = _.merge( self.routes , self.options.routes );

  self.fields = {
    id: '_id',
    name: '_id',
    slug: '_id'
  };

  self.requires = options.requires;
  self.handlers = options.handlers;

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
      destroy: []
    },
    post: {
      query:   [],
      get:     [],
      create:  [],
      update:  [],
      patch:   [], // TODO: alias for update?
      destroy: []
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

    if ( field.slug === true ) {
      self.fields.id = 'slug';
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

  if (!self.internal) {
    self.Model = maki.mongoose.model( self.name , self.Schema );
  }

  if (self.source) {

    function handleContent( err , content ) {
      if (err || !content) throw new Error( self.name + ' could not be loaded from remote: ' + self.source + ' – ' + err );
      if (!self.data) self.data = [];

      content = content.toString();

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
          exec: function( cb ) {
            Object.keys( self.props ).forEach(function(prop) {
              self.data.forEach(function( el , i ) {
                self.data[ i ][ prop ] = self.props[ prop ].apply( self.data[ i ] );
              });
            });
            cb( null , self.data );
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
            var item = _.findWhere( self.data , q );
            cb( null , item );
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
      procure( self.source , handleContent );
    }
  }

  self.components = {
    query: self.options.components.query || maki.config.service.namespace + '-' + self.names.query,
    get:   self.options.components.get || maki.config.service.namespace + '-' + self.names.get
  };

  var lib = __dirname + '/../../components/';
  var base = process.env.PWD + '/components/';
  ['query', 'get'].forEach(function(action) {
    var name = self.components[action]
      .replace(maki.config.service.namespace+'-', '')
      .replace('maki-', '');

    var path = base + self.components[action] + '.jade';
    var alt = base + name + '.jade';

    var fall = lib + self.components[action] + '.jade';
    var back = lib + name + '.jade';

    if (!fs.existsSync(path) && !fs.existsSync(alt) && !fs.existsSync(fall) && !fs.existsSync(back)) {
      console.log('neither exist, defaulting');
      self.components[action] = 'maki-collection';
    }
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
    var query = Model.find( q ).sort( opts.sort || '-_id' );
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
