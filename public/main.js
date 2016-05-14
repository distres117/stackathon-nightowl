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

app.directive('navbar', function(){
  return {
    templateUrl: '/app/directives/navbar/navbar.html',
    controller: function($scope, User, $state, NgMap){
      $scope.logout = function(){
        User.logoutUser()
        .then(function(){
          $state.go('login');
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZhY3Rvcmllcy9Hb29nbGUuanMiLCJmYWN0b3JpZXMvU3RvcC5qcyIsImZhY3Rvcmllcy9UcmlwLmpzIiwiZmFjdG9yaWVzL1VzZXIuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsInByb2ZpbGUvcHJvZmlsZS5qcyIsImRpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImRpcmVjdGl2ZXMvc3RvcC1pdGVtL3N0b3BJdGVtLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXInLCAnbmdBbmltYXRlJywgJ25nTWFwJywgJ2NoYXJ0LmpzJ10pO1xuYXBwLmNvbmZpZyhmdW5jdGlvbigkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKXtcbiAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG59KTtcbiIsImFwcC5mYWN0b3J5KFwiR29vZ2xlXCIsIGZ1bmN0aW9uKCRodHRwLCBTdG9wKXtcbiAgcmV0dXJuIHtcbiAgICBnZXROZWFyYnk6IGZ1bmN0aW9uKHN0b3AsIGtleXdvcmQpe1xuICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgIGxvY2F0aW9uOiBzdG9wLmNvb3Jkcy50b1N0cmluZygpLFxuICAgICAgICByYWRpdXM6IDEwMDAsXG4gICAgICAgIGtleXdvcmQ6IGtleXdvcmRcbiAgICAgIH07XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9nb29nbGUvbmVhcmJ5JywgZGF0YSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHZhciBydG4gPSByZXMuZGF0YS5tYXAoZnVuY3Rpb24oaXRlbSxpKXtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgX2lkOiBpKycnLFxuICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLFxuICAgICAgICAgICAgdHlwZToga2V5d29yZCxcbiAgICAgICAgICAgIGNvb3JkczogW2l0ZW0uZ2VvbWV0cnkubG9jYXRpb24ubGF0LGl0ZW0uZ2VvbWV0cnkubG9jYXRpb24ubG5nXSxcbiAgICAgICAgICAgIHByaWNlOiBpdGVtLnByaWNlX2xldmVsLFxuICAgICAgICAgICAgcmF0aW5nOiBpdGVtLnJhdGluZyxcbiAgICAgICAgICAgIGlzTmV3OiB0cnVlXG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBydG47XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGdldERpc3RhbmNlOiBmdW5jdGlvbihuZXdTdG9wKXtcbiAgICAgIHZhciBjdXJyZW50U3RvcCA9IFN0b3AuZ2V0Q3VycmVudCgpO1xuICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgIG9yaWdpbnM6IGN1cnJlbnRTdG9wLmNvb3Jkcy50b1N0cmluZygpLFxuICAgICAgICBkZXN0aW5hdGlvbnM6IG5ld1N0b3AuY29vcmRzLnRvU3RyaW5nKCksXG4gICAgICAgIHVuaXRzOiAnaW1wZXJpYWwnLFxuICAgICAgICBtb2RlOiAnd2Fsa2luZydcbiAgICAgIH07XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9nb29nbGUvZGlzdGFuY2UnLCBkYXRhKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnU3RvcCcsIGZ1bmN0aW9uKE5nTWFwKXtcbiAgdmFyIG1hcCwgY3VycmVudFN0b3AsIHNob3duU3RvcHMsIGN1cnJlbnREaXNwbGF5U3RvcDtcbiAgTmdNYXAuZ2V0TWFwKCkudGhlbihmdW5jdGlvbihfbWFwKXtcbiAgICBtYXAgPSBfbWFwO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBzZXRDdXJyZW50OiBmdW5jdGlvbihzdG9wLCBzaG93KXtcbiAgICAgIGN1cnJlbnREaXNwbGF5U3RvcCA9IG51bGw7XG4gICAgICBjdXJyZW50U3RvcCA9IHN0b3A7XG4gICAgICBtYXAuaGlkZUluZm9XaW5kb3coJ2l3Jyk7XG5cbiAgICB9LFxuICAgIGNsZWFyQ3VycmVudDogZnVuY3Rpb24oKXtcbiAgICAgIGN1cnJlbnRTdG9wID0gbnVsbDtcbiAgICB9LFxuICAgIGdldERldGFpbHM6IGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgY3VycmVudERpc3BsYXlTdG9wID0gc3RvcDtcbiAgICAgIC8vY3VycmVudFN0b3AgPSBudWxsO1xuICAgICAgbWFwLnNob3dJbmZvV2luZG93KCdpdycsIHN0b3AuX2lkKTtcbiAgICB9LFxuICAgIGdldEN1cnJlbnREaXNwbGF5OiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGN1cnJlbnREaXNwbGF5U3RvcDtcbiAgICB9LFxuICAgIGdldEN1cnJlbnQ6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gY3VycmVudFN0b3A7XG4gICAgfSxcbiAgICBnZXRTaG93blN0b3BzOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHNob3duU3RvcHM7XG4gICAgfSxcbiAgICBzZXRTaG93blN0b3BzOiBmdW5jdGlvbihzdG9wcyl7XG4gICAgICBtYXAuaGlkZUluZm9XaW5kb3coJ2l3Jyk7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShzdG9wcykpXG4gICAgICAgIHNob3duU3RvcHMgPSBzdG9wcztcbiAgICAgIGVsc2Uge1xuICAgICAgICBzaG93blN0b3BzID0gW3N0b3BzXTtcbiAgICAgIH1cbiAgICAgIHZhciBib3VuZHMgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nQm91bmRzKCk7XG4gICAgICBzaG93blN0b3BzLmZvckVhY2goZnVuY3Rpb24oc3RvcCl7XG4gICAgICAgIHZhciBsYXRsbmcgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHN0b3AuY29vcmRzWzBdLCBzdG9wLmNvb3Jkc1sxXSk7XG4gICAgICAgIGJvdW5kcy5leHRlbmQobGF0bG5nKTtcbiAgICAgIH0pO1xuICAgICAgaWYgKHNob3duU3RvcHMubGVuZ3RoKVxuICAgICAgICBtYXAuc2V0Q2VudGVyKGJvdW5kcy5nZXRDZW50ZXIoKSk7XG4gICAgICBpZiAoc2hvd25TdG9wcy5sZW5ndGggPiAxKVxuICAgICAgICBtYXAuZml0Qm91bmRzKGJvdW5kcyk7XG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnVHJpcCcsIGZ1bmN0aW9uKCRodHRwLCBTdG9wKXtcbiAgdmFyIGN1cnJlbnRUcmlwO1xuICByZXR1cm4ge1xuICAgIGVkaXRUcmlwOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuICRodHRwLnB1dCgnL2FwaS90cmlwcy8nICsgY3VycmVudFRyaXAuX2lkLCB7bmFtZTogY3VycmVudFRyaXAubmV3TmFtZSB9KTtcbiAgICB9LFxuICAgIGFkZFN0b3A6IGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgdmFyIGRhdGEgPSB7XG5cbiAgICAgIH07XG4gICAgICByZXR1cm4gJGh0dHAucHV0KCcvYXBpL3RyaXBzLycgKyBjdXJyZW50VHJpcC5faWQsIHtzdG9wOiBzdG9wfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHZhciBuZXdTdG9wID0gcmVzLmRhdGE7XG4gICAgICAgIFN0b3Auc2V0U2hvd25TdG9wcyhzdG9wKTtcbiAgICAgICAgY3VycmVudFRyaXAuc3RvcHMudW5zaGlmdChzdG9wKTtcbiAgICAgICAgU3RvcC5zZXRDdXJyZW50KG5ld1N0b3ApO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICByZW1vdmVTdG9wOiBmdW5jdGlvbihzdG9wKXtcbiAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvdHJpcHMvJyArIGN1cnJlbnRUcmlwLl9pZCArIFwiL3N0b3BzL1wiICsgc3RvcC5faWQpXG4gICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICB2YXIgaWR4ID0gY3VycmVudFRyaXAuc3RvcHMuaW5kZXhPZihzdG9wKTtcbiAgICAgICAgY3VycmVudFRyaXAuc3RvcHMuc3BsaWNlKGlkeCwxKTtcbiAgICAgICAgU3RvcC5jbGVhckN1cnJlbnQoKTtcbiAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKFtdKTtcbiAgICAgICAgLy8gaWYgKGN1cnJlbnRUcmlwLnN0b3BzLmxlbmd0aClcbiAgICAgICAgLy8gICBTdG9wLnNldEN1cnJlbnQoY3VycmVudFRyaXAuc3RvcHNbMF0sIHRydWUpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBzZXRDdXJyZW50VHJpcDogZnVuY3Rpb24odHJpcCl7XG4gICAgICBjdXJyZW50VHJpcCA9IHRyaXA7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50VHJpcDogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBjdXJyZW50VHJpcDtcbiAgICB9LFxuICAgIGNyZWF0ZVRyaXA6IGZ1bmN0aW9uKCl7XG5cbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdVc2VyJywgZnVuY3Rpb24oJGh0dHApe1xuICByZXR1cm4ge1xuICAgIGdldFVzZXI6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGNyZWF0ZVVzZXI6IGZ1bmN0aW9uKGNyZWRzKXtcbiAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvY3JlYXRlJywgY3JlZHMpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGxvZ2luVXNlcjogZnVuY3Rpb24oY3JlZHMpe1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRzKTtcbiAgICB9LFxuICAgIGxvZ291dFVzZXI6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ291dCcpO1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdob21lJywge1xuICAgICAgdXJsOiAnLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9hcHAvaG9tZS9ob21lLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24odXNlciwgJHN0YXRlLCAkcm9vdFNjb3BlLCAkc2NvcGUsIFN0b3AsVHJpcCwgR29vZ2xlKXtcbiAgICAgICAgJHJvb3RTY29wZS5oaWRlbmF2ID0gZmFsc2U7XG4gICAgICAgIGlmICghdXNlcilcbiAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgaWYgKCFUcmlwLmdldEN1cnJlbnRUcmlwKCkpXG4gICAgICAgICAgVHJpcC5zZXRDdXJyZW50VHJpcCh1c2VyLnRyaXBzWzBdKTtcbiAgICAgICAgJHNjb3BlLmdldEN1cnJlbnRUcmlwID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICByZXR1cm4gVHJpcC5nZXRDdXJyZW50VHJpcCgpO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuc2hvd0RldGFpbHMgPSBmdW5jdGlvbihlLCBzdG9wKXtcbiAgICAgICAgICAvLyBpZiAoIVN0b3AuZ2V0Q3VycmVudCgpKVxuICAgICAgICAgICAgU3RvcC5nZXREZXRhaWxzKHN0b3ApO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZ2V0TmVhcmJ5ID0gZnVuY3Rpb24oa2V5d29yZCl7XG4gICAgICAgICAgdmFyIGN1cnJlbnRTdG9wID0gU3RvcC5nZXRDdXJyZW50KCk7XG4gICAgICAgICAgaWYgKGN1cnJlbnRTdG9wKXtcbiAgICAgICAgICAgIHJldHVybiBHb29nbGUuZ2V0TmVhcmJ5KGN1cnJlbnRTdG9wLCBrZXl3b3JkKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgIC8vU3RvcC5jbGVhckN1cnJlbnQoKTtcbiAgICAgICAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKGRhdGEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuc2hvd25TdG9wcyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgcmV0dXJuIFN0b3AuZ2V0U2hvd25TdG9wcygpO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuYWRkU3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIHN0b3AgPSBTdG9wLmdldEN1cnJlbnREaXNwbGF5KCk7XG4gICAgICAgICAgcmV0dXJuIEdvb2dsZS5nZXREaXN0YW5jZShzdG9wKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRpc3RhbmNlKXtcbiAgICAgICAgICAgIHN0b3AuZGlzdGFuY2UgPSBkaXN0YW5jZS52YWx1ZTtcbiAgICAgICAgICAgIHN0b3AuaXNOZXcgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiBUcmlwLmFkZFN0b3Aoc3RvcCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUucmVtb3ZlU3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIHN0b3AgPSBTdG9wLmdldEN1cnJlbnQoKTtcbiAgICAgICAgICByZXR1cm4gVHJpcC5yZW1vdmVTdG9wKHN0b3ApO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5lZGl0VHJpcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgVHJpcC5nZXRDdXJyZW50VHJpcCgpLm5hbWUgPSBUcmlwLmdldEN1cnJlbnRUcmlwKCkubmV3TmFtZTtcbiAgICAgICAgICBUcmlwLmdldEN1cnJlbnRUcmlwKCkuZWRpdGluZyA9IGZhbHNlO1xuICAgICAgICAgIHJldHVybiBUcmlwLmVkaXRUcmlwKCk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZ2V0UHJpY2UgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIHZhciBydG4gPSAnJztcbiAgICAgICAgICBpZiAoU3RvcC5nZXRDdXJyZW50RGlzcGxheSgpKXtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MDtpPFN0b3AuZ2V0Q3VycmVudERpc3BsYXkoKS5wcmljZTtpKyspXG4gICAgICAgICAgICAgIHJ0bis9JyQnO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcnRuO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZ2V0Q3VycmVudCA9IFN0b3AuZ2V0Q3VycmVudDtcbiAgICAgICAgJHNjb3BlLmN1cnJlbnREaXNwbGF5U3RvcCA9IFN0b3AuZ2V0Q3VycmVudERpc3BsYXk7XG4gICAgICB9LFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICB1c2VyOiBmdW5jdGlvbihVc2VyKXtcbiAgICAgICAgICByZXR1cm4gVXNlci5nZXRVc2VyKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9hcHAvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIFVzZXIsICRzdGF0ZSwgJHJvb3RTY29wZSl7XG4gICAgICAgICRyb290U2NvcGUuaGlkZW5hdiA9IHRydWU7XG4gICAgICAgICRzY29wZS5sb2dpbiA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgVXNlci5sb2dpblVzZXIoJHNjb3BlLmNyZWRzKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlciwgQ2hhcnRKc1Byb3ZpZGVyKXtcbiAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ3Byb2ZpbGUnLCB7XG4gICAgICB1cmw6ICcvcHJvZmlsZScsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9hcHAvcHJvZmlsZS9wcm9maWxlLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24odXNlciwgJHNjb3BlLCBOZ01hcCl7XG4gICAgICAgIENoYXJ0SnNQcm92aWRlci5zZXRPcHRpb25zKHtcbiAgICAgICAgICBtYWludGFpbkFzcGVjdFJhdGlvOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgTmdNYXAuZ2V0TWFwKHtpZDogJ3Byb2ZpbGVfbWFwJ30pLnRoZW4oZnVuY3Rpb24oX21hcCl7XG4gICAgICAgICAgbWFwID0gX21hcDtcbiAgICAgICAgfSk7XG4gICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgJHNjb3BlLnNldFNlbGVjdGVkID0gZnVuY3Rpb24odHJpcCl7XG4gICAgICAgICAgJHNjb3BlLnNlbGVjdGVkVHJpcCA9IHRyaXA7XG4gICAgICAgICAgdmFyIGJvdW5kcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmdCb3VuZHMoKTtcbiAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRUcmlwLnN0b3BzLmZvckVhY2goZnVuY3Rpb24oc3RvcCl7XG4gICAgICAgICAgICB2YXIgbGF0bG5nID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhzdG9wLmNvb3Jkc1swXSwgc3RvcC5jb29yZHNbMV0pO1xuICAgICAgICAgICAgYm91bmRzLmV4dGVuZChsYXRsbmcpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbWFwLnNldENlbnRlcihib3VuZHMuZ2V0Q2VudGVyKCkpO1xuICAgICAgICAgICAgbWFwLmZpdEJvdW5kcyhib3VuZHMpO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZ2V0VG90YWxQcmljZSA9IGZ1bmN0aW9uKHRyaXApe1xuICAgICAgICAgIHZhciBpdGVtcyA9IHRyaXAuc3RvcHMuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW0ucHJpY2U7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmFyIHRvdGFsID0gaXRlbXMucmVkdWNlKGZ1bmN0aW9uKGFjYywgaXRlbSl7XG4gICAgICAgICAgICByZXR1cm4gYWNjICsgaXRlbS5wcmljZTtcbiAgICAgICAgICB9LDApIC8gaXRlbXMubGVuZ3RoO1xuICAgICAgICAgIHZhciByb3VuZGVkID0gTWF0aC5yb3VuZCh0b3RhbCk7XG4gICAgICAgICAgdmFyIHJ0bj0nJztcbiAgICAgICAgICBmb3IodmFyIGkgPTA7aTxyb3VuZGVkO2krKylcbiAgICAgICAgICAgIHJ0bis9JyQnO1xuICAgICAgICAgIHJldHVybiBydG47XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5nZXRUb3RhbERpc3RhbmNlID0gZnVuY3Rpb24odHJpcCl7XG4gICAgICAgICAgdmFyIGl0ZW1zID0gdHJpcC5zdG9wcy5maWx0ZXIoZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS5kaXN0YW5jZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB2YXIgdG90YWwgPSBpdGVtcy5yZWR1Y2UoZnVuY3Rpb24oYWNjLCBpdGVtKXtcbiAgICAgICAgICAgIHJldHVybiBhY2MgKyBpdGVtLmRpc3RhbmNlO1xuICAgICAgICAgIH0sIDApO1xuICAgICAgICAgIHJldHVybiAodG90YWwgKiAwLjAwMDYyMTM3MSkudG9QcmVjaXNpb24oMikgKyBcIiBtaS5cIjtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmdldExvY2F0aW9ucyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZFRyaXApe1xuICAgICAgICAgICAgcmV0dXJuICRzY29wZS5zZWxlY3RlZFRyaXAuc3RvcHMubWFwKGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgICAgICAgICByZXR1cm4gc3RvcC5jb29yZHM7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5sYWJlbHMgPSBbXCJKYW51YXJ5XCIsIFwiRmVicnVhcnlcIiwgXCJNYXJjaFwiLCBcIkFwcmlsXCIsIFwiTWF5XCIsIFwiSnVuZVwiLCBcIkp1bHlcIl07XG4gICRzY29wZS5zZXJpZXMgPSBbJ1NlcmllcyBBJywgJ1NlcmllcyBCJ107XG4gICRzY29wZS5kYXRhID0gW1xuICAgIFs2NSwgNTksIDgwLCA4MSwgNTYsIDU1LCA0MF0sXG4gICAgWzI4LCA0OCwgNDAsIDE5LCA4NiwgMjcsIDkwXVxuICBdO1xuICAgICAgfSxcbiAgICAgIHJlc29sdmU6e1xuICAgICAgICB1c2VyOiBmdW5jdGlvbihVc2VyKXtcbiAgICAgICAgICByZXR1cm4gVXNlci5nZXRVc2VyKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHtcbiAgICB0ZW1wbGF0ZVVybDogJy9hcHAvZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgVXNlciwgJHN0YXRlLCBOZ01hcCl7XG4gICAgICAkc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgVXNlci5sb2dvdXRVc2VyKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ3N0b3BJdGVtJywgZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHtcbiAgICBzY29wZTp7XG4gICAgICBpdGVtOiAnPSdcbiAgICB9LFxuICAgIHRlbXBsYXRlVXJsOiAnL2FwcC9kaXJlY3RpdmVzL3N0b3AtaXRlbS9zdG9wLWl0ZW0uaHRtbCcsXG4gICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBTdG9wKXtcbiAgICAgICRzY29wZS5nZXRQcmljZSA9IGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICB2YXIgcnRuID0gJyc7XG4gICAgICAgIGZvcih2YXIgaSA9MDtpPGl0ZW0ucHJpY2U7aSsrKVxuICAgICAgICAgIHJ0bis9JyQnO1xuICAgICAgICByZXR1cm4gcnRuO1xuICAgICAgfTtcbiAgICAgICRzY29wZS5nZXRUeXBlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCRzY29wZS5pdGVtLnR5cGU9PT0nYmFyJylcbiAgICAgICAgICByZXR1cm4gJ2xvY2FsX2Jhcic7XG4gICAgICAgIGVsc2UgaWYgKCRzY29wZS5pdGVtLnR5cGUgPT09ICdyZXN0YXVyYW50JylcbiAgICAgICAgICByZXR1cm4gJ3Jlc3RhdXJhbnQnO1xuICAgICAgICBlbHNlIGlmICgkc2NvcGUuaXRlbS50eXBlID09PSAnZW50ZXJ0YWlubWVudCcpXG4gICAgICAgICAgcmV0dXJuICdzZW50aW1lbnRfdmVyeV9zYXRpc2ZpZWQnO1xuICAgICAgfTtcbiAgICAgICRzY29wZS5nZXROYW1lID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRzY29wZS5pdGVtLm5hbWUuc2xpY2UoMCwxNyk7XG4gICAgICB9O1xuICAgICAgJHNjb3BlLmdldERpc3RhbmNlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICgkc2NvcGUuaXRlbS5kaXN0YW5jZSAqIDAuMDAwNjIxMzcxKS50b1ByZWNpc2lvbigxKTtcbiAgICAgIH07XG4gICAgICAkc2NvcGUuZ2V0Q3VycmVudCA9IFN0b3AuZ2V0Q3VycmVudDtcbiAgICAgICRzY29wZS5zZXRDdXJyZW50ID0gZnVuY3Rpb24oc3RvcCl7XG4gICAgICAgIFN0b3Auc2V0Q3VycmVudChzdG9wKTtcbiAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKHN0b3ApO1xuXG4gICAgICB9O1xuXG4gICAgfVxuICB9O1xufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
