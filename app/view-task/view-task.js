'use strict';

angular.module('myApp.view-task', ['ngRoute', 'angularModalService'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/task/:taskId?', {
    templateUrl: 'view-task/view-task.html',
    controller: 'viewTaskCtrl'
  });
}])

.controller('viewTaskCtrl', ['$scope', '$filter', '$routeParams', '$location', '$document', 'ModalService', 'TaskList', 'ShiftList', 'focus', 
	function($scope, $filter, $routeParams, $location, $document, ModalService, TaskList, ShiftList, focus) {

  $scope.openRecord = function () {

    ModalService.showModal({
      templateUrl: "components/zyski/findTaskId.html",
      controller: "findTaskIdCtrl",
      inputs: {
        currentId: $scope.record.id,
      }
    }).then(function(modal) {
      // modal now on screen
      modal.close.then(function(result) {
        if (result) {
          $scope.settings.taskId = result;
          $location.path('task/' + result);
        }
      });
    });
  }

  $scope.saveRecord = function () {
    var id = $scope.record.id;
    $scope.record = TaskList.save($scope.record);
    $scope.master = angular.copy($scope.record);
    if ($scope.record.id === id) {
      $scope.init();
    } else {
      $location.path('task/' + $scope.record.id);
    }
  };

  $scope.revertRecord = function () {
    angular.copy($scope.master, $scope.record);
  };

  $scope.createRecord = function () {
    $location.path('task/new');
  };

  $scope.recordChanged = function () {
    if (angular.equals($scope.record, $scope.master)) {
      return "btn-default";
    } else {
      return "btn-warning";
    }
  };

  // Object to store user settings
  function Settings (json) {
    if (!json) json = {};
    // Last task opened
    this.taskId = json.taskId || null;
    // Summary report type
    this.summary = {};
    this.summary.type = 1;
    if (json.summary && json.summary.type > -1) {
      this.summary.type = json.summary.type;
    }
  }

  function loadSettings () {
    // Load settings
    if ('task' in localStorage) {
      $scope.settings = new Settings(angular.fromJson(localStorage['task']));
    } else {
      $scope.settings = new Settings();
    }
  }

  function saveSettings () {
    localStorage['task'] = angular.toJson($scope.settings);
  }

  $scope.setSummaryReport = function (type) {
    if (type > -1 && $scope.summary.types.length) {
      $scope.settings.summary.type = type;
    }
    $scope.summary.typeName = $scope.summary.types[$scope.settings.summary.type];

    saveSettings();
    $scope.runSummaryReport();
  };


  $scope.runSummaryReport = function () {
    var now = new Date();
    switch ($scope.settings.summary.type) {
      case 1:
        // this week (Monday-Sunday). Sunday=0 in javascript so change to 7 to make calcs easier
        var day = now.getDay() || 7;
        $scope.summary.start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1 - day);
        $scope.summary.end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7 - day);
        break;

      case 2:
        // this calendar month
        $scope.summary.start = new Date(now.getFullYear(), now.getMonth(), 1);
        $scope.summary.end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;

      case 3:
        // Last seven days
        $scope.summary.start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        $scope.summary.end = new Date(now);
        break;

      case 4:
        // Last fourteen days
        $scope.summary.start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
        $scope.summary.end = new Date(now);
        break;

      case 5:
        // Last twenty days
        $scope.summary.start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 19);
        $scope.summary.end = new Date(now);
        break;

      case 6:
        // Last 365 days
        $scope.summary.start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 364);
        $scope.summary.end = new Date(now);
        break;

      case 0:
      default:
        // today
        $scope.summary.start = new Date(now);
        $scope.summary.end = new Date(now);
        break;
    };
    
    $scope.summary.report = ShiftList.reportTask($scope.record, $scope.summary.start, $scope.summary.end);
  };


  $scope.init = function () {
    $scope.params = $routeParams;
    loadSettings();

    if ($scope.params.taskId) {
      // Use route
      $scope.settings.taskId = $scope.params.taskId;
    } else {
      // Use last task viewed
      if ($scope.settings.taskId) {
        $location.path('task/' + $scope.settings.taskId);
        return;
      }
    }

    $scope.summary = {};
    $scope.summary.types = ['Today', 'This Week', 'This Month', 'Last 7 days', 'Last 14 days', 'Last 20 days', 'Last 365 days'];
    $scope.summary.typeName = $scope.summary.types[$scope.settings.summary.type];
    $scope.summary.report = {};
    $scope.summary.start = {};
    $scope.summary.end = {};

    $scope.record = TaskList.findId($scope.settings.taskId);
    if (!$scope.record) {
      $scope.record = TaskList.create();
    }
    $scope.master = angular.copy($scope.record);
    $scope.runSummaryReport();
    saveSettings();

    $scope.reminders = TaskList.findRem();
    $scope.deadlines = TaskList.findDeadline();
    focus('taskName');
  };

  // Initialize
  $scope.init();

}]);

