![screen shot 2017-02-05 at 11 47 16 pm](https://cloud.githubusercontent.com/assets/11016515/22635043/bf483ad2-ebfd-11e6-83b8-e01108f7be55.png)
![screen shot 2017-02-05 at 11 47 48 pm](https://cloud.githubusercontent.com/assets/11016515/22635045/c1f7ce00-ebfd-11e6-8338-134af87d5930.png)

### Summary
This is fullstack javascript application designed to be used to find interesting things to do in one's vicinity.  It uses data from Google's maps, places and distance matrix apis.  Visited locations are persisted in the form of trips, which can also be saved. This was made in a few days as part of a hackathon-style project at [Fullstack Academy](https://www.fullstackacademy.com/)

### Requirements
  - Node.js
  - Gulp
  - MongoDb instance
  - Google Places API key
  
### Usage
  - Clone this repo
  - install server dependencies with npm install
  - install front end dependencies with bower (navigate to /public first)
  - run gulp to build the app
  - Start a mongodb instance
 Create a file in 'utils' called 'keys.js'.  Copy and paste this into it, adding your api key
 ~~~~
 module.exports = {
  places_key: PLACES_API_KEY
};
~~~~
  
  - execute: `npm run start-dev`

### Tech
  - Angular 1
  - MongoDb
  - Node
  - Express
