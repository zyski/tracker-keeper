'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'ui.bootstrap',
  'angularModalService',
  'myApp.view-task',
  'myApp.view-timesheet',
  'myApp.view-admin',
  'myApp.version',
  'myApp.zyski'
])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/timesheet'});
}]);

