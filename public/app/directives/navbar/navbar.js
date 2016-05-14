app.directive('navbar', function(){
  return {
    templateUrl: '/app/directives/navbar/navbar.html',
    controller: function($scope, User, $state, NgMap, Trip, Stop){
      $scope.logout = function(){
        User.logoutUser()
        .then(function(){
          $state.go('login');
        });
      };
      $scope.createNew = function(){
        return Trip.createTrip()
        .then(function(trip){
          Stop.setShownStops([]);
          Trip.setCurrentTrip(trip);
        });
      };
    }
  };
});
