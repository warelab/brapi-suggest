#!/usr/bin/env node
var Q = require('q');
var through2 = require('through2');
var JSONStream = require('JSONStream');
var duplexer = require('duplexer');
var request = require('request');
var streamify = require('stream-array');
var argv = require('minimist')(process.argv.slice(2));
var uuidv4 = require('uuid/v4');

function usage(die) {
  console.error("node redis2solr.js --name TEST_SERVER --url https://test-server.brapi.org/brapi/v1/ --solr http://localhost:8983/solr/brapi");
  die && process.exit(die);
} 

var brapiServiceName = argv.name;
var brapiServiceUrl = argv.url;
var solrUrl = argv.solr;

brapiServiceName && brapiServiceUrl && solrUrl || usage(1);

function getRedis(db) {
  var deferred = Q.defer();
  var client = require('redis').createClient();
  client.select(db, function(err) {
    if (err) throw err;
    console.error('redis connection established');
    deferred.resolve(client);
  });
  return deferred.promise;
}

function createSolrStream(url) {
  var headers = {
    'content-type' : 'application/json',
    'charset' : 'utf-8'
  };
  var requestOptions = {
    url: url + '/update/json?wt-json&commit=true',
    method: 'POST',
    headers: headers
  };
  var jsonStreamStringify = JSONStream.stringify();
  var postRequest = request(requestOptions);
  jsonStreamStringify.pipe(postRequest);
  return duplexer(jsonStreamStringify, postRequest);
}

var logger = through2.obj(function (obj, encoding, done) {
  console.log(obj);
  this.push(obj);
  done();
})


getRedis(1).then(client => {
  client.hgetall(brapiServiceName, function(err, obj) {
    streamify(Object.keys(obj).map(function(key) {
      let fields = JSON.parse(key); // entityType,keyField,keyValue,keyLabel,value
      let suggestion = {
        id: uuidv4(),
        tally: obj[key],
        brapiName: brapiServiceName,
        brapiUrl: brapiServiceUrl,
        entity: fields[0],
        fq: fields[1],
        fv: fields[2],
        label: fields[3],
        text: fields[4]
      };
      return suggestion;
    }))
    // .pipe(logger)
    .pipe(createSolrStream(solrUrl))
    .on('end',function() {
      client.quit();
    });
  })
    // Object.keys(obj).forEach(key => {
    //   let fields = JSON.parse(key); // entityType,keyField,keyValue,keyLabel,value
    //   let suggestion = {
    //     tally: obj[key],
    //     brapiName: brapiServiceName,
    //     brapiUrl: brapiServiceUrl,
    //     entity: fields[0],
    //     fq: fields[1],
    //     fv: fields[2],
    //     label: fields[3],
    //     text: fields[4]
    //   };
    //   console.log(suggestion);
    // })
    // client.quit();
  // })
});
