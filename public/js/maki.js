var maki = angular.module('maki', ['ngRoute', 'ngResource']);
maki.config(function($routeProvider, $locationProvider, $resourceProvider) {
  
  var pages = [];
  $.ajax({
    async: false,
    url: '/',
    success: function(data) {
      pages = data;
    }
  });
  
  console.log( pages );
  
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
maki.controller('headerController', function( $scope , $location ) {
  $scope.isActive = function (viewLocation) {
    return viewLocation === $location.path();
  };
});
