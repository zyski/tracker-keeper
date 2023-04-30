'use strict';

angular.module('myApp.view-report', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/report', {
    templateUrl: 'view-report/view-report.html',
    controller: 'viewRptCtrl'
  });
}])

.controller('viewRptCtrl', ['$scope', '$routeParams', '$location', 'ShiftList', 'TaskList', 'hcSeries',
	function($scope, $routeParams, $location, ShiftList, TaskList, hcSeries) {

  var cf,
      dims = {},
      groups = {},
      filters = {},
      weekdays = 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'.split(',');

  // For each group rebuild the associated series
  $scope.rebuildSeries = function () {
    //$scope.charts.week.series = hcSeries.convert(groups.weekHours);
    //$scope.charts.week.seriesIn = hcSeries.convert(groups.weekIncome);
    //$scope.charts.weekday.series = hcSeries.convert(groups.weekday);
    //$scope.charts.taskHours.series = hcSeries.convert(groups.taskHours, 10);
    //$scope.charts.taskUnits.series = hcSeries.convert(groups.taskUnits, 10);
    //$scope.charts.taskIncome.series = hcSeries.convert(groups.taskIncome, 10);
    $scope.charts.projHours.series = hcSeries.convert(groups.projHours);
    $scope.charts.projUnits.series = hcSeries.convert(groups.projUnits);
    $scope.charts.projIncome.series = hcSeries.convert(groups.projIncome);

    // List some detailed data
    //$scope.topWork = dims.week.top(20);
    $scope.projects = groups.projIncome.all();

    // Trim zero income tasks
    $scope.tasks = [];
    groups.task.all().forEach(function (x, i, a) {
      if (x.value.income[7] > 0.009 || x.value.income[7] < -0.009)
        $scope.tasks.push(x);
    });


    $scope.totIncome = groups.projIncome.all().reduce(function (x, y) {
      return x + y.value;
    }, 0);
  };


  // Filters
  $scope.filterProject = function (index) {

    // Adjust filters
    if (index == undefined)
      dims.project.filterAll();
    else {
      dims.project.filterExact($scope.projects[index].key);
      console.log('project', index, $scope.projects[index]);
    }

    // Rebuild scope variables
    $scope.rebuildSeries();
  };

  $scope.filter = function (dim, select) {

    console.log('filter', dim, select);

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
    $scope.rebuildSeries();
  }


  $scope.init = function () {
    // Create a crossfilter
    cf = crossfilter(ShiftList.reportWork());


    // Dimensions 
    //

/*
    dims.week = cf.dimension(function(d) {
      // Make the start of the week Monday
      var dt = new Date(d.started);
      dt.setHours(0,0,0,0);

      var day = dt.getDay() || 7;
      
      if (day == 1)
        return dt.getTime();
      else
        return dt.setHours(-24 * (day - 1),0,0,0);
    });
*/


    dims.day =  cf.dimension(function(d) {
      var dt = new Date(d.started);
      return dt.setHours(0,0,0,0);
    });

    dims.weekday = cf.dimension(function(d) {
      return d.started.getDay();
    });

    dims.project = cf.dimension(function(d) {
      return d.projectName || 'No Project';
    });

    dims.task = cf.dimension(function(d) {
      if (d.taskRef) {
        return d.taskRef.name;
      } else {
        return 'No Task';
      }
    });


    // Groups
    //
    groups.dayHours = dims.day.group().reduceSum(function (d) {
      return (d.duration / 3600000);
    })

    groups.dayUnits = dims.day.group().reduceSum(function (d) {
      return d.units;
    });

    groups.dayIncome = dims.day.group().reduceSum(function (d) {
      return d.income;
    });

    groups.weekDayHours = dims.day.group().reduceSum(function (d) {
      return (d.duration / 3600000);
    });


    // Sum duration, units, income simultaneously
    groups.task = dims.task.group().reduce(
      function reduceAdd (p, v) {
        p.duration[v.started.getDay()] += v.duration;
        p.duration[7] += v.duration;

        p.units[v.started.getDay()] += v.units;
        p.units[7] += v.units;

        p.income[v.started.getDay()] += v.income;
        p.income[7] += v.income;

        return p;
      },

      function reduceRemove (p, v) {
        p.duration[v.started.getDay()] -= v.income;
        p.duration[7] -= v.income;

        p.units[v.started.getDay()] -= v.units;
        p.units[7] -= v.units;

        p.income[v.started.getDay()] -= v.income;
        p.income[7] -= v.income;

        return p;
      },

      function reduceInitial () {
        return { 
          duration: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
          units:    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
          income:   [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
        };
      }

    );


    groups.projHours = dims.project.group().reduceSum(function (d) {
      return (d.duration / 3600000);
    });

    groups.projUnits = dims.project.group().reduceSum(function (d) {
      return d.units;
    });

    groups.projIncome = dims.project.group().reduceSum(function (d) {
      return d.income;
    });

/*
    groups.weekHours = dims.week.group().reduceSum(function(d) {
      return (d.duration / 3600000).toFixed(2);
    });

    groups.weekIncome = dims.week.group().reduceSum(function(d) {
      return d.income;
    });

    groups.weekday = dims.weekday.group().reduceSum(function(d) {
      return (d.duration / 3600000).toFixed(2);
    });


    groups.taskHours = dims.task.group().reduceSum(function(d) {
      return (d.duration / 3600000).toFixed(1);
    });

    groups.taskUnits = dims.task.group().reduceSum(function(d) {
      return d.units;
    });

    groups.taskIncome = dims.task.group().reduceSum(function(d) {
      return d.income;
    });
*/

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
        text: 'Billable Hours per Week'
      }
    };

    $scope.charts.weekday = {};
    $scope.charts.weekday.init = {
      chart: {
        type: 'bar'
      },
      xAxis: {
        type: 'category',
        categories: weekdays
      },
      title: {
        text: ''
      }
    };

    $scope.charts.taskHours = {};
    $scope.charts.taskHours.init = {
      chart: {
        type: 'bar'
      },
      xAxis: {
        type: 'category'
      },
      title: {
        text: 'Hours per Task'
      }
    };

    $scope.charts.taskUnits = {};
    $scope.charts.taskUnits.init = {
      chart: {
        type: 'bar'
      },
      xAxis: {
        type: 'category'
      },
      title: {
        text: 'Units per Task'
      }
    };

    $scope.charts.taskIncome = {};
    $scope.charts.taskIncome.init = {
      chart: {
        type: 'bar'
      },
      xAxis: {
        type: 'category'
      },
      title: {
        text: 'Income per Task'
      }
    };

    $scope.charts.projHours = {};
    $scope.charts.projHours.init = {
      chart: {
        type: 'bar'
      },
      xAxis: {
        type: 'category'
      },
      title: {
        text: 'Hours per Project'
      }
    };

    $scope.charts.projUnits = {};
    $scope.charts.projUnits.init = {
      chart: {
        type: 'bar'
      },
      xAxis: {
        type: 'category'
      },
      title: {
        text: 'Units per Project'
      }
    };

    $scope.charts.projIncome = {};
    $scope.charts.projIncome.init = {
      chart: {
        type: 'bar'
      },
      xAxis: {
        type: 'category'
      },
      title: {
        text: 'Income per Project'
      }
    };

    $scope.rebuildSeries();
  };

  // Initialize
  $scope.init();

}]);

