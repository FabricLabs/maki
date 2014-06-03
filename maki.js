var http = require('http');
var app = require('express')();
var server = http.createServer(app);
var WebSocketServer = require('ws').Server;

var wss = new WebSocketServer({
  server: server
});
wss.on('connection', function(ws) {
  console.log('routable websocket!', ws.upgradeReq.url);
  ws.on('message', function(message) {
    console.log('received: %s', message);
    ws.send({ foo: message });
  });
  ws.send( JSON.stringify({ hello: ws.upgradeReq.url }) );
});

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

app.set('view engine', 'hbs');

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

app.resources = {};
var resource = {
  define: function( spec ) {
    var required = ['name', 'path'];

    required.forEach(function(prop) {
      if (!spec[prop]) {
        throw new Error('"' + prop + '" is required to create an endpoint.');
      }
    });

    ['get', 'put', 'post', 'delete'].forEach(function(method) {
      if (spec[ method ]) {
        // bind the function (if defined) in Express
        app[ method ]( spec.path , spec[method] );
        
        // build a map of resource names to their available methods
        if (!app.resources[ spec.name ]) { app.resources[ spec.name ] = spec; }
        app.resources[ spec.name ][ method ] = spec[ method ];
      }
    });
  }
}

var resources = [
    { name: 'index',            path: '/',                 template: 'index',    get: function(req, res) {
      res.provide('index', {
        index: Object.keys( app.resources ).map(function(k) {
          return app.resources[ k ];
        })
      });
    }}
  , { name: 'registrationForm', path: '/register',         template: 'register', get: people.forms.register }
  , { name: 'loginForm',        path: '/login',            template: 'login',    get: people.forms.login }
  , { name: 'destroySession' ,  path: '/logout' ,          template: 'index',    get: people.logout }
  , { name: 'people',           path: '/people',           template: 'people',   get: people.list , post: people.create }
  , { name: 'person',           path: '/people/:personID', template: 'person',   get: people.view }
  , { name: 'examples',         path: '/examples' ,        template: 'examples', get: pages.examples }
];

resources.forEach(function(r) {
  resource.define( r );
});

// TODO: build a middleware chain for resources
app.post('/login', passport.authenticate('local'), function(req, res) {
  res.redirect('/');
});

// catch-all route (404)
app.get('*', function(req, res) {
  res.status(404).render('404');
});

server.listen( config.appPort , function() {
  console.log('Demo application is now listening on http://localhost:' + config.appPort + ' ...');
});
