
var Promise = require("bluebird"),
  querystring = require("querystring"),
  https = require("https"), keys;

if (process.env.NODE_ENV=== 'dev')
  keys = require('./keys');
else
  keys = {places_key: process.env.GOOGLE_KEY};

function HttpResponseProcessor(parseJson, callback) {
    return function (response) {
        var responseData = "";
        response.setEncoding("utf8");
        response.on("data", function (chunk) {
            responseData += chunk;
        });
        response.on("end", function () {
            if (parseJson) responseData = JSON.parse(responseData);
            callback(null, responseData);
        });
    };
}

function checkApiKey(apiKey, reject) {
    if (!apiKey) reject(new Error("apiKey must not be null"));
}

function checkOutputFormat(outputFormat, reject) {
    var validFormats = ["json", "xml"];
    if (validFormats.indexOf(outputFormat) === -1)  reject(new Error("outputFormat must be 'json' or 'xml'"));
}

module.exports = function (path, parameters) {
      return new Promise(function(resolve,reject){
        var apiKey = keys.places_key;
        var outputFormat = 'json';
        checkApiKey(apiKey, reject);
        checkOutputFormat(outputFormat, reject);
        parameters.key = apiKey;
        var options = {
            hostname: "maps.googleapis.com",
            path: path + outputFormat + "?" + querystring.stringify(parameters)
        };
        var request = https.request(options, new HttpResponseProcessor(outputFormat === "json", function(err, res){
          if (err) return reject(err);
          return resolve(res);
        }));
        request.on("error", function (error) {
            return reject(new Error(error));
        });
        request.end();
      });
};
