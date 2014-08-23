var util = require('util');
var pluralize = require('pluralize');
var pathToRegex = require('path-to-regexp');

var mongoose = require('mongoose');

var Resource = function( name , options ) {
  var self = this;
  
  if (!options) var options = { paths: {}, routes: {} };
  if (!options.paths) options.paths = {};
  if (!options.routes) options.routes = {};
  if (!options.templates) options.templates = {};

  self.name = name;
  self.plural = pluralize( self.name );
  self.options = options.options;

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
  
  self.Schema = new mongoose.Schema( options.attributes );
  self.Model = mongoose.model( self.name , self.Schema );
  
  if (options.internal) return;

  self.routes = {
    query:   options.routes.query   || '/' + collectionName ,
    get:     options.routes.get     || '/' + collectionName + '/:id',
    create:  options.routes.create  || '/' + collectionName ,
    update:  options.routes.update  || '/' + collectionName + '/:id',
    destroy: options.routes.destroy || '/' + collectionName + '/:id'
  };
  
  self.paths = {
    query:   options.paths.query   || pathToRegex( self.routes.query ),
    get:     options.paths.get     || pathToRegex( self.routes.get ),
    create:  options.paths.create  || pathToRegex( self.routes.create ),
    update:  options.paths.update  || pathToRegex( self.routes.update ),
    destroy: options.paths.destroy || pathToRegex( self.routes.destroy )
  };
  
  self.templates = {
    query:  options.templates.query  || collectionName,
    get:    options.templates.get    || nameLower,
    create: options.templates.create || nameLower + '-create',
    update: options.templates.update || nameLower + '-update'
  }

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
      //req.template = self.templates.query;
      res.provide( self.name , docs );
    });
  }
}

Resource.prototype.get = function() {
  var self = this;
  var Model = self.Model;

  return function(req, res) {
    res.provide( self.name , {
      
    });
  }
}

Resource.prototype.create = function() {
  var self = this;
  var Model = self.Model;

  return function(req, res) {
    var instance = new Model( req.body );
    instance.save(function(err) {
      res.provide( self.name , instance );
    });
  }
}

Resource.prototype.update = function() {
  var self = this;
  var Model = self.Model;
  
  return function(req, res) {
    res.provide( self.name , {
      
    });
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
