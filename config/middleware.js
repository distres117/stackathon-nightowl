var morgan = require('morgan'),
  bodyParser = require('body-parser'),
  express = require('express');

module.exports = function(app){
  app.use(express.static(app.get('root') + '/public'));
  app.use(morgan('dev'));
  app.use(bodyParser.json());
};
