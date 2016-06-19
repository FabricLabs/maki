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
  description: 'The list of people working on Maki, including all extended members of the community.',
  attributes: {
    username: { type: String , max: 80 , required: true , slug: true },
    name:     {
      family: { type: String , max: 80 },
      given: { type: String , max: 80 }
    },
    bio: { type: String },
    hash:     { type: String , restricted: true },
    salt:     { type: String , restricted: true },
    email:    { type: String , max: 80 , restricted: true },
    created:  { type: Date , default: Date.now },
    image: {
      original: { type: String , max: 1024 },
      avatar: { type: String , max: 1024 },
    }
  },
  auth: {
    'patch': ['admin', function(done) {
      var person = this;
      return false;
    }]
  },
  params: {
    query: {
      limit: 1000
    }
  },
  fields: {
    image: 'image',
    description: 'bio'
  }
});

Person.post('patch', function(done) {
  var person = this;
  done();
});

Person.post('get', function(done) {
  var person = this;
  person.name.display = person.username;
  done();
});

var Topic = maki.define('Topic', {
  icon: 'comment',
  attributes: {
    id: { type: String , max: 80 , required: true },
    name: { type: String , max: 80 , required: true , slug: true },
    description: { type: String },
    topic: { type: String },
    created: { type: Date , default: Date.now },
    stats: {
      subscribers: { type: Number , default: 0 },
      messages: { type: Number , default: 0 },
    }
  },
  params: {
    query: {
      limit: 1000
    }
  },
});

// TODO: change Maki internals to do this automatically
// this is a major change, standardizing on `id` as the local identifier field
// which gets used in all URIs as the path indicator for this resource, as
// opposed to `slug`, which has been used historically.
Topic.pre('create', function(next, done) {
  var topic = this;
  var speakingurl = require('speakingurl');
  topic.id = speakingurl(topic.name);
  next();
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
  //source: 'https://api.github.com/repos/martindale/maki/releases',
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

maki.define('Plugin', {
  attributes: {
    name: { type: String , max: 80 },
    description: { type: String },
    version: { type: String , max: 10 },
    coverage: { type: Number , default: 0 },
  },
  icon: 'puzzle'
});

/*var Analytics = require('maki-analytics');
var analytics = new Analytics({ id: 'UA-57746323-2' });

maki.use( analytics ).serve(['http']).start();*/
maki.start();
