var mongoose = require('mongoose'),
  bcrypt = require('bcrypt-nodejs');

var schema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  created: {
    type: Date,
    default: Date.now
  },
  trips: [mongoose.model('Trip').schema]

});
schema.pre('save',function(next){
  this.password = bcrypt.hashSync(this.password);
  next();
});

schema.statics.findOrCreate = function(data){
  var User = this;
  return  User.findOne({username: data.username})
  .then(function(user){
    if (!user){
      return User.create(data);
    }
    return user;
  });
};

mongoose.model('User', schema);
