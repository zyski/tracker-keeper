'use strict';

angular.module('myApp.view-admin', ['ngRoute', 'angularModalService'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/admin', {
    templateUrl: 'view-admin/view-admin.html',
    controller: 'viewAdminCtrl'
  });
}])

.controller('viewAdminCtrl', ['$scope', '$routeParams', 'ModalService', 'TaskList', 'ShiftList',
	function($scope, $routeParams, ModalService, TaskList, ShiftList) {

  $scope.fileNameChanged = function (elm) {
    if (elm.files) {
      var data   = null,
          reader = new FileReader(),
          time = Date.now();

      $scope.importDataStatus = "Running...";

      // Run event after file read
      reader.onload = function(e) {
        data = angular.fromJson(e.target.result);
        //todo: validate?
        // store values
        for (var key in data) {
          localStorage.setItem(key, data[key]);
        }

        $scope.importDataStatus = "Completed in " + (Date.now() - time) + "ms";
        $scope.$apply();
      };

      // Read in file
      reader.readAsText(elm.files[0]);
      $scope.$apply();
    }
  }

  // todo: move this to TaskList
  function copyBilling (taskId, work) {
    var task = TaskList.findId(taskId),
        obj  = work || {};
    if (task) {
      obj.taskId      = task.id;
      obj.rateHour    = task.rateHour;
      obj.rateUnit    = task.rateHour;
      obj.projectName = task.projectName;
    }
    return obj;
  }

  $scope.recalcWork = function () {
    var task,
        time = Date.now();

    $scope.recalcWorkStatus = "Running...";

    // Update all work on all shifts
    ShiftList.shifts.forEach(function (sx, si, sa) {
      sx.work.forEach(function (wx, wi, wa) {
        copyBilling(wx.taskId, wx);
      });
    });

    // Save shifts from in memory copy
    ShiftList.saveShiftsCache();
    $scope.recalcWorkStatus = "Completed in " + (Date.now() - time) + "ms";
  };


  $scope.init = function () {
    // Blob to hold localStorage data
    var data = new Blob([angular.toJson(localStorage)], {type: 'text/json'});
    // Turn into a downloadable URL
    $scope.downloadUrl = URL.createObjectURL(data);
  };

  // Initialize
  $scope.init();

}]);

