'use strict';

Date.prototype.toISODateString = function() {
   var yyyy = this.getFullYear().toString();
   var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based
   var dd  = this.getDate().toString();
   return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]); // padding
};

var module = angular.module('myApp.zyski', []);

module.filter('time', [function() {
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


module.filter('taskName', ['TaskList', function(TaskList) {
  return function(taskId) {
    var task = TaskList.findId(taskId);
    if (task) {
      return task.name;
    } else {
      return 'No Task';
    }
  }
}]);


/**
  * Hold all object keys
  * NB: A key should never start at zero! 
  */
module.factory('Keys', [function() {

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

  // Return the constructor function
  return {
    next: next,
    current: current
  }

}]);

/**
  * Task
  */
module.factory('Task', ['Keys', function(Keys) {

  // Private Properties 

  // Private Functions

  // Prototype
  Task.prototype = {
    // number: due date converted to ms. null === 0
    get getTimeDue () {
      return this.due ? this.due.getTime() : 0;
    }
  }

  // Contructor
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

    // string: the project this task is part of
    this.projectName = json.projectName || '';

    // date: due date of task, convert from date string to date object
    if (json.due) {
      this.due = new Date(json.due);
    } else {
      this.due = null;
    }

    // bool: has the task been completed?
    this.completed = json.completed || false;
  }

  // Return the constructor function
  return Task;
}]);


module.factory('TaskList', ['$filter', 'Task', function($filter, Task) {

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
        if ((tasksCache[id].name).toLowerCase().indexOf(text) > -1) {
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
module.factory('Work', ['Keys', function(Keys) {

  // Private Properties 

  // Private Functions

  // Prototype
  Work.prototype = {
    // date: when did the work complete?
    get finished () {
      return new Date(this.started.getTime() + this.duration);
    },
  }

  // Constructor
  function Work (json) {
    if (!json) json = {};

    // number: unique identifier
    this.id = json.id || Keys.next('Work');

    // date: when did the work start
    if (json.started) {
      this.started = new Date(json.started);
    } else {
      this.started = new Date();
    }

    // string: the free form description of the work performed
    this.description = json.description || '';

    // number: how long the work last, in milliseconds
    this.duration = json.duration || 0;

    // number: the task this work should be allocated to
    this.taskId = json.taskId || null;
  }

  // Return the constructor function
  return Work;
}]);




/** 
  * Shift
  * A shift worth of work, with no gaps in time between work i.e.
  * work[0].finished === work[1].started 
  */
module.factory('Shift', ['$filter', 'Keys', 'Work', function($filter, Keys, Work) {

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
          // Max of 12 hours
          previous.duration = Math.min(previous.duration, 43200000);
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
module.factory('ShiftList', ['$filter', 'Shift', 'TaskList', function($filter, Shift, TaskList) {

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

    reportTask: function (taskId, start, end) {
      function hash(o) {
        return o.day + o.taskId;
      }

      var shift = {};
      var report = {};

      report.work = {};
      report.duration = 0;

      // loop through date range
      var cur = new Date(start);
      while (cur.getTime() <= end.getTime()) {
        shift = this.findId(cur.toISODateString());
        cur.setDate(cur.getDate() + 1);
        for (var i = 0; i < shift.work.length; i++) {

          if (shift.work[i].taskId !== taskId) continue;

          var work = {};
          work.day = shift.id;
          work.duration = shift.work[i].duration;
          work.description = shift.work[i].description;
          work.taskId = shift.work[i].taskId;

          var key = hash(work);

          if (report.work[key]) {
            report.work[key].duration += work.duration;
            if (report.work[key].description.length === 0) {
              report.work[key].description = work.description;
            } else {
              report.work[key].description += work.description.length === 0 ? work.description : '\n' + work.description;
            }
          } else {
            report.work[key] = work;
          }

          report.duration += shift.work[i].duration;
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
          value.description = shift.work[i].description;
          value.taskId = shift.work[i].taskId;

          task = TaskList.findId(value.taskId);
          if (task) {
            value.taskName = task.name;
            value.projectName = task.projectName || null;
          } else {
            value.taskName = 'No task';
            value.projectName = null;
          }

          // Prime up the project key
          if (!report[value.projectName]) {
            report[value.projectName] = {};
            report[value.projectName].duration = 0;
            report[value.projectName].work = {};
          }

          var key = hash(value);

          // Prime up project name and grouping key
          if (report[value.projectName].work[key]) {
            report[value.projectName].work[key].duration += value.duration;
            if (report[value.projectName].work[key].description.length === 0) {
              report[value.projectName].work[key].description = value.description;
            } else {
              report[value.projectName].work[key].description += value.description.length === 0 ? value.description : '\n' + value.description;
            }
          } else {
            report[value.projectName].work[key] = value;
          }

          report[value.projectName].duration += value.duration;

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

module.directive('focusOn', [function() {
    return function (scope, elem, attr) {
      scope.$on('focusOn', function(e, name) {
        if (name === attr.focusOn) {
          elem[0].focus();
        }
      });
    }
}]);

module.factory('focus', ['$rootScope', '$timeout', function($rootScope, $timeout) {
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
module.directive('zgViewas', ['$filter', '$locale', function ($filter, $locale) {
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
        filter = attrs.zgViewas.split(':', 3);

        // Custom validators to run on parsers / formatters
        // Populates elementValue used for rendering element
        var validator = function(value) {
          elementValue = $filter(filter[0])(value, filter[1], filter[2]);
          if (!ctrl.$isEmpty(value) && elementValue === ctrl.$viewValue) {
            ctrl.$setValidity(filter[0], false);
            return value;
          } else {
            ctrl.$setValidity(filter[0], true);
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
 
module.filter('zgPager', [function() {
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
module.factory('zgPager', ['Keys', function(Keys) {

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
module.controller('findTaskIdCtrl', ['$scope', '$document', 'TaskList', 'currentId', 'close', 'zgPager', 'focus',
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
module.controller('editTextCtrl', ['$scope', '$document', 'title', 'text', 'close', 'focus',
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



