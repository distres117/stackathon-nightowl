app.factory('Stop', function(NgMap){
  var map, currentStop, shownStops, currentDisplayStop;
  NgMap.getMap().then(function(_map){
    map = _map;
  });
  return {
    setCurrent: function(stop){
      currentStop = stop;

    },
    getDetails: function(stop){
      currentDisplayStop = stop;
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
      if (Array.isArray(stops))
        shownStops = stops;
      else {
        shownStops = [stops];
      }
    }
  };
});
