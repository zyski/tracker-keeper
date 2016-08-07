'use strict';

angular.module('myApp.view-report', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/report', {
    templateUrl: 'view-report/view-report.html',
    controller: 'viewRptCtrl'
  });
}])

.controller('viewRptCtrl', ['$scope', '$routeParams', '$location', 'cfWork', 'moment', 'hcSeries', 'selects',
	function($scope, $routeParams, $location, cfWork, moment, hcSeries, selects) {

  var dims, groups;

  $scope.changeSort = function (predicate) {
    $scope.sort.field = predicate;
    $scope.sort.reverse = !$scope.sort.reverse;
  };

  function hcMapFuncIn (x, i, a) {
    if (angular.isString(x.key))
      return {name: x.key, y: x.value.income};
    else
      return {x: x.key, y: x.value.income};
  };

  function hcMapFuncHr (x, i, a) {
    if (angular.isString(x.key))
      return {name: x.key, y: x.value.hours};
    else
      return {x: x.key, y: x.value.hours};
  };


  // For each group rebuild the associated series
  $scope.rebuildSeries = function () {
    $scope.charts.week.seriesIn = hcSeries.convert(groups.week, null, hcMapFuncIn);
    $scope.charts.week.seriesHr = hcSeries.convert(groups.week, null, hcMapFuncHr);
  };

  $scope.rebuildTasks = function () {
    $scope.filterTask(null);

    // Populate Task array and create a grand total
    $scope.tasks = [];
    $scope.taskTotal = { hours: 0.0, units: 0.0, income: 0.0 };
    groups.task.all().forEach(function (x, i, a) {
      $scope.tasks.push({
        name: x.key, 
        hours: x.value.hours,
        units: x.value.units,
        income: x.value.income
      });
      $scope.taskTotal.hours += x.value.hours;
      $scope.taskTotal.units += x.value.units;
      $scope.taskTotal.income += x.value.income;
    });
  };

  $scope.rebuildAll = function () {
    $scope.rebuildSeries();
    $scope.rebuildTasks();
  };


  // Filters
  $scope.filterProject = function () {
    dims.project.filter(selects.projects.find($scope.filters.project));
    $scope.rebuildAll();
  };

  $scope.filterDay = function () {
    // Re-create the crossfilter and reset globals
    let range = selects.dates.find($scope.filters.day) || [0, Date.now()];
    let cf = cfWork.create(range);
    dims = cf.dims;
    groups = cf.groups;

    // Reset filters
    $scope.filters.project = 'All';
    $scope.filters.billed = 'All';

    $scope.rebuildAll();
  };

  $scope.filterBilled = function () {
    dims.billed.filter(selects.billed.find($scope.filters.billed));
    $scope.rebuildAll();
  };

  $scope.filterTask = function (value) {
    // Is filter already active? If so, cancel it
    if (value == null || $scope.filters.task == value) {
      $scope.filters.task = null;
      dims.task.filter(null);
      $scope.topWork = null;
    } else {
      $scope.filters.task = value;
      dims.task.filter(value);
      $scope.topWork = dims.day.top(Infinity);
    }

    // Rebuild series only - tasks won't change
    $scope.rebuildSeries();
  };

  // Generic filter
  // todo: refactory into global lib?
  $scope.filter = function (dim, select) {
    if (!select) {
      dims[dim].filterAll();
    } else if (angular.isArray(select)) {
      dims[dim].filterRange(select);
    } else {
      dims[dim].filterFunction(function(d) {
        if (d in select)
          return true;
        else
          return false;
      });
    }

    // Trigger charts to redraw
    $scope.rebuildAll();
  }

  $scope.init = function () {
    $scope.sort = {};
    $scope.sort.field = 'name';
    $scope.sort.reverse = false;

    $scope.selects = {},
    $scope.selects.projects = selects.projects.toArray();
    $scope.selects.dates = selects.dates.toArray();
    $scope.selects.billed = selects.billed.toArray();

    $scope.filters = {};
    $scope.filters.project = 'All';
    $scope.filters.day = 'Last 20 days';
    $scope.filters.billed = 'All';

    //
    // Charts
    //
    $scope.charts = {};
    $scope.charts.week = {};
    $scope.charts.week.init = {
      xAxis: {
        type: 'datetime'
      },
      yAxis: [{
        labels: {
          format: '${value}'
        },
        title: {
          text: ''
        }
      }, {
        labels: {
          format: '{value} hr'
        },
        title: {
          text: ''
        },
        opposite: true
      }],
      title: {
        text: ''
      },
      legend: {
        enabled: true
      }
    };

    // Create the crossfilter and prime charts, tables etc
    $scope.filterDay();
  };

  // Initialize
  $scope.init();

}]);

