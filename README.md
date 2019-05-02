# brapi-suggest
A pair of scripts for indexing BrAPI endpoints
### setup
- redis running on localhost, default port
- solr instance using `solr/conf`
- install dependencies `npm i`
### crawl BrAPI endpoint
Run this command to get terms/strings from a BrAPI endpoint and pipe them into a redis hash table.
```
./scrape.js --name TEST_SERVER --url https://test-server.brapi.org/brapi/v1/ | redis-cli --pipe
```
Add the param `--flush 1` to empty the redis database.
The top level keys are based on `--name` and under each one is a hash that counts the strings/terms that were gathered.
These hash keys take the form `["entity","field","value","label","text"]`
### load redis hashes into solr
Run this command to populate a solr instance for a given BrAPI endpoint
```
./redis2solr.js --name TEST_SERVER --url https://test-server.brapi.org/brapi/v1/ --solr http://localhost:8983/solr/brapi
```
### query the solr instance
[`http://localhost:8983/solr/brapi/query?q=*:*`](http://localhost:8983/solr/brapi/query?q=*:*)
replace `q=*:*` with `q=field:value` for specific queries

### launch express server
Because it's not a good idea to expose the solr instance to the world, we need to run a little server with CORS headers in front of it
```
npm i
node app.js 10012
```
