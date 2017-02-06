var app = require('../app'),
  _request = require('supertest-session-as-promised')({
    app: app
  }),
  expect = require('chai').expect,
  seed = require('../db/seed');

describe('google routes', function(){
  var request;
  var trip;
  var stop;
  before(function(){
    request = new _request();
    return seed()
    .then(function(){
      return request.post('/login').send({username: 'moe', password: 'test'});
    });
  });
  it('geocodes an address', function(){
    var parameters = {
      address: '501 president st, brooklyn, ny 11215'
    };
    return request.post('/api/google/geocode').send(parameters)
    .then(function(res){
      expect(res.body.lat).to.equal(40.67815);
    });
  });
  it('finds nearby places', function(){
    var parameters = {
        location: [40.678126, -73.986432].toString(),
        radius: 1000,
        keyword: "bar",
    };
    return request.post('/api/google/nearby').send(parameters)
    .then(function(res){
      expect(res.body.length).to.be.ok;
    });
  });
  it('gets distance between two places', function(){
    var parameters = {
      origins: [40.678126, -73.986432].toString(),
      destinations: [40.684564, -73.978043].toString(),
      units: 'imperial',
      mode: 'walking'
    };
    return request.post('/api/google/distance').send(parameters)
    .then(function(res){
      expect(res.body.value).above(1300);
    });
  });
});
