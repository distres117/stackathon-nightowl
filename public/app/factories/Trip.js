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
