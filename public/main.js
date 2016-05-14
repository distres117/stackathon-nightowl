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
      map.setCenter(bounds.getCenter());
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
        currentTrip.stops.unshift(stop);
      });
    },
    removeStop: function(stop){
      return $http.delete('/api/trips/' + currentTrip._id + "/stops/" + stop._id)
      .then(function(){
        var idx = currentTrip.stops.indexOf(stop);
        currentTrip.stops.splice(idx,1);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZhY3Rvcmllcy9Hb29nbGUuanMiLCJmYWN0b3JpZXMvU3RvcC5qcyIsImZhY3Rvcmllcy9UcmlwLmpzIiwiZmFjdG9yaWVzL1VzZXIuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsImRpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImRpcmVjdGl2ZXMvc3RvcC1pdGVtL3N0b3BJdGVtLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsndWkucm91dGVyJywgJ25nQW5pbWF0ZScsICduZ01hcCddKTtcbmFwcC5jb25maWcoZnVuY3Rpb24oJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcil7XG4gICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xufSk7XG4iLCJhcHAuZmFjdG9yeShcIkdvb2dsZVwiLCBmdW5jdGlvbigkaHR0cCl7XG4gIHJldHVybiB7XG4gICAgZ2V0TmVhcmJ5OiBmdW5jdGlvbihzdG9wLCBrZXl3b3JkKXtcbiAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICBsb2NhdGlvbjogc3RvcC5jb29yZHMudG9TdHJpbmcoKSxcbiAgICAgICAgcmFkaXVzOiAxMDAwLFxuICAgICAgICBrZXl3b3JkOiBrZXl3b3JkXG4gICAgICB9O1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvZ29vZ2xlL25lYXJieScsIGRhdGEpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICB2YXIgcnRuID0gcmVzLmRhdGEubWFwKGZ1bmN0aW9uKGl0ZW0saSl7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIF9pZDogaSsnJyxcbiAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZSxcbiAgICAgICAgICAgIGNvb3JkczogW2l0ZW0uZ2VvbWV0cnkubG9jYXRpb24ubGF0LGl0ZW0uZ2VvbWV0cnkubG9jYXRpb24ubG5nXSxcbiAgICAgICAgICAgIHByaWNlOiBpdGVtLnByaWNlX2xldmVsLFxuICAgICAgICAgICAgcmF0aW5nOiBpdGVtLnJhdGluZ1xuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcnRuO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnU3RvcCcsIGZ1bmN0aW9uKE5nTWFwKXtcbiAgdmFyIG1hcCwgY3VycmVudFN0b3AsIHNob3duU3RvcHMsIGN1cnJlbnREaXNwbGF5U3RvcDtcbiAgTmdNYXAuZ2V0TWFwKCkudGhlbihmdW5jdGlvbihfbWFwKXtcbiAgICBtYXAgPSBfbWFwO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBzZXRDdXJyZW50OiBmdW5jdGlvbihzdG9wKXtcbiAgICAgIGN1cnJlbnREaXNwbGF5U3RvcCA9IG51bGw7XG4gICAgICBjdXJyZW50U3RvcCA9IHN0b3A7XG5cbiAgICB9LFxuICAgIGNsZWFyQ3VycmVudDogZnVuY3Rpb24oKXtcbiAgICAgIGN1cnJlbnRTdG9wID0gbnVsbDtcbiAgICB9LFxuICAgIGdldERldGFpbHM6IGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgY3VycmVudERpc3BsYXlTdG9wID0gc3RvcDtcbiAgICAgIGN1cnJlbnRTdG9wID0gbnVsbDtcbiAgICAgIG1hcC5zaG93SW5mb1dpbmRvdygnaXcnLCBzdG9wLl9pZCk7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50RGlzcGxheTogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBjdXJyZW50RGlzcGxheVN0b3A7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50OiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGN1cnJlbnRTdG9wO1xuICAgIH0sXG4gICAgZ2V0U2hvd25TdG9wczogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBzaG93blN0b3BzO1xuICAgIH0sXG4gICAgc2V0U2hvd25TdG9wczogZnVuY3Rpb24oc3RvcHMpe1xuICAgICAgLy9UTyBETzogc2V0IG1hcCBib3VuZHNcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHN0b3BzKSlcbiAgICAgICAgc2hvd25TdG9wcyA9IHN0b3BzO1xuICAgICAgZWxzZSB7XG4gICAgICAgIHNob3duU3RvcHMgPSBbc3RvcHNdO1xuICAgICAgfVxuICAgICAgdmFyIGJvdW5kcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmdCb3VuZHMoKTtcbiAgICAgIHNob3duU3RvcHMuZm9yRWFjaChmdW5jdGlvbihzdG9wKXtcbiAgICAgICAgdmFyIGxhdGxuZyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoc3RvcC5jb29yZHNbMF0sIHN0b3AuY29vcmRzWzFdKTtcbiAgICAgICAgYm91bmRzLmV4dGVuZChsYXRsbmcpO1xuICAgICAgfSk7XG4gICAgICBtYXAuc2V0Q2VudGVyKGJvdW5kcy5nZXRDZW50ZXIoKSk7XG4gICAgICBtYXAuZml0Qm91bmRzKGJvdW5kcyk7XG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnVHJpcCcsIGZ1bmN0aW9uKCRodHRwLCBTdG9wKXtcbiAgdmFyIGN1cnJlbnRUcmlwO1xuICByZXR1cm4ge1xuICAgIGFkZFN0b3A6IGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgdmFyIGRhdGEgPSB7XG5cbiAgICAgIH07XG4gICAgICByZXR1cm4gJGh0dHAucHV0KCcvYXBpL3RyaXBzLycgKyBjdXJyZW50VHJpcC5faWQsIHtzdG9wOiBzdG9wfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIGN1cnJlbnRUcmlwLnN0b3BzLnVuc2hpZnQoc3RvcCk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHJlbW92ZVN0b3A6IGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZSgnL2FwaS90cmlwcy8nICsgY3VycmVudFRyaXAuX2lkICsgXCIvc3RvcHMvXCIgKyBzdG9wLl9pZClcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBpZHggPSBjdXJyZW50VHJpcC5zdG9wcy5pbmRleE9mKHN0b3ApO1xuICAgICAgICBjdXJyZW50VHJpcC5zdG9wcy5zcGxpY2UoaWR4LDEpO1xuICAgICAgICBTdG9wLnNldFNob3duU3RvcHMoW10pO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBzZXRDdXJyZW50VHJpcDogZnVuY3Rpb24odHJpcCl7XG4gICAgICBjdXJyZW50VHJpcCA9IHRyaXA7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50VHJpcDogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBjdXJyZW50VHJpcDtcbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdVc2VyJywgZnVuY3Rpb24oJGh0dHApe1xuICByZXR1cm4ge1xuICAgIGdldFVzZXI6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGNyZWF0ZVVzZXI6IGZ1bmN0aW9uKGNyZWRzKXtcbiAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvY3JlYXRlJywgY3JlZHMpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGxvZ2luVXNlcjogZnVuY3Rpb24oY3JlZHMpe1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRzKTtcbiAgICB9LFxuICAgIGxvZ291dFVzZXI6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ291dCcpO1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdob21lJywge1xuICAgICAgdXJsOiAnLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9hcHAvaG9tZS9ob21lLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24odXNlciwgJHN0YXRlLCAkcm9vdFNjb3BlLCAkc2NvcGUsIFN0b3AsVHJpcCwgR29vZ2xlKXtcbiAgICAgICAgY29uc29sZS5sb2codXNlcik7XG4gICAgICAgICRyb290U2NvcGUuaGlkZW5hdiA9IGZhbHNlO1xuICAgICAgICBpZiAoIXVzZXIpXG4gICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgIGlmICghVHJpcC5nZXRDdXJyZW50VHJpcCgpKVxuICAgICAgICAgIFRyaXAuc2V0Q3VycmVudFRyaXAodXNlci50cmlwc1swXSk7XG4gICAgICAgICRzY29wZS5nZXRDdXJyZW50VHJpcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgcmV0dXJuIFRyaXAuZ2V0Q3VycmVudFRyaXAoKTtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLnNob3dEZXRhaWxzID0gZnVuY3Rpb24oZSwgc3RvcCl7XG4gICAgICAgICAgaWYgKCFTdG9wLmdldEN1cnJlbnQoKSlcbiAgICAgICAgICAgIFN0b3AuZ2V0RGV0YWlscyhzdG9wKTtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmdldE5lYXJieSA9IGZ1bmN0aW9uKGtleXdvcmQpe1xuICAgICAgICAgIHZhciBjdXJyZW50U3RvcCA9IFN0b3AuZ2V0Q3VycmVudCgpO1xuICAgICAgICAgIGlmIChjdXJyZW50U3RvcCl7XG4gICAgICAgICAgICByZXR1cm4gR29vZ2xlLmdldE5lYXJieShjdXJyZW50U3RvcCwga2V5d29yZClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICBTdG9wLmNsZWFyQ3VycmVudCgpO1xuICAgICAgICAgICAgICBTdG9wLnNldFNob3duU3RvcHMoZGF0YSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5zaG93blN0b3BzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICByZXR1cm4gU3RvcC5nZXRTaG93blN0b3BzKCk7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5hZGRTdG9wID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICB2YXIgc3RvcCA9IFN0b3AuZ2V0Q3VycmVudERpc3BsYXkoKTtcbiAgICAgICAgICByZXR1cm4gVHJpcC5hZGRTdG9wKHN0b3ApO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5yZW1vdmVTdG9wID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICB2YXIgc3RvcCA9IFN0b3AuZ2V0Q3VycmVudCgpO1xuICAgICAgICAgIHJldHVybiBUcmlwLnJlbW92ZVN0b3Aoc3RvcCk7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5nZXRDdXJyZW50ID0gU3RvcC5nZXRDdXJyZW50O1xuICAgICAgICAkc2NvcGUuY3VycmVudERpc3BsYXlTdG9wID0gU3RvcC5nZXRDdXJyZW50RGlzcGxheTtcbiAgICAgIH0sXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIHVzZXI6IGZ1bmN0aW9uKFVzZXIpe1xuICAgICAgICAgIHJldHVybiBVc2VyLmdldFVzZXIoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcbiAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgdXJsOiAnL2xvZ2luJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2FwcC9sb2dpbi9sb2dpbi5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgVXNlciwgJHN0YXRlLCAkcm9vdFNjb3BlKXtcbiAgICAgICAgJHJvb3RTY29wZS5oaWRlbmF2ID0gdHJ1ZTtcbiAgICAgICAgJHNjb3BlLmxvZ2luID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICBVc2VyLmxvZ2luVXNlcigkc2NvcGUuY3JlZHMpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0pO1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbigpe1xuICByZXR1cm4ge1xuICAgIHRlbXBsYXRlVXJsOiAnL2FwcC9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBVc2VyLCAkc3RhdGUsIE5nTWFwKXtcbiAgICAgICRzY29wZS5sb2dvdXQgPSBmdW5jdGlvbigpe1xuICAgICAgICBVc2VyLmxvZ291dFVzZXIoKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnc3RvcEl0ZW0nLCBmdW5jdGlvbigpe1xuICByZXR1cm4ge1xuICAgIHNjb3BlOntcbiAgICAgIGl0ZW06ICc9J1xuICAgIH0sXG4gICAgdGVtcGxhdGVVcmw6ICcvYXBwL2RpcmVjdGl2ZXMvc3RvcC1pdGVtL3N0b3AtaXRlbS5odG1sJyxcbiAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIFN0b3Ape1xuICAgICAgJHNjb3BlLmdldFByaWNlID0gZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgIHZhciBydG4gPSAnJztcbiAgICAgICAgZm9yKHZhciBpID0wO2k8aXRlbS5wcmljZTtpKyspXG4gICAgICAgICAgcnRuKz0nJCc7XG4gICAgICAgIHJldHVybiBydG47XG4gICAgICB9O1xuICAgICAgJHNjb3BlLmdldEN1cnJlbnQgPSBTdG9wLmdldEN1cnJlbnQ7XG4gICAgICAkc2NvcGUuc2V0Q3VycmVudCA9IGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgICBTdG9wLnNldEN1cnJlbnQoc3RvcCk7XG5cbiAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKHN0b3ApO1xuXG4gICAgICB9O1xuXG4gICAgfVxuICB9O1xufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
