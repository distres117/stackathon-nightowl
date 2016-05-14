app.factory('User', function($http){
  return {
    getUser: function(){
      return $http.get('/session')
      .then(function(res){
        return res.data;
      });
    },
    createUser: function(creds){
      return $http.post('/create', creds)
      .then(function(res){
        return res.data;
      });
    },
    loginUser: function(creds){
      return $http.post('/login', creds);
    },
    logoutUser: function(){
      return $http.post('/logout');
    }
  };
});
