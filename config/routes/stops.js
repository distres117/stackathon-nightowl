var router = require('express').Router(),
  mongoose = require('mongoose');

router.param('stopId', function(req,res,next, stopId){
  req.stop = req.trip.stops.id(stopId);
  next();
});

router.route('/')
  .get(function(req,res,next){
    res.json(req.trip.stops);
  });

router.route('/:stopId')
  .get(function(req,res,next){
    res.json(req.stop);
  })
  .delete(function(req,res,next){
    req.trip.stops.remove(req.stop);
    req.user.save()
    .then(function(){
      res.sendStatus(200);
    });
  })
  .put(function(req,res,next){
    if (req.body.name)
      req.stop.name = req.body.name;
    if (req.body.type)
      req.stop.type = req.body.type;
    if (req.body.coords)
      req.stop.coords = req.body.coords;
    if (req.body.details)
      req.stop.details = req.body.details;
    req.user.save()
    .then(function(){
      res.json(req.stop);
    },next);

  });


module.exports = router;
