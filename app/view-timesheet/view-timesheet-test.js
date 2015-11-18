'use strict';


describe('myApp.view-timesheet module', function() {
  beforeEach(module('myApp'));
  beforeEach(module('ngMock'));

  var $httpBackend, $controller, $rootScope, $location;

  beforeEach(inject(function(_$httpBackend_, _$controller_, _$rootScope_, _$location_){
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $httpBackend = _$httpBackend_;
    $controller = _$controller_;
    $rootScope = _$rootScope_;
    $location = _$location_;
  }));

  describe('$scope.init()', function() {
    var $scope, controller;

    beforeEach(function() {
//      $httpBackend.whenGET(/^\/view-timesheet\//).passThrough();
      $scope = {};
      $location.path('timesheet/');
      controller = $controller('viewTimesheetCtrl', { $scope: $scope });
    });


    it('default route to today', function() {
      $rootScope.$apply();  
      
      for (var p in $scope) {
        console.log(p);
        console.log($scope[p]);
      }
      //console.log($scope.dt instanceof Date);
      //expect($scope.dt instanceof Date).toBe(true);
      expect($scope.dt.toISODateString()).toBe('2015-10-01');
      expect($scope.params.timesheetId).toBe(undefined);
    });



/*
    it('sets the strength to "weak" if the password length <3 chars', function() {
      $scope.password = 'a';
      $scope.grade();
      expect($scope.strength).toEqual('weak');
    });
  */

  });
});
