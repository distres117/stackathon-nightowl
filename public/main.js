var app = angular.module('app', ['ui.router', 'ngAnimate', 'ngMap']);
app.config(function($urlRouterProvider, $locationProvider){
  $locationProvider.html5Mode(true);
  $urlRouterProvider.otherwise('/');
});

app.factory("Google", function($http){
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
            coords: [item.geometry.location.lat,item.geometry.location.lng],
            price: item.price_level,
            rating: item.rating
          };
        });
        console.log(rtn);
        return rtn;
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
    setCurrent: function(stop){
      currentDisplayStop = null;
      currentStop = stop;
      map.hideInfoWindow('iw');

    },
    clearCurrent: function(){
      currentStop = null;
    },
    getDetails: function(stop){
      currentDisplayStop = stop;
      currentStop = null;
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
      });
    },
    setCurrentTrip: function(trip){
      currentTrip = trip;
    },
    getCurrentTrip: function(){
      return currentTrip;
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
          return Trip.addStop(stop);
        };

        $scope.removeStop = function(){
          var stop = Stop.getCurrent();
          return Trip.removeStop(stop);
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
      $scope.getCurrent = Stop.getCurrent;
      $scope.setCurrent = function(stop){
        Stop.setCurrent(stop);

        Stop.setShownStops(stop);

      };

    }
  };
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZhY3Rvcmllcy9Hb29nbGUuanMiLCJmYWN0b3JpZXMvU3RvcC5qcyIsImZhY3Rvcmllcy9UcmlwLmpzIiwiZmFjdG9yaWVzL1VzZXIuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsImRpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImRpcmVjdGl2ZXMvc3RvcC1pdGVtL3N0b3BJdGVtLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ3VpLnJvdXRlcicsICduZ0FuaW1hdGUnLCAnbmdNYXAnXSk7XG5hcHAuY29uZmlnKGZ1bmN0aW9uKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpe1xuICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4gICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoXCJHb29nbGVcIiwgZnVuY3Rpb24oJGh0dHApe1xuICByZXR1cm4ge1xuICAgIGdldE5lYXJieTogZnVuY3Rpb24oc3RvcCwga2V5d29yZCl7XG4gICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgbG9jYXRpb246IHN0b3AuY29vcmRzLnRvU3RyaW5nKCksXG4gICAgICAgIHJhZGl1czogMTAwMCxcbiAgICAgICAga2V5d29yZDoga2V5d29yZFxuICAgICAgfTtcbiAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL2dvb2dsZS9uZWFyYnknLCBkYXRhKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgdmFyIHJ0biA9IHJlcy5kYXRhLm1hcChmdW5jdGlvbihpdGVtLGkpe1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBfaWQ6IGkrJycsXG4gICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUsXG4gICAgICAgICAgICBjb29yZHM6IFtpdGVtLmdlb21ldHJ5LmxvY2F0aW9uLmxhdCxpdGVtLmdlb21ldHJ5LmxvY2F0aW9uLmxuZ10sXG4gICAgICAgICAgICBwcmljZTogaXRlbS5wcmljZV9sZXZlbCxcbiAgICAgICAgICAgIHJhdGluZzogaXRlbS5yYXRpbmdcbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc29sZS5sb2cocnRuKTtcbiAgICAgICAgcmV0dXJuIHJ0bjtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1N0b3AnLCBmdW5jdGlvbihOZ01hcCl7XG4gIHZhciBtYXAsIGN1cnJlbnRTdG9wLCBzaG93blN0b3BzLCBjdXJyZW50RGlzcGxheVN0b3A7XG4gIE5nTWFwLmdldE1hcCgpLnRoZW4oZnVuY3Rpb24oX21hcCl7XG4gICAgbWFwID0gX21hcDtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgc2V0Q3VycmVudDogZnVuY3Rpb24oc3RvcCl7XG4gICAgICBjdXJyZW50RGlzcGxheVN0b3AgPSBudWxsO1xuICAgICAgY3VycmVudFN0b3AgPSBzdG9wO1xuICAgICAgbWFwLmhpZGVJbmZvV2luZG93KCdpdycpO1xuXG4gICAgfSxcbiAgICBjbGVhckN1cnJlbnQ6IGZ1bmN0aW9uKCl7XG4gICAgICBjdXJyZW50U3RvcCA9IG51bGw7XG4gICAgfSxcbiAgICBnZXREZXRhaWxzOiBmdW5jdGlvbihzdG9wKXtcbiAgICAgIGN1cnJlbnREaXNwbGF5U3RvcCA9IHN0b3A7XG4gICAgICBjdXJyZW50U3RvcCA9IG51bGw7XG4gICAgICBtYXAuc2hvd0luZm9XaW5kb3coJ2l3Jywgc3RvcC5faWQpO1xuICAgIH0sXG4gICAgZ2V0Q3VycmVudERpc3BsYXk6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gY3VycmVudERpc3BsYXlTdG9wO1xuICAgIH0sXG4gICAgZ2V0Q3VycmVudDogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBjdXJyZW50U3RvcDtcbiAgICB9LFxuICAgIGdldFNob3duU3RvcHM6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gc2hvd25TdG9wcztcbiAgICB9LFxuICAgIHNldFNob3duU3RvcHM6IGZ1bmN0aW9uKHN0b3BzKXtcbiAgICAgIC8vVE8gRE86IHNldCBtYXAgYm91bmRzXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShzdG9wcykpXG4gICAgICAgIHNob3duU3RvcHMgPSBzdG9wcztcbiAgICAgIGVsc2Uge1xuICAgICAgICBzaG93blN0b3BzID0gW3N0b3BzXTtcbiAgICAgIH1cbiAgICAgIHZhciBib3VuZHMgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nQm91bmRzKCk7XG4gICAgICBzaG93blN0b3BzLmZvckVhY2goZnVuY3Rpb24oc3RvcCl7XG4gICAgICAgIHZhciBsYXRsbmcgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHN0b3AuY29vcmRzWzBdLCBzdG9wLmNvb3Jkc1sxXSk7XG4gICAgICAgIGJvdW5kcy5leHRlbmQobGF0bG5nKTtcbiAgICAgIH0pO1xuICAgICAgaWYgKHNob3duU3RvcHMubGVuZ3RoKVxuICAgICAgICBtYXAuc2V0Q2VudGVyKGJvdW5kcy5nZXRDZW50ZXIoKSk7XG4gICAgICBpZiAoc2hvd25TdG9wcy5sZW5ndGggPiAxKVxuICAgICAgICBtYXAuZml0Qm91bmRzKGJvdW5kcyk7XG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnVHJpcCcsIGZ1bmN0aW9uKCRodHRwLCBTdG9wKXtcbiAgdmFyIGN1cnJlbnRUcmlwO1xuICByZXR1cm4ge1xuICAgIGFkZFN0b3A6IGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgdmFyIGRhdGEgPSB7XG5cbiAgICAgIH07XG4gICAgICByZXR1cm4gJGh0dHAucHV0KCcvYXBpL3RyaXBzLycgKyBjdXJyZW50VHJpcC5faWQsIHtzdG9wOiBzdG9wfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHZhciBuZXdTdG9wID0gcmVzLmRhdGE7XG4gICAgICAgIFN0b3Auc2V0Q3VycmVudChuZXdTdG9wKTtcbiAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKHN0b3ApO1xuICAgICAgICBjdXJyZW50VHJpcC5zdG9wcy51bnNoaWZ0KHN0b3ApO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICByZW1vdmVTdG9wOiBmdW5jdGlvbihzdG9wKXtcbiAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvdHJpcHMvJyArIGN1cnJlbnRUcmlwLl9pZCArIFwiL3N0b3BzL1wiICsgc3RvcC5faWQpXG4gICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICB2YXIgaWR4ID0gY3VycmVudFRyaXAuc3RvcHMuaW5kZXhPZihzdG9wKTtcbiAgICAgICAgY3VycmVudFRyaXAuc3RvcHMuc3BsaWNlKGlkeCwxKTtcbiAgICAgICAgU3RvcC5jbGVhckN1cnJlbnQoKTtcbiAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKFtdKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgc2V0Q3VycmVudFRyaXA6IGZ1bmN0aW9uKHRyaXApe1xuICAgICAgY3VycmVudFRyaXAgPSB0cmlwO1xuICAgIH0sXG4gICAgZ2V0Q3VycmVudFRyaXA6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gY3VycmVudFRyaXA7XG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnVXNlcicsIGZ1bmN0aW9uKCRodHRwKXtcbiAgcmV0dXJuIHtcbiAgICBnZXRVc2VyOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBjcmVhdGVVc2VyOiBmdW5jdGlvbihjcmVkcyl7XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2NyZWF0ZScsIGNyZWRzKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBsb2dpblVzZXI6IGZ1bmN0aW9uKGNyZWRzKXtcbiAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkcyk7XG4gICAgfSxcbiAgICBsb2dvdXRVc2VyOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dvdXQnKTtcbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgnaG9tZScsIHtcbiAgICAgIHVybDogJy8nLFxuICAgICAgdGVtcGxhdGVVcmw6ICcvYXBwL2hvbWUvaG9tZS5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKHVzZXIsICRzdGF0ZSwgJHJvb3RTY29wZSwgJHNjb3BlLCBTdG9wLFRyaXAsIEdvb2dsZSl7XG4gICAgICAgIGNvbnNvbGUubG9nKHVzZXIpO1xuICAgICAgICAkcm9vdFNjb3BlLmhpZGVuYXYgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF1c2VyKVxuICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICBpZiAoIVRyaXAuZ2V0Q3VycmVudFRyaXAoKSlcbiAgICAgICAgICBUcmlwLnNldEN1cnJlbnRUcmlwKHVzZXIudHJpcHNbMF0pO1xuICAgICAgICAkc2NvcGUuZ2V0Q3VycmVudFRyaXAgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIHJldHVybiBUcmlwLmdldEN1cnJlbnRUcmlwKCk7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5zaG93RGV0YWlscyA9IGZ1bmN0aW9uKGUsIHN0b3Ape1xuICAgICAgICAgIGlmICghU3RvcC5nZXRDdXJyZW50KCkpXG4gICAgICAgICAgICBTdG9wLmdldERldGFpbHMoc3RvcCk7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5nZXROZWFyYnkgPSBmdW5jdGlvbihrZXl3b3JkKXtcbiAgICAgICAgICB2YXIgY3VycmVudFN0b3AgPSBTdG9wLmdldEN1cnJlbnQoKTtcbiAgICAgICAgICBpZiAoY3VycmVudFN0b3Ape1xuICAgICAgICAgICAgcmV0dXJuIEdvb2dsZS5nZXROZWFyYnkoY3VycmVudFN0b3AsIGtleXdvcmQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgU3RvcC5jbGVhckN1cnJlbnQoKTtcbiAgICAgICAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKGRhdGEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuc2hvd25TdG9wcyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgcmV0dXJuIFN0b3AuZ2V0U2hvd25TdG9wcygpO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuYWRkU3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIHN0b3AgPSBTdG9wLmdldEN1cnJlbnREaXNwbGF5KCk7XG4gICAgICAgICAgcmV0dXJuIFRyaXAuYWRkU3RvcChzdG9wKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUucmVtb3ZlU3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIHN0b3AgPSBTdG9wLmdldEN1cnJlbnQoKTtcbiAgICAgICAgICByZXR1cm4gVHJpcC5yZW1vdmVTdG9wKHN0b3ApO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZ2V0Q3VycmVudCA9IFN0b3AuZ2V0Q3VycmVudDtcbiAgICAgICAgJHNjb3BlLmN1cnJlbnREaXNwbGF5U3RvcCA9IFN0b3AuZ2V0Q3VycmVudERpc3BsYXk7XG4gICAgICB9LFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICB1c2VyOiBmdW5jdGlvbihVc2VyKXtcbiAgICAgICAgICByZXR1cm4gVXNlci5nZXRVc2VyKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9hcHAvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIFVzZXIsICRzdGF0ZSwgJHJvb3RTY29wZSl7XG4gICAgICAgICRyb290U2NvcGUuaGlkZW5hdiA9IHRydWU7XG4gICAgICAgICRzY29wZS5sb2dpbiA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgVXNlci5sb2dpblVzZXIoJHNjb3BlLmNyZWRzKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHtcbiAgICB0ZW1wbGF0ZVVybDogJy9hcHAvZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgVXNlciwgJHN0YXRlLCBOZ01hcCl7XG4gICAgICAkc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgVXNlci5sb2dvdXRVc2VyKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ3N0b3BJdGVtJywgZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHtcbiAgICBzY29wZTp7XG4gICAgICBpdGVtOiAnPSdcbiAgICB9LFxuICAgIHRlbXBsYXRlVXJsOiAnL2FwcC9kaXJlY3RpdmVzL3N0b3AtaXRlbS9zdG9wLWl0ZW0uaHRtbCcsXG4gICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBTdG9wKXtcbiAgICAgICRzY29wZS5nZXRQcmljZSA9IGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICB2YXIgcnRuID0gJyc7XG4gICAgICAgIGZvcih2YXIgaSA9MDtpPGl0ZW0ucHJpY2U7aSsrKVxuICAgICAgICAgIHJ0bis9JyQnO1xuICAgICAgICByZXR1cm4gcnRuO1xuICAgICAgfTtcbiAgICAgICRzY29wZS5nZXRDdXJyZW50ID0gU3RvcC5nZXRDdXJyZW50O1xuICAgICAgJHNjb3BlLnNldEN1cnJlbnQgPSBmdW5jdGlvbihzdG9wKXtcbiAgICAgICAgU3RvcC5zZXRDdXJyZW50KHN0b3ApO1xuXG4gICAgICAgIFN0b3Auc2V0U2hvd25TdG9wcyhzdG9wKTtcblxuICAgICAgfTtcblxuICAgIH1cbiAgfTtcbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
