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


.config(['$compileProvider', '$routeProvider', function($compileProvider, $routeProvider) {

  // Make blob objects safe.
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|blob):/);

  $routeProvider.otherwise({redirectTo: '/timesheet'});
}]);

