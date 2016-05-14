var mongoose = require('mongoose');

var schema = mongoose.Schema({
  name: {
    type: String,
    default: 'New trip'
  },
  distance: {
    type: Number,
    default: 0
  },
  stops: [mongoose.model('Stop').schema],
  created: {
    type: Date,
    default: Date.now
  }
});


mongoose.model('Trip', schema);
