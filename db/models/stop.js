var mongoose = require('mongoose');

var schema = mongoose.Schema({
  name: String,
  type: String,
  coords: [Number],
  details: []
});

mongoose.model('Stop', schema);
