var app = require('express')(),
  config = require('./config'),
  chalk = require('chalk');

app.set('root', __dirname);
config(app);

app.use('/*', function(req,res,next){
  res.send(app.get('root') + '/public/index.html');
});
app.use(function(err, req, res){
    console.error(chalk.red(err));
    res.status(err.status || 500).send(err.message || 'Internal server error.');
});

module.exports = app;
