var Monq = require('monq');

var Queue = function( config ) {
  var self = this;

  self._monq = Monq('mongodb://localhost:27017/' + config.database.name );
  self._jobs = self._monq.queue( config.database.name );

  self.Worker = function( dbName ) {
    var me = this;
    if (typeof(dbName) === 'string') var dbName = [ dbName ];

    console.log(dbName);
    console.log(typeof(dbName) );

    me._worker = self._monq.worker( dbName );
  };

  self.Worker.prototype.register = function( processors ) {
    var me = this;
    me._worker.register( processors );
  }

  self.Worker.prototype.start = function() {
    var me = this;
    me._worker.start();
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
