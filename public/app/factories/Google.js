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
