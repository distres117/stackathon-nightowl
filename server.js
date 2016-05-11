var app = require('./app'),
  connect = require('./db'),
  chalk = require('chalk');

connect()
.then(function(){
  var port = process.env.PORT || 3000;
  console.log(chalk.green('Db is connected...'));
  app.listen(port, function(){
    console.log(chalk.green('Server running on ' + port));
  });
});
