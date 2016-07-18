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
    _id: { type: String }, // TODO: remove
    id: { type: String }, // TODO: incorporate into main library
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
    },
    links: {
      slack: { type: String , max: 40 }
    },
    stats: {
      messages: { type: Number , default: 0 },
      invitations: { type: Number , default: 0 }
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
  },
  requires: {
    'Message': {
      as: 'person:messages',
      filter: function() {
        return { author: this.id };
      },
      sort: '-created',
      populate: 'author'
    }
  }
});

Person.pre('create', function(next, done) {
  var person = this;
  person._id = person.id;
  next();
});

Person.pre('update', function(next, done) {
  var person = this;
  console.log('person:pre:update', person);
  person._id = person.id;
  next();
});

Person.post('get', function(done) {
  var person = this;
  if (!person.name) person.name = {};
  person.name.display = person.username;
  done();
});

var Topic = maki.define('Topic', {
  icon: 'comment',
  handle: 'Conversations',
  masthead: '/img/sunrise.jpg',
  description: 'Topics being discussed by the Maki community.',
  attributes: {
    id: { type: String , max: 80 , required: true },
    name: { type: String , max: 80 , required: true , slug: true },
    description: { type: String },
    topic: { type: String },
    created: { type: Date , default: Date.now },
    people: [ { type: String , ref: 'Person' }],
    stats: {
      subscribers: { type: Number , default: 0 },
      messages: { type: Number , default: 0 },
    },
    links: {
      slack: { type: String , max: 40 }
    }
  },
  requires: {
    'Message': {
      as: 'channel:messages',
      filter: function() {
        return { topic: this.id };
      },
      sort: '-created',
      populate: 'author'
    }
  },
  params: {
    query: {
      limit: 1000
    }
  },
  fields: {
    description: 'description',
  }
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

var Message = maki.define('Message', {
  icon: 'speech',
  description: 'Messages about the Topics under discussion.',
  public: false,
  attributes: {
    id: { type: String , max: 80 , required: true , slug: true },
    topic: { type: String , ref: 'Topic' },
    author: { type: String , ref: 'Person' , populate: ['query', 'get'] },
    content: { type: String },
    created: { type: Date , default: Date.now },
    reactions: {},
    links: {
      slack: { type: String , max: 40 }
    },
    stats: {
      reactions: { type: Number , default: 0 }
    }
  },
  params: {
    query: {
      limit: 1000,
      sort: '-stats.reactions'
    }
  },
});

function populateAuthor (next, done) {
  var message = this;
  Person.get({
    'links.slack': message.author
  }, function(err, person) {
    if (err) console.error(err);
    if (!person) {
      return done('No such person: ' + message.author);
      process.exit();
    }

    message.author = person.id;
    next();
  });
}

function calculateStats (next, done) {
  var message = this;
  console.log('post create message:', message);
  var query = {
    topic: message.topic
  };

  console.log('query:', query);
  Message.Model.count(query, function(err, count) {
    console.log('count callback:', err, count);
    Topic.patch({ id: message.topic }, [
      { op: 'replace', path: '/stats/messages', value: count }
    ], function(err, num) {
      console.log('patch applied,', err, num);
      next(err);
    });
  });
}

Message.pre('create', populateAuthor);
Message.pre('update', populateAuthor);

Message.post('create', calculateStats);

var Invitation = maki.define('Invitation', {
  public: false,
  attributes: {
    email: { type: String , required: true , max: 240 },
    topics: [ { type: String } ],
    //created: { type: Date , default: Date.now },
    status: { type: String , enum: ['created', 'sent', 'accepted'] }
  }
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
  icon: 'tag',
  attributes: {
    name: { type: String , max: 80 },
    tag: { type: String , max: 80 },
    created: { type: Date },
    published: { type: Date },
    notes: { type: String , render: 'markdown' }
  },
  //source: 'https://api.github.com/repos/martindale/maki/releases',
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
  handle: 'Extensions',
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
