var patch = require('fast-json-patch');

module.exports = exports = function( schema , options ) {
  if (!options) var options = {};
  if (!options.maki) throw 'Maki not provided for '+schema+' hooks plugin';
  
  schema.pre('save', function (next) {
    this.meta = {};

    this.meta.wasNew      = this.isNew;
    this.meta.wasModified = this.isModified();

    // test
    if (this.meta.wasModified) {
      this.meta.modifiedPaths = this.modifiedPaths();
      this.meta.old = this.toObject();
    }

    next();
  })

  // TODO: this feels messy, so we should re-evaluate the generation of patches
  // as it's unclear what the overhead of an observer is, whether native or not.
  schema.post('save', function(doc) {
    if (doc.meta.wasNew) {
      console.log('WAS NEW');

      // stub the pre-condition as an empty set
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
      console.log('MODIFIED:' , doc.meta.modifiedPaths );

      var observer = patch.observe( doc.meta.old );

      // generate our patch set from the doc
      var patches = patch.generate( observer );
      // publish the patch set
      
      // TODO: utilize schema's `id: true` field
      var id = doc._id;
      
      options.maki.redis.publish( options.resource.routes.query + '/' + id , JSON.stringify(patches) );

    }
  });

}
