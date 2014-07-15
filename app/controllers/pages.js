module.exports = {
  index: function(req, res, next) {
    res.provide('index');
  },
  examples: function(req, res, next) {
    require('fs').readFile('data/examples.json', function(err, data) {
      res.provide( 'examples', {
        examples: JSON.parse(data)
      });
    });
  }
}
