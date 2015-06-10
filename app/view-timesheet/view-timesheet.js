'use strict';

var module = angular.module('myApp.view-timesheet', [])

module.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/timesheet/:timesheetId?', {
    templateUrl: 'view-timesheet/view-timesheet.html',
    controller: 'viewTimesheetCtrl'
  });
}]);

module.controller('viewTimesheetCtrl', ['$scope', '$filter', '$route', '$routeParams', '$location', '$document', 'ModalService', 'ShiftList', 'TaskList', 'focus', 
  function($scope, $filter, $route, $routeParams, $location, $document, ModalService, ShiftList, TaskList, focus) {

  $scope.saveRecord = function () {
    ShiftList.save($scope.record);
    $scope.record = ShiftList.findId($scope.dt.toISODateString());
    $scope.master = angular.copy($scope.record);
    $scope.runSummaryReport();
  };

  $scope.revertRecord = function () {
    $scope.record = angular.copy($scope.master);
  };

  $scope.deleteRecord = function () {
    // todo: add a warning message?
    ShiftList.delete($scope.record.id);
    $location.path('timesheet/');
  };

  $scope.prevDay = function () {
    $scope.dt.setDate($scope.dt.getDate() - 1);
    $location.path('timesheet/' + $scope.dt.toISODateString());
  };

  $scope.nextDay = function () {
    $scope.dt.setDate($scope.dt.getDate() + 1);
    $location.path('timesheet/' + $scope.dt.toISODateString());
  };

  $scope.recordChanged = function () {
    if (angular.equals($scope.record, $scope.master)) {
      return "btn-default";
    } else {
      return "btn-warning";
    }
  };

  /**
    * Manipulate a work record
    */
  $scope.addDuration = function (work) {
    work.duration += $scope.settings.durationRes;
    $scope.record.adjWork();
  };

  $scope.subDuration = function (work) {
    work.duration -= $scope.settings.durationRes;
    $scope.record.adjWork();
  };

  $scope.addStarted = function (work, index) {
    if (index == 0) {
      // Change the start time of the record
      $scope.record.started = new Date($scope.record.started.getTime() + $scope.settings.durationRes);
    } else {
      // Move the table row
      work = $scope.record.work[index];
      $scope.record.work[index] = $scope.record.work[index - 1];
      $scope.record.work[index - 1] = work;
    }
    $scope.record.adjWork();
  };

  $scope.subStarted = function (work, index) {
    if (index == 0) {
      // Change the start time of the record
      $scope.record.started = new Date($scope.record.started.getTime() - $scope.settings.durationRes);
    } else {

      if (index + 1 < $scope.record.work.length) {
        // Move the table row
        work = $scope.record.work[index];
        $scope.record.work[index] = $scope.record.work[index + 1];
        $scope.record.work[index + 1] = work;
      }
    }
    $scope.record.adjWork();
  };

  $scope.addWork = function (event) {
    if (event && event.which !== 13) {
      if ($scope.newWorkDesc === '') {
        $scope.newWorkTaskId = null;
        $scope.newWorkTaskText = '';
      }
      return;
    }

    // Removes everthing after the typeahead selection (and spaces).
    var pattern = new RegExp('^' + $scope.newWorkTaskText + ' *');
    $scope.newWorkDesc = $scope.newWorkDesc.replace(pattern, '');

    $scope.record.addWork({description: $scope.newWorkDesc, taskId: $scope.newWorkTaskId});
    $scope.newWorkDesc = '';
    $scope.newWorkTaskText = '';
    $scope.newWorkTaskId = null;
  };

  $scope.delWork = function (id) {
    $scope.record.delWork(id);
  };

  /**
    * General functions
    */
  $scope.setDurationRes = function (res) {
    $scope.settings.durationRes = res * 60000;
    saveSettings();
  };

  $scope.findTaskId = function (work) {
    ModalService.showModal({
      templateUrl: "components/zyski/findTaskId.html",
      controller: "findTaskIdCtrl",
      inputs: {
        currentId: work.taskId,
      }
    }).then(function(modal) {
      // modal now on screen
      modal.close.then(function(result) {
        if (result !== undefined) {
          work.taskId = result;
        }
      });
    });
  };

  $scope.editDesc = function (work) {
    ModalService.showModal({
      templateUrl: "components/zyski/editText.html",
      controller: "editTextCtrl",
      inputs: {
        title: 'Edit Comments',
        text: work.description,
      }
    }).then(function(modal) {
      // modal now on screen
      modal.close.then(function(result) {
        if (result) {
          work.description = result;
        }
      });
    });
  };

  // Return an array of tasks, used for typeahead
  $scope.findTaskName = function (text) {
    return TaskList.findName(text);
  };

  $scope.selectedTask = function (item, model, label) {
    $scope.newWorkTaskText = item.name;
    $scope.newWorkTaskId = item.id;
  };


  $scope.setSummaryReport = function (type) {
    if (type > -1 && $scope.summary.types.length) {
      $scope.settings.summary.type = type;
    }
    $scope.summary.typeName = $scope.summary.types[$scope.settings.summary.type];

    saveSettings();
    $scope.runSummaryReport();
  };


  $scope.runSummaryReport = function () {
    switch ($scope.settings.summary.type) {
      case 1:
        // this week (Monday-Sunday). Sunday=0 in javascript so change to 7 to make calcs easier
        var day = $scope.dt.getDay() || 7;
        $scope.summary.start = new Date($scope.dt.getFullYear(), $scope.dt.getMonth(), $scope.dt.getDate() + 1 - day);
        $scope.summary.end = new Date($scope.dt.getFullYear(), $scope.dt.getMonth(), $scope.dt.getDate() + 7 - day);
        break;

      case 2:
        // this calendar month
        $scope.summary.start = new Date($scope.dt.getFullYear(), $scope.dt.getMonth(), 1);
        $scope.summary.end = new Date($scope.dt.getFullYear(), $scope.dt.getMonth() + 1, 0);
        break;

      case 3:
        // Last seven days
        $scope.summary.start = new Date($scope.dt.getFullYear(), $scope.dt.getMonth(), $scope.dt.getDate() - 6);
        $scope.summary.end = new Date($scope.dt);
        break;

      case 4:
        // Last twenty days
        $scope.summary.start = new Date($scope.dt.getFullYear(), $scope.dt.getMonth(), $scope.dt.getDate() - 19);
        $scope.summary.end = new Date($scope.dt);
        break;

      case 0:
      default:
        // today
        $scope.summary.start = new Date($scope.dt);
        $scope.summary.end = new Date($scope.dt);
        break;
    };
    
    $scope.summary.report = ShiftList.reportProject($scope.summary.start, $scope.summary.end);
  };


  // Object to store user settings
  function Settings (json) {
    if (!json) json = {};
    // Timesheet date
    this.dt = new Date(json.dt) || new Date();
    // Time resolution
    this.durationRes = json.durationRes || 60000;
    // Summary report type
    this.summary = {};
    this.summary.type = 1;
    if (json.summary && json.summary.type > -1) {
      this.summary.type = json.summary.type;
    }
  }

  function loadSettings () {
    // Load settings
    if ('timesheet' in localStorage) {
      $scope.settings = new Settings(angular.fromJson(localStorage['timesheet']));
    } else {
      $scope.settings = new Settings();
    }
  }

  function saveSettings () {
    localStorage['timesheet'] = angular.toJson($scope.settings);
  }

  $scope.init = function () {
    $scope.dt = new Date();
    $scope.params = $routeParams;

    if ($scope.params.timesheetId) {
      // Use route
      $scope.dt = new Date($scope.params.timesheetId);
    } else {
      // Route to today
      $location.path('timesheet/' + $scope.dt.toISODateString());
      return;
    }

    loadSettings();

    // todo: rename these fields
    $scope.newWorkDesc = '';
    $scope.newWorkTaskText = '';
    $scope.newWorkTaskId = 0;
    $scope.newWorkTaskId = null;

    $scope.summary = {};
    $scope.summary.types = ['Today', 'This Week', 'This Month', 'Last 7 days', 'Last 20 days'];
    $scope.summary.typeName = $scope.summary.types[$scope.settings.summary.type];
    $scope.summary.report = {};
    $scope.summary.start = {};
    $scope.summary.end = {};

    $scope.record = ShiftList.findId($scope.dt.toISODateString());
    $scope.master = angular.copy($scope.record);
    $scope.runSummaryReport();
    saveSettings();
    
    $scope.tasks = TaskList.findDue();
    
    focus('newWorkDesc');
  };

  // Initialize
  $scope.init();

}]);

