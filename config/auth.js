var router = require('express').Router(),
  mongoose = require('mongoose'),
  bcrypt = require('bcrypt-nodejs');

router.post('/login', function(req,res,next){
  mongoose.model('User').findOne({username: req.body.username})
  .then(function(user){
    if (!user){
      res.sendStatus(401);
    } else {
    var comp = bcrypt.compareSync(req.body.password, user.password);
    if (comp){
      req.session.user = user;
      req.session.save();
      res.json(user);
    }
    else
      res.sendStatus(401);
  }
  }, next);
});

router.post('/logout', function(req,res,next){
  req.session.destroy();
  res.sendStatus(200);
});

router.post('/create', function(req,res,next){
  //check to see if user exists
  mongoose.model('User').findOrCreate(req.body)
  .then(function(user){
    req.session.user = user;
    res.json(user);
  },next);
});

router.get('/session', function(req,res,next){
  if (req.session.user)
    res.json(req.session.user);
  else {
    res.sendStatus(401);
  }
});

module.exports = router;
