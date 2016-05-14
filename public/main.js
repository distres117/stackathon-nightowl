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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZhY3Rvcmllcy9Hb29nbGUuanMiLCJmYWN0b3JpZXMvU3RvcC5qcyIsImZhY3Rvcmllcy9UcmlwLmpzIiwiZmFjdG9yaWVzL1VzZXIuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsInByb2ZpbGUvcHJvZmlsZS5qcyIsImRpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImRpcmVjdGl2ZXMvc3RvcC1pdGVtL3N0b3BJdGVtLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsndWkucm91dGVyJywgJ25nQW5pbWF0ZScsICduZ01hcCcsICdjaGFydC5qcyddKTtcbmFwcC5jb25maWcoZnVuY3Rpb24oJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcil7XG4gICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xufSk7XG4iLCJhcHAuZmFjdG9yeShcIkdvb2dsZVwiLCBmdW5jdGlvbigkaHR0cCwgU3RvcCl7XG4gIHJldHVybiB7XG4gICAgZ2V0TmVhcmJ5OiBmdW5jdGlvbihzdG9wLCBrZXl3b3JkKXtcbiAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICBsb2NhdGlvbjogc3RvcC5jb29yZHMudG9TdHJpbmcoKSxcbiAgICAgICAgcmFkaXVzOiAxMDAwLFxuICAgICAgICBrZXl3b3JkOiBrZXl3b3JkXG4gICAgICB9O1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvZ29vZ2xlL25lYXJieScsIGRhdGEpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICB2YXIgcnRuID0gcmVzLmRhdGEubWFwKGZ1bmN0aW9uKGl0ZW0saSl7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIF9pZDogaSsnJyxcbiAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZSxcbiAgICAgICAgICAgIHR5cGU6IGtleXdvcmQsXG4gICAgICAgICAgICBjb29yZHM6IFtpdGVtLmdlb21ldHJ5LmxvY2F0aW9uLmxhdCxpdGVtLmdlb21ldHJ5LmxvY2F0aW9uLmxuZ10sXG4gICAgICAgICAgICBwcmljZTogaXRlbS5wcmljZV9sZXZlbCxcbiAgICAgICAgICAgIHJhdGluZzogaXRlbS5yYXRpbmcsXG4gICAgICAgICAgICBpc05ldzogdHJ1ZVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcnRuO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBnZXREaXN0YW5jZTogZnVuY3Rpb24obmV3U3RvcCl7XG4gICAgICB2YXIgY3VycmVudFN0b3AgPSBTdG9wLmdldEN1cnJlbnQoKTtcbiAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICBvcmlnaW5zOiBjdXJyZW50U3RvcC5jb29yZHMudG9TdHJpbmcoKSxcbiAgICAgICAgZGVzdGluYXRpb25zOiBuZXdTdG9wLmNvb3Jkcy50b1N0cmluZygpLFxuICAgICAgICB1bml0czogJ2ltcGVyaWFsJyxcbiAgICAgICAgbW9kZTogJ3dhbGtpbmcnXG4gICAgICB9O1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvZ29vZ2xlL2Rpc3RhbmNlJywgZGF0YSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1N0b3AnLCBmdW5jdGlvbihOZ01hcCl7XG4gIHZhciBtYXAsIGN1cnJlbnRTdG9wLCBzaG93blN0b3BzLCBjdXJyZW50RGlzcGxheVN0b3A7XG4gIE5nTWFwLmdldE1hcCgpLnRoZW4oZnVuY3Rpb24oX21hcCl7XG4gICAgbWFwID0gX21hcDtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgc2V0Q3VycmVudDogZnVuY3Rpb24oc3RvcCwgc2hvdyl7XG4gICAgICBjdXJyZW50RGlzcGxheVN0b3AgPSBudWxsO1xuICAgICAgY3VycmVudFN0b3AgPSBzdG9wO1xuICAgICAgbWFwLmhpZGVJbmZvV2luZG93KCdpdycpO1xuXG4gICAgfSxcbiAgICBjbGVhckN1cnJlbnQ6IGZ1bmN0aW9uKCl7XG4gICAgICBjdXJyZW50U3RvcCA9IG51bGw7XG4gICAgfSxcbiAgICBnZXREZXRhaWxzOiBmdW5jdGlvbihzdG9wKXtcbiAgICAgIGN1cnJlbnREaXNwbGF5U3RvcCA9IHN0b3A7XG4gICAgICAvL2N1cnJlbnRTdG9wID0gbnVsbDtcbiAgICAgIG1hcC5zaG93SW5mb1dpbmRvdygnaXcnLCBzdG9wLl9pZCk7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50RGlzcGxheTogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBjdXJyZW50RGlzcGxheVN0b3A7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50OiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGN1cnJlbnRTdG9wO1xuICAgIH0sXG4gICAgZ2V0U2hvd25TdG9wczogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBzaG93blN0b3BzO1xuICAgIH0sXG4gICAgc2V0U2hvd25TdG9wczogZnVuY3Rpb24oc3RvcHMpe1xuICAgICAgbWFwLmhpZGVJbmZvV2luZG93KCdpdycpO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3RvcHMpKVxuICAgICAgICBzaG93blN0b3BzID0gc3RvcHM7XG4gICAgICBlbHNlIHtcbiAgICAgICAgc2hvd25TdG9wcyA9IFtzdG9wc107XG4gICAgICB9XG4gICAgICB2YXIgYm91bmRzID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZ0JvdW5kcygpO1xuICAgICAgc2hvd25TdG9wcy5mb3JFYWNoKGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgICB2YXIgbGF0bG5nID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhzdG9wLmNvb3Jkc1swXSwgc3RvcC5jb29yZHNbMV0pO1xuICAgICAgICBib3VuZHMuZXh0ZW5kKGxhdGxuZyk7XG4gICAgICB9KTtcbiAgICAgIGlmIChzaG93blN0b3BzLmxlbmd0aClcbiAgICAgICAgbWFwLnNldENlbnRlcihib3VuZHMuZ2V0Q2VudGVyKCkpO1xuICAgICAgaWYgKHNob3duU3RvcHMubGVuZ3RoID4gMSlcbiAgICAgICAgbWFwLmZpdEJvdW5kcyhib3VuZHMpO1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1RyaXAnLCBmdW5jdGlvbigkaHR0cCwgU3RvcCl7XG4gIHZhciBjdXJyZW50VHJpcDtcbiAgcmV0dXJuIHtcbiAgICBlZGl0VHJpcDogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiAkaHR0cC5wdXQoJy9hcGkvdHJpcHMvJyArIGN1cnJlbnRUcmlwLl9pZCwge25hbWU6IGN1cnJlbnRUcmlwLm5ld05hbWUgfSk7XG4gICAgfSxcbiAgICBhZGRTdG9wOiBmdW5jdGlvbihzdG9wKXtcbiAgICAgIHZhciBkYXRhID0ge1xuXG4gICAgICB9O1xuICAgICAgcmV0dXJuICRodHRwLnB1dCgnL2FwaS90cmlwcy8nICsgY3VycmVudFRyaXAuX2lkLCB7c3RvcDogc3RvcH0pXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICB2YXIgbmV3U3RvcCA9IHJlcy5kYXRhO1xuICAgICAgICBTdG9wLnNldFNob3duU3RvcHMoc3RvcCk7XG4gICAgICAgIGN1cnJlbnRUcmlwLnN0b3BzLnVuc2hpZnQoc3RvcCk7XG4gICAgICAgIFN0b3Auc2V0Q3VycmVudChuZXdTdG9wKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcmVtb3ZlU3RvcDogZnVuY3Rpb24oc3RvcCl7XG4gICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKCcvYXBpL3RyaXBzLycgKyBjdXJyZW50VHJpcC5faWQgKyBcIi9zdG9wcy9cIiArIHN0b3AuX2lkKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGlkeCA9IGN1cnJlbnRUcmlwLnN0b3BzLmluZGV4T2Yoc3RvcCk7XG4gICAgICAgIGN1cnJlbnRUcmlwLnN0b3BzLnNwbGljZShpZHgsMSk7XG4gICAgICAgIFN0b3AuY2xlYXJDdXJyZW50KCk7XG4gICAgICAgIFN0b3Auc2V0U2hvd25TdG9wcyhbXSk7XG4gICAgICAgIC8vIGlmIChjdXJyZW50VHJpcC5zdG9wcy5sZW5ndGgpXG4gICAgICAgIC8vICAgU3RvcC5zZXRDdXJyZW50KGN1cnJlbnRUcmlwLnN0b3BzWzBdLCB0cnVlKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgc2V0Q3VycmVudFRyaXA6IGZ1bmN0aW9uKHRyaXApe1xuICAgICAgY3VycmVudFRyaXAgPSB0cmlwO1xuICAgIH0sXG4gICAgZ2V0Q3VycmVudFRyaXA6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gY3VycmVudFRyaXA7XG4gICAgfSxcbiAgICBjcmVhdGVUcmlwOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvdHJpcHMnKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICByZW1vdmVUcmlwOiBmdW5jdGlvbih0cmlwKXtcbiAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvdHJpcHMvJyArIHRyaXAuX2lkKTtcbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdVc2VyJywgZnVuY3Rpb24oJGh0dHApe1xuICByZXR1cm4ge1xuICAgIGdldFVzZXI6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGNyZWF0ZVVzZXI6IGZ1bmN0aW9uKGNyZWRzKXtcbiAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvY3JlYXRlJywgY3JlZHMpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGxvZ2luVXNlcjogZnVuY3Rpb24oY3JlZHMpe1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRzKTtcbiAgICB9LFxuICAgIGxvZ291dFVzZXI6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ291dCcpO1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdob21lJywge1xuICAgICAgdXJsOiAnLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9hcHAvaG9tZS9ob21lLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24odXNlciwgJHN0YXRlLCAkcm9vdFNjb3BlLCAkc2NvcGUsIFN0b3AsVHJpcCwgR29vZ2xlKXtcbiAgICAgICAgJHJvb3RTY29wZS5oaWRlbmF2ID0gZmFsc2U7XG4gICAgICAgIGlmICghdXNlcilcbiAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgaWYgKCFUcmlwLmdldEN1cnJlbnRUcmlwKCkpXG4gICAgICAgICAgVHJpcC5zZXRDdXJyZW50VHJpcCh1c2VyLnRyaXBzWzBdKTtcbiAgICAgICAgJHNjb3BlLmdldEN1cnJlbnRUcmlwID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICByZXR1cm4gVHJpcC5nZXRDdXJyZW50VHJpcCgpO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuc2hvd0RldGFpbHMgPSBmdW5jdGlvbihlLCBzdG9wKXtcbiAgICAgICAgICAvLyBpZiAoIVN0b3AuZ2V0Q3VycmVudCgpKVxuICAgICAgICAgICAgU3RvcC5nZXREZXRhaWxzKHN0b3ApO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZ2V0TmVhcmJ5ID0gZnVuY3Rpb24oa2V5d29yZCl7XG4gICAgICAgICAgdmFyIGN1cnJlbnRTdG9wID0gU3RvcC5nZXRDdXJyZW50KCk7XG4gICAgICAgICAgaWYgKGN1cnJlbnRTdG9wKXtcbiAgICAgICAgICAgIHJldHVybiBHb29nbGUuZ2V0TmVhcmJ5KGN1cnJlbnRTdG9wLCBrZXl3b3JkKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgIC8vU3RvcC5jbGVhckN1cnJlbnQoKTtcbiAgICAgICAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKGRhdGEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuc2hvd25TdG9wcyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgcmV0dXJuIFN0b3AuZ2V0U2hvd25TdG9wcygpO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuYWRkU3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIHN0b3AgPSBTdG9wLmdldEN1cnJlbnREaXNwbGF5KCk7XG4gICAgICAgICAgcmV0dXJuIEdvb2dsZS5nZXREaXN0YW5jZShzdG9wKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRpc3RhbmNlKXtcbiAgICAgICAgICAgIHN0b3AuZGlzdGFuY2UgPSBkaXN0YW5jZS52YWx1ZTtcbiAgICAgICAgICAgIHN0b3AuaXNOZXcgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiBUcmlwLmFkZFN0b3Aoc3RvcCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUucmVtb3ZlU3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIHN0b3AgPSBTdG9wLmdldEN1cnJlbnQoKTtcbiAgICAgICAgICByZXR1cm4gVHJpcC5yZW1vdmVTdG9wKHN0b3ApO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5lZGl0VHJpcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgVHJpcC5nZXRDdXJyZW50VHJpcCgpLm5hbWUgPSBUcmlwLmdldEN1cnJlbnRUcmlwKCkubmV3TmFtZTtcbiAgICAgICAgICBUcmlwLmdldEN1cnJlbnRUcmlwKCkuZWRpdGluZyA9IGZhbHNlO1xuICAgICAgICAgIHJldHVybiBUcmlwLmVkaXRUcmlwKCk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZ2V0UHJpY2UgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIHZhciBydG4gPSAnJztcbiAgICAgICAgICBpZiAoU3RvcC5nZXRDdXJyZW50RGlzcGxheSgpKXtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MDtpPFN0b3AuZ2V0Q3VycmVudERpc3BsYXkoKS5wcmljZTtpKyspXG4gICAgICAgICAgICAgIHJ0bis9JyQnO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcnRuO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZ2V0Q3VycmVudCA9IFN0b3AuZ2V0Q3VycmVudDtcbiAgICAgICAgJHNjb3BlLmN1cnJlbnREaXNwbGF5U3RvcCA9IFN0b3AuZ2V0Q3VycmVudERpc3BsYXk7XG4gICAgICB9LFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICB1c2VyOiBmdW5jdGlvbihVc2VyKXtcbiAgICAgICAgICByZXR1cm4gVXNlci5nZXRVc2VyKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9hcHAvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIFVzZXIsICRzdGF0ZSwgJHJvb3RTY29wZSl7XG4gICAgICAgICRyb290U2NvcGUuaGlkZW5hdiA9IHRydWU7XG4gICAgICAgICRzY29wZS5sb2dpbiA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgVXNlci5sb2dpblVzZXIoJHNjb3BlLmNyZWRzKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlciwgQ2hhcnRKc1Byb3ZpZGVyKXtcbiAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ3Byb2ZpbGUnLCB7XG4gICAgICB1cmw6ICcvcHJvZmlsZScsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9hcHAvcHJvZmlsZS9wcm9maWxlLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24odXNlciwgJHNjb3BlLCBOZ01hcCwgJHN0YXRlLCBUcmlwLCBVc2VyKXtcbiAgICAgICAgQ2hhcnRKc1Byb3ZpZGVyLnNldE9wdGlvbnMoe1xuICAgICAgICAgIG1haW50YWluQXNwZWN0UmF0aW86IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICAkc2NvcGUuZGF0YSA9W107XG4gICAgICAgIE5nTWFwLmdldE1hcCh7aWQ6ICdwcm9maWxlX21hcCd9KS50aGVuKGZ1bmN0aW9uKF9tYXApe1xuICAgICAgICAgIG1hcCA9IF9tYXA7XG4gICAgICAgIH0pO1xuICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICRzY29wZS5zZXRTZWxlY3RlZCA9IGZ1bmN0aW9uKHRyaXApe1xuICAgICAgICAgICRzY29wZS5zZWxlY3RlZFRyaXAgPSB0cmlwO1xuICAgICAgICAgIHZhciBib3VuZHMgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nQm91bmRzKCk7XG4gICAgICAgICAgJHNjb3BlLnNlbGVjdGVkVHJpcC5zdG9wcy5mb3JFYWNoKGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgICAgICAgdmFyIGxhdGxuZyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoc3RvcC5jb29yZHNbMF0sIHN0b3AuY29vcmRzWzFdKTtcbiAgICAgICAgICAgIGJvdW5kcy5leHRlbmQobGF0bG5nKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG1hcC5zZXRDZW50ZXIoYm91bmRzLmdldENlbnRlcigpKTtcbiAgICAgICAgICAgIG1hcC5maXRCb3VuZHMoYm91bmRzKTtcbiAgICAgICAgICAgIGdldENoYXJ0RGF0YSgpO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZ2V0VG90YWxQcmljZSA9IGZ1bmN0aW9uKHRyaXApe1xuICAgICAgICAgIHZhciBpdGVtcyA9IHRyaXAuc3RvcHMuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW0ucHJpY2U7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmFyIHRvdGFsID0gaXRlbXMucmVkdWNlKGZ1bmN0aW9uKGFjYywgaXRlbSl7XG4gICAgICAgICAgICByZXR1cm4gYWNjICsgaXRlbS5wcmljZTtcbiAgICAgICAgICB9LDApIC8gaXRlbXMubGVuZ3RoO1xuICAgICAgICAgIHZhciByb3VuZGVkID0gTWF0aC5yb3VuZCh0b3RhbCk7XG4gICAgICAgICAgdmFyIHJ0bj0nJztcbiAgICAgICAgICBmb3IodmFyIGkgPTA7aTxyb3VuZGVkO2krKylcbiAgICAgICAgICAgIHJ0bis9JyQnO1xuICAgICAgICAgIHJldHVybiBydG47XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5nZXRUb3RhbERpc3RhbmNlID0gZnVuY3Rpb24odHJpcCl7XG4gICAgICAgICAgdmFyIGl0ZW1zID0gdHJpcC5zdG9wcy5maWx0ZXIoZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS5kaXN0YW5jZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB2YXIgdG90YWwgPSBpdGVtcy5yZWR1Y2UoZnVuY3Rpb24oYWNjLCBpdGVtKXtcbiAgICAgICAgICAgIHJldHVybiBhY2MgKyBpdGVtLmRpc3RhbmNlO1xuICAgICAgICAgIH0sIDApO1xuICAgICAgICAgIHJldHVybiAodG90YWwgKiAwLjAwMDYyMTM3MSkudG9QcmVjaXNpb24oMikgKyBcIiBtaS5cIjtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmdldExvY2F0aW9ucyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZFRyaXApe1xuICAgICAgICAgICAgcmV0dXJuICRzY29wZS5zZWxlY3RlZFRyaXAuc3RvcHMubWFwKGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgICAgICAgICByZXR1cm4gc3RvcC5jb29yZHM7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5sb2FkVHJpcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgVHJpcC5zZXRDdXJyZW50VHJpcCgkc2NvcGUuc2VsZWN0ZWRUcmlwKTtcbiAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgfTtcbiAgICAgICAgZnVuY3Rpb24gZ2V0Q2hhcnREYXRhKCl7XG4gICAgICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZFRyaXApe1xuICAgICAgICAgIHZhciBjb3N0SXRlbXMgPSBbXSwgZGlzdEl0ZW1zID1bXTtcbiAgICAgICAgICB2YXIgbiA9ICRzY29wZS5zZWxlY3RlZFRyaXAuc3RvcHMubGVuZ3RoO1xuICAgICAgICAgIGZvcih2YXIgaSA9MDtpPG47aSsrKXtcbiAgICAgICAgICAgIHZhciBzdG9wID0gJHNjb3BlLnNlbGVjdGVkVHJpcC5zdG9wc1tpXTtcbiAgICAgICAgICAgIGRpc3RJdGVtcy5wdXNoKCBOdW1iZXIoKG4gLyAoc3RvcC5kaXN0YW5jZSAqIDAuMDAwNjIxMzcxKSkudG9QcmVjaXNpb24oMikpKTtcbiAgICAgICAgICAgIGNvc3RJdGVtcy5wdXNoKHN0b3AucHJpY2UgfHwgMCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS5kYXRhLnB1c2goY29zdEl0ZW1zKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLnJlbW92ZVRyaXAgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIHJldHVybiBUcmlwLnJlbW92ZVRyaXAoJHNjb3BlLnNlbGVjdGVkVHJpcClcbiAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmV0dXJuIFVzZXIuZ2V0VXNlcigpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5nZXRMYWJlbHMgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRUcmlwKXtcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc2VsZWN0ZWRUcmlwLnN0b3BzLm1hcChmdW5jdGlvbihpdGVtLGkpe1xuICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmxhYmVscyA9IFtcIkphbnVhcnlcIiwgXCJGZWJydWFyeVwiLCBcIk1hcmNoXCIsIFwiQXByaWxcIiwgXCJNYXlcIiwgXCJKdW5lXCIsIFwiSnVseVwiXTtcbiAgJHNjb3BlLnNlcmllcyA9IFsnQXZlcmFnZSBjb3N0IHBlciBzdG9wJywgJ0F2ZXJhZ2UgZGlzdGFuY2UgdG8gc3RvcCddO1xuICAvLyAkc2NvcGUuZGF0YSA9IFtcbiAgLy8gICBbNjUsIDU5LCA4MCwgODEsIDU2LCA1NSwgNDBdLFxuICAvLyAgIFsyOCwgNDgsIDQwLCAxOSwgODYsIDI3LCA5MF1cbiAgLy8gXTtcbiAgICAgIH0sXG4gICAgICByZXNvbHZlOntcbiAgICAgICAgdXNlcjogZnVuY3Rpb24oVXNlcil7XG4gICAgICAgICAgcmV0dXJuIFVzZXIuZ2V0VXNlcigpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgdGVtcGxhdGVVcmw6ICcvYXBwL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIFVzZXIsICRzdGF0ZSwgTmdNYXAsIFRyaXAsIFN0b3Ape1xuICAgICAgJHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIFVzZXIubG9nb3V0VXNlcigpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICAkc2NvcGUuY3JlYXRlTmV3ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIFRyaXAuY3JlYXRlVHJpcCgpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHRyaXApe1xuICAgICAgICAgIFN0b3Auc2V0U2hvd25TdG9wcyhbXSk7XG4gICAgICAgICAgVHJpcC5zZXRDdXJyZW50VHJpcCh0cmlwKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnc3RvcEl0ZW0nLCBmdW5jdGlvbigpe1xuICByZXR1cm4ge1xuICAgIHNjb3BlOntcbiAgICAgIGl0ZW06ICc9J1xuICAgIH0sXG4gICAgdGVtcGxhdGVVcmw6ICcvYXBwL2RpcmVjdGl2ZXMvc3RvcC1pdGVtL3N0b3AtaXRlbS5odG1sJyxcbiAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIFN0b3Ape1xuICAgICAgJHNjb3BlLmdldFByaWNlID0gZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgIHZhciBydG4gPSAnJztcbiAgICAgICAgZm9yKHZhciBpID0wO2k8aXRlbS5wcmljZTtpKyspXG4gICAgICAgICAgcnRuKz0nJCc7XG4gICAgICAgIHJldHVybiBydG47XG4gICAgICB9O1xuICAgICAgJHNjb3BlLmdldFR5cGUgPSBmdW5jdGlvbigpe1xuICAgICAgICBpZiAoJHNjb3BlLml0ZW0udHlwZT09PSdiYXInKVxuICAgICAgICAgIHJldHVybiAnbG9jYWxfYmFyJztcbiAgICAgICAgZWxzZSBpZiAoJHNjb3BlLml0ZW0udHlwZSA9PT0gJ3Jlc3RhdXJhbnQnKVxuICAgICAgICAgIHJldHVybiAncmVzdGF1cmFudCc7XG4gICAgICAgIGVsc2UgaWYgKCRzY29wZS5pdGVtLnR5cGUgPT09ICdlbnRlcnRhaW5tZW50JylcbiAgICAgICAgICByZXR1cm4gJ3NlbnRpbWVudF92ZXJ5X3NhdGlzZmllZCc7XG4gICAgICB9O1xuICAgICAgJHNjb3BlLmdldE5hbWUgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJHNjb3BlLml0ZW0ubmFtZS5zbGljZSgwLDE3KTtcbiAgICAgIH07XG4gICAgICAkc2NvcGUuZ2V0RGlzdGFuY2UgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gKCRzY29wZS5pdGVtLmRpc3RhbmNlICogMC4wMDA2MjEzNzEpLnRvUHJlY2lzaW9uKDEpO1xuICAgICAgfTtcbiAgICAgICRzY29wZS5nZXRDdXJyZW50ID0gU3RvcC5nZXRDdXJyZW50O1xuICAgICAgJHNjb3BlLnNldEN1cnJlbnQgPSBmdW5jdGlvbihzdG9wKXtcbiAgICAgICAgU3RvcC5zZXRDdXJyZW50KHN0b3ApO1xuICAgICAgICBTdG9wLnNldFNob3duU3RvcHMoc3RvcCk7XG5cbiAgICAgIH07XG5cbiAgICB9XG4gIH07XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
