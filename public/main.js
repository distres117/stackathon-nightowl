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
            rating: item.rating
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
      //TO DO: set map bounds
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
        Stop.setCurrent(newStop);
        Stop.setShownStops(stop);
        currentTrip.stops.unshift(stop);
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
        console.log(user);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZhY3Rvcmllcy9Hb29nbGUuanMiLCJmYWN0b3JpZXMvU3RvcC5qcyIsImZhY3Rvcmllcy9UcmlwLmpzIiwiZmFjdG9yaWVzL1VzZXIuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsImRpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImRpcmVjdGl2ZXMvc3RvcC1pdGVtL3N0b3BJdGVtLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXInLCAnbmdBbmltYXRlJywgJ25nTWFwJ10pO1xuYXBwLmNvbmZpZyhmdW5jdGlvbigkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKXtcbiAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG59KTtcbiIsImFwcC5mYWN0b3J5KFwiR29vZ2xlXCIsIGZ1bmN0aW9uKCRodHRwLCBTdG9wKXtcbiAgcmV0dXJuIHtcbiAgICBnZXROZWFyYnk6IGZ1bmN0aW9uKHN0b3AsIGtleXdvcmQpe1xuICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgIGxvY2F0aW9uOiBzdG9wLmNvb3Jkcy50b1N0cmluZygpLFxuICAgICAgICByYWRpdXM6IDEwMDAsXG4gICAgICAgIGtleXdvcmQ6IGtleXdvcmRcbiAgICAgIH07XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9nb29nbGUvbmVhcmJ5JywgZGF0YSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHZhciBydG4gPSByZXMuZGF0YS5tYXAoZnVuY3Rpb24oaXRlbSxpKXtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgX2lkOiBpKycnLFxuICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLFxuICAgICAgICAgICAgdHlwZToga2V5d29yZCxcbiAgICAgICAgICAgIGNvb3JkczogW2l0ZW0uZ2VvbWV0cnkubG9jYXRpb24ubGF0LGl0ZW0uZ2VvbWV0cnkubG9jYXRpb24ubG5nXSxcbiAgICAgICAgICAgIHByaWNlOiBpdGVtLnByaWNlX2xldmVsLFxuICAgICAgICAgICAgcmF0aW5nOiBpdGVtLnJhdGluZ1xuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcnRuO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBnZXREaXN0YW5jZTogZnVuY3Rpb24obmV3U3RvcCl7XG4gICAgICB2YXIgY3VycmVudFN0b3AgPSBTdG9wLmdldEN1cnJlbnQoKTtcbiAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICBvcmlnaW5zOiBjdXJyZW50U3RvcC5jb29yZHMudG9TdHJpbmcoKSxcbiAgICAgICAgZGVzdGluYXRpb25zOiBuZXdTdG9wLmNvb3Jkcy50b1N0cmluZygpLFxuICAgICAgICB1bml0czogJ2ltcGVyaWFsJyxcbiAgICAgICAgbW9kZTogJ3dhbGtpbmcnXG4gICAgICB9O1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvZ29vZ2xlL2Rpc3RhbmNlJywgZGF0YSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1N0b3AnLCBmdW5jdGlvbihOZ01hcCl7XG4gIHZhciBtYXAsIGN1cnJlbnRTdG9wLCBzaG93blN0b3BzLCBjdXJyZW50RGlzcGxheVN0b3A7XG4gIE5nTWFwLmdldE1hcCgpLnRoZW4oZnVuY3Rpb24oX21hcCl7XG4gICAgbWFwID0gX21hcDtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgc2V0Q3VycmVudDogZnVuY3Rpb24oc3RvcCwgc2hvdyl7XG4gICAgICBjdXJyZW50RGlzcGxheVN0b3AgPSBudWxsO1xuICAgICAgY3VycmVudFN0b3AgPSBzdG9wO1xuICAgICAgbWFwLmhpZGVJbmZvV2luZG93KCdpdycpO1xuXG4gICAgfSxcbiAgICBjbGVhckN1cnJlbnQ6IGZ1bmN0aW9uKCl7XG4gICAgICBjdXJyZW50U3RvcCA9IG51bGw7XG4gICAgfSxcbiAgICBnZXREZXRhaWxzOiBmdW5jdGlvbihzdG9wKXtcbiAgICAgIGN1cnJlbnREaXNwbGF5U3RvcCA9IHN0b3A7XG4gICAgICAvL2N1cnJlbnRTdG9wID0gbnVsbDtcbiAgICAgIG1hcC5zaG93SW5mb1dpbmRvdygnaXcnLCBzdG9wLl9pZCk7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50RGlzcGxheTogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBjdXJyZW50RGlzcGxheVN0b3A7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50OiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGN1cnJlbnRTdG9wO1xuICAgIH0sXG4gICAgZ2V0U2hvd25TdG9wczogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBzaG93blN0b3BzO1xuICAgIH0sXG4gICAgc2V0U2hvd25TdG9wczogZnVuY3Rpb24oc3RvcHMpe1xuICAgICAgLy9UTyBETzogc2V0IG1hcCBib3VuZHNcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHN0b3BzKSlcbiAgICAgICAgc2hvd25TdG9wcyA9IHN0b3BzO1xuICAgICAgZWxzZSB7XG4gICAgICAgIHNob3duU3RvcHMgPSBbc3RvcHNdO1xuICAgICAgfVxuICAgICAgdmFyIGJvdW5kcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmdCb3VuZHMoKTtcbiAgICAgIHNob3duU3RvcHMuZm9yRWFjaChmdW5jdGlvbihzdG9wKXtcbiAgICAgICAgdmFyIGxhdGxuZyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoc3RvcC5jb29yZHNbMF0sIHN0b3AuY29vcmRzWzFdKTtcbiAgICAgICAgYm91bmRzLmV4dGVuZChsYXRsbmcpO1xuICAgICAgfSk7XG4gICAgICBpZiAoc2hvd25TdG9wcy5sZW5ndGgpXG4gICAgICAgIG1hcC5zZXRDZW50ZXIoYm91bmRzLmdldENlbnRlcigpKTtcbiAgICAgIGlmIChzaG93blN0b3BzLmxlbmd0aCA+IDEpXG4gICAgICAgIG1hcC5maXRCb3VuZHMoYm91bmRzKTtcbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdUcmlwJywgZnVuY3Rpb24oJGh0dHAsIFN0b3Ape1xuICB2YXIgY3VycmVudFRyaXA7XG4gIHJldHVybiB7XG4gICAgZWRpdFRyaXA6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gJGh0dHAucHV0KCcvYXBpL3RyaXBzLycgKyBjdXJyZW50VHJpcC5faWQsIHtuYW1lOiBjdXJyZW50VHJpcC5uZXdOYW1lIH0pO1xuICAgIH0sXG4gICAgYWRkU3RvcDogZnVuY3Rpb24oc3RvcCl7XG4gICAgICB2YXIgZGF0YSA9IHtcblxuICAgICAgfTtcbiAgICAgIHJldHVybiAkaHR0cC5wdXQoJy9hcGkvdHJpcHMvJyArIGN1cnJlbnRUcmlwLl9pZCwge3N0b3A6IHN0b3B9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgdmFyIG5ld1N0b3AgPSByZXMuZGF0YTtcbiAgICAgICAgU3RvcC5zZXRDdXJyZW50KG5ld1N0b3ApO1xuICAgICAgICBTdG9wLnNldFNob3duU3RvcHMoc3RvcCk7XG4gICAgICAgIGN1cnJlbnRUcmlwLnN0b3BzLnVuc2hpZnQoc3RvcCk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHJlbW92ZVN0b3A6IGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZSgnL2FwaS90cmlwcy8nICsgY3VycmVudFRyaXAuX2lkICsgXCIvc3RvcHMvXCIgKyBzdG9wLl9pZClcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBpZHggPSBjdXJyZW50VHJpcC5zdG9wcy5pbmRleE9mKHN0b3ApO1xuICAgICAgICBjdXJyZW50VHJpcC5zdG9wcy5zcGxpY2UoaWR4LDEpO1xuICAgICAgICBTdG9wLmNsZWFyQ3VycmVudCgpO1xuICAgICAgICBTdG9wLnNldFNob3duU3RvcHMoW10pO1xuICAgICAgICAvLyBpZiAoY3VycmVudFRyaXAuc3RvcHMubGVuZ3RoKVxuICAgICAgICAvLyAgIFN0b3Auc2V0Q3VycmVudChjdXJyZW50VHJpcC5zdG9wc1swXSwgdHJ1ZSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHNldEN1cnJlbnRUcmlwOiBmdW5jdGlvbih0cmlwKXtcbiAgICAgIGN1cnJlbnRUcmlwID0gdHJpcDtcbiAgICB9LFxuICAgIGdldEN1cnJlbnRUcmlwOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGN1cnJlbnRUcmlwO1xuICAgIH0sXG4gICAgY3JlYXRlVHJpcDogZnVuY3Rpb24oKXtcblxuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1VzZXInLCBmdW5jdGlvbigkaHR0cCl7XG4gIHJldHVybiB7XG4gICAgZ2V0VXNlcjogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgY3JlYXRlVXNlcjogZnVuY3Rpb24oY3JlZHMpe1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9jcmVhdGUnLCBjcmVkcylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgbG9naW5Vc2VyOiBmdW5jdGlvbihjcmVkcyl7XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZHMpO1xuICAgIH0sXG4gICAgbG9nb3V0VXNlcjogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9nb3V0Jyk7XG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcbiAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICB1cmw6ICcvJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2FwcC9ob21lL2hvbWUuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbih1c2VyLCAkc3RhdGUsICRyb290U2NvcGUsICRzY29wZSwgU3RvcCxUcmlwLCBHb29nbGUpe1xuICAgICAgICBjb25zb2xlLmxvZyh1c2VyKTtcbiAgICAgICAgJHJvb3RTY29wZS5oaWRlbmF2ID0gZmFsc2U7XG4gICAgICAgIGlmICghdXNlcilcbiAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgaWYgKCFUcmlwLmdldEN1cnJlbnRUcmlwKCkpXG4gICAgICAgICAgVHJpcC5zZXRDdXJyZW50VHJpcCh1c2VyLnRyaXBzWzBdKTtcbiAgICAgICAgJHNjb3BlLmdldEN1cnJlbnRUcmlwID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICByZXR1cm4gVHJpcC5nZXRDdXJyZW50VHJpcCgpO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuc2hvd0RldGFpbHMgPSBmdW5jdGlvbihlLCBzdG9wKXtcbiAgICAgICAgICAvLyBpZiAoIVN0b3AuZ2V0Q3VycmVudCgpKVxuICAgICAgICAgICAgU3RvcC5nZXREZXRhaWxzKHN0b3ApO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZ2V0TmVhcmJ5ID0gZnVuY3Rpb24oa2V5d29yZCl7XG4gICAgICAgICAgdmFyIGN1cnJlbnRTdG9wID0gU3RvcC5nZXRDdXJyZW50KCk7XG4gICAgICAgICAgaWYgKGN1cnJlbnRTdG9wKXtcbiAgICAgICAgICAgIHJldHVybiBHb29nbGUuZ2V0TmVhcmJ5KGN1cnJlbnRTdG9wLCBrZXl3b3JkKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgIC8vU3RvcC5jbGVhckN1cnJlbnQoKTtcbiAgICAgICAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKGRhdGEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuc2hvd25TdG9wcyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgcmV0dXJuIFN0b3AuZ2V0U2hvd25TdG9wcygpO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuYWRkU3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIHN0b3AgPSBTdG9wLmdldEN1cnJlbnREaXNwbGF5KCk7XG4gICAgICAgICAgcmV0dXJuIEdvb2dsZS5nZXREaXN0YW5jZShzdG9wKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRpc3RhbmNlKXtcbiAgICAgICAgICAgIHN0b3AuZGlzdGFuY2UgPSBkaXN0YW5jZS52YWx1ZTtcbiAgICAgICAgICAgIHJldHVybiBUcmlwLmFkZFN0b3Aoc3RvcCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUucmVtb3ZlU3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIHN0b3AgPSBTdG9wLmdldEN1cnJlbnQoKTtcbiAgICAgICAgICByZXR1cm4gVHJpcC5yZW1vdmVTdG9wKHN0b3ApO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5lZGl0VHJpcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgVHJpcC5nZXRDdXJyZW50VHJpcCgpLm5hbWUgPSBUcmlwLmdldEN1cnJlbnRUcmlwKCkubmV3TmFtZTtcbiAgICAgICAgICBUcmlwLmdldEN1cnJlbnRUcmlwKCkuZWRpdGluZyA9IGZhbHNlO1xuICAgICAgICAgIHJldHVybiBUcmlwLmVkaXRUcmlwKCk7XG5cbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmdldEN1cnJlbnQgPSBTdG9wLmdldEN1cnJlbnQ7XG4gICAgICAgICRzY29wZS5jdXJyZW50RGlzcGxheVN0b3AgPSBTdG9wLmdldEN1cnJlbnREaXNwbGF5O1xuICAgICAgfSxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgdXNlcjogZnVuY3Rpb24oVXNlcil7XG4gICAgICAgICAgcmV0dXJuIFVzZXIuZ2V0VXNlcigpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgdGVtcGxhdGVVcmw6ICcvYXBwL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBVc2VyLCAkc3RhdGUsICRyb290U2NvcGUpe1xuICAgICAgICAkcm9vdFNjb3BlLmhpZGVuYXYgPSB0cnVlO1xuICAgICAgICAkc2NvcGUubG9naW4gPSBmdW5jdGlvbigpe1xuICAgICAgICAgIFVzZXIubG9naW5Vc2VyKCRzY29wZS5jcmVkcylcbiAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgdGVtcGxhdGVVcmw6ICcvYXBwL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIFVzZXIsICRzdGF0ZSwgTmdNYXApe1xuICAgICAgJHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIFVzZXIubG9nb3V0VXNlcigpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdzdG9wSXRlbScsIGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgc2NvcGU6e1xuICAgICAgaXRlbTogJz0nXG4gICAgfSxcbiAgICB0ZW1wbGF0ZVVybDogJy9hcHAvZGlyZWN0aXZlcy9zdG9wLWl0ZW0vc3RvcC1pdGVtLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgU3RvcCl7XG4gICAgICAkc2NvcGUuZ2V0UHJpY2UgPSBmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgdmFyIHJ0biA9ICcnO1xuICAgICAgICBmb3IodmFyIGkgPTA7aTxpdGVtLnByaWNlO2krKylcbiAgICAgICAgICBydG4rPSckJztcbiAgICAgICAgcmV0dXJuIHJ0bjtcbiAgICAgIH07XG4gICAgICAkc2NvcGUuZ2V0VHlwZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICgkc2NvcGUuaXRlbS50eXBlPT09J2JhcicpXG4gICAgICAgICAgcmV0dXJuICdsb2NhbF9iYXInO1xuICAgICAgICBlbHNlIGlmICgkc2NvcGUuaXRlbS50eXBlID09PSAncmVzdGF1cmFudCcpXG4gICAgICAgICAgcmV0dXJuICdyZXN0YXVyYW50JztcbiAgICAgICAgZWxzZSBpZiAoJHNjb3BlLml0ZW0udHlwZSA9PT0gJ2VudGVydGFpbm1lbnQnKVxuICAgICAgICAgIHJldHVybiAnc2VudGltZW50X3Zlcnlfc2F0aXNmaWVkJztcbiAgICAgIH07XG4gICAgICAkc2NvcGUuZ2V0TmFtZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkc2NvcGUuaXRlbS5uYW1lLnNsaWNlKDAsMTcpO1xuICAgICAgfTtcbiAgICAgICRzY29wZS5nZXREaXN0YW5jZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAoJHNjb3BlLml0ZW0uZGlzdGFuY2UgKiAwLjAwMDYyMTM3MSkudG9QcmVjaXNpb24oMSk7XG4gICAgICB9O1xuICAgICAgJHNjb3BlLmdldEN1cnJlbnQgPSBTdG9wLmdldEN1cnJlbnQ7XG4gICAgICAkc2NvcGUuc2V0Q3VycmVudCA9IGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgICBTdG9wLnNldEN1cnJlbnQoc3RvcCk7XG5cbiAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKHN0b3ApO1xuXG4gICAgICB9O1xuXG4gICAgfVxuICB9O1xufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
