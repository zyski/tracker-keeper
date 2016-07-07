'use strict';

angular.module('myApp.view-report', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/report', {
    templateUrl: 'view-report/view-report.html',
    controller: 'viewRptCtrl'
  });
}])

.controller('viewRptCtrl', ['$scope', '$routeParams', '$location', 'ShiftList', 'hcSeries',
	function($scope, $routeParams, $location, ShiftList, hcSeries) {

  var cf,
      dims = {},
      groups = {};

  $scope.init = function () {
    // Create a crossfilter
    cf = crossfilter(ShiftList.work);

    // Dimensions 
    dims.day = cf.dimension(function(d) { 
      var dt = new Date(d.started);
      dt.setHours(0,0,0,0);
      
      var day = dt.getDay() || 7;
      if (day !== 0)
        return dt.setHours(-24 * (day - 1));
      else
        return dt.getTime();
    });

    dims.task = cf.dimension(function(d) { return d.taskId || '0'; });

    // Groups
    groups.dayHours = dims.day.group().reduceSum(function(d) {
      if (!d.taskId)
        return 0;
      else
        return (d.duration / 3600000).toFixed(2);
    });

    groups.taskHours = dims.task.group().reduceSum(function(d) {
      if (!d.taskId)
        return 0;
      else
        return (d.duration / 3600000).toFixed(1);
    });

    // Charts
    $scope.charts = {};

    $scope.charts.day = {};
    $scope.charts.day.series = hcSeries.convert(groups.dayHours);
    $scope.charts.day.init = {
      xAxis: {
        type: 'datetime'
      },
      title: {
        text: 'Billable Hours per Week'
      }
    };

    $scope.charts.task = {};
    $scope.charts.task.series = hcSeries.convert(groups.taskHours);
    $scope.charts.task.init = {
      xAxis: {
        type: 'category'
      },
      title: {
        text: 'Billable Tasks'
      }
    };



  };

  // Initialize
  $scope.init();

}]);

