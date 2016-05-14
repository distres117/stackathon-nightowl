app.config(function($stateProvider){
  $stateProvider
    .state('home', {
      url: '/',
      templateUrl: '/app/home/home.html',
      controller: function(user, $state, $rootScope, $scope, Stop,Trip, Google){
        $rootScope.hidenav = false;
        if (!user)
          $state.go('login');
        $scope.user = user;
        Trip.setCurrentTrip(user.trips[0]);
        $scope.getCurrentTrip = Trip.getCurrentTrip;
        $scope.showDetails = function(e, stop){
          if (!Stop.getCurrent())
            Stop.getDetails(stop);
        };
        $scope.getNearby = function(keyword){
          var currentStop = Stop.getCurrent();
          if (currentStop){
            return Google.getNearby(currentStop, keyword)
            .then(function(data){
              Stop.clearCurrent();
              Stop.setShownStops(data);
            });
          }
        };
        $scope.shownStops = function(){
          return Stop.getShownStops();
        };
        $scope.addStop = function(){
          var stop = Stop.getCurrentDisplay();
          console.log(stop);
          return Trip.addStop(stop)
          .then(function(){
              Trip.getCurrentTrip().stops.unshift(stop);
            });
        };
        $scope.getCurrent = Stop.getCurrent;
        $scope.currentDisplayStop = Stop.getCurrentDisplay;
      },
      resolve: {
        user: function(User){
          return User.getUser();
        }
      }
    });
});
