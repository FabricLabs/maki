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
      dirname: './views'
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

  // TODO: consider moving to a prototype on the response
  res.provide = function(err, resource, options) {
    if (err) { resource = err; }
    if (!options) { options = {}; }

    res.format({
        // TODO: strip non-public fields from pure JSON results
        json: function() { res.send( resource ); }
      , html: function() {
          if (options.template) {
            // TODO: determine appropriate resource format
            res.render( options.template , _.extend({ resource: resource } , resource ) );
          } else {
            res.send( resource );
          }
        }
    });
  };

  next();
});

/* Configure "routes".
    "routes" are the mappings your browser/client use to 
    access the logic behind a concept.  Google "REST" to
    learn more about the principle. */

/* the first route we'll configure is our front page. :) */
/* this means: when a GET request is issued to (yourapp)/,
    ...execute a function with the [req]uest, [res]ponse, and
    the [next] function. */
app.get('/', function(req, res) {

  /* in this function, render the index template, 
     using the [res]ponse. */
  res.render('index', {
    foo: 'bar' //this is an example variable to be sent to the rendering engine
  });

});

app.get('/register', function(req, res) {
  res.render('register');
});

app.get('/login', function(req, res) {
  res.render('login');
});

/* when a POST request is made to '/register'... */
app.post('/register', function(req, res) {
  User.register(new User({ email : req.body.email, username : req.body.username }), req.body.password, function(err, user) {
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

app.get('*', function(req, res) {
  res.status(404).render('404');
});

app.listen( config.appPort , function() {
  console.log('Demo application is now listening on http://localhost:' + config.appPort + ' ...');
});
