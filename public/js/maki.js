// stub for a proper class
var maki = {
    config: null
  , templates: {}
  , routes: []
  , collections: {}
  , observers: []
  , socket: null // only one connected socket at a time (for now)
  , sockets: {
      subscriptions: [],
      subscribe: function( channel ) {
        if (!channel) { var channel = window.location.pathname; }
        if (!maki.socket) { maki.sockets.connect(); }
        if (maki.sockets.subscriptions.indexOf( channel ) >= 0) { return; }

        maki.sockets.subscriptions.push( channel );
        var message = new jsonRPC('subscribe', { channel: channel });
        return maki.socket.send( message.toJSON() );
      },
      unsubscribe: function( channel ) {
        if (!channel) { var channel = window.location.pathname; }
        if (!maki.socket) { maki.sockets.connect(); }
        if (maki.sockets.subscriptions.indexOf( channel ) == -1) { return; }

        var i = maki.sockets.subscriptions.indexOf( channel );
        maki.sockets.subscriptions.splice( i , 1 );

        var message = new jsonRPC('unsubscribe', { channel: channel });
        return maki.socket.send( message.toJSON() );
      },
      publish: function( channel , message ) {
        if (!maki.socket) { maki.sockets.connect(); }


      },
      disconnect: function() {
        if (maki.socket) {
          // unbind onclose, onmessage
          maki.socket.onclose = null;
          maki.socket.onmessage = null;

          // must happen after onclose event is unbound
          maki.socket.close();
          maki.socket = null;
        }
      },
      connect: function() {
        maki.sockets.disconnect();

        var retryTimes = [1000, 5000, 10000, 30000, 60000, 120000, 300000, 600000, 86400000]; //in ms
        var retryIndex = 0;
        
        var path = 'ws://' + window.location.host + window.location.pathname;
        maki.socket = new WebSocket( path );
        maki.socket.onclose = function onClose() {
          console.log('lost connection, reconnect... ');
          // TODO: randomize reconnection timeout buffer
          if (retryIndex < retryTimes.length) {
            console.log('retrying in ' + retryTimes[ retryIndex ] + 'ms');
            setTimeout( maki.sockets.connect , retryTimes[ retryIndex ] );
          } else {
            console.log('failed for the last time.  not attempting again.');
            retryTimes[ retryIndex++ ];
          }
        };
        maki.socket.onmessage = function onMessage(msg) {
          try {
            var data = JSON.parse( msg.data );
          } catch (e) {
            var data = {};
          }

          // experimental JSON-RPC implementation
          if (data.jsonrpc === '2.0') {
            switch (data.method) {
              case 'ping':
                console.log('was ping, playing pong');
                maki.socket.send(JSON.stringify({
                  'jsonrpc': '2.0',
                  'result': 'pong',
                  'id': data.id
                }));
              break;
              case 'patch':
                // update database
                console.log( data );
                
                _.filter( maki.collections , function( c ) {
                  console.log('checking ', c , data.params.channel)
                  return c.path == data.params.channel;
                } ).forEach(function( c ) {
                  console.log('executing ', c );
                  maki.collections[ c.name ].patch( data.params.ops );
                });
                
              break;
              default:
                console.log('unhandled jsonrpc method ' , data.method);
              break;
            }
          } else {
            
          }
        };
        maki.socket.onopen = function onOpen() {
          // this is redundant, as the connection will already be subscribed
          // however, we need to modify internal stores, so call it anyways
          maki.sockets.subscribe( window.location.pathname );
        };
      }
    }
};

function DataBinder( objectID ) {
  var pubSub = $({});
  
  var attribute = 'bind-' + objectID;
  var message = objectID + ':change';
  
  $(document).on('change', '[data-' + attribute + ']', function(e) {
    var $input = $(this);
    pubSub.trigger( message , [ $input.data( attribute ) ] , $input.val() );
  });
  
  pubSub.on( message , function(e, property, value) {
    $('[data-' + attribute + '=' + property + ']').each(function() {
      var $bound = $(this);
      if ( $bound.is('input, textarea, select') ) {
        $bound.val( value );
      } else {
        $bound.html( value );
      }
    });
  });
}

var MakiDB = function() {};

// naïve implementation of Resources
// TODO: use PouchDB or something similar?
var Resource = function( name , path ) {
  this.name = name;
  this.path = path;
  this._collection = [];
}
Resource.prototype.create = function( doc ) {
  this._collection.push( doc );
}
Resource.prototype.query = function( q ) {
  return _.where( this._collection , q );
}
Resource.prototype.get = function( id ) {
  return _.find( this._collection , function( doc ) {
    return doc._id == id;
  });
}
Resource.prototype.patch = function( ops ) {
  console.log('patching', ops );
  jsonpatch.apply( this._collection , ops );
}
Resource.prototype.sync = function() {
  var self = this;
  $.ajax({
    async: false,
    type: 'GET',
    url: self.path,
    dataType: 'json',
    success: function(obj) {
      console.log('received', obj);
      self._collection = obj;
    }
  });
}

$(window).on('ready', function() {
  
  $.ajax({
    type: 'OPTIONS',
    url: '/'
  }).done(function(data) {
    if (!data || !data.resources) return console.log('failed to acquire resource list; disabling fancy stuff.');
    if (!data.config) return console.log('failed to acquire server config; disabling fancy stuff.');
    
    maki.config = data.config;
    
    maki.resources = data.resources;
    maki.resources.forEach(function(resource) {
      // only support routing for lists and singles
      [ 'query', 'get' ].forEach(function(m) {
        var path = resource.paths[ m ];
        if (path) maki.templates[ path ] = resource.templates[ m ];
      });
      
      console.log(resource);
      
      //maki.collections[ resource.name ] = new PouchDB( resource.name );
      maki.collections[ resource.name ] = new Resource( resource.name , '/' + resource.collection );
      maki.collections[ resource.name ].sync();
      
      // observers must be bound _after_ sync
      var c = maki.collections[ resource.name ];
      Object.observe( maki.collections[ resource.name ]._collection , function( changes ) {
        console.log('observed changes: ' , changes);
        
        var selector = '*[data-model="'+c.name+'"][data-path="'+ c.path +'"]';
        console.log('selector', selector);
        
        // hacky hack
        $( selector ).replaceWith('<h1>LOL</h1>');
        
      });
      
    });
    
    // server is online!
    maki.$viewport = $('[data-for=viewport]');
    maki.sockets.connect();
    
    // exit instead of binding client view handler
    if (!maki.config.views || !maki.config.views.client || maki.config.views.client !== true) return console.log('client view rendering disabled.');
    
    $('a:not([href="'+window.location.pathname+'"])').removeClass('active');
    //$('a[href="'+window.location.pathname+'"]').addClass('active');

    // bind pushState stuff
    $( document ).on('click', 'a', function(e) {
      e.preventDefault();
      var $a = $(this);
      var href = $a.attr('href');
      
      var template;
      Object.keys(maki.templates).forEach(function(route) {
        // HACK: don't bother matching routes of almost-zero length
        // TODO: fix this
        if (href.length <= 1) return template = 'index';
        
        var string = route;
        var regex = new RegExp( eval( string ) );
        // TODO: do not match '/' –- see bugfix at top of this loop
        if (regex.test( href )) template = maki.templates[ route ];
      });
      
      // TODO: use local factory / caching mechanism
      $.ajax({
          url: href
        , async: false
      }).always(function( results ) {
        if (!results) template = '500';

        maki.sockets.unsubscribe( window.location.pathname );
        maki.sockets.subscribe( href );

        var obj = {};
        obj[ template ] = results;
        
        maki.$viewport.html( Templates[ template ]( obj ) );
        
        $('a.active').removeClass('active');
        $a.addClass('active');
        
        history.pushState({}, '', href );
      });

      return false;
    });
  });
});

maki.angular = {
  controller: function() { return this; },
  directive:  function() { return this; }
}

maki.angular.controller('mainController', function( $scope ) {
  
  $scope.$on('$destroy', function() {
     window.onbeforeunload = maki.sockets.disconnect;
  });
  
  // TODO: use pubsub
  $scope.$on('$locationChangeStart', function(event) {
    // hack to collapse navbar on navigation
    $('.navbar-collapse').removeClass('in').addClass('collapse');

    // TODO: unsubscribe, NOT disconnect
    //maki.sockets.unsubscribe();
    maki.sockets.disconnect();

  });
  $scope.$on('$locationChangeSuccess', function(event) {
    // TODO: use subscribe, and subscribe to all resources on page!
    maki.sockets.connect();
    //maki.sockets.subscribe();
  });
});

maki.angular.controller('headerController', function( $scope , $location ) {
  $scope.isActive = function (viewLocation) {
    return viewLocation === $location.path();
  };
});

maki.angular.directive('tooltipped', function() {
  return {
      restrict: 'C'
    , link: function( scope , element ) {
        $( element ).tooltip({
          container: 'body'
        });  
      }
  }
}).directive('code', function() {
  return {
    restrict: 'E',
    link: function( scope , element ) {
      $( element ).each(function(i, block) {
        hljs.highlightBlock(block);
      });
    }
  }
}).directive('headroom', function() {
  return {
    restrict: 'EA',
    scope: {
      tolerance: '=',
      offset: '=',
      classes: '='
    },
    link: function(scope, element) {
      var options = {};
      angular.forEach(Headroom.options, function(value, key) {
        options[key] = scope[key] || Headroom.options[key];
      });
      var headroom = new Headroom(element[0], options);
      headroom.init();
      scope.$on('destroy', function() {
        headroom.destroy();
      });
    }
  };
});
