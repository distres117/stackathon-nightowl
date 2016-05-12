var router = require('express').Router(),
  apicall = require('../../util/googleapi');

//call geocoding

router.post('/geocode', function(req,res,next){
  apicall('/maps/api/geocode/', req.body)
  .then(function(response){
    res.json(response.results[0].geometry.location);
  }, next);
});

//call nearby
router.post('/nearby', function(req,res,next){
  apicall('/maps/api/place/nearbysearch/', req.body)
  .then(function(response){
    res.json(response.results);
  }, next);
});
//call distance
router.post('/distance', function(req,res,next){
  apicall('/maps/api/distancematrix/', req.body)
  .then(function(response){
    res.json(response.rows[0].elements[0].distance);
  },next);
});

module.exports = router;
