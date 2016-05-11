var expect = require('chai').expect,
  apicall = require('../util/googleapi'),
  Promise = require('bluebird');

describe('google places api', function(){

  xit('gets data within certain proximity using promises', function(){
    var parameters = {
        location: [40.678126, -73.986432].toString(),
        radius: 1000,
        keyword: "bar",
    };
    return apicall('/maps/api/place/nearbysearch/',parameters)
    .then(function(res){
      expect(res.results.length).to.be.ok;
    });
  });
  xit('gets data for given address', function(){
    var parameters = {
      address: '501 president st, brooklyn, ny 11215'
    };
    return apicall('/maps/api/geocode/',parameters)
    .then(function(res){
      expect(res.results[0].geometry.location.lat).to.equal(40.67815);
    });
  });
  it('returns distance between two places', function(){
    var parameters = {
      origins: [40.678126, -73.986432].toString(),
      destinations: [40.684564, -73.978043].toString(),
      units: 'imperial',
      mode: 'walking'
    };
    return apicall('/maps/api/distancematrix/', parameters)
    .then(function(res){
      expect(res.rows[0].elements[0].distance.value).to.equal(1324);
    });
  });
});
