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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZhY3Rvcmllcy9Hb29nbGUuanMiLCJmYWN0b3JpZXMvU3RvcC5qcyIsImZhY3Rvcmllcy9UcmlwLmpzIiwiZmFjdG9yaWVzL1VzZXIuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsImRpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImRpcmVjdGl2ZXMvc3RvcC1pdGVtL3N0b3BJdGVtLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ3VpLnJvdXRlcicsICduZ0FuaW1hdGUnLCAnbmdNYXAnXSk7XG5hcHAuY29uZmlnKGZ1bmN0aW9uKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpe1xuICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4gICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoXCJHb29nbGVcIiwgZnVuY3Rpb24oJGh0dHAsIFN0b3Ape1xuICByZXR1cm4ge1xuICAgIGdldE5lYXJieTogZnVuY3Rpb24oc3RvcCwga2V5d29yZCl7XG4gICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgbG9jYXRpb246IHN0b3AuY29vcmRzLnRvU3RyaW5nKCksXG4gICAgICAgIHJhZGl1czogMTAwMCxcbiAgICAgICAga2V5d29yZDoga2V5d29yZFxuICAgICAgfTtcbiAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL2dvb2dsZS9uZWFyYnknLCBkYXRhKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgdmFyIHJ0biA9IHJlcy5kYXRhLm1hcChmdW5jdGlvbihpdGVtLGkpe1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBfaWQ6IGkrJycsXG4gICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUsXG4gICAgICAgICAgICB0eXBlOiBrZXl3b3JkLFxuICAgICAgICAgICAgY29vcmRzOiBbaXRlbS5nZW9tZXRyeS5sb2NhdGlvbi5sYXQsaXRlbS5nZW9tZXRyeS5sb2NhdGlvbi5sbmddLFxuICAgICAgICAgICAgcHJpY2U6IGl0ZW0ucHJpY2VfbGV2ZWwsXG4gICAgICAgICAgICByYXRpbmc6IGl0ZW0ucmF0aW5nLFxuICAgICAgICAgICAgaXNOZXc6IHRydWVcbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJ0bjtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZ2V0RGlzdGFuY2U6IGZ1bmN0aW9uKG5ld1N0b3Ape1xuICAgICAgdmFyIGN1cnJlbnRTdG9wID0gU3RvcC5nZXRDdXJyZW50KCk7XG4gICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgb3JpZ2luczogY3VycmVudFN0b3AuY29vcmRzLnRvU3RyaW5nKCksXG4gICAgICAgIGRlc3RpbmF0aW9uczogbmV3U3RvcC5jb29yZHMudG9TdHJpbmcoKSxcbiAgICAgICAgdW5pdHM6ICdpbXBlcmlhbCcsXG4gICAgICAgIG1vZGU6ICd3YWxraW5nJ1xuICAgICAgfTtcbiAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL2dvb2dsZS9kaXN0YW5jZScsIGRhdGEpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdTdG9wJywgZnVuY3Rpb24oTmdNYXApe1xuICB2YXIgbWFwLCBjdXJyZW50U3RvcCwgc2hvd25TdG9wcywgY3VycmVudERpc3BsYXlTdG9wO1xuICBOZ01hcC5nZXRNYXAoKS50aGVuKGZ1bmN0aW9uKF9tYXApe1xuICAgIG1hcCA9IF9tYXA7XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIHNldEN1cnJlbnQ6IGZ1bmN0aW9uKHN0b3AsIHNob3cpe1xuICAgICAgY3VycmVudERpc3BsYXlTdG9wID0gbnVsbDtcbiAgICAgIGN1cnJlbnRTdG9wID0gc3RvcDtcbiAgICAgIG1hcC5oaWRlSW5mb1dpbmRvdygnaXcnKTtcblxuICAgIH0sXG4gICAgY2xlYXJDdXJyZW50OiBmdW5jdGlvbigpe1xuICAgICAgY3VycmVudFN0b3AgPSBudWxsO1xuICAgIH0sXG4gICAgZ2V0RGV0YWlsczogZnVuY3Rpb24oc3RvcCl7XG4gICAgICBjdXJyZW50RGlzcGxheVN0b3AgPSBzdG9wO1xuICAgICAgLy9jdXJyZW50U3RvcCA9IG51bGw7XG4gICAgICBtYXAuc2hvd0luZm9XaW5kb3coJ2l3Jywgc3RvcC5faWQpO1xuICAgIH0sXG4gICAgZ2V0Q3VycmVudERpc3BsYXk6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gY3VycmVudERpc3BsYXlTdG9wO1xuICAgIH0sXG4gICAgZ2V0Q3VycmVudDogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBjdXJyZW50U3RvcDtcbiAgICB9LFxuICAgIGdldFNob3duU3RvcHM6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gc2hvd25TdG9wcztcbiAgICB9LFxuICAgIHNldFNob3duU3RvcHM6IGZ1bmN0aW9uKHN0b3BzKXtcbiAgICAgIG1hcC5oaWRlSW5mb1dpbmRvdygnaXcnKTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHN0b3BzKSlcbiAgICAgICAgc2hvd25TdG9wcyA9IHN0b3BzO1xuICAgICAgZWxzZSB7XG4gICAgICAgIHNob3duU3RvcHMgPSBbc3RvcHNdO1xuICAgICAgfVxuICAgICAgdmFyIGJvdW5kcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmdCb3VuZHMoKTtcbiAgICAgIHNob3duU3RvcHMuZm9yRWFjaChmdW5jdGlvbihzdG9wKXtcbiAgICAgICAgdmFyIGxhdGxuZyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoc3RvcC5jb29yZHNbMF0sIHN0b3AuY29vcmRzWzFdKTtcbiAgICAgICAgYm91bmRzLmV4dGVuZChsYXRsbmcpO1xuICAgICAgfSk7XG4gICAgICBpZiAoc2hvd25TdG9wcy5sZW5ndGgpXG4gICAgICAgIG1hcC5zZXRDZW50ZXIoYm91bmRzLmdldENlbnRlcigpKTtcbiAgICAgIGlmIChzaG93blN0b3BzLmxlbmd0aCA+IDEpXG4gICAgICAgIG1hcC5maXRCb3VuZHMoYm91bmRzKTtcbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdUcmlwJywgZnVuY3Rpb24oJGh0dHAsIFN0b3Ape1xuICB2YXIgY3VycmVudFRyaXA7XG4gIHJldHVybiB7XG4gICAgZWRpdFRyaXA6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gJGh0dHAucHV0KCcvYXBpL3RyaXBzLycgKyBjdXJyZW50VHJpcC5faWQsIHtuYW1lOiBjdXJyZW50VHJpcC5uZXdOYW1lIH0pO1xuICAgIH0sXG4gICAgYWRkU3RvcDogZnVuY3Rpb24oc3RvcCl7XG4gICAgICB2YXIgZGF0YSA9IHtcblxuICAgICAgfTtcbiAgICAgIHJldHVybiAkaHR0cC5wdXQoJy9hcGkvdHJpcHMvJyArIGN1cnJlbnRUcmlwLl9pZCwge3N0b3A6IHN0b3B9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgdmFyIG5ld1N0b3AgPSByZXMuZGF0YTtcbiAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKHN0b3ApO1xuICAgICAgICBjdXJyZW50VHJpcC5zdG9wcy51bnNoaWZ0KHN0b3ApO1xuICAgICAgICBTdG9wLnNldEN1cnJlbnQobmV3U3RvcCk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHJlbW92ZVN0b3A6IGZ1bmN0aW9uKHN0b3Ape1xuICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZSgnL2FwaS90cmlwcy8nICsgY3VycmVudFRyaXAuX2lkICsgXCIvc3RvcHMvXCIgKyBzdG9wLl9pZClcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBpZHggPSBjdXJyZW50VHJpcC5zdG9wcy5pbmRleE9mKHN0b3ApO1xuICAgICAgICBjdXJyZW50VHJpcC5zdG9wcy5zcGxpY2UoaWR4LDEpO1xuICAgICAgICBTdG9wLmNsZWFyQ3VycmVudCgpO1xuICAgICAgICBTdG9wLnNldFNob3duU3RvcHMoW10pO1xuICAgICAgICAvLyBpZiAoY3VycmVudFRyaXAuc3RvcHMubGVuZ3RoKVxuICAgICAgICAvLyAgIFN0b3Auc2V0Q3VycmVudChjdXJyZW50VHJpcC5zdG9wc1swXSwgdHJ1ZSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHNldEN1cnJlbnRUcmlwOiBmdW5jdGlvbih0cmlwKXtcbiAgICAgIGN1cnJlbnRUcmlwID0gdHJpcDtcbiAgICB9LFxuICAgIGdldEN1cnJlbnRUcmlwOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGN1cnJlbnRUcmlwO1xuICAgIH0sXG4gICAgY3JlYXRlVHJpcDogZnVuY3Rpb24oKXtcblxuICAgIH1cbiAgfTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1VzZXInLCBmdW5jdGlvbigkaHR0cCl7XG4gIHJldHVybiB7XG4gICAgZ2V0VXNlcjogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgY3JlYXRlVXNlcjogZnVuY3Rpb24oY3JlZHMpe1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9jcmVhdGUnLCBjcmVkcylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgbG9naW5Vc2VyOiBmdW5jdGlvbihjcmVkcyl7XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZHMpO1xuICAgIH0sXG4gICAgbG9nb3V0VXNlcjogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9nb3V0Jyk7XG4gICAgfVxuICB9O1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcbiAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICB1cmw6ICcvJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2FwcC9ob21lL2hvbWUuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbih1c2VyLCAkc3RhdGUsICRyb290U2NvcGUsICRzY29wZSwgU3RvcCxUcmlwLCBHb29nbGUpe1xuICAgICAgICBjb25zb2xlLmxvZyh1c2VyKTtcbiAgICAgICAgJHJvb3RTY29wZS5oaWRlbmF2ID0gZmFsc2U7XG4gICAgICAgIGlmICghdXNlcilcbiAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgaWYgKCFUcmlwLmdldEN1cnJlbnRUcmlwKCkpXG4gICAgICAgICAgVHJpcC5zZXRDdXJyZW50VHJpcCh1c2VyLnRyaXBzWzBdKTtcbiAgICAgICAgJHNjb3BlLmdldEN1cnJlbnRUcmlwID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICByZXR1cm4gVHJpcC5nZXRDdXJyZW50VHJpcCgpO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuc2hvd0RldGFpbHMgPSBmdW5jdGlvbihlLCBzdG9wKXtcbiAgICAgICAgICAvLyBpZiAoIVN0b3AuZ2V0Q3VycmVudCgpKVxuICAgICAgICAgICAgU3RvcC5nZXREZXRhaWxzKHN0b3ApO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZ2V0TmVhcmJ5ID0gZnVuY3Rpb24oa2V5d29yZCl7XG4gICAgICAgICAgdmFyIGN1cnJlbnRTdG9wID0gU3RvcC5nZXRDdXJyZW50KCk7XG4gICAgICAgICAgaWYgKGN1cnJlbnRTdG9wKXtcbiAgICAgICAgICAgIHJldHVybiBHb29nbGUuZ2V0TmVhcmJ5KGN1cnJlbnRTdG9wLCBrZXl3b3JkKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgIC8vU3RvcC5jbGVhckN1cnJlbnQoKTtcbiAgICAgICAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKGRhdGEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuc2hvd25TdG9wcyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgcmV0dXJuIFN0b3AuZ2V0U2hvd25TdG9wcygpO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuYWRkU3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIHN0b3AgPSBTdG9wLmdldEN1cnJlbnREaXNwbGF5KCk7XG4gICAgICAgICAgcmV0dXJuIEdvb2dsZS5nZXREaXN0YW5jZShzdG9wKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRpc3RhbmNlKXtcbiAgICAgICAgICAgIHN0b3AuZGlzdGFuY2UgPSBkaXN0YW5jZS52YWx1ZTtcbiAgICAgICAgICAgIHN0b3AuaXNOZXcgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiBUcmlwLmFkZFN0b3Aoc3RvcCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUucmVtb3ZlU3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIHN0b3AgPSBTdG9wLmdldEN1cnJlbnQoKTtcbiAgICAgICAgICByZXR1cm4gVHJpcC5yZW1vdmVTdG9wKHN0b3ApO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5lZGl0VHJpcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgVHJpcC5nZXRDdXJyZW50VHJpcCgpLm5hbWUgPSBUcmlwLmdldEN1cnJlbnRUcmlwKCkubmV3TmFtZTtcbiAgICAgICAgICBUcmlwLmdldEN1cnJlbnRUcmlwKCkuZWRpdGluZyA9IGZhbHNlO1xuICAgICAgICAgIHJldHVybiBUcmlwLmVkaXRUcmlwKCk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZ2V0UHJpY2UgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIHZhciBydG4gPSAnJztcbiAgICAgICAgICBpZiAoU3RvcC5nZXRDdXJyZW50RGlzcGxheSgpKXtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9MDtpPFN0b3AuZ2V0Q3VycmVudERpc3BsYXkoKS5wcmljZTtpKyspXG4gICAgICAgICAgICAgIHJ0bis9JyQnO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcnRuO1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZ2V0Q3VycmVudCA9IFN0b3AuZ2V0Q3VycmVudDtcbiAgICAgICAgJHNjb3BlLmN1cnJlbnREaXNwbGF5U3RvcCA9IFN0b3AuZ2V0Q3VycmVudERpc3BsYXk7XG4gICAgICB9LFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICB1c2VyOiBmdW5jdGlvbihVc2VyKXtcbiAgICAgICAgICByZXR1cm4gVXNlci5nZXRVc2VyKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9hcHAvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIFVzZXIsICRzdGF0ZSwgJHJvb3RTY29wZSl7XG4gICAgICAgICRyb290U2NvcGUuaGlkZW5hdiA9IHRydWU7XG4gICAgICAgICRzY29wZS5sb2dpbiA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgVXNlci5sb2dpblVzZXIoJHNjb3BlLmNyZWRzKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHtcbiAgICB0ZW1wbGF0ZVVybDogJy9hcHAvZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgVXNlciwgJHN0YXRlLCBOZ01hcCl7XG4gICAgICAkc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgVXNlci5sb2dvdXRVc2VyKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ3N0b3BJdGVtJywgZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHtcbiAgICBzY29wZTp7XG4gICAgICBpdGVtOiAnPSdcbiAgICB9LFxuICAgIHRlbXBsYXRlVXJsOiAnL2FwcC9kaXJlY3RpdmVzL3N0b3AtaXRlbS9zdG9wLWl0ZW0uaHRtbCcsXG4gICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBTdG9wKXtcbiAgICAgICRzY29wZS5nZXRQcmljZSA9IGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICB2YXIgcnRuID0gJyc7XG4gICAgICAgIGZvcih2YXIgaSA9MDtpPGl0ZW0ucHJpY2U7aSsrKVxuICAgICAgICAgIHJ0bis9JyQnO1xuICAgICAgICByZXR1cm4gcnRuO1xuICAgICAgfTtcbiAgICAgICRzY29wZS5nZXRUeXBlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCRzY29wZS5pdGVtLnR5cGU9PT0nYmFyJylcbiAgICAgICAgICByZXR1cm4gJ2xvY2FsX2Jhcic7XG4gICAgICAgIGVsc2UgaWYgKCRzY29wZS5pdGVtLnR5cGUgPT09ICdyZXN0YXVyYW50JylcbiAgICAgICAgICByZXR1cm4gJ3Jlc3RhdXJhbnQnO1xuICAgICAgICBlbHNlIGlmICgkc2NvcGUuaXRlbS50eXBlID09PSAnZW50ZXJ0YWlubWVudCcpXG4gICAgICAgICAgcmV0dXJuICdzZW50aW1lbnRfdmVyeV9zYXRpc2ZpZWQnO1xuICAgICAgfTtcbiAgICAgICRzY29wZS5nZXROYW1lID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRzY29wZS5pdGVtLm5hbWUuc2xpY2UoMCwxNyk7XG4gICAgICB9O1xuICAgICAgJHNjb3BlLmdldERpc3RhbmNlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICgkc2NvcGUuaXRlbS5kaXN0YW5jZSAqIDAuMDAwNjIxMzcxKS50b1ByZWNpc2lvbigxKTtcbiAgICAgIH07XG4gICAgICAkc2NvcGUuZ2V0Q3VycmVudCA9IFN0b3AuZ2V0Q3VycmVudDtcbiAgICAgICRzY29wZS5zZXRDdXJyZW50ID0gZnVuY3Rpb24oc3RvcCl7XG4gICAgICAgIFN0b3Auc2V0Q3VycmVudChzdG9wKTtcbiAgICAgICAgU3RvcC5zZXRTaG93blN0b3BzKHN0b3ApO1xuXG4gICAgICB9O1xuXG4gICAgfVxuICB9O1xufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
