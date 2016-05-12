var app = require('../app'),
  request = require('supertest-as-promised')(app),
  expect = require('chai').expect,
  seed = require('../db/seed');

describe('Auth tests', function(){
  before(function(){
    return seed();
  });
  it('logs in existing user', function(){
    return request.post('/login').send({username: 'moe', password: 'test'}).expect(200);
  });
  it('creates a new user', function(){
    return request.post('/create').send({username: 'larry', password: 'test2'})
    .then(function(res){
      expect(res.body.password).not.to.equal('test2');
    });
  });
});
