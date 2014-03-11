/*/var maki = angular.module('maki', ['ngRoute', 'ngResource']);
maki.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true);
  $routeProvider.when('/examples', {
    controller: 'Project',
    // function that returns HTML. ;)
    template: function(param, path) {
      console.log(param);
      console.log(path);
      return '<h1>/test</h1>';
    }
  }).otherwise({
    // function that returns HTML. ;)
    template: function(param, path) {
      console.log(param);
      console.log(path);
      return '<h1>LEL!</h1>';
    }
  });
}]);

maki.factory('Project', ['$resource', function($resource) {
  return $resource('/projects');
}]);

maki.controller('Project', ['$scope', function($scope) {

}]);/*/

$('.tooltipped').tooltip({
  container: 'body'
});