module.exports = {
  list: function(req, res, next) {
    People.find().exec(function(err, people) {
      res.provide( 'people', {
        people: people
      });
    });
  },
  view: function(req, res, next) {
    People.findOne({ slug: req.param('usernameSlug') }).exec(function(err, person) {
      if (err || !person) { return next(); }
      res.provide( 'person', {
        person: person
      });
    });
  }
}
