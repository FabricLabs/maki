'use strict';

var express = require('express');
var _ = require('lodash');
var functionize = require('functionize');
var Model = require('./model');

/**
 * Represents a RESTful API powered by Restifier.
 *
 * @class
 */
function RestAPI() {
  this.models = {};
  this.router = express.Router();
  this.router.use(require('res-error')({
    log: false
  }));
}

/**
 * Gateway function that can add model(s) or return initialization
 * middleware depending on the arguments passed to it.
 *
 * @returns {Model|Function} A model or middleware depending on the arguments.
 * * `setup()` - Returns `this.router`
 * * `setup(mong)` - Returns `model(mong)`
 * * `setup(mong1, mong2)` - Returns `modelsMiddleware(mong1, mong2)`
 */
RestAPI.prototype.setup = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  if (args.length > 1) {
    return this.modelsMiddleware(args);
  }

  if (args.length === 0 || !args[0].schema) {
    return this.router;
  }
  return this.model(args[0]);
};

/**
 * Creates a setup function for this RestAPI.
 */
RestAPI.prototype.asFunction = function() {
  return functionize(this, this.setup);
};

/**
 * Applies middleware to this RestAPI. Uses express.Router#use.
 *
 * @returns {RestAPI} This RestAPI.
 */
RestAPI.prototype.use = function() {
  this.router.use.apply(this.router, arguments);
  return this;
};

/**
 * Should be called after the app has been created.
 *
 * @returns {Function} Express middleware
 */
RestAPI.prototype.finish = function() {
  return function(req, res, next) {
    return res.error(404, 'Path not found.');
  };
};

/**
 * Adds a model to this RestAPI.
 *
 * @param {mongoose.Model} mong The mongoose model
 */
RestAPI.prototype.model = function(mong) {
  var m = new Model(this, mong);
  this.models[mong.modelName] = m;
  return m;
};

/**
 * Adds multiple models to this RestAPI.
 *
 * @param {mongoose.Model[]} mongs The mongoose models
 */
RestAPI.prototype.addModels = function(mongs) {
  return _.map(mongs, function(mong) {
    return this.model(mong);
  }, this);
};

/**
 * Creates a middleware out of multiple models.
 *
 * @param {mongoose.Model[]} mongs The mongoose models
 */
RestAPI.prototype.modelsMiddleware = function(mongs) {
  var router = express.Router();
  _.forEach(this.addModels(mongs), function(model) {
    model.serve(router);
  });
  return router;
};

/**
 * Creates middleware that encompasses all registered models.
 * This is equivalent to calling `model.middleware()` for each
 * individual model, plus calling `restifier.initialize()` and
 * `restifier.finish()`.
 *
 * @returns {Router} Returns an Express router containing all middlewares.
 */
RestAPI.prototype.middleware = function() {
  var self = this;
  
  var router = express.Router();
  router.use(this.router);
  
  router.use( require('provide') );
  
  _.forEach(this.models, function(model) {
    
    var middleware = model.middleware();
    var regii = middleware.stack.map(function(x) { return x.regexp; }) ;

    regii.forEach(function(r) {
      self.maki.routes[ r.toString() ] = model.model.modelName;
    });
 
    self.maki.resources[ model.model.modelName ].regii = regii;
    
    
    router.use( middleware );
    _.forEach(model.submodels, function(submodel) {
      router.use(submodel.middleware());
    });
  });
  router.use(this.finish());
  return router;
};

RestAPI.prototype.attach = function( maki ) {
  var self = this;
  self.maki = maki;
}

/**
 * The main function. Wraps {@link RestAPI#setup}.
 *
 * @global
 * @see RestAPI#setup
 */
var restifier = module.exports = (new RestAPI()).asFunction();

/**
 * Factory function to create a new {@link RestAPI}.
 *
 * @name restifier.api
 * @global
 * @see RestAPI
 *
 * @returns RestAPI A new RestAPI.
 */
restifier.api = function() {
  return new RestAPI();
};
