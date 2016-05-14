app.config(function($stateProvider, ChartJsProvider){
  $stateProvider
    .state('profile', {
      url: '/profile',
      templateUrl: '/app/profile/profile.html',
      controller: function(user, $scope, NgMap){
        ChartJsProvider.setOptions({
          maintainAspectRatio: false
        });
        NgMap.getMap({id: 'profile_map'}).then(function(_map){
          map = _map;
        });
        $scope.user = user;
        $scope.setSelected = function(trip){
          $scope.selectedTrip = trip;
          var bounds = new google.maps.LatLngBounds();
          $scope.selectedTrip.stops.forEach(function(stop){
            var latlng = new google.maps.LatLng(stop.coords[0], stop.coords[1]);
            bounds.extend(latlng);
          });
            map.setCenter(bounds.getCenter());
            map.fitBounds(bounds);
        };
        $scope.getTotalPrice = function(trip){
          var items = trip.stops.filter(function(item){
            return item.price;
          });
          var total = items.reduce(function(acc, item){
            return acc + item.price;
          },0) / items.length;
          var rounded = Math.round(total);
          var rtn='';
          for(var i =0;i<rounded;i++)
            rtn+='$';
          return rtn;
        };
        $scope.getTotalDistance = function(trip){
          var items = trip.stops.filter(function(item){
            return item.distance;
          });
          var total = items.reduce(function(acc, item){
            return acc + item.distance;
          }, 0);
          return (total * 0.000621371).toPrecision(2) + " mi.";
        };
        $scope.getLocations = function(){
          if ($scope.selectedTrip){
            return $scope.selectedTrip.stops.map(function(stop){
              return stop.coords;
            });
          }
        };
        $scope.labels = ["January", "February", "March", "April", "May", "June", "July"];
  $scope.series = ['Series A', 'Series B'];
  $scope.data = [
    [65, 59, 80, 81, 56, 55, 40],
    [28, 48, 40, 19, 86, 27, 90]
  ];
      },
      resolve:{
        user: function(User){
          return User.getUser();
        }
      }
    });
});
