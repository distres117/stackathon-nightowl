var router = require('express').Router(),
  mongoose = require('mongoose');

router.use(function(req,res,next){ //user must be autheniticated to use api
  if (!req.session.user){
    var error = new Error();
    error.status = 401;
    next(error);
  }
  mongoose.model('User').findById(req.session.user)
  .then(function(user){
    req.user = user;
    next();
  });

});

router.param('tripId', function(req,res,next,id){
  req.trip = req.user.trips.id(id);
  next();
});
router.use('/google', require('./google'));
router.use('/trips', require('./trips'));
router.use('/trips/:tripId/stops', require('./stops'));

router.use(function (req, res) {
    res.status(404).end();
});

module.exports = router;
