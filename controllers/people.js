module.exports = {
  list: function(req, res, next) {
    People.find().exec(function(err, people) {
      res.provide( err, people , {
        template: 'people'
      });
    });
  },
  view: function(req, res, next) {
    People.findOne({ slug: req.param('usernameSlug') }).exec( res.provide );
  }
}