module.exports = {
  list: function(req, res, next) {
    People.find().exec( res.provide );
  },
  view: function(req, res, next) {
    People.findOne({ slug: req.param('usernameSlug') }).exec( res.provide );
  }
}