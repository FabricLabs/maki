var endpoints = {
  register: function( endpoint ) {
    
  }
}

module.exports = {
  examples: function(req, res, next) {
    require('fs').readFile('examples.json', function(err, data) {
      res.provide( 'examples', {
        examples: JSON.parse(data)
      });
    });
  }
}
