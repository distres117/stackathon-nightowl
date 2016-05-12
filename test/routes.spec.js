var app = require('../app'),
  _request = require('supertest-session-as-promised')({
    app: app
  }),
  expect = require('chai').expect,
  seed = require('../db/seed');

describe('api routes', function(){
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
  describe('trip and stop routes', function(){
    it('adds a new trip',function(){
      return request.post('/api/trips').send()
      .then(function(res){
        trip = res.body;
        expect(trip).to.be.ok;
      });
    });
    it('gets all trips', function(){
      return request.get('/api/trips').expect(200)
      .then(function(res){
        expect(res.body.length).to.equal(2);
      });
    });
    it('gets trip by id', function(){
      return request.get('/api/trips/' + trip._id).expect(200);
    });
    it('edits trip', function(){
      var data = {
        name: 'new name of trip',
        distance: 200,
        stop: {
          name: 'new stop',
          type: 'bar',
          coords: [10,10]
        }
      };
      return request.put('/api/trips/' + trip._id).send(data)
      .then(function(res){
        return request.get('/api/trips/' + trip._id);
      })
      .then(function(res){
        expect(res.body.name).to.equal('new name of trip');
        expect(res.body.stops.length).to.equal(1);
      });
    });
    it('gets all stops for a trip', function(){
      return request.get('/api/trips/' + trip._id + '/stops')
      .then(function(res){
        stop = res.body[0];
        expect(res.body.length).to.equal(1);
      });
    });
    it('updates a stop', function(){
      var data = {
        name: 'updated stop name'
      };
      return request.put('/api/trips/' + trip._id + '/stops/' + stop._id).send(data).expect(200)
      .then(function(res){
        return request.get('/api/trips/' + trip._id + '/stops/' + stop._id);
      })
      .then(function(res){
        expect(res.body.name).to.equal('updated stop name');
      });
    });
  });
});
