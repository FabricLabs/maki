var config = require('./config');

var Maki = require('./lib/Maki');
var maki = new Maki( config );

var Passport = require('maki-passport-local');
var passport = new Passport({
  resource: 'Person'
});
maki.use( passport );
maki.use(require('maki-client-level'));
maki.use(require('maki-client-polymer'));

var CMS = require('maki-cms-local');
var cms = new CMS({
  base: '/docs',
  path: '/docs'
});

var tutorials = new CMS({
  base: '/tutorials',
  path: '/source/tutorials',
  view: process.env.PWD + '/views/page'
});

var snippets = new CMS({
  base: '/snippets',
  path: '/source/snippets',
  view: process.env.PWD + '/views/page'
});

var developers = new CMS({
  base: '/developers',
  path: '/source/developers',
  view: process.env.PWD + '/views/page'
});

var Auth = require('maki-auth-simple');
var auth = new Auth({
  resource: 'Person'
});

maki.use(cms);
maki.use(tutorials);
maki.use(snippets);
maki.use(developers);
maki.use(auth);

var Person = maki.define('Person', {
  icon: 'user',
  description: 'People are the most important part of Maki, and this is where we list them.  We\'re not users, we\'re _people_, damnit.',
  attributes: {
    username: { type: String , max: 80 , required: true , slug: true },
    name:     {
      family: { type: String , max: 80 },
      given: { type: String , max: 80 }
    },
    hash:     { type: String , restricted: true },
    salt:     { type: String , restricted: true },
    email:    { type: String , max: 80 , restricted: true },
    created:  { type: Date , default: Date.now }
  },
  /* auth: {
    'patch': ['admin', function(done) {
      var person = this;
      return false;
    }]
  }, */
});
Person.post('patch', function(done) {
  var person = this;
  console.log('person updated:', person);
  done();
});

maki.define('Example', {
  icon: 'idea',
  description: 'A list of applications Made With Maki.',
  source: 'data/examples.json',
  components: {
    query: 'maki-examples'
  },
  attributes: {
    name:    { type: String , max: 80 },
    slug:    { type: String , max: 80 , id: true },
    content: { type: String },
    screenshot: { type: 'File' }
  },
});

maki.define('Release', {
  icon: 'tags',
  description: 'Officially tagged releases of the Maki library.',
  source: 'https://api.github.com/repos/martindale/maki/releases',
  attributes: {
    name: { type: String , max: 80 },
    tag: { type: String , max: 80 },
    created: { type: Date },
    published: { type: Date },
    notes: { type: String , render: 'markdown' }
  },
  map: function( release ) {
    return {
      name: release.name,
      tag: release.tag_name,
      notes: release.body,
      published: new Date( release.published_at )
    };
  }
});

maki.define('Plugin', {
  icon: 'puzzle',
  description: 'Modules that extend the default Maki behaviors.',
  attributes: {
    name: { type: String , max: 80 },
    description: { type: String },
    version: { type: String , max: 10 },
    coverage: { type: Number , default: 0 },
  },
});

maki.define('Index', {
  name: 'Index',
  templates: {
    query: 'splash'
  },
  components: {
    query: 'maki-splash',
    get: 'maki-splash'
  },
  routes: {
    query: '/'
  },
  static: true,
  //internal: true
});

/*var Analytics = require('maki-analytics');
var analytics = new Analytics({ id: 'UA-57746323-2' });

maki.use( analytics ).serve(['http']).start();*/
maki.start(function() {
  console.log('routes:', maki.routes);
});
