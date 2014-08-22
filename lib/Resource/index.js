var util = require('util');
var pluralize = require('pluralize');
var pathToRegex = require('path-to-regexp');

var mongoose = require('mongoose');

var Resource = function( name , options ) {
  var self = this;
  
  if (!options) var options = { paths: {}, routes: {} };
  if (!options.paths) options.paths = {};
  if (!options.routes) options.routes = {};

  self.name = name;
  self.plural = pluralize( self.name );
  self.options = options.options;

  var nameLower      = self.name.toLowerCase();
  var collectionName = self.plural.toLowerCase();

  self.synopsis    = options.synopsis    || 'Resource.';
  self.description = options.description || 'A Resource available on this server.';
  self.template    = options.template    || nameLower;
  
  self.routes = { query: '/' };
  self.paths = { query: new RegExp( self.routes.query ) };
  
  self.Schema = new mongoose.Schema( options.attributes );
  self.Model = mongoose.model( self.name , self.Schema );
  
  if (options.internal) return;

  self.routes = {
    query:   options.routes.query   || '/' + collectionName ,
    create:  options.routes.create  || '/' + collectionName ,
    get:     options.routes.get     || '/' + collectionName + '/:id',
    update:  options.routes.update  || '/' + collectionName + '/:id',
    destroy: options.routes.destroy || '/' + collectionName + '/:id'
  };
  
  self.paths = {
    query:   options.paths.query   || pathToRegex( self.routes.query ),
    create:  options.paths.create  || pathToRegex( self.routes.create ),
    get:     options.paths.get     || pathToRegex( self.routes.get ),
    update:  options.paths.update  || pathToRegex( self.routes.update ),
    destroy: options.paths.destroy || pathToRegex( self.routes.destroy )
  };

}

util.inherits( Resource , require('events').EventEmitter );

Resource.prototype.attach = function( maki ) {
  var self = this;
  maki.resources[ self.name ] = self;
}

Resource.prototype.query = function() {
  var self = this;

  var Model = self.Model;
  return function(req, res) {
    var query = Model.find();
    
    query.exec(function(err, docs) {
      res.provide( self.name , {
        
      });
    });
  }
}

Resource.prototype.get = function() {
  return function(req, res) {
    res.provide( self.name , {
      
    });
  }
}

Resource.prototype.create = function() {
  return function(req, res) {
    res.provide( self.name , {
      
    });
  }
}

Resource.prototype.update = function() {
  return function(req, res) {
    res.provide( self.name , {
      
    });
  }
}

Resource.prototype.destroy = function() {
  return function(req, res) {
    res.provide( self.name , {
      
    });
  }
}

module.exports = Resource;
