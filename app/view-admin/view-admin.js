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

  $scope.fileNameChanged = function (elm) {
    if (elm.files) {
      // read in file
      var data = null;

      var reader = new FileReader();
      reader.onload = function(e) {
        data = angular.fromJson(e.target.result);

        //todo: validate?

        // store values
        for (var key in data) {
          localStorage.setItem(key, data[key]);
        }

      };
      reader.readAsText(elm.files[0]);
    }
  }

  $scope.init = function () {
    // Blob to hold localStorage data
    var data = new Blob([angular.toJson(localStorage)], {type: 'text/json'});
    // Turn into a downloadable URL
    $scope.downloadUrl = URL.createObjectURL(data);
  };

  // Initialize
  $scope.init();

}]);

