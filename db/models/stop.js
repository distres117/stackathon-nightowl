var mongoose = require('mongoose');

var schema = mongoose.Schema({
  name: String,
  type: String,
  coords: [Number],
  details: [],
  distance: Number,
  price: Number,
  rating: Number
});

mongoose.model('Stop', schema);
