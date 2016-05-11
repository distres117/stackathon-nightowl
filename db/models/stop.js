var mongoose = require('mongoose');

var schema = mongoose.Schema({
  name: String,
  type: String,
  lat: Number,
  long: Number,
  details: []
});

mongoose.model('Stop', schema);
