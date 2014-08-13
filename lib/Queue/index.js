var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Monq = require('monq');

var Queue = function( config ) {
  var self = this;

  self._monq = Monq('mongodb://localhost:27017/' + config.database.name );
  self._jobs = self._monq.queue( config.database.name );

  self.Worker = function( dbName ) {
    var me = this;
    if (typeof(dbName) === 'string') var dbName = [ dbName ];

    me._worker = self._monq.worker( dbName );

    // TODO: consider attaching only on start?
    me._worker.on('dequeued', function (data) {
      me.emit( 'dequeued', data );
    });
    me._worker.on('failed', function (data) {
      me.emit( 'failed' , data );
    });
    me._worker.on('complete', function (data) {
      me.emit( 'complete' , data );
    });
    me._worker.on('error', function (err) {
      me.emit( 'error' , err );
    });

  };

  util.inherits( self.Worker , EventEmitter );

  self.Worker.prototype.register = function( processors ) {
    this._worker.register( processors );
  }

  self.Worker.prototype.start = function() {
    this._worker.start();
  }

};

Queue.prototype.enqueue = function( type , data , cb ) {
  this._jobs.enqueue( type , data , cb );
};

Queue.prototype.bind = function( app ) {
  app._jobs = this._monq;

  return app;
};

module.exports = Queue;
