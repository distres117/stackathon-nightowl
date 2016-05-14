var app = angular.module('app', ['ui.router', 'ngAnimate', 'ngMap', 'chart.js']);
app.config(function($urlRouterProvider, $locationProvider){
  $locationProvider.html5Mode(true);
  $urlRouterProvider.otherwise('/');
});

app.factory("Google", function($http, Stop){
  return {
    getNearby: function(stop, keyword){
      var data = {
        location: stop.coords.toString(),
        radius: 1000,
        keyword: keyword
      };
      return $http.post('/api/google/nearby', data)
      .then(function(res){
        var rtn = res.data.map(function(item,i){
          return {
            _id: i+'',
            name: item.name,
            type: keyword,
            coords: [item.geometry.location.lat,item.geometry.location.lng],
            price: item.price_level,
            rating: item.rating,
            isNew: true
          };
        });
        return rtn;
      });
    },
    getDistance: function(newStop){
      var currentStop = Stop.getCurrent();
      var data = {
        origins: currentStop.coords.toString(),
        destinations: newStop.coords.toString(),
        units: 'imperial',
        mode: 'walking'
      };
      return $http.post('/api/google/distance', data)
      .then(function(res){
        return res.data;
      });
    },
    getGeocode: function(input){
      return $http.post('/api/google/geocode', {address: input})
      .then(function(res){
        return res.data;
      });
    }
  };
});

app.factory('Stop', function(NgMap){
  var map, currentStop, shownStops, currentDisplayStop;
  NgMap.getMap().then(function(_map){
    map = _map;
  });
  return {
    setCurrent: function(stop, show){
      currentDisplayStop = null;
      currentStop = stop;
      map.hideInfoWindow('iw');

    },
    clearCurrent: function(){
      currentStop = null;
    },
    getDetails: function(stop){
      currentDisplayStop = stop;
      //currentStop = null;
      map.showInfoWindow('iw', stop._id);
    },
    getCurrentDisplay: function(){
      return currentDisplayStop;
    },
    getCurrent: function(){
      return currentStop;
    },
    getShownStops: function(){
      return shownStops;
    },
    setShownStops: function(stops){
      map.hideInfoWindow('iw');
      if (Array.isArray(stops))
        shownStops = stops;
      else {
        shownStops = [stops];
      }
      var bounds = new google.maps.LatLngBounds();
      shownStops.forEach(function(stop){
        var latlng = new google.maps.LatLng(stop.coords[0], stop.coords[1]);
        bounds.extend(latlng);
      });
      if (shownStops.length)
        map.setCenter(bounds.getCenter());
      if (shownStops.length > 1)
        map.fitBounds(bounds);
    }
  };
});

app.factory('Trip', function($http, Stop){
  var currentTrip;
  return {
    editTrip: function(){
      return $http.put('/api/trips/' + currentTrip._id, {name: currentTrip.newName });
    },
    addStop: function(stop){
      var data = {

      };
      return $http.put('/api/trips/' + currentTrip._id, {stop: stop})
      .then(function(res){
        var newStop = res.data;
        Stop.setShownStops(stop);
        currentTrip.stops.unshift(stop);
        Stop.setCurrent(newStop);
      });
    },
    removeStop: function(stop){
      return $http.delete('/api/trips/' + currentTrip._id + "/stops/" + stop._id)
      .then(function(){
        var idx = currentTrip.stops.indexOf(stop);
        currentTrip.stops.splice(idx,1);
        Stop.clearCurrent();
        Stop.setShownStops([]);
        // if (currentTrip.stops.length)
        //   Stop.setCurrent(currentTrip.stops[0], true);
      });
    },
    setCurrentTrip: function(trip){
      currentTrip = trip;
    },
    getCurrentTrip: function(){
      return currentTrip;
    },
    createTrip: function(){
      return $http.post('/api/trips')
      .then(function(res){
        return res.data;
      });
    },
    removeTrip: function(trip){
      return $http.delete('/api/trips/' + trip._id);
    }
  };
});

app.factory('User', function($http){
  return {
    getUser: function(){
      return $http.get('/session')
      .then(function(res){
        return res.data;
      });
    },
    createUser: function(creds){
      return $http.post('/create', creds)
      .then(function(res){
        return res.data;
      });
    },
    loginUser: function(creds){
      return $http.post('/login', creds);
    },
    logoutUser: function(){
      return $http.post('/logout');
    }
  };
});

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
        if (!Trip.getCurrentTrip())
          Trip.setCurrentTrip(user.trips[0]);
        $scope.getCurrentTrip = function(){
          return Trip.getCurrentTrip();
        };
        $scope.showDetails = function(e, stop){
          // if (!Stop.getCurrent())
            Stop.getDetails(stop);
        };
        $scope.getNearby = function(keyword){
          var currentStop = Stop.getCurrent();
          if (currentStop){
            return Google.getNearby(currentStop, keyword)
            .then(function(data){
              //Stop.clearCurrent();
              Stop.setShownStops(data);
            });
          }
        };
        $scope.shownStops = function(){
          return Stop.getShownStops();
        };
        $scope.addStop = function(){
          var stop = Stop.getCurrentDisplay();
          return Google.getDistance(stop)
          .then(function(distance){
            stop.distance = distance.value;
            stop.isNew = false;
            return Trip.addStop(stop);
          });

        };

        $scope.removeStop = function(){
          var stop = Stop.getCurrent();
          return Trip.removeStop(stop);
        };

        $scope.editTrip = function(){
          Trip.getCurrentTrip().name = Trip.getCurrentTrip().newName;
          Trip.getCurrentTrip().editing = false;
          return Trip.editTrip();

        };

        $scope.getPrice = function(){
          var rtn = '';
          if (Stop.getCurrentDisplay()){
            for(var i =0;i<Stop.getCurrentDisplay().price;i++)
              rtn+='$';
          }
          return rtn;
        };

        $scope.geocode = function(){
          if ($scope.input){
            return Google.getGeocode($scope.input.address)
            .then(function(_coords){
              var coords = [_coords.lat, _coords.lng];
              var stop = {coords: coords, isNew:true};
              Stop.setCurrent(stop);
              return Google.getNearby(stop, 'bar')
              .then(function(data){
                //Stop.clearCurrent();
                Stop.setShownStops(data);
              });


            });
          }
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

app.config(function($stateProvider){
  $stateProvider
    .state('login', {
      url: '/login',
      templateUrl: '/app/login/login.html',
      controller: function($scope, User, $state, $rootScope){
        $rootScope.hidenav = true;
        $scope.login = function(){
          User.loginUser($scope.creds)
          .then(function(){
            $state.go('home');
          });
        };
      }
    });
});

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

app.directive('stopItem', function(){
  return {
    scope:{
      item: '='
    },
    templateUrl: '/app/directives/stop-item/stop-item.html',
    controller: function($scope, Stop){
      $scope.getPrice = function(item){
        var rtn = '';
        for(var i =0;i<item.price;i++)
          rtn+='$';
        return rtn;
      };
      $scope.getType = function(){
        if ($scope.item.type==='bar')
          return 'local_bar';
        else if ($scope.item.type === 'restaurant')
          return 'restaurant';
        else if ($scope.item.type === 'entertainment')
          return 'sentiment_very_satisfied';
      };
      $scope.getName = function(){
        return $scope.item.name.slice(0,17);
      };
      $scope.getDistance = function(){
        return ($scope.item.distance * 0.000621371).toPrecision(1);
      };
      $scope.getCurrent = Stop.getCurrent;
      $scope.setCurrent = function(stop){
        Stop.setCurrent(stop);
        Stop.setShownStops(stop);

      };

    }
  };
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZhY3Rvcmllcy9Hb29nbGUuanMiLCJmYWN0b3JpZXMvU3RvcC5qcyIsImZhY3Rvcmllcy9UcmlwLmpzIiwiZmFjdG9yaWVzL1VzZXIuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsInByb2ZpbGUvcHJvZmlsZS5qcyIsImRpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImRpcmVjdGl2ZXMvc3RvcC1pdGVtL3N0b3BJdGVtLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsndWkucm91dGVyJywgJ25nQW5pbWF0ZScsICduZ01hcCcsICdjaGFydC5qcyddKTtcbmFwcC5jb25maWcoZnVuY3Rpb24oJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcil7XG4gICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xufSk7XG4iLCJhcHAuZmFjdG9yeShcIkdvb2dsZVwiLCBmdW5jdGlvbigkaHR0cCwgU3RvcCl7XG4gIHJldHVybiB7XG4gICAgZ2V0TmVhcmJ5OiBmdW5jdGlvbihzdG9wLCBrZXl3b3JkKXtcbiAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICBsb2NhdGlvbjogc3RvcC5jb29yZHMudG9TdHJpbmcoKSxcbiAgICAgICAgcmFkaXVzOiAxMDAwLFxuICAgICAgICBrZXl3b3JkOiBrZXl3b3JkXG4gICAgICB9O1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvZ29vZ2xlL25lYXJieScsIGRhdGEpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICB2YXIgcnRuID0gcmVzLmRhdGEubWFwKGZ1bmN0aW9uKGl0ZW0saSl7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIF9pZDogaSsnJyxcbiAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZSxcbiAgICAgICAgICAgIHR5cGU6IGtleXdvcmQsXG4gICAgICAgICAgICBjb29yZHM6IFtpdGVtLmdlb21ldHJ5LmxvY2F0aW9uLmxhdCxpdGVtLmdlb21ldHJ5LmxvY2F0aW9uLmxuZ10sXG4gICAgICAgICAgICBwcmljZTogaXRlbS5wcmljZV9sZXZlbCxcbiAgICAgICAgICAgIHJhdGluZzogaXRlbS5yYXRpbmcsXG4gICAgICAgICAgICBpc05ldzogdHJ1ZVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcnRuO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBnZXREaXN0YW5jZTogZnVuY3Rpb24obmV3U3RvcCl7XG4gICAgICB2YXIgY3VycmVudFN0b3AgPSBTdG9wLmdldEN1cnJlbnQoKTtcbiAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICBvcmlnaW5zOiBjdXJyZW50U3RvcC5jb29yZHMudG9TdHJpbmcoKSxcbiAgICAgICAgZGVzdGluYXRpb25zOiBuZXdTdG9wLmNvb3Jkcy50b1N0cmluZygpLFxuICAgICAgICB1bml0czogJ2ltcGVyaWFsJyxcbiAgICAgICAgbW9kZTogJ3dhbGtpbmcnXG4gICAgICB9O1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvZ29vZ2xlL2Rpc3RhbmNlJywgZGF0YSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZ2V0R2VvY29kZTogZnVuY3Rpb24oaW5wdXQpe1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvZ29vZ2xlL2dlb2NvZGUnLCB7YWRkcmVzczogaW5wdXR9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnU3RvcCcsIGZ1bmN0aW9uKE5nTWFwKXtcbiAgdmFyIG1hcCwgY3VycmVudFN0b3AsIHNob3duU3RvcHMsIGN1cnJlbnREaXNwbGF5U3RvcDtcbiAgTmdNYXAuZ2V0TWFwKCkudGhlbihmdW5jdGlvbihfbWFwKXtcbiAgICBtYXAgPSBfbWFwO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBzZXRDdXJyZW50OiBmdW5jdGlvbihzdG9wLCBzaG93KXtcbiAgICAgIGN1cnJlbnREaXNwbGF5U3RvcCA9IG51bGw7XG4gICAgICBjdXJyZW50U3RvcCA9IHN0b3A7XG4gICAgICBtYXAuaGlkZUluZm9XaW5kb3coJ2l3Jyk7XG5cbiAgICB9LFxuICAgIGNsZWFyQ3VycmVudDogZnVuY3Rpb24oKXtcbiAgICAgIGN1cnJlbnRTdG9wID0gbnVsbDtcbiAgICB9LFxuICAgIGdldERldGFpbHM6IGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgY3VycmVudERpc3BsYXlTdG9wID0gc3RvcDtcbiAgICAgIC8vY3VycmVudFN0b3AgPSBudWxsO1xuICAgICAgbWFwLnNob3dJbmZvV2luZG93KCdpdycsIHN0b3AuX2lkKTtcbiAgICB9LFxuICAgIGdldEN1cnJlbnREaXNwbGF5OiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGN1cnJlbnREaXNwbGF5U3RvcDtcbiAgICB9LFxuICAgIGdldEN1cnJlbnQ6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gY3VycmVudFN0b3A7XG4gICAgfSxcbiAgICBnZXRTaG93blN0b3BzOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHNob3duU3RvcHM7XG4gICAgfSxcbiAgICBzZXRTaG93blN0b3BzOiBmdW5jdGlvbihzdG9wcyl7XG4gICAgICBtYXAuaGlkZUluZm9XaW5kb3coJ2l3Jyk7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShzdG9wcykpXG4gICAgICAgIHNob3duU3RvcHMgPSBzdG9wcztcbiAgICAgIGVsc2Uge1xuICAgICAgICBzaG93blN0b3BzID0gW3N0b3BzXTtcbiAgICAgIH1cbiAgICAgIHZhciBib3VuZHMgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nQm91bmRzKCk7XG4gICAgICBzaG93blN0b3BzLmZvckVhY2goZnVuY3Rpb24oc3RvcCl7XG4gICAgICAgIHZhciBsYXRsbmcgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHN0b3AuY29vcmRzWzBdLCBzdG9wLmNvb3Jkc1sxXSk7XG4gICAgICAgIGJvdW5kcy5leHRlbmQobGF0bG5nKTtcbiAgICAgIH0pO1xuICAgICAgaWYgKHNob3duU3RvcHMubGVuZ3RoKVxuICAgICAgICBtYXAuc2V0Q2VudGVyKGJvdW5kcy5nZXRDZW50ZXIoKSk7XG4gICAgICBpZiAoc2hvd25TdG9wcy5sZW5ndGggPiAxKVxuICAgICAgICBtYXAuZml0Qm91bmRzKGJvdW5kcyk7XG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnVHJpcCcsIGZ1bmN0aW9uKCRodHRwLCBTdG9wKXtcbiAgdmFyIGN1cnJlbnRUcmlwO1xuICByZXR1cm4ge1xuICAgIGVkaXRUcmlwOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuICRodHRwLnB1dCgnL2FwaS90cmlwcy8nICsgY3VycmVudFRyaXAuX2lkLCB7bmFtZTogY3VycmVudFRyaXAubmV3TmFtZSB9KTtcbiAgICB9LFxuICAgIGFkZFN0b3A6IGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgdmFyIGRhdGEgPSB7XG5cbiAgICAgIH07XG4gICAgICByZXR1cm4gJGh0dHAucHV0KCcvYXBpL3RyaXBzLycgKyBjdXJyZW50VHJpcC5faWQsIHtzdG9wOiBzdG9wfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHZhciBuZXdTdG9wID0gcmVzLmRhdGE7XG4gICAgICAgIFN0b3Auc2V0U2hvd25TdG9wcyhzdG9wKTtcbiAgICAgICAgY3VycmVudFRyaXAuc3RvcHMudW5zaGlmdChzdG9wKTtcbiAgICAgICAgU3RvcC5zZXRDdXJyZW50KG5ld1N0b3ApO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICByZW1vdmVTdG9wOiBmdW5jdGlvbihzdG9wKXtcbiAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvdHJpcHMvJyArIGN1cnJlbnRUcmlwLl9pZCArIFwiL3N0b3BzL1wiICsgc3RvcC5faWQpXG4gICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICB2YXIgaWR4ID0gY3VycmVudFRyaXAuc3RvcHMuaW5kZXhPZihzdG9wKTtcbiAgICAgICAgY3VycmVudFRyaXAuc3RvcHMuc3BsaWNlKGlkeCwxKTtcbiAgICAgICAgU3RvcC5jbGVhckN1cnJlbnQoKTtcbiAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKFtdKTtcbiAgICAgICAgLy8gaWYgKGN1cnJlbnRUcmlwLnN0b3BzLmxlbmd0aClcbiAgICAgICAgLy8gICBTdG9wLnNldEN1cnJlbnQoY3VycmVudFRyaXAuc3RvcHNbMF0sIHRydWUpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBzZXRDdXJyZW50VHJpcDogZnVuY3Rpb24odHJpcCl7XG4gICAgICBjdXJyZW50VHJpcCA9IHRyaXA7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50VHJpcDogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBjdXJyZW50VHJpcDtcbiAgICB9LFxuICAgIGNyZWF0ZVRyaXA6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS90cmlwcycpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHJlbW92ZVRyaXA6IGZ1bmN0aW9uKHRyaXApe1xuICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZSgnL2FwaS90cmlwcy8nICsgdHJpcC5faWQpO1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1VzZXInLCBmdW5jdGlvbigkaHR0cCl7XG4gIHJldHVybiB7XG4gICAgZ2V0VXNlcjogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgY3JlYXRlVXNlcjogZnVuY3Rpb24oY3JlZHMpe1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9jcmVhdGUnLCBjcmVkcylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgbG9naW5Vc2VyOiBmdW5jdGlvbihjcmVkcyl7XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZHMpO1xuICAgIH0sXG4gICAgbG9nb3V0VXNlcjogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9nb3V0Jyk7XG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcbiAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICB1cmw6ICcvJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2FwcC9ob21lL2hvbWUuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbih1c2VyLCAkc3RhdGUsICRyb290U2NvcGUsICRzY29wZSwgU3RvcCxUcmlwLCBHb29nbGUpe1xuICAgICAgICAkcm9vdFNjb3BlLmhpZGVuYXYgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF1c2VyKVxuICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICBpZiAoIVRyaXAuZ2V0Q3VycmVudFRyaXAoKSlcbiAgICAgICAgICBUcmlwLnNldEN1cnJlbnRUcmlwKHVzZXIudHJpcHNbMF0pO1xuICAgICAgICAkc2NvcGUuZ2V0Q3VycmVudFRyaXAgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIHJldHVybiBUcmlwLmdldEN1cnJlbnRUcmlwKCk7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5zaG93RGV0YWlscyA9IGZ1bmN0aW9uKGUsIHN0b3Ape1xuICAgICAgICAgIC8vIGlmICghU3RvcC5nZXRDdXJyZW50KCkpXG4gICAgICAgICAgICBTdG9wLmdldERldGFpbHMoc3RvcCk7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5nZXROZWFyYnkgPSBmdW5jdGlvbihrZXl3b3JkKXtcbiAgICAgICAgICB2YXIgY3VycmVudFN0b3AgPSBTdG9wLmdldEN1cnJlbnQoKTtcbiAgICAgICAgICBpZiAoY3VycmVudFN0b3Ape1xuICAgICAgICAgICAgcmV0dXJuIEdvb2dsZS5nZXROZWFyYnkoY3VycmVudFN0b3AsIGtleXdvcmQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgLy9TdG9wLmNsZWFyQ3VycmVudCgpO1xuICAgICAgICAgICAgICBTdG9wLnNldFNob3duU3RvcHMoZGF0YSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5zaG93blN0b3BzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICByZXR1cm4gU3RvcC5nZXRTaG93blN0b3BzKCk7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5hZGRTdG9wID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICB2YXIgc3RvcCA9IFN0b3AuZ2V0Q3VycmVudERpc3BsYXkoKTtcbiAgICAgICAgICByZXR1cm4gR29vZ2xlLmdldERpc3RhbmNlKHN0b3ApXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGlzdGFuY2Upe1xuICAgICAgICAgICAgc3RvcC5kaXN0YW5jZSA9IGRpc3RhbmNlLnZhbHVlO1xuICAgICAgICAgICAgc3RvcC5pc05ldyA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuIFRyaXAuYWRkU3RvcChzdG9wKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5yZW1vdmVTdG9wID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICB2YXIgc3RvcCA9IFN0b3AuZ2V0Q3VycmVudCgpO1xuICAgICAgICAgIHJldHVybiBUcmlwLnJlbW92ZVN0b3Aoc3RvcCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmVkaXRUcmlwID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICBUcmlwLmdldEN1cnJlbnRUcmlwKCkubmFtZSA9IFRyaXAuZ2V0Q3VycmVudFRyaXAoKS5uZXdOYW1lO1xuICAgICAgICAgIFRyaXAuZ2V0Q3VycmVudFRyaXAoKS5lZGl0aW5nID0gZmFsc2U7XG4gICAgICAgICAgcmV0dXJuIFRyaXAuZWRpdFRyaXAoKTtcblxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5nZXRQcmljZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIHJ0biA9ICcnO1xuICAgICAgICAgIGlmIChTdG9wLmdldEN1cnJlbnREaXNwbGF5KCkpe1xuICAgICAgICAgICAgZm9yKHZhciBpID0wO2k8U3RvcC5nZXRDdXJyZW50RGlzcGxheSgpLnByaWNlO2krKylcbiAgICAgICAgICAgICAgcnRuKz0nJCc7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBydG47XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmdlb2NvZGUgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIGlmICgkc2NvcGUuaW5wdXQpe1xuICAgICAgICAgICAgcmV0dXJuIEdvb2dsZS5nZXRHZW9jb2RlKCRzY29wZS5pbnB1dC5hZGRyZXNzKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oX2Nvb3Jkcyl7XG4gICAgICAgICAgICAgIHZhciBjb29yZHMgPSBbX2Nvb3Jkcy5sYXQsIF9jb29yZHMubG5nXTtcbiAgICAgICAgICAgICAgdmFyIHN0b3AgPSB7Y29vcmRzOiBjb29yZHMsIGlzTmV3OnRydWV9O1xuICAgICAgICAgICAgICBTdG9wLnNldEN1cnJlbnQoc3RvcCk7XG4gICAgICAgICAgICAgIHJldHVybiBHb29nbGUuZ2V0TmVhcmJ5KHN0b3AsICdiYXInKVxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAvL1N0b3AuY2xlYXJDdXJyZW50KCk7XG4gICAgICAgICAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKGRhdGEpO1xuICAgICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5nZXRDdXJyZW50ID0gU3RvcC5nZXRDdXJyZW50O1xuICAgICAgICAkc2NvcGUuY3VycmVudERpc3BsYXlTdG9wID0gU3RvcC5nZXRDdXJyZW50RGlzcGxheTtcbiAgICAgIH0sXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIHVzZXI6IGZ1bmN0aW9uKFVzZXIpe1xuICAgICAgICAgIHJldHVybiBVc2VyLmdldFVzZXIoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcbiAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgdXJsOiAnL2xvZ2luJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2FwcC9sb2dpbi9sb2dpbi5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgVXNlciwgJHN0YXRlLCAkcm9vdFNjb3BlKXtcbiAgICAgICAgJHJvb3RTY29wZS5oaWRlbmF2ID0gdHJ1ZTtcbiAgICAgICAgJHNjb3BlLmxvZ2luID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICBVc2VyLmxvZ2luVXNlcigkc2NvcGUuY3JlZHMpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCBDaGFydEpzUHJvdmlkZXIpe1xuICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgncHJvZmlsZScsIHtcbiAgICAgIHVybDogJy9wcm9maWxlJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2FwcC9wcm9maWxlL3Byb2ZpbGUuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbih1c2VyLCAkc2NvcGUsIE5nTWFwLCAkc3RhdGUsIFRyaXAsIFVzZXIpe1xuICAgICAgICBDaGFydEpzUHJvdmlkZXIuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgbWFpbnRhaW5Bc3BlY3RSYXRpbzogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgICRzY29wZS5kYXRhID1bXTtcbiAgICAgICAgTmdNYXAuZ2V0TWFwKHtpZDogJ3Byb2ZpbGVfbWFwJ30pLnRoZW4oZnVuY3Rpb24oX21hcCl7XG4gICAgICAgICAgbWFwID0gX21hcDtcbiAgICAgICAgfSk7XG4gICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgJHNjb3BlLnNldFNlbGVjdGVkID0gZnVuY3Rpb24odHJpcCl7XG4gICAgICAgICAgJHNjb3BlLnNlbGVjdGVkVHJpcCA9IHRyaXA7XG4gICAgICAgICAgdmFyIGJvdW5kcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmdCb3VuZHMoKTtcbiAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRUcmlwLnN0b3BzLmZvckVhY2goZnVuY3Rpb24oc3RvcCl7XG4gICAgICAgICAgICB2YXIgbGF0bG5nID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhzdG9wLmNvb3Jkc1swXSwgc3RvcC5jb29yZHNbMV0pO1xuICAgICAgICAgICAgYm91bmRzLmV4dGVuZChsYXRsbmcpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbWFwLnNldENlbnRlcihib3VuZHMuZ2V0Q2VudGVyKCkpO1xuICAgICAgICAgICAgbWFwLmZpdEJvdW5kcyhib3VuZHMpO1xuICAgICAgICAgICAgZ2V0Q2hhcnREYXRhKCk7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5nZXRUb3RhbFByaWNlID0gZnVuY3Rpb24odHJpcCl7XG4gICAgICAgICAgdmFyIGl0ZW1zID0gdHJpcC5zdG9wcy5maWx0ZXIoZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS5wcmljZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB2YXIgdG90YWwgPSBpdGVtcy5yZWR1Y2UoZnVuY3Rpb24oYWNjLCBpdGVtKXtcbiAgICAgICAgICAgIHJldHVybiBhY2MgKyBpdGVtLnByaWNlO1xuICAgICAgICAgIH0sMCkgLyBpdGVtcy5sZW5ndGg7XG4gICAgICAgICAgdmFyIHJvdW5kZWQgPSBNYXRoLnJvdW5kKHRvdGFsKTtcbiAgICAgICAgICB2YXIgcnRuPScnO1xuICAgICAgICAgIGZvcih2YXIgaSA9MDtpPHJvdW5kZWQ7aSsrKVxuICAgICAgICAgICAgcnRuKz0nJCc7XG4gICAgICAgICAgcmV0dXJuIHJ0bjtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmdldFRvdGFsRGlzdGFuY2UgPSBmdW5jdGlvbih0cmlwKXtcbiAgICAgICAgICB2YXIgaXRlbXMgPSB0cmlwLnN0b3BzLmZpbHRlcihmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgICAgIHJldHVybiBpdGVtLmRpc3RhbmNlO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHZhciB0b3RhbCA9IGl0ZW1zLnJlZHVjZShmdW5jdGlvbihhY2MsIGl0ZW0pe1xuICAgICAgICAgICAgcmV0dXJuIGFjYyArIGl0ZW0uZGlzdGFuY2U7XG4gICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgcmV0dXJuICh0b3RhbCAqIDAuMDAwNjIxMzcxKS50b1ByZWNpc2lvbigyKSArIFwiIG1pLlwiO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZ2V0TG9jYXRpb25zID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkVHJpcCl7XG4gICAgICAgICAgICByZXR1cm4gJHNjb3BlLnNlbGVjdGVkVHJpcC5zdG9wcy5tYXAoZnVuY3Rpb24oc3RvcCl7XG4gICAgICAgICAgICAgIHJldHVybiBzdG9wLmNvb3JkcztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmxvYWRUcmlwID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICBUcmlwLnNldEN1cnJlbnRUcmlwKCRzY29wZS5zZWxlY3RlZFRyaXApO1xuICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9O1xuICAgICAgICBmdW5jdGlvbiBnZXRDaGFydERhdGEoKXtcbiAgICAgICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkVHJpcCl7XG4gICAgICAgICAgdmFyIGNvc3RJdGVtcyA9IFtdLCBkaXN0SXRlbXMgPVtdO1xuICAgICAgICAgIHZhciBuID0gJHNjb3BlLnNlbGVjdGVkVHJpcC5zdG9wcy5sZW5ndGg7XG4gICAgICAgICAgZm9yKHZhciBpID0wO2k8bjtpKyspe1xuICAgICAgICAgICAgdmFyIHN0b3AgPSAkc2NvcGUuc2VsZWN0ZWRUcmlwLnN0b3BzW2ldO1xuICAgICAgICAgICAgZGlzdEl0ZW1zLnB1c2goIE51bWJlcigobiAvIChzdG9wLmRpc3RhbmNlICogMC4wMDA2MjEzNzEpKS50b1ByZWNpc2lvbigyKSkpO1xuICAgICAgICAgICAgY29zdEl0ZW1zLnB1c2goc3RvcC5wcmljZSB8fCAwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLmRhdGEucHVzaChjb3N0SXRlbXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUucmVtb3ZlVHJpcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgcmV0dXJuIFRyaXAucmVtb3ZlVHJpcCgkc2NvcGUuc2VsZWN0ZWRUcmlwKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gVXNlci5nZXRVc2VyKCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmdldExhYmVscyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZFRyaXApe1xuICAgICAgICAgICAgcmV0dXJuICRzY29wZS5zZWxlY3RlZFRyaXAuc3RvcHMubWFwKGZ1bmN0aW9uKGl0ZW0saSl7XG4gICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUubGFiZWxzID0gW1wiSmFudWFyeVwiLCBcIkZlYnJ1YXJ5XCIsIFwiTWFyY2hcIiwgXCJBcHJpbFwiLCBcIk1heVwiLCBcIkp1bmVcIiwgXCJKdWx5XCJdO1xuICAkc2NvcGUuc2VyaWVzID0gWydBdmVyYWdlIGNvc3QgcGVyIHN0b3AnLCAnQXZlcmFnZSBkaXN0YW5jZSB0byBzdG9wJ107XG4gIC8vICRzY29wZS5kYXRhID0gW1xuICAvLyAgIFs2NSwgNTksIDgwLCA4MSwgNTYsIDU1LCA0MF0sXG4gIC8vICAgWzI4LCA0OCwgNDAsIDE5LCA4NiwgMjcsIDkwXVxuICAvLyBdO1xuICAgICAgfSxcbiAgICAgIHJlc29sdmU6e1xuICAgICAgICB1c2VyOiBmdW5jdGlvbihVc2VyKXtcbiAgICAgICAgICByZXR1cm4gVXNlci5nZXRVc2VyKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHtcbiAgICB0ZW1wbGF0ZVVybDogJy9hcHAvZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgVXNlciwgJHN0YXRlLCBOZ01hcCwgVHJpcCwgU3RvcCl7XG4gICAgICAkc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgVXNlci5sb2dvdXRVc2VyKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgICRzY29wZS5jcmVhdGVOZXcgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gVHJpcC5jcmVhdGVUcmlwKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24odHJpcCl7XG4gICAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKFtdKTtcbiAgICAgICAgICBUcmlwLnNldEN1cnJlbnRUcmlwKHRyaXApO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdzdG9wSXRlbScsIGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgc2NvcGU6e1xuICAgICAgaXRlbTogJz0nXG4gICAgfSxcbiAgICB0ZW1wbGF0ZVVybDogJy9hcHAvZGlyZWN0aXZlcy9zdG9wLWl0ZW0vc3RvcC1pdGVtLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgU3RvcCl7XG4gICAgICAkc2NvcGUuZ2V0UHJpY2UgPSBmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgdmFyIHJ0biA9ICcnO1xuICAgICAgICBmb3IodmFyIGkgPTA7aTxpdGVtLnByaWNlO2krKylcbiAgICAgICAgICBydG4rPSckJztcbiAgICAgICAgcmV0dXJuIHJ0bjtcbiAgICAgIH07XG4gICAgICAkc2NvcGUuZ2V0VHlwZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICgkc2NvcGUuaXRlbS50eXBlPT09J2JhcicpXG4gICAgICAgICAgcmV0dXJuICdsb2NhbF9iYXInO1xuICAgICAgICBlbHNlIGlmICgkc2NvcGUuaXRlbS50eXBlID09PSAncmVzdGF1cmFudCcpXG4gICAgICAgICAgcmV0dXJuICdyZXN0YXVyYW50JztcbiAgICAgICAgZWxzZSBpZiAoJHNjb3BlLml0ZW0udHlwZSA9PT0gJ2VudGVydGFpbm1lbnQnKVxuICAgICAgICAgIHJldHVybiAnc2VudGltZW50X3Zlcnlfc2F0aXNmaWVkJztcbiAgICAgIH07XG4gICAgICAkc2NvcGUuZ2V0TmFtZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkc2NvcGUuaXRlbS5uYW1lLnNsaWNlKDAsMTcpO1xuICAgICAgfTtcbiAgICAgICRzY29wZS5nZXREaXN0YW5jZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAoJHNjb3BlLml0ZW0uZGlzdGFuY2UgKiAwLjAwMDYyMTM3MSkudG9QcmVjaXNpb24oMSk7XG4gICAgICB9O1xuICAgICAgJHNjb3BlLmdldEN1cnJlbnQgPSBTdG9wLmdldEN1cnJlbnQ7XG4gICAgICAkc2NvcGUuc2V0Q3VycmVudCA9IGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgICBTdG9wLnNldEN1cnJlbnQoc3RvcCk7XG4gICAgICAgIFN0b3Auc2V0U2hvd25TdG9wcyhzdG9wKTtcblxuICAgICAgfTtcblxuICAgIH1cbiAgfTtcbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
