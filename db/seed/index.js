var mongoose = require('mongoose'),
  user = require('./data'),
  db = require('../index');

function seed(){
  return db.connect()
  .then(function(){
    return db.drop();
  })
  .then(function(){
    var User = mongoose.model('User');
    return User.create(user);
  })
  .then(function(){
    console.log('seeded...');
  });
}
if (!process.env.TEST){
  seed()
  .then(function(){
    process.exit(0);
  });
}

module.exports = seed;
