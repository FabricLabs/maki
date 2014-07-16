// stub for a proper class
var maki = {
    angular: angular.module('maki', ['ngRoute', 'ngResource'])
  , socket: null
  , sockets: {
      disconnect: function() {
        maki.socket.onclose = null;
        maki.socket.onmessage = null;
        maki.socket = null;
      },
      connect: function() {
        if (maki.socket) {
          maki.sockets.disconnect();
        }

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
      }
    }
};

maki.angular.config(function($routeProvider, $locationProvider, $resourceProvider) {
  
  var pages = [];
  $.ajax({
    async: false,
    type: 'OPTIONS',
    url: '/',
    success: function(data) {
      pages = data;
    }
  });
  
  pages.forEach(function(page) {
    $routeProvider.when.apply( this , [ page.path , {
      template: function( params ) {
        var self = this;
        var obj = {};

        $.ajax({
            url: self.location
          , success: function( results ) {
              obj[ page.name ] = results;
            }
          , async: false
        });
        
        // TODO: subscribe
        
        return Templates[ page.template ]( obj );
      }
    } ] );
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
  // TODO: use pubsub
  /*/$scope.$on('$locationChangeStart', function(event) {
    maki.sockets.connect();
  });/**/
  $scope.$on('$locationChangeSuccess', function(event) {
    maki.sockets.connect();
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
