var express = require('express');
var app = express();

var rack = require('asset-rack');

var mongoose = require('mongoose');
var flashify = require('flashify');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var passportLocalMongoose = require('passport-local-mongoose');

var config = require('./config');
var database = require('./db');

/* Models represent the data your application keeps. */
/* You'll need at least the User model if you want to 
	allow users to login */
User = People = require('./models/User').User;
//Thing   = require('./models/Thing').Thing;

// set up controlers for various resources
pages    = require('./controllers/pages');
people   = require('./controllers/people');

// common utilities
_     = require('underscore');
async = require('async');

// make the HTML output readible, for designers. :)
app.locals.pretty = true;

var assets = new rack.Rack([
  new rack.JadeAsset({
      url: '/js/templates.js',
      dirname: './views',
      // strip out layouts (we don't want them)
      beforeCompile: function( input ) {
        return input.replace(/extends (.*)\n/, '');
      }
  }),
  new rack.StaticAssets({
    urlPrefix: '/',
    dirname: __dirname + '/public'
  }),
  new rack.LessAsset({
    url: '/css/bootstrap.css',
    filename: __dirname + '/private/css/bootstrap.less'
  }),
  new rack.LessAsset({
    url: '/css/font-awesome.css',
    filename: __dirname + '/private/css/fontawesome/font-awesome.less'
  }),
  new rack.LessAsset({
    url: '/css/maki.css',
    filename: __dirname + '/private/css/maki.less'
  }),
  /*/new rack.DynamicAssets({
    type: rack.LessAsset,
    urlPrefix: '/css',
    dirname: __dirname + '/private/css'
  })/**/
]);

//console.log( assets.handle );
app.use( assets.handle );

// jade is the default templating engine.
app.engine('jade', require('jade').__express);

// set up middlewares for session handling
app.use( require('cookie-parser')( config.cookieSecret ) );
app.use( require('body-parser')() );
app.use( require('express-session')({
  secret: config.cookieSecret
}));

/* Configure the registration and login system */
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'jade');

passport.use(new LocalStrategy( User.authenticate() ) );

passport.serializeUser( User.serializeUser() );
passport.deserializeUser( User.deserializeUser() );

/* configure some local variables for use later */
app.use(function(req, res, next) {
  res.locals.user = req.user;
  
  res.provide = function( template , data ) {
    res.format({
      json: function() { res.send( data[ template ] ); },
      html: function() { res.render( template , data ); }
    });
  }

  next();
});

/* Configure "routes".
    "routes" are the mappings your browser/client use to 
    access the logic behind a concept.  Google "REST" to
    learn more about the principle. */

app.resources = {};
var resource = {
  define: function( spec ) {
    var required = ['name', 'path'];

    required.forEach(function(prop) {
      if (!spec[prop]) {
        throw new Error('"' + prop + '" is required to create an endpoint.');
      }
    });
    
    var map = { get: 'get', set: 'put' };
    ['get', 'set'].forEach(function(method) {
      if (spec[ method ]) {
        app[ map[ method ] ].apply( app , [ spec[ method ] ] );
        
        if (!app.resources[ spec.name ]) { app.resources[ spec.name ] = spec; }
        app.resources[ spec.name ][ map[ method ] ] = spec[ method ];
      }
    });
    
  }
}

resource.define({
  name: 'registrationForm',
  path: '/register',
  get: function(req, res, next) {
    res.render('register');
  }
});

app.get('/login', function(req, res) {
  res.render('login');
});

/* when a POST request is made to '/register'... */
app.post('/register', function(req, res) {
  User.register(new User({
    email : req.body.email,
    username : req.body.username
  }), req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      return res.render('register', { user : user });
    }

    res.redirect('/');
  });
});

app.post('/login', passport.authenticate('local'), function(req, res) {
  res.redirect('/');
});

app.get('/logout', function(req, res, next) {
  req.logout();
  res.redirect('/');
});

app.get('/examples',             pages.examples );
app.get('/people',               people.list );
app.get('/people/:usernameSlug', people.view );

/* the first route we'll configure is our front page. :) */
/* this means: when a GET request is issued to (yourapp)/,
    ...execute a function with the [req]uest, [res]ponse, and
    the [next] function. */
app.get('/', function(req, res) {

  /* in this function, render the index template, 
     using the [res]ponse. */
  res.provide('index', {
    index: app.resources
    /*/index: app._router.stack.filter(function(x) {
      return x.route && x.route.methods.get;
    })/**/
  });

});

app.get('*', function(req, res) {
  res.status(404).render('404');
});

app.listen( config.appPort , function() {
  console.log('Demo application is now listening on http://localhost:' + config.appPort + ' ...');
});
