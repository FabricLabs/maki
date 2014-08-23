var config = require('./config');

var Maki = require('./lib/Maki');
var maki = new Maki( config );

// TODO: build a middleware chain for resources
maki.app.post('/login', maki.passport.authenticate('local'), function(req, res) {
  res.redirect('/');
});

maki.app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});
  
var resources = [
  {
    name: 'Example',
    attributes: {
      name: { type: String , max: 80 },
      slug: { type: String , max: 80 , id: true },
      content: { type: String }
    }
  }/*/,
  {
    name: 'Example',
    attributes: {
      name: { type: String , max: 80 },
      slug: { type: String , max: 80 , id: true },
      content: { type: String }
    }
  }/*/
];

resources.forEach(function(resource) {
  maki.define( resource.name , resource );
});

maki.start();
