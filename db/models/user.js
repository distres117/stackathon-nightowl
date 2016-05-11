var mongoose = require('mongoose');

var schema = mongoose.Schema({
  username: {
    type: String,
    required: true
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

mongoose.model('User', schema);
