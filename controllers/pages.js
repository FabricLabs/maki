module.exports = {
  examples: function(req, res, next) {
    require('fs').readFile('examples.json', function(err, data) {
      res.provide(  err, JSON.parse(data) , {
        template: 'examples'
      });
    });
  }
}