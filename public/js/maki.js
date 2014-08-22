// stub for jsonRPC class (shared)
var jsonRPC = function( method , params ) {
  this._method = method;
  this._params = params;
}
jsonRPC.prototype.toJSON = function(notify) {
  var self = this;
  return JSON.stringify({
    'jsonrpc': '2.0',
    'method': self._method,
    'params': self._params,
    'id': (notify === false) ? undefined : uuid.v1()
  });
}

// stub for a proper class
var maki = {
    angular: angular.module('maki', ['ngRoute', 'ngResource'])
  , socket: null
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

          console.log(data);
          // experimental JSON-RPC implementation
          if (data.jsonrpc === '2.0') {
            switch (data.method) {
              case 'ping':
                console.log('was ping, sending response');
                maki.socket.send(JSON.stringify({
                  'jsonrpc': '2.0',
                  'result': 'pong',
                  'id': data.id
                }));
              break;
            }
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

maki.angular.config(function($routeProvider, $locationProvider, $resourceProvider) {
  
  var resources = [];
  $.ajax({
    async: false,
    type: 'OPTIONS',
    url: '/',
    success: function(data) {
      resources = data;
    }
  });
  
  resources.forEach(function(resource) {
    Object.keys( resource.routes ).forEach(function( method ) {
      var path = resource.routes[ method ];
    
      $routeProvider.when.apply( this , [ path , {
        template: function( params ) {
          var self = this;
          var obj = {};

          // TODO: use local factory / caching mechanism
          $.ajax({
              url: self.location
            , success: function( results ) {
                obj[ resource.name ] = results;
              }
            , async: false
          });
          
          return Templates[ resource.template ]( obj );
        }
      } ] );
    });

    $routeProvider.otherwise({
      template: function() {
        return Templates['404']();
      }
    });
  });

  // use the HTML5 History API
  $locationProvider.html5Mode(true);

});

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
}).directive('tooltipped', function() {
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
maki.angular.controller('headerController', function( $scope , $location ) {
  $scope.isActive = function (viewLocation) {
    return viewLocation === $location.path();
  };
});
