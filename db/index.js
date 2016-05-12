var mongoose = require('mongoose'),
  conn;

require('./models');

function connect(){
    if (!conn){
      conn = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/stackathon', function(err){
        if (err)
          console.log(err);
      });
    }
    return conn;
}

function drop(){
    return conn.connection.db.dropDatabase();
}
module.exports = {connect, drop};
