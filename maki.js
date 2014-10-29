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
      name:    { type: String , max: 80 },
      slug:    { type: String , max: 80 , id: true },
      content: { type: String }
    }
  },
  {
    name: 'Dashboard',
    attributes: {
        name: { type: String , max: 80 , name: true , slug: true , required: true }
      , _people: { type: maki.mongoose.SchemaTypes.ObjectId, ref: 'Person' }
    },
    requires: {
      'examples': {},
      'people': {
        filter: {
          // _id: { $in: dashboard._people }
        }
      }
    }
  },
  {
    name: 'NewThing',
    attributes: {
      name: { type: String , max: 80 }
    }
  },
  {
    name: 'Widget',
    attributes: {
      name: { type: String , max: 80 }
    }
  }
];

var Person = maki.define('Person', {
  attributes: {
    username: { type: String , max: 80 , required: true , slug: true },
    hash:     { type: String , restricted: true },
    salt:     { type: String , restricted: true },
    email:    { type: String , max: 80 , restricted: true },
    created:  { type: Date , default: Date.now, restricted: true }
  },
  plugins: [
    require('passport-local-mongoose')
  ]
});

Person.pre('save', function( done ) {
  console.log('hi');
  done();
});

Person.on('create', function( person ) {
  console.log('ho');
});

var LocalStrategy = require('passport-local').Strategy;

/* enable "local" login (e.g., username and password) */
maki.passport.use(new LocalStrategy( maki.resources['Person'].Model.authenticate() ) );

maki.passport.serializeUser( maki.resources['Person'].Model.serializeUser() );
maki.passport.deserializeUser( maki.resources['Person'].Model.deserializeUser() );

resources.forEach(function(resource) {
  maki.define( resource.name , resource );
});

maki.start();
