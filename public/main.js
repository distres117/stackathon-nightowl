var app = angular.module('app', ['ui.router', 'ngAnimate', 'ngMap']);
app.config(function($urlRouterProvider, $locationProvider){
  $locationProvider.html5Mode(true);
  $urlRouterProvider.otherwise('/');
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImhvbWUvaG9tZS5qcyIsImxvZ2luL2xvZ2luLmpzIiwiZmFjdG9yaWVzL0dvb2dsZS5qcyIsImZhY3Rvcmllcy9TdG9wLmpzIiwiZmFjdG9yaWVzL1RyaXAuanMiLCJmYWN0b3JpZXMvVXNlci5qcyIsImRpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImRpcmVjdGl2ZXMvc3RvcC1pdGVtL3N0b3BJdGVtLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXInLCAnbmdBbmltYXRlJywgJ25nTWFwJ10pO1xuYXBwLmNvbmZpZyhmdW5jdGlvbigkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKXtcbiAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgnaG9tZScsIHtcbiAgICAgIHVybDogJy8nLFxuICAgICAgdGVtcGxhdGVVcmw6ICcvYXBwL2hvbWUvaG9tZS5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKHVzZXIsICRzdGF0ZSwgJHJvb3RTY29wZSwgJHNjb3BlLCBTdG9wLFRyaXAsIEdvb2dsZSl7XG4gICAgICAgIGNvbnNvbGUubG9nKHVzZXIpO1xuICAgICAgICAkcm9vdFNjb3BlLmhpZGVuYXYgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF1c2VyKVxuICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICBpZiAoIVRyaXAuZ2V0Q3VycmVudFRyaXAoKSlcbiAgICAgICAgICBUcmlwLnNldEN1cnJlbnRUcmlwKHVzZXIudHJpcHNbMF0pO1xuICAgICAgICAkc2NvcGUuZ2V0Q3VycmVudFRyaXAgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIHJldHVybiBUcmlwLmdldEN1cnJlbnRUcmlwKCk7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5zaG93RGV0YWlscyA9IGZ1bmN0aW9uKGUsIHN0b3Ape1xuICAgICAgICAgIGlmICghU3RvcC5nZXRDdXJyZW50KCkpXG4gICAgICAgICAgICBTdG9wLmdldERldGFpbHMoc3RvcCk7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5nZXROZWFyYnkgPSBmdW5jdGlvbihrZXl3b3JkKXtcbiAgICAgICAgICB2YXIgY3VycmVudFN0b3AgPSBTdG9wLmdldEN1cnJlbnQoKTtcbiAgICAgICAgICBpZiAoY3VycmVudFN0b3Ape1xuICAgICAgICAgICAgcmV0dXJuIEdvb2dsZS5nZXROZWFyYnkoY3VycmVudFN0b3AsIGtleXdvcmQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgU3RvcC5jbGVhckN1cnJlbnQoKTtcbiAgICAgICAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKGRhdGEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuc2hvd25TdG9wcyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgcmV0dXJuIFN0b3AuZ2V0U2hvd25TdG9wcygpO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuYWRkU3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIHN0b3AgPSBTdG9wLmdldEN1cnJlbnREaXNwbGF5KCk7XG4gICAgICAgICAgcmV0dXJuIFRyaXAuYWRkU3RvcChzdG9wKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUucmVtb3ZlU3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIHN0b3AgPSBTdG9wLmdldEN1cnJlbnQoKTtcbiAgICAgICAgICByZXR1cm4gVHJpcC5yZW1vdmVTdG9wKHN0b3ApO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5lZGl0VHJpcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgVHJpcC5nZXRDdXJyZW50VHJpcCgpLm5hbWUgPSBUcmlwLmdldEN1cnJlbnRUcmlwKCkubmV3TmFtZTtcbiAgICAgICAgICBUcmlwLmdldEN1cnJlbnRUcmlwKCkuZWRpdGluZyA9IGZhbHNlO1xuICAgICAgICAgIHJldHVybiBUcmlwLmVkaXRUcmlwKCk7XG5cbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmdldEN1cnJlbnQgPSBTdG9wLmdldEN1cnJlbnQ7XG4gICAgICAgICRzY29wZS5jdXJyZW50RGlzcGxheVN0b3AgPSBTdG9wLmdldEN1cnJlbnREaXNwbGF5O1xuICAgICAgfSxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgdXNlcjogZnVuY3Rpb24oVXNlcil7XG4gICAgICAgICAgcmV0dXJuIFVzZXIuZ2V0VXNlcigpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgdGVtcGxhdGVVcmw6ICcvYXBwL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBVc2VyLCAkc3RhdGUsICRyb290U2NvcGUpe1xuICAgICAgICAkcm9vdFNjb3BlLmhpZGVuYXYgPSB0cnVlO1xuICAgICAgICAkc2NvcGUubG9naW4gPSBmdW5jdGlvbigpe1xuICAgICAgICAgIFVzZXIubG9naW5Vc2VyKCRzY29wZS5jcmVkcylcbiAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5mYWN0b3J5KFwiR29vZ2xlXCIsIGZ1bmN0aW9uKCRodHRwKXtcbiAgcmV0dXJuIHtcbiAgICBnZXROZWFyYnk6IGZ1bmN0aW9uKHN0b3AsIGtleXdvcmQpe1xuICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgIGxvY2F0aW9uOiBzdG9wLmNvb3Jkcy50b1N0cmluZygpLFxuICAgICAgICByYWRpdXM6IDEwMDAsXG4gICAgICAgIGtleXdvcmQ6IGtleXdvcmRcbiAgICAgIH07XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9nb29nbGUvbmVhcmJ5JywgZGF0YSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHZhciBydG4gPSByZXMuZGF0YS5tYXAoZnVuY3Rpb24oaXRlbSxpKXtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgX2lkOiBpKycnLFxuICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLFxuICAgICAgICAgICAgY29vcmRzOiBbaXRlbS5nZW9tZXRyeS5sb2NhdGlvbi5sYXQsaXRlbS5nZW9tZXRyeS5sb2NhdGlvbi5sbmddLFxuICAgICAgICAgICAgcHJpY2U6IGl0ZW0ucHJpY2VfbGV2ZWwsXG4gICAgICAgICAgICByYXRpbmc6IGl0ZW0ucmF0aW5nXG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBydG47XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdTdG9wJywgZnVuY3Rpb24oTmdNYXApe1xuICB2YXIgbWFwLCBjdXJyZW50U3RvcCwgc2hvd25TdG9wcywgY3VycmVudERpc3BsYXlTdG9wO1xuICBOZ01hcC5nZXRNYXAoKS50aGVuKGZ1bmN0aW9uKF9tYXApe1xuICAgIG1hcCA9IF9tYXA7XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIHNldEN1cnJlbnQ6IGZ1bmN0aW9uKHN0b3AsIHNob3cpe1xuICAgICAgY3VycmVudERpc3BsYXlTdG9wID0gbnVsbDtcbiAgICAgIGN1cnJlbnRTdG9wID0gc3RvcDtcbiAgICAgIG1hcC5oaWRlSW5mb1dpbmRvdygnaXcnKTtcblxuICAgIH0sXG4gICAgY2xlYXJDdXJyZW50OiBmdW5jdGlvbigpe1xuICAgICAgY3VycmVudFN0b3AgPSBudWxsO1xuICAgIH0sXG4gICAgZ2V0RGV0YWlsczogZnVuY3Rpb24oc3RvcCl7XG4gICAgICBjdXJyZW50RGlzcGxheVN0b3AgPSBzdG9wO1xuICAgICAgY3VycmVudFN0b3AgPSBudWxsO1xuICAgICAgbWFwLnNob3dJbmZvV2luZG93KCdpdycsIHN0b3AuX2lkKTtcbiAgICB9LFxuICAgIGdldEN1cnJlbnREaXNwbGF5OiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGN1cnJlbnREaXNwbGF5U3RvcDtcbiAgICB9LFxuICAgIGdldEN1cnJlbnQ6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gY3VycmVudFN0b3A7XG4gICAgfSxcbiAgICBnZXRTaG93blN0b3BzOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHNob3duU3RvcHM7XG4gICAgfSxcbiAgICBzZXRTaG93blN0b3BzOiBmdW5jdGlvbihzdG9wcyl7XG4gICAgICAvL1RPIERPOiBzZXQgbWFwIGJvdW5kc1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3RvcHMpKVxuICAgICAgICBzaG93blN0b3BzID0gc3RvcHM7XG4gICAgICBlbHNlIHtcbiAgICAgICAgc2hvd25TdG9wcyA9IFtzdG9wc107XG4gICAgICB9XG4gICAgICB2YXIgYm91bmRzID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZ0JvdW5kcygpO1xuICAgICAgc2hvd25TdG9wcy5mb3JFYWNoKGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgICB2YXIgbGF0bG5nID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhzdG9wLmNvb3Jkc1swXSwgc3RvcC5jb29yZHNbMV0pO1xuICAgICAgICBib3VuZHMuZXh0ZW5kKGxhdGxuZyk7XG4gICAgICB9KTtcbiAgICAgIGlmIChzaG93blN0b3BzLmxlbmd0aClcbiAgICAgICAgbWFwLnNldENlbnRlcihib3VuZHMuZ2V0Q2VudGVyKCkpO1xuICAgICAgaWYgKHNob3duU3RvcHMubGVuZ3RoID4gMSlcbiAgICAgICAgbWFwLmZpdEJvdW5kcyhib3VuZHMpO1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1RyaXAnLCBmdW5jdGlvbigkaHR0cCwgU3RvcCl7XG4gIHZhciBjdXJyZW50VHJpcDtcbiAgcmV0dXJuIHtcbiAgICBlZGl0VHJpcDogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiAkaHR0cC5wdXQoJy9hcGkvdHJpcHMvJyArIGN1cnJlbnRUcmlwLl9pZCwge25hbWU6IGN1cnJlbnRUcmlwLm5ld05hbWUgfSk7XG4gICAgfSxcbiAgICBhZGRTdG9wOiBmdW5jdGlvbihzdG9wKXtcbiAgICAgIHZhciBkYXRhID0ge1xuXG4gICAgICB9O1xuICAgICAgcmV0dXJuICRodHRwLnB1dCgnL2FwaS90cmlwcy8nICsgY3VycmVudFRyaXAuX2lkLCB7c3RvcDogc3RvcH0pXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICB2YXIgbmV3U3RvcCA9IHJlcy5kYXRhO1xuICAgICAgICBTdG9wLnNldEN1cnJlbnQobmV3U3RvcCk7XG4gICAgICAgIFN0b3Auc2V0U2hvd25TdG9wcyhzdG9wKTtcbiAgICAgICAgY3VycmVudFRyaXAuc3RvcHMudW5zaGlmdChzdG9wKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcmVtb3ZlU3RvcDogZnVuY3Rpb24oc3RvcCl7XG4gICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKCcvYXBpL3RyaXBzLycgKyBjdXJyZW50VHJpcC5faWQgKyBcIi9zdG9wcy9cIiArIHN0b3AuX2lkKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGlkeCA9IGN1cnJlbnRUcmlwLnN0b3BzLmluZGV4T2Yoc3RvcCk7XG4gICAgICAgIGN1cnJlbnRUcmlwLnN0b3BzLnNwbGljZShpZHgsMSk7XG4gICAgICAgIFN0b3AuY2xlYXJDdXJyZW50KCk7XG4gICAgICAgIFN0b3Auc2V0U2hvd25TdG9wcyhbXSk7XG4gICAgICAgIC8vIGlmIChjdXJyZW50VHJpcC5zdG9wcy5sZW5ndGgpXG4gICAgICAgIC8vICAgU3RvcC5zZXRDdXJyZW50KGN1cnJlbnRUcmlwLnN0b3BzWzBdLCB0cnVlKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgc2V0Q3VycmVudFRyaXA6IGZ1bmN0aW9uKHRyaXApe1xuICAgICAgY3VycmVudFRyaXAgPSB0cmlwO1xuICAgIH0sXG4gICAgZ2V0Q3VycmVudFRyaXA6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gY3VycmVudFRyaXA7XG4gICAgfSxcbiAgICBjcmVhdGVUcmlwOiBmdW5jdGlvbigpe1xuXG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnVXNlcicsIGZ1bmN0aW9uKCRodHRwKXtcbiAgcmV0dXJuIHtcbiAgICBnZXRVc2VyOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBjcmVhdGVVc2VyOiBmdW5jdGlvbihjcmVkcyl7XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2NyZWF0ZScsIGNyZWRzKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBsb2dpblVzZXI6IGZ1bmN0aW9uKGNyZWRzKXtcbiAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkcyk7XG4gICAgfSxcbiAgICBsb2dvdXRVc2VyOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dvdXQnKTtcbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgdGVtcGxhdGVVcmw6ICcvYXBwL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIFVzZXIsICRzdGF0ZSwgTmdNYXApe1xuICAgICAgJHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIFVzZXIubG9nb3V0VXNlcigpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdzdG9wSXRlbScsIGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgc2NvcGU6e1xuICAgICAgaXRlbTogJz0nXG4gICAgfSxcbiAgICB0ZW1wbGF0ZVVybDogJy9hcHAvZGlyZWN0aXZlcy9zdG9wLWl0ZW0vc3RvcC1pdGVtLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgU3RvcCl7XG4gICAgICAkc2NvcGUuZ2V0UHJpY2UgPSBmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgdmFyIHJ0biA9ICcnO1xuICAgICAgICBmb3IodmFyIGkgPTA7aTxpdGVtLnByaWNlO2krKylcbiAgICAgICAgICBydG4rPSckJztcbiAgICAgICAgcmV0dXJuIHJ0bjtcbiAgICAgIH07XG4gICAgICAkc2NvcGUuZ2V0Q3VycmVudCA9IFN0b3AuZ2V0Q3VycmVudDtcbiAgICAgICRzY29wZS5zZXRDdXJyZW50ID0gZnVuY3Rpb24oc3RvcCl7XG4gICAgICAgIFN0b3Auc2V0Q3VycmVudChzdG9wKTtcblxuICAgICAgICBTdG9wLnNldFNob3duU3RvcHMoc3RvcCk7XG5cbiAgICAgIH07XG5cbiAgICB9XG4gIH07XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
