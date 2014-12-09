var config = require('./config');

var Maki = require('./lib/Maki');
var maki = new Maki( config );

maki.define('Person', {
  attributes: {
    username: { type: String , max: 80 , required: true , slug: true },
    hash:     { type: String , restricted: true },
    salt:     { type: String , restricted: true },
    email:    { type: String , max: 80 , restricted: true },
    created:  { type: Date , default: Date.now }
  },
  plugins: [
    require('passport-local-mongoose')
  ],
  icon: 'user'
});

maki.define('Example', {
  attributes: {
    name:    { type: String , max: 80 },
    slug:    { type: String , max: 80 , id: true },
    content: { type: String }
  },
  source: 'data/examples.json',
  icon: 'idea'
});

maki.define('Dashboard', {
  attributes: {
      name: { type: String , max: 80 , name: true , slug: true , required: true }
    , _people: { type: require('mongoose').SchemaTypes.ObjectId, ref: 'Person' }
  },
  requires: {
    'examples': {},
    'people': {
      filter: {
        // _id: { $in: dashboard._people }
      }
    }
  },
  icon: 'dashboard'
});

maki.define('Widget', {
  attributes: {
    name: { type: String , max: 80 }
  },
  icon: 'setting'
});

maki.serve(['http']).start();
