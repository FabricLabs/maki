var config = require('./config');

var Maki = require('./lib/Maki');
var maki = new Maki( config );

var Passport = require('maki-passport-local');
var passport = new Passport({
  resource: 'Person'
});
maki.use( passport );

var CMS = require('maki-cms-local');
var cms = new CMS({
  base: '/docs',
  path: '/docs'
});

maki.use(cms);

maki.define('Person', {
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
  icon: 'user'
});

maki.define('Example', {
  attributes: {
    name:    { type: String , max: 80 },
    slug:    { type: String , max: 80 , id: true },
    content: { type: String },
    screenshot: { type: 'File' }
  },
  source: 'data/examples.json',
  icon: 'idea'
});

maki.define('Release', {
  attributes: {
    name: { type: String , max: 80 },
    tag: { type: String , max: 80 },
    created: { type: Date },
    published: { type: Date },
    notes: { type: String , render: 'markdown' }
  },
  source: 'https://api.github.com/repos/martindale/maki/releases',
  icon: 'tags',
  map: function( release ) {
    return {
      name: release.name,
      tag: release.tag_name,
      notes: release.body,
      published: new Date( release.published_at )
    };
  }
});

/*var Analytics = require('maki-analytics');
var analytics = new Analytics({ id: 'UA-57746323-2' });

maki.use( analytics ).serve(['http']).start();*/
maki.start();
