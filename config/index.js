var middleware = require('./middleware'),
  session = require('express-session'),
  MongoStore = require('connect-mongo')(session),
  mongoose = require('mongoose');

module.exports = function(app){
  middleware(app);
  //mount session mw
  app.use(session({
        secret: 'hello',
        store: new MongoStore({mongooseConnection: mongoose.connection}),
        resave: false,
        saveUninitialized: false
    }));
  //get the authenticated user
  app.use(require('./auth'));
  app.use('/api', require('./routes'));
};
