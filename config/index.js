var middleware = require('./middleware'),
  routes = require('./routes');

module.exports = function(app){
  middleware(app);
};
