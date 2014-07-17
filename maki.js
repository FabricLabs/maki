var http = require('http');
// global, sadly, so middlewares can access it
// TODO: not do this
app = require('express')();

var server = http.createServer(app);

// frameworks
var rack     = require('asset-rack'); // minification / concatenation of assets
var mongoose = require('mongoose');   // manage 
var flashify = require('flashify');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var passportLocalMongoose = require('passport-local-mongoose');

// utility
var pathToRegex = require('path-to-regexp');

// config
var config = require('./config');
var database = require('./db');

/* Models represent the data your application keeps. */
/* You'll need at least the User model if you want to 
	allow users to login */
User = People = require('./app/models/User').User;
//Thing   = require('./app/models/Thing').Thing;

// set up controlers for various resources
pages    = require('./app/controllers/pages');
people   = require('./app/controllers/people');

// common utilities
_     = require('underscore');
async = require('async');
patch = require('fast-json-patch');

var Maki = require('./lib/Maki');
var maki = new Maki( app );

// make the HTML output readible, for designers. :)
app.locals.pretty = true;

/* use AssetRack to minify and cache static objects */
var assets = new rack.Rack([
  new rack.JadeAsset({
      url: '/js/templates.js',
      dirname: './app/views',
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
    filename: __dirname + '/private/less/bootstrap.less'
  }),
  new rack.LessAsset({
    url: '/css/font-awesome.css',
    filename: __dirname + '/private/less/fontawesome/font-awesome.less'
  }),
  new rack.LessAsset({
    url: '/css/maki.css',
    filename: __dirname + '/private/less/maki.less'
  }),
  /*/new rack.DynamicAssets({
    type: rack.LessAsset,
    urlPrefix: '/css',
    dirname: __dirname + '/private/css'
  })/**/
]);
app.use( assets.handle );

// jade is the default templating engine.
app.engine('jade', require('jade').__express);
/* configure the application to use jade, with a specified path for views */
app.set('view engine', 'jade');
app.set('views', __dirname + '/app/views' );

var redis = require('redis');
app.redis = redis.createClient( config.redis.port , config.redis.host );
var session = require('express-session');
var RedisStore = require('connect-redis')( session );

// set up middlewares for session handling
app.use( require('cookie-parser')( config.sessions.secret ) );
app.use( require('body-parser')() );
app.use( session({
    store: new RedisStore({
      client: app.redis
    })
  , secret: config.sessions.secret
}));

/* Configure the registration and login system */
app.use(passport.initialize());
app.use(passport.session());

/* enable "local" login (e.g., username and password) */
passport.use(new LocalStrategy( User.authenticate() ) );

passport.serializeUser( User.serializeUser() );
passport.deserializeUser( User.deserializeUser() );

/* configure some local variables for use later */
app.use(function(req, res, next) {
  // set a user context (from passport)
  res.locals.user = req.user;
  next();
});
app.use( require('provide') );

// configure top-level maps
app.clients = {};
app.resources = {};

// stub for resources
var resource = {
  define: function( spec ) {
    /* define required fields */
    ['name', 'path'].forEach(function(prop) {
      if (!spec[prop]) {
        throw new Error('"' + prop + '" is required to create an endpoint.');
      }
    });

    ['get', 'put', 'post', 'delete', 'patch'].forEach(function(method) {
      if (spec[ method ]) {
        
        // bind the function (if defined) in Express
        app[ method ]( spec.path , spec[method] );
        
        // build a regex for later pattern matching (mainly websockets)
        spec.regex = pathToRegex( spec.path );
        
        // build a map of resource names to their available methods
        if (!app.resources[ spec.name ]) { app.resources[ spec.name ] = spec; }
        app.resources[ spec.name ][ method ] = spec[ method ];

      }
    });
  }
}

var resources = [
    { name: 'index',            path: '/',                   template: 'index',    get: pages.index }
  , { name: 'registrationForm', path: '/register',           template: 'register', get: people.forms.register }
  , { name: 'loginForm',        path: '/login',              template: 'login',    get: people.forms.login }
  , { name: 'destroySession' ,  path: '/logout' ,            template: 'index',    get: people.logout }
  , { name: 'people',           path: '/people',             template: 'people',   get: people.list , post: people.create }
  , { name: 'person',           path: '/people/:personSlug', template: 'person',   get: people.view }
  , { name: 'examples',         path: '/examples' ,          template: 'examples', get: pages.examples , patch: pages.patch }
  , { name: 'pages',            path: '/pages' ,             template: 'examples', get: pages.examples , post: pages.create }
];

app.all('/', function(req, res, next) {
  if ('OPTIONS' === req.method) {
    var resourceList = Object.keys( app.resources ).map(function(k) {
      return app.resources[ k ];
    });
    return res.send( resourceList );
  }
  next();
});

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

// prepare the websocket server
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({
  server: server
});

wss.on('connection', function(ws) {
  // determine appropriate resource / handler
  for (var name in app.resources) {
    var resource = app.resources[ name ];
    // test if this resource should handle the request...
    if ( resource.regex.test( ws.upgradeReq.url ) ) {
      console.log('socket to be handled by resource: ' , resource.name );

      // unique identifier for our upcoming mess
      ws.id = ws.upgradeReq.headers['sec-websocket-key'];

      // make a mess
      ws.pongTime = (new Date()).getTime();
      ws.redis = redis.createClient( config.redis.port , config.redis.host );
      ws.redis.on('message', function(channel, message) {
        console.log('redis pubsub message', channel , message );
        try {
          var message = JSON.parse( message );
        } catch (e) {
          var message = message;
        }

        ws.send( (new jsonRPC('patch' , {
            channel: channel
          , ops: message
        })).toJSON() );
      });
      ws.redis.on('subscribe', function( channel , count ) {
        console.log('successful subscribe', channel , count );
      });
      ws.redis.subscribe( ws.upgradeReq.url );

      // handle events, mainly pongs
      ws.on('message', function handleClientMessage(msg) {
        try {
          var data = JSON.parse( msg );
        } catch (e) {
          var data = {};
        }

        // experimental JSON-RPC implementation
        console.log(data);
        if (data.jsonrpc === '2.0') {
          if (data.result === 'pong') {
            ws.pongTime = (new Date()).getTime();
          }

          switch( data.method ) {
            case 'subscribe':
              console.log('subscribe event', data.params);

              // fail early
              if (!data.params.channel) {
                return ws.send({
                  'jsonrpc': '2.0',
                  'error': {
                    'code': 32602,
                    'message': 'Missing param: \'channel\''
                  },
                  'id': data.id
                })
              }

              console.log('subscribing to ' , data.params.channel);

              ws.redis.subscribe( data.params.channel );
              ws.send({
                'jsonrpc': '2.0',
                'result': 'success',
                'id': data.id
              });

            break;
            case 'unsubscribe':
              console.log('unsubscribe event', data.params);

              // fail early
              if (!data.params.channel) {
                return ws.send({
                  'jsonrpc': '2.0',
                  'error': {
                    'code': 32602,
                    'message': 'Missing param: \'channel\''
                  },
                  'id': data.id
                })
              }

              console.log('unsubscribing from ' , data.params.channel);

              ws.redis.unsubscribe( data.params.channel );
              ws.send({
                'jsonrpc': '2.0',
                'result': 'success',
                'id': data.id
              });

            break;
          }
        }
      });

      app.clients[ ws.id ] = ws;

      // cleanup our mess
      ws.on('close', function() {
        console.log('cleaning: ', ws.upgradeReq.headers['sec-websocket-key'] );
        ws.redis.end();
        if (app.clients[ ws.upgradeReq.headers['sec-websocket-key'] ]) {
          app.clients[ ws.upgradeReq.headers['sec-websocket-key'] ].redis.end();
          delete app.clients[ ws.upgradeReq.headers['sec-websocket-key'] ];
        }
      });

      return; // exit the 'connection' handler
      break; // break the loop
    }
  }
  console.log('unhandled socket upgrade' , ws.upgradeReq.url );
});

var jsonRPC = require('./lib/jsonrpc');
wss.forEachClient = function(fn) {
  var self = this;
  for (var i in this.clients) {
    fn( this.clients[ i ] , i );
  }
}
wss.markAndSweep = function() {
  var message = new jsonRPC('ping');
  wss.broadcast( message.toJSON() );

  var now = (new Date()).getTime();
  this.forEachClient(function( client , id ) {
    // if the last pong from this client is less than the timeout,
    // emit a close event and let the handler clean up after us.
    if (client.pongTime < now - config.sockets.timeout) {
      //console.log('would normally emit a close event here', client.id , client.pongTime , now - config.sockets.timeout );
      client.emit('close');
    }
  });
}
wss.broadcast = function(data) {
  for (var i in this.clients) {
    this.clients[ i ].send( data );
  }
};

// clean up clients at an interval
// TODO: consider setTimeout per-client
setInterval(function() {
  console.log( 'connected websockets: ' , Object.keys(app.clients) );
  wss.markAndSweep();
}, config.sockets.timeout );

// make server available
server.listen( config.services.http.port , function() {
  console.log('listening http://localhost:' + config.services.http.port + ' ...');
});
