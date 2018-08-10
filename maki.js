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
maki.use(require('maki-client-markdown'));
maki.use(require('maki-client-search'));

var AuthSlack = require('maki-auth-slack');
var authSlack = new AuthSlack({
  resource: 'Person',
  slack: config.auth.slack
});

maki.use(authSlack);

var CMS = require('maki-cms-local');
var cms = new CMS({
  public: true,
  icon: 'book',
  name: 'Doc',
  description: 'Resources and reference materials.',
  source: __dirname + '/docs',
  components: {
    query: 'maki-api-index',
    get: 'maki-doc-view'
  },
  base: '/docs',
  path: '/docs',
  view: process.env.PWD + '/views/page'
});

var guides = new CMS({
  name: 'Guide',
  base: '/guides',
  path: '/source/guides',
  view: process.env.PWD + '/views/page',
  components: {
    masthead: 'maki-page-header',
    get: 'maki-page-view'
  }
});

var examples = new CMS({
  name: 'Example',
  base: '/examples',
  path: '/source/examples',
  icon: 'idea',
  public: true,
  view: process.env.PWD + '/views/page',
  components: {
    masthead: 'maki-page-header',
    query: 'maki-example-showcase',
    get: 'maki-page-view',
  }
});

var tutorials = new CMS({
  name: 'Tutorial',
  base: '/tutorials',
  path: '/source/tutorials',
  view: process.env.PWD + '/views/page'
});

var snippets = new CMS({
  name: 'Snippet',
  base: '/snippets',
  path: '/source/snippets',
  view: process.env.PWD + '/views/page'
});

var developers = new CMS({
  name: 'Developer',
  base: '/developers',
  path: '/source/developers',
  view: process.env.PWD + '/views/page'
});

var Auth = require('maki-auth-simple');
var auth = new Auth({
  resource: 'Person'
});

maki.use(cms);
maki.use(guides);
maki.use(examples);
maki.use(tutorials);
maki.use(snippets);
maki.use(developers);
maki.use(auth);

// TODO: create relative time system that uses absolute values for static events
// but relative time for recurring events
// i.e., an `end` time of 86400000 would be an event that consistently lasts one
// full day from a relative `start` time of 0, with a `recurrence` value of any
// enumerable value.
var Event = maki.define('Event', {
  icon: 'calendar',
  description: 'A range of time',
  attributes: {
    name: { type: String },
    start: { type: Date },
    end: { type: Date },
    // TODO: consider creating a "Recurrence" object that also stores behavior
    recurrence: { type: String , enum: ['daily', 'weekly', 'monthly', 'yearly'] }
  }
})

var Topic = maki.define('Topic', {
  public: false,
  icon: 'comment',
  handle: 'Conversations',
  masthead: '/img/sunrise.jpg',
  description: 'Topics being discussed by the Maki community.',
  components: {
    query: 'maki-topic-browser',
    get: 'maki-chat-interface'
  },
  attributes: {
    id: { type: String , max: 80 , required: true },
    name: { type: String , max: 80 , required: true , slug: true },
    description: { type: String },
    topic: { type: String },
    created: { type: Date , default: Date.now },
    creator: { type: String , ref: 'Person' },
    authors: [ { type: String , ref: 'Person' } ],
    subscribers: [ { type: String , ref: 'Person' } ],
    // TODO: write migration scripts
    //people: [ { type: String , ref: 'Person' } ],
    stats: {
      subscribers: { type: Number , default: 0 },
      messages: { type: Number , default: 0 },
    },
    links: {
      slack: { type: String , max: 40 }
    }
  },
  requires: {
    'Person': {
      filter: function() {
        var topic = this;
        return { id: { $in: topic.people } }
      },
      sort: '-id'
    },
    'Message': {
      filter: function() {
        return { topic: this.id };
      },
      sort: '-created',
      populate: 'author'
    },
    'channelsToJoin': {
      resource: 'Topic',
      filter: function() {
        var defaults = ['community', 'projects', 'learning'];
        return { $or: [
          { id: this.id },
          { id: { $in: defaults } }
        ] };
      },
      map: function(item) {
        return item.id;
      }
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
  components: {
    'query': 'maki-chat-interface'
  },
  attributes: {
    // TODO: make this a special field at the Fabric layer, and make it part of
    // the API.  Remove from schema definition, potentially don't even have
    // access to it within application scope.  External anyway, right?
    '@context': { type: String },
    id: { type: String , max: 80 , required: true , slug: true , id: true },
    topic: { type: String , ref: 'Topic' },
    parent: { type: String , ref: 'Message' },
    author: { type: String , ref: 'Person' },
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
  requires: {
    'parent': {
      resource: 'Message',
      single: true,
      filter: function() {
        var localMessage = this;
        return { id: localMessage.parent };
      },
      populate: 'author'
    },
    'replies': {
      resource: 'Message',
      filter: function() {
        var localMessage = this;
        return { parent: localMessage.id };
      },
      populate: 'author'
    }
  },
  handlers: {
    html: {
      'create': function(req, res) {
        var message = this;
        if (message.topic) {
          return res.status(302).redirect('/topics/' + message.topic);
        } else {
          return res.status(303).redirect('/messages/' + message.id );;
        }
      }
    }
  }
});

Topic.pre('create', populateCreator);
Topic.pre('update', populateCreator);

Message.pre('create', function assignHash (next, done) {
  var crypto = require('crypto');

  var message = this;
  if (message.id) return next();
  
  var now = Date.now() * 1000;
  var key = [message.author, now].join(':');
  var hash = crypto.createHash('sha256').update(key).digest('hex');
  
  message.id = hash;
  
  return next();
  
});


//Message.pre('create', inferSlackContext);
Message.pre('create', populateChannel);
Message.pre('create', publishToSlack);
Message.pre('create', reduceChannel);

Message.pre('create', populateAuthor);
Message.pre('update', populateAuthor);

Message.post('create', calculateTopicStats);

function populateAuthor (next, done) {
  var message = this;
  Person.get({
    $or: [
      { 'links.slack': message.author },
      { 'id': message.author }
    ]
  }, function(err, person) {
    if (err) console.error(err);
    if (!person) {
      return done('No such author: ' + message.author);
    }

    message.author = person.id;
    next();
  });
}

function populateCreator (next, done) {
  var topic = this;
  Person.get({
    $or: [
      { 'links.slack': topic.creator },
      { 'id': topic.creator }
    ]
  }, function(err, person) {
    if (err) console.error(err);
    if (!person) {
      return done('No such person: ' + topic.creator);
    }
    topic.creator = person.id;
    next();
  });
}

function populateChannel (next, done) {
  var message = this;
  Topic.get({
    $or: [
      { 'links.slack': message.topic },
      { 'id': message.topic }
    ]
  }, function(err, topic) {
    if (err) console.error(err);
    if (!topic) {
      console.warn('No topic found, strange behavior ahead...');
      //return done('No such topic: ' + message.topic);
    }

    message.topic = topic;
    next();
  });
}

function reduceChannel (next, done) {
  var message = this;
  if (message.topic && message.topic.id) {
    message.topic = message.topic.id;
  }
  next();
}

var Invitation = maki.define('Invitation', {
  public: false,
  components: {
    masthead: 'maki-invitation-splash',
    query: 'maki-invitation-manager',
    get: 'maki-invitation-view',
  },
  attributes: {
    id: { type: String , required: true , slug: true },
    from: { type: String , max: 240 , authorize: 'user' },
    user: { type: String , max: 240 , ref: 'Person' },
    email: { type: String , required: true , max: 240 },
    avatar: { type: String },
    topics: [ { type: String } ],
    message: { type: String },
    created: { type: Date , default: Date.now },
    status: { type: String , enum: ['created', 'sent', 'accepted'] , default: 'created' },
    stats: {
      reminders: { type: Number , default: 0 },
      people: { type: Number , default: 1 }
    }
  },
  requires: {
    Topic: {
      query: {},
      sort: 'id'
    }
  },
});

Invitation.pre('create', function(next, done) {
  var invitation = this;

  if (invitation.email) {
    invitation.avatar = require('crypto').createHash('md5').update(invitation.email).digest('hex');
    invitation.id = invitation.avatar;
  }
  
  Invitation.get({ email: invitation.email }, function(err, user) {
    if (user) {
      return Invitation.patch({ id: user.id }, [
        { op: 'replace', path: '/stats/reminders', value: ++user.stats.reminders }
      ], function(err) {
        if (err) console.error(err);
        done(null, user);
      });
    } else {
      next();
    }
  });

});

Invitation.post('get', function(done) {
  var invitation = this;
  if (invitation.email) {
    invitation.avatar = require('crypto').createHash('md5').update(invitation.email).digest('hex');
    invitation.id = invitation.avatar;
  }
  done();
});

var Reminder = maki.define('Reminder', {
  public: false,
  attributes: {
    invitation: { type: String , required: true },
    created: { type: Date , default: Date.now }
  }
});

function useInternalID (next, done) {
  var subject = this;
  subject.id = subject._id;
  next();
}

function calculateTopicStats (done) {
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
      done(err);
    });
  });
}

function calculateInvitationStats (done) {
  var reminder = this;
  console.log('post create reminder:', reminder);
  var query = {
    invitation: reminder.invitation
  };

  console.log('query:', query);
  Reminder.Model.count(query, function(err, count) {
    console.log('count callback:', err, count);
    Invitation.patch({ id: reminder.invitation }, [
      { op: 'replace', path: '/stats/reminders', value: count }
    ], function(err, num) {
      console.log('patch applied,', err, num);
      done(err);
    });
  });
}

function inferSlackContext (next, done) {
  var message = this;
  Person.get({
    id: message.author
  }, function(err, person) {
    if (err) console.error(err);
    if (person && person.tokens && person.tokens.slack) {
      message['@context'] = person.tokens.slack;
    }
    next();
  });
}

function publishToSlack (next, done) {
  var message = this;
  var rest = require('restler');
  var crypto = require('crypto');
 
  if (!message['@context']) return next();
  if (!message['topic']) return next();

  var doc = {
    //token: config.slack.token, // TODO: replace with user token...
    token: message['@context'],
    // that will probably require a global context, passed with every request.
    // this is likely necessary in the long run.
    channel: message.topic.links.slack,
    text: message.content,
    as_user: true
  };

  rest.post('https://slack.com/api/chat.postMessage', {
    data: doc
  }).on('complete', function(data) {
    var key = [data.message.channel, data.message.user, data.message.ts].join(':');
    message.id = crypto.createHash('sha256').update(key).digest('hex');
    next();
  });
 
}

Reminder.post('create', calculateInvitationStats);

/*Reminder.post('create', function(done) {
  var reminder = this;
  // TODO: update internal APIs to use a channel here
  Invitation.patch({ id: reminder.invitation }, [
    { op: 'add', path: '/stats/transactions', value: 1 }
  ], function(err, num) {
    console.log('REMINDER POST CREATE:', err, num);
  });
});*/

maki.define('Release', {
  public: false,
  icon: 'tag',
  description: 'Officially tagged releases of the Maki library.',
  //source: 'https://api.github.com/repos/martindale/maki/releases',
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
  public: false,
  handle: 'Extensions',
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
  public: false,
  name: 'Index',
  templates: {
    query: 'splash'
  },
  components: {
    masthead: 'maki-pitch',
    query: 'maki-splash',
    get: 'maki-splash'
  },
  routes: {
    query: '/'
  },
  static: true,
  //internal: true
});

var Profile = maki.define('Profile', {
  public: false,
  attributes: {
    id: { type: String , required: true },
    service: { type: String , required: true },
    created: { type: Date , default: Date.now },
    data: {}
  }
});

var Person = maki.define('Person', {
  icon: 'users',
  handle: 'Community',
  description: 'The list of people working on Maki, including all extended members of the community.',
  masthead: null,
  // TODO: auto-infer
  components: {
    masthead: 'maki-community-welcome',
    query: 'maki-community',
    get: 'maki-profile'
  },
  attributes: {
    username: { type: String , max: 80 , required: true , slug: true , id: true },
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
    tokens: {
      slack: { type: String }
    },
    profiles: [ { type: String } ],
    stats: {
      messages: { type: Number , default: 0 },
      invitations: { type: Number , default: 0 }
    },
    status: { type: String , enum: ['away', 'active'] }
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
      filter: function() {
        return { author: this.id };
      },
      sort: '-created',
      populate: 'author'
    },
    'Topic': {
      query: {},
      sort: 'id'
    },
    'topicMemberships': {
      resource: 'Topic',
      filter: function() {
        return { people: this.id };
      }
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

var Entity = maki.define('Entity', {
  public: false,
  attributes: {
    coordinates: {
      x: { type: Number , default: 0 },
      y: { type: Number , default: 0 },
      z: { type: Number , default: 0 }
    }
  }
});

/*var Analytics = require('maki-analytics');
var analytics = new Analytics({ id: 'UA-57746323-2' });

maki.use( analytics ).serve(['http']).start();*/
maki.start(function() {
  console.log('routes:', maki.routes);
});
