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
    name: 'Person',
    attributes: {
      username: { type: String , max: 80 },
      slug: { type: String , max: 80 , id: true },
      password: { type: String , restricted: true }
    },
    plugins: [ [  ] ]
  }/*/
];

// TODO: hooks for all the schemas
//var PersonSchema = require('../app/models/User');
// TODO: is there a way, without globals (?), to not require passing maki?
//maki.app.models.Person = Person = mongoose.model('Person', PersonSchema);

resources.forEach(function(resource) {
  maki.define( resource.name , resource );
});

maki.start();
