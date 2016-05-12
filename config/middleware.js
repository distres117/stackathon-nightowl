var morgan = require('morgan'),
  bodyParser = require('body-parser'),
  express = require('express');

module.exports = function(app){
  app.use(bodyParser.json());
  //app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.static(app.get('root') + '/public'));
  app.use(morgan('dev'));
};
