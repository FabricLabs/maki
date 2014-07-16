module.exports = {
  index: function(req, res, next) {
    res.provide('index');
  },
  create: function(req, res, next) {

    // dummy page model
    var page = req.body;

    // create empty pages array, then observe it.
    var pages = [];
    var observer = patch.observe( pages );
    
    // modify empty array, so we have an event
    pages.push( page );

    // generate our patch set
    var patches = patch.generate( observer );

    // publish the patch set
    req.app.redis.publish('/pages', JSON.stringify(patches) );

    // provide the subsequent resource
    // TODO: do sooner (before observing changes)? test this.
    res.provide('page', {
      page: page
    });
  },
  list: function(req, res, next) {
    require('fs').readFile('data/examples.json', function(err, data) {
      res.provide( 'examples', {
        examples: JSON.parse(data)
      });
    });
  }
}
