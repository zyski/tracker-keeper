'use strict';

angular.module('myApp.view-task', ['ngRoute', 'angularModalService'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/task/:taskId?', {
    templateUrl: 'view-task/view-task.html',
    controller: 'viewTaskCtrl'
  });
}])

.controller('viewTaskCtrl', ['$scope', '$filter', '$routeParams', '$location', '$document', 'ModalService', 'TaskList', 'ShiftList', 'focus', 'selects', 'cfWork',
	function($scope, $filter, $routeParams, $location, $document, ModalService, TaskList, ShiftList, focus, selects, cfWork) {

  let dims, groups;

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
  function Settings (config) {
    if (!config) config = {};
    // Last task opened
    this.taskId = config.taskId || null;

    // Filter
    this.filters = config.filters || {};
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


  $scope.filterDay = function () {
    // Re-create the crossfilter and reset globals
    let range, cf;

    if ($scope.settings.filters.day === 'Unbilled') {
      // find all work, then filter to billed == false
      range = [0, Date.now()];
      cf = cfWork.create(range, $scope.record.id);
      cf.dims.billed.filterExact(false);
    } else {
      // find range
      range = selects.dates.find($scope.settings.filters.day) || [0, Date.now()];
      cf = cfWork.create(range, $scope.record.id);
    }

    dims = cf.dims;
    groups = cf.groups;
    
    $scope.report.start = range[0];
    $scope.report.end = range[1];
    $scope.report.data = dims.day.bottom(Infinity);

    $scope.report.sum = {};
    groups.task.all().some(function (x, i, a) {
      if (x.key === $scope.record.id) {
        $scope.report.sum = x.value;
        return true;
      }
    });

    saveSettings();
  };

  $scope.init = function () {
    $scope.params = $routeParams;
    loadSettings();

    if ($scope.params.taskId) {
      // Use route
      $scope.settings.taskId = $scope.params.taskId;
    } else {
      // Use last task viewed. NB: $location.path will route back to this 
      // view and reinitialise the controller.
      if ($scope.settings.taskId) {
        $location.path('task/' + $scope.settings.taskId);
        return;
      }
    }

    // Prime data for <select> elements
    $scope.selects = {};
    $scope.selects.dates = angular.copy(selects.dates.toArray());
    $scope.selects.dates.push({key: 'Unbilled', value: false});

    // Prime record being displayed
    $scope.record = TaskList.findId($scope.settings.taskId);
    if (!$scope.record) {
      $scope.record = TaskList.create();
    }
    $scope.master = angular.copy($scope.record);

    // Build Summary Report
    $scope.report = {};
    $scope.filterDay();

    // Other reports
    $scope.reminders = TaskList.findRem();
    $scope.deadlines = TaskList.findDeadline();
    
    // Starting field
    focus('taskName');
  };

  // Initialize
  $scope.init();

}]);

