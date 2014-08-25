var patch = require('fast-json-patch');

module.exports = exports = function( schema , options ) {
  if (!options) var options = {};
  if (!options.maki) throw 'Maki not provided for '+schema+' hooks plugin';
  
  // TODO: this feels messy, so we should re-evaluate the generation of patches
  // as it's unclear what the overhead of an observer is, whether native or not.
  schema.post('init', function() {
    this.meta = {};
    this.meta.old = this.toObject();
  });
  
  schema.pre('save', function (next) {
    if (!this.meta) this.meta = {};
    
    this.meta.wasNew      = this.isNew;
    this.meta.wasModified = this.isModified();

    // test
    if (this.meta.wasModified) {
      this.meta.modifiedPaths = this.modifiedPaths();
    }

    next();
  });

  schema.post('save', function(doc) {
    if (!this.meta) this.meta = {};
    
    if (doc.meta.wasNew) {
      // stub the pre-condition as an empty set
      // TODO: evaluate 
      var collection = [];
      // observe the empty set
      var observer = patch.observe( collection );
      // add our "new" doc
      collection.push( doc );
      // generate our patch set from the stub
      var patches = patch.generate( observer );
      // publish the patch set
      options.maki.redis.publish( options.resource.routes.query , JSON.stringify(patches) );
      
    } else if (doc.meta.wasModified) {
      // generate our patch set from the doc
      var patches = patch.compare( doc.meta.old , doc.toObject() );
      // publish the patch set
      var id = doc[ options.resource.fields.id ];
      var channel = options.resource.routes.query + '/' + id;
      // publish changes to the cluster
      options.maki.redis.publish( channel , JSON.stringify(patches) );
    }
  });

}
