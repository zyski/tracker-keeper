'use strict';

angular.module('myApp.view-report', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/report', {
    templateUrl: 'view-report/view-report.html',
    controller: 'viewRptCtrl'
  });
}])

.controller('viewRptCtrl', ['$scope', '$routeParams', '$location', 'cfWork', 'moment', 'hcSeries', 'TaskList',
	function($scope, $routeParams, $location, cfWork, moment, hcSeries, TaskList) {

  $scope.debug = function (value) {
    console.debug('debug', value);
  };

  var dims, groups, weekdays = 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'.split(',');


  $scope.changeSort = function (predicate) {
    $scope.sort.field = predicate;
    $scope.sort.reverse = !$scope.sort.reverse;
  };

  // Builds an array of objects in form { key: '', value: [] }
  function dayRanges () {
    // todo: has to build the ranges relvative to a particular day
    // e.g. you are looking at a particular day for a timesheet

    var eod = moment().endOf('day').valueOf();
    var startFY = moment();
    var endFY;
    startFY.month() < 6 ? startFY.startOf('year').subtract(6, 'months') : startFY.startOf('year').add(6, 'months');
    endFY = startFY.clone().add(1,'years').subtract(1,'ms');

    return [
      {key: 'All', value: null},
      {key: 'Today', value: [moment().startOf('day').valueOf(), eod]},
      {key: 'This Week', value: [moment().startOf('week').valueOf(), moment().endOf('week').valueOf()]},
      {key: 'This Month', value: [moment().startOf('month').valueOf(), moment().endOf('month').valueOf()]},
      {key: 'This FY', value: [startFY.valueOf(), endFY.valueOf()]},
      {key: 'Last FY', value: [startFY.subtract(1,'years'),endFY.subtract(1,'years')]},
      {key: 'Last 7 days',   value: [moment().startOf('day').subtract(6, 'days').valueOf(), eod]},
      {key: 'Last 14 days',  value: [moment().startOf('day').subtract(13, 'days').valueOf(), eod]},
      {key: 'Last 20 days',  value: [moment().startOf('day').subtract(19, 'days').valueOf(), eod]},
      {key: 'Last 365 days', value: [moment().startOf('day').subtract(364, 'days').valueOf(), eod]}
    ];
  };


  // Helper function to find a value in an array
  function lookup (key, array) {
    let value = null;
    array.some(function (x) {
      if (x.key === key) {
        value = x.value;
        return true;  // break out
      }
    });
    return value;
  }


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
    $scope.taskTotals = { hours: 0.0, units: 0.0, income: 0.0 };
    groups.task.all().forEach(function (x, i, a) {
      $scope.tasks.push({
        name: x.key, 
        hours: x.value.hours,
        units: x.value.units,
        income: x.value.income
      });
      $scope.taskTotals.hours += x.value.hours;
      $scope.taskTotals.units += x.value.units;
      $scope.taskTotals.income += x.value.income;
    });
  };

  $scope.rebuildAll = function () {
    $scope.rebuildSeries();
    $scope.rebuildTasks();
  };


  // Filters
  $scope.filterProject = function () {
    // Adjust filters
    dims.project.filter(lookup($scope.filters.project, $scope.selects.projects));

    // Rebuild scope variables
    $scope.rebuildAll();    
  };


  // todo: this need to rebuild the crossfilter to re-query
  // work from the period selected. This will cut down the 
  // data substantially.
  $scope.filterDay = function () {
    // Re-create the crossfilter
    let range = lookup($scope.filters.day, $scope.selects.dates) || [0, Date.now()];
    let cf = cfWork.create(range);
    dims = cf.dims;
    groups = cf.groups;

    // Rebuild scope variables
    $scope.rebuildAll();
  };


  $scope.filterBilled = function () {
    // Adjust filters
    dims.billed.filter(lookup($scope.filters.billed, $scope.selects.billed));

    // Rebuild scope variables
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
    $scope.selects.projects = TaskList.projects.map(function (x) {
      return {key: x, value: x};
    });
    $scope.selects.projects.unshift({key: 'All', value: null});
    $scope.selects.dates = dayRanges();
    $scope.selects.billed = [
      {key: 'All', value: null},
      {key: 'Billed', value: true},
      {key: 'Unbilled', value: false}
    ];

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

