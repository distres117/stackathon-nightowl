var app = angular.module('app', ['ui.router', 'ngAnimate', 'ngMap']);
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

app.config(function($stateProvider){
  $stateProvider
    .state('profile', {
      url: '/profile',
      templateUrl: '/app/profile/profile.html',
      controller: function(user, $scope, NgMap){
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
      },
      resolve:{
        user: function(User){
          return User.getUser();
        }
      }
    });
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZhY3Rvcmllcy9Hb29nbGUuanMiLCJmYWN0b3JpZXMvU3RvcC5qcyIsImZhY3Rvcmllcy9UcmlwLmpzIiwiZmFjdG9yaWVzL1VzZXIuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsInByb2ZpbGUvcHJvZmlsZS5qcyIsImRpcmVjdGl2ZXMvc3RvcC1pdGVtL3N0b3BJdGVtLmpzIiwiZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsndWkucm91dGVyJywgJ25nQW5pbWF0ZScsICduZ01hcCddKTtcbmFwcC5jb25maWcoZnVuY3Rpb24oJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcil7XG4gICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xufSk7XG4iLCJhcHAuZmFjdG9yeShcIkdvb2dsZVwiLCBmdW5jdGlvbigkaHR0cCwgU3RvcCl7XG4gIHJldHVybiB7XG4gICAgZ2V0TmVhcmJ5OiBmdW5jdGlvbihzdG9wLCBrZXl3b3JkKXtcbiAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICBsb2NhdGlvbjogc3RvcC5jb29yZHMudG9TdHJpbmcoKSxcbiAgICAgICAgcmFkaXVzOiAxMDAwLFxuICAgICAgICBrZXl3b3JkOiBrZXl3b3JkXG4gICAgICB9O1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvZ29vZ2xlL25lYXJieScsIGRhdGEpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICB2YXIgcnRuID0gcmVzLmRhdGEubWFwKGZ1bmN0aW9uKGl0ZW0saSl7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIF9pZDogaSsnJyxcbiAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZSxcbiAgICAgICAgICAgIHR5cGU6IGtleXdvcmQsXG4gICAgICAgICAgICBjb29yZHM6IFtpdGVtLmdlb21ldHJ5LmxvY2F0aW9uLmxhdCxpdGVtLmdlb21ldHJ5LmxvY2F0aW9uLmxuZ10sXG4gICAgICAgICAgICBwcmljZTogaXRlbS5wcmljZV9sZXZlbCxcbiAgICAgICAgICAgIHJhdGluZzogaXRlbS5yYXRpbmcsXG4gICAgICAgICAgICBpc05ldzogdHJ1ZVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcnRuO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBnZXREaXN0YW5jZTogZnVuY3Rpb24obmV3U3RvcCl7XG4gICAgICB2YXIgY3VycmVudFN0b3AgPSBTdG9wLmdldEN1cnJlbnQoKTtcbiAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICBvcmlnaW5zOiBjdXJyZW50U3RvcC5jb29yZHMudG9TdHJpbmcoKSxcbiAgICAgICAgZGVzdGluYXRpb25zOiBuZXdTdG9wLmNvb3Jkcy50b1N0cmluZygpLFxuICAgICAgICB1bml0czogJ2ltcGVyaWFsJyxcbiAgICAgICAgbW9kZTogJ3dhbGtpbmcnXG4gICAgICB9O1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvZ29vZ2xlL2Rpc3RhbmNlJywgZGF0YSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1N0b3AnLCBmdW5jdGlvbihOZ01hcCl7XG4gIHZhciBtYXAsIGN1cnJlbnRTdG9wLCBzaG93blN0b3BzLCBjdXJyZW50RGlzcGxheVN0b3A7XG4gIE5nTWFwLmdldE1hcCgpLnRoZW4oZnVuY3Rpb24oX21hcCl7XG4gICAgbWFwID0gX21hcDtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgc2V0Q3VycmVudDogZnVuY3Rpb24oc3RvcCwgc2hvdyl7XG4gICAgICBjdXJyZW50RGlzcGxheVN0b3AgPSBudWxsO1xuICAgICAgY3VycmVudFN0b3AgPSBzdG9wO1xuICAgICAgbWFwLmhpZGVJbmZvV2luZG93KCdpdycpO1xuXG4gICAgfSxcbiAgICBjbGVhckN1cnJlbnQ6IGZ1bmN0aW9uKCl7XG4gICAgICBjdXJyZW50U3RvcCA9IG51bGw7XG4gICAgfSxcbiAgICBnZXREZXRhaWxzOiBmdW5jdGlvbihzdG9wKXtcbiAgICAgIGN1cnJlbnREaXNwbGF5U3RvcCA9IHN0b3A7XG4gICAgICAvL2N1cnJlbnRTdG9wID0gbnVsbDtcbiAgICAgIG1hcC5zaG93SW5mb1dpbmRvdygnaXcnLCBzdG9wLl9pZCk7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50RGlzcGxheTogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBjdXJyZW50RGlzcGxheVN0b3A7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50OiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGN1cnJlbnRTdG9wO1xuICAgIH0sXG4gICAgZ2V0U2hvd25TdG9wczogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBzaG93blN0b3BzO1xuICAgIH0sXG4gICAgc2V0U2hvd25TdG9wczogZnVuY3Rpb24oc3RvcHMpe1xuICAgICAgbWFwLmhpZGVJbmZvV2luZG93KCdpdycpO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3RvcHMpKVxuICAgICAgICBzaG93blN0b3BzID0gc3RvcHM7XG4gICAgICBlbHNlIHtcbiAgICAgICAgc2hvd25TdG9wcyA9IFtzdG9wc107XG4gICAgICB9XG4gICAgICB2YXIgYm91bmRzID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZ0JvdW5kcygpO1xuICAgICAgc2hvd25TdG9wcy5mb3JFYWNoKGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgICB2YXIgbGF0bG5nID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhzdG9wLmNvb3Jkc1swXSwgc3RvcC5jb29yZHNbMV0pO1xuICAgICAgICBib3VuZHMuZXh0ZW5kKGxhdGxuZyk7XG4gICAgICB9KTtcbiAgICAgIGlmIChzaG93blN0b3BzLmxlbmd0aClcbiAgICAgICAgbWFwLnNldENlbnRlcihib3VuZHMuZ2V0Q2VudGVyKCkpO1xuICAgICAgaWYgKHNob3duU3RvcHMubGVuZ3RoID4gMSlcbiAgICAgICAgbWFwLmZpdEJvdW5kcyhib3VuZHMpO1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1RyaXAnLCBmdW5jdGlvbigkaHR0cCwgU3RvcCl7XG4gIHZhciBjdXJyZW50VHJpcDtcbiAgcmV0dXJuIHtcbiAgICBlZGl0VHJpcDogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiAkaHR0cC5wdXQoJy9hcGkvdHJpcHMvJyArIGN1cnJlbnRUcmlwLl9pZCwge25hbWU6IGN1cnJlbnRUcmlwLm5ld05hbWUgfSk7XG4gICAgfSxcbiAgICBhZGRTdG9wOiBmdW5jdGlvbihzdG9wKXtcbiAgICAgIHZhciBkYXRhID0ge1xuXG4gICAgICB9O1xuICAgICAgcmV0dXJuICRodHRwLnB1dCgnL2FwaS90cmlwcy8nICsgY3VycmVudFRyaXAuX2lkLCB7c3RvcDogc3RvcH0pXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICB2YXIgbmV3U3RvcCA9IHJlcy5kYXRhO1xuICAgICAgICBTdG9wLnNldFNob3duU3RvcHMoc3RvcCk7XG4gICAgICAgIGN1cnJlbnRUcmlwLnN0b3BzLnVuc2hpZnQoc3RvcCk7XG4gICAgICAgIFN0b3Auc2V0Q3VycmVudChuZXdTdG9wKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcmVtb3ZlU3RvcDogZnVuY3Rpb24oc3RvcCl7XG4gICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKCcvYXBpL3RyaXBzLycgKyBjdXJyZW50VHJpcC5faWQgKyBcIi9zdG9wcy9cIiArIHN0b3AuX2lkKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGlkeCA9IGN1cnJlbnRUcmlwLnN0b3BzLmluZGV4T2Yoc3RvcCk7XG4gICAgICAgIGN1cnJlbnRUcmlwLnN0b3BzLnNwbGljZShpZHgsMSk7XG4gICAgICAgIFN0b3AuY2xlYXJDdXJyZW50KCk7XG4gICAgICAgIFN0b3Auc2V0U2hvd25TdG9wcyhbXSk7XG4gICAgICAgIC8vIGlmIChjdXJyZW50VHJpcC5zdG9wcy5sZW5ndGgpXG4gICAgICAgIC8vICAgU3RvcC5zZXRDdXJyZW50KGN1cnJlbnRUcmlwLnN0b3BzWzBdLCB0cnVlKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgc2V0Q3VycmVudFRyaXA6IGZ1bmN0aW9uKHRyaXApe1xuICAgICAgY3VycmVudFRyaXAgPSB0cmlwO1xuICAgIH0sXG4gICAgZ2V0Q3VycmVudFRyaXA6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gY3VycmVudFRyaXA7XG4gICAgfSxcbiAgICBjcmVhdGVUcmlwOiBmdW5jdGlvbigpe1xuXG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnVXNlcicsIGZ1bmN0aW9uKCRodHRwKXtcbiAgcmV0dXJuIHtcbiAgICBnZXRVc2VyOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBjcmVhdGVVc2VyOiBmdW5jdGlvbihjcmVkcyl7XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2NyZWF0ZScsIGNyZWRzKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBsb2dpblVzZXI6IGZ1bmN0aW9uKGNyZWRzKXtcbiAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkcyk7XG4gICAgfSxcbiAgICBsb2dvdXRVc2VyOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dvdXQnKTtcbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgnaG9tZScsIHtcbiAgICAgIHVybDogJy8nLFxuICAgICAgdGVtcGxhdGVVcmw6ICcvYXBwL2hvbWUvaG9tZS5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKHVzZXIsICRzdGF0ZSwgJHJvb3RTY29wZSwgJHNjb3BlLCBTdG9wLFRyaXAsIEdvb2dsZSl7XG4gICAgICAgICRyb290U2NvcGUuaGlkZW5hdiA9IGZhbHNlO1xuICAgICAgICBpZiAoIXVzZXIpXG4gICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgIGlmICghVHJpcC5nZXRDdXJyZW50VHJpcCgpKVxuICAgICAgICAgIFRyaXAuc2V0Q3VycmVudFRyaXAodXNlci50cmlwc1swXSk7XG4gICAgICAgICRzY29wZS5nZXRDdXJyZW50VHJpcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgcmV0dXJuIFRyaXAuZ2V0Q3VycmVudFRyaXAoKTtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLnNob3dEZXRhaWxzID0gZnVuY3Rpb24oZSwgc3RvcCl7XG4gICAgICAgICAgLy8gaWYgKCFTdG9wLmdldEN1cnJlbnQoKSlcbiAgICAgICAgICAgIFN0b3AuZ2V0RGV0YWlscyhzdG9wKTtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmdldE5lYXJieSA9IGZ1bmN0aW9uKGtleXdvcmQpe1xuICAgICAgICAgIHZhciBjdXJyZW50U3RvcCA9IFN0b3AuZ2V0Q3VycmVudCgpO1xuICAgICAgICAgIGlmIChjdXJyZW50U3RvcCl7XG4gICAgICAgICAgICByZXR1cm4gR29vZ2xlLmdldE5lYXJieShjdXJyZW50U3RvcCwga2V5d29yZClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAvL1N0b3AuY2xlYXJDdXJyZW50KCk7XG4gICAgICAgICAgICAgIFN0b3Auc2V0U2hvd25TdG9wcyhkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLnNob3duU3RvcHMgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIHJldHVybiBTdG9wLmdldFNob3duU3RvcHMoKTtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmFkZFN0b3AgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIHZhciBzdG9wID0gU3RvcC5nZXRDdXJyZW50RGlzcGxheSgpO1xuICAgICAgICAgIHJldHVybiBHb29nbGUuZ2V0RGlzdGFuY2Uoc3RvcClcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihkaXN0YW5jZSl7XG4gICAgICAgICAgICBzdG9wLmRpc3RhbmNlID0gZGlzdGFuY2UudmFsdWU7XG4gICAgICAgICAgICBzdG9wLmlzTmV3ID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gVHJpcC5hZGRTdG9wKHN0b3ApO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnJlbW92ZVN0b3AgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIHZhciBzdG9wID0gU3RvcC5nZXRDdXJyZW50KCk7XG4gICAgICAgICAgcmV0dXJuIFRyaXAucmVtb3ZlU3RvcChzdG9wKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZWRpdFRyaXAgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIFRyaXAuZ2V0Q3VycmVudFRyaXAoKS5uYW1lID0gVHJpcC5nZXRDdXJyZW50VHJpcCgpLm5ld05hbWU7XG4gICAgICAgICAgVHJpcC5nZXRDdXJyZW50VHJpcCgpLmVkaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICByZXR1cm4gVHJpcC5lZGl0VHJpcCgpO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmdldFByaWNlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICB2YXIgcnRuID0gJyc7XG4gICAgICAgICAgaWYgKFN0b3AuZ2V0Q3VycmVudERpc3BsYXkoKSl7XG4gICAgICAgICAgICBmb3IodmFyIGkgPTA7aTxTdG9wLmdldEN1cnJlbnREaXNwbGF5KCkucHJpY2U7aSsrKVxuICAgICAgICAgICAgICBydG4rPSckJztcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJ0bjtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmdldEN1cnJlbnQgPSBTdG9wLmdldEN1cnJlbnQ7XG4gICAgICAgICRzY29wZS5jdXJyZW50RGlzcGxheVN0b3AgPSBTdG9wLmdldEN1cnJlbnREaXNwbGF5O1xuICAgICAgfSxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgdXNlcjogZnVuY3Rpb24oVXNlcil7XG4gICAgICAgICAgcmV0dXJuIFVzZXIuZ2V0VXNlcigpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgdGVtcGxhdGVVcmw6ICcvYXBwL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBVc2VyLCAkc3RhdGUsICRyb290U2NvcGUpe1xuICAgICAgICAkcm9vdFNjb3BlLmhpZGVuYXYgPSB0cnVlO1xuICAgICAgICAkc2NvcGUubG9naW4gPSBmdW5jdGlvbigpe1xuICAgICAgICAgIFVzZXIubG9naW5Vc2VyKCRzY29wZS5jcmVkcylcbiAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgncHJvZmlsZScsIHtcbiAgICAgIHVybDogJy9wcm9maWxlJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2FwcC9wcm9maWxlL3Byb2ZpbGUuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbih1c2VyLCAkc2NvcGUsIE5nTWFwKXtcbiAgICAgICAgTmdNYXAuZ2V0TWFwKHtpZDogJ3Byb2ZpbGVfbWFwJ30pLnRoZW4oZnVuY3Rpb24oX21hcCl7XG4gICAgICAgICAgbWFwID0gX21hcDtcbiAgICAgICAgfSk7XG4gICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgJHNjb3BlLnNldFNlbGVjdGVkID0gZnVuY3Rpb24odHJpcCl7XG4gICAgICAgICAgJHNjb3BlLnNlbGVjdGVkVHJpcCA9IHRyaXA7XG4gICAgICAgICAgdmFyIGJvdW5kcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmdCb3VuZHMoKTtcbiAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRUcmlwLnN0b3BzLmZvckVhY2goZnVuY3Rpb24oc3RvcCl7XG4gICAgICAgICAgICB2YXIgbGF0bG5nID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhzdG9wLmNvb3Jkc1swXSwgc3RvcC5jb29yZHNbMV0pO1xuICAgICAgICAgICAgYm91bmRzLmV4dGVuZChsYXRsbmcpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbWFwLnNldENlbnRlcihib3VuZHMuZ2V0Q2VudGVyKCkpO1xuICAgICAgICAgICAgbWFwLmZpdEJvdW5kcyhib3VuZHMpO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZ2V0VG90YWxQcmljZSA9IGZ1bmN0aW9uKHRyaXApe1xuICAgICAgICAgIHZhciBpdGVtcyA9IHRyaXAuc3RvcHMuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW0ucHJpY2U7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmFyIHRvdGFsID0gaXRlbXMucmVkdWNlKGZ1bmN0aW9uKGFjYywgaXRlbSl7XG4gICAgICAgICAgICByZXR1cm4gYWNjICsgaXRlbS5wcmljZTtcbiAgICAgICAgICB9LDApIC8gaXRlbXMubGVuZ3RoO1xuICAgICAgICAgIHZhciByb3VuZGVkID0gTWF0aC5yb3VuZCh0b3RhbCk7XG4gICAgICAgICAgdmFyIHJ0bj0nJztcbiAgICAgICAgICBmb3IodmFyIGkgPTA7aTxyb3VuZGVkO2krKylcbiAgICAgICAgICAgIHJ0bis9JyQnO1xuICAgICAgICAgIHJldHVybiBydG47XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5nZXRUb3RhbERpc3RhbmNlID0gZnVuY3Rpb24odHJpcCl7XG4gICAgICAgICAgdmFyIGl0ZW1zID0gdHJpcC5zdG9wcy5maWx0ZXIoZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS5kaXN0YW5jZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB2YXIgdG90YWwgPSBpdGVtcy5yZWR1Y2UoZnVuY3Rpb24oYWNjLCBpdGVtKXtcbiAgICAgICAgICAgIHJldHVybiBhY2MgKyBpdGVtLmRpc3RhbmNlO1xuICAgICAgICAgIH0sIDApO1xuICAgICAgICAgIHJldHVybiAodG90YWwgKiAwLjAwMDYyMTM3MSkudG9QcmVjaXNpb24oMikgKyBcIiBtaS5cIjtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmdldExvY2F0aW9ucyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZFRyaXApe1xuICAgICAgICAgICAgcmV0dXJuICRzY29wZS5zZWxlY3RlZFRyaXAuc3RvcHMubWFwKGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgICAgICAgICByZXR1cm4gc3RvcC5jb29yZHM7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgcmVzb2x2ZTp7XG4gICAgICAgIHVzZXI6IGZ1bmN0aW9uKFVzZXIpe1xuICAgICAgICAgIHJldHVybiBVc2VyLmdldFVzZXIoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdzdG9wSXRlbScsIGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgc2NvcGU6e1xuICAgICAgaXRlbTogJz0nXG4gICAgfSxcbiAgICB0ZW1wbGF0ZVVybDogJy9hcHAvZGlyZWN0aXZlcy9zdG9wLWl0ZW0vc3RvcC1pdGVtLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgU3RvcCl7XG4gICAgICAkc2NvcGUuZ2V0UHJpY2UgPSBmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgdmFyIHJ0biA9ICcnO1xuICAgICAgICBmb3IodmFyIGkgPTA7aTxpdGVtLnByaWNlO2krKylcbiAgICAgICAgICBydG4rPSckJztcbiAgICAgICAgcmV0dXJuIHJ0bjtcbiAgICAgIH07XG4gICAgICAkc2NvcGUuZ2V0VHlwZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICgkc2NvcGUuaXRlbS50eXBlPT09J2JhcicpXG4gICAgICAgICAgcmV0dXJuICdsb2NhbF9iYXInO1xuICAgICAgICBlbHNlIGlmICgkc2NvcGUuaXRlbS50eXBlID09PSAncmVzdGF1cmFudCcpXG4gICAgICAgICAgcmV0dXJuICdyZXN0YXVyYW50JztcbiAgICAgICAgZWxzZSBpZiAoJHNjb3BlLml0ZW0udHlwZSA9PT0gJ2VudGVydGFpbm1lbnQnKVxuICAgICAgICAgIHJldHVybiAnc2VudGltZW50X3Zlcnlfc2F0aXNmaWVkJztcbiAgICAgIH07XG4gICAgICAkc2NvcGUuZ2V0TmFtZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkc2NvcGUuaXRlbS5uYW1lLnNsaWNlKDAsMTcpO1xuICAgICAgfTtcbiAgICAgICRzY29wZS5nZXREaXN0YW5jZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAoJHNjb3BlLml0ZW0uZGlzdGFuY2UgKiAwLjAwMDYyMTM3MSkudG9QcmVjaXNpb24oMSk7XG4gICAgICB9O1xuICAgICAgJHNjb3BlLmdldEN1cnJlbnQgPSBTdG9wLmdldEN1cnJlbnQ7XG4gICAgICAkc2NvcGUuc2V0Q3VycmVudCA9IGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgICBTdG9wLnNldEN1cnJlbnQoc3RvcCk7XG4gICAgICAgIFN0b3Auc2V0U2hvd25TdG9wcyhzdG9wKTtcblxuICAgICAgfTtcblxuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHtcbiAgICB0ZW1wbGF0ZVVybDogJy9hcHAvZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgVXNlciwgJHN0YXRlLCBOZ01hcCl7XG4gICAgICAkc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgVXNlci5sb2dvdXRVc2VyKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9XG4gIH07XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
