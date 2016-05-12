var router = require('express').Router(),
  mongoose = require('mongoose');

router.param('tripId', function(req,res,next,id){
  req.trip = req.user.trips.id(id);
  next();
});


//get all trips for user
router.route('/')
  .get(function(req,res,next){
    res.json(req.user.trips);
  })
  .post(function(req,res,next){
    var Trip = mongoose.model('Trip');
    var trip = new Trip();
    req.user.trips.push(trip);
    req.user.save()
    .then(function(){
      res.json(trip);
    },next);

  });

router.route('/:tripId')
  .get(function(req,res,next){
    res.json(req.trip);
  })
  .delete(function(req,res,next){
    req.user.trips.remove(req.trip);
    req.user.save()
    .then(function(){
      res.sendStatus(200);
    });
  })
  .put(function(req,res,next){
    if (req.body.name)
      req.trip.name = req.body.name;
    if (req.body.distance)
      req.trip.distance = req.body.distance;
    if (req.body.stop)
      req.trip.stops.push(req.body.stop);
    req.user.save()
    .then(function(user){
      res.json(req.trip);
    });
  });

module.exports = router;
