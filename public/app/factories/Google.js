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
