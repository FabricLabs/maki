var config = require('./config');

var Maki = require('./lib/Maki');
var maki = new Maki( config );

var resources = [
  {
    name: 'Page',
    template: 'Pages',
    attributes: {
      name: { type: String , max: 80 },
      slug: { type: String , max: 80 , id: true },
      content: { type: String }
    }
  }
];

resources.forEach(function(resource) {
  maki.define( resource.name , resource );
});

// TODO: build a middleware chain for resources
maki.app.post('/login', maki.passport.authenticate('local'), function(req, res) {
  res.redirect('/');
});

maki.start();


var resources = [
  {
    name: 'index',
    path: '/',
    template: 'index',
    get: pages.index
  },
  { 
    name: 'registrationForm',
    path: '/register',
    template: 'register',
    get: people.forms.register
  },
  { 
    name: 'loginForm',
    path: '/login',
    template: 'login',
    get: people.forms.login
  },
  {
    name: 'destroySession',
    path: '/logout',
    template: 'index',
    get: people.logout
  },
  {
    name: 'people',
    path: '/people',
    template: 'people',
    get: people.list,
    post: people.create
  },
  {
    name: 'person',
    path: '/people/:personSlug',
    template: 'person',
    get: people.view
  },
  {
    name: 'examples',
    path: '/examples',
    template: 'examples',
    get: pages.examples,
    patch: pages.patch
  }
]
