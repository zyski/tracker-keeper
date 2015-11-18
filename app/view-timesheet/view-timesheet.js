'use strict';

var myModule = angular.module('myApp.view-timesheet', [])

myModule.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/timesheet/:timesheetId?', {
    templateUrl: 'view-timesheet/view-timesheet.html',
    controller: 'viewTimesheetCtrl'
  });
}]);

myModule.controller('viewTimesheetCtrl', ['$scope', '$filter', '$route', '$routeParams', '$location', '$document', 'ModalService', 'ShiftList', 'TaskList', 'focus', 
  function($scope, $filter, $route, $routeParams, $location, $document, ModalService, ShiftList, TaskList, focus) {

  $scope.saveRecord = function () {
    ShiftList.save($scope.record);
    $scope.record = ShiftList.findId($scope.dt.toISODateString());
    $scope.master = angular.copy($scope.record);
    $scope.runSummaryReport();
    $scope.reminders = TaskList.findRem();
    $scope.deadlines = TaskList.findDeadline();
  };

  $scope.revertRecord = function () {
    angular.copy($scope.master, $scope.record);
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
        if (result || result === '') {
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
        // this FY
        $scope.summary.start = new Date($scope.dt.getMonth() < 6 ? $scope.dt.getFullYear() - 1 : $scope.dt.getFullYear(), 6, 1);
        $scope.summary.end = new Date($scope.dt);
        break;

      case 4:
        // last FY
        $scope.summary.start = new Date($scope.dt.getMonth() < 6 ? $scope.dt.getFullYear() - 2 : $scope.dt.getFullYear() - 1, 6, 1);
        $scope.summary.end = new Date($scope.summary.start.getFullYear() + 1, 5, 30);
        break;

      case 5:
        // Last seven days
        $scope.summary.start = new Date($scope.dt.getFullYear(), $scope.dt.getMonth(), $scope.dt.getDate() - 6);
        $scope.summary.end = new Date($scope.dt);
        break;

      case 6:
        // Last fourteen days
        $scope.summary.start = new Date($scope.dt.getFullYear(), $scope.dt.getMonth(), $scope.dt.getDate() - 13);
        $scope.summary.end = new Date($scope.dt);
        break;

      case 7:
        // Last twenty days
        $scope.summary.start = new Date($scope.dt.getFullYear(), $scope.dt.getMonth(), $scope.dt.getDate() - 19);
        $scope.summary.end = new Date($scope.dt);
        break;

      case 8:
        // Last 365 days
        $scope.summary.start = new Date($scope.dt.getFullYear(), $scope.dt.getMonth(), $scope.dt.getDate() - 364);
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

    // Generate an overall summary
    $scope.summary.total = {};
    $scope.summary.total.projects = { duration: 0.0, units: 0.0, income: 0.0 };
    $scope.summary.total.other = { duration: 0.0, units: 0.0, income: 0.0 };
    for (var id in $scope.summary.report) {
      if (id === 'null') {
        $scope.summary.total.other.duration += $scope.summary.report[id].duration;
        $scope.summary.total.other.units += $scope.summary.report[id].units;
        $scope.summary.total.other.income += $scope.summary.report[id].income;
      } else {
        $scope.summary.total.projects.duration += $scope.summary.report[id].duration;
        $scope.summary.total.projects.units += $scope.summary.report[id].units;
        $scope.summary.total.projects.income += $scope.summary.report[id].income;
      }
    }

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
    $scope.summary.types = ['Today', 'This Week', 'This Month', 'This FY', 'Last FY', 'Last 7 days', 'Last 14 days', 'Last 20 days', 'Last 365 days'];
    $scope.summary.typeName = $scope.summary.types[$scope.settings.summary.type];
    $scope.summary.report = {};
    $scope.summary.total = {};
    $scope.summary.start = {};
    $scope.summary.end = {};

    $scope.record = ShiftList.findId($scope.dt.toISODateString());
    $scope.master = angular.copy($scope.record);
    $scope.runSummaryReport();
    saveSettings();
    
    $scope.reminders = TaskList.findRem();
    $scope.deadlines = TaskList.findDeadline();
    
    focus('newWorkDesc');
  };

  // Initialize
  $scope.init();

}]);

