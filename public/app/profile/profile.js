app.config(function($stateProvider, ChartJsProvider){
  $stateProvider
    .state('profile', {
      url: '/profile',
      templateUrl: '/app/profile/profile.html',
      controller: function(user, $scope, NgMap, $state, Trip, User){
        ChartJsProvider.setOptions({
          maintainAspectRatio: false
        });
        $scope.data =[];
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
            getChartData();
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
        $scope.loadTrip = function(){
          Trip.setCurrentTrip($scope.selectedTrip);
          $state.go('home');
        };
        function getChartData(){
          if ($scope.selectedTrip){
          var costItems = [], distItems =[];
          var n = $scope.selectedTrip.stops.length;
          for(var i =0;i<n;i++){
            var stop = $scope.selectedTrip.stops[i];
            distItems.push( Number((n / (stop.distance * 0.000621371)).toPrecision(2)));
            costItems.push(stop.price || 0);
            }

            $scope.data.push(costItems);
          }
        }
        $scope.removeTrip = function(){
          return Trip.removeTrip($scope.selectedTrip)
          .then(function(){
            return User.getUser();
          })
          .then(function(user){
            $scope.user = user;
          });
        };
        $scope.getLabels = function(){
          if ($scope.selectedTrip){
            return $scope.selectedTrip.stops.map(function(item,i){
              return i;
            });
          }
        };
        $scope.labels = ["January", "February", "March", "April", "May", "June", "July"];
  $scope.series = ['Average cost per stop', 'Average distance to stop'];
  // $scope.data = [
  //   [65, 59, 80, 81, 56, 55, 40],
  //   [28, 48, 40, 19, 86, 27, 90]
  // ];
      },
      resolve:{
        user: function(User){
          return User.getUser();
        }
      }
    });
});
