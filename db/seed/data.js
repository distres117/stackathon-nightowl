var trips = [
  {
    name: 'Test trip',
    distance: 999,
    stops: [
      {
        name: 'Canal bar',
        type: 'bar',
        coords: [40.677915, -73.985881],
        distance: 2000,
        price: 2,
        details:[{
          dogfriendly: true,
          drunkfriendly: true
        }

        ]
      },
      {
        name: 'Pork Slope',
        type: 'restaurant',
        coords: [40.674836, -73.981271],
        price: 3,
        distance: 1000,
        details: {
          servespork: true,
          kosher: false
        }
      },
      {
        name: 'Barclays arena',
        type: 'entertainment',
        coords: [40.682667, -73.975377],
        price: 3,
        distance: 1000,
        details: [{
          rocksout: true,
          seats: 30000
        }]
      }
    ]

  }
];

var user = {
  username: 'moe',
  password: 'test',
  trips: trips
};

module.exports = user;
