var util = require('util');
var pluralize = require('pluralize');
var pathToRegex = require('path-to-regexp');
var _ = require('lodash');


var mongoose = require('mongoose');

var Resource = function( name , options ) {
  var self = this;
  
  if (!name)  throw new Error('Some configuration is required to create a Resource');
  if (!options) var options = name;

  if (!options.paths) options.paths = {};
  if (!options.routes) options.routes = {};
  if (!options.methods) options.methods = {};
  if (!options.templates) options.templates = {};
  if (!options.plugins) options.plugins = [];
  if (!options.requires) options.requires = [];

  self.name = name;
  self.plural = pluralize( self.name );
  self.options = options;
  self.keys = {'_id': 0};

  var nameLower      = self.name.toLowerCase();
  var collectionName = self.plural.toLowerCase();
  self.collection    = collectionName;

  self.synopsis    = options.synopsis    || 'Resource.';
  self.description = options.description || 'A Resource available on this server.';
  self.template    = options.template    || nameLower;
  
  self.routes = { query: '/' };
  self.paths = { query: new RegExp( self.routes.query ) };
  self.methods = {};
  self.verbs = {};
  self.names = {
    query: self.collection,
    get: nameLower
  };
  self.templates = {
    query: options.templates.query || (options.singular) ? nameLower : collectionName,
    get:   options.templates.get   || nameLower
  };
  self.requires = options.requires;
  
  self.fields = {
    id: '_id',
    name: '_id'
  };
  
  // internal resources should now be complete! return!
  if (options.internal) return;
    
  // public resources (non-internal) must have some attributes.
  // or not.
  // if (!options.attributes) throw new Error('Resources must have attributes.');
  if (!options.attributes) options.attributes = {};

  // determine which field to use in the path (defaults to _id)
  Object.keys( options.attributes ).forEach(function( f ) {
    if ( options.attributes[ f ].id === true ) {
      self.fields.id = f;
      delete self.keys._id; //Remove the _id field from white-list
    }
    if ( options.attributes[ f ].name === true ) {
      self.fields.name = f;
    }
  });

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
    query:  options.templates.query  || collectionName,
    get:    options.templates.get    || nameLower,
    create: options.templates.create || nameLower + '-create',
    update: options.templates.update || nameLower + '-update'
  };

}

util.inherits( Resource , require('events').EventEmitter );

Resource.prototype.attach = function( maki ) {
  var self = this;
  
  self.Schema = new mongoose.Schema( self.options.attributes );
  self.options.attributes.__v = { restricted: true };
  
  self.Schema.plugin( require('maki-mongoose-hooks') , {
    maki: maki, // <- le sigh.  can we do this another way?
    resource: self
  });
  
  Object.keys( self.options.methods ).forEach(function( name ) {
    self.Schema.methods[ name ] = self.options.methods[ name ]; 
  });
  
  Object.keys( self.options.attributes ).forEach(function( f ) {
    var field = self.options.attributes[ f ];
    
    if ( field.slug === true ) {
      self.fields.id = f;
      self.Schema.plugin( require('mongoose-slug')( f , {
        unique: true
      }) );
      
      if (self.fields.name === '_id') {
        self.fields.name = f;
      }
    }
    
    if ( field.validator ) {
      self.path( f ).validate( field.validator );
    }
    
    // Add unrestricted keys to an easily accessible array
    if (!field.restricted) {
      self.keys[f] = 1;
    }
    
  });
  
  self.options.plugins.forEach(function(plugin) {
    self.Schema.plugin( plugin );
  });
  
  self.Model = mongoose.model( self.name , self.Schema );
  
  maki.resources[ self.name ] = self;
}

Resource.prototype.as = function( facade ) {
  var self = this;
  
  return {
    get: function( path , params , done ) {
      self.
    }
  }
  
  return self;
}

// TODO: dry with post
Resource.prototype.pre = function( event , binding ) {
  var self = this;
  
  // TODO: use maki-specific bindings
  var supportedEvents = ['init', 'validate', 'save', 'remove'];
  if ( supportedEvents.indexOf( event ) < 0 ) throw new Error('not a valid event');
  
  self.Schema.pre( event , true , function( next , done ) {
    var self = this;
    binding.apply( self, [ function() {
      next();
      done();
    } ] );
  });
}

// TODO: dry with pre
Resource.prototype.post = function( event , binding ) {
  var self = this;
  
  // TODO: use maki-specific bindings
  var supportedEvents = ['init', 'validate', 'save', 'remove'];
  if ( supportedEvents.indexOf( event ) < 0 ) throw new Error('not a valid event');
  
  self.Schema.post( event , function( doc ) {
    var self = this;
    binding.apply( self, [ doc , function(err) {
      if (err) console.log(err);
    } ] );
  });
}

Resource.prototype.path = function( name ) {
  var self = this;
  
  return {
    validate: function( validator , errorString ) {
      self.Schema.path( name ).validate( validator , errorString );
    }
  }
}

Resource.prototype.options = function( complete ) {
  complete({});
}

Resource.prototype.query = function(  ) {
  var self = this;
  var Model = self.Model;
  
  if (!complete) var complete = new Function();
  
  console.log('query, ' , q , self.name );
  console.log( self.options.static );
  if (self.options.static) return complete( null , {} );

  Model.find( q ).sort('-_id').exec(function(err, collection) {
    if (err) return complete(err);
    return complete( err , collection );
  });
}

// get a SINGLE instance of this resource, based on req.param('id')
Resource.prototype.get = function( path , params , complete ) {
  var self = this;
  if (!path) return complete('no path');
  if (typeof params === 'function' || !complete) {
    var complete = new Function();
    var params = {};
  }
  
  var Model = self.Model;
  var method = Model.query;
  
  if (params.single) 

  if (q) {
    Model.findOne( q ).exec(function(err, doc) {
      if (err) return complete(err);
      return complete( err , doc );
    });
  } else {
    return function(req, res) {
      var query = Model.findOne();
      
      query.where( self.fields.id ).equals( req.param('id') );
      
      query.exec(function(err, doc) {
        if (err) return res.error( err );
        if (!doc) return res.error( 404 );
        res.provide( self.name , doc );
      });

    }
  }

}

Resource.prototype.create = function( doc , complete ) {
  var self = this;
  var Model = self.Model;  
  // TODO: query pipeline
  
  console.log('create() called, ' , doc );

  if (doc) {
    if (!complete) var complete = new Function();
    Model.findOne( doc ).exec(function(err, instance) {
      if (err) return complete(err);
      if (instance) return complete( err , instance );
      var instance = new Model( doc );
      instance.save(function(err) {
        self.emit('create', doc );
        complete( err , instance );
      });
    });
  } else {
    // TODO: query pipeline
    var query = Model.findOne();
    return function(req, res) {
      
      console.log('create middleware')

      var proposal = _.transform( req.body , function(res, v, k) {
        if (v) res[k] = v;
      });

      if (proposal[ self.fields.id ]) {
        query.where( self.fields.id ).equals( proposal[ self.fields.id ] );
      } else {
        query.where( self.fields.id ).equals( null );
      }

      query.exec(function(err, doc) {
        if (err) return res.error( 400 , err);
        if (doc) return self.emit('collected', doc );

        var instance = new Model( proposal );
        instance.save(function(err) {
          if (err) {
            var code = 400;
            return res.error( code , err );
          }
            
          Model.findOne({ _id: instance._id }).exec(function(err, realDoc) {
            if (err) return res.error( err );
            var doc = realDoc; // overrides handlers (see above)
            self.emit('create', realDoc );
            self.emit('collected', realDoc );
          });
        });
      });
    }
  }
}

Resource.prototype.update = function() {
  var self = this;
  var Model = self.Model;
  
  return function(req, res) {
    var query = {};
    query[ self.fields.id ] = req.param('id');
    
    Model.findOne( query ).exec(function(err, doc) {
      if (err) return res.error( err );
      if (!doc) return res.error( 404 );
      
      // TODO: deep object merge
      for (var prop in req.body) {
        doc[ prop ] = req.body[ prop ];
      }
      
      doc.save(function(err) {
        // TODO: consider offering a changeset.
        self.emit('update', doc );
        res.provide( self.name , doc );
      });
      
    });
    
    // TODO: validation, permissions, etc.
    /*/Model.findOneAndUpdate( query , {
      $set: req.body
    } , function(err, doc) {
      doc.save();
      res.provide( self.name , doc );
    });/**/
  }
}

Resource.prototype.destroy = function() {
  var self = this;
  var Model = self.Model;

  return function(req, res) {
    res.provide( self.name , {
      
    });
  }
}

module.exports = Resource;
