var util = require('util');
var pluralize = require('pluralize');
var pathToRegex = require('path-to-regexp');

var mongoose = require('mongoose');
var preston = require('preston');

var Resource = function( name , options ) {
  var self = this;

  self.name     = name;
  
  self.schema   = new mongoose.Schema( options.attributes );
  self.model    = mongoose.model( name , self.schema );

  /*/this.name = name;
  this.path = options.path || '/' + pluralize( name );
  this.regex = pathToRegex( this.path );
  this.synopsis = options.synopsis || 'Resource.';
  this.description = options.description || 'A Resource available on this server.';
  this.template = options.template || name;

  // operators
  this.head   = options.head  ;
  this.get    = options.get   ;
  this.put    = options.put   ;
  this.post   = options.post  ;
  this.patch  = options.patch ;
  this.delete = options.delete;

  this.options = options.options;/*/
  
}

util.inherits( Resource , require('events').EventEmitter );

Resource.prototype.attach = function( maki ) {
  var self = this;
  maki.resources[ self.name ] = self;
}

module.exports = Resource;
