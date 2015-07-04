'use strict';

angular.module('myApp.view-admin', ['ngRoute', 'angularModalService'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/admin', {
    templateUrl: 'view-admin/view-admin.html',
    controller: 'viewAdminCtrl'
  });
}])

.controller('viewAdminCtrl', ['$scope', '$routeParams', '$location', '$document', 'ModalService',
	function($scope, $routeParams, $location, $document, ModalService, $firebaseObject) {

  $scope.backup = function () {

  };

  $scope.init = function () {
    $scope.localData = angular.toJson(localStorage);
  };

  // Initialize
  $scope.init();

}]);

