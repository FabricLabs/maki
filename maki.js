var express = require('express')
  , app = express()
  , mongoose = require('mongoose')
  , flashify = require('flashify')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , passportLocalMongoose = require('passport-local-mongoose')
  , config = require('./config')
  , database = require('./db');

/* Models represent the data your application keeps. */
/* You'll need at least the User model if you want to 
	allow users to login */
User = People = require('./models/User').User;
//Thing   = require('./models/Thing').Thing;

pages    = require('./controllers/pages');
people   = require('./controllers/people');

// make the HTML output readible, for designers. :)
app.locals.pretty = true;

app.use(require('less-middleware')({ 
    debug: true
  , src: __dirname + '/private'
  , dest: __dirname + '/public'
}));
// any files in the /public directory will be accessible over the web,
// css, js, images... anything the browser will need.
app.use(express.static(__dirname + '/public'));

// jade is the default templating engine.
app.engine('jade', require('jade').__express);

// set up middlewares for session handling
app.use(express.cookieParser( config.cookieSecret ));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({
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
            res.render( options.template , { resource: resource } );
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

