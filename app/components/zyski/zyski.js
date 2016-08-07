'use strict';

Date.prototype.toISODateString = function() {
   var yyyy = this.getFullYear().toString();
   var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based
   var dd  = this.getDate().toString();
   return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]); // padding
};

var myModule = angular.module('myApp.zyski', []);

myModule.filter('time', [function() {
  return function(ms, units) {

    if (units === 'minutes') {
      ms = ms * 60000;
    } else if (units === 'hours') {
      ms = ms * 3600000;
    }

    // Format as '-hh:mm'
    var neg = ms < 0 ? '-' : ' ';
    ms = Math.abs(ms);
    var h = Math.floor(ms / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    h = h < 10 ? '0' + h : h;
    m = m < 10 ? '0' + m : m;

    return neg + h + ':' + m;
  }

}]);


myModule.filter('taskName', ['TaskList', function(TaskList) {
  return function(taskId) {
    var task = TaskList.findId(taskId);
    if (task) {
      return task.name;
    } else {
      return 'No Task';
    }
  }
}]);


myModule.filter('dueInDays', [function() {
  //todo: convert into work days
  return function(due) {
    if (due) {
      return ((due.getTime() - Date.now()) / 86400000 + 1).toFixed(1);
    } else {
      return '';
    }
  }
}]);


/**
  * Make moment an angular service
  */
myModule.factory('moment', ['$window', function($window) {
  if(!$window.moment){
    console.error('moment: not available');
  }
  return $window.moment;
}]);


/**
  * Make crossfilter an angular service
  */
myModule.factory('crossfilter', ['$window', function($window) {
  if(!$window.crossfilter){
    console.error('crossfilter: not available');
  }
  return $window.crossfilter;
}]);


/**
  * Hold all object keys
  * NB: A key should never start at zero (due to being a falsey)! 
  */
myModule.factory('Keys', [function() {

  // Private Properties 
  var keys = {};

  // Private Functions
  function save () {
    localStorage['Keys'] = angular.toJson(keys);
  }

  // Public functions
  function next (value) {
    if (value in keys) {
      keys[value]++;
    } else {
      keys[value] = 1;
    }
    save();
    return keys[value];
  }

  //
  function current (value) {
      return keys[value];
  }

  // Contructor
  if ('Keys' in localStorage) {
    keys = angular.fromJson(localStorage['Keys']);
  }

  // Return the public functions
  return {
    next: next,
    current: current
  }

}]);

/**
  * Task
  */
myModule.factory('Task', ['Keys', function(Keys) {

  // Private Properties 
  var futureDate = Date.now() + 86400000 * 365 * 10;
  // Private Functions

  // Prototype
  Task.prototype = {
    // number: deadline date converted to ms.
    get getTimeDeadline () {
      return this.deadline ? this.deadline.getTime() : futureDate;
    },

    // number: reminder date converted to ms.
    get getTimeRem () {
      return this.reminder ? this.reminder.getTime() : futureDate;
    }
  }

  // Constructor
  function Task (json) {
    if (!json) json = {};

    // number: Unique identifier
    this.id = json.id || Keys.next('Task');

    // date: Local Date / Time in milliseconds
    if (json.created) {
      this.created = new Date(json.created);
    } else {
      this.created = new Date();
    }

    //this.created = json.created || Date.now();

    // string: name of the task
    this.name = json.name || '';

    // string: description of the task
    this.description = json.description || '';

    // string: notes on the task
    this.notes = json.notes || '';

    // string: the project this task is part of
    this.projectName = json.projectName || '';

    // number: rate per hour
    this.rateHour = parseFloat(json.rateHour) || 0.0;

    // number: rate per unit
    this.rateUnit = parseFloat(json.rateUnit) || 0.0;

    // date: deadline date of task, convert from date string to date object
    if (json.deadline) {
      this.deadline = new Date(json.deadline);
    } else {
      this.deadline = null;
    }

    // date: a date to trigger a reminder for the task
    if (json.reminder) {
      this.reminder = new Date(json.reminder);
    } else {
      this.reminder = null;
    }

    // bool: has the task been completed?
    this.completed = json.completed || false;

    // date: the last time task was billed
    if (json.lastBill) {
      this.lastBill = new Date(json.lastBill);
    } else {
      this.lastBill = null;
    }

  }

  // Return the constructor function
  return Task;
}]);


myModule.factory('TaskList', ['$filter', 'Task', function($filter, Task) {

  // Private Properties 
  var tasksCache = {};
  var usingREST = false;

  // Private Functions


  // Prototype
  TaskList.prototype = {
    get tasks () {
      var results = [];
      for (var id in tasksCache) {
        results.push(tasksCache[id]);
      }
      return results;
    },

    // Return an array of projects
    get projects () {
      var results = [], name, id;

      for (id in tasksCache) {
        name = tasksCache[id].projectName || 'No Project';
        if (results.indexOf(name) === -1)
          results.push(name);
      }
      return results;
    },

    // Find a task by id, returning a single task
    findId: function (id) {
      if (id in tasksCache) {
        return tasksCache[id];
      }
      return null;
    },

    // Find a task by name, returning an array of tasks
    findName: function (text) {
      var results = [];
      text = (''+text).toLowerCase();

      for (var id in tasksCache) {
        if (tasksCache[id].completed === false && (tasksCache[id].name).toLowerCase().indexOf(text) > -1) {
          results.push(tasksCache[id]);
        }
      }
      return results;
    },

    // Find a task based on its completion status
    findCompleted: function (completed) {
      var results = [];
      for (var id in tasksCache) {
        if (tasksCache[id].completed === completed) {
          results.push(tasksCache[id]);
        }
      }
      return results;
    },

    findDeadline: function () {
      var results = [];
      for (var id in tasksCache) {
        if (tasksCache[id].deadline && tasksCache[id].completed === false) {
          results.push(tasksCache[id]);
        }
      }
      return results;
    },

    findRem: function () {
      var results = [];
      for (var id in tasksCache) {
        if (tasksCache[id].reminder && tasksCache[id].completed === false) {
          results.push(tasksCache[id]);
        }
      }
      return results;
    },

    // Finds a task and copies key members to a destination object
    // or if not specified a new object containing the relevant members.
    copyBilling: function (taskId, dest) {
      var task = this.findId(taskId),
          obj  = dest || {};
      if (task) {
        obj.rateHour    = task.rateHour;
        obj.rateUnit    = task.rateUnit;
        obj.projectName = task.projectName;
      }
      return obj;
    },

    // create a new task, note the negative id to trigger key generation on save
    create: function () {
      return new Task({id: -1});
    },

    // delete a task... don't think this should be used at all
    // maybe setting an archived flag would be better? what about lookups of data?
    delete: function (id) {
      if (id in tasksCache) {
        delete tasksCache[id];
      }
      // todo: save back to local or remote storage

    },

    //
    save: function (task) {
      // todo: validate input... maybe should be done in Task constructor?
      // todo: save to local or remote storage

      if (task.id in tasksCache) {
        tasksCache[task.id] = task;
        this.saveTasksCache();
        return task;
      } else {
        // If the id doesn't exist create a new one via the task contructor
        delete task.id;
        var newone = new Task(task);

        tasksCache[newone.id] = newone;
        this.saveTasksCache();
        return tasksCache[newone.id];
      }
    },

    // Prime the in memory task cache, with all tasks
    openTasksCache: function () {
      var json = {}
      tasksCache = {};

      if (usingREST) {
        // Fetch tasks from web service
        // $http.get ....
      } else {
        // Using local storage
        if ('TaskList' in localStorage) {
          json = angular.fromJson(localStorage['TaskList']);
        }
      }

      // Deserialize json into task objects
      for (var id in json) {
        tasksCache[id] = new Task(json[id]);
      }
    },

    // Save the task cache
    saveTasksCache: function () {
      // todo: should we add a dirty list of ids for remote updates?
      if (usingREST) {
        // todo:
      } else {
        localStorage['TaskList'] = angular.toJson(tasksCache);        
      }
    },

  }

  // Constructor
  function TaskList () {
    this.openTasksCache();
  }

  // Return the constructor function
  return new TaskList();

}]);



/**
  * Hold a single piece of work performed
  * Each piece of work will have a time resolution down to ms
  */
myModule.factory('Work', ['Keys', function(Keys) {

  // Private Properties 

  // Private Functions

  // Prototype
  Work.prototype = {
    // date: when did the work complete?
    get finished () {
      return new Date(this.started.getTime() + this.duration);
    },

    get income () {
      return this.duration / 3600000 * this.rateHour + this.units * this.rateUnit;
    },

    get incomeHour () {
      return this.duration / 3600000 * this.rateHour;
    },

    get incomeUnit () {
      return this.units * this.rateUnit;
    },

  }

  // Constructor
  function Work (config) {
    if (!config) config = {};

    // number: unique identifier
    this.id = config.id || Keys.next('Work');

    // date: when did the work start
    if (config.started) {
      this.started = new Date(config.started);
    } else {
      this.started = new Date();
    }

    // string: the free form description of the work performed
    this.description = config.description || '';

    // number: how long the work last, in milliseconds
    this.duration = config.duration || 0;

    // number: the task this work should be allocated to
    this.taskId = config.taskId || null;

    // number: the number of units consumed
    this.units = parseFloat(config.units) || 0.0;

    // number: the rate per hour, normally from Task
    this.rateHour = parseFloat(config.rateHour) || 0.0;

    // number: the rate per unit, normally from Task
    this.rateUnit = parseFloat(config.rateUnit) || 0.0;

    // string: the project name, normally from Task
    this.projectName = config.projectName || '';
  }

  // Return the constructor function
  return Work;
}]);




/** 
  * Shift
  * A shift worth of work, with no gaps in time between work i.e.
  * work[0].finished === work[1].started 
  */
myModule.factory('Shift', ['$filter', 'Keys', 'Work', function($filter, Keys, Work) {

  // Prototype
  Shift.prototype = {
    // date: when did the shift complete?
    get finished () {
      return new Date(this.started.getTime() + this.duration);
    },

    // Adds a new task without time gaps
    addWork: function (json) {
      var l = this.work.length || 0;
      // Set the duration of the previous task, but only if its todays timesheet
      if (l > 0) {
        var previous = this.work[l - 1];
        if (previous.duration === 0) {
          previous.duration = Date.now() - previous.started.getTime();
          // Max of 3 hours
          previous.duration = Math.min(previous.duration, 10800000);
          // Must be positive
          previous.duration = Math.max(previous.duration, 0);
        }
      }

      // Add the new task
      this.work.push(new Work(json));
      this.adjWork();
    },

    // Deletes a task and adjust remaining work to ensure no time gaps
    delWork: function (id) {
      var self = this;
      self.work.forEach(function(el, i, a) {
        if (el.id === id) {
          a.splice (i, 1);
          self.adjWork();
          return;
        }
      });
    },

    // Adjusts the start time of each task to ensure no gaps in time
    // Typically called manually from a ui
    adjWork: function () {
      var self = this;
      self.duration = 0;
      self.work.forEach(function(el, i) {
        // Round duration down to nearest minute
        el.duration -= el.duration % 60000;

        // Adjust work.started based on duration
        if (i === 0) {
          el.started = self.started;
        } else {
          el.started = new Date(self.started.getTime() + self.duration);
        }
        self.duration += el.duration;
      });
    },
  }


  // Contructor
  function Shift (json) {
    if (!json) json = {};


    // Populate and align id and started
    // string: unique identifier representing a particular day in yyyy-mm-dd format
    // date: when did the shfit start
    if (!json.id && !json.started) {
      this.started = new Date();
      this.id = this.started.toISODateString();
    } else if (!json.id) {
      this.started = new Date(json.started);
      this.id = this.started.toISODateString();
    } else if (json.id && !json.started) {
      var now = new Date();
      this.id = json.id;
      this.started = new Date(this.id);
      this.started.setHours(now.getHours());
      this.started.setMinutes(now.getMinutes());
    } else {
      var now = new Date(json.started);
      this.id = json.id;
      this.started = new Date(this.id);
      this.started.setHours(now.getHours());
      this.started.setMinutes(now.getMinutes());
    }

    // Clobber seconds and milliseconds
    this.started.setSeconds(0, 0);

    // string: unique identifier representing a particular day in yyyy-mm-dd format
    this.id = json.id || this.started.toISODateString();
    
    // number: how long the shift lasted, in milliseconds
    this.duration = json.duration || 0;

    // The work completed
    this.work = [];

    // deal with sub objects
    if (json.work) {
      var work = this.work;
      json.work.forEach(function (el, i) {
        work.push(new Work(el));
      });
      this.adjWork();
    }

  }

  return Shift;
}]);


/**
  * Hold a set of Shifts
  */
myModule.factory('ShiftList', ['$filter', 'Shift', 'TaskList', 'Work', function($filter, Shift, TaskList, Work) {

  // Private Properties 
  
  // Associative array
  var shifts = {};
  var shiftsCache = {};
  var usingREST = false;

  // Private Functions


  // Prototype
  ShiftList.prototype = {
    //
    get shifts () {
      var results = [];
      for (var id in shiftsCache) {
        results.push(shiftsCache[id]);
      }
      return results;
    },

    // Each work item per shift
    get work () {
      var results = [];
      for (var id in shiftsCache) {
        shiftsCache[id].work.forEach(function(x, i, a) {
          if (x.taskId) {
            var tmp = angular.copy(x);
            tmp.taskRef = TaskList.findId(x.taskId);
            tmp.weekDay = tmp.started.getDay();
            results.push(tmp);
          }
        });
      }
      return results;
    },


    // Create a report of all work
    //todo: filter by a date range passed as [start_ms, end_ms]
    reportWork: function (start = 0, end = 0) {
      let results = [];
      let rptWrk = {};

      for (var id in shiftsCache) {
        shiftsCache[id].work.forEach(function(x, i, a) {
          if (x.started.getTime() < start || x.started.getTime() > end) return;

          if (x.taskId) {
            rptWrk = new Work(x);
            rptWrk.taskRef = TaskList.findId(x.taskId);
            rptWrk.billed = false;
            if (rptWrk.taskRef && rptWrk.taskRef.lastBill && rptWrk.started.getTime() < rptWrk.taskRef.lastBill.getTime()) {
              rptWrk.billed = true;
            }
            results.push(rptWrk);
          }

        });
      }
      return results;
    },


    reportTask: function (task, start, end) {
      function hash(o) {
        return o.day + o.taskId;
      }

      var shift = {};
      var report = {};

      report.work = {};
      report.duration = 0;
      report.units = 0;
      report.income = 0.0;

      // loop through date range
      var cur = new Date(start);
      while (cur.getTime() <= end.getTime()) {
        shift = this.findId(cur.toISODateString());
        cur.setDate(cur.getDate() + 1);
        for (var i = 0; i < shift.work.length; i++) {

          if (shift.work[i].taskId !== task.id) continue;

          var work = {};
          work.day = shift.id;
          work.duration = shift.work[i].duration;
          work.units = shift.work[i].units;
          work.income = shift.work[i].income;
          work.description = shift.work[i].description;
          work.taskId = shift.work[i].taskId;

          var key = hash(work);

          if (report.work[key]) {
            report.work[key].duration += work.duration;
            report.work[key].units += work.units;
            report.work[key].income += work.income;
            if (report.work[key].description.length === 0) {
              report.work[key].description = work.description;
            } else {
              report.work[key].description += work.description.length === 0 ? work.description : '\n' + work.description;
            }
          } else {
            report.work[key] = work;
          }

          report.duration += work.duration;
          report.units += work.units;
          report.income += work.income;
        }
      }
      return report;
    },


    // Report total task duration per project, day, taskId
    reportProject: function (start, end) {
      function hash(o) {
        return o.day + o.taskId;
      }

      var shift = {};
      var report = {};
      var task = {};

      // loop through date range
      var cur = new Date(start);
      while (cur.getTime() <= end.getTime()) {
        shift = this.findId(cur.toISODateString());
        cur.setDate(cur.getDate() + 1);

        // find all the work
        for (var i = 0; i < shift.work.length; i++) {
          var value = {};

          value.day = shift.id;
          value.duration = shift.work[i].duration;
          value.units = shift.work[i].units;
          value.income = 0.0;
          value.description = shift.work[i].description;
          value.taskId = shift.work[i].taskId;

          task = TaskList.findId(value.taskId);
          if (task) {
            value.taskName = task.name;
            value.projectName = task.projectName || null;
            value.income = value.duration / 3600000 * task.rateHour + value.units * task.rateUnit;
          } else {
            value.taskName = 'No task';
            value.projectName = null;
          }

          // Prime up the project key
          if (!report[value.projectName]) {
            report[value.projectName] = {};
            report[value.projectName].duration = 0;
            report[value.projectName].units = 0;
            report[value.projectName].income = 0.0;
            report[value.projectName].work = {};
          }

          var key = hash(value);

          // Prime up project name and grouping key
          if (report[value.projectName].work[key]) {
            report[value.projectName].work[key].duration += value.duration;
            report[value.projectName].work[key].units += value.units;
            report[value.projectName].work[key].income += value.income;
            if (report[value.projectName].work[key].description.length === 0) {
              report[value.projectName].work[key].description = value.description;
            } else {
              report[value.projectName].work[key].description += value.description.length === 0 ? value.description : '\n' + value.description;
            }
          } else {
            report[value.projectName].work[key] = value;
          }

          report[value.projectName].duration += value.duration;
          report[value.projectName].units += value.units;
          report[value.projectName].income += value.income;
        }
      }

      return report;
    },

    // Find a shift by id. Returns a new shift if not found.
    findId: function (id) {
      if (id in shiftsCache) {
        return shiftsCache[id];
      } else {
        
//todo: wrong. needs to be based on id's date!
        return new Shift({id: id});
      }
    },

    // Find a shift by converting a date object to an id. Returns a new shift if not found
    findDate: function (date) {
      var id = date.toISODateString();
      if (id in shiftsCache) {
        return shiftsCache[id];
      } else {
        return new Shift({started: date});
      }
    },

    // todo:
    delete: function (id) {
      if (id in shiftsCache) {
        delete shiftsCache[id];
      }
      // todo: save back to local or remote storage

    },

    // todo:
    save: function (shift) {
      // todo: validate input
      shiftsCache[shift.id] = shift;
      this.saveShiftsCache();
    },

    // Prime the in memory shift cache, with all tasks
    // todo: do we even need this?
    openShiftsCache: function () {
      var json = {}
      shiftsCache = {};

      if (usingREST) {
        // Fetch tasks from web service
        // $http.get ....
      } else {
        // Using local storage
        if ('ShiftList' in localStorage) {
          json = angular.fromJson(localStorage['ShiftList']);
        }
      }

      // Deserialize json into task objects
      for (var id in json) {
        shiftsCache[id] = new Shift(json[id]);
      }
    },

    // Save the shift cache
    saveShiftsCache: function () {
      // todo: should we add a dirty list of ids for remote updates?
      if (usingREST) {
        // todo:
      } else {
        localStorage['ShiftList'] = angular.toJson(shiftsCache);        
      }
    },
  }

  // Constructor
  function ShiftList () {
    this.openShiftsCache();
  }

  // Return the constructor function
  return new ShiftList();

}]);


/**
  * Directive focus-on
  * Allows a element to grab focus based on a particular event
  */

myModule.directive('focusOn', [function() {
    return function (scope, elem, attr) {
      scope.$on('focusOn', function(e, name) {
        if (name === attr.focusOn) {
          elem[0].focus();
        }
      });
    }
}]);

myModule.factory('focus', ['$rootScope', '$timeout', function($rootScope, $timeout) {
    return function (name) {
      $timeout(function () {
        $rootScope.$broadcast('focusOn', name);
      });
    }
}]);



/* Directive   zgViewas
 * use on an input field, on focus it will display model, on blur display using filter. 
 *
 */
myModule.directive('zgViewas', ['$filter', '$locale', function ($filter, $locale) {
    return {
      priority: 1,
      require: '?ngModel',
      restrict: 'A',
      link: function(scope, element, attrs, ctrl) {

        if(!ctrl) return; // no model, no view-as

        var renderModel = ctrl.$render;
        var editing = false;
        var filter = [];
        var elementValue = '';

        // Parse attributes "filter[:format]"
        filter = attrs.zgViewas.match(/(.*?)\:(.*)/);

        // Custom validators to run on parsers / formatters
        // Populates elementValue used for rendering element
        var validator = function(value) {
          elementValue = $filter(filter[1])(value, filter[2]);
          if (!ctrl.$isEmpty(value) && elementValue === ctrl.$viewValue) {
            ctrl.$setValidity(filter[1], false);
            return value;
          } else {
            ctrl.$setValidity(filter[1], true);
            return value;
          }            
        };

        ctrl.$parsers.push(validator);
        ctrl.$formatters.push(validator);

        // Override default $render function
        ctrl.$render = function () {
          if (editing) {
            renderModel();
          } else {
            element.val(ctrl.$isEmpty(elementValue) ? '' : elementValue);
          }
        };

        // model -> view
        element.on('focus', function() {
          editing = true;
          scope.$apply(function() {
            ctrl.$render();            
          });
        });

        // model -> filtered -> view
        element.on('blur', function() {
          editing = false;
          scope.$apply(function() {
            ctrl.$render();            
          });
        });
      } // link:    
    } // return
}]);


/* Filter zg-page:<page no>:<page size>
 *
 *
 */
 
myModule.filter('zgPager', [function() {
    return function(array, pager) {
      return pager.filter(array);
    }
}]);


/**
  * Pager Service
  *
  * zgPager.add('tasks', pageSz);
  * task in tasks | zgPager:tasks
  *
  * - need to register a pager service first
  * - filter uses the pager service to know what needs to be filtered
  * - ui uses the pager service to know what to display
  *
  */
myModule.factory('zgPager', ['Keys', function(Keys) {

  // Private Properties 

  // Private Functions


  // Prototype
  Pager.prototype = {

    filter: function(array) {

      // We don't do non array's
      if (!Array.isArray(array)) {
        return array;
      }

      // Nothing to calculate
      if (array.length === 0) {
        this.current = this.end = 1;
        return array;
      }

      var iEnd = this.current * this.size,
          iStart = iEnd - this.size;

      // Scroll to last page if off end.
      while (iStart >= array.length) {
        iEnd = iStart;
        iStart -= this.size;
        this.current -= 1;
      }

      this.last = Math.ceil(array.length / this.size);

      return array.slice(iStart, iEnd);
    },

    // Move to the previous page
    pagePrevious: function () {
      this.current = Math.min(1, this.current--);
    },

    // Move to the next page
    pageNext: function () {
      this.current++;
    },

    // Move to specific page no
    pageNo: function (pageNo) {
      this.current = pageNo;
    },
  }


  // Constructor
  function Pager (json) {
    if (!json) json = {};
    this.size = json.size || 10;
    if (this.size < 1) this.size = 1;
    this.current = json.current || 1;
    this.first = 1;
    this.last = json.last || 1;
  }


  // Seed function
  function create (pageSize) {
      return new Pager({size: pageSize});
  }


  return {
    create: create
  };

}]);


/**
  * Controller   findTaskIdCtrl
  */
myModule.controller('findTaskIdCtrl', ['$scope', '$document', 'TaskList', 'currentId', 'close', 'zgPager', 'focus',
	function ($scope, $document, TaskList, currentId, close, zgPager, focus) {

    // Set a body class for bootstrap modal
    var body = $document.find('body');
    body.toggleClass('modal-open', 1);

    // Bind some shortcut keys for controlling the modal
    body.on('keydown', keyhandler);

    $scope.close = function(result) {
      // clean up shortcut keys and body class
      body.off('keydown', keyhandler);
      body.toggleClass('modal-open', 0);
      close(result);
     };

    function keyhandler (e) {    
      // esc
      if (e.keyCode == 27) {
        $scope.close(undefined);
      }
    }

    $scope.getTasks = function () {
      $scope.tasks = TaskList.findCompleted($scope.completed);      
    }

    $scope.changeSort = function(key) {
      if (key === $scope.sortKey) {
        $scope.sortOrder = !$scope.sortOrder;
      } else {
        $scope.sortKey = key;
      }
    };

    $scope.init = function () {
      // Use the injected input 
      $scope.currentId = currentId;
      $scope.completed = false;
      $scope.sortOrder = false;
      $scope.sortKey = 'name';

      // Create a new pager object used for filtering tasks by page
      $scope.taskPager = zgPager.create(10);
      $scope.getTasks();
      focus('searchTasks');
    }

    $scope.init();
}]);

/**
  * Controller   editTextCtrl
  */
myModule.controller('editTextCtrl', ['$scope', '$document', 'title', 'text', 'close', 'focus',
	function ($scope, $document, title, text, close, focus) {
    
    // Set a body class for bootstrap modal
    var body = $document.find('body');
    body.toggleClass('modal-open', 1);

    // Bind some shortcut keys for controlling the modal
    body.on('keydown', keyhandler);

    $scope.close = function (result) {
      // clean up shortcut keys and body class
      body.off('keydown', keyhandler);
      body.toggleClass('modal-open', 0);
      close(result);
     };

    function keyhandler (e) {    
      // esc
      if (e.keyCode == 27) {
        $scope.close(undefined);
      }
    }

    $scope.init = function () {
      // Use the injected input 
      $scope.title = title;
      $scope.text = text;

      focus('text');
    }

    $scope.init();
}]);


/**
  * Create a crossfilter of work
  */
myModule.factory('cfWork', ['crossfilter', 'moment', 'ShiftList', function(crossfilter, moment, ShiftList) {

  // Private Properties

  // Private Functions
  function reduceAdd (p, v) {
    p.hours += v.duration / 3600000;
    p.units += v.units;
    p.income += v.income;

    //if (v.description) p.description[v.started.getTime()] = v.description;

    return p;
  }

  function reduceRemove (p, v) {
    p.hours -= v.duration / 3600000;
    p.units -= v.units;
    p.income -= v.income;

    //delete p.description[v.started];

    return p;
  }

  function reduceInitial () {
    return {
      hours: 0.0,
      units: 0.0,
      income: 0.0,
      //description: {}
    };
  }


  // Prototype
  cfWork.prototype = {

  }

  // Constructor
  function cfWork (range) {
    //
    // crossfilter
    //
    this.cf = crossfilter(ShiftList.reportWork(range[0], range[1]));

    //
    // dimensions
    //
    this.dims = {};

    // start of week
    this.dims.week = this.cf.dimension(function (d) {
      return moment(d.started).startOf('week').valueOf();
    });

    // start of day i.e. 12am
    this.dims.day = this.cf.dimension(function (d) {
      return moment(d.started).startOf('day').valueOf();
    });

    // day of week i.e. 0=Sun, 1=Mon, 2=Tue etc
    this.dims.weekday = this.cf.dimension(function (d) {
      return d.started.getDay();
    });

    // project name
    this.dims.project = this.cf.dimension(function (d) {
      return d.projectName || 'No Project';
    });

    // task name
    this.dims.task = this.cf.dimension(function (d) {
      if (d.taskRef) {
        return d.taskRef.name;
      } else {
        return 'No Task';
      }
    });

    // billed
    this.dims.billed = this.cf.dimension(function (d) {
      if (d.taskRef && d.taskRef.lastBill) {
        return d.started.getTime() < d.taskRef.lastBill.getTime() ? true : false;
      } else {
        return false;
      }
    });


    //
    // Groups
    //
    this.groups = {};

    // project: Sum duration, units, income simultaneously
    this.groups.project = this.dims.project.group().reduce(reduceAdd, reduceRemove, reduceInitial);

    // task: Sum duration, units, income simultaneously
    this.groups.task = this.dims.task.group().reduce(reduceAdd, reduceRemove, reduceInitial);

    // day: Sum duration, units, income simultaneously
    this.groups.day = this.dims.day.group().reduce(reduceAdd, reduceRemove, reduceInitial);

    // weekday: Sum duration, units, income simultaneously
    this.groups.weekday = this.dims.weekday.group().reduce(reduceAdd, reduceRemove, reduceInitial);

    // week: Sum duration, units, income simultaneously
    this.groups.week = this.dims.week.group().reduce(reduceAdd, reduceRemove, reduceInitial);

    // billed: Sum duration, units, income simultaneously
    this.groups.billed = this.dims.billed.group().reduce(reduceAdd, reduceRemove, reduceInitial);

  }


  return {
    create: function (range) { return new cfWork(range); }
  };

}]);



/**
  * Create some selects
  */
myModule.factory('selects', ['moment', 'TaskList', function(moment, TaskList) {

  // Private Properties


  // Private Functions

  // Builds an array of objects in form { key: '', value: [] }
  function dayRanges () {
    var eod = moment().endOf('day').valueOf();
    var startFY = moment();
    var endFY;
    startFY.month() < 6 ? startFY.startOf('year').subtract(6, 'months') : startFY.startOf('year').add(6, 'months');
    endFY = startFY.clone().add(1, 'years').subtract(1 ,'ms');

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

  function billed () {
    return [
      {key: 'All', value: null},
      {key: 'Billed', value: true},
      {key: 'Unbilled', value: false}
    ];
  }

  function projects () {
    let prjs = TaskList.projects.map(function (x) {
      return {key: x, value: x};
    });
    prjs.unshift({key: 'All', value: null});
    return prjs;
  }

  // Prototype
  Select.prototype = {
    // Return the array representation
    toArray: function () {
      return this._a;
    },

    // Find the key property in array and
    // return the value property.
    find: function (key) {
      let value = null;
      this._a.some(function (x) {
        if (x.key === key) {
          value = x.value;
          return true;  // break out
        }
      });
      return value;
    }

  }

  // Constructor
  function Select (array) {
    this._a = array;
  }

  return {
    dayRanges: dayRanges,
    dates: new Select(dayRanges()),
    billed: new Select(billed()),
    projects: new Select(projects())
  };

}]);


