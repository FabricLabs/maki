var util = require('util');
var pluralize = require('pluralize');
var pathToRegex = require('path-to-regexp');

var mongoose = require('mongoose');
var preston = require('preston');

var Resource = function( name , options ) {
  var self = this;

  self.name = name;
  self.path = options.path || '/' + pluralize( name.toLowerCase() );
  self.regex = pathToRegex( self.path );
  self.synopsis = options.synopsis || 'Resource.';
  self.description = options.description || 'A Resource available on this server.';
  self.template = options.template || name;

  // operators
  self.head   = options.head  ;
  self.get    = options.get   ;
  self.put    = options.put   ;
  self.post   = options.post  ;
  self.patch  = options.patch ;
  self.delete = options.delete;

  self.options = options.options;
  
}

util.inherits( Resource , require('events').EventEmitter );

Resource.prototype.attach = function( maki ) {
  var self = this;
  maki.resources[ self.name ] = self;
}

module.exports = Resource;
