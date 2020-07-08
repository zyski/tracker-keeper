'use strict';

angular.module('angular-hc', [])

.value('version', '0.1')


.directive('hcChart', function () {

  return {
    restrict: 'E',
    transclude: true,
    scope: true,
    template: '<div style="position:absolute; display:block; left:0; top:0; width:100%; height:100%;"></div><div ng-transclude ng-hide="true"></div>',
    controller: ['$scope', function($scope) { 
      var hc = $scope.highchart = {};
      var self = this;


      // Chart Options to be set <hc-options ngModel="">
      hc.options = {};

      self.setOptions = function (obj) {
        hc.options = obj || {};

        // Override series into custom array, will be re-added later
        if (hc.options.series) {
          hc.options.series.forEach(function(x, i, a) {
            self.addSeries({options: x});
          });
        }
        hc.options.series = [];

        // Override some default Options, unless set in options object
        if (!hc.options.credits) hc.options.credits = { enabled: false};
        if (!hc.options.legend) hc.options.legend = { enabled: false};
        if (!hc.options.xAxis) hc.options.xAxis = {};
        if (!hc.options.xAxis.type) hc.options.xAxis.type = 'linear';
        if (!hc.options.yAxis) hc.options.yAxis = { title: { text: '' }};
        if (!hc.options.chart) hc.options.chart = { type: 'column'};
        if (!hc.options.chart.events) hc.options.chart.events = {};
        if (!hc.options.plotOptions) hc.options.plotOptions = {};
        if (!hc.options.plotOptions.series) hc.options.plotOptions.series = {};
        if (!hc.options.plotOptions.series.events) hc.options.plotOptions.series.events = {};
        if (!hc.options.plotOptions.series.point) hc.options.plotOptions.series.point = {};
        if (!hc.options.plotOptions.series.point.events) hc.options.plotOptions.series.point.events = {};
        if (!hc.options.plotOptions.series.point.events.legendItemClick) hc.options.plotOptions.series.point.events.legendItemClick = function(e) { return false;};
        if (!hc.options.plotOptions.series.slicedOffset) hc.options.plotOptions.series.slicedOffset = 0;
        if (!hc.options.plotOptions.series.states) hc.options.plotOptions.series.states = {};

        /* Styling */
        if (!hc.options.chart.backgroundColor) hc.options.chart.backgroundColor = null;
        if (!hc.options.plotOptions.series.states.select) hc.options.plotOptions.series.states.select = {
          color: '#fff',
          borderWidth: '1',
          borderColor: '#333'
        };
        if (!hc.options.colours) hc.options.colors = ['#428bca', '#5cb85c', '#5bc0de', '#f0ad4e', '#d9534f'];
        if (!hc.options.chart.style) hc.options.chart.style = {
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          color: 'rgba(0,0,0,0.5)'
        };
        if (!hc.options.title) hc.options.title = {};
        if (!hc.options.title.align) hc.options.title.align = 0;
        if (!hc.options.title.style) hc.options.title.style = {
          color: '#333',
          fontWeight: '500',
          fontSize: '18px',
          padding: '1em 0',
          display: 'block'
        };
      };


      // Array of custom format series to render <hc-series ngModel="" options="">
      hc.series = [];
      self.addSeries = function (obj) {
        obj.options = obj.options || {};
        hc.series.push(obj);
      };


      // Update a model based on chart selection
      self.setSelect = function (ctrl) {
        hc.select = ctrl;
      };


    }], // controller



    link: function (scope, element, attrs) {
      var hc = scope.highchart;

      // Render a chart range selection when model updated
      // Note that selected points are rendered as part of the series
      if (hc.select) {
        hc.select.$render = function() {
          hc.obj.xAxis[0].removePlotBand('hc-select');

          var model = hc.select.$modelValue;

          if (!model)
            return;
          else if (angular.isArray(model)) {
            var min = model[0] || 0,
                max = model[1] || 0;

            hc.obj.xAxis[0].addPlotBand({
              id: 'hc-select',
              from: min,
              to: max,
              color: 'rgba(0, 0, 0, 0.12)'
            });
          }
        };


        // Allow point by point select and unselect
        hc.options.plotOptions.series.events.click = function (event) {

          var point = event.point,
              model = angular.copy(hc.select.$modelValue),
              key = point.name || point.x;

          if (!model) {
            model = {};
          } else if (angular.isArray(model)) {
            model = {};
          }

          if (!event.metaKey) {
            model = {};
          }

          if (point.selected) {
            delete model[key];
          } else {
            model[key] = true;
          }

          if (Object.keys(model).length === 0 && model.constructor === Object) 
            hc.select.$setViewValue(undefined);
          else
            hc.select.$setViewValue(model);

          hc.select.$render();

          return false;
        };

        // Click on background once to remove any selection
        hc.options.chart.events.click = function (event) {
          // Update ngModel back on hc-select ngModel 
          hc.select.$setViewValue(undefined);
          hc.select.$render();

          // prevent default functionality
          return false;
        };


        // Allow range selection to non category charts
        if (hc.options.xAxis.type !== 'category') {
          // Click and drag to make a selection
          hc.options.chart.zoomType = 'x';
          hc.options.chart.events.selection = function (event) {
            var min = event.xAxis[0].min,
                max = event.xAxis[0].max;

            // Update ngModel back on hc-select element
            hc.select.$setViewValue([min, max]);
            hc.select.$render();

            // prevent default zoom functionality
            return false;
          };

        } // Not category

      }


      // Setup a render for each series
      hc.series.forEach(function(x, i, a) {
        // Add the series back into the chart config object for initial rendering
        hc.options.series.push(x.options);
        
        // When the model changes render series to the chart
        x.ctrl.$render = function () {
          //console.log('render series', hc.select.$modelValue);

          if (hc.obj.series[i]) {

            var data = [];
            var select;

            if (!hc.select)
              select = {};
            else if (angular.isArray(hc.select.$modelValue))
              select = {};
            else if (angular.isObject(hc.select.$modelValue))
              select = hc.select.$modelValue;
            else
              select = {};

            // todo: needs some tidy up to support the various
            // point formats of HighCharts.
            if (angular.isArray(x.ctrl.$viewValue)) {
              x.ctrl.$viewValue.forEach(function (x, i, a) {
                if (x.name in select || x.x in select)
                  x.selected = true;
                else
                  x.selected = false;

                data.push(x);
              });
            } else {
              data = x.ctrl.$viewValue;
            }

            hc.obj.series[i].setData(data, true);
          } else {
            // todo: Update options with viewValue
            hc.obj.addSeries(x.options, true);
          }
        };

      });


      // Render the chart
      hc.obj = Highcharts.chart(element[0], hc.options);
      //hc.obj.reflow();
      //hc.obj.setSize(null, null, { duration: 0});

    } // link
  }

})

// Add one or more series to a chart
.directive('hcOptions', function () {
  return {
    restrict: 'E',
    require: '^hcChart',
    scope: {
      ngModel: '='
    },
    link: function (scope, element, attrs, ctrl) {
      ctrl.setOptions(scope.ngModel);
    } // link
  };
})


// Add one or more series to a chart
// <hc-series ng-model="array" hc-options="string|object"></hc-series>
// The ng-model must be in the array of objects Highcharts form
.directive('hcSeries', function () {
  return {
    restrict: 'E',
    require: ['^hcChart', 'ngModel'],
    link: function (scope, element, attrs, ctrl) {
      ctrl[0].addSeries({ 
        ctrl: ctrl[1],
        options: scope.$eval(attrs.hcOptions)
      });
    } // link
  };
})


// Select a point or drag select a range
.directive('hcSelect', function () {
  return {
    restrict: 'E',
    require: ['^hcChart', 'ngModel'],
    link: function (scope, element, attrs, ctrl) {
      ctrl[0].setSelect(ctrl[1]);
    } // link
  };
})


.factory('hcSeries', [function() {

  // Private Properties
  var hash = {};

  // Private Functions


  // Prototype
  Tools.prototype = {

    // Converts a series into Highcharts array of objects format
    // i.e. [{},{},{}]
    convert: function (array, top, map) {
      //todo: tidy this up, maybe category parameter?
      var mapfunc = map || function (x, i, a) {
        if (angular.isString(x.key))
          return {name: x.key, y: x.value};
        else
          return {x: x.key, y: x.value};
      };
      var hc = [];

      // Is array a crossfilter group object?
      if (array && array.all && array.top) {
        if (top)
          hc = array.top(top).map(mapfunc);
        else
          hc = array.all().map(mapfunc);
      } else {
        if (top && top !== Infinity)
          hc = array.filter(function (x, i, a) { return i < top }).map(mapfunc);
        else
          hc = array.map(mapfunc);
      }
      return hc;

    }

  };

  // Constructor
  function Tools (config) {

  }

  // Return an instance of the object
  return new Tools();

}])

