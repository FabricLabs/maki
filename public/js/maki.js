var maki = angular.module('maki', ['ngRoute', 'ngResource']);
maki.config(function($routeProvider, $locationProvider, $resourceProvider) {
  
  // TODO: populate from endpoints
  var pages = [
    {
        name: 'index'
      , path: '/'
      , template: 'index'
    },
    {
        name: 'examples'
      , path: '/examples'
      , template: 'examples'
    },
    {
        name: 'people'
      , path: '/people'
      , template: 'people'
    },
    {
        name: 'person'
      , path: '/people/:usernameSlug'
      , template: 'person'
    },
    {
        name: 'login'
      , path: '/login'
      , template: 'login'
    },
    {
        name: 'register'
      , path: '/register'
      , template: 'register'
    },
    {
         name: '404'
       , path: ':path'
       , template: '404'
    }
  ];
  
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
        return Templates[ page.template ]( obj );
      }
    } ] );
  });

  // use the HTML5 History API
  $locationProvider.html5Mode(true);

});

maki.controller('mainController', function( $scope ) {

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
});
maki.controller('headerController', function( $scope , $location ) {
  $scope.isActive = function (viewLocation) {
    return viewLocation === $location.path();
  };
});
