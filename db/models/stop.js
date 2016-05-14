var mongoose = require('mongoose');

var schema = mongoose.Schema({
  name: String,
  type: String,
  coords: [Number],
  distance: Number,
  price: Number,
  rating: Number
});

mongoose.model('Stop', schema);
